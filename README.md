# Web3 企业级多签钱包管理系统

<div align="center">

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Go Version](https://img.shields.io/badge/go-1.23.0-blue.svg)
![React Version](https://img.shields.io/badge/react-19.1.1-blue.svg)
![PostgreSQL](https://img.shields.io/badge/postgresql-15-blue.svg)

一个现代化的企业级 Web3 多签钱包管理系统，提供完整的提案工作流、权限管理和区块链集成功能。

</div>

## 📋 项目概述
Web3 企业级多签钱包管理系统是一个面向企业的去中心化资产管理解决方案。该系统解决了传统企业在管理数字资产时面临的安全性、合规性和操作复杂性问题。

## 项目演示
- 地址：http://multisig.rapidbuildx.tech/
- 用户名：viewer@multisig.demo
- 密  码：Demo@123456


### 🎯 主要解决的问题

- **资产安全管理**: 通过多重签名机制确保企业数字资产的安全性
- **权限精细控制**: 基于角色的权限管理系统，支持系统级、Safe级和操作级权限控制
- **业务流程标准化**: 提供完整的提案创建、审批、执行工作流
- **合规性要求**: 完整的操作审计日志和权限追踪
- **用户体验优化**: 将复杂的区块链操作封装为直观的业务界面

### 🚀 核心功能

- **多签钱包管理**: 创建和管理 Gnosis Safe 多签钱包
- **提案工作流**: 完整的提案创建、审批、签名、执行流程
- **权限管理系统**: 三级权限控制（系统级/Safe级/操作级）
- **实时通知**: WebSocket 实时状态更新和通知
- **区块链监听**: 自动监听链上交易状态变化
- **审计追踪**: 完整的操作日志和权限变更记录

## 🛠️ 技术栈

- **前端**：React 19 + TypeScript + Vite + TailwindCSS
- **后端**：Go + Gin + GORM + JWT
- **数据库**：PostgreSQL + Redis (预留)
- **区块链**：Safe Core SDK + Ethers.js

### 后端技术栈
- **Go** `1.23.0` - 主要后端语言
- **Gin** `1.10.1` - Web 框架
- **GORM** `1.30.3` - ORM 框架
- **PostgreSQL** `15` - 主数据库
- **Redis** `7` - 缓存和会话存储 (预留扩展)
- **JWT** `5.3.0` - 身份认证
- **WebSocket** - 实时通信
- **Ethereum Go** `1.16.3` - 区块链交互

### 前端技术栈
- **React** `19.1.1` - 前端框架
- **TypeScript** `5.8.3` - 类型安全
- **Vite** `7.1.2` - 构建工具
- **TailwindCSS** `4.1.13` - UI 样式框架
- **Zustand** `5.0.8` - 状态管理
- **React Router** `7.8.2` - 路由管理
- **Ethers.js** `6.15.0` - 区块链交互
- **Safe Core SDK** `3.3.5` - Gnosis Safe 集成
- **React Query** `5.87.1` - 数据获取和缓存

### 区块链技术
- **Gnosis Safe** - 多签钱包协议
- **Ethereum** - 主要支持的区块链网络
- **Safe Service API** - Safe 交易服务

## 🏗️ 系统架构

```
┌─────────────────────────────────────────────────────────────────┐
│                        Web3 企业多签系统                          │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   前端层 (React) │    │   后端层 (Go)    │    │   区块链层       │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ 用户界面     │ │◄──►│ │ API Gateway │ │◄──►│ │ Gnosis Safe │ │
│ │ - Dashboard │ │    │ │ - 路由       │ │    │ │ - 多签钱包   │ │
│ │ - 提案管理   │ │    │ │ - 中间件     │ │    │ │ - 交易执行   │ │
│ │ - 权限控制   │ │    │ │ - 认证       │ │    │ │ - 事件监听   │ │
│ └─────────────┘ │    │ └─────────────┘ │    │ └─────────────┘ │
│                 │    │                 │    │                 │
│ ┌─────────────┐ │    │ ┌─────────────┐ │    │ ┌─────────────┐ │
│ │ 状态管理     │ │    │ │ 业务逻辑层   │ │    │ │ Ethereum    │ │
│ │ - Zustand   │ │    │ │ - 工作流引擎 │ │    │ │ - 智能合约   │ │
│ │ - React Query│ │    │ │ - 权限服务   │ │    │ │ - 事件日志   │ │
│ └─────────────┘ │    │ │ - 通知服务   │ │    │ │ - 交易池     │ │
│                 │    │ └─────────────┘ │    │ └─────────────┘ │
│ ┌─────────────┐ │    │                 │    │                 │
│ │ 区块链集成   │ │    │ ┌─────────────┐ │    │                 │
│ │ - Ethers.js │ │    │ │ 数据持久层   │ │    │                 │
│ │ - Safe SDK  │ │    │ │ - PostgreSQL│ │    │                 │
│ │ - 钱包连接   │ │    │ │ - Redis     │ │    │                 │
│ └─────────────┘ │    │ │ - GORM      │ │    │                 │
└─────────────────┘    │ └─────────────┘ │    └─────────────────┘
                       └─────────────────┘
                                │
                                ▼
                       ┌─────────────────┐
                       │   实时通信层     │
                       │ - WebSocket Hub │
                       │ - 事件分发       │
                       │ - 状态同步       │
                       └─────────────────┘
```

## 📁 项目结构

```
web3-enterprise-multisig/
├── backend/                    # Go 后端服务
│   ├── cmd/
│   │   └── main.go            # 应用入口点
│   ├── internal/
│   │   ├── auth/              # 认证模块
│   │   ├── blockchain/        # 区块链交互
│   │   ├── database/          # 数据库连接
│   │   ├── handlers/          # HTTP 处理器
│   │   │   ├── admin_init.go  # 管理员初始化
│   │   │   ├── permissions.go # 权限管理
│   │   │   ├── policies.go    # 策略管理
│   │   │   └── ...
│   │   ├── middleware/        # 中间件
│   │   ├── models/           # 数据模型
│   │   │   ├── safe.go       # Safe 钱包模型
│   │   │   ├── proposal.go   # 提案模型
│   │   │   ├── user.go       # 用户模型
│   │   │   └── ...
│   │   ├── services/         # 业务逻辑层
│   │   ├── websocket/        # WebSocket 服务
│   │   └── workflow/         # 工作流引擎
│   ├── go.mod               # Go 模块定义
│   └── go.sum               # 依赖版本锁定
├── frontend/                 # React 前端应用
│   ├── src/
│   │   ├── components/       # React 组件
│   │   │   ├── layout/       # 布局组件
│   │   │   ├── ui/          # UI 基础组件
│   │   │   ├── permissions/ # 权限管理组件
│   │   │   └── ...
│   │   ├── pages/           # 页面组件
│   │   │   ├── auth/        # 认证页面
│   │   │   ├── safes/       # Safe 管理页面
│   │   │   ├── proposals/   # 提案管理页面
│   │   │   └── ...
│   │   ├── services/        # API 服务层
│   │   ├── stores/          # 状态管理
│   │   ├── hooks/           # 自定义 Hooks
│   │   └── utils/           # 工具函数
│   ├── package.json         # 前端依赖
│   └── vite.config.ts       # Vite 配置
├── database/                # 数据库相关
│   ├── migrations/          # 数据库迁移文件
│   │   ├── 001_init_schema.sql
│   │   ├── 002_add_safe_transactions.sql
│   │   ├── 003_create_proposals_tables.sql
│   │   ├── 005_add_policy_management.sql
│   │   ├── 007_add_permission_management.sql
│   │   └── ...
│   └── seeds/              # 初始数据
├── docker/                 # Docker 配置
│   └── docker-compose.yml  # 服务编排
├── docs/                   # 项目文档
└── scripts/               # 部署脚本
```

## 🚀 Quick Start

### 环境要求

- **Go** >= 1.23.0
- **Node.js** >= 18.0.0
- **PostgreSQL** >= 15
- **Redis** >= 7 (可选，当前版本未启用)
- **Docker** & **Docker Compose** (推荐)

### 1. 克隆项目

```bash
git clone https://github.com/fs1483/web3-enterprise-multisig.git
cd web3-enterprise-multisig
```

### 2. 使用 Docker 快速启动 (推荐)

```bash
# 启动数据库服务
cd docker
docker-compose up -d

# 等待数据库启动完成
sleep 10
```

### 3. 后端服务启动

```bash
cd backend

# 复制环境配置
cp .env.example .env

# 编辑环境变量 (配置数据库连接、区块链 RPC 等)
vim .env

# 安装依赖
go mod tidy

# 运行数据库迁移
# 手动执行 database/migrations/ 目录下的 SQL 文件
# 或者使用脚本运行
./database/seeds/run_migrations_docker.sh      # 如果使用 Docker
./database/seeds/run_migrations_standalone.sh  # 如果不使用 Docker, 需要确保数据库服务已经启动,还要安装postgresql 客户端

# 初始化超管用户
./database/seeds/001_init_super_admin.sql  # 此脚本可以可以手动通过psql执行，执行完后就完成了超管用户初始化

# 启动后端服务
go run cmd/main.go
```

### 4. 前端应用启动

```bash
cd frontend

# 安装依赖
npm install

# 启动开发服务器
npm run dev
```

### 5. 访问应用

- **前端应用**: http://localhost:5173
- **后端 API**: http://localhost:8080

### 6. 初始化系统

1. 访问前端应用
2. 使用初始管理员账户登录
3. 连接 MetaMask 钱包
4. 创建第一个 Safe 多签钱包

### 📝 部署说明

**关于 Redis**: 为了简化初期部署流程，当前版本暂时禁用了 Redis 服务。系统完全基于 PostgreSQL 运行，功能完整且性能良好。当业务量增长或需要扩展功能时，可以随时启用 Redis 支持。

**启用 Redis 的步骤**:
1. 取消注释 `docker-compose.yml` 中的 Redis 服务配置
2. 重新构建和部署容器
3. 根据需要实现相应的缓存逻辑

## 💼 核心业务介绍

### 1. Safe 多签钱包管理

**功能概述**: 企业可以创建和管理多个 Gnosis Safe 多签钱包，每个钱包支持自定义签名阈值和成员管理。

**核心特性**:
- 支持创建新的 Safe 钱包或导入现有钱包
- 灵活的签名阈值配置 (M-of-N 多签)
- 成员权限管理和角色分配
- 钱包状态实时监控

**业务流程**:
```
创建 Safe → 配置成员 → 设置阈值 → 部署到链上 → 激活使用
```

### 2. 提案工作流系统

**功能概述**: 标准化的企业资产操作流程，所有涉及资金的操作都需要通过提案-审批-执行的完整工作流。

**核心特性**:
- 多种提案类型支持 (转账、合约调用、成员管理等)
- 可配置的审批策略和权限要求
- 实时状态跟踪和通知
- 自动化执行和失败重试

**业务流程**:
```
创建提案 → 权限验证 → 审批流程 → 收集签名 → 链上执行 → 状态更新
```

### 3. 三级权限管理系统

**功能概述**: 企业级的精细化权限控制，支持系统级、Safe级和操作级三个层次的权限管理。

#### 系统级权限
- 用户管理和角色分配
- 系统配置和策略管理
- 全局审计和监控

#### Safe级权限
- Safe 钱包的创建和管理
- 成员添加和权限分配
- 钱包级策略配置

#### 操作级权限
- 具体业务操作的权限控制
- API 接口访问权限
- 功能模块使用权限

### 4. 实时通知和状态同步

**功能概述**: 基于 WebSocket 的实时通信系统，确保所有用户能够及时获得系统状态变化。

**核心特性**:
- 提案状态变化实时通知
- 区块链交易状态同步
- 多用户协作状态更新
- 系统事件广播

### 5. 区块链集成和监听

**功能概述**: 深度集成 Ethereum 和 Gnosis Safe 协议，提供完整的链上操作能力。

**核心特性**:
- Safe 交易的构建和签名
- 链上事件实时监听
- 交易状态自动同步
- Gas 费用优化

## 🔧 Redis 扩展设计

### 当前状态
为了简化初期部署和降低系统复杂度，当前版本**暂未启用 Redis**。系统完全基于 PostgreSQL 运行，功能完整且稳定。

### 技术预留
虽然当前未使用，但系统架构已预留 Redis 集成接口，包括：
- 环境配置文件中的 Redis 连接参数
- Docker Compose 中的 Redis 服务配置（已注释）
- 代码架构支持缓存层扩展

### 未来扩展场景

#### 1. 会话管理优化
```go
// 用户登录状态缓存
type SessionCache struct {
    UserID    string    `json:"user_id"`
    Token     string    `json:"token"`
    ExpiresAt time.Time `json:"expires_at"`
    Permissions []string `json:"permissions"`
}
```

#### 2. API 限流保护
```go
// 防止恶意调用和 DDoS 攻击
type RateLimiter struct {
    Key       string `json:"key"`        // IP 或用户标识
    Count     int    `json:"count"`      // 请求次数
    Window    int    `json:"window"`     // 时间窗口(秒)
    ExpiresAt int64  `json:"expires_at"` // 过期时间
}
```

#### 3. 数据缓存加速
```go
// 缓存频繁查询的数据
type DataCache struct {
    SafeList     []Safe     `json:"safe_list"`      // Safe 列表缓存
    UserProfile  User       `json:"user_profile"`   // 用户信息缓存
    Permissions  []string   `json:"permissions"`    // 权限列表缓存
    PolicyRules  []Policy   `json:"policy_rules"`   // 策略规则缓存
}
```

#### 4. 消息队列功能
```go
// 异步任务处理
type TaskQueue struct {
    TaskID      string                 `json:"task_id"`
    TaskType    string                 `json:"task_type"`    // email, sms, webhook
    Payload     map[string]interface{} `json:"payload"`
    Status      string                 `json:"status"`       // pending, processing, completed, failed
    RetryCount  int                    `json:"retry_count"`
    CreatedAt   time.Time             `json:"created_at"`
}
```

#### 5. 实时功能增强
```go
// WebSocket 连接状态管理
type WebSocketSession struct {
    SessionID   string    `json:"session_id"`
    UserID      string    `json:"user_id"`
    SafeID      string    `json:"safe_id"`
    ConnectedAt time.Time `json:"connected_at"`
    LastPing    time.Time `json:"last_ping"`
}
```

### 启用 Redis 的时机

建议在以下情况下启用 Redis：

1. **用户量增长** - 超过 100 并发用户
2. **性能优化需求** - 数据库查询响应时间 > 500ms
3. **功能扩展需求** - 需要实现邮件通知、短信提醒等异步功能
4. **高可用要求** - 需要会话持久化和负载均衡

### 启用方法

```bash
# 1. 取消注释 docker-compose.yml 中的 Redis 服务
# 2. 添加 Redis 客户端依赖
go get github.com/go-redis/redis/v8

# 3. 实现缓存层接口
# 4. 更新配置文件
# 5. 重新部署系统
```

这种设计确保了系统的**渐进式扩展能力**，既满足了当前的简化部署需求，又为未来的功能扩展预留了技术空间。


## 📄 许可证

本项目采用 MIT 许可证 - 查看 [LICENSE](LICENSE) 文件了解详情。

## 📞 联系方式

- **项目维护者**: sfan
- **邮箱**: [sfanonwork@gmail.com]
- **项目链接**: [[GitHub Repository URL](https://github.com/fs1483/web3-enterprise-multisig)]

---

## 免责声明
本产品仅用于技术交流和学习使用。
我们不保证本产品没有任何错误或缺陷，且不对由于使用本产品而产生的任何问题承担责任。
任何由使用本产品或相关服务引发的直接或间接损害，我们不承担责任

⭐ 如果这个项目对您有帮助，请给它一个 Star！
