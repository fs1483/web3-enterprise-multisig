// =====================================================
// 策略管理API处理器
// 版本: v2.0
// 功能: 提供企业级多签系统的策略管理API接口
// 作者: Cascade AI
// 创建时间: 2025-09-16
// =====================================================

package handlers

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"web3-enterprise-multisig/internal/database"
	"web3-enterprise-multisig/internal/services"
)

// =====================================================
// 请求和响应结构体定义
// =====================================================

// CreatePolicyRequest 创建策略请求
type CreatePolicyRequest struct {
	Name        string                 `json:"name" binding:"required"`
	Description string                 `json:"description"`
	PolicyType  string                 `json:"policy_type" binding:"required"`
	Parameters  map[string]interface{} `json:"parameters" binding:"required"`
	IsActive    bool                   `json:"is_active"`
}

// UpdatePolicyRequest 更新策略请求
type UpdatePolicyRequest struct {
	Name        *string                `json:"name"`
	Description *string                `json:"description"`
	Parameters  map[string]interface{} `json:"parameters"`
	IsActive    *bool                  `json:"is_active"`
}

// CreatePolicyTemplateRequest 创建策略模板请求
type CreatePolicyTemplateRequest struct {
	Name         string                 `json:"name" binding:"required"`
	Description  string                 `json:"description"`
	Category     string                 `json:"category" binding:"required"`
	PolicyType   string                 `json:"policy_type" binding:"required"`
	DefaultParams map[string]interface{} `json:"default_params" binding:"required"`
	IsPublic     bool                   `json:"is_public"`
}

// ValidatePolicyRequest 验证策略请求
type ValidatePolicyRequest struct {
	PolicyType string                 `json:"policy_type" binding:"required"`
	Parameters map[string]interface{} `json:"parameters" binding:"required"`
	Context    map[string]interface{} `json:"context"`
}

// =====================================================
// Safe策略管理API
// =====================================================

// GetSafePolicies 获取Safe的策略列表
// GET /api/v1/safes/:id/policies
func GetSafePolicies(c *gin.Context) {
	// 获取Safe ID
	safeIDStr := c.Param("safeId")
	safeID, err := uuid.Parse(safeIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "无效的Safe ID格式",
			"code":  "INVALID_SAFE_ID",
		})
		return
	}

	// 获取查询参数
	isActive := c.Query("is_active")
	policyType := c.Query("policy_type")

	// 获取当前用户ID
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "用户未认证",
			"code":  "UNAUTHORIZED",
		})
		return
	}

	// 创建权限服务实例进行权限检查
	permissionService := services.NewPermissionService(database.DB)
	hasPermission, err := permissionService.CheckPermission(c.Request.Context(), services.PermissionRequest{
		UserID:         userID.(uuid.UUID),
		SafeID:         safeID,
		PermissionCode: "safe.policy.view",
		Context:        map[string]interface{}{},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "权限检查失败",
			"code":  "PERMISSION_CHECK_FAILED",
			"details": err.Error(),
		})
		return
	}

	if !hasPermission.Granted {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "没有权限查看Safe策略",
			"code":  "PERMISSION_DENIED",
			"details": hasPermission.DenialReason,
		})
		return
	}

	// 构建查询条件
	query := database.DB.Table("policies").Where("safe_id = ?", safeID)

	if isActive == "true" {
		query = query.Where("is_active = true")
	} else if isActive == "false" {
		query = query.Where("is_active = false")
	}

	if policyType != "" {
		query = query.Where("policy_type = ?", policyType)
	}

	// 获取策略列表
	var policies []struct {
		ID          uuid.UUID `json:"id"`
		SafeID      uuid.UUID `json:"safe_id"`
		Name        string    `json:"name"`
		Description *string   `json:"description"`
		PolicyType  string    `json:"policy_type"`
		Parameters  string    `json:"parameters"`
		IsActive    bool      `json:"is_active"`
		CreatedBy   uuid.UUID `json:"created_by"`
		CreatedAt   string    `json:"created_at"`
		UpdatedAt   string    `json:"updated_at"`
	}

	err = query.Order("created_at DESC").Find(&policies).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "获取策略列表失败",
			"code":  "GET_POLICIES_FAILED",
			"details": err.Error(),
		})
		return
	}

	// 解析参数JSON
	var result []gin.H
	for _, policy := range policies {
		var params map[string]interface{}
		if err := json.Unmarshal([]byte(policy.Parameters), &params); err != nil {
			params = map[string]interface{}{}
		}

		result = append(result, gin.H{
			"id":          policy.ID,
			"safe_id":     policy.SafeID,
			"name":        policy.Name,
			"description": policy.Description,
			"policy_type": policy.PolicyType,
			"parameters":  params,
			"is_active":   policy.IsActive,
			"created_by":  policy.CreatedBy,
			"created_at":  policy.CreatedAt,
			"updated_at":  policy.UpdatedAt,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"policies": result,
			"total":    len(result),
			"filters": gin.H{
				"is_active":   isActive,
				"policy_type": policyType,
			},
		},
	})
}

