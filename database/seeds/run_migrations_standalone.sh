#!/bin/bash

# =====================================================
# 独立数据库迁移执行脚本
# 版本: v1.0
# 功能: 通过 psql 客户端执行数据库迁移文件
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

# 默认配置变量（可通过环境变量覆盖）
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_NAME="${DB_NAME:-multisig_db}"
DB_USER="${DB_USER:-multisig_user}"
DB_PASSWORD="${DB_PASSWORD:-multisig_password}"

# 获取脚本所在目录
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MIGRATIONS_DIR="$(dirname "$SCRIPT_DIR")/migrations"

# 调试信息（可选，用于验证路径）
# echo "DEBUG: 脚本路径: ${BASH_SOURCE[0]}"
# echo "DEBUG: 脚本目录: $SCRIPT_DIR"
# echo "DEBUG: 迁移目录: $MIGRATIONS_DIR"

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

# 检查 psql 命令是否可用
check_psql() {
    if ! command -v psql &> /dev/null; then
        log_error "psql 命令未找到，请安装 PostgreSQL 客户端"
        log_info "Ubuntu/Debian: sudo apt-get install postgresql-client"
        log_info "CentOS/RHEL: sudo yum install postgresql"
        log_info "macOS: brew install postgresql"
        exit 1
    fi
    
    log_success "psql 客户端可用"
}

# 构建连接字符串
build_connection_string() {
    if [ -n "$DB_PASSWORD" ]; then
        export PGPASSWORD="$DB_PASSWORD"
    fi
    
    CONNECTION_PARAMS="-h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME"
}

# 检查数据库连接
check_database_connection() {
    log_info "检查数据库连接..."
    log_info "连接参数: $DB_USER@$DB_HOST:$DB_PORT/$DB_NAME"
    
    if ! psql $CONNECTION_PARAMS -c "SELECT 1;" > /dev/null 2>&1; then
        log_error "无法连接到数据库"
        log_info "请检查以下配置:"
        echo "  DB_HOST: $DB_HOST"
        echo "  DB_PORT: $DB_PORT"
        echo "  DB_NAME: $DB_NAME"
        echo "  DB_USER: $DB_USER"
        echo "  DB_PASSWORD: ${DB_PASSWORD:+[已设置]}"
        echo ""
        log_info "可以通过环境变量设置数据库连接参数:"
        echo "  export DB_HOST=your_host"
        echo "  export DB_PORT=your_port"
        echo "  export DB_NAME=your_database"
        echo "  export DB_USER=your_username"
        echo "  export DB_PASSWORD=your_password"
        exit 1
    fi
    
    log_success "数据库连接正常"
}

# 创建迁移记录表
create_migration_table() {
    log_info "创建迁移记录表..."
    
    psql $CONNECTION_PARAMS << 'EOF'
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
    local result=$(psql $CONNECTION_PARAMS -t -c "SELECT COUNT(*) FROM schema_migrations WHERE version = '$version';" 2>/dev/null | tr -d ' ')
    
    if [ "$result" = "1" ]; then
        return 0  # 已执行
    else
        return 1  # 未执行
    fi
}

# 记录迁移执行
record_migration() {
    local version=$1
    psql $CONNECTION_PARAMS << EOF
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
    if psql $CONNECTION_PARAMS -f "$file"; then
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
        
        if psql $CONNECTION_PARAMS -f "$seeds_file"; then
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
    echo "  --config       显示当前数据库配置"
    echo ""
    echo "环境变量:"
    echo "  DB_HOST        数据库主机 (默认: localhost)"
    echo "  DB_PORT        数据库端口 (默认: 5432)"
    echo "  DB_NAME        数据库名称 (默认: multisig_db)"
    echo "  DB_USER        数据库用户 (默认: multisig_user)"
    echo "  DB_PASSWORD    数据库密码 (默认: multisig_password)"
    echo ""
    echo "示例:"
    echo "  # 使用默认配置"
    echo "  $0"
    echo ""
    echo "  # 使用自定义配置"
    echo "  DB_HOST=192.168.1.100 DB_PASSWORD=mypass $0"
    echo ""
    echo "  # 只执行迁移"
    echo "  $0 --migrations"
    echo ""
    echo "默认行为: 执行迁移文件和初始化数据"
}

# 显示当前配置
show_config() {
    log_info "当前数据库配置:"
    echo "  主机: $DB_HOST"
    echo "  端口: $DB_PORT"
    echo "  数据库: $DB_NAME"
    echo "  用户: $DB_USER"
    echo "  密码: ${DB_PASSWORD:+[已设置]}"
}

# 显示迁移状态
show_migration_status() {
    log_info "迁移状态:"
    
    psql $CONNECTION_PARAMS -c "
        SELECT 
            version as \"迁移版本\",
            executed_at as \"执行时间\"
        FROM schema_migrations 
        ORDER BY version;
    " 2>/dev/null || log_warning "无法获取迁移状态（可能表不存在）"
}

# 交互式配置数据库连接
interactive_config() {
    echo ""
    log_info "交互式数据库配置"
    echo ""
    
    read -p "数据库主机 [$DB_HOST]: " input_host
    DB_HOST="${input_host:-$DB_HOST}"
    
    read -p "数据库端口 [$DB_PORT]: " input_port
    DB_PORT="${input_port:-$DB_PORT}"
    
    read -p "数据库名称 [$DB_NAME]: " input_name
    DB_NAME="${input_name:-$DB_NAME}"
    
    read -p "数据库用户 [$DB_USER]: " input_user
    DB_USER="${input_user:-$DB_USER}"
    
    read -s -p "数据库密码: " input_password
    echo ""
    if [ -n "$input_password" ]; then
        DB_PASSWORD="$input_password"
    fi
    
    echo ""
    show_config
    echo ""
    read -p "配置正确吗？(y/N): " confirm
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        log_info "配置已取消"
        exit 0
    fi
}

# 主函数
main() {
    echo -e "${BLUE}"
    echo "=================================================="
    echo "   Web3 企业多签系统 - 独立数据库迁移工具"
    echo "=================================================="
    echo -e "${NC}"
    
    # 解析命令行参数
    case "${1:-}" in
        -h|--help)
            show_help
            exit 0
            ;;
        --config)
            show_config
            exit 0
            ;;
        --interactive)
            interactive_config
            ;;
        --migrations)
            build_connection_string
            check_psql
            check_database_connection
            create_migration_table
            run_migrations
            exit 0
            ;;
        --seeds)
            build_connection_string
            check_psql
            check_database_connection
            run_seeds
            exit 0
            ;;
        --status)
            build_connection_string
            check_psql
            check_database_connection
            show_migration_status
            exit 0
            ;;
        "")
            # 默认行为：执行完整迁移
            build_connection_string
            check_psql
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
