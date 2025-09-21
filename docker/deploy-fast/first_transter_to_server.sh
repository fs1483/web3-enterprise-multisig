#!/bin/bash

# =====================================================
# Web3 企业多签系统首次部署配置传输脚本
# 版本: v1.0
# 功能: 传输配置文件和数据库脚本到云服务器
# 说明: 首次部署时使用，传输除镜像外的所有必要文件
# 作者: sfan
# 创建时间: 2025-04-21
# =====================================================

set -e  # 遇到错误立即退出

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 日志函数
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 显示帮助信息
show_help() {
    echo "Web3 企业多签系统首次部署配置传输脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -e, --env FILE      指定环境配置文件 (默认: .env)"
    echo "  -h, --help          显示此帮助信息"
    echo ""
    echo "说明:"
    echo "  - 本脚本会读取环境配置文件中的服务器信息"
    echo "  - 传输 docker-compose.yml, .env, load-images.sh 等配置文件"
    echo "  - 传输数据库初始化脚本（如果使用本地数据库）"
    echo "  - 设置必要的文件权限"
    echo ""
    echo "示例:"
    echo "  $0                  # 使用默认 .env 文件"
    echo "  $0 -e .env.prod     # 使用指定的环境文件"
}

# 默认参数
ENV_FILE=".env"

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENV_FILE="$2"
            shift 2
            ;;
        -h|--help)
            show_help
            exit 0
            ;;
        *)
            log_error "未知参数: $1"
            show_help
            exit 1
            ;;
    esac
done

# 检查环境文件是否存在
if [[ ! -f "$ENV_FILE" ]]; then
    log_error "环境配置文件不存在: $ENV_FILE"
    log_info "请先复制 env.scp.example 为 $ENV_FILE 并配置相关参数"
    exit 1
fi

log_info "开始首次部署配置传输..."
log_info "使用环境配置文件: $ENV_FILE"

# 加载环境变量
source "$ENV_FILE"

# 检查是否使用SSH别名
SSH_ALIAS=""
if [[ -n "$SSH_ALIAS_NAME" ]]; then
    # 测试SSH别名是否可用
    if ssh -o ConnectTimeout=5 "$SSH_ALIAS_NAME" "echo 'SSH别名测试成功'" 2>/dev/null; then
        SSH_ALIAS="$SSH_ALIAS_NAME"
        SSH_TARGET="$SSH_ALIAS_NAME"
        log_info "使用SSH别名: $SSH_ALIAS_NAME"
    else
        log_error "SSH别名 '$SSH_ALIAS_NAME' 不可用，请检查SSH配置"
        exit 1
    fi
else
    # 使用传统的SSH连接方式
    if [[ -z "$REMOTE_HOST" ]]; then
        log_error "REMOTE_HOST 未配置，请检查环境文件"
        exit 1
    fi
    
    if [[ -z "$REMOTE_USER" ]]; then
        log_error "REMOTE_USER 未配置，请检查环境文件"
        exit 1
    fi
    
    SSH_TARGET="$REMOTE_USER@$REMOTE_HOST"
    log_info "使用完整SSH连接: $SSH_TARGET"
fi

if [[ -z "$REMOTE_PATH" ]]; then
    log_error "REMOTE_PATH 未配置，请检查环境文件"
    exit 1
fi

log_info "远程路径: $REMOTE_PATH"

# 设置SSH选项（仅在不使用别名时需要）
SSH_OPTIONS=""
if [[ -z "$SSH_ALIAS" ]]; then
    SSH_OPTIONS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
    if [[ -n "$SSH_KEY_PATH" ]]; then
        SSH_OPTIONS="$SSH_OPTIONS -i $SSH_KEY_PATH"
        log_info "使用SSH密钥: $SSH_KEY_PATH"
    fi
    if [[ -n "$REMOTE_PORT" ]]; then
        SSH_OPTIONS="$SSH_OPTIONS -p $REMOTE_PORT"
        log_info "SSH端口: $REMOTE_PORT"
    fi
else
    log_info "使用SSH别名，跳过SSH选项配置"
fi

