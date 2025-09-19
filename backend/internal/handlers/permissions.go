// =====================================================
// 权限管理API处理器
// 版本: v2.0
// 功能: 提供企业级多签系统的权限管理API接口
// 作者: Cascade AI
// 创建时间: 2025-09-16
// =====================================================

package handlers

import (
	"net/http"
	"regexp"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"web3-enterprise-multisig/internal/database"
	"web3-enterprise-multisig/internal/models"
	"web3-enterprise-multisig/internal/services"
)

// =====================================================
// 请求和响应结构体定义
// =====================================================

// AssignRoleRequest 分配角色请求
type AssignRoleRequest struct {
	UserID       uuid.UUID              `json:"user_id" binding:"required"`
	Role         string                 `json:"role" binding:"required"`
	Restrictions map[string]interface{} `json:"restrictions,omitempty"`
}

// CheckPermissionRequest 权限检查请求
type CheckPermissionRequest struct {
	PermissionCode string                 `json:"permission_code" binding:"required"`
	Context        map[string]interface{} `json:"context,omitempty"`
}

// CreateCustomPermissionRequest 创建自定义权限请求
type CreateCustomPermissionRequest struct {
	Code        string `json:"code" binding:"required"`
	Name        string `json:"name" binding:"required"`
	Description string `json:"description"`
	Category    string `json:"category" binding:"required"`
	Scope       string `json:"scope" binding:"required"`
}

// =====================================================
// Safe权限管理API
// =====================================================

// GetSafeMembers 获取Safe成员列表
// GET /api/v1/safes/:id/members
func GetSafeMembers(c *gin.Context) {
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

	// 创建权限服务实例
	permissionService := services.NewPermissionService(database.DB)

	// 首先检查用户是否是超级管理员
	var user models.User
	err = database.DB.Where("id = ?", userID).First(&user).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "获取用户信息失败",
			"code":  "GET_USER_FAILED",
			"details": err.Error(),
		})
		return
	}

	// 超级管理员可以查看所有Safe成员
	isSuperAdmin := user.Role == "super_admin"
	
	var hasAccess bool
	if isSuperAdmin {
		hasAccess = true
	} else {
		// 检查用户是否有查看成员的权限
		hasPermission, err := permissionService.CheckPermission(c.Request.Context(), services.PermissionRequest{
			UserID:         userID.(uuid.UUID),
			SafeID:         safeID,
			PermissionCode: "safe.member.view",
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

		hasAccess = hasPermission.Granted
	}

	// 如果没有权限，检查用户是否是Safe的创建者或所有者
	if !hasAccess {
		// 查询Safe信息
		var safe models.Safe
		err := database.DB.Where("id = ?", safeID).First(&safe).Error
		if err != nil {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Safe不存在",
				"code":  "SAFE_NOT_FOUND",
			})
			return
		}

		// 检查是否是创建者
		isCreator := safe.CreatedBy == userID.(uuid.UUID)
		
		// 检查是否是所有者（需要用户的钱包地址）
		isOwner := false
		if user.WalletAddress != nil && *user.WalletAddress != "" {
			for _, owner := range safe.Owners {
				if strings.EqualFold(owner, *user.WalletAddress) {
					isOwner = true
					break
				}
			}
		}

		// 如果既不是创建者也不是所有者，拒绝访问
		if !isCreator && !isOwner {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "没有权限查看Safe成员",
				"code":  "PERMISSION_DENIED",
				"details": "用户不是Safe的创建者或所有者",
			})
			return
		}
	}

	// 获取Safe成员列表
	members, err := permissionService.GetSafeMembers(c.Request.Context(), safeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "获取Safe成员列表失败",
			"code":  "GET_MEMBERS_FAILED",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"safe_id": safeID,
			"members": members,
			"total":   len(members),
		},
	})
}