// CreateSafePolicy 为Safe创建策略
// POST /api/v1/safes/:id/policies
func CreateSafePolicy(c *gin.Context) {
	// 获取Safe ID
	safeIDStr := c.Param("safeId")
	safeID, err := uuid.Parse(safeIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "无效的Safe ID格式",
			"code":  "INVALID_SAFE_ID",
		})
		return
	}

	// 获取当前用户ID
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "用户未认证",
			"code":  "UNAUTHORIZED",
		})
		return
	}

	// 解析请求体
	var req CreatePolicyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "请求参数格式错误",
			"code":  "INVALID_REQUEST_FORMAT",
			"details": err.Error(),
		})
		return
	}

	// 创建权限服务实例进行权限检查
	permissionService := services.NewPermissionService(database.DB)
	hasPermission, err := permissionService.CheckPermission(c.Request.Context(), services.PermissionRequest{
		UserID:         userID.(uuid.UUID),
		SafeID:         safeID,
		PermissionCode: "safe.policy.create",
		Context:        map[string]interface{}{},
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "权限检查失败",
			"code":  "PERMISSION_CHECK_FAILED",
			"details": err.Error(),
		})
		return
	}

	if !hasPermission.Granted {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "没有权限创建Safe策略",
			"code":  "PERMISSION_DENIED",
			"details": hasPermission.DenialReason,
		})
		return
	}

	// TODO: 验证策略参数
	// 这里需要实现策略参数验证逻辑
	// 暂时跳过验证，直接创建策略
	log.Printf("创建策略: %s, 类型: %s", req.Name, req.PolicyType)

	// 序列化参数
	parametersJSON, err := json.Marshal(req.Parameters)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "参数序列化失败",
			"code":  "PARAMETER_SERIALIZATION_FAILED",
			"details": err.Error(),
		})
		return
	}

	// 创建策略记录
	policyID := uuid.New()
	err = database.DB.Exec(`
		INSERT INTO policies (id, safe_id, name, description, policy_type, parameters, is_active, created_by)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)
	`, policyID, safeID, req.Name, req.Description, req.PolicyType, string(parametersJSON), req.IsActive, userID).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "创建策略失败",
			"code":  "CREATE_POLICY_FAILED",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "策略创建成功",
		"data": gin.H{
			"id":          policyID,
			"safe_id":     safeID,
			"name":        req.Name,
			"description": req.Description,
			"policy_type": req.PolicyType,
			"parameters":  req.Parameters,
			"is_active":   req.IsActive,
			"created_by":  userID,
		},
	})
}

// ValidatePolicy 验证策略配置
// POST /api/v1/policies/validate
func ValidatePolicy(c *gin.Context) {
	// 解析请求体
	var req ValidatePolicyRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "请求参数格式错误",
			"code":  "INVALID_REQUEST_FORMAT",
			"details": err.Error(),
		})
		return
	}

	// TODO: 实现策略验证逻辑
	// 暂时返回验证通过
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"is_valid": true,
			"error":    nil,
			"policy_type": req.PolicyType,
		},
	})
}