# 检查必要文件是否存在
REQUIRED_FILES=("docker-compose.yml" "$ENV_FILE" "load-images.sh")
for file in "${REQUIRED_FILES[@]}"; do
    if [[ ! -f "$file" ]]; then
        log_error "必要文件不存在: $file"
        exit 1
    fi
done

# 检查数据库脚本目录
DB_MIGRATIONS_PATH="../../database/migrations"
if [[ ! -d "$DB_MIGRATIONS_PATH" ]]; then
    log_warning "数据库脚本目录不存在: $DB_MIGRATIONS_PATH"
    log_warning "如果使用本地数据库，请确保数据库脚本存在"
fi

log_info "开始传输配置文件..."

# 1. 创建远程目录结构并设置权限
log_info "创建远程目录结构..."
ssh $SSH_OPTIONS "$SSH_TARGET" "mkdir -p $REMOTE_PATH/images $REMOTE_PATH/database/migrations" || {
    log_error "创建远程目录失败"
    exit 1
}

log_info "设置目录权限..."
ssh $SSH_OPTIONS "$SSH_TARGET" "chmod -R 755 $REMOTE_PATH && chown -R \$(whoami):\$(whoami) $REMOTE_PATH" || {
    log_warning "设置目录权限失败，可能影响文件传输"
}

# 2. 传输核心配置文件
log_info "传输核心配置文件..."
scp $SSH_OPTIONS docker-compose.yml "$SSH_TARGET:$REMOTE_PATH/" || {
    log_error "传输 docker-compose.yml 失败"
    exit 1
}

scp $SSH_OPTIONS "$ENV_FILE" "$SSH_TARGET:$REMOTE_PATH/.env" || {
    log_error "传输环境配置文件失败"
    exit 1
}

scp $SSH_OPTIONS load-images.sh "$SSH_TARGET:$REMOTE_PATH/" || {
    log_error "传输 load-images.sh 失败"
    exit 1
}

# 3. 传输数据库初始化脚本（如果存在）
if [[ -d "$DB_MIGRATIONS_PATH" ]]; then
    log_info "传输数据库初始化脚本..."
    scp $SSH_OPTIONS -r "$DB_MIGRATIONS_PATH"/* "$SSH_TARGET:$REMOTE_PATH/database/migrations/" || {
        log_warning "传输数据库脚本失败，如果不使用本地数据库可以忽略"
    }
else
    log_warning "跳过数据库脚本传输（目录不存在）"
fi

# 4. 设置文件权限
log_info "设置文件权限..."
ssh $SSH_OPTIONS "$SSH_TARGET" "chmod +x $REMOTE_PATH/load-images.sh" || {
    log_error "设置脚本执行权限失败"
    exit 1
}

# 5. 验证传输结果
log_info "验证传输结果..."
ssh $SSH_OPTIONS "$SSH_TARGET" "ls -la $REMOTE_PATH/" || {
    log_error "验证传输结果失败"
    exit 1
}

# 6. 详细检查传输的文件
log_info "检查传输的文件详情..."
ssh $SSH_OPTIONS "$SSH_TARGET" "
echo '=== 项目根目录 ==='
ls -la $REMOTE_PATH/
echo ''
echo '=== images 目录 ==='
ls -la $REMOTE_PATH/images/ 2>/dev/null || echo 'images 目录为空或不存在'
echo ''
echo '=== database/migrations 目录 ==='
ls -la $REMOTE_PATH/database/migrations/ 2>/dev/null || echo 'migrations 目录为空或不存在'
echo ''
echo '=== 磁盘空间检查 ==='
df -h $REMOTE_PATH
"

log_success "配置文件传输完成！"

# 显示下一步操作提示
echo ""
log_info "下一步操作:"
echo "  1. 运行镜像构建和传输: ./build.sh"
echo "  2. 登录到远程服务器: ssh $REMOTE_USER@$REMOTE_HOST"
echo "  3. 进入项目目录: cd $REMOTE_PATH"
echo "  4. 加载镜像并部署: ./load-images.sh -d"
echo "  5. 查看运行状态: docker-compose ps"
echo ""
log_info "如果使用本地数据库，首次启动会自动执行数据库初始化脚本"

log_success "首次部署配置传输脚本执行完成！"
