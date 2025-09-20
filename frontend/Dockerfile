# =====================================================
# Web3 企业多签系统前端 Dockerfile
# 版本: v1.0
# 功能: 构建和运行前端应用的 Docker 镜像
# 作者: sfan
# 创建时间: 2024-12-01
# =====================================================

# 多阶段构建 - 构建阶段
FROM node:18-alpine AS builder

# 设置工作目录
WORKDIR /app

# 声明构建参数 - 从docker-compose.yml传入
ARG VITE_API_BASE_URL
ARG VITE_WS_URL
ARG VITE_CHAIN_ID
ARG VITE_CHAIN_NAME
ARG VITE_RPC_URL
ARG VITE_BLOCK_EXPLORER
ARG VITE_SAFE_SERVICE_URL

# 设置环境变量 - 供Vite构建时使用
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_WS_URL=$VITE_WS_URL
ENV VITE_CHAIN_ID=$VITE_CHAIN_ID
ENV VITE_CHAIN_NAME=$VITE_CHAIN_NAME
ENV VITE_RPC_URL=$VITE_RPC_URL
ENV VITE_BLOCK_EXPLORER=$VITE_BLOCK_EXPLORER
ENV VITE_SAFE_SERVICE_URL=$VITE_SAFE_SERVICE_URL

# 复制 package 文件
COPY package*.json ./

# 安装依赖
RUN npm ci --only=production

# 复制源代码
COPY . .

# 构建应用 - 环境变量会被Vite自动注入
RUN npm run build

# 生产阶段 - 使用 nginx 提供静态文件服务
FROM nginx:alpine AS production

# 复制构建结果到 nginx 目录
COPY --from=builder /app/dist /usr/share/nginx/html

# 复制 nginx 配置文件
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 暴露端口
EXPOSE 80

# 启动 nginx
CMD ["nginx", "-g", "daemon off;"]
