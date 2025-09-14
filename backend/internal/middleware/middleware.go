package middleware

import (
    "fmt"
    "log"
    "net/http"
    "time"

    "github.com/gin-contrib/cors"
    "github.com/gin-gonic/gin"
)

// Logger 日志中间件
func Logger() gin.HandlerFunc {
    return gin.LoggerWithFormatter(func(param gin.LogFormatterParams) string {
        return fmt.Sprintf("%s - [%s] \"%s %s %s %d %s \"%s\" %s\"\n",
            param.ClientIP,
            param.TimeStamp.Format(time.RFC1123),
            param.Method,
            param.Path,
            param.Request.Proto,
            param.StatusCode,
            param.Latency,
            param.Request.UserAgent(),
            param.ErrorMessage,
        )
    })
}

// CORS 跨域中间件
func CORS() gin.HandlerFunc {
    config := cors.DefaultConfig()
    config.AllowOrigins = []string{
        "http://localhost:3000",
        "http://localhost:5173",
        "http://localhost:8080",
    }
    config.AllowMethods = []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"}
    config.AllowHeaders = []string{
        "Origin",
        "Content-Type",
        "Accept",
        "Authorization",
        "X-Requested-With",
    }
    config.ExposeHeaders = []string{"Content-Length"}
    config.AllowCredentials = true
    config.MaxAge = 12 * time.Hour

    return cors.New(config)
}

// ErrorHandler 全局错误处理中间件
func ErrorHandler() gin.HandlerFunc {
    return func(c *gin.Context) {
        c.Next()

        // 处理错误
        if len(c.Errors) > 0 {
            err := c.Errors.Last()

            log.Printf("API Error: %v", err.Err)

            switch err.Type {
            case gin.ErrorTypeBind:
                c.JSON(http.StatusBadRequest, gin.H{
                    "error": "Invalid request format",
                    "code":  "INVALID_REQUEST",
                    "details": err.Error(),
                })
            case gin.ErrorTypePublic:
                c.JSON(http.StatusInternalServerError, gin.H{
                    "error": "Internal server error",
                    "code":  "INTERNAL_ERROR",
                })
            default:
                c.JSON(http.StatusInternalServerError, gin.H{
                    "error": "Unknown error occurred",
                    "code":  "UNKNOWN_ERROR",
                })
            }
        }
    }
}