// GetSafeRoleConfigurations 获取Safe的角色配置
// GET /api/v1/safes/:id/roles
func GetSafeRoleConfigurations(c *gin.Context) {
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

	// 创建权限服务实例
	permissionService := services.NewPermissionService(database.DB)

	// 检查用户是否有查看角色配置的权限（使用与成员管理相同的权限检查逻辑）
	var user models.User
	err = database.DB.Where("id = ?", userID).First(&user).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "获取用户信息失败",
			"code":  "GET_USER_FAILED",
			"details": err.Error(),
		})
		return
	}

	// 超级管理员可以查看所有Safe角色配置
	isSuperAdmin := user.Role == "super_admin"
	
	if !isSuperAdmin {
		// 检查用户是否有查看权限
		hasPermission, err := permissionService.CheckPermission(c.Request.Context(), services.PermissionRequest{
			UserID:         userID.(uuid.UUID),
			SafeID:         safeID,
			PermissionCode: "safe.member.view",
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
			// 检查是否是Safe创建者或所有者
			var safe models.Safe
			err := database.DB.Where("id = ?", safeID).First(&safe).Error
			if err != nil {
				c.JSON(http.StatusNotFound, gin.H{
					"error": "Safe不存在",
					"code":  "SAFE_NOT_FOUND",
				})
				return
			}

			isCreator := safe.CreatedBy == userID.(uuid.UUID)
			isOwner := false
			if user.WalletAddress != nil && *user.WalletAddress != "" {
				for _, owner := range safe.Owners {
					if strings.EqualFold(owner, *user.WalletAddress) {
						isOwner = true
						break
					}
				}
			}

			if !isCreator && !isOwner {
				c.JSON(http.StatusForbidden, gin.H{
					"error": "没有权限查看Safe角色配置",
					"code":  "PERMISSION_DENIED",
				})
				return
			}
		}
	}

	// 获取角色配置
	roleConfigs, err := permissionService.GetSafeRoleConfigurations(c.Request.Context(), safeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "获取角色配置失败",
			"code":  "GET_ROLE_CONFIGS_FAILED",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"safe_id": safeID,
			"roles":   roleConfigs,
			"total":   len(roleConfigs),
		},
	})
}

// CreateCustomRole 创建自定义角色
// POST /api/v1/safes/:id/roles
func CreateCustomRole(c *gin.Context) {
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
	var req struct {
		Role        string   `json:"role" binding:"required"`
		Name        string   `json:"name" binding:"required"`
		Description string   `json:"description"`
		Color       string   `json:"color"`
		RoleLevel   int      `json:"role_level" binding:"required,min=1,max=10"`
		Permissions []string `json:"permissions" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "请求参数格式错误",
			"code":  "INVALID_REQUEST_FORMAT",
			"details": err.Error(),
		})
		return
	}

	// 验证角色名称格式（只允许字母、数字、下划线）
	if !isValidRoleName(req.Role) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "角色名称只能包含字母、数字和下划线",
			"code":  "INVALID_ROLE_NAME",
		})
		return
	}

	// 检查用户是否有创建角色的权限
	permissionService := services.NewPermissionService(database.DB)
	hasPermission, err := permissionService.CheckPermission(c.Request.Context(), services.PermissionRequest{
		UserID:         userID.(uuid.UUID),
		SafeID:         safeID,
		PermissionCode: "safe.member.assign_role",
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
			"error": "没有权限创建自定义角色",
			"code":  "PERMISSION_DENIED",
		})
		return
	}

	// 创建自定义角色
	err = permissionService.CreateCustomRole(c.Request.Context(), services.CreateCustomRoleRequest{
		SafeID:      safeID,
		Role:        req.Role,
		Name:        req.Name,
		Description: req.Description,
		Color:       req.Color,
		RoleLevel:   req.RoleLevel,
		Permissions: req.Permissions,
		CreatedBy:   userID.(uuid.UUID),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "创建自定义角色失败",
			"code":  "CREATE_ROLE_FAILED",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "自定义角色创建成功",
		"data": gin.H{
			"safe_id": safeID,
			"role":    req.Role,
		},
	})
}

// UpdateRolePermissions 更新角色权限配置
// PUT /api/v1/safes/:id/roles/:role
func UpdateRolePermissions(c *gin.Context) {
	// 获取Safe ID和角色名称
	safeIDStr := c.Param("safeId")
	safeID, err := uuid.Parse(safeIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "无效的Safe ID格式",
			"code":  "INVALID_SAFE_ID",
		})
		return
	}

	roleName := c.Param("role")
	if roleName == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "角色名称不能为空",
			"code":  "MISSING_ROLE_NAME",
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
	var req struct {
		Name        string   `json:"name"`
		Description string   `json:"description"`
		Color       string   `json:"color"`
		RoleLevel   *int     `json:"role_level"`
		Permissions []string `json:"permissions" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "请求参数格式错误",
			"code":  "INVALID_REQUEST_FORMAT",
			"details": err.Error(),
		})
		return
	}

	// 检查用户是否有编辑角色的权限
	permissionService := services.NewPermissionService(database.DB)
	hasPermission, err := permissionService.CheckPermission(c.Request.Context(), services.PermissionRequest{
		UserID:         userID.(uuid.UUID),
		SafeID:         safeID,
		PermissionCode: "safe.member.assign_role",
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
			"error": "没有权限编辑角色配置",
			"code":  "PERMISSION_DENIED",
		})
		return
	}

	// 更新角色权限
	err = permissionService.UpdateRolePermissions(c.Request.Context(), services.UpdateRolePermissionsRequest{
		SafeID:      safeID,
		Role:        roleName,
		Name:        req.Name,
		Description: req.Description,
		Color:       req.Color,
		RoleLevel:   req.RoleLevel,
		Permissions: req.Permissions,
		UpdatedBy:   userID.(uuid.UUID),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "更新角色权限失败",
			"code":  "UPDATE_ROLE_FAILED",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "角色权限更新成功",
		"data": gin.H{
			"safe_id": safeID,
			"role":    roleName,
		},
	})
}

