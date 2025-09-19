package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"

	"web3-enterprise-multisig/internal/services"
)

// SystemRoleTemplateHandler 系统角色模板处理器
type SystemRoleTemplateHandler struct {
	db      *gorm.DB
	service *services.SystemRoleTemplateService
}

// NewSystemRoleTemplateHandler 创建系统角色模板处理器
func NewSystemRoleTemplateHandler(db *gorm.DB) *SystemRoleTemplateHandler {
	return &SystemRoleTemplateHandler{
		db:      db,
		service: services.NewSystemRoleTemplateService(db),
	}
}

// GetSystemRoleTemplates 获取系统级角色模板（用于Safe创建时的角色选择）
func (h *SystemRoleTemplateHandler) GetSystemRoleTemplates(c *gin.Context) {
	templates, err := h.service.GetSystemRoleTemplates(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch system role templates",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "System role templates retrieved successfully",
		"data": gin.H{
			"templates": templates,
			"count":     len(templates),
		},
	})
}

// GetDefaultCreatorRole 获取Safe创建者的默认角色
func (h *SystemRoleTemplateHandler) GetDefaultCreatorRole(c *gin.Context) {
	role, err := h.service.GetDefaultRoleForCreator(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch default creator role",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Default creator role retrieved successfully",
		"data":    role,
	})
}

// GetRoleTemplateByID 根据ID获取特定角色模板
func (h *SystemRoleTemplateHandler) GetRoleTemplateByID(c *gin.Context) {
	roleID := c.Param("roleId")
	if roleID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Role ID is required"})
		return
	}

	role, err := h.service.GetRoleTemplateByID(c.Request.Context(), roleID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Role template not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Role template retrieved successfully",
		"data":    role,
	})
}
