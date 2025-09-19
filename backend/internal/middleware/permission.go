package middleware

import (
	"context"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"web3-enterprise-multisig/internal/database"
	"web3-enterprise-multisig/internal/services"
)

// PermissionConfig 权限配置
type PermissionConfig struct {
	PermissionCode string                 // 权限代码
	SafeIDParam    string                 // Safe ID 参数名（如果需要）
	Context        map[string]interface{} // 额外上下文
	Optional       bool                   // 是否可选权限检查
}

// RequirePermission 权限验证中间件
func RequirePermission(config PermissionConfig) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "用户未认证",
				"code":  "USER_NOT_AUTHENTICATED",
			})
			c.Abort()
			return
		}

		// 创建权限服务实例
		permissionService := services.NewPermissionService(database.DB)

		// 构建权限请求
		permissionRequest := services.PermissionRequest{
			UserID:         userID.(uuid.UUID),
			PermissionCode: config.PermissionCode,
			Context:        config.Context,
		}

		// 如果需要Safe ID，从URL参数中获取
		if config.SafeIDParam != "" {
			safeIDStr := c.Param(config.SafeIDParam)
			if safeIDStr != "" {
				safeID, err := uuid.Parse(safeIDStr)
				if err != nil {
					c.JSON(http.StatusBadRequest, gin.H{
						"error": "无效的Safe ID格式",
						"code":  "INVALID_SAFE_ID",
					})
					c.Abort()
					return
				}
				permissionRequest.SafeID = safeID
			}
		}

		// 检查权限
		result, err := permissionService.CheckPermission(context.Background(), permissionRequest)
		if err != nil {
			if config.Optional {
				// 可选权限检查失败时继续执行
				c.Set("permissionGranted", false)
				c.Set("permissionError", err.Error())
				c.Next()
				return
			}
			
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "权限检查失败",
				"code":  "PERMISSION_CHECK_ERROR",
				"details": err.Error(),
			})
			c.Abort()
			return
		}

		if !result.Granted {
			c.JSON(http.StatusForbidden, gin.H{
				"error": "权限不足",
				"code":  "INSUFFICIENT_PERMISSIONS",
				"required_permission": config.PermissionCode,
				"reason": result.DenialReason,
			})
			c.Abort()
			return
		}

		// 权限验证通过，将权限信息存储到上下文
		c.Set("permissionGranted", true)
		c.Set("permissionResult", result)
		c.Next()
	}
}

// RequireSafeAccess Safe访问权限中间件
func RequireSafeAccess(permissionCode string) gin.HandlerFunc {
	return RequirePermission(PermissionConfig{
		PermissionCode: permissionCode,
		SafeIDParam:    "id", // 默认从 :id 参数获取Safe ID
	})
}

