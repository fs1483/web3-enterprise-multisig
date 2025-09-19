// =====================================================
// 超级管理员初始化处理程序
// 版本: v1.0
// 功能: 提供系统初始化和健康检查的API接口
// 作者: Cascade AI
// 创建时间: 2025-09-16
// =====================================================

package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"web3-enterprise-multisig/internal/services"
)

// AdminInitHandler 超级管理员初始化处理程序
type AdminInitHandler struct {
	adminInitService *services.AdminInitService
}

// NewAdminInitHandler 创建初始化处理程序
func NewAdminInitHandler(adminInitService *services.AdminInitService) *AdminInitHandler {
	return &AdminInitHandler{
		adminInitService: adminInitService,
	}
}

// InitializeSystem 初始化系统
// @Summary 初始化系统超级管理员
// @Description 创建系统超级管理员账户并分配权限，仅在系统首次启动时调用
// @Tags 系统初始化
// @Accept json
// @Produce json
// @Success 200 {object} services.InitSystemResult
// @Failure 500 {object} gin.H
// @Router /api/admin/init [post]
func (h *AdminInitHandler) InitializeSystem(c *gin.Context) {
	result, err := h.adminInitService.InitializeSystem()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "系统初始化失败",
			"error":   err.Error(),
		})
		return
	}

	// 如果是新创建的超级管理员，返回临时密码
	if result.SuperAdminCreated {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "系统初始化成功",
			"data": gin.H{
				"super_admin_email": result.SuperAdminEmail,
				"temp_password":     result.TempPassword,
				"warning":          "请立即登录并修改密码！",
			},
		})
	} else {
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": result.Message,
			"data": gin.H{
				"super_admin_email": result.SuperAdminEmail,
			},
		})
	}
}

// CheckSystemHealth 检查系统健康状态
// @Summary 检查系统健康状态
// @Description 检查系统初始化状态和健康情况
// @Tags 系统监控
// @Accept json
// @Produce json
// @Success 200 {object} gin.H
// @Router /api/admin/health [get]
func (h *AdminInitHandler) CheckSystemHealth(c *gin.Context) {
	health := h.adminInitService.CheckSystemHealth()
	
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    health,
	})
}

// ResetSuperAdminPassword 重置超级管理员密码
// @Summary 重置超级管理员密码
// @Description 重置指定超级管理员的密码，返回新的临时密码
// @Tags 系统管理
// @Accept json
// @Produce json
// @Param request body gin.H true "重置密码请求"
// @Success 200 {object} gin.H
// @Failure 400 {object} gin.H
// @Failure 500 {object} gin.H
// @Router /api/admin/reset-password [post]
func (h *AdminInitHandler) ResetSuperAdminPassword(c *gin.Context) {
	var request struct {
		AdminEmail string `json:"admin_email" binding:"required,email"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "请求参数无效",
			"error":   err.Error(),
		})
		return
	}

	newPassword, err := h.adminInitService.ResetSuperAdminPassword(request.AdminEmail)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "密码重置失败",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "密码重置成功",
		"data": gin.H{
			"admin_email":   request.AdminEmail,
			"temp_password": newPassword,
			"warning":       "请立即登录并修改密码！",
		},
	})
}

// SetCustomPassword 设置管理员自定义密码
// @Summary 设置管理员自定义密码
// @Description 为指定管理员设置自定义密码
// @Tags 管理员管理
// @Accept json
// @Produce json
// @Param request body gin.H true "设置密码请求"
// @Success 200 {object} gin.H
// @Failure 400 {object} gin.H
// @Failure 500 {object} gin.H
// @Router /api/admin/set-password [post]
func (h *AdminInitHandler) SetCustomPassword(c *gin.Context) {
	var request struct {
		AdminEmail  string `json:"admin_email" binding:"required,email"`
		NewPassword string `json:"new_password" binding:"required,min=8"`
	}

	if err := c.ShouldBindJSON(&request); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"success": false,
			"message": "请求参数无效",
			"error":   err.Error(),
		})
		return
	}

	err := h.adminInitService.SetCustomPassword(request.AdminEmail, request.NewPassword)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"success": false,
			"message": "密码设置失败",
			"error":   err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "密码设置成功",
		"data": gin.H{
			"admin_email": request.AdminEmail,
			"message":     "密码已更新，请使用新密码登录",
		},
	})
}
