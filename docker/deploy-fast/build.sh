#!/bin/bash

# =====================================================
# Web3 企业多签系统镜像构建脚本 (deploy-fast 策略)
# 版本: v2.2
# 功能: 本地构建 Docker 镜像并默认通过 SCP 传输到远程服务器
# 说明: 默认启用SCP传输，只传输镜像文件，配置文件需手动传输
# 作者: sfan
# 创建时间: 2024-12-01
# 更新时间: 2024-12-21
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
    echo "Web3 企业多签系统镜像构建脚本"
    echo ""
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -e, --env FILE      指定环境配置文件 (默认: .env)"
    echo "  -t, --tag TAG       指定镜像标签 (默认: latest)"
    echo "  -p, --push          构建后推送镜像到仓库 (禁用默认SCP传输)"
    echo "  -s, --scp           强制启用SCP传输 (默认已启用)"
    echo "  --no-cache          构建时不使用缓存"
    echo "  --backend-only      仅构建后端镜像"
    echo "  --frontend-only     仅构建前端镜像"
    echo "  -h, --help          显示此帮助信息"
    echo ""
    echo "SCP 传输说明:"
    echo "  - 本脚本只传输镜像文件 (.tar.gz)"
    echo "  - 配置文件 (.env, docker-compose.yml, load-images.sh) 需手动传输"
    echo "  - 这样设计是为了保持配置文件的可控性，避免意外覆盖"
    echo ""
    echo "示例:"
    echo "  $0                                    # 默认构建并通过SCP传输"
    echo "  $0 -e env.scp.example -t v1.0.0      # 使用指定配置构建 v1.0.0 版本"
    echo "  $0 -p                                 # 构建并推送到镜像仓库"
    echo "  $0 --backend-only                    # 仅构建并传输后端镜像"
    echo "  $0 --frontend-only                   # 仅构建并传输前端镜像"
}

# 默认参数
ENV_FILE=".env"
IMAGE_TAG="latest"
PUSH_IMAGE=false
SCP_TRANSFER=true  # 默认启用SCP传输
NO_CACHE=false
BUILD_BACKEND=true
BUILD_FRONTEND=true

# 解析命令行参数
while [[ $# -gt 0 ]]; do
    case $1 in
        -e|--env)
            ENV_FILE="$2"
            shift 2
            ;;
        -t|--tag)
            IMAGE_TAG="$2"
            shift 2
            ;;
        -p|--push)
            PUSH_IMAGE=true
            SCP_TRANSFER=false  # 推送模式时禁用SCP
            shift
            ;;
        -s|--scp)
            SCP_TRANSFER=true
            PUSH_IMAGE=false  # SCP模式时禁用推送
            shift
            ;;
        --no-cache)
            NO_CACHE=true
            shift
            ;;
        --backend-only)
            BUILD_FRONTEND=false
            shift
            ;;
        --frontend-only)
            BUILD_BACKEND=false
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
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

log_info "脚本目录: $SCRIPT_DIR"
log_info "项目根目录: $PROJECT_ROOT"

# 检查环境配置文件
if [[ ! -f "$SCRIPT_DIR/$ENV_FILE" ]]; then
    log_error "环境配置文件不存在: $SCRIPT_DIR/$ENV_FILE"
    log_info "请先复制并配置环境文件:"
    log_info "  cp $SCRIPT_DIR/env.local.example $SCRIPT_DIR/.env"
    exit 1
fi

# 加载环境变量
log_info "加载环境配置: $ENV_FILE"
source "$SCRIPT_DIR/$ENV_FILE"

# 检查必需的环境变量
if [[ -z "$PROJECT_NAME" ]]; then
    log_error "PROJECT_NAME 未设置"
    exit 1
fi

if [[ -z "$DOCKER_REGISTRY" ]]; then
    log_error "DOCKER_REGISTRY 未设置"
    exit 1
fi

# 设置构建信息
BUILD_TIME=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
BUILD_VERSION="${IMAGE_TAG}"

log_info "构建信息:"
log_info "  项目名称: $PROJECT_NAME"
log_info "  Docker 仓库: $DOCKER_REGISTRY"
log_info "  镜像标签: $IMAGE_TAG"
log_info "  构建时间: $BUILD_TIME"
log_info "  Git 提交: $GIT_COMMIT"

# 设置镜像名称
BACKEND_IMAGE="${DOCKER_REGISTRY}/${PROJECT_NAME}-backend:${IMAGE_TAG}"
FRONTEND_IMAGE="${DOCKER_REGISTRY}/${PROJECT_NAME}-frontend:${IMAGE_TAG}"

# 构建参数
CACHE_OPTION=""
if [[ "$NO_CACHE" == "true" ]]; then
    CACHE_OPTION="--no-cache"
fi

