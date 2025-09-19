package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"web3-enterprise-multisig/internal/database"
	"web3-enterprise-multisig/internal/models"
	"web3-enterprise-multisig/internal/validators"
)

// GetProfile 获取用户资料
func GetProfile(c *gin.Context) {
	userID, _ := c.Get("userID")

	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "User not found",
			"code":  "USER_NOT_FOUND",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"user": gin.H{
			"id":             user.ID,
			"email":          user.Email,
			"username":       user.Username,
			"full_name":      user.FullName,
			"avatar_url":     user.AvatarURL,
			"role":           user.Role,
			"email_verified": user.EmailVerified,
			"created_at":     user.CreatedAt,
		},
	})
}

// UpdateProfile 更新用户资料
func UpdateProfile(c *gin.Context) {
	userID, _ := c.Get("userID")

	var req validators.UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
			"code":  "INVALID_REQUEST",
		})
		return
	}

	if err := validators.ValidateStruct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Validation failed",
			"code":    "VALIDATION_ERROR",
			"details": err.Error(),
		})
		return
	}

	// 更新用户信息
	updates := make(map[string]interface{})
	if req.FullName != "" {
		updates["full_name"] = req.FullName
	}
	if req.AvatarURL != "" {
		updates["avatar_url"] = req.AvatarURL
	}
	if req.WalletAddress != "" {
		updates["wallet_address"] = req.WalletAddress
	}

	if err := database.DB.Model(&models.User{}).Where("id = ?", userID).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update profile",
			"code":  "UPDATE_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Profile updated successfully",
	})
}

// GetUsers 获取用户列表（管理员功能）
func GetUsers(c *gin.Context) {
	role, _ := c.Get("role")
	// 临时兼容：支持 admin 和 super_admin 两种角色（JWT token可能还包含旧角色）
	if role != "super_admin" && role != "admin" {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Admin access required",
			"code":  "ADMIN_REQUIRED",
		})
		return
	}

	var users []models.User
	if err := database.DB.Select("id, email, username, full_name, role, is_active, created_at").Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch users",
			"code":  "FETCH_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"users": users,
	})
}

// GetUsersForSelection 获取用户列表用于选择（包含钱包地址）
func GetUsersForSelection(c *gin.Context) {
	var users []models.User
	// 只获取有钱包地址的活跃用户，用于Safe所有者选择
	if err := database.DB.Select("id, full_name, username, wallet_address").
		Where("is_active = ? AND wallet_address IS NOT NULL AND wallet_address != ''", true).
		Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch users",
			"code":  "FETCH_ERROR",
		})
		return
	}

	// 格式化返回数据
	var userList []gin.H
	for _, user := range users {
		name := ""
		if user.FullName != nil && *user.FullName != "" {
			name = *user.FullName
		} else {
			name = user.Username
		}
		
		userList = append(userList, gin.H{
			"id":             user.ID,
			"name":           name,
			"wallet_address": user.WalletAddress,
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"users": userList,
	})
}

// GetAvailableUsersForSafe 获取可添加到指定Safe的用户列表
func GetAvailableUsersForSafe(c *gin.Context) {
	safeID := c.Param("safeId")
	if safeID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Safe ID is required",
			"code":  "INVALID_SAFE_ID",
		})
		return
	}

	// 验证Safe ID格式
	if _, err := uuid.Parse(safeID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid Safe ID format",
			"code":  "INVALID_SAFE_ID_FORMAT",
		})
		return
	}

	// 验证Safe是否存在
	var safe models.Safe
	if err := database.DB.First(&safe, "id = ?", safeID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Safe not found",
				"code":  "SAFE_NOT_FOUND",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to verify Safe",
			"code":  "DATABASE_ERROR",
		})
		return
	}

	// 获取已经是Safe成员的用户ID列表
	var existingMemberIDs []string
	if err := database.DB.Table("safe_member_roles").
		Select("user_id").
		Where("safe_id = ? AND is_active = ?", safeID, true).
		Pluck("user_id", &existingMemberIDs).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch existing members",
			"code":  "DATABASE_ERROR",
		})
		return
	}

	// 构建查询条件：活跃用户，有钱包地址，不是现有成员
	query := database.DB.Select("id, username, email, full_name, wallet_address, created_at, updated_at").
		Where("is_active = ? AND wallet_address IS NOT NULL AND wallet_address != ''", true)

	// 如果有现有成员，排除他们
	if len(existingMemberIDs) > 0 {
		query = query.Where("id NOT IN ?", existingMemberIDs)
	}

	var users []models.User
	if err := query.Find(&users).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch available users",
			"code":  "DATABASE_ERROR",
		})
		return
	}

	// 格式化返回数据，匹配前端User接口
	var userList []gin.H
	for _, user := range users {
		username := user.Username
		if user.FullName != nil && *user.FullName != "" {
			username = *user.FullName
		}

		userList = append(userList, gin.H{
			"id":             user.ID.String(),
			"username":       username,
			"email":          user.Email,
			"wallet_address": user.WalletAddress,
			"department":     nil, // 可以后续从用户扩展信息中获取
			"position":       nil, // 可以后续从用户扩展信息中获取
			"status":         "active",
			"created_at":     user.CreatedAt.Format("2006-01-02T15:04:05Z07:00"),
			"updated_at":     user.UpdatedAt.Format("2006-01-02T15:04:05Z07:00"),
		})
	}

	c.JSON(http.StatusOK, gin.H{
		"users": userList,
	})
}

