# =====================================================
# Web3 企业多签系统后端 Dockerfile
# 版本: v1.0
# 功能: 构建和运行后端应用的 Docker 镜像
# 作者: sfan
# 创建时间: 2024-12-01
# =====================================================

# 构建阶段
FROM golang:1.23-alpine AS builder

# 安装必要的工具
RUN apk add --no-cache git ca-certificates tzdata

# 设置工作目录
WORKDIR /app

# 复制 go mod 文件
COPY go.mod go.sum ./

# 下载依赖
RUN go mod download

# 复制源代码
COPY . .

# 构建应用
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main ./cmd/main.go

# 生产阶段
FROM alpine:latest AS production

# 安装 ca-certificates、tzdata 和 wget (用于健康检查)
RUN apk --no-cache add ca-certificates tzdata wget

# 设置时区
ENV TZ=Asia/Shanghai

# 创建非 root 用户
RUN addgroup -g 1001 -S appgroup && \
    adduser -u 1001 -S appuser -G appgroup

# 设置工作目录
WORKDIR /app

# 从构建阶段复制二进制文件
COPY --from=builder /app/main .

# 复制配置文件（如果有）
COPY --from=builder /app/.env.example .env

# 更改文件所有者
RUN chown -R appuser:appgroup /app

# 切换到非 root 用户
USER appuser

# 暴露端口
EXPOSE 8080

# 健康检查
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/health || exit 1

# 启动应用
CMD ["./main"]