# 构建后端镜像
if [[ "$BUILD_BACKEND" == "true" ]]; then
    log_info "开始构建后端镜像: $BACKEND_IMAGE"
    
    docker build $CACHE_OPTION \
        -f "$SCRIPT_DIR/Dockerfile.backend" \
        -t "$BACKEND_IMAGE" \
        --build-arg BUILD_VERSION="$BUILD_VERSION" \
        --build-arg BUILD_TIME="$BUILD_TIME" \
        --build-arg GIT_COMMIT="$GIT_COMMIT" \
        "$PROJECT_ROOT/backend"
    
    if [[ $? -eq 0 ]]; then
        log_success "后端镜像构建成功: $BACKEND_IMAGE"
    else
        log_error "后端镜像构建失败"
        exit 1
    fi
fi

# 构建前端镜像
if [[ "$BUILD_FRONTEND" == "true" ]]; then
    log_info "开始构建前端镜像: $FRONTEND_IMAGE"
    
    # 检查前端构建时环境变量
    if [[ -z "$VITE_API_BASE_URL" ]]; then
        log_warning "VITE_API_BASE_URL 未设置，使用默认值"
        VITE_API_BASE_URL="http://localhost:5174"
    fi
    
    docker build $CACHE_OPTION \
        -f "$SCRIPT_DIR/Dockerfile.frontend" \
        -t "$FRONTEND_IMAGE" \
        --build-arg BUILD_VERSION="$BUILD_VERSION" \
        --build-arg BUILD_TIME="$BUILD_TIME" \
        --build-arg GIT_COMMIT="$GIT_COMMIT" \
        --build-arg VITE_API_BASE_URL="$VITE_API_BASE_URL" \
        --build-arg VITE_WS_URL="$VITE_WS_URL" \
        --build-arg VITE_CHAIN_ID="$VITE_CHAIN_ID" \
        --build-arg VITE_CHAIN_NAME="$VITE_CHAIN_NAME" \
        --build-arg VITE_RPC_URL="$VITE_RPC_URL" \
        --build-arg VITE_BLOCK_EXPLORER="$VITE_BLOCK_EXPLORER" \
        --build-arg VITE_SAFE_SERVICE_URL="$VITE_SAFE_SERVICE_URL" \
        "$PROJECT_ROOT/frontend"
    
    if [[ $? -eq 0 ]]; then
        log_success "前端镜像构建成功: $FRONTEND_IMAGE"
    else
        log_error "前端镜像构建失败"
        exit 1
    fi
fi

# 推送镜像到仓库
if [[ "$PUSH_IMAGE" == "true" ]]; then
    log_info "开始推送镜像到仓库..."
    
    # 推送后端镜像
    if [[ "$BUILD_BACKEND" == "true" ]]; then
        log_info "推送后端镜像: $BACKEND_IMAGE"
        docker push "$BACKEND_IMAGE"
        if [[ $? -eq 0 ]]; then
            log_success "后端镜像推送成功"
        else
            log_error "后端镜像推送失败"
            exit 1
        fi
    fi
    
    # 推送前端镜像
    if [[ "$BUILD_FRONTEND" == "true" ]]; then
        log_info "推送前端镜像: $FRONTEND_IMAGE"
        docker push "$FRONTEND_IMAGE"
        if [[ $? -eq 0 ]]; then
            log_success "前端镜像推送成功"
        else
            log_error "前端镜像推送失败"
            exit 1
        fi
    fi
fi