// DeleteCustomRole 删除自定义角色
// DELETE /api/v1/safes/:id/roles/:role
func DeleteCustomRole(c *gin.Context) {
	// 获取Safe ID和角色名称
	safeIDStr := c.Param("safeId")
	safeID, err := uuid.Parse(safeIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "无效的Safe ID格式",
			"code":  "INVALID_SAFE_ID",
		})
		return
	}

	roleName := c.Param("role")
	if roleName == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "角色名称不能为空",
			"code":  "MISSING_ROLE_NAME",
		})
		return
	}

	// 检查是否是系统预设角色
	systemRoles := []string{"safe_admin", "safe_treasurer", "safe_operator", "safe_viewer"}
	for _, sysRole := range systemRoles {
		if roleName == sysRole {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "不能删除系统预设角色",
				"code":  "CANNOT_DELETE_SYSTEM_ROLE",
			})
			return
		}
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

	// 检查用户是否有删除角色的权限
	permissionService := services.NewPermissionService(database.DB)
	hasPermission, err := permissionService.CheckPermission(c.Request.Context(), services.PermissionRequest{
		UserID:         userID.(uuid.UUID),
		SafeID:         safeID,
		PermissionCode: "safe.member.assign_role",
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
			"error": "没有权限删除角色",
			"code":  "PERMISSION_DENIED",
		})
		return
	}

	// 删除自定义角色
	err = permissionService.DeleteCustomRole(c.Request.Context(), safeID, roleName, userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "删除角色失败",
			"code":  "DELETE_ROLE_FAILED",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "角色删除成功",
		"data": gin.H{
			"safe_id": safeID,
			"role":    roleName,
		},
	})
}

// isValidRoleName 验证角色名称格式
func isValidRoleName(role string) bool {
	// 只允许字母、数字、下划线，长度3-50字符
	matched, _ := regexp.MatchString("^[a-zA-Z0-9_]{3,50}$", role)
	return matched
}

// AssignSafeRole 为用户分配Safe角色
// POST /api/v1/safes/:id/members/roles
func AssignSafeRole(c *gin.Context) {
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
	assignedBy, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "用户未认证",
			"code":  "UNAUTHORIZED",
		})
		return
	}

	// 解析请求体
	var req AssignRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "请求参数格式错误",
			"code":  "INVALID_REQUEST_FORMAT",
			"details": err.Error(),
		})
		return
	}

	// 创建权限服务实例
	permissionService := services.NewPermissionService(database.DB)

	// 分配角色
	err = permissionService.AssignSafeRole(
		c.Request.Context(),
		safeID,
		req.UserID,
		assignedBy.(uuid.UUID),
		req.Role,
		req.Restrictions,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "分配角色失败",
			"code":  "ASSIGN_ROLE_FAILED",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "角色分配成功",
		"data": gin.H{
			"safe_id":     safeID,
			"user_id":     req.UserID,
			"role":        req.Role,
			"assigned_by": assignedBy,
		},
	})
}

// RemoveSafeMember 移除Safe成员
// DELETE /api/v1/safes/:id/members/:user_id
func RemoveSafeMember(c *gin.Context) {
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

	// 获取目标用户ID
	userIDStr := c.Param("user_id")
	targetUserID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "无效的用户ID格式",
			"code":  "INVALID_USER_ID",
		})
		return
	}

	// 获取当前用户ID
	removedBy, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "用户未认证",
			"code":  "UNAUTHORIZED",
		})
		return
	}

	// 创建权限服务实例
	permissionService := services.NewPermissionService(database.DB)

	// 移除成员角色
	err = permissionService.RemoveSafeRole(
		c.Request.Context(),
		safeID,
		targetUserID,
		removedBy.(uuid.UUID),
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "移除成员失败",
			"code":  "REMOVE_MEMBER_FAILED",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "成员移除成功",
		"data": gin.H{
			"safe_id":    safeID,
			"user_id":    targetUserID,
			"removed_by": removedBy,
		},
	})
}

