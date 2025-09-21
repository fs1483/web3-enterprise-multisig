#!/bin/bash

# =====================================================
# Web3 企业多签系统镜像加载脚本 (远程服务器端)
# 版本: v2.0
# 功能: 在远程服务器上加载SCP传输的镜像并部署
# 作者: sfan
# 创建时间: 2024-12-01
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
    echo "Web3 企业多签系统镜像加载脚本 (远程服务器端)"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -d, --deploy        加载镜像后立即部署"
    echo "  -c, --cleanup       加载后清理压缩文件"
    echo "  --backend-only      仅加载后端镜像"
    echo "  --frontend-only     仅加载前端镜像"
    echo "  --stop              停止现有服务"
    echo "  -h, --help          显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                  # 仅加载镜像"
    echo "  $0 -d               # 加载镜像并部署"
    echo "  $0 -c               # 加载镜像并清理文件"
    echo "  $0 --backend-only   # 仅加载后端镜像"
}

# 默认参数 - 分离式部署：默认只处理后端和数据库
DEPLOY_AFTER_LOAD=false
CLEANUP_FILES=false
LOAD_BACKEND=true
LOAD_FRONTEND=false  # 前端已分离，默认不加载
STOP_SERVICES=false

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -d|--deploy)
            DEPLOY_AFTER_LOAD=true
            shift
            ;;
        -c|--cleanup)
            CLEANUP_FILES=true
            shift
            ;;
        --backend-only)
            LOAD_FRONTEND=false
            shift
            ;;
        --frontend-only)
            LOAD_BACKEND=false
            shift
            ;;
        --stop)
            STOP_SERVICES=true
            shift
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

# 获取脚本目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

log_info "脚本目录: $SCRIPT_DIR"

# 如果只是停止服务，直接执行停止逻辑
if [[ "$STOP_SERVICES" == "true" ]]; then
    log_info "停止现有服务..."
    
    # 检查环境配置文件
    if [[ ! -f "$SCRIPT_DIR/.env" ]]; then
        log_error "环境配置文件不存在: $SCRIPT_DIR/.env"
        exit 1
    fi
    
    # 加载环境变量
    source "$SCRIPT_DIR/.env"
    
    # 停止服务
    if [[ -f "$SCRIPT_DIR/docker-compose.yml" ]]; then
        log_info "停止后端和数据库服务..."
        docker-compose -f "$SCRIPT_DIR/docker-compose.yml" -p "${PROJECT_NAME:-multisig}-fast" down
        log_success "服务已停止"
    else
        log_error "docker-compose.yml 文件不存在"
    fi
    
    exit 0
fi

# 检查环境配置文件
if [[ ! -f "$SCRIPT_DIR/.env" ]]; then
    log_error "环境配置文件不存在: $SCRIPT_DIR/.env"
    log_info "请确保已通过SCP传输了环境配置文件"
    exit 1
fi

# 加载环境变量
log_info "加载环境配置: .env"
source "$SCRIPT_DIR/.env"

# 检查必需的环境变量
if [[ -z "$PROJECT_NAME" ]]; then
    log_error "PROJECT_NAME 未设置"
    exit 1
fi

# 设置镜像文件名
IMAGE_TAG=${IMAGE_TAG:-latest}
BACKEND_TAR_GZ="${PROJECT_NAME}-backend-${IMAGE_TAG}.tar.gz"
FRONTEND_TAR_GZ="${PROJECT_NAME}-frontend-${IMAGE_TAG}.tar.gz"
POSTGRES_TAR_GZ="postgres-15-alpine.tar.gz"

# 检查 Docker 是否安装
if ! command -v docker &> /dev/null; then
    log_error "Docker 未安装或不在 PATH 中"
    log_info "请先安装 Docker: https://docs.docker.com/engine/install/"
    exit 1
fi

# 检查 Docker Compose 是否安装
if ! command -v docker-compose &> /dev/null; then
    log_error "Docker Compose 未安装或不在 PATH 中"
    log_info "请先安装 Docker Compose: https://docs.docker.com/compose/install/"
    exit 1
fi

# 检查 Docker 服务是否运行
if ! docker info &> /dev/null; then
    log_error "Docker 服务未运行"
    log_info "请启动 Docker 服务: sudo systemctl start docker"
    exit 1
fi

log_info "开始加载 Docker 镜像..."

# 加载 PostgreSQL 镜像（用于本地数据库）
if [[ -f "$SCRIPT_DIR/images/$POSTGRES_TAR_GZ" ]]; then
    log_info "加载 PostgreSQL 镜像: $POSTGRES_TAR_GZ"
    
    # 解压缩并加载镜像
    gunzip -c "$SCRIPT_DIR/images/$POSTGRES_TAR_GZ" | docker load
    
    if [[ $? -eq 0 ]]; then
        log_success "PostgreSQL 镜像加载成功"
        
        # 清理压缩文件（如果配置允许）
        if [[ "$CLEANUP_FILES" == "true" ]]; then
            rm -f "$SCRIPT_DIR/images/$POSTGRES_TAR_GZ"
            log_info "已清理 PostgreSQL 镜像压缩文件"
        fi
    else
        log_error "PostgreSQL 镜像加载失败"
        exit 1
    fi
else
    log_warning "PostgreSQL 镜像文件不存在: images/$POSTGRES_TAR_GZ"
    log_info "如果使用本地数据库，请确保已传输 PostgreSQL 镜像"
