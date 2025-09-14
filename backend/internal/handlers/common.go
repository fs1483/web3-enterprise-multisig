package handlers

import (
    "net/http"

    "github.com/gin-gonic/gin"
    "web3-enterprise-multisig/internal/database"
)

// HealthCheck 健康检查
func HealthCheck(c *gin.Context) {
    // 检查数据库连接
    if err := database.HealthCheck(); err != nil {
        c.JSON(http.StatusServiceUnavailable, gin.H{
            "status":   "unhealthy",
            "database": "disconnected",
            "error":    err.Error(),
        })
        return
    }

    c.JSON(http.StatusOK, gin.H{
        "status":   "healthy",
        "database": "connected",
        "service":  "multisig-api",
        "version":  "1.0.0",
    })
}
