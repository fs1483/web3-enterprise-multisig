// =====================================================
// 策略管理服务层
// 版本: v2.0
// 功能: 提供企业级多签系统的策略验证和管理服务
// 作者: sfan
// 创建时间: 2024-11-14
// =====================================================

package services

import (
	"context"
	"encoding/json"
	"fmt"
	"math/big"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"web3-enterprise-multisig/internal/models"
)

// PolicyService 策略管理服务
type PolicyService struct {
	db *gorm.DB
}

// NewPolicyService 创建策略管理服务实例
func NewPolicyService(db *gorm.DB) *PolicyService {
	return &PolicyService{
		db: db,
	}
}

// =====================================================
// 策略相关结构体定义
// =====================================================

// PolicyTemplate 策略模板
type PolicyTemplate struct {
	ID                uuid.UUID              `json:"id"`
	Name              string                 `json:"name"`
	Description       string                 `json:"description"`
	Category          string                 `json:"category"`
	TemplateType      string                 `json:"template_type"`
	DefaultParameters map[string]interface{} `json:"default_parameters"`
	ParameterSchema   map[string]interface{} `json:"parameter_schema"`
	IsSystem          bool                   `json:"is_system"`
	IsActive          bool                   `json:"is_active"`
	UsageCount        int                    `json:"usage_count"`
	CreatedBy         *uuid.UUID             `json:"created_by"`
	CreatedAt         time.Time              `json:"created_at"`
	UpdatedAt         time.Time              `json:"updated_at"`
}

// PolicyValidationRequest 策略验证请求
type PolicyValidationRequest struct {
	SafeID       uuid.UUID              `json:"safe_id"`
	ProposalID   *uuid.UUID             `json:"proposal_id,omitempty"`
	ProposalType string                 `json:"proposal_type"`
	ToAddress    *string                `json:"to_address,omitempty"`
	Value        string                 `json:"value"`
	Data         *string                `json:"data,omitempty"`
	UserID       uuid.UUID              `json:"user_id"`
	Context      map[string]interface{} `json:"context"`
}

// PolicyValidationResult 策略验证结果
type PolicyValidationResult struct {
	SafeID           uuid.UUID                    `json:"safe_id"`
	ProposalID       *uuid.UUID                   `json:"proposal_id,omitempty"`
	Passed           bool                         `json:"passed"`
	PolicyResults    []SinglePolicyResult         `json:"policy_results"`
	FailedPolicies   []string                     `json:"failed_policies"`
	RequiredActions  []string                     `json:"required_actions"`
	EstimatedDelay   *time.Duration               `json:"estimated_delay,omitempty"`
	ValidationErrors []string                     `json:"validation_errors"`
	Context          map[string]interface{}       `json:"context"`
}

// SinglePolicyResult 单个策略验证结果
type SinglePolicyResult struct {
	PolicyID         uuid.UUID              `json:"policy_id"`
	PolicyName       string                 `json:"policy_name"`
	PolicyType       string                 `json:"policy_type"`
	Passed           bool                   `json:"passed"`
	FailureReason    string                 `json:"failure_reason,omitempty"`
	RequiredAction   string                 `json:"required_action,omitempty"`
	EstimatedDelay   *time.Duration         `json:"estimated_delay,omitempty"`
	ValidationDetails map[string]interface{} `json:"validation_details"`
}

// PolicyExecutionLog 策略执行日志
type PolicyExecutionLog struct {
	ID                  uuid.UUID              `json:"id"`
	PolicyID            uuid.UUID              `json:"policy_id"`
	ProposalID          *uuid.UUID             `json:"proposal_id"`
	SafeID              uuid.UUID              `json:"safe_id"`
	ExecutionType       string                 `json:"execution_type"`
	ExecutionResult     string                 `json:"execution_result"`
	InputParameters     map[string]interface{} `json:"input_parameters"`
	PolicyParameters    map[string]interface{} `json:"policy_parameters"`
	ValidationDetails   map[string]interface{} `json:"validation_details"`
	FailureReason       string                 `json:"failure_reason,omitempty"`
	TriggeredBy         uuid.UUID              `json:"triggered_by"`
	ExecutionContext    map[string]interface{} `json:"execution_context"`
	ExecutedAt          time.Time              `json:"executed_at"`
	ExecutionDurationMs int                    `json:"execution_duration_ms"`
}

// =====================================================
// 核心策略验证方法
// =====================================================

