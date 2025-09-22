# Web3 企业多签系统 - 快速部署指南

## 🚀 快速开始

### 部署方式选择

**推荐：SCP 传输部署**（无需镜像仓库，成本低，安全性高）
- 本地构建 → SCP传输 → 远程部署
- 支持 SSH 别名，操作简便

**备选：镜像仓库部署**（适合 CI/CD）
- 本地构建 → 推送仓库 → 远程拉取部署

## 📁 核心文件

```
docker/deploy-fast/
├── build.sh                         # 🔧 镜像构建和传输脚本
├── first_transter_to_server.sh      # 📤 首次配置文件传输脚本
├── load-images.sh                   # 📥 后端和数据库管理脚本
├── load-frontend.sh                 # 📥 前端管理脚本
├── docker-compose.yml               # 🐳 后端和数据库编排配置
├── docker-compose-frontend-only.yml # 🐳 前端独立编排配置
├── env.scp.example                  # ⚙️ SCP传输配置模板
├── DEPLOYMENT_GUIDE.md              # 📖 分离式部署详细指南
└── README.md                        # 📖 本文档
```

## 🎯 SCP 传输部署（推荐）

### 步骤 1：配置环境

```bash
# 1. 复制配置模板
cp env.scp.example .env

# 2. 编辑配置文件
vim .env
```

**关键配置项**：
```bash
# SSH 连接配置
SSH_ALIAS_NAME=aliyun              # SSH别名（推荐）
REMOTE_PATH=/opt/multisig          # 远程项目目录

# 数据库配置（选择一种）
# 选项1：使用本地Docker数据库
COMPOSE_PROFILES=local-db
DB_HOST=postgres

# 选项2：使用云数据库
# COMPOSE_PROFILES=
# DB_HOST=your-cloud-db-host
# DB_PASSWORD=your-password
```

### 步骤 2：首次部署

```bash
# 1. 传输配置文件（仅首次需要）
./first_transter_to_server.sh

# 2. 构建并传输镜像
./build.sh

# 3. 登录服务器部署
ssh aliyun
cd /opt/multisig
./load-images.sh -d
```

### 步骤 3：分离式部署

由于采用分离式架构，需要分别部署后端和前端：

```bash
# 3.1 部署后端和数据库
ssh aliyun
cd /opt/multisig
./load-images.sh -d

# 3.2 传输前端配置文件（首次需要）
# 在本地执行
scp docker-compose-frontend-only.yml load-frontend.sh aliyun:/opt/multisig/

# 3.3 部署前端
ssh aliyun "cd /opt/multisig && ./load-frontend.sh -d"
```

### 步骤 4：后续更新

```bash
# 4.1 更新后端（包含PostgreSQL）
./build.sh --backend-only
ssh aliyun "cd /opt/multisig && ./load-images.sh -d"

# 4.2 更新后端（不含PostgreSQL，适用于外部数据库）
./build.sh --backend-only --no-database
ssh aliyun "cd /opt/multisig && ./load-images.sh -d"

# 4.3 更新前端（不含数据库）
./build.sh --frontend-only
ssh aliyun "cd /opt/multisig && ./load-frontend.sh -d"

# 4.4 更新全部
./build.sh
ssh aliyun "cd /opt/multisig && ./load-images.sh -d && ./load-frontend.sh -d"
```

## 🔧 镜像仓库部署

### 步骤 1：配置环境

```bash
# 1. 复制配置模板
cp env.cloud.example .env

# 2. 配置镜像仓库
DOCKER_REGISTRY=your-registry.com
```

### 步骤 2：构建推送

```bash
# 构建并推送到仓库
./build.sh -p
```

### 步骤 3：服务器部署

```bash
# 在服务器上拉取并部署
./deploy.sh --pull
```

## 📋 脚本命令参考

### build.sh - 镜像构建脚本

```bash
# 基本用法
./build.sh                          # 默认构建并SCP传输（后端+前端+PostgreSQL）
./build.sh -p                       # 构建并推送到仓库
./build.sh -t v1.0.0                # 指定镜像标签
./build.sh --no-cache               # 不使用构建缓存

# 选择性构建
./build.sh --backend-only            # 仅构建后端镜像（包含PostgreSQL）
./build.sh --frontend-only           # 仅构建前端镜像（不包含PostgreSQL）
./build.sh --no-database             # 不包含PostgreSQL镜像（适用于外部数据库）

# 组合使用
./build.sh --backend-only --no-database  # 仅构建后端，不含PostgreSQL
./build.sh --frontend-only               # 仅构建前端
```