# SCP传输镜像到远程服务器
if [[ "$SCP_TRANSFER" == "true" ]]; then
    log_info "开始通过SCP传输镜像到远程服务器..."
    
    # 检查是否使用SSH别名
    SSH_ALIAS=""
    SSH_TARGET=""
    if [[ -n "$SSH_ALIAS_NAME" ]]; then
        # 测试SSH别名是否可用
        if ssh -o ConnectTimeout=5 "$SSH_ALIAS_NAME" "echo 'SSH别名测试成功'" 2>/dev/null; then
            SSH_ALIAS="$SSH_ALIAS_NAME"
            SSH_TARGET="$SSH_ALIAS_NAME"
            log_info "使用SSH别名进行传输: $SSH_ALIAS_NAME"
        else
            log_error "SSH别名 '$SSH_ALIAS_NAME' 不可用，请检查SSH配置"
            exit 1
        fi
    else
        # 使用传统的SSH连接方式
        if [[ -z "$REMOTE_HOST" ]]; then
            log_error "REMOTE_HOST 未设置，无法进行SCP传输"
            exit 1
        fi
        
        if [[ -z "$REMOTE_USER" ]]; then
            log_error "REMOTE_USER 未设置，无法进行SCP传输"
            exit 1
        fi
        
        SSH_TARGET="$REMOTE_USER@$REMOTE_HOST"
        log_info "使用完整SSH连接进行传输: $SSH_TARGET"
    fi
    
    if [[ -z "$REMOTE_PATH" ]]; then
        log_error "REMOTE_PATH 未设置，无法进行SCP传输"
        exit 1
    fi
    
    # 创建本地临时目录
    LOCAL_TEMP_DIR="$SCRIPT_DIR/temp_images"
    mkdir -p "$LOCAL_TEMP_DIR"
    
    # 确保远程镜像目录存在并有正确权限
    log_info "确保远程镜像目录存在..."
    ssh $SSH_OPTIONS "$SSH_TARGET" "mkdir -p $REMOTE_PATH/images && chmod 755 $REMOTE_PATH/images" || {
        log_warning "创建远程镜像目录失败，可能影响传输"
    }
    
    # 设置SSH选项（仅在不使用别名时需要）
    SSH_OPTIONS=""
    if [[ -z "$SSH_ALIAS" ]]; then
        SSH_OPTIONS="-o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
        if [[ -n "$SSH_KEY_PATH" ]]; then
            SSH_OPTIONS="$SSH_OPTIONS -i $SSH_KEY_PATH"
        fi
        if [[ -n "$REMOTE_PORT" ]]; then
            SSH_OPTIONS="$SSH_OPTIONS -p $REMOTE_PORT"
        fi
    else
        log_info "使用SSH别名，跳过SSH选项配置"
    fi
    
    # 下载并传输 PostgreSQL 镜像（用于本地数据库）
    log_info "下载 PostgreSQL 镜像..."
    POSTGRES_IMAGE="postgres:15-alpine"
    POSTGRES_TAR="$LOCAL_TEMP_DIR/postgres-15-alpine.tar"
    
    # 检查本地是否已有 PostgreSQL 镜像
    if ! docker image inspect "$POSTGRES_IMAGE" >/dev/null 2>&1; then
        log_info "本地未找到 PostgreSQL 镜像，开始下载..."
        docker pull "$POSTGRES_IMAGE" || {
            log_warning "下载 PostgreSQL 镜像失败，尝试使用国内镜像源..."
            docker pull "registry.cn-hangzhou.aliyuncs.com/library/postgres:15-alpine" || {
                log_error "下载 PostgreSQL 镜像失败"
                exit 1
            }
            # 重新标记镜像
            docker tag "registry.cn-hangzhou.aliyuncs.com/library/postgres:15-alpine" "$POSTGRES_IMAGE"
        }
    else
        log_info "本地已存在 PostgreSQL 镜像"
    fi
    
    # 导出 PostgreSQL 镜像
    log_info "导出 PostgreSQL 镜像: $POSTGRES_IMAGE"
    docker save "$POSTGRES_IMAGE" -o "$POSTGRES_TAR"
    if [[ $? -eq 0 ]]; then
        log_success "PostgreSQL 镜像导出成功: $POSTGRES_TAR"
        
        # 压缩镜像文件
        log_info "压缩 PostgreSQL 镜像文件..."
        gzip -${COMPRESSION_LEVEL:-6} "$POSTGRES_TAR"
        POSTGRES_TAR_GZ="${POSTGRES_TAR}.gz"
        
        if [[ -f "$POSTGRES_TAR_GZ" ]]; then
            log_success "PostgreSQL 镜像压缩完成: $POSTGRES_TAR_GZ"
            
            # 通过SCP传输到远程服务器
            log_info "传输 PostgreSQL 镜像到 $SSH_TARGET:$REMOTE_PATH/images"
            scp $SSH_OPTIONS "$POSTGRES_TAR_GZ" "$SSH_TARGET:$REMOTE_PATH/images/"
            
            if [[ $? -eq 0 ]]; then
                log_success "PostgreSQL 镜像传输成功"
                
                # 清理本地文件（如果配置允许）
                if [[ "$KEEP_LOCAL_IMAGES" != "true" ]]; then
                    rm -f "$POSTGRES_TAR_GZ"
                    log_info "已清理本地 PostgreSQL 镜像文件"
                fi
            else
                log_error "PostgreSQL 镜像传输失败"
                exit 1
            fi
        else
            log_error "PostgreSQL 镜像压缩失败"
            exit 1
        fi
    else
        log_error "PostgreSQL 镜像导出失败"
        exit 1
    fi
    
    # 导出并传输后端镜像
    if [[ "$BUILD_BACKEND" == "true" ]]; then
        log_info "导出后端镜像: $BACKEND_IMAGE"
        BACKEND_TAR="$LOCAL_TEMP_DIR/${PROJECT_NAME}-backend-${IMAGE_TAG}.tar"
        
        docker save "$BACKEND_IMAGE" -o "$BACKEND_TAR"
        if [[ $? -eq 0 ]]; then
            log_success "后端镜像导出成功: $BACKEND_TAR"
            
            # 压缩镜像文件
            log_info "压缩后端镜像文件..."
            gzip -${COMPRESSION_LEVEL:-6} "$BACKEND_TAR"
            BACKEND_TAR_GZ="${BACKEND_TAR}.gz"
            
            if [[ -f "$BACKEND_TAR_GZ" ]]; then
                log_success "后端镜像压缩完成: $BACKEND_TAR_GZ"
                
                # 通过SCP传输到远程服务器
                log_info "传输后端镜像到 $SSH_TARGET:$REMOTE_PATH/images"
                scp $SSH_OPTIONS "$BACKEND_TAR_GZ" "$SSH_TARGET:$REMOTE_PATH/images/"
                
                if [[ $? -eq 0 ]]; then
                    log_success "后端镜像传输成功"
                    
                    # 清理本地文件（如果配置允许）
                    if [[ "$KEEP_LOCAL_IMAGES" != "true" ]]; then
                        rm -f "$BACKEND_TAR_GZ"
                        log_info "已清理本地后端镜像文件"
                    fi
                else
                    log_error "后端镜像传输失败"
                    exit 1
                fi
            else
                log_error "后端镜像压缩失败"
                exit 1
            fi
        else
            log_error "后端镜像导出失败"
            exit 1
        fi
    fi
    
    # 导出并传输前端镜像
    if [[ "$BUILD_FRONTEND" == "true" ]]; then
        log_info "导出前端镜像: $FRONTEND_IMAGE"
        FRONTEND_TAR="$LOCAL_TEMP_DIR/${PROJECT_NAME}-frontend-${IMAGE_TAG}.tar"
        
        docker save "$FRONTEND_IMAGE" -o "$FRONTEND_TAR"
        if [[ $? -eq 0 ]]; then
            log_success "前端镜像导出成功: $FRONTEND_TAR"
            
            # 压缩镜像文件
            log_info "压缩前端镜像文件..."
            gzip -${COMPRESSION_LEVEL:-6} "$FRONTEND_TAR"
            FRONTEND_TAR_GZ="${FRONTEND_TAR}.gz"
            
            if [[ -f "$FRONTEND_TAR_GZ" ]]; then
                log_success "前端镜像压缩完成: $FRONTEND_TAR_GZ"
                
                # 通过SCP传输到远程服务器
                log_info "传输前端镜像到 $SSH_TARGET:$REMOTE_PATH/images"
                scp $SSH_OPTIONS "$FRONTEND_TAR_GZ" "$SSH_TARGET:$REMOTE_PATH/images/"
                
                if [[ $? -eq 0 ]]; then
                    log_success "前端镜像传输成功"
                    
                    # 清理本地文件（如果配置允许）
                    if [[ "$KEEP_LOCAL_IMAGES" != "true" ]]; then
                        rm -f "$FRONTEND_TAR_GZ"
                        log_info "已清理本地前端镜像文件"
                    fi
                else
                    log_error "前端镜像传输失败"
                    exit 1
                fi
            else
                log_error "前端镜像压缩失败"
                exit 1
            fi
        else
            log_error "前端镜像导出失败"
            exit 1
        fi
    fi
    
    log_success "所有镜像传输完成！"
    
    # 清理本地临时目录
    if [[ "$KEEP_LOCAL_IMAGES" != "true" ]]; then
        rm -rf "$LOCAL_TEMP_DIR"
        log_info "已清理本地临时目录"
    fi