// ValidatePolicies 验证Safe的所有策略
// 这是策略系统的核心方法，验证提案是否符合所有激活的策略
func (s *PolicyService) ValidatePolicies(ctx context.Context, req PolicyValidationRequest) (*PolicyValidationResult, error) {
	startTime := time.Now()
	
	result := &PolicyValidationResult{
		SafeID:           req.SafeID,
		ProposalID:       req.ProposalID,
		Passed:           true,
		PolicyResults:    []SinglePolicyResult{},
		FailedPolicies:   []string{},
		RequiredActions:  []string{},
		ValidationErrors: []string{},
		Context:          req.Context,
	}

	// 1. 获取Safe的所有激活策略
	policies, err := s.getActivePoliciesForSafe(ctx, req.SafeID)
	if err != nil {
		return nil, fmt.Errorf("获取Safe策略失败: %w", err)
	}

	// 2. 按优先级顺序验证每个策略
	var maxDelay time.Duration
	for _, policy := range policies {
		policyResult, err := s.validateSinglePolicy(ctx, policy, req)
		if err != nil {
			result.ValidationErrors = append(result.ValidationErrors, 
				fmt.Sprintf("策略 %s 验证失败: %v", policy.Name, err))
			continue
		}

		result.PolicyResults = append(result.PolicyResults, *policyResult)

		if !policyResult.Passed {
			result.Passed = false
			result.FailedPolicies = append(result.FailedPolicies, policy.Name)
			
			if policyResult.RequiredAction != "" {
				result.RequiredActions = append(result.RequiredActions, policyResult.RequiredAction)
			}
		}

		// 计算最大延迟时间
		if policyResult.EstimatedDelay != nil && *policyResult.EstimatedDelay > maxDelay {
			maxDelay = *policyResult.EstimatedDelay
		}

		// 记录策略执行日志
		s.logPolicyExecution(ctx, policy, req, policyResult, time.Since(startTime))
	}

	if maxDelay > 0 {
		result.EstimatedDelay = &maxDelay
	}

	return result, nil
}

// =====================================================
// 策略模板管理方法
// =====================================================

// GetPolicyTemplates 获取策略模板列表
func (s *PolicyService) GetPolicyTemplates(ctx context.Context, category string, templateType string) ([]PolicyTemplate, error) {
	var templates []struct {
		ID                uuid.UUID  `gorm:"column:id"`
		Name              string     `gorm:"column:name"`
		Description       string     `gorm:"column:description"`
		Category          string     `gorm:"column:category"`
		TemplateType      string     `gorm:"column:template_type"`
		DefaultParameters string     `gorm:"column:default_parameters"`
		ParameterSchema   string     `gorm:"column:parameter_schema"`
		IsSystem          bool       `gorm:"column:is_system"`
		IsActive          bool       `gorm:"column:is_active"`
		UsageCount        int        `gorm:"column:usage_count"`
		CreatedBy         *uuid.UUID `gorm:"column:created_by"`
		CreatedAt         time.Time  `gorm:"column:created_at"`
		UpdatedAt         time.Time  `gorm:"column:updated_at"`
	}

	query := s.db.WithContext(ctx).Table("policy_templates").Where("is_active = ?", true)

	if category != "" {
		query = query.Where("category = ?", category)
	}
	if templateType != "" {
		query = query.Where("template_type = ?", templateType)
	}

	err := query.Order("category, usage_count DESC, name").Find(&templates).Error
	if err != nil {
		return nil, fmt.Errorf("获取策略模板失败: %w", err)
	}

	var result []PolicyTemplate
	for _, template := range templates {
		var defaultParams, paramSchema map[string]interface{}

		if template.DefaultParameters != "" {
			json.Unmarshal([]byte(template.DefaultParameters), &defaultParams)
		}
		if template.ParameterSchema != "" {
			json.Unmarshal([]byte(template.ParameterSchema), &paramSchema)
		}

		result = append(result, PolicyTemplate{
			ID:                template.ID,
			Name:              template.Name,
			Description:       template.Description,
			Category:          template.Category,
			TemplateType:      template.TemplateType,
			DefaultParameters: defaultParams,
			ParameterSchema:   paramSchema,
			IsSystem:          template.IsSystem,
			IsActive:          template.IsActive,
			UsageCount:        template.UsageCount,
			CreatedBy:         template.CreatedBy,
			CreatedAt:         template.CreatedAt,
			UpdatedAt:         template.UpdatedAt,
		})
	}

	return result, nil
}