// GetUserSafeRole 获取用户在Safe中的角色
// GET /api/v1/safes/:id/members/:user_id/role
func GetUserSafeRole(c *gin.Context) {
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

	// 获取目标用户ID
	userIDStr := c.Param("user_id")
	targetUserID, err := uuid.Parse(userIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "无效的用户ID格式",
			"code":  "INVALID_USER_ID",
		})
		return
	}

	// 获取当前用户ID
	currentUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "用户未认证",
			"code":  "UNAUTHORIZED",
		})
		return
	}

	// 创建权限服务实例
	permissionService := services.NewPermissionService(database.DB)

	// 检查权限（用户可以查看自己的角色，或者有查看成员权限）
	canView := false
	if targetUserID == currentUserID.(uuid.UUID) {
		canView = true
	} else {
		hasPermission, err := permissionService.CheckPermission(c.Request.Context(), services.PermissionRequest{
			UserID:         currentUserID.(uuid.UUID),
			SafeID:         safeID,
			PermissionCode: "safe.member.view",
			Context:        map[string]interface{}{},
		})
		if err == nil && hasPermission.Granted {
			canView = true
		}
	}

	if !canView {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "没有权限查看用户角色",
			"code":  "PERMISSION_DENIED",
		})
		return
	}

	// 获取用户角色
	role, err := permissionService.GetUserSafeRole(c.Request.Context(), targetUserID, safeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "获取用户角色失败",
			"code":  "GET_ROLE_FAILED",
			"details": err.Error(),
		})
		return
	}

	if role == nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "用户在该Safe中没有角色",
			"code":  "ROLE_NOT_FOUND",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"safe_id": safeID,
			"user_id": targetUserID,
			"role":    role,
		},
	})
}

// =====================================================
// 权限检查API
// =====================================================

// CheckPermission 检查用户权限
// POST /api/v1/safes/:id/permissions/check
func CheckPermission(c *gin.Context) {
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
	var req CheckPermissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "请求参数格式错误",
			"code":  "INVALID_REQUEST_FORMAT",
			"details": err.Error(),
		})
		return
	}

	// 创建权限服务实例
	permissionService := services.NewPermissionService(database.DB)

	// 检查权限
	result, err := permissionService.CheckPermission(c.Request.Context(), services.PermissionRequest{
		UserID:         userID.(uuid.UUID),
		SafeID:         safeID,
		PermissionCode: req.PermissionCode,
		Context:        req.Context,
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "权限检查失败",
			"code":  "PERMISSION_CHECK_FAILED",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}

// =====================================================
// 权限定义管理API
// =====================================================

// GetPermissionDefinitions 获取权限定义列表
// GET /api/v1/permissions/definitions
func GetPermissionDefinitions(c *gin.Context) {
	// 获取查询参数
	category := c.Query("category")
	scope := c.Query("scope")

	// 获取当前用户ID
	_, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "用户未认证",
			"code":  "UNAUTHORIZED",
		})
		return
	}

	// 创建权限服务实例
	permissionService := services.NewPermissionService(database.DB)

	// TODO: 检查用户是否有查看权限定义的权限
	// 这里暂时跳过权限检查，实际使用时需要检查系统管理员权限

	// 获取权限定义列表
	definitions, err := permissionService.GetPermissionDefinitions(c.Request.Context(), category, scope)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "获取权限定义失败",
			"code":  "GET_DEFINITIONS_FAILED",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"definitions": definitions,
			"total":       len(definitions),
			"filters": gin.H{
				"category": category,
				"scope":    scope,
			},
		},
	})
}

