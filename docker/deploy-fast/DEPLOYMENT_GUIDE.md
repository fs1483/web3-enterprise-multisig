# 分离式部署指南

## 部署架构

由于前端与后端一起编排时存在依赖问题，现采用分离式部署：

- **后端 + 数据库**：使用 `docker-compose.yml`
- **前端**：使用 `docker-compose-frontend-only.yml`

## 部署步骤

### 1. 后端和数据库部署

```bash
# 在服务器上执行
sh load-images.sh -d
```

这将启动：
- ✅ 后端服务 (multisig-backend)
- ✅ 数据库服务 (multisig-postgres-fast)

### 2. 前端单独部署

```bash
# 传输前端配置文件到服务器
scp docker-compose-frontend-only.yml root@server:/home/multisig/

# 在服务器上执行
docker-compose -f docker-compose-frontend-only.yml -p multisig-frontend up -d
```

这将启动：
- ✅ 前端服务 (multisig-frontend-only)

## 网络连通性

前端配置已修改为使用后端相同的网络：
```yaml
networks:
  multisig-network:
    external: true
    name: multisig-network-fast
```

## 服务访问

- **前端**: http://server-ip:5173
- **后端**: http://server-ip:5174
- **数据库**: localhost:5432 (仅服务器内部)

## 管理命令

### 后端和数据库
```bash
# 查看状态
docker-compose -f docker-compose.yml -p multisig-fast ps

# 查看日志
docker-compose -f docker-compose.yml -p multisig-fast logs

# 停止服务
docker-compose -f docker-compose.yml -p multisig-fast down
```

### 前端
```bash
# 查看状态
docker-compose -f docker-compose-frontend-only.yml -p multisig-frontend ps

# 查看日志
docker-compose -f docker-compose-frontend-only.yml -p multisig-frontend logs

# 停止服务
docker-compose -f docker-compose-frontend-only.yml -p multisig-frontend down
```

## 更新部署

### 更新后端
```bash
# 本地构建
./build.sh --backend-only

# 服务器重新部署
sh load-images.sh --backend-only -d
```

### 更新前端
```bash
# 本地构建
./build.sh --frontend-only

# 服务器重新部署
sh load-images.sh --frontend-only
docker-compose -f docker-compose-frontend-only.yml -p multisig-frontend up -d --force-recreate
```