**参数说明**：
- `--backend-only`: 只构建后端镜像，默认包含PostgreSQL数据库镜像
- `--frontend-only`: 只构建前端镜像，不包含PostgreSQL数据库镜像
- `--no-database`: 跳过PostgreSQL镜像处理，适用于使用外部数据库的场景
- `-p, --push`: 推送到镜像仓库而非SCP传输
- `-t, --tag`: 指定镜像标签
- `--no-cache`: 构建时不使用Docker缓存

### 🎯 常见使用场景

**场景1：完整部署（推荐新用户）**
```bash
./build.sh                          # 构建所有组件
```

**场景2：只更新后端代码**
```bash
./build.sh --backend-only            # 包含PostgreSQL，适合本地数据库
```

**场景3：使用外部数据库**
```bash
./build.sh --backend-only --no-database  # 不包含PostgreSQL
```

**场景4：只更新前端**
```bash
./build.sh --frontend-only           # 仅前端镜像，不含数据库
```

**场景5：开发环境快速构建**
```bash
./build.sh --no-cache --backend-only # 强制重新构建后端
```

### first_transter_to_server.sh - 配置传输脚本

```bash
# 基本用法
./first_transter_to_server.sh        # 使用默认.env文件
./first_transter_to_server.sh -e .env.prod  # 使用指定配置文件
```

## 🔄 分离式部署架构

**重要说明**：由于前端与后端一起编排时存在依赖问题，现采用分离式部署：
- **后端 + 数据库**：使用 `docker-compose.yml` 和 `load-images.sh`
- **前端**：使用 `docker-compose-frontend-only.yml` 和 `load-frontend.sh`

### load-images.sh - 后端和数据库管理脚本

```bash
# 在服务器上执行
./load-images.sh                     # 仅加载后端镜像（默认不加载前端）
./load-images.sh -d                  # 加载镜像并部署后端+数据库
./load-images.sh --backend-only      # 仅处理后端镜像
./load-images.sh --frontend-only     # 仅处理前端镜像（需要时）
./load-images.sh --stop              # 停止后端和数据库服务
./load-images.sh -c                  # 加载后清理压缩文件
```

### load-frontend.sh - 前端管理脚本

```bash
# 在服务器上执行
./load-frontend.sh                   # 仅加载前端镜像
./load-frontend.sh -d                # 加载镜像并部署前端
./load-frontend.sh --deploy-only     # 仅部署前端（不重新加载镜像）
./load-frontend.sh --load-only       # 仅加载镜像，不部署
./load-frontend.sh --stop            # 停止前端服务
./load-frontend.sh -c                # 加载后清理压缩文件
```

## 🎛️ 服务管理命令

### 快速管理命令

```bash
# === 启动所有服务 ===
ssh aliyun "cd /opt/multisig && ./load-images.sh -d && ./load-frontend.sh -d"

# === 停止所有服务 ===
ssh aliyun "cd /opt/multisig && ./load-images.sh --stop && ./load-frontend.sh --stop"

# === 重启所有服务 ===
ssh aliyun "cd /opt/multisig && ./load-images.sh --stop && ./load-frontend.sh --stop && ./load-images.sh -d && ./load-frontend.sh -d"

# === 查看服务状态 ===
ssh aliyun "cd /opt/multisig && docker ps"
```

### 后端和数据库管理

```bash
# 启动后端和数据库
ssh aliyun "cd /opt/multisig && ./load-images.sh -d"

# 停止后端和数据库
ssh aliyun "cd /opt/multisig && ./load-images.sh --stop"

# 查看后端状态
ssh aliyun "cd /opt/multisig && docker-compose -f docker-compose.yml -p multisig-fast ps"

# 查看后端日志
ssh aliyun "cd /opt/multisig && docker-compose -f docker-compose.yml -p multisig-fast logs"

# 查看后端实时日志
ssh aliyun "cd /opt/multisig && docker-compose -f docker-compose.yml -p multisig-fast logs -f"

# 重启后端服务
ssh aliyun "cd /opt/multisig && docker-compose -f docker-compose.yml -p multisig-fast restart backend"
```