// CreatePolicyFromTemplate 从模板创建策略
func (s *PolicyService) CreatePolicyFromTemplate(ctx context.Context, safeID, templateID, createdBy uuid.UUID, name string, customParameters map[string]interface{}) (*models.Policy, error) {
	// 1. 获取模板信息
	template, err := s.getPolicyTemplate(ctx, templateID)
	if err != nil {
		return nil, fmt.Errorf("获取策略模板失败: %w", err)
	}

	// 2. 合并默认参数和自定义参数
	finalParameters := make(map[string]interface{})
	for k, v := range template.DefaultParameters {
		finalParameters[k] = v
	}
	for k, v := range customParameters {
		finalParameters[k] = v
	}

	// 3. 验证参数有效性
	if err := s.validatePolicyParameters(template.ParameterSchema, finalParameters); err != nil {
		return nil, fmt.Errorf("策略参数验证失败: %w", err)
	}

	// 4. 序列化参数
	parametersJSON, err := json.Marshal(finalParameters)
	if err != nil {
		return nil, fmt.Errorf("序列化策略参数失败: %w", err)
	}

	// 5. 创建策略记录
	policy := &models.Policy{
		ID:          uuid.New(),
		SafeID:      safeID,
		Name:        name,
		Description: &template.Description,
		Rules:       string(parametersJSON), // 注意：这里使用Rules字段存储参数
		IsActive:    true,
		CreatedBy:   createdBy,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	// 6. 保存到数据库
	if err := s.db.WithContext(ctx).Create(policy).Error; err != nil {
		return nil, fmt.Errorf("创建策略失败: %w", err)
	}

	// 7. 更新模板使用次数
	s.db.WithContext(ctx).Table("policy_templates").Where("id = ?", templateID).UpdateColumn("usage_count", gorm.Expr("usage_count + 1"))

	return policy, nil
}

// =====================================================
// 私有辅助方法
// =====================================================

// getActivePoliciesForSafe 获取Safe的激活策略列表
func (s *PolicyService) getActivePoliciesForSafe(ctx context.Context, safeID uuid.UUID) ([]models.Policy, error) {
	var policies []models.Policy

	err := s.db.WithContext(ctx).
		Where("safe_id = ? AND is_active = ?", safeID, true).
		Order("priority ASC, execution_order ASC, created_at ASC").
		Find(&policies).Error

	if err != nil {
		return nil, fmt.Errorf("查询Safe策略失败: %w", err)
	}

	return policies, nil
}

// validateSinglePolicy 验证单个策略
func (s *PolicyService) validateSinglePolicy(ctx context.Context, policy models.Policy, req PolicyValidationRequest) (*SinglePolicyResult, error) {
	result := &SinglePolicyResult{
		PolicyID:          policy.ID,
		PolicyName:        policy.Name,
		PolicyType:        "", // Will be populated from database query
		Passed:            true,
		ValidationDetails: make(map[string]interface{}),
	}

	// 解析策略参数
	var policyParams map[string]interface{}
	if err := json.Unmarshal([]byte(policy.Rules), &policyParams); err != nil {
		return nil, fmt.Errorf("解析策略参数失败: %w", err)
	}

	// 获取策略类型从数据库
	var policyType string
	err := s.db.WithContext(ctx).Model(&models.Policy{}).Where("id = ?", policy.ID).Select("policy_type").Scan(&policyType).Error
	if err != nil {
		return nil, fmt.Errorf("获取策略类型失败: %w", err)
	}

	result.PolicyType = policyType

	// 根据策略类型进行验证
	switch policyType {
	case "approval_threshold":
		return s.validateApprovalThresholdPolicy(ctx, policyParams, req, result)
	case "time_lock":
		return s.validateTimeLockPolicy(ctx, policyParams, req, result)
	case "spending_limit":
		return s.validateSpendingLimitPolicy(ctx, policyParams, req, result)
	case "role_based_approval":
		return s.validateRoleBasedApprovalPolicy(ctx, policyParams, req, result)
	default:
		result.Passed = false
		result.FailureReason = fmt.Sprintf("未知的策略类型: %s", policyType)
		return result, nil
	}
}

// validateApprovalThresholdPolicy 验证审批阈值策略
func (s *PolicyService) validateApprovalThresholdPolicy(ctx context.Context, params map[string]interface{}, req PolicyValidationRequest, result *SinglePolicyResult) (*SinglePolicyResult, error) {
	rules, ok := params["rules"].([]interface{})
	if !ok {
		result.Passed = false
		result.FailureReason = "审批阈值策略参数格式错误"
		return result, nil
	}

	// 解析交易金额
	value, ok := new(big.Int).SetString(req.Value, 10)
	if !ok {
		result.Passed = false
		result.FailureReason = "无效的交易金额"
		return result, nil
	}

	// 查找匹配的规则
	var requiredSignatures int
	var matchedRule map[string]interface{}

	for _, ruleInterface := range rules {
		rule, ok := ruleInterface.(map[string]interface{})
		if !ok {
			continue
		}

		condition, ok := rule["condition"].(map[string]interface{})
		if !ok {
			continue
		}

		// 检查是否为默认规则
		if _, isDefault := condition["default"]; isDefault {
			requiredSignatures = int(rule["required_signatures"].(float64))
			matchedRule = rule
			continue
		}

		// 检查金额条件
		if amountCondition, exists := condition["amount"].(map[string]interface{}); exists {
			if gteStr, exists := amountCondition["gte"].(string); exists {
				gte, ok := new(big.Int).SetString(gteStr, 10)
				if ok && value.Cmp(gte) >= 0 {
					requiredSignatures = int(rule["required_signatures"].(float64))
					matchedRule = rule
					break
				}
			}
		}

		// 检查提案类型条件
		if proposalType, exists := condition["proposal_type"].(string); exists {
			if proposalType == req.ProposalType {
				requiredSignatures = int(rule["required_signatures"].(float64))
				matchedRule = rule
				break
			}
		}
	}

	if requiredSignatures == 0 {
		result.Passed = false
		result.FailureReason = "未找到匹配的审批阈值规则"
		return result, nil
	}

	// 如果有提案ID，检查当前签名数量
	if req.ProposalID != nil {
		var proposal models.Proposal
		if err := s.db.WithContext(ctx).First(&proposal, *req.ProposalID).Error; err != nil {
			result.Passed = false
			result.FailureReason = "获取提案信息失败"
			return result, nil
		}

		if proposal.CurrentSignatures < requiredSignatures {
			result.Passed = false
			result.FailureReason = fmt.Sprintf("需要 %d 个签名，当前只有 %d 个", requiredSignatures, proposal.CurrentSignatures)
			result.RequiredAction = fmt.Sprintf("需要额外 %d 个签名", requiredSignatures-proposal.CurrentSignatures)
		}
	}

	result.ValidationDetails["matched_rule"] = matchedRule
	result.ValidationDetails["required_signatures"] = requiredSignatures
	result.ValidationDetails["transaction_value"] = req.Value

	return result, nil
}

// validateTimeLockPolicy 验证时间锁定策略
func (s *PolicyService) validateTimeLockPolicy(ctx context.Context, params map[string]interface{}, req PolicyValidationRequest, result *SinglePolicyResult) (*SinglePolicyResult, error) {
	rules, ok := params["rules"].([]interface{})
	if !ok {
		result.Passed = false
		result.FailureReason = "时间锁定策略参数格式错误"
		return result, nil
	}

	// 解析交易金额
	value, ok := new(big.Int).SetString(req.Value, 10)
	if !ok {
		result.Passed = false
		result.FailureReason = "无效的交易金额"
		return result, nil
	}

	// 查找匹配的规则
	var delayHours int
	var matchedRule map[string]interface{}

	for _, ruleInterface := range rules {
		rule, ok := ruleInterface.(map[string]interface{})
		if !ok {
			continue
		}

		condition, ok := rule["condition"].(map[string]interface{})
		if !ok {
			continue
		}

		// 检查金额条件
		if amountCondition, exists := condition["amount"].(map[string]interface{}); exists {
			if gteStr, exists := amountCondition["gte"].(string); exists {
				gte, ok := new(big.Int).SetString(gteStr, 10)
				if ok && value.Cmp(gte) >= 0 {
					delayHours = int(rule["delay_hours"].(float64))
					matchedRule = rule
					break
				}
			}
		}

		// 检查提案类型条件
		if proposalType, exists := condition["proposal_type"].(string); exists {
			if proposalType == req.ProposalType {
				delayHours = int(rule["delay_hours"].(float64))
				matchedRule = rule
				break
			}
		}
	}

	if delayHours > 0 {
		// 如果有提案ID，检查提案创建时间
		if req.ProposalID != nil {
			var proposal models.Proposal
			if err := s.db.WithContext(ctx).First(&proposal, *req.ProposalID).Error; err != nil {
				result.Passed = false
				result.FailureReason = "获取提案信息失败"
				return result, nil
			}

			requiredWaitTime := time.Duration(delayHours) * time.Hour
			timeSinceCreation := time.Since(proposal.CreatedAt)

			if timeSinceCreation < requiredWaitTime {
				result.Passed = false
				remainingTime := requiredWaitTime - timeSinceCreation
				result.FailureReason = fmt.Sprintf("需要等待 %v，剩余 %v", requiredWaitTime, remainingTime)
				result.RequiredAction = fmt.Sprintf("等待 %v 后可执行", remainingTime)
				result.EstimatedDelay = &remainingTime
			}
		} else {
			// 新提案，设置预估延迟
			estimatedDelay := time.Duration(delayHours) * time.Hour
			result.EstimatedDelay = &estimatedDelay
			result.RequiredAction = fmt.Sprintf("提案创建后需要等待 %v", estimatedDelay)
		}
	}

	result.ValidationDetails["matched_rule"] = matchedRule
	result.ValidationDetails["delay_hours"] = delayHours
	result.ValidationDetails["transaction_value"] = req.Value

	return result, nil
}

// validateSpendingLimitPolicy 验证支出限额策略
func (s *PolicyService) validateSpendingLimitPolicy(ctx context.Context, params map[string]interface{}, req PolicyValidationRequest, result *SinglePolicyResult) (*SinglePolicyResult, error) {
	// 解析策略参数
	dailyLimitStr, ok := params["daily_limit"].(string)
	if !ok {
		result.Passed = false
		result.FailureReason = "支出限额策略参数格式错误"
		return result, nil
	}

	dailyLimit, ok := new(big.Int).SetString(dailyLimitStr, 10)
	if !ok {
		result.Passed = false
		result.FailureReason = "无效的日限额参数"
		return result, nil
	}

	// 解析交易金额
	value, ok := new(big.Int).SetString(req.Value, 10)
	if !ok {
		result.Passed = false
		result.FailureReason = "无效的交易金额"
		return result, nil
	}

	// 获取今日已支出金额
	todaySpent, err := s.getTodaySpentAmount(ctx, req.SafeID)
	if err != nil {
		result.Passed = false
		result.FailureReason = fmt.Sprintf("获取今日支出金额失败: %v", err)
		return result, nil
	}

	// 计算支出后的总额
	totalAfterSpending := new(big.Int).Add(todaySpent, value)

	if totalAfterSpending.Cmp(dailyLimit) > 0 {
		result.Passed = false
		result.FailureReason = fmt.Sprintf("超出日支出限额，限额: %s，已支出: %s，本次: %s", 
			dailyLimitStr, todaySpent.String(), req.Value)
		result.RequiredAction = "等待明日重置或申请临时提额"
	}

	result.ValidationDetails["daily_limit"] = dailyLimitStr
	result.ValidationDetails["today_spent"] = todaySpent.String()
	result.ValidationDetails["transaction_value"] = req.Value
	result.ValidationDetails["total_after_spending"] = totalAfterSpending.String()

	return result, nil
}

// validateRoleBasedApprovalPolicy 验证基于角色的审批策略
func (s *PolicyService) validateRoleBasedApprovalPolicy(ctx context.Context, params map[string]interface{}, req PolicyValidationRequest, result *SinglePolicyResult) (*SinglePolicyResult, error) {
	// TODO: 实现基于角色的审批策略验证
	// 这需要与权限服务集成，检查用户角色和权限
	result.ValidationDetails["note"] = "基于角色的审批策略验证待实现"
	return result, nil
}

// 辅助方法
func (s *PolicyService) getPolicyTemplate(ctx context.Context, templateID uuid.UUID) (*PolicyTemplate, error) {
	var template struct {
		ID                uuid.UUID  `gorm:"column:id"`
		Name              string     `gorm:"column:name"`
		Description       string     `gorm:"column:description"`
		Category          string     `gorm:"column:category"`
		TemplateType      string     `gorm:"column:template_type"`
		DefaultParameters string     `gorm:"column:default_parameters"`
		ParameterSchema   string     `gorm:"column:parameter_schema"`
		IsSystem          bool       `gorm:"column:is_system"`
		IsActive          bool       `gorm:"column:is_active"`
		UsageCount        int        `gorm:"column:usage_count"`
		CreatedBy         *uuid.UUID `gorm:"column:created_by"`
		CreatedAt         time.Time  `gorm:"column:created_at"`
		UpdatedAt         time.Time  `gorm:"column:updated_at"`
	}

	err := s.db.WithContext(ctx).Table("policy_templates").Where("id = ? AND is_active = ?", templateID, true).First(&template).Error
	if err != nil {
		return nil, fmt.Errorf("查询策略模板失败: %w", err)
	}

	var defaultParams, paramSchema map[string]interface{}
	if template.DefaultParameters != "" {
		json.Unmarshal([]byte(template.DefaultParameters), &defaultParams)
	}
	if template.ParameterSchema != "" {
		json.Unmarshal([]byte(template.ParameterSchema), &paramSchema)
	}

	return &PolicyTemplate{
		ID:                template.ID,
		Name:              template.Name,
		Description:       template.Description,
		Category:          template.Category,
		TemplateType:      template.TemplateType,
		DefaultParameters: defaultParams,
		ParameterSchema:   paramSchema,
		IsSystem:          template.IsSystem,
		IsActive:          template.IsActive,
		UsageCount:        template.UsageCount,
		CreatedBy:         template.CreatedBy,
		CreatedAt:         template.CreatedAt,
		UpdatedAt:         template.UpdatedAt,
	}, nil
}

func (s *PolicyService) validatePolicyParameters(schema map[string]interface{}, params map[string]interface{}) error {
	// TODO: 实现JSON Schema验证
	return nil
}

func (s *PolicyService) getTodaySpentAmount(ctx context.Context, safeID uuid.UUID) (*big.Int, error) {
	// 获取今日已确认的转账提案总金额
	today := time.Now().Truncate(24 * time.Hour)
	tomorrow := today.Add(24 * time.Hour)

	var proposals []models.Proposal
	err := s.db.WithContext(ctx).
		Where("safe_id = ? AND proposal_type = ? AND status IN (?, ?) AND confirmed_at >= ? AND confirmed_at < ?", 
			safeID, "transfer", "executed", "confirmed", today, tomorrow).
		Find(&proposals).Error

	if err != nil {
		return nil, fmt.Errorf("查询今日支出记录失败: %w", err)
	}

	totalSpent := big.NewInt(0)
	for _, proposal := range proposals {
		if value, ok := new(big.Int).SetString(proposal.Value, 10); ok {
			totalSpent.Add(totalSpent, value)
		}
	}

	return totalSpent, nil
}

func (s *PolicyService) logPolicyExecution(ctx context.Context, policy models.Policy, req PolicyValidationRequest, result *SinglePolicyResult, duration time.Duration) {
	// 构建输入参数JSON
	inputParams := map[string]interface{}{
		"proposal_type": req.ProposalType,
		"value":         req.Value,
		"to_address":    req.ToAddress,
		"user_id":       req.UserID,
	}
	inputParamsJSON, _ := json.Marshal(inputParams)

	// 构建策略参数JSON
	var policyParams map[string]interface{}
	json.Unmarshal([]byte(policy.Rules), &policyParams)
	policyParamsJSON, _ := json.Marshal(policyParams)

	// 构建验证详情JSON
	validationDetailsJSON, _ := json.Marshal(result.ValidationDetails)

	// 构建执行上下文JSON
	executionContextJSON, _ := json.Marshal(req.Context)

	// 确定执行结果
	executionResult := "passed"
	if !result.Passed {
		executionResult = "failed"
	}

	// 插入执行日志
	logRecord := map[string]interface{}{
		"id":                    uuid.New(),
		"policy_id":             policy.ID,
		"proposal_id":           req.ProposalID,
		"safe_id":               req.SafeID,
		"execution_type":        "validation",
		"execution_result":      executionResult,
		"input_parameters":      string(inputParamsJSON),
		"policy_parameters":     string(policyParamsJSON),
		"validation_details":    string(validationDetailsJSON),
		"failure_reason":        result.FailureReason,
		"triggered_by":          req.UserID,
		"execution_context":     string(executionContextJSON),
		"executed_at":           time.Now(),
		"execution_duration_ms": int(duration.Milliseconds()),
	}

	// 异步记录日志
	go func() {
		s.db.Table("policy_execution_logs").Create(logRecord)
	}()
}
