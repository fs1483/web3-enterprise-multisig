# Web3 企业多签系统 - 阿里云部署指南

## 📋 概述

本部署方案专为阿里云服务器设计，支持 CentOS 7 等低版本系统，通过 Docker Compose 解决 Node.js 版本兼容性问题。

## 🚀 部署模式

### 1. 本地数据库模式
- PostgreSQL 运行在 Docker 容器中
- 适合开发、测试和小型生产环境
- 数据存储在本地 Docker Volume

### 2. 云数据库模式
- 连接外部 PostgreSQL 数据库（如阿里云 RDS）
- 适合生产环境
- 更高的可用性和可扩展性

## 🛠️ 部署步骤

### 前置条件

```bash
# 安装 Docker
curl -fsSL https://get.docker.com | sh
sudo systemctl start docker
sudo systemctl enable docker

# 安装 Docker Compose
sudo curl -L "https://github.com/docker/compose/releases/download/1.29.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# 将当前用户添加到 docker 组
sudo usermod -aG docker $USER
# 重新登录或执行: newgrp docker
```

### 快速部署

```bash
# 1. 进入部署目录
cd docker/deploy

# 2. 一键部署（交互式选择模式）
chmod +x deploy.sh
./deploy.sh

# 或者直接指定模式
./deploy.sh --local   # 本地数据库模式
./deploy.sh --cloud   # 云数据库模式
```

### 手动部署

#### 本地数据库模式

```bash
# 1. 复制环境配置
cp env.local.example .env

# 2. 编辑配置文件
nano .env

# 3. 启动服务
docker-compose --profile local-db up -d

# 4. 查看状态
docker-compose ps
```

#### 云数据库模式

```bash
# 1. 复制环境配置
cp env.cloud.example .env

# 2. 编辑配置文件（重要！）
nano .env
# 配置数据库连接信息：
# DB_HOST=your-rds-host.com
# DB_USER=your_username
# DB_PASSWORD=your_password

# 3. 启动服务
docker-compose up -d

# 4. 手动执行数据库迁移
../../database/seeds/run_migrations_standalone.sh
```

## ⚙️ 配置说明

### 环境变量

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| `DB_HOST` | 数据库主机 | postgres |
| `DB_PORT` | 数据库端口 | 5432 |
| `DB_NAME` | 数据库名称 | multisig_db |
| `DB_USER` | 数据库用户 | multisig_user |
| `DB_PASSWORD` | 数据库密码 | - |
| `BACKEND_PORT` | 后端端口 | 8080 |
| `FRONTEND_PORT` | 前端端口 | 80 |
| `JWT_SECRET` | JWT 密钥 | - |
| `ETHEREUM_RPC_URL` | 区块链 RPC | - |

### 阿里云 RDS 配置示例

```bash
# 阿里云 RDS PostgreSQL
DB_HOST=pgm-xxxxxxxxx.pg.rds.aliyuncs.com
DB_PORT=5432
DB_NAME=multisig_db
DB_USER=your_username
DB_PASSWORD=your_password
DB_SSLMODE=require
```

## 🔧 管理命令

```bash
# 查看服务状态
./deploy.sh --status
# 或
docker-compose ps

# 查看日志
./deploy.sh --logs
# 或
docker-compose logs -f

# 停止服务
./deploy.sh --stop
# 或
docker-compose down

# 重启服务
docker-compose restart

# 更新服务
docker-compose pull
docker-compose up -d
```

## 🌐 访问地址

部署完成后：

- **前端**: http://your-server-ip
- **后端 API**: http://your-server-ip:8080

## 🔐 默认账户

- **用户名**: superadmin
- **邮箱**: admin@company.com
- **密码**: SuperAdmin@123

⚠️ **重要**: 请及时修改默认密码！

## 🚨 故障排除

### 常见问题

1. **端口被占用**
   ```bash
   # 查看端口占用
   ss -tuln | grep :80
   # 修改 .env 文件中的端口配置
   ```

2. **数据库连接失败**
   ```bash
   # 检查数据库配置
   docker-compose logs backend
   # 验证数据库连接
   psql -h DB_HOST -p DB_PORT -U DB_USER -d DB_NAME
   ```

3. **构建失败**
   ```bash
   # 清理 Docker 缓存
   docker system prune -a
   # 重新构建
   docker-compose build --no-cache
   ```

### 日志查看

```bash
# 查看所有服务日志
docker-compose logs

# 查看特定服务日志
docker-compose logs backend
docker-compose logs frontend
docker-compose logs postgres  # 仅本地数据库模式

# 实时查看日志
docker-compose logs -f
```

## 🔄 更新部署

```bash
# 1. 拉取最新代码
git pull

# 2. 停止服务
docker-compose down

# 3. 重新构建
docker-compose build --no-cache

# 4. 启动服务
docker-compose up -d
```

## 📊 监控和维护

### 健康检查

所有服务都配置了健康检查：

```bash
# 查看健康状态
docker-compose ps

# 手动健康检查
curl http://localhost:8080/health
curl http://localhost/
```

### 备份数据

#### 本地数据库备份

```bash
# 备份数据库
docker exec multisig-postgres pg_dump -U multisig_user multisig_db > backup.sql

# 恢复数据库
docker exec -i multisig-postgres psql -U multisig_user multisig_db < backup.sql
```

#### 云数据库备份

使用云服务商提供的备份功能，如阿里云 RDS 自动备份。

## 🔒 安全建议

1. **修改默认密码**: 包括数据库密码、JWT 密钥、管理员密码
2. **配置防火墙**: 只开放必要端口
3. **使用 HTTPS**: 配置 SSL 证书
4. **定期更新**: 保持系统和依赖包最新
5. **监控日志**: 定期检查访问日志和错误日志

## 📞 技术支持

如遇到问题，请：

1. 查看日志: `docker-compose logs`
2. 检查配置: 确认 `.env` 文件配置正确
3. 验证网络: 确认服务器网络和防火墙设置
4. 联系技术支持: 提供详细的错误信息和日志
