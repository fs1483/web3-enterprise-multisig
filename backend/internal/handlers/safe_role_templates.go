package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"web3-enterprise-multisig/internal/services"
)

// SafeRoleTemplateHandler Safe角色模板处理器
type SafeRoleTemplateHandler struct {
	db      *gorm.DB
	service *services.SafeRoleTemplateService
}

// NewSafeRoleTemplateHandler 创建Safe角色模板处理器
func NewSafeRoleTemplateHandler(db *gorm.DB) *SafeRoleTemplateHandler {
	return &SafeRoleTemplateHandler{
		db:      db,
		service: services.NewSafeRoleTemplateService(db),
	}
}

// ApplyTemplateToSafesRequest 批量应用模板请求
type ApplyTemplateToSafesRequest struct {
	TemplateID string   `json:"template_id" binding:"required"`
	SafeIDs    []string `json:"safe_ids" binding:"required,min=1"`
}

// ApplyTemplateToSafes 批量应用权限模板到多个Safe
// @Summary 批量应用权限模板到Safe
// @Description 将指定的权限模板应用到多个Safe，支持复选框批量操作
// @Tags safe-role-templates
// @Accept json
// @Produce json
// @Param request body ApplyTemplateToSafesRequest true "批量应用请求"
// @Success 200 {object} map[string]interface{} "应用成功"
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 401 {object} map[string]interface{} "未授权"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Router /api/v1/safe-role-templates/apply [post]
func (h *SafeRoleTemplateHandler) ApplyTemplateToSafes(c *gin.Context) {
	var req ApplyTemplateToSafesRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "请求参数错误: " + err.Error(),
		})
		return
	}

	// 获取当前用户ID
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"success": false,
			"message": "用户未认证",
		})
		return
	}

	appliedBy, ok := userID.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "用户ID格式错误",
		})
		return
	}

	// 检查用户是否有系统管理权限（超管可以操作所有Safe）
	hasSystemPermission := false
	if systemPerm, exists := c.Get("has_system_permission"); exists {
		hasSystemPermission = systemPerm.(bool)
	}

	// 转换Safe ID字符串为UUID
	var safeUUIDs []uuid.UUID
	for _, safeIDStr := range req.SafeIDs {
		safeUUID, err := uuid.Parse(safeIDStr)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"success": false,
				"message": "Safe ID格式错误: " + safeIDStr,
			})
			return
		}
		safeUUIDs = append(safeUUIDs, safeUUID)
	}

	// 构建服务请求
	serviceReq := services.ApplyTemplateToSafesRequest{
		TemplateID: req.TemplateID,
		SafeIDs:    safeUUIDs,
	}

	// 调用服务层（传递权限信息）
	err := h.service.ApplyTemplateToSafesWithPermissionCheck(c.Request.Context(), serviceReq, appliedBy, hasSystemPermission)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "应用模板失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "权限模板批量应用成功",
		"data": gin.H{
			"template_id":    req.TemplateID,
			"applied_safes":  len(req.SafeIDs),
			"applied_by":     appliedBy,
		},
	})
}

// GetSafeRoleTemplates 获取Safe的角色模板列表
// @Summary 获取Safe的角色模板
// @Description 获取指定Safe已应用的权限模板列表
// @Tags safe-role-templates
// @Accept json
// @Produce json
// @Param safeId path string true "Safe ID"
// @Success 200 {object} map[string]interface{} "获取成功"
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 401 {object} map[string]interface{} "未授权"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Router /api/v1/safes/{safeId}/role-templates [get]
func (h *SafeRoleTemplateHandler) GetSafeRoleTemplates(c *gin.Context) {
	safeIDStr := c.Param("safeId")
	safeID, err := uuid.Parse(safeIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Safe ID格式错误",
		})
		return
	}

	templates, err := h.service.GetSafeRoleTemplates(c.Request.Context(), safeID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "获取Safe角色模板失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "获取Safe角色模板成功",
		"data": gin.H{
			"safe_id":   safeID,
			"templates": templates,
			"count":     len(templates),
		},
	})
}

// RemoveTemplateFromSafe 从Safe中移除角色模板
// @Summary 移除Safe的角色模板
// @Description 从指定Safe中移除权限模板（软删除）
// @Tags safe-role-templates
// @Accept json
// @Produce json
// @Param safeId path string true "Safe ID"
// @Param templateId path string true "模板ID"
// @Success 200 {object} map[string]interface{} "移除成功"
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 401 {object} map[string]interface{} "未授权"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Router /api/v1/safes/{safeId}/role-templates/{templateId} [delete]
func (h *SafeRoleTemplateHandler) RemoveTemplateFromSafe(c *gin.Context) {
	safeIDStr := c.Param("safeId")
	safeID, err := uuid.Parse(safeIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Safe ID格式错误",
		})
		return
	}

	templateID := c.Param("templateId")
	if templateID == "" {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "模板ID不能为空",
		})
		return
	}

	err = h.service.RemoveTemplateFromSafe(c.Request.Context(), safeID, templateID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "移除角色模板失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "角色模板移除成功",
		"data": gin.H{
			"safe_id":     safeID,
			"template_id": templateID,
		},
	})
}

