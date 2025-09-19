package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"web3-enterprise-multisig/internal/database"
	"web3-enterprise-multisig/internal/services"
)

// GetRoleTemplates 获取角色模板列表
func GetRoleTemplates(c *gin.Context) {
	category := c.DefaultQuery("category", "all") // all, safe, system
	
	templateService := services.NewPermissionTemplateService(database.DB)
	
	var templates []services.RoleTemplate
	switch category {
	case "safe":
		templates = templateService.GetSafeRoleTemplates()
	case "system":
		templates = templateService.GetSystemRoleTemplates()
	case "safe_creation":
		templates = templateService.GetRoleTemplatesForSafeCreation()
	default:
		templates = templateService.GetAllRoleTemplates()
	}

	c.JSON(http.StatusOK, gin.H{
		"templates": templates,
		"category":  category,
	})
}

// GetRoleTemplatesForSafeCreation 获取Safe创建时使用的角色模板
func GetRoleTemplatesForSafeCreation(c *gin.Context) {
	templateService := services.NewPermissionTemplateService(database.DB)
	templates := templateService.GetRoleTemplatesForSafeCreation()

	c.JSON(http.StatusOK, gin.H{
		"message": "Role templates for Safe creation retrieved successfully",
		"data": gin.H{
			"templates": templates,
			"count":     len(templates),
		},
	})
}

// GetRoleTemplate 获取单个角色模板
func GetRoleTemplate(c *gin.Context) {
	templateID := c.Param("id")
	if templateID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "模板ID不能为空",
			"code":  "MISSING_TEMPLATE_ID",
		})
		return
	}
	
	templateService := services.NewPermissionTemplateService(database.DB)
	template, err := templateService.GetRoleTemplate(templateID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": err.Error(),
			"code":  "TEMPLATE_NOT_FOUND",
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success":  true,
		"template": template,
	})
}

// ApplyRoleTemplate 应用角色模板
func ApplyRoleTemplate(c *gin.Context) {
	safeID := c.Param("safeId")
	templateID := c.Param("template_id")
	userID, _ := c.Get("userID")
	
	safeUUID, err := uuid.Parse(safeID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "无效的Safe ID",
			"code":  "INVALID_SAFE_ID",
		})
		return
	}
	
	var req struct {
		TargetUserID string `json:"target_user_id" binding:"required"`
	}
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "请求参数格式错误",
			"code":  "INVALID_REQUEST",
			"details": err.Error(),
		})
		return
	}
	
	targetUserID, err := uuid.Parse(req.TargetUserID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "无效的目标用户ID",
			"code":  "INVALID_TARGET_USER_ID",
		})
		return
	}
	
	templateService := services.NewPermissionTemplateService(database.DB)
	err = templateService.ApplyRoleTemplate(c.Request.Context(), safeUUID, targetUserID, userID.(uuid.UUID), templateID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "应用角色模板失败",
			"code":  "APPLY_TEMPLATE_ERROR",
			"details": err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "角色模板应用成功",
	})
}

// ValidateRoleTemplate 验证角色模板
func ValidateRoleTemplate(c *gin.Context) {
	var template services.RoleTemplate
	if err := c.ShouldBindJSON(&template); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "请求参数格式错误",
			"code":  "INVALID_REQUEST",
			"details": err.Error(),
		})
		return
	}
	
	templateService := services.NewPermissionTemplateService(database.DB)
	err := templateService.ValidateRoleTemplate(c.Request.Context(), template)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "角色模板验证失败",
			"code":  "TEMPLATE_VALIDATION_ERROR",
			"details": err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "角色模板验证通过",
		"template": template,
	})
}

// CreateCustomRoleTemplate 创建自定义角色模板
func CreateCustomRoleTemplate(c *gin.Context) {
	userID, _ := c.Get("userID")
	
	var template services.RoleTemplate
	if err := c.ShouldBindJSON(&template); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "请求参数格式错误",
			"code":  "INVALID_REQUEST",
			"details": err.Error(),
		})
		return
	}
	
	templateService := services.NewPermissionTemplateService(database.DB)
	
	// 先验证模板
	err := templateService.ValidateRoleTemplate(c.Request.Context(), template)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "角色模板验证失败",
			"code":  "TEMPLATE_VALIDATION_ERROR",
			"details": err.Error(),
		})
		return
	}
	
	// 创建自定义模板
	err = templateService.CreateCustomRoleTemplate(c.Request.Context(), template, userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "创建自定义角色模板失败",
			"code":  "CREATE_TEMPLATE_ERROR",
			"details": err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "自定义角色模板创建成功",
		"template": template,
	})
}

// GetRecommendedRole 获取推荐角色
func GetRecommendedRole(c *gin.Context) {
	safeID := c.Param("safeId")
	targetUserIDStr := c.Query("user_id")
	
	safeUUID, err := uuid.Parse(safeID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "无效的Safe ID",
			"code":  "INVALID_SAFE_ID",
		})
		return
	}
	
	var targetUserID uuid.UUID
	if targetUserIDStr != "" {
		targetUserID, err = uuid.Parse(targetUserIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "无效的用户ID",
				"code":  "INVALID_USER_ID",
			})
			return
		}
	} else {
		// 如果没有指定用户ID，使用当前用户
		userID, _ := c.Get("userID")
		targetUserID = userID.(uuid.UUID)
	}
	
	templateService := services.NewPermissionTemplateService(database.DB)
	recommendedRole, err := templateService.GetRecommendedRoleForUser(c.Request.Context(), targetUserID, safeUUID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "获取推荐角色失败",
			"code":  "GET_RECOMMENDED_ROLE_ERROR",
			"details": err.Error(),
		})
		return
	}
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"recommended_role": recommendedRole,
		"user_id": targetUserID,
		"safe_id": safeUUID,
	})
}