### 前端管理

```bash
# 启动前端
ssh aliyun "cd /opt/multisig && ./load-frontend.sh -d"

# 停止前端
ssh aliyun "cd /opt/multisig && ./load-frontend.sh --stop"

# 仅重新部署前端（不重新加载镜像）
ssh aliyun "cd /opt/multisig && ./load-frontend.sh --deploy-only"

# 查看前端状态
ssh aliyun "cd /opt/multisig && docker-compose -f docker-compose-frontend-only.yml -p multisig-frontend ps"

# 查看前端日志
ssh aliyun "cd /opt/multisig && docker-compose -f docker-compose-frontend-only.yml -p multisig-frontend logs"

# 重启前端服务
ssh aliyun "cd /opt/multisig && docker-compose -f docker-compose-frontend-only.yml -p multisig-frontend restart"
```

### 手动 Docker Compose 命令

如果需要更精细的控制，可以直接使用 Docker Compose 命令：

```bash
# === 后端和数据库 ===
# 启动（使用本地数据库）
docker-compose -f docker-compose.yml -p multisig-fast --profile local-db up -d

# 启动（使用云数据库）
docker-compose -f docker-compose.yml -p multisig-fast up -d

# 停止
docker-compose -f docker-compose.yml -p multisig-fast down

# 强制重新创建
docker-compose -f docker-compose.yml -p multisig-fast up -d --force-recreate

# === 前端 ===
# 启动
docker-compose -f docker-compose-frontend-only.yml -p multisig-frontend up -d

# 停止
docker-compose -f docker-compose-frontend-only.yml -p multisig-frontend down

# 强制重新创建
docker-compose -f docker-compose-frontend-only.yml -p multisig-frontend up -d --force-recreate
```

### 健康检查和调试

```bash
# 检查所有容器状态
ssh aliyun "docker ps -a"

# 检查网络连通性
ssh aliyun "docker network ls"
ssh aliyun "docker network inspect multisig-network-fast"

# 测试前端访问
ssh aliyun "curl -I http://localhost:5173"

# 测试后端API
ssh aliyun "curl -I http://localhost:5174/health"

# 检查容器资源使用
ssh aliyun "docker stats --no-stream"

# 清理未使用的镜像和容器
ssh aliyun "docker system prune -f"
```

## ⚙️ 环境配置

### 数据库选项

**本地 Docker 数据库**（推荐用于测试）：
```bash
COMPOSE_PROFILES=local-db
DB_HOST=postgres
DB_PORT=5432
DB_SSLMODE=disable
```

**云数据库**（推荐用于生产）：
```bash
# COMPOSE_PROFILES=  # 留空
DB_HOST=your-cloud-db-host
DB_PASSWORD=your-password
DB_SSLMODE=require
```

### 区块链网络配置

**以太坊主网**：
```bash
VITE_CHAIN_ID=1
ETHEREUM_RPC_URL=https://eth-mainnet.g.alchemy.com/v2/your-key
SAFE_SERVICE_URL=https://safe-transaction-mainnet.safe.global
```

**Sepolia 测试网**：
```bash
VITE_CHAIN_ID=11155111
ETHEREUM_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/your-key
SAFE_SERVICE_URL=https://safe-transaction-sepolia.safe.global
```

## 🔧 常见问题

### SSH 连接问题
```bash
# 测试SSH连接
ssh aliyun "echo 'SSH连接正常'"

# 检查SSH配置
cat ~/.ssh/config
```

### 权限问题
```bash
# 服务器目录权限
ssh aliyun "sudo chown -R \$(whoami):\$(whoami) /opt/multisig"
ssh aliyun "chmod -R 755 /opt/multisig"
```

### 镜像传输失败
```bash
# 检查磁盘空间
ssh aliyun "df -h /opt/"

# 手动传输测试
scp test.txt aliyun:/opt/multisig/
```

### 数据库连接问题
```bash
# 查看容器日志
ssh aliyun "cd /opt/multisig && docker-compose logs backend"

# 检查数据库配置
ssh aliyun "cd /opt/multisig && cat .env | grep DB_"
```

## 📝 端口说明

- **前端**: 5173 (HTTP) - `multisig-frontend-only` 容器
- **后端**: 5174 (API) - `multisig-backend` 容器  
- **数据库**: 5432 (仅本地数据库时) - `multisig-postgres-fast` 容器

