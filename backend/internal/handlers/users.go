package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"

	"web3-enterprise-multisig/internal/database"
	"web3-enterprise-multisig/internal/models"
	"web3-enterprise-multisig/internal/validators"
)

// GetProfile 获取用户资料
func GetProfile(c *gin.Context) {
	userID, _ := c.Get("user_id")

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
	userID, _ := c.Get("user_id")

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
	if role != "admin" {
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