fi

# 显示镜像信息
log_info "构建完成的镜像:"
if [[ "$BUILD_BACKEND" == "true" ]]; then
    echo "  后端: $BACKEND_IMAGE"
fi
if [[ "$BUILD_FRONTEND" == "true" ]]; then
    echo "  前端: $FRONTEND_IMAGE"
fi

log_success "构建脚本执行完成！"

# 显示下一步操作提示
echo ""
log_info "下一步操作:"
if [[ "$SCP_TRANSFER" == "true" ]]; then
    echo "  1. 手动传输配置文件到服务器 (首次部署):"
    echo "     ./first_transter_to_server.sh"
    echo "  2. 登录到远程服务器: ssh ${SSH_TARGET:-$REMOTE_USER@$REMOTE_HOST}"
    echo "  3. 进入项目目录: cd $REMOTE_PATH"
    echo "  4. 加载镜像并部署: ./load-images.sh -d"
    echo "  5. 查看运行状态: docker-compose ps"
elif [[ "$PUSH_IMAGE" == "true" ]]; then
    echo "  1. 在服务器上部署: ./deploy.sh"
    echo "  2. 查看运行状态: docker-compose ps"
else
    echo "  1. 推送镜像到仓库: $0 -p"
    echo "  2. 或通过SCP传输镜像: $0 -s"
    echo "  3. 在服务器上部署: ./deploy.sh"
fi
