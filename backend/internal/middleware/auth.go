package middleware

import (
    "net/http"
    "strings"

    "github.com/gin-gonic/gin"
    "web3-enterprise-multisig/internal/auth"
)

// JWTAuth JWT 认证中间件
func JWTAuth() gin.HandlerFunc {
    return func(c *gin.Context) {
        authHeader := c.GetHeader("Authorization")
        if authHeader == "" {
            c.JSON(http.StatusUnauthorized, gin.H{
                "error": "Authorization header required",
                "code":  "MISSING_AUTH_HEADER",
            })
            c.Abort()
            return
        }

        // 检查 Bearer 前缀
        tokenParts := strings.Split(authHeader, " ")
        if len(tokenParts) != 2 || tokenParts[0] != "Bearer" {
            c.JSON(http.StatusUnauthorized, gin.H{
                "error": "Invalid authorization header format",
                "code":  "INVALID_AUTH_FORMAT",
            })
            c.Abort()
            return
        }

        // 验证 token
        claims, err := auth.ValidateToken(tokenParts[1])
        if err != nil {
            c.JSON(http.StatusUnauthorized, gin.H{
                "error": "Invalid or expired token",
                "code":  "INVALID_TOKEN",
            })
            c.Abort()
            return
        }

        // 将用户信息存储到上下文
        c.Set("userID", claims.UserID)
        c.Set("username", claims.Username)
        c.Set("role", claims.Role)

        c.Next()
    }
}

// RequireRole 角色权限中间件
func RequireRole(roles ...string) gin.HandlerFunc {
    return func(c *gin.Context) {
        userRole, exists := c.Get("role")
        if !exists {
            c.JSON(http.StatusForbidden, gin.H{
                "error": "User role not found",
                "code":  "ROLE_NOT_FOUND",
            })
            c.Abort()
            return
        }

        role := userRole.(string)
        for _, requiredRole := range roles {
            if role == requiredRole {
                c.Next()
                return
            }
        }

        c.JSON(http.StatusForbidden, gin.H{
            "error": "Insufficient permissions",
            "code":  "INSUFFICIENT_PERMISSIONS",
        })
        c.Abort()
    }
}
