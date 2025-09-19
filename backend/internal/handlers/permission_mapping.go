package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"web3-enterprise-multisig/internal/database"
	"web3-enterprise-multisig/internal/models"
)

// PermissionMappingResponse 权限映射响应结构
type PermissionMappingResponse struct {
	Code           string `json:"code"`
	Name           string `json:"name"`
	Description    string `json:"description"`
	Category       string `json:"category"`
	Scope          string `json:"scope"`
	MappingType    string `json:"mapping_type"`
	MappingURL     string `json:"mapping_url"`
	MappingMethod  string `json:"mapping_method"`
	UIElementID    string `json:"ui_element_id"`
	ParentPermission string `json:"parent_permission"`
	DisplayOrder   int    `json:"display_order"`
	IsActive       bool   `json:"is_active"`
}

// PermissionMappingStats 权限映射统计
type PermissionMappingStats struct {
	MappingType string `json:"mapping_type"`
	Count       int64  `json:"count"`
	Description string `json:"description"`
}

// GetPermissionMappings 获取权限映射列表
func GetPermissionMappings(c *gin.Context) {
	mappingType := c.Query("mapping_type")
	category := c.Query("category")
	scope := c.Query("scope")
	
	// 构建查询
	query := database.DB.Table("permission_definitions").
		Where("mapping_type IS NOT NULL")
	
	if mappingType != "" {
		query = query.Where("mapping_type = ?", mappingType)
	}
	
	if category != "" {
		query = query.Where("category = ?", category)
	}
	
	if scope != "" {
		query = query.Where("scope = ?", scope)
	}
	
	var mappings []PermissionMappingResponse
	if err := query.Order("mapping_type, display_order, code").Find(&mappings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "获取权限映射失败",
			"details": err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"mappings": mappings,
			"total":    len(mappings),
		},
	})
}

// GetPermissionMappingsByType 按类型获取权限映射
func GetPermissionMappingsByType(c *gin.Context) {
	mappingType := c.Param("type")
	
	if mappingType == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "映射类型不能为空",
		})
		return
	}
	
	var mappings []PermissionMappingResponse
	if err := database.DB.Table("permission_definitions").
		Where("mapping_type = ? AND is_active = true", mappingType).
		Order("display_order, code").
		Find(&mappings).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "获取权限映射失败",
			"details": err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"type":     mappingType,
			"mappings": mappings,
			"count":    len(mappings),
		},
	})
}

// GetUserPermissionMappings 获取用户的权限映射
func GetUserPermissionMappings(c *gin.Context) {
	userIDInterface, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "用户未认证",
		})
		return
	}
	
	userID, ok := userIDInterface.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"error":   "用户ID格式错误",
		})
		return
	}
	
	mappingType := c.Query("mapping_type")
	
	// 构建查询 - 获取用户拥有的权限映射
	query := `
		SELECT DISTINCT 
			pd.code,
			pd.name,
			pd.description,
			pd.category,
			pd.scope,
			pd.mapping_type,
			pd.mapping_url,
			pd.mapping_method,
			pd.ui_element_id,
			pd.parent_permission,
			pd.display_order,
			pd.is_active
		FROM permission_definitions pd
		WHERE pd.mapping_type IS NOT NULL 
		AND pd.is_active = true
		AND (
			-- 超级管理员拥有所有权限
			EXISTS (
				SELECT 1 FROM users u 
				WHERE u.id = ? AND u.role = 'super_admin'
			)
			OR
			-- 系统级自定义权限
			EXISTS (
				SELECT 1 FROM user_custom_permissions ucp
				WHERE ucp.user_id = ? 
				AND ucp.permission_code = pd.code 
				AND ucp.granted = true
				AND ucp.safe_id IS NULL
				AND (ucp.expires_at IS NULL OR ucp.expires_at > NOW())
			)
			OR
			-- Safe级自定义权限
			EXISTS (
				SELECT 1 FROM user_custom_permissions ucp
				WHERE ucp.user_id = ? 
				AND ucp.permission_code = pd.code 
				AND ucp.granted = true
				AND ucp.safe_id IS NOT NULL
				AND (ucp.expires_at IS NULL OR ucp.expires_at > NOW())
			)
		)
	`
	
	if mappingType != "" {
		query += " AND pd.mapping_type = ?"
	}
	
	query += " ORDER BY pd.mapping_type, pd.display_order, pd.code"
	
	var mappings []PermissionMappingResponse
	var err error
	
	if mappingType != "" {
		err = database.DB.Raw(query, userID, userID, userID, mappingType).Scan(&mappings).Error
	} else {
		err = database.DB.Raw(query, userID, userID, userID).Scan(&mappings).Error
	}
	
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "获取用户权限映射失败",
			"details": err.Error(),
		})
		return
	}
	
	// 按映射类型分组
	groupedMappings := make(map[string][]PermissionMappingResponse)
	for _, mapping := range mappings {
		if mapping.MappingType != "" {
			groupedMappings[mapping.MappingType] = append(groupedMappings[mapping.MappingType], mapping)
		}
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"user_id":  userID,
			"mappings": groupedMappings,
			"total":    len(mappings),
		},
	})
}