// GetAvailableRolesForSafe 获取Safe可用的角色列表
// @Summary 获取Safe可用角色
// @Description 获取指定Safe可用的角色列表，用于成员角色分配
// @Tags safe-role-templates
// @Accept json
// @Produce json
// @Param safeId path string true "Safe ID"
// @Success 200 {object} map[string]interface{} "获取成功"
// @Failure 400 {object} map[string]interface{} "请求参数错误"
// @Failure 401 {object} map[string]interface{} "未授权"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Router /api/v1/safes/{safeId}/available-roles [get]
func (h *SafeRoleTemplateHandler) GetAvailableRolesForSafe(c *gin.Context) {
	safeIDStr := c.Param("safeId")
	safeID, err := uuid.Parse(safeIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Safe ID格式错误",
		})
		return
	}

	// 检查是否有排除角色的查询参数
	excludeRole := c.Query("exclude")
	
	var roles []services.RoleOption
	
	if excludeRole != "" {
		// 如果有排除参数，使用排除方法
		roles, err = h.service.GetAvailableRolesForSafeExcluding(c.Request.Context(), safeID, excludeRole)
	} else {
		// 否则获取所有角色
		roles, err = h.service.GetAvailableRolesForSafe(c.Request.Context(), safeID)
	}
	
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "获取可用角色失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "获取Safe可用角色成功",
		"data": gin.H{
			"safe_id": safeID,
			"roles":   roles,
			"count":   len(roles),
		},
	})
}

// DebugSafeRoleTemplates 调试Safe角色模板数据（临时调试接口）
func (h *SafeRoleTemplateHandler) DebugSafeRoleTemplates(c *gin.Context) {
	safeIDStr := c.Param("safeId")
	safeID, err := uuid.Parse(safeIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "Safe ID格式错误",
		})
		return
	}

	// 直接查询数据库中的原始数据
	var templates []services.SafeRoleTemplate
	err = h.db.Table("safe_role_templates").
		Where("safe_id = ?", safeID).
		Find(&templates).Error
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "查询失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "调试数据获取成功",
		"data": gin.H{
			"safe_id":   safeID,
			"templates": templates,
			"count":     len(templates),
		},
	})
}

// GetSafeRoleTemplateStats 获取Safe角色模板统计信息
// @Summary 获取Safe角色模板统计
// @Description 获取Safe角色模板的统计信息，包括应用数量、分类统计等
// @Tags safe-role-templates
// @Accept json
// @Produce json
// @Param page query int false "页码" default(1)
// @Param limit query int false "每页数量" default(20)
// @Success 200 {object} map[string]interface{} "获取成功"
// @Failure 401 {object} map[string]interface{} "未授权"
// @Failure 500 {object} map[string]interface{} "服务器错误"
// @Router /api/v1/safe-role-templates/stats [get]
func (h *SafeRoleTemplateHandler) GetSafeRoleTemplateStats(c *gin.Context) {
	// 获取分页参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	if page < 1 {
		page = 1
	}
	if limit < 1 || limit > 100 {
		limit = 20
	}

	offset := (page - 1) * limit

	// 查询统计信息
	var stats struct {
		TotalApplications int64 `json:"total_applications"`
		ActiveApplications int64 `json:"active_applications"`
		SafeTemplates     int64 `json:"safe_templates"`
		SystemTemplates   int64 `json:"system_templates"`
	}

	// 总应用数
	h.db.Table("safe_role_templates").Count(&stats.TotalApplications)
	
	// 活跃应用数
	h.db.Table("safe_role_templates").Where("is_active = true").Count(&stats.ActiveApplications)
	
	// Safe模板数
	h.db.Table("safe_role_templates").Where("template_category = 'safe' AND is_active = true").Count(&stats.SafeTemplates)
	
	// 系统模板数
	h.db.Table("safe_role_templates").Where("template_category = 'system' AND is_active = true").Count(&stats.SystemTemplates)

	// 查询详细列表
	var applications []map[string]interface{}
	err := h.db.Table("safe_role_templates srt").
		Select(`
			srt.id,
			srt.safe_id,
			srt.template_id,
			srt.template_name,
			srt.template_display_name,
			srt.template_category,
			srt.is_active,
			srt.applied_at,
			s.name as safe_name,
			s.address as safe_address,
			u.username as applied_by_name
		`).
		Joins("LEFT JOIN safes s ON srt.safe_id = s.id").
		Joins("LEFT JOIN users u ON srt.applied_by = u.id").
		Where("srt.is_active = true").
		Order("srt.applied_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&applications).Error

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "获取统计信息失败: " + err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "获取Safe角色模板统计成功",
		"data": gin.H{
			"stats":        stats,
			"applications": applications,
			"pagination": gin.H{
				"page":  page,
				"limit": limit,
				"total": stats.ActiveApplications,
			},
		},
	})
}
