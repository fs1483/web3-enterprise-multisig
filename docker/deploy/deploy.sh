#!/bin/bash

# =====================================================
# Web3 企业多签系统 - 阿里云服务器部署脚本
# 版本: v1.0
# 功能: 灵活支持本地数据库和云数据库部署
# 作者: sfan
# 创建时间: 2024-12-01
# =====================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# 检查 Docker 和 Docker Compose
check_docker() {
    log_info "检查 Docker 环境..."
    
    if ! command -v docker &> /dev/null; then
        log_error "Docker 未安装，请先安装 Docker"
        log_info "安装命令: curl -fsSL https://get.docker.com | sh"
        exit 1
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        log_error "Docker Compose 未安装，请先安装 Docker Compose"
        exit 1
    fi
    
    # 检查 Docker 服务状态
    if ! systemctl is-active --quiet docker; then
        log_info "启动 Docker 服务..."
        sudo systemctl start docker
        sudo systemctl enable docker
    fi
    
    log_success "Docker 环境检查通过"
}

# 选择部署模式
select_deployment_mode() {
    echo ""
    log_info "请选择部署模式:"
    echo "1) 本地数据库部署 (Docker PostgreSQL)"
    echo "2) 云数据库部署 (外部 PostgreSQL)"
    echo ""
    
    while true; do
        read -p "请输入选择 (1 或 2): " choice
        case $choice in
            1)
                DEPLOYMENT_MODE="local"
                ENV_FILE="env.local.example"
                log_info "选择了本地数据库部署模式"
                break
                ;;
            2)
                DEPLOYMENT_MODE="cloud"
                ENV_FILE="env.cloud.example"
                log_info "选择了云数据库部署模式"
                break
                ;;
            *)
                log_warning "请输入 1 或 2"
                ;;
        esac
    done
}

# 创建环境配置文件
setup_environment() {
    log_info "设置环境配置..."
    
    if [ ! -f "$SCRIPT_DIR/.env" ]; then
        log_info "复制环境配置模板..."
        cp "$SCRIPT_DIR/$ENV_FILE" "$SCRIPT_DIR/.env"
        
        log_warning "请编辑 .env 文件配置您的环境参数"
        log_info "配置文件位置: $SCRIPT_DIR/.env"
        
        if [ "$DEPLOYMENT_MODE" = "cloud" ]; then
            echo ""
            log_warning "云数据库部署需要配置以下参数:"
            echo "  - DB_HOST: 数据库主机地址"
            echo "  - DB_USER: 数据库用户名"
            echo "  - DB_PASSWORD: 数据库密码"
            echo "  - ETHEREUM_RPC_URL: 区块链 RPC 地址"
            echo "  - JWT_SECRET: JWT 密钥"
            echo "  - CORS_ORIGINS: 允许的域名"
        fi
        
        echo ""
        read -p "是否现在编辑配置文件？(y/N): " edit_config
        if [[ "$edit_config" =~ ^[Yy]$ ]]; then
            ${EDITOR:-nano} "$SCRIPT_DIR/.env"
        fi
    else
        log_info "环境配置文件已存在"
    fi
}

# 验证配置文件
validate_config() {
    log_info "验证配置文件..."
    
    # 检查必需的配置项
    local required_vars=(
        "DB_PASSWORD"
        "JWT_SECRET" 
        "ETHEREUM_RPC_URL"
        "VITE_RPC_URL"
        "FRONTEND_PORT"
        "BACKEND_PORT"
    )
    
    for var in "${required_vars[@]}"; do
        if [ -z "${!var}" ]; then
            log_error "缺少必需的配置项: $var"
            log_info "请检查 .env 文件中的配置"
            exit 1
        fi
    done
    
    # 验证端口配置
    if [ "$FRONTEND_PORT" = "$BACKEND_PORT" ]; then
        log_error "前端端口和后端端口不能相同: $FRONTEND_PORT"
        exit 1
    fi
    
    log_success "配置验证通过"
    log_info "前端端口: $FRONTEND_PORT, 后端端口: $BACKEND_PORT"
}