// GetPermissionMappingStats 获取权限映射统计
func GetPermissionMappingStats(c *gin.Context) {
	var stats []PermissionMappingStats
	
	query := `
		SELECT 
			mapping_type,
			COUNT(*) as count,
			CASE 
				WHEN mapping_type = 'menu' THEN '导航菜单权限'
				WHEN mapping_type = 'button' THEN '按钮操作权限'
				WHEN mapping_type = 'api' THEN 'API接口权限'
				WHEN mapping_type = 'page' THEN '页面访问权限'
				WHEN mapping_type = 'feature' THEN '功能模块权限'
				ELSE '其他权限'
			END as description
		FROM permission_definitions
		WHERE mapping_type IS NOT NULL
		GROUP BY mapping_type
		ORDER BY count DESC
	`
	
	if err := database.DB.Raw(query).Scan(&stats).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "获取权限映射统计失败",
			"details": err.Error(),
		})
		return
	}
	
	// 计算总数
	var total int64
	for _, stat := range stats {
		total += stat.Count
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"stats": stats,
			"total": total,
		},
	})
}

// UpdatePermissionMapping 更新权限映射信息
func UpdatePermissionMapping(c *gin.Context) {
	permissionCode := c.Param("code")
	if permissionCode == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "权限代码不能为空",
		})
		return
	}
	
	var req struct {
		MappingType      string `json:"mapping_type"`
		MappingURL       string `json:"mapping_url"`
		MappingMethod    string `json:"mapping_method"`
		UIElementID      string `json:"ui_element_id"`
		ParentPermission string `json:"parent_permission"`
		DisplayOrder     int    `json:"display_order"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数格式错误",
			"details": err.Error(),
		})
		return
	}
	
	// 验证映射类型的一致性
	if req.MappingType == "api" && (req.MappingURL == "" || req.MappingMethod == "") {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "API类型权限需要提供URL和HTTP方法",
		})
		return
	}
	
	if (req.MappingType == "menu" || req.MappingType == "button") && req.UIElementID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "菜单和按钮类型权限需要提供UI元素ID",
		})
		return
	}
	
	// 更新权限映射信息
	updates := map[string]interface{}{
		"mapping_type":      req.MappingType,
		"mapping_url":       req.MappingURL,
		"mapping_method":    req.MappingMethod,
		"ui_element_id":     req.UIElementID,
		"parent_permission": req.ParentPermission,
		"display_order":     req.DisplayOrder,
	}
	
	if err := database.DB.Model(&models.PermissionDefinition{}).
		Where("code = ?", permissionCode).
		Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"error":   "更新权限映射失败",
			"details": err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "权限映射更新成功",
		"data": gin.H{
			"code": permissionCode,
		},
	})
}

// ValidatePermissionMapping 验证权限映射配置
func ValidatePermissionMapping(c *gin.Context) {
	var req struct {
		MappingType   string `json:"mapping_type" binding:"required"`
		MappingURL    string `json:"mapping_url"`
		MappingMethod string `json:"mapping_method"`
		UIElementID   string `json:"ui_element_id"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "请求参数格式错误",
			"details": err.Error(),
		})
		return
	}
	
	var errors []string
	
	// 验证映射类型
	validTypes := []string{"menu", "button", "api", "page", "feature"}
	isValidType := false
	for _, validType := range validTypes {
		if req.MappingType == validType {
			isValidType = true
			break
		}
	}
	
	if !isValidType {
		errors = append(errors, "无效的映射类型")
	}
	
	// 验证API类型的必需字段
	if req.MappingType == "api" {
		if req.MappingURL == "" {
			errors = append(errors, "API类型权限需要提供URL")
		}
		if req.MappingMethod == "" {
			errors = append(errors, "API类型权限需要提供HTTP方法")
		} else {
			validMethods := []string{"GET", "POST", "PUT", "DELETE", "PATCH"}
			isValidMethod := false
			for _, method := range validMethods {
				if req.MappingMethod == method {
					isValidMethod = true
					break
				}
			}
			if !isValidMethod {
				errors = append(errors, "无效的HTTP方法")
			}
		}
	}
	
	// 验证菜单和按钮类型的必需字段
	if (req.MappingType == "menu" || req.MappingType == "button") && req.UIElementID == "" {
		errors = append(errors, "菜单和按钮类型权限需要提供UI元素ID")
	}
	
	// 检查UI元素ID是否重复
	if req.UIElementID != "" {
		var count int64
		database.DB.Model(&models.PermissionDefinition{}).
			Where("ui_element_id = ?", req.UIElementID).
			Count(&count)
		if count > 0 {
			errors = append(errors, "UI元素ID已存在")
		}
	}
	
	// 检查API映射是否重复
	if req.MappingType == "api" && req.MappingURL != "" && req.MappingMethod != "" {
		var count int64
		database.DB.Model(&models.PermissionDefinition{}).
			Where("mapping_url = ? AND mapping_method = ?", req.MappingURL, req.MappingMethod).
			Count(&count)
		if count > 0 {
			errors = append(errors, "API映射已存在")
		}
	}
	
	isValid := len(errors) == 0
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"is_valid": isValid,
			"errors":   errors,
		},
	})
}

// GetPermissionMappingByElement 根据UI元素ID获取权限映射
func GetPermissionMappingByElement(c *gin.Context) {
	elementID := c.Param("elementId")
	if elementID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "UI元素ID不能为空",
		})
		return
	}
	
	var mapping PermissionMappingResponse
	if err := database.DB.Table("permission_definitions").
		Where("ui_element_id = ? AND is_active = true", elementID).
		First(&mapping).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "未找到对应的权限映射",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "查询权限映射失败",
				"details": err.Error(),
			})
		}
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    mapping,
	})
}

// GetPermissionMappingByAPI 根据API路径和方法获取权限映射
func GetPermissionMappingByAPI(c *gin.Context) {
	apiURL := c.Query("url")
	method := c.Query("method")
	
	if apiURL == "" || method == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"error":   "API URL和HTTP方法不能为空",
		})
		return
	}
	
	var mapping PermissionMappingResponse
	if err := database.DB.Table("permission_definitions").
		Where("mapping_url = ? AND mapping_method = ? AND mapping_type = 'api' AND is_active = true", apiURL, method).
		First(&mapping).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"error":   "未找到对应的API权限映射",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"error":   "查询API权限映射失败",
				"details": err.Error(),
			})
		}
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    mapping,
	})
}