## 🏗️ 服务架构

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端容器       │    │   后端容器       │    │   数据库容器     │
│ multisig-       │    │ multisig-       │    │ multisig-       │
│ frontend-only   │    │ backend         │    │ postgres-fast   │
│                 │    │                 │    │                 │
│ Port: 5173      │───▶│ Port: 5174      │───▶│ Port: 5432      │
│ Network:        │    │ Network:        │    │ Network:        │
│ multisig-       │    │ multisig-       │    │ multisig-       │
│ network-fast    │    │ network-fast    │    │ network-fast    │
└─────────────────┘    └─────────────────┘    └─────────────────┘

管理脚本:              管理脚本:              管理脚本:
load-frontend.sh       load-images.sh         load-images.sh
```

## 🔗 网络连通性

- **前端 → 后端**: `http://backend:8080` (容器内部通信)
- **后端 → 数据库**: `postgres:5432` (容器内部通信)  
- **外部访问**: 
  - 前端: `http://server-ip:5173`
  - 后端API: `http://server-ip:5174`

## 🚨 安全提醒

1. **生产环境必须修改**：
   - `JWT_SECRET` - JWT密钥
   - `DB_PASSWORD` - 数据库密码
   - `PRIVATE_KEY` - 区块链私钥

2. **不要提交到代码仓库**：
   - `.env` 文件
   - SSH 私钥
   - 任何包含敏感信息的文件

## 📋 日志查看和调试

### 查看后端日志

#### 1. 实时查看后端日志（推荐）
```bash
# 查看后端实时日志
ssh aliyun "cd /opt/multisig && docker-compose -f docker-compose.yml -p multisig-fast logs -f backend"
```

#### 2. 查看最近的后端日志
```bash
# 查看最近100行日志
ssh aliyun "cd /opt/multisig && docker-compose -f docker-compose.yml -p multisig-fast logs --tail=100 backend"

# 查看最近500行日志
ssh aliyun "cd /opt/multisig && docker-compose -f docker-compose.yml -p multisig-fast logs --tail=500 backend"

# 查看带时间戳的实时日志
ssh aliyun "cd /opt/multisig && docker-compose -f docker-compose.yml -p multisig-fast logs -f -t backend"
```

#### 3. 查看特定时间段的后端日志
```bash
# 查看从某个时间开始的日志
ssh aliyun "cd /opt/multisig && docker-compose -f docker-compose.yml -p multisig-fast logs --since='2024-12-22T07:00:00' backend"

# 查看最近1小时的日志
ssh aliyun "cd /opt/multisig && docker-compose -f docker-compose.yml -p multisig-fast logs --since='1h' backend"

# 查看最近30分钟的日志
ssh aliyun "cd /opt/multisig && docker-compose -f docker-compose.yml -p multisig-fast logs --since='30m' backend"
```

### 查看前端日志

#### 1. 实时查看前端日志
```bash
# 查看前端实时日志
ssh aliyun "cd /opt/multisig && docker-compose -f docker-compose-frontend-only.yml -p multisig-frontend logs -f frontend"
```

#### 2. 查看最近的前端日志
```bash
# 查看最近100行前端日志
ssh aliyun "cd /opt/multisig && docker-compose -f docker-compose-frontend-only.yml -p multisig-frontend logs --tail=100 frontend"

# 查看带时间戳的前端日志
ssh aliyun "cd /opt/multisig && docker-compose -f docker-compose-frontend-only.yml -p multisig-frontend logs -f -t frontend"
```

### 查看所有服务日志

#### 1. 查看后端相关服务日志
```bash
# 查看所有后端服务的实时日志（后端+数据库）
ssh aliyun "cd /opt/multisig && docker-compose -f docker-compose.yml -p multisig-fast logs -f"

# 只查看后端和数据库日志
ssh aliyun "cd /opt/multisig && docker-compose -f docker-compose.yml -p multisig-fast logs -f backend postgres"
```

#### 2. 查看前后端所有日志
```bash
# 同时查看前端和后端日志（需要两个终端窗口）
# 终端1：后端日志
ssh aliyun "cd /opt/multisig && docker-compose -f docker-compose.yml -p multisig-fast logs -f backend"

# 终端2：前端日志
ssh aliyun "cd /opt/multisig && docker-compose -f docker-compose-frontend-only.yml -p multisig-frontend logs -f frontend"
```