fi

# 加载后端镜像
if [[ "$LOAD_BACKEND" == "true" ]]; then
    if [[ -f "$SCRIPT_DIR/images/$BACKEND_TAR_GZ" ]]; then
        log_info "加载后端镜像: $BACKEND_TAR_GZ"
        
        # 解压缩并加载镜像
        gunzip -c "$SCRIPT_DIR/images/$BACKEND_TAR_GZ" | docker load
        
        if [[ $? -eq 0 ]]; then
            log_success "后端镜像加载成功"
            
            # 清理压缩文件（如果配置允许）
            if [[ "$CLEANUP_FILES" == "true" ]]; then
                rm -f "$SCRIPT_DIR/images/$BACKEND_TAR_GZ"
                log_info "已清理后端镜像压缩文件"
            fi
        else
            log_error "后端镜像加载失败"
            exit 1
        fi
    else
        log_warning "后端镜像文件不存在: $BACKEND_TAR_GZ"
        if [[ "$LOAD_FRONTEND" == "false" ]]; then
            log_error "没有找到任何镜像文件"
            exit 1
        fi
    fi
fi

# 加载前端镜像
if [[ "$LOAD_FRONTEND" == "true" ]]; then
    if [[ -f "$SCRIPT_DIR/images/$FRONTEND_TAR_GZ" ]]; then
        log_info "加载前端镜像: $FRONTEND_TAR_GZ"
        
        # 解压缩并加载镜像
        gunzip -c "$SCRIPT_DIR/images/$FRONTEND_TAR_GZ" | docker load
        
        if [[ $? -eq 0 ]]; then
            log_success "前端镜像加载成功"
            
            # 清理压缩文件（如果配置允许）
            if [[ "$CLEANUP_FILES" == "true" ]]; then
                rm -f "$SCRIPT_DIR/images/$FRONTEND_TAR_GZ"
                log_info "已清理前端镜像压缩文件"
            fi
        else
            log_error "前端镜像加载失败"
            exit 1
        fi
    else
        log_warning "前端镜像文件不存在: $FRONTEND_TAR_GZ"
        if [[ "$LOAD_BACKEND" == "false" ]]; then
            log_error "没有找到任何镜像文件"
            exit 1
        fi
    fi
fi

# 显示加载的镜像
log_info "已加载的镜像:"
docker images | grep "$PROJECT_NAME" || log_warning "未找到项目相关镜像"

log_success "镜像加载完成！"

# 部署服务（如果指定）
if [[ "$DEPLOY_AFTER_LOAD" == "true" ]]; then
    log_info "开始部署服务..."
    
    # 检查 docker-compose.yml 文件
    if [[ ! -f "$SCRIPT_DIR/docker-compose.yml" ]]; then
        log_error "docker-compose.yml 文件不存在"
        log_info "请确保已通过SCP传输了docker-compose.yml文件"
        exit 1
    fi
    
    # 设置 profiles（如果需要本地数据库）
    COMPOSE_PROFILES=""
    if [[ "$COMPOSE_PROFILES" == "local-db" ]]; then
        COMPOSE_PROFILES="--profile local-db"
        log_info "启用本地数据库"
    fi
    
    # 启动服务
    docker-compose -f "$SCRIPT_DIR/docker-compose.yml" -p "${PROJECT_NAME}-fast" $COMPOSE_PROFILES up -d
    
    if [[ $? -eq 0 ]]; then
        log_success "服务部署成功"
        
        # 显示服务状态
        echo ""
        log_info "服务状态:"
        docker-compose -f "$SCRIPT_DIR/docker-compose.yml" -p "${PROJECT_NAME}-fast" ps
        
        # 显示访问信息
        echo ""
        log_info "服务访问信息:"
        echo "  前端地址: http://localhost:${FRONTEND_PORT:-5173}"
        echo "  后端地址: http://localhost:${BACKEND_PORT:-5174}"
        if [[ "$COMPOSE_PROFILES" == "--profile local-db" ]]; then
            echo "  数据库地址: localhost:${DB_EXTERNAL_PORT:-5432}"
        fi
    else
        log_error "服务部署失败"
        exit 1
    fi
fi

# 显示下一步操作提示
echo ""
log_info "下一步操作:"
if [[ "$DEPLOY_AFTER_LOAD" == "false" ]]; then
    echo "  1. 部署服务: docker-compose -f docker-compose.yml -p ${PROJECT_NAME}-fast up -d"
    echo "  2. 查看状态: docker-compose -f docker-compose.yml -p ${PROJECT_NAME}-fast ps"
    echo "  3. 查看日志: docker-compose -f docker-compose.yml -p ${PROJECT_NAME}-fast logs"
else
    echo "  1. 查看日志: docker-compose -f docker-compose.yml -p ${PROJECT_NAME}-fast logs"
    echo "  2. 停止服务: docker-compose -f docker-compose.yml -p ${PROJECT_NAME}-fast down"
    echo "  3. 重启服务: docker-compose -f docker-compose.yml -p ${PROJECT_NAME}-fast restart"
fi

echo ""
log_info "常用管理命令:"
echo "  查看服务状态: docker-compose ps"
echo "  查看实时日志: docker-compose logs -f"
echo "  重启服务: docker-compose restart"
echo "  停止服务: docker-compose down"
echo "  更新服务: docker-compose up -d --force-recreate"
