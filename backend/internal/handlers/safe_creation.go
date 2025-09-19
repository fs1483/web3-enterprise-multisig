package handlers

import (
	"net/http"
	"github.com/gin-gonic/gin"
	"web3-enterprise-multisig/internal/services"
	"web3-enterprise-multisig/internal/database"
)

// GetAvailableRolesForSafeCreation 获取创建Safe时可用的角色模板
// GET /api/v1/safe-creation/available-roles
func GetAvailableRolesForSafeCreation(c *gin.Context) {
	templateService := services.NewPermissionTemplateService(database.DB)
	
	// 获取所有系统级模板
	allTemplates := templateService.GetAllRoleTemplates()
	
	// 过滤出适合Safe的模板（safe和system类别）
	var availableRoles []services.RoleTemplate
	for _, template := range allTemplates {
		if template.Category == "safe" || template.Category == "system" {
			availableRoles = append(availableRoles, template)
		}
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"roles": availableRoles,
			"total": len(availableRoles),
		},
	})
}
