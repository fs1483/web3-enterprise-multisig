package services

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// PermissionTemplateService 权限模板服务
type PermissionTemplateService struct {
	db *gorm.DB
}

// NewPermissionTemplateService 创建权限模板服务实例
func NewPermissionTemplateService(db *gorm.DB) *PermissionTemplateService {
	return &PermissionTemplateService{db: db}
}

// RoleTemplate 角色模板定义
type RoleTemplate struct {
	ID          string                 `json:"id"`
	Name        string                 `json:"name"`
	DisplayName string                 `json:"display_name"`
	Description string                 `json:"description"`
	Category    string                 `json:"category"` // "safe", "system"
	Permissions []string               `json:"permissions"`
	Restrictions map[string]interface{} `json:"restrictions,omitempty"`
	IsDefault   bool                   `json:"is_default"`
}

// GetSafeRoleTemplates 获取Safe角色模板
func (s *PermissionTemplateService) GetSafeRoleTemplates() []RoleTemplate {
	return []RoleTemplate{
		{
			ID:          "safe_admin",
			Name:        "safe_admin",
			DisplayName: "Safe管理员",
			Description: "拥有Safe的完全管理权限，可以管理成员、策略和执行所有操作",
			Category:    "safe",
			Permissions: []string{
				"safe.info.view",
				"safe.info.manage", 
				"safe.info.delete",
				"safe.proposal.view",
				"safe.proposal.create",
				"safe.proposal.edit",
				"safe.proposal.delete",
				"safe.proposal.sign",
				"safe.proposal.execute",
				"safe.proposal.create.transfer",
				"safe.proposal.create.contract",
				"safe.proposal.create.governance",
				"safe.member.view",
				"safe.member.invite",
				"safe.member.remove",
				"safe.member.assign_role",
				"safe.policy.view",
				"safe.policy.create",
				"safe.policy.edit",
				"safe.policy.delete",
				"safe.policy.activate",
			},
			IsDefault: true,
		},
		{
			ID:          "safe_treasurer",
			Name:        "safe_treasurer",
			DisplayName: "Safe财务主管",
			Description: "负责财务相关操作，可以创建和执行提案，但不能管理成员",
			Category:    "safe",
			Permissions: []string{
				"safe.info.view",
				"safe.proposal.view",
				"safe.proposal.create",
				"safe.proposal.sign",
				"safe.proposal.execute",
				"safe.proposal.create.transfer",
				"safe.proposal.create.contract",
				"safe.member.view",
				"safe.policy.view",
			},
			Restrictions: map[string]interface{}{
				"max_transaction_amount": 1000000, // 最大交易金额限制
				"require_approval": true,          // 需要额外审批
			},
			IsDefault: true,
		},
		{
			ID:          "safe_operator",
			Name:        "safe_operator",
			DisplayName: "Safe操作员",
			Description: "可以创建提案和签名，但不能执行提案或管理成员",
			Category:    "safe",
			Permissions: []string{
				"safe.info.view",
				"safe.proposal.view",
				"safe.proposal.create",
				"safe.proposal.sign",
				"safe.proposal.create.transfer",
				"safe.proposal.create.contract",
				"safe.member.view",
				"safe.policy.view",
			},
			Restrictions: map[string]interface{}{
				"max_transaction_amount": 100000, // 较低的交易金额限制
				"daily_limit": 5,                 // 每日操作限制
			},
			IsDefault: true,
		},
		{
			ID:          "safe_viewer",
			Name:        "safe_viewer",
			DisplayName: "Safe观察者",
			Description: "只能查看Safe信息和提案，无法进行任何操作",
			Category:    "safe",
			Permissions: []string{
				"safe.info.view",
				"safe.proposal.view",
				"safe.member.view",
				"safe.policy.view",
			},
			IsDefault: true,
		},
		{
			ID:          "safe_auditor",
			Name:        "safe_auditor",
			DisplayName: "Safe审计员",
			Description: "专门用于审计和监控，可以查看所有信息包括审计日志",
			Category:    "safe",
			Permissions: []string{
				"safe.info.view",
				"safe.proposal.view",
				"safe.member.view",
				"safe.policy.view",
				"safe.audit.view",
			},
			IsDefault: false,
		},
	}
}

// GetSystemRoleTemplates 获取系统角色模板
func (s *PermissionTemplateService) GetSystemRoleTemplates() []RoleTemplate {
	return []RoleTemplate{
		{
			ID:          "super_admin",
			Name:        "super_admin",
			DisplayName: "超级管理员",
			Description: "拥有系统的完全管理权限",
			Category:    "system",
			Permissions: []string{
				"system.permission.view",
				"system.permission.manage",
				"system.policy.validate",
				"system.user.manage",
				"system.safe.manage",
				"system.audit.view",
			},
			IsDefault: false,
		},
		{
			ID:          "system_admin",
			Name:        "system_admin",
			DisplayName: "系统管理员",
			Description: "系统管理员，可以管理用户和基本系统设置",
			Category:    "system",
			Permissions: []string{
				"system.permission.view",
				"system.user.manage",
				"system.audit.view",
			},
			IsDefault: true,
		},
	}
}