### 使用原生 Docker 命令查看日志

#### 1. 查找容器ID
```bash
# 查看所有运行中的容器
ssh aliyun "docker ps"

# 只查看后端容器
ssh aliyun "docker ps | grep backend"

# 只查看前端容器
ssh aliyun "docker ps | grep frontend"
```

#### 2. 使用容器ID查看日志
```bash
# 查看指定容器的实时日志（替换CONTAINER_ID）
ssh aliyun "docker logs -f CONTAINER_ID"

# 查看指定容器的最近日志
ssh aliyun "docker logs --tail=100 CONTAINER_ID"
```

### 常用调试命令组合

#### 🔍 问题排查推荐流程

1. **快速检查所有容器状态**
```bash
ssh aliyun "docker ps -a"
```

2. **查看后端最近日志+实时监控**
```bash

docker-compose -f docker-compose.yml -p multisig-fast logs -f backend"

docker-compose -f docker-compose.yml -p multisig-fast logs --tail=50 backend

ssh aliyun "cd /opt/multisig && docker-compose -f docker-compose.yml -p multisig-fast logs --tail=200 -f backend"
```

3. **查看前端最近日志+实时监控**
```bash
ssh aliyun "cd /opt/multisig && docker-compose -f docker-compose-frontend-only.yml -p multisig-frontend logs --tail=200 -f frontend"
```

4. **检查数据库连接问题**
```bash
ssh aliyun "cd /opt/multisig && docker-compose -f docker-compose.yml -p multisig-fast logs --tail=100 postgres"
```

#### 📊 性能监控

```bash
# 查看容器资源使用情况
ssh aliyun "docker stats"

# 查看特定容器资源使用
ssh aliyun "docker stats CONTAINER_ID"
```

#### 🛠️ 容器管理

```bash
# 进入后端容器内部调试
ssh aliyun "docker exec -it \$(docker ps -q --filter name=backend) /bin/sh"

# 进入前端容器内部调试
ssh aliyun "docker exec -it \$(docker ps -q --filter name=frontend) /bin/sh"

# 查看容器详细信息
ssh aliyun "docker inspect CONTAINER_ID"
```

### 💡 日志查看技巧

1. **使用 `Ctrl+C` 退出日志查看模式**

2. **日志过滤技巧**
```bash
# 过滤包含ERROR的日志
ssh aliyun "cd /opt/multisig && docker-compose -f docker-compose.yml -p multisig-fast logs backend" | grep ERROR

# 过滤包含特定关键词的日志
ssh aliyun "cd /opt/multisig && docker-compose -f docker-compose.yml -p multisig-fast logs backend" | grep "API"
```

3. **保存日志到文件**
```bash
# 将日志保存到本地文件
ssh aliyun "cd /opt/multisig && docker-compose -f docker-compose.yml -p multisig-fast logs --tail=1000 backend" > backend-logs.txt
```

## 📞 技术支持

## 🔧 常见问题解决

### 超级管理员登录问题

如果遇到超级管理员无法登录的问题，可能是初始化脚本中的密码hash不正确。

**解决方案1：重置密码（推荐）**
```bash
curl -X POST http://your-domain.com/api/admin/reset-password \
  -H "Content-Type: application/json" \
  -d '{"admin_email": "admin@company.com"}'
```

**解决方案2：系统重新初始化**
```bash
curl -X POST http://your-domain.com/api/admin/init
```

**默认超级管理员账户**：
- 邮箱：`admin@company.com`
- 密码：`SuperAdmin@123`（如果使用修复后的初始化脚本）

### 构建参数选择指南

**我应该使用哪个构建参数？**

| 场景 | 推荐命令 | 说明 |
|------|----------|------|
| 首次部署 | `./build.sh` | 构建所有组件 |
| 只改了后端代码 | `./build.sh --backend-only` | 包含数据库镜像 |
| 使用云数据库 | `./build.sh --backend-only --no-database` | 不包含PostgreSQL |
| 只改了前端代码 | `./build.sh --frontend-only` | 仅前端镜像，不含数据库 |
| 开发调试 | `./build.sh --no-cache --backend-only` | 强制重新构建 |