# 检查端口占用
check_ports() {
    log_info "检查端口占用情况..."
    
    # 从 .env 文件读取端口配置
    source "$SCRIPT_DIR/.env" 2>/dev/null || true
    
    local ports=(${FRONTEND_PORT:-5173} ${BACKEND_PORT:-5174})
    if [ "$DEPLOYMENT_MODE" = "local" ]; then
        ports+=(${DB_EXTERNAL_PORT:-5432})
    fi
    
    local occupied_ports=()
    
    for port in "${ports[@]}"; do
        if ss -tuln 2>/dev/null | grep -q ":$port "; then
            occupied_ports+=($port)
        fi
    done
    
    if [ ${#occupied_ports[@]} -gt 0 ]; then
        log_warning "以下端口已被占用: ${occupied_ports[*]}"
        read -p "是否继续部署？(y/N): " confirm
        if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
            log_info "部署已取消"
            exit 0
        fi
    else
        log_success "端口检查通过"
    fi
}

# 构建和启动服务
deploy_services() {
    log_info "开始构建和部署服务..."
    
    cd "$SCRIPT_DIR"
    
    # 停止现有服务
    log_info "停止现有服务..."
    docker-compose down --remove-orphans 2>/dev/null || true
    
    # 清理旧镜像（可选）
    read -p "是否清理旧的 Docker 镜像？(y/N): " cleanup
    if [[ "$cleanup" =~ ^[Yy]$ ]]; then
        log_info "清理旧镜像..."
        docker system prune -f
    fi
    
    # 构建镜像
    log_info "构建 Docker 镜像..."
    if [ "$DEPLOYMENT_MODE" = "local" ]; then
        docker-compose --profile local-db build --no-cache
    else
        docker-compose build --no-cache
    fi
    
    # 启动服务
    log_info "启动服务..."
    if [ "$DEPLOYMENT_MODE" = "local" ]; then
        docker-compose --profile local-db up -d
    else
        docker-compose up -d
    fi
    
    log_success "服务部署完成！"
}

# 等待服务启动
wait_for_services() {
    log_info "等待服务启动..."
    
    local max_attempts=60
    local attempt=0
    
    while [ $attempt -lt $max_attempts ]; do
        if docker-compose ps | grep -q "Up"; then
            log_success "服务启动成功"
            return 0
        fi
        
        attempt=$((attempt + 1))
        echo -n "."
        sleep 2
    done
    
    log_error "服务启动超时"
    return 1
}

# 运行数据库迁移
run_migrations() {
    if [ "$DEPLOYMENT_MODE" = "cloud" ]; then
        log_info "云数据库模式，请手动执行数据库迁移"
        log_info "迁移脚本位置: ../../database/seeds/run_migrations_standalone.sh"
        return 0
    fi
    
    log_info "运行数据库迁移..."
    
    # 等待数据库就绪
    log_info "等待数据库就绪..."
    sleep 15
    
    # 执行迁移脚本
    if [ -f "../../database/seeds/run_migrations_docker.sh" ]; then
        chmod +x ../../database/seeds/run_migrations_docker.sh
        ../../database/seeds/run_migrations_docker.sh
    else
        log_warning "迁移脚本不存在，请手动执行数据库迁移"
    fi
}

# 显示部署信息
show_deployment_info() {
    # 读取配置
    source "$SCRIPT_DIR/.env" 2>/dev/null || true
    
    echo ""
    echo -e "${GREEN}=================================================="
    echo "           部署完成！"
    echo -e "==================================================${NC}"
    echo ""
    echo "🌐 前端访问地址: http://localhost:${FRONTEND_PORT:-5173}"
    echo "🔧 后端 API 地址: http://localhost:${BACKEND_PORT:-5174}"
    
    if [ "$DEPLOYMENT_MODE" = "local" ]; then
        echo "📊 数据库地址: localhost:${DB_EXTERNAL_PORT:-5432}"
    else
        echo "📊 数据库地址: ${DB_HOST:-云数据库}"
    fi
    
    echo ""
    echo "📋 默认管理员账户:"
    echo "   用户名: superadmin"
    echo "   邮箱: admin@company.com"
    echo "   密码: SuperAdmin@123"
    echo ""
    echo "🔧 常用命令:"
    echo "   查看服务状态: docker-compose ps"
    echo "   查看日志: docker-compose logs -f"
    echo "   停止服务: docker-compose down"
    echo "   重启服务: docker-compose restart"
    echo ""
    echo -e "${YELLOW}注意: 请及时修改默认密码和 JWT 密钥！${NC}"
    echo ""
}

# 显示帮助信息
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help        显示帮助信息"
    echo "  --local           使用本地数据库模式部署"
    echo "  --cloud           使用云数据库模式部署"
    echo "  --no-migrate      跳过数据库迁移"
    echo "  --status          显示服务状态"
    echo "  --logs            显示服务日志"
    echo "  --stop            停止所有服务"
    echo ""
}

# 主函数
main() {
    echo -e "${BLUE}"
    echo "=================================================="
    echo "  Web3 企业多签系统 - 阿里云服务器部署脚本"
    echo "=================================================="
    echo -e "${NC}"
    
    local skip_migration=false
    local auto_mode=""
    
    # 解析命令行参数
    while [[ $# -gt 0 ]]; do
        case $1 in
            -h|--help)
                show_help
                exit 0
                ;;
            --local)
                auto_mode="local"
                DEPLOYMENT_MODE="local"
                ENV_FILE="env.local.example"
                shift
                ;;
            --cloud)
                auto_mode="cloud"
                DEPLOYMENT_MODE="cloud"
                ENV_FILE="env.cloud.example"
                shift
                ;;
            --no-migrate)
                skip_migration=true
                shift
                ;;
            --status)
                cd "$SCRIPT_DIR"
                docker-compose ps
                exit 0
                ;;
            --logs)
                cd "$SCRIPT_DIR"
                docker-compose logs -f
                exit 0
                ;;
            --stop)
                cd "$SCRIPT_DIR"
                docker-compose down
                exit 0
                ;;
            *)
                log_error "未知选项: $1"
                show_help
                exit 1
                ;;
        esac
    done
    
    # 执行部署步骤
    check_docker
    
    if [ -z "$auto_mode" ]; then
        select_deployment_mode
    fi
    
    setup_environment
    
    # 加载配置文件进行验证
    if [ -f "$SCRIPT_DIR/.env" ]; then
        source "$SCRIPT_DIR/.env"
        validate_config
    fi
    
    check_ports
    deploy_services
    
    if wait_for_services; then
        if [ "$skip_migration" = false ]; then
            run_migrations
        fi
        show_deployment_info
    else
        log_error "部署失败，请检查日志: docker-compose logs"
        exit 1
    fi
}

# 执行主函数
main "$@"