// RequireSafeAccessByAddress 通过地址检查Safe访问权限
func RequireSafeAccessByAddress(permissionCode string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "用户未认证",
				"code":  "USER_NOT_AUTHENTICATED",
			})
			c.Abort()
			return
		}

		// 从URL参数获取Safe地址
		safeAddress := c.Param("address")
		if safeAddress == "" {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "缺少Safe地址参数",
				"code":  "MISSING_SAFE_ADDRESS",
			})
			c.Abort()
			return
		}

		// 通过地址查找Safe ID
		var safe struct {
			ID uuid.UUID `json:"id"`
		}
		if err := database.DB.Table("safes").Select("id").Where("address = ?", safeAddress).First(&safe).Error; err != nil {
			fmt.Printf("DEBUG: Safe查找失败 - 地址: %s, 错误: %v\n", safeAddress, err)
			c.JSON(http.StatusNotFound, gin.H{
				"error": "Safe未找到",
				"code":  "SAFE_NOT_FOUND",
			})
			c.Abort()
			return
		}
		fmt.Printf("DEBUG: 找到Safe - ID: %s, 地址: %s\n", safe.ID, safeAddress)

		// 创建权限服务实例并检查权限
		permissionService := services.NewPermissionService(database.DB)
		fmt.Printf("DEBUG: 开始权限检查 - 用户ID: %s, SafeID: %s, 权限代码: %s\n", userID.(uuid.UUID), safe.ID, permissionCode)
		
		result, err := permissionService.CheckPermission(context.Background(), services.PermissionRequest{
			UserID:         userID.(uuid.UUID),
			SafeID:         safe.ID,
			PermissionCode: permissionCode,
			Context:        map[string]interface{}{},
		})

		if err != nil {
			fmt.Printf("DEBUG: 权限检查错误 - %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "权限检查失败",
				"code":  "PERMISSION_CHECK_ERROR",
				"details": err.Error(),
			})
			c.Abort()
			return
		}

		fmt.Printf("DEBUG: 权限检查结果 - 授予: %v, 来源: %s, 角色: %s, 拒绝原因: %s\n", 
			result.Granted, result.Source, result.Role, result.DenialReason)

		if !result.Granted {
			fmt.Printf("❌ DEBUG: 权限被拒绝，返回403错误\n")
			c.JSON(http.StatusForbidden, gin.H{
				"error": "权限不足",
				"code":  "INSUFFICIENT_PERMISSIONS",
				"required_permission": permissionCode,
				"reason": result.DenialReason,
			})
			c.Abort()
			return
		}

		fmt.Printf("✅ DEBUG: 权限检查通过，继续处理请求\n")
		// 将Safe ID存储到上下文供后续使用
		c.Set("safeID", safe.ID)
		c.Set("permissionGranted", true)
		c.Set("permissionResult", result)
		fmt.Printf("✅ DEBUG: 中间件处理完成，调用c.Next()\n")
		c.Next()
		fmt.Printf("✅ DEBUG: c.Next()执行完成\n")
	}
}

// RequireSystemPermission 系统级权限中间件
func RequireSystemPermission(permissionCode string) gin.HandlerFunc {
	return RequirePermission(PermissionConfig{
		PermissionCode: permissionCode,
	})
}

// RequireAnyPermission 要求任一权限中间件
func RequireAnyPermission(permissionCodes ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		userID, exists := c.Get("userID")
		if !exists {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "用户未认证",
				"code":  "USER_NOT_AUTHENTICATED",
			})
			c.Abort()
			return
		}

		permissionService := services.NewPermissionService(database.DB)
		
		// 尝试每个权限
		for _, permissionCode := range permissionCodes {
			permissionRequest := services.PermissionRequest{
				UserID:         userID.(uuid.UUID),
				PermissionCode: permissionCode,
				Context:        map[string]interface{}{},
			}

			// 如果URL中有Safe ID参数，添加到请求中
			if safeIDStr := c.Param("id"); safeIDStr != "" {
				if safeID, err := uuid.Parse(safeIDStr); err == nil {
					permissionRequest.SafeID = safeID
				}
			}

			result, err := permissionService.CheckPermission(context.Background(), permissionRequest)
			if err == nil && result.Granted {
				c.Set("permissionGranted", true)
				c.Set("permissionResult", result)
				c.Set("grantedPermission", permissionCode)
				
				// 设置系统权限标志
				if permissionCode == "system.permission.manage" {
					c.Set("has_system_permission", true)
				} else {
					c.Set("has_system_permission", false)
				}
				
				c.Next()
				return
			}
		}

		// 所有权限都不满足
		c.JSON(http.StatusForbidden, gin.H{
			"error": "权限不足",
			"code":  "INSUFFICIENT_PERMISSIONS",
			"required_permissions": permissionCodes,
		})
		c.Abort()
	}
}

// OptionalPermissionCheck 可选权限检查中间件
func OptionalPermissionCheck(permissionCode string) gin.HandlerFunc {
	return RequirePermission(PermissionConfig{
		PermissionCode: permissionCode,
		SafeIDParam:    "id",
		Optional:       true,
	})
}
