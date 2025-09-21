#!/bin/bash

# =====================================================
# Web3 企业多签系统前端镜像加载和部署脚本
# 版本: v1.0
# 功能: 专门用于前端的镜像加载和独立部署
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
    echo "Web3 企业多签系统前端镜像加载和部署脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -d, --deploy        加载镜像后立即部署前端"
    echo "  -c, --cleanup       加载后清理压缩文件"
    echo "  --load-only         仅加载镜像，不部署"
    echo "  --deploy-only       仅部署（假设镜像已存在）"
    echo "  --stop              停止前端服务"
    echo "  -h, --help          显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0                  # 仅加载前端镜像"
    echo "  $0 -d               # 加载镜像并部署前端"
    echo "  $0 --deploy-only    # 仅部署前端（不加载镜像）"
}

# 默认参数
DEPLOY_AFTER_LOAD=false
CLEANUP_FILES=false
LOAD_IMAGE=true
DEPLOY_ONLY=false
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
        --load-only)
            DEPLOY_AFTER_LOAD=false
            shift
            ;;
        --deploy-only)
            DEPLOY_ONLY=true
            LOAD_IMAGE=false
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
    log_info "停止前端服务..."
    
    # 检查环境配置文件
    if [[ ! -f "$SCRIPT_DIR/.env" ]]; then
        log_error "环境配置文件不存在: $SCRIPT_DIR/.env"
        exit 1
    fi
    
    # 加载环境变量
    source "$SCRIPT_DIR/.env"
    
    # 停止前端服务
    if [[ -f "$SCRIPT_DIR/docker-compose-frontend-only.yml" ]]; then
        log_info "停止前端服务..."
        docker-compose -f "$SCRIPT_DIR/docker-compose-frontend-only.yml" -p "${PROJECT_NAME:-multisig}-frontend" down
        log_success "前端服务已停止"
    else
        log_error "docker-compose-frontend-only.yml 文件不存在"
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
FRONTEND_TAR_GZ="${PROJECT_NAME}-frontend-${IMAGE_TAG}.tar.gz"

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

# 加载前端镜像
if [[ "$LOAD_IMAGE" == "true" ]]; then
    log_info "开始加载前端 Docker 镜像..."
    
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
        log_error "前端镜像文件不存在: images/$FRONTEND_TAR_GZ"
        log_info "请确保已传输前端镜像文件"
        exit 1
    fi
    
    # 显示加载的镜像
    log_info "已加载的前端镜像:"
    docker images | grep "${PROJECT_NAME}-frontend" || log_warning "未找到前端镜像"
    
    log_success "前端镜像加载完成！"
fi

# 部署前端服务（如果指定）
if [[ "$DEPLOY_AFTER_LOAD" == "true" ]] || [[ "$DEPLOY_ONLY" == "true" ]]; then
    log_info "开始部署前端服务..."
    
    # 检查 docker-compose-frontend-only.yml 文件
    if [[ ! -f "$SCRIPT_DIR/docker-compose-frontend-only.yml" ]]; then
        log_error "docker-compose-frontend-only.yml 文件不存在"
        log_info "请确保已通过SCP传输了前端配置文件"
        exit 1
    fi
    
    # 停止现有的前端服务（如果存在）
    log_info "停止现有前端服务..."
    docker-compose -f "$SCRIPT_DIR/docker-compose-frontend-only.yml" -p "${PROJECT_NAME}-frontend" down 2>/dev/null || true
    
    # 启动前端服务
    log_info "启动前端服务..."
    docker-compose -f "$SCRIPT_DIR/docker-compose-frontend-only.yml" -p "${PROJECT_NAME}-frontend" up -d
    
    if [[ $? -eq 0 ]]; then
        log_success "前端服务部署成功"
        
        # 显示服务状态
        echo ""
        log_info "前端服务状态:"
        docker-compose -f "$SCRIPT_DIR/docker-compose-frontend-only.yml" -p "${PROJECT_NAME}-frontend" ps
        
        # 显示访问信息
        echo ""
        log_info "前端访问信息:"
        echo "  前端地址: http://localhost:${FRONTEND_PORT:-5173}"
        echo "  健康检查: curl -I http://localhost:${FRONTEND_PORT:-5173}"
        
        # 等待健康检查
        log_info "等待前端服务健康检查..."
        sleep 10
        
        # 测试前端服务
        if curl -f -s http://localhost:${FRONTEND_PORT:-5173} > /dev/null; then
            log_success "前端服务运行正常！"
        else
            log_warning "前端服务可能还在启动中，请稍后检查"
        fi
    else
        log_error "前端服务部署失败"
        exit 1
    fi
fi

# 显示下一步操作提示
echo ""
log_info "前端管理命令:"
echo "  查看状态: docker-compose -f docker-compose-frontend-only.yml -p ${PROJECT_NAME}-frontend ps"
echo "  查看日志: docker-compose -f docker-compose-frontend-only.yml -p ${PROJECT_NAME}-frontend logs"
echo "  重启服务: docker-compose -f docker-compose-frontend-only.yml -p ${PROJECT_NAME}-frontend restart"
echo "  停止服务: docker-compose -f docker-compose-frontend-only.yml -p ${PROJECT_NAME}-frontend down"
echo "  更新服务: docker-compose -f docker-compose-frontend-only.yml -p ${PROJECT_NAME}-frontend up -d --force-recreate"

echo ""
log_success "前端部署脚本执行完成！"