// AssignPermissions 为用户分配权限
func AssignPermissions(c *gin.Context) {
	userID := c.Param("id")
	
	var req struct {
		Permissions []string `json:"permissions" binding:"required"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
			"code":  "INVALID_REQUEST",
		})
		return
	}

	// 验证用户是否存在
	var user models.User
	if err := database.DB.First(&user, "id = ?", userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "User not found",
			"code":  "USER_NOT_FOUND",
		})
		return
	}

	// 获取当前操作用户ID
	currentUserID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "未找到当前用户信息",
			"code":    "MISSING_USER_CONTEXT",
		})
		return
	}

	// 开始数据库事务
	tx := database.DB.Begin()
	defer func() {
		if r := recover(); r != nil {
			tx.Rollback()
		}
	}()

	// 先删除用户现有的系统级权限（SafeID为NULL的权限）
	if err := tx.Where("user_id = ? AND safe_id IS NULL", userID).Delete(&models.UserCustomPermission{}).Error; err != nil {
		tx.Rollback()
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "清除现有权限失败",
			"error":   err.Error(),
		})
		return
	}

	// 为用户分配新的权限
	for _, permissionCode := range req.Permissions {
		permission := models.UserCustomPermission{
			SafeID:         nil, // 系统级权限使用nil
			UserID:         uuid.MustParse(userID),
			PermissionCode: permissionCode,
			Granted:        true,
			GrantedBy:      currentUserID.(uuid.UUID),
			GrantedReason:  nil, // 可以后续扩展添加分配原因
		}

		if err := tx.Create(&permission).Error; err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{
				"success": false,
				"message": "权限分配失败",
				"error":   err.Error(),
			})
			return
		}
	}

	// 提交事务
	if err := tx.Commit().Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "权限分配事务提交失败",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "权限分配成功",
		"data": gin.H{
			"user_id":     userID,
			"permissions": req.Permissions,
			"total":       len(req.Permissions),
		},
	})
}

// ChangePassword 修改用户密码
// @Summary 修改用户密码
// @Description 用户修改自己的密码
// @Tags 用户管理
// @Accept json
// @Produce json
// @Param request body gin.H true "修改密码请求"
// @Success 200 {object} gin.H
// @Failure 400 {object} gin.H
// @Failure 401 {object} gin.H
// @Failure 500 {object} gin.H
// @Router /api/v1/users/change-password [post]
func ChangePassword(c *gin.Context) {
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "用户未认证",
			"code":    "UNAUTHORIZED",
		})
		return
	}

	var request struct {
		CurrentPassword string `json:"current_password" binding:"required"`
		NewPassword     string `json:"new_password" binding:"required,min=8"`
		ConfirmPassword string `json:"confirm_password" binding:"required"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "请求参数无效",
			"error":   err.Error(),
		})
		return
	}

	// 验证新密码和确认密码是否一致
	if request.NewPassword != request.ConfirmPassword {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "新密码和确认密码不一致",
			"code":    "PASSWORD_MISMATCH",
		})
		return
	}

	// 获取用户信息
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"success": false,
			"message": "用户不存在",
			"code":    "USER_NOT_FOUND",
		})
		return
	}

	// 验证当前密码
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(request.CurrentPassword)); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "当前密码错误",
			"code":    "INVALID_CURRENT_PASSWORD",
		})
		return
	}

	// 加密新密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(request.NewPassword), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "密码加密失败",
			"error":   err.Error(),
		})
		return
	}

	// 更新密码
	if err := database.DB.Model(&user).Update("password_hash", string(hashedPassword)).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "密码更新失败",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "密码修改成功",
		"data": gin.H{
			"user_id": userID,
			"message": "密码已更新，请使用新密码登录",
		},
	})
}

// GetUserPermissions 获取用户权限列表
// @Summary 获取用户权限列表
// @Description 获取指定用户的所有权限
// @Tags Users
// @Accept json
// @Produce json
// @Param id path string true "用户ID"
// @Success 200 {object} gin.H
// @Failure 400 {object} gin.H
// @Failure 401 {object} gin.H
// @Failure 404 {object} gin.H
// @Failure 500 {object} gin.H
// @Router /api/v1/users/{id}/permissions [get]
func GetUserPermissions(c *gin.Context) {
	userID := c.Param("id")
	if userID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "用户ID不能为空",
			"code":    "INVALID_USER_ID",
		})
		return
	}

	// 验证用户ID格式
	if _, err := uuid.Parse(userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "用户ID格式无效",
			"code":    "INVALID_USER_ID_FORMAT",
		})
		return
	}

	// 检查用户是否存在
	var user models.User
	if err := database.DB.First(&user, "id = ?", userID).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{
				"success": false,
				"message": "用户不存在",
				"code":    "USER_NOT_FOUND",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "查询用户失败",
			"error":   err.Error(),
		})
		return
	}

	// 获取用户的系统级权限（SafeID为NULL的权限）
	var userPermissions []models.UserCustomPermission
	if err := database.DB.Where("user_id = ? AND granted = ? AND safe_id IS NULL", userID, true).Find(&userPermissions).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "获取用户权限失败",
			"error":   err.Error(),
		})
		return
	}

	// 提取权限代码列表
	var permissionCodes []string
	for _, perm := range userPermissions {
		permissionCodes = append(permissionCodes, perm.PermissionCode)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "获取用户权限成功",
		"data": gin.H{
			"user_id":     userID,
			"permissions": permissionCodes,
			"total":       len(permissionCodes),
		},
	})
}