// GetAllRoleTemplates 获取所有角色模板（预制+自定义）
func (s *PermissionTemplateService) GetAllRoleTemplates() []RoleTemplate {
	// 获取预制模板
	safeTemplates := s.GetSafeRoleTemplates()
	systemTemplates := s.GetSystemRoleTemplates()
	presetTemplates := append(safeTemplates, systemTemplates...)
	
	// 获取数据库中的自定义模板
	// TODO: 实现从数据库查询自定义模板的逻辑
	
	return presetTemplates
}

// GetRoleTemplatesForSafeCreation 获取适合Safe创建时使用的角色模板
// 返回系统级预制模板，用于Safe创建时的角色选择
func (s *PermissionTemplateService) GetRoleTemplatesForSafeCreation() []RoleTemplate {
	// 只返回适合Safe创建时使用的系统级模板
	templates := []RoleTemplate{
		{
			ID:          "founder_ceo",
			Name:        "founder_ceo", 
			DisplayName: "👑 创始人/CEO",
			Description: "最高管理权限，可以修改Safe设置和管理所有成员",
			Category:    "system",
			IsDefault:   true, // 标记为默认角色
			Permissions: []string{
				"safe.info.view",
				"safe.info.manage",
				"safe.member.view", 
				"safe.member.add",
				"safe.member.remove",
				"safe.proposal.view",
				"safe.proposal.create",
				"safe.proposal.sign",
				"safe.proposal.execute",
				"safe.policy.view",
				"safe.policy.edit",
				"safe.settings.manage",
			},
		},
		{
			ID:          "finance_director",
			Name:        "finance_director",
			DisplayName: "💰 财务总监", 
			Description: "负责财务相关操作，可以创建和签署转账提案",
			Category:    "system",
			IsDefault:   false,
			Permissions: []string{
				"safe.info.view",
				"safe.member.view",
				"safe.proposal.view",
				"safe.proposal.create",
				"safe.proposal.sign", 
				"safe.policy.view",
				"finance.transfer.create",
				"finance.transfer.approve",
			},
		},
		{
			ID:          "technical_lead",
			Name:        "technical_lead",
			DisplayName: "🔧 技术负责人",
			Description: "负责技术相关操作，可以创建合约交互提案", 
			Category:    "system",
			IsDefault:   false,
			Permissions: []string{
				"safe.info.view",
				"safe.member.view",
				"safe.proposal.view",
				"safe.proposal.create",
				"safe.proposal.sign",
				"safe.policy.view",
				"contract.interaction.create",
				"contract.interaction.execute",
			},
		},
		{
			ID:          "auditor",
			Name:        "auditor", 
			DisplayName: "📊 审计员",
			Description: "只读权限，可以查看所有信息但不能执行操作",
			Category:    "system",
			IsDefault:   false,
			Permissions: []string{
				"safe.info.view",
				"safe.member.view", 
				"safe.proposal.view",
				"safe.policy.view",
				"audit.view",
				"transaction.view",
			},
		},
	}
	
	return templates
}

// GetCustomRoleTemplates 从数据库获取自定义角色模板
func (s *PermissionTemplateService) GetCustomRoleTemplates() []RoleTemplate {
	var templates []RoleTemplate
	
	// 查询模板基本信息
	var templateRecords []struct {
		ID          string `json:"id"`
		Name        string `json:"name"`
		DisplayName string `json:"display_name"`
		Description string `json:"description"`
		Category    string `json:"category"`
		IsDefault   bool   `json:"is_default"`
	}
	
	err := s.db.Table("role_templates").
		Where("is_default = false").
		Find(&templateRecords).Error
	if err != nil {
		return templates // 返回空列表
	}
	
	// 为每个模板查询权限
	for _, record := range templateRecords {
		var permissions []string
		err := s.db.Table("role_template_permissions").
			Select("permission_code").
			Where("template_id = ?", record.ID).
			Pluck("permission_code", &permissions).Error
		if err != nil {
			continue // 跳过有问题的模板
		}
		
		template := RoleTemplate{
			ID:          record.ID,
			Name:        record.Name,
			DisplayName: record.DisplayName,
			Description: record.Description,
			Category:    record.Category,
			Permissions: permissions,
			IsDefault:   record.IsDefault,
		}
		templates = append(templates, template)
	}
	
	return templates
}

