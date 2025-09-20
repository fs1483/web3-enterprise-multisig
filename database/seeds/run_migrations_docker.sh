#!/bin/bash

# =====================================================
# Docker 数据库迁移执行脚本
# 版本: v1.0
# 功能: 通过 Docker 容器执行数据库迁移文件
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

# 配置变量
CONTAINER_NAME="multisig-postgres"
DB_NAME="multisig_db"
DB_USER="multisig_user"
DB_PASSWORD="multisig_password"

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$(dirname "$SCRIPT_DIR")/migrations"

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

# 检查 Docker 容器是否运行
check_container() {
    log_info "检查 Docker 容器状态..."
    
    if ! docker ps | grep -q "$CONTAINER_NAME"; then
        log_error "PostgreSQL 容器 '$CONTAINER_NAME' 未运行"
        log_info "请先启动容器: docker-compose up -d"
        exit 1
    fi
    
    log_success "PostgreSQL 容器运行正常"
}

# 检查数据库连接
check_database_connection() {
    log_info "检查数据库连接..."
    
    if ! docker exec "$CONTAINER_NAME" pg_isready -U "$DB_USER" -d "$DB_NAME" > /dev/null 2>&1; then
        log_error "无法连接到数据库"
        exit 1
    fi
    
    log_success "数据库连接正常"
}

# 创建迁移记录表
create_migration_table() {
    log_info "创建迁移记录表..."
    
    docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" << 'EOF'
CREATE TABLE IF NOT EXISTS schema_migrations (
    version VARCHAR(255) PRIMARY KEY,
    executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
EOF
    
    log_success "迁移记录表创建完成"
}

# 检查迁移是否已执行
is_migration_executed() {
    local version=$1
    local result=$(docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -t -c "SELECT COUNT(*) FROM schema_migrations WHERE version = '$version';" 2>/dev/null | tr -d ' ')
    
    if [ "$result" = "1" ]; then
        return 0  # 已执行
    else
        return 1  # 未执行
    fi
}

# 记录迁移执行
record_migration() {
    local version=$1
    docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" << EOF
INSERT INTO schema_migrations (version) VALUES ('$version');
EOF
}

# 执行单个迁移文件
execute_migration() {
    local file=$1
    local filename=$(basename "$file")
    local version="${filename%.*}"  # 移除 .sql 扩展名
    
    if is_migration_executed "$version"; then
        log_warning "迁移 $filename 已执行，跳过"
        return 0
    fi
    
    log_info "执行迁移: $filename"
    
    # 执行 SQL 文件
    if docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" < "$file"; then
        # 记录迁移
        record_migration "$version"
        log_success "迁移 $filename 执行成功"
    else
        log_error "迁移 $filename 执行失败"
        exit 1
    fi
}

# 执行所有迁移文件
run_migrations() {
    log_info "开始执行数据库迁移..."
    
    # 迁移文件列表（按顺序）
    local migrations=(
        "001_init_schema.sql"
        "002_add_safe_transactions.sql"
        "003_create_proposals_tables.sql"
        "004_add_nonce_fields_to_signatures.sql"
        "005_add_policy_management.sql"
        "006_add_proposal_status_fields.sql"
        "007_add_permission_management.sql"
        "008_create_safe_role_templates.sql"
        "009_create_safe_custom_roles.sql"
        "010_permission_data.sql"
    )
    
    for migration in "${migrations[@]}"; do
        local file_path="$MIGRATIONS_DIR/$migration"
        
        if [ ! -f "$file_path" ]; then
            log_error "迁移文件不存在: $file_path"
            exit 1
        fi
        
        execute_migration "$file_path"
    done
    
    log_success "所有数据库迁移执行完成！"
}

# 执行初始化数据
run_seeds() {
    log_info "执行初始化数据..."
    
    local seeds_file="$SCRIPT_DIR/001_init_super_admin.sql"
    
    if [ -f "$seeds_file" ]; then
        log_info "执行初始化脚本: 001_init_super_admin.sql"
        
        if docker exec -i "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" < "$seeds_file"; then
            log_success "初始化数据执行成功"
        else
            log_warning "初始化数据执行失败（可能已存在）"
        fi
    else
        log_warning "初始化数据文件不存在: $seeds_file"
    fi
}

# 显示帮助信息
show_help() {
    echo "用法: $0 [选项]"
    echo ""
    echo "选项:"
    echo "  -h, --help     显示帮助信息"
    echo "  --migrations   只执行迁移文件"
    echo "  --seeds        只执行初始化数据"
    echo "  --status       显示迁移状态"
    echo ""
    echo "默认行为: 执行迁移文件和初始化数据"
}

# 显示迁移状态
show_migration_status() {
    log_info "迁移状态:"
    
    docker exec "$CONTAINER_NAME" psql -U "$DB_USER" -d "$DB_NAME" -c "
        SELECT 
            version as \"迁移版本\",
            executed_at as \"执行时间\"
        FROM schema_migrations 
        ORDER BY version;
    " 2>/dev/null || log_warning "无法获取迁移状态（可能表不存在）"
}

# 主函数
main() {
    echo -e "${BLUE}"
    echo "=================================================="
    echo "     Web3 企业多签系统 - Docker 数据库迁移工具"
    echo "=================================================="
    echo -e "${NC}"
    
    # 解析命令行参数
    case "${1:-}" in
        -h|--help)
            show_help
            exit 0
            ;;
        --migrations)
            check_container
            check_database_connection
            create_migration_table
            run_migrations
            exit 0
            ;;
        --seeds)
            check_container
            check_database_connection
            run_seeds
            exit 0
            ;;
        --status)
            check_container
            check_database_connection
            show_migration_status
            exit 0
            ;;
        "")
            # 默认行为：执行完整迁移
            check_container
            check_database_connection
            create_migration_table
            run_migrations
            run_seeds
            ;;
        *)
            log_error "未知选项: $1"
            show_help
            exit 1
            ;;
    esac
    
    echo ""
    log_success "数据库迁移完成！"
    echo ""
    log_info "默认超级管理员账户:"
    echo "  用户名: superadmin"
    echo "  邮箱: admin@company.com"
    echo "  密码: SuperAdmin@123"
    echo ""
}

# 执行主函数
main "$@"
