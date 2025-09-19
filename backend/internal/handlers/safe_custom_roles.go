package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"
)

// SafeCustomRoleHandler Safe自定义角色处理器
type SafeCustomRoleHandler struct {
	db *gorm.DB
}

// NewSafeCustomRoleHandler 创建Safe自定义角色处理器
func NewSafeCustomRoleHandler(db *gorm.DB) *SafeCustomRoleHandler {
	return &SafeCustomRoleHandler{
		db: db,
	}
}

// SafeCustomRole Safe自定义角色结构
type SafeCustomRole struct {
	ID              uuid.UUID              `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	SafeID          uuid.UUID              `json:"safe_id" gorm:"type:uuid;not null"`
	RoleID          string                 `json:"role_id" gorm:"type:varchar(100);not null"`
	RoleName        string                 `json:"role_name" gorm:"type:varchar(100);not null"`
	RoleDescription string                 `json:"role_description" gorm:"type:text"`
	Permissions     []string               `json:"permissions" gorm:"type:jsonb;not null;default:'[]'"`
	Restrictions    map[string]interface{} `json:"restrictions" gorm:"type:jsonb;default:'{}'"`
	IsActive        bool                   `json:"is_active" gorm:"default:true"`
	CreatedBy       uuid.UUID              `json:"created_by" gorm:"type:uuid;not null"`
	CreatedAt       time.Time              `json:"created_at" gorm:"default:CURRENT_TIMESTAMP"`
	UpdatedAt       time.Time              `json:"updated_at" gorm:"default:CURRENT_TIMESTAMP"`
}

// TableName 指定表名
func (SafeCustomRole) TableName() string {
	return "safe_custom_roles"
}

// CreateCustomRole 创建自定义角色
func (h *SafeCustomRoleHandler) CreateCustomRole(c *gin.Context) {
	safeID := c.Param("safeId")
	if safeID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Safe ID is required"})
		return
	}

	safeUUID, err := uuid.Parse(safeID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Safe ID format"})
		return
	}

	var req struct {
		RoleID          string                 `json:"role_id" binding:"required"`
		RoleName        string                 `json:"role_name" binding:"required"`
		RoleDescription string                 `json:"role_description"`
		Permissions     []string               `json:"permissions" binding:"required"`
		Restrictions    map[string]interface{} `json:"restrictions"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 获取当前用户ID
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "User not authenticated"})
		return
	}

	userUUID, err := uuid.Parse(userID.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid user ID"})
		return
	}

	// 检查角色ID是否已存在
	var existingRole SafeCustomRole
	err = h.db.Where("safe_id = ? AND role_id = ?", safeUUID, req.RoleID).First(&existingRole).Error
	if err == nil {
		c.JSON(http.StatusConflict, gin.H{"error": "Role ID already exists in this Safe"})
		return
	}

	// 创建自定义角色
	role := SafeCustomRole{
		SafeID:          safeUUID,
		RoleID:          req.RoleID,
		RoleName:        req.RoleName,
		RoleDescription: req.RoleDescription,
		Permissions:     req.Permissions,
		Restrictions:    req.Restrictions,
		IsActive:        true,
		CreatedBy:       userUUID,
	}

	if err := h.db.Create(&role).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to create custom role"})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Custom role created successfully",
		"data":    role,
	})
}

// GetCustomRoles 获取Safe的自定义角色列表
func (h *SafeCustomRoleHandler) GetCustomRoles(c *gin.Context) {
	safeID := c.Param("safeId")
	if safeID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Safe ID is required"})
		return
	}

	safeUUID, err := uuid.Parse(safeID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Safe ID format"})
		return
	}

	var roles []SafeCustomRole
	err = h.db.Where("safe_id = ?", safeUUID).
		Order("created_at DESC").
		Find(&roles).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch custom roles"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Custom roles retrieved successfully",
		"data": gin.H{
			"roles": roles,
			"count": len(roles),
		},
	})
}

