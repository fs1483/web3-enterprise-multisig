package handlers

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"web3-enterprise-multisig/internal/database"
	"web3-enterprise-multisig/internal/models"
	"web3-enterprise-multisig/internal/services"
)

// GetPermissionDefinitionsV2 获取权限定义列表（新版本）
// GET /api/v1/permission-definitions
func GetPermissionDefinitionsV2(c *gin.Context) {
	// 解析查询参数
	var filter models.PermissionDefinitionFilter
	if err := c.ShouldBindQuery(&filter); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "查询参数格式错误",
			"code":  "INVALID_QUERY_PARAMS",
			"details": err.Error(),
		})
		return
	}

	// 创建服务实例
	service := services.NewPermissionDefinitionService(database.DB)

	// 获取权限定义列表
	definitions, total, err := service.GetPermissionDefinitions(c.Request.Context(), filter)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "获取权限定义列表失败",
			"code":  "GET_DEFINITIONS_FAILED",
			"details": err.Error(),
		})
		return
	}

	// 计算分页信息
	page := filter.Page
	if page <= 0 {
		page = 1
	}
	pageSize := filter.PageSize
	if pageSize <= 0 {
		pageSize = 20
	}
	totalPages := (int(total) + pageSize - 1) / pageSize

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"definitions": definitions,
			"pagination": gin.H{
				"page":        page,
				"page_size":   pageSize,
				"total":       total,
				"total_pages": totalPages,
			},
		},
	})
}

// GetPermissionDefinitionByID 根据ID获取权限定义
// GET /api/v1/permission-definitions/:id
func GetPermissionDefinitionByID(c *gin.Context) {
	// 解析ID参数
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "无效的权限定义ID格式",
			"code":  "INVALID_DEFINITION_ID",
		})
		return
	}

	// 创建服务实例
	service := services.NewPermissionDefinitionService(database.DB)

	// 获取权限定义
	definition, err := service.GetPermissionDefinitionByID(c.Request.Context(), id)
	if err != nil {
		if err.Error() == "权限定义不存在" {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "权限定义不存在",
				"code":  "DEFINITION_NOT_FOUND",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "获取权限定义失败",
			"code":  "GET_DEFINITION_FAILED",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    definition,
	})
}

// CreatePermissionDefinition 创建权限定义
// POST /api/v1/permission-definitions
func CreatePermissionDefinition(c *gin.Context) {
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
	var req models.PermissionDefinitionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "请求参数格式错误",
			"code":  "INVALID_REQUEST_BODY",
			"details": err.Error(),
		})
		return
	}

	// 创建服务实例
	service := services.NewPermissionDefinitionService(database.DB)

	// 创建权限定义
	definition, err := service.CreatePermissionDefinition(c.Request.Context(), req, userID.(uuid.UUID))
	if err != nil {
		if err.Error() == fmt.Sprintf("权限代码 '%s' 已存在", req.Code) {
			c.JSON(http.StatusConflict, gin.H{
				"error": err.Error(),
				"code":  "PERMISSION_CODE_EXISTS",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "创建权限定义失败",
			"code":  "CREATE_DEFINITION_FAILED",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    definition,
		"message": "权限定义创建成功",
	})
}

// UpdatePermissionDefinition 更新权限定义
// PUT /api/v1/permission-definitions/:id
func UpdatePermissionDefinition(c *gin.Context) {
	// 获取当前用户ID
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "用户未认证",
			"code":  "UNAUTHORIZED",
		})
		return
	}

	// 解析ID参数
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "无效的权限定义ID格式",
			"code":  "INVALID_DEFINITION_ID",
		})
		return
	}

	// 解析请求体
	var req models.PermissionDefinitionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "请求参数格式错误",
			"code":  "INVALID_REQUEST_BODY",
			"details": err.Error(),
		})
		return
	}

	// 创建服务实例
	service := services.NewPermissionDefinitionService(database.DB)

	// 更新权限定义
	definition, err := service.UpdatePermissionDefinition(c.Request.Context(), id, req, userID.(uuid.UUID))
	if err != nil {
		if err.Error() == "权限定义不存在" {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "权限定义不存在",
				"code":  "DEFINITION_NOT_FOUND",
			})
			return
		}
		if err.Error() == "系统权限不允许修改" {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "系统权限不允许修改",
				"code":  "SYSTEM_PERMISSION_READONLY",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "更新权限定义失败",
			"code":  "UPDATE_DEFINITION_FAILED",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    definition,
		"message": "权限定义更新成功",
	})
}

// DeletePermissionDefinition 删除权限定义
// DELETE /api/v1/permission-definitions/:id
func DeletePermissionDefinition(c *gin.Context) {
	// 解析ID参数
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "无效的权限定义ID格式",
			"code":  "INVALID_DEFINITION_ID",
		})
		return
	}

	// 创建服务实例
	service := services.NewPermissionDefinitionService(database.DB)

	// 删除权限定义
	err = service.DeletePermissionDefinition(c.Request.Context(), id)
	if err != nil {
		if err.Error() == "权限定义不存在" {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "权限定义不存在",
				"code":  "DEFINITION_NOT_FOUND",
			})
			return
		}
		if err.Error() == "系统权限不允许删除" {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "系统权限不允许删除",
				"code":  "SYSTEM_PERMISSION_READONLY",
			})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
			"code":  "DELETE_DEFINITION_FAILED",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "权限定义删除成功",
	})
}

// TogglePermissionDefinition 切换权限定义的激活状态
// PATCH /api/v1/permission-definitions/:id/toggle
func TogglePermissionDefinition(c *gin.Context) {
	// 解析ID参数
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "无效的权限定义ID格式",
			"code":  "INVALID_DEFINITION_ID",
		})
		return
	}

	// 创建服务实例
	service := services.NewPermissionDefinitionService(database.DB)

	// 切换权限定义状态
	definition, err := service.TogglePermissionDefinition(c.Request.Context(), id)
	if err != nil {
		if err.Error() == "权限定义不存在" {
			c.JSON(http.StatusNotFound, gin.H{
				"error": "权限定义不存在",
				"code":  "DEFINITION_NOT_FOUND",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "切换权限状态失败",
			"code":  "TOGGLE_DEFINITION_FAILED",
			"details": err.Error(),
		})
		return
	}

	status := "激活"
	if !definition.IsActive {
		status = "停用"
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    definition,
		"message": fmt.Sprintf("权限定义已%s", status),
	})
}

// GetPermissionCategories 获取权限分类列表
// GET /api/v1/permission-definitions/categories
func GetPermissionCategories(c *gin.Context) {
	// 创建服务实例
	service := services.NewPermissionDefinitionService(database.DB)

	// 获取权限分类
	categories, err := service.GetPermissionCategories(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "获取权限分类失败",
			"code":  "GET_CATEGORIES_FAILED",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"categories": categories,
		},
	})
}

// GetPermissionScopes 获取权限作用域列表
// GET /api/v1/permission-definitions/scopes
func GetPermissionScopes(c *gin.Context) {
	// 创建服务实例
	service := services.NewPermissionDefinitionService(database.DB)

	// 获取权限作用域
	scopes, err := service.GetPermissionScopes(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "获取权限作用域失败",
			"code":  "GET_SCOPES_FAILED",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": gin.H{
			"scopes": scopes,
		},
	})
}