// GetRoleTemplate 根据ID获取角色模板
func (s *PermissionTemplateService) GetRoleTemplate(templateID string) (*RoleTemplate, error) {
	allTemplates := s.GetAllRoleTemplates()
	
	for _, template := range allTemplates {
		if template.ID == templateID {
			return &template, nil
		}
	}
	
	return nil, fmt.Errorf("角色模板未找到: %s", templateID)
}

// ApplyRoleTemplate 应用角色模板到用户
func (s *PermissionTemplateService) ApplyRoleTemplate(ctx context.Context, safeID, userID, assignedBy uuid.UUID, templateID string) error {
	template, err := s.GetRoleTemplate(templateID)
	if err != nil {
		return err
	}
	
	// 创建权限服务实例
	permissionService := NewPermissionService(s.db)
	
	// 应用角色模板
	return permissionService.AssignSafeRole(ctx, safeID, userID, assignedBy, template.Name, template.Restrictions)
}

// CreateCustomRoleTemplate 创建自定义角色模板（仅支持系统级模板）
func (s *PermissionTemplateService) CreateCustomRoleTemplate(ctx context.Context, template RoleTemplate, createdBy uuid.UUID) error {
	// 强制设置为系统级模板
	template.Category = "system"
	// 验证权限代码是否存在
	for _, permissionCode := range template.Permissions {
		var count int64
		err := s.db.WithContext(ctx).Table("permission_definitions").
			Where("code = ? AND is_active = true", permissionCode).Count(&count).Error
		if err != nil {
			return fmt.Errorf("检查权限代码失败: %w", err)
		}
		if count == 0 {
			return fmt.Errorf("权限代码不存在: %s", permissionCode)
		}
	}
	
	// 将自定义模板保存到数据库
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1. 保存模板基本信息到 role_templates 表
		roleTemplate := map[string]interface{}{
			"id":           uuid.New(),
			"name":         template.Name,
			"display_name": template.DisplayName,
			"description":  template.Description,
			"category":     template.Category,
			"is_default":   false, // 自定义模板标记为非默认
			"created_by":   createdBy,
			"created_at":   time.Now(),
			"updated_at":   time.Now(),
		}
		
		err := tx.Table("role_templates").Create(roleTemplate).Error
		if err != nil {
			return fmt.Errorf("保存模板基本信息失败: %w", err)
		}
		
		// 2. 保存模板权限到 role_template_permissions 表
		templateID := roleTemplate["id"].(uuid.UUID)
		for _, permissionCode := range template.Permissions {
			templatePermission := map[string]interface{}{
				"id":              uuid.New(),
				"template_id":     templateID,
				"permission_code": permissionCode,
				"created_at":      time.Now(),
			}
			
			err := tx.Table("role_template_permissions").Create(templatePermission).Error
			if err != nil {
				return fmt.Errorf("保存模板权限失败: %w", err)
			}
		}
		
		return nil
	})
}

// ValidateRoleTemplate 验证角色模板
func (s *PermissionTemplateService) ValidateRoleTemplate(ctx context.Context, template RoleTemplate) error {
	// 验证必填字段
	if template.Name == "" {
		return fmt.Errorf("角色名称不能为空")
	}
	if template.DisplayName == "" {
		return fmt.Errorf("显示名称不能为空")
	}
	if len(template.Permissions) == 0 {
		return fmt.Errorf("权限列表不能为空")
	}
	
	// 验证权限代码
	for _, permissionCode := range template.Permissions {
		var count int64
		err := s.db.WithContext(ctx).Table("permission_definitions").
			Where("code = ? AND is_active = true", permissionCode).Count(&count).Error
		if err != nil {
			return fmt.Errorf("检查权限代码失败: %w", err)
		}
		if count == 0 {
			return fmt.Errorf("权限代码不存在: %s", permissionCode)
		}
	}
	
	return nil
}

// GetRecommendedRoleForUser 根据用户情况推荐角色
func (s *PermissionTemplateService) GetRecommendedRoleForUser(ctx context.Context, userID, safeID uuid.UUID) (*RoleTemplate, error) {
	// 检查用户是否是Safe创建者
	var safe struct {
		CreatedBy uuid.UUID `json:"created_by"`
	}
	err := s.db.WithContext(ctx).Table("safes").Select("created_by").
		Where("id = ?", safeID).First(&safe).Error
	if err != nil {
		return nil, fmt.Errorf("获取Safe信息失败: %w", err)
	}
	
	// 如果是创建者，推荐管理员角色
	if safe.CreatedBy == userID {
		template, _ := s.GetRoleTemplate("safe_admin")
		return template, nil
	}
	
	// 否则推荐操作员角色
	template, _ := s.GetRoleTemplate("safe_operator")
	return template, nil
}