// UpdateCustomRole 更新自定义角色
func (h *SafeCustomRoleHandler) UpdateCustomRole(c *gin.Context) {
	safeID := c.Param("safeId")
	roleID := c.Param("roleId")
	
	if safeID == "" || roleID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Safe ID and Role ID are required"})
		return
	}

	safeUUID, err := uuid.Parse(safeID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Safe ID format"})
		return
	}

	var req struct {
		RoleName        string                 `json:"role_name" binding:"required"`
		RoleDescription string                 `json:"role_description"`
		Permissions     []string               `json:"permissions" binding:"required"`
		Restrictions    map[string]interface{} `json:"restrictions"`
		IsActive        *bool                  `json:"is_active"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// 查找现有角色
	var role SafeCustomRole
	err = h.db.Where("safe_id = ? AND role_id = ?", safeUUID, roleID).First(&role).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Custom role not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to find custom role"})
		}
		return
	}

	// 更新角色信息
	updates := map[string]interface{}{
		"role_name":        req.RoleName,
		"role_description": req.RoleDescription,
		"permissions":      req.Permissions,
		"restrictions":     req.Restrictions,
		"updated_at":       time.Now(),
	}

	if req.IsActive != nil {
		updates["is_active"] = *req.IsActive
	}

	err = h.db.Model(&role).Updates(updates).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to update custom role"})
		return
	}

	// 重新获取更新后的角色
	err = h.db.Where("safe_id = ? AND role_id = ?", safeUUID, roleID).First(&role).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch updated role"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Custom role updated successfully",
		"data":    role,
	})
}

// DeleteCustomRole 删除自定义角色
func (h *SafeCustomRoleHandler) DeleteCustomRole(c *gin.Context) {
	safeID := c.Param("safeId")
	roleID := c.Param("roleId")
	
	if safeID == "" || roleID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Safe ID and Role ID are required"})
		return
	}

	safeUUID, err := uuid.Parse(safeID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Safe ID format"})
		return
	}

	// 检查角色是否存在
	var role SafeCustomRole
	err = h.db.Where("safe_id = ? AND role_id = ?", safeUUID, roleID).First(&role).Error
	if err != nil {
		if err == gorm.ErrRecordNotFound {
			c.JSON(http.StatusNotFound, gin.H{"error": "Custom role not found"})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to find custom role"})
		}
		return
	}

	// 检查是否有成员正在使用此角色
	var memberCount int64
	err = h.db.Table("safe_members").
		Where("safe_id = ? AND role = ? AND is_active = true", safeUUID, roleID).
		Count(&memberCount).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to check role usage"})
		return
	}

	if memberCount > 0 {
		c.JSON(http.StatusConflict, gin.H{
			"error": "Cannot delete role that is currently assigned to members",
			"details": gin.H{
				"members_using_role": memberCount,
			},
		})
		return
	}

	// 删除角色
	err = h.db.Delete(&role).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to delete custom role"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Custom role deleted successfully",
	})
}

// GetRoleUsageStats 获取角色使用统计
func (h *SafeCustomRoleHandler) GetRoleUsageStats(c *gin.Context) {
	safeID := c.Param("safeId")
	if safeID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Safe ID is required"})
		return
	}

	safeUUID, err := uuid.Parse(safeID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid Safe ID format"})
		return
	}

	// 获取角色使用统计
	var stats []struct {
		RoleID      string `json:"role_id"`
		RoleName    string `json:"role_name"`
		MemberCount int64  `json:"member_count"`
		IsActive    bool   `json:"is_active"`
	}

	err = h.db.Table("safe_custom_roles scr").
		Select("scr.role_id, scr.role_name, scr.is_active, COUNT(sm.id) as member_count").
		Joins("LEFT JOIN safe_members sm ON sm.safe_id = scr.safe_id AND sm.role = scr.role_id AND sm.is_active = true").
		Where("scr.safe_id = ?", safeUUID).
		Group("scr.role_id, scr.role_name, scr.is_active").
		Find(&stats).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch role usage stats"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Role usage stats retrieved successfully",
		"data": gin.H{
			"stats": stats,
		},
	})
}