// CreateCustomPermission 创建自定义权限
// POST /api/v1/permissions/definitions
func CreateCustomPermission(c *gin.Context) {
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
	var req CreateCustomPermissionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "请求参数格式错误",
			"code":  "INVALID_REQUEST_FORMAT",
			"details": err.Error(),
		})
		return
	}

	// 创建权限服务实例
	permissionService := services.NewPermissionService(database.DB)

	// 创建自定义权限
	err := permissionService.CreateCustomPermission(
		c.Request.Context(),
		userID.(uuid.UUID),
		req.Code,
		req.Name,
		req.Description,
		req.Category,
		req.Scope,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "创建自定义权限失败",
			"code":  "CREATE_PERMISSION_FAILED",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "自定义权限创建成功",
		"data": gin.H{
			"code":        req.Code,
			"name":        req.Name,
			"description": req.Description,
			"category":    req.Category,
			"scope":       req.Scope,
			"created_by":  userID,
		},
	})
}

// =====================================================
// 权限审计日志API
// =====================================================

// GetPermissionAuditLogs 获取权限审计日志
// GET /api/v1/safes/:id/permissions/audit-logs
func GetPermissionAuditLogs(c *gin.Context) {
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
	pageStr := c.DefaultQuery("page", "1")
	limitStr := c.DefaultQuery("limit", "20")
	action := c.Query("action")
	userIDFilter := c.Query("user_id")

	page, err := strconv.Atoi(pageStr)
	if err != nil || page < 1 {
		page = 1
	}

	limit, err := strconv.Atoi(limitStr)
	if err != nil || limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	// 获取当前用户ID
	currentUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "用户未认证",
			"code":  "UNAUTHORIZED",
		})
		return
	}

	// 创建权限服务实例
	permissionService := services.NewPermissionService(database.DB)

	// 检查用户是否有查看审计日志的权限
	hasPermission, err := permissionService.CheckPermission(c.Request.Context(), services.PermissionRequest{
		UserID:         currentUserID.(uuid.UUID),
		SafeID:         safeID,
		PermissionCode: "safe.member.view", // 使用成员查看权限作为审计日志查看权限
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
			"error": "没有权限查看审计日志",
			"code":  "PERMISSION_DENIED",
			"details": hasPermission.DenialReason,
		})
		return
	}

	// 构建查询条件
	query := database.DB.Table("permission_audit_logs").Where("safe_id = ?", safeID)

	if action != "" {
		query = query.Where("action = ?", action)
	}

	if userIDFilter != "" {
		if userUUID, err := uuid.Parse(userIDFilter); err == nil {
			query = query.Where("user_id = ?", userUUID)
		}
	}

	// 获取总数
	var total int64
	query.Count(&total)

	// 获取日志记录
	var logs []struct {
		ID                uuid.UUID `json:"id"`
		SafeID            uuid.UUID `json:"safe_id"`
		UserID            uuid.UUID `json:"user_id"`
		Action            string    `json:"action"`
		ResourceType      string    `json:"resource_type"`
		ResourceID        *uuid.UUID `json:"resource_id"`
		PermissionGranted bool      `json:"permission_granted"`
		RequiredPermission *string   `json:"required_permission"`
		UserRole          *string   `json:"user_role"`
		DenialReason      *string   `json:"denial_reason"`
		RequestContext    string    `json:"request_context"`
		IPAddress         *string   `json:"ip_address"`
		UserAgent         *string   `json:"user_agent"`
		CreatedAt         string    `json:"created_at"`
	}

	err = query.Order("created_at DESC").Offset(offset).Limit(limit).Find(&logs).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "获取审计日志失败",
			"code":  "GET_AUDIT_LOGS_FAILED",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"logs":  logs,
			"total": total,
			"pagination": gin.H{
				"page":  page,
				"limit": limit,
				"total": total,
				"pages": (total + int64(limit) - 1) / int64(limit),
			},
			"filters": gin.H{
				"action":  action,
				"user_id": userIDFilter,
			},
		},
	})
}

// =====================================================
// 辅助方法
// =====================================================

// validateRoleParameter 验证角色参数
func validateRoleParameter(role string) bool {
	validRoles := []string{"safe_admin", "safe_treasurer", "safe_operator", "safe_viewer"}
	for _, validRole := range validRoles {
		if role == validRole {
			return true
		}
	}
	return false
}

// validatePermissionScope 验证权限作用域
func validatePermissionScope(scope string) bool {
	validScopes := []string{"system", "safe", "operation"}
	for _, validScope := range validScopes {
		if scope == validScope {
			return true
		}
	}
	return false
}

// validatePermissionCategory 验证权限分类
func validatePermissionCategory(category string) bool {
	validCategories := []string{"safe", "proposal", "member", "policy", "system"}
	for _, validCategory := range validCategories {
		if category == validCategory {
			return true
		}
	}
	return false
}
