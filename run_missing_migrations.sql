-- 执行缺失的数据库迁移
-- 这个脚本用于修复 safe_role_templates 表不存在的问题

\echo '开始执行Safe角色模板表迁移...'

-- 创建Safe-角色模板关联表
CREATE TABLE IF NOT EXISTS safe_role_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    safe_id UUID NOT NULL REFERENCES safes(id) ON DELETE CASCADE,
    template_id VARCHAR(100) NOT NULL, -- 支持预制模板ID和自定义模板UUID
    template_name VARCHAR(100) NOT NULL,
    template_display_name VARCHAR(200) NOT NULL,
    template_category VARCHAR(50) NOT NULL DEFAULT 'safe', -- 'safe', 'system'
    permissions JSONB NOT NULL DEFAULT '[]'::jsonb,
    restrictions JSONB DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT true,
    applied_by UUID NOT NULL REFERENCES users(id),
    applied_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    -- 确保同一个Safe不会重复应用相同的模板
    UNIQUE(safe_id, template_id)
);

-- 创建索引优化查询性能
CREATE INDEX IF NOT EXISTS idx_safe_role_templates_safe_id ON safe_role_templates(safe_id);
CREATE INDEX IF NOT EXISTS idx_safe_role_templates_template_id ON safe_role_templates(template_id);
CREATE INDEX IF NOT EXISTS idx_safe_role_templates_active ON safe_role_templates(is_active);
CREATE INDEX IF NOT EXISTS idx_safe_role_templates_category ON safe_role_templates(template_category);

-- 创建更新时间触发器
CREATE OR REPLACE FUNCTION update_safe_role_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER IF NOT EXISTS update_safe_role_templates_updated_at
    BEFORE UPDATE ON safe_role_templates
    FOR EACH ROW
    EXECUTE FUNCTION update_safe_role_templates_updated_at();

-- 添加注释
COMMENT ON TABLE safe_role_templates IS 'Safe角色模板关联表，记录哪些权限模板被应用到哪些Safe';
COMMENT ON COLUMN safe_role_templates.safe_id IS '关联的Safe ID';
COMMENT ON COLUMN safe_role_templates.template_id IS '权限模板ID（预制模板使用字符串ID，自定义模板使用UUID）';
COMMENT ON COLUMN safe_role_templates.template_name IS '模板名称（用于角色分配）';
COMMENT ON COLUMN safe_role_templates.template_display_name IS '模板显示名称';
COMMENT ON COLUMN safe_role_templates.template_category IS '模板分类：safe或system';
COMMENT ON COLUMN safe_role_templates.permissions IS '模板包含的权限列表';
COMMENT ON COLUMN safe_role_templates.restrictions IS '模板的限制条件';
COMMENT ON COLUMN safe_role_templates.is_active IS '模板是否在该Safe中激活';
COMMENT ON COLUMN safe_role_templates.applied_by IS '应用模板的用户ID';
COMMENT ON COLUMN safe_role_templates.applied_at IS '模板应用时间';

\echo 'Safe角色模板表迁移完成！'

-- 验证表是否创建成功
SELECT 'safe_role_templates表已创建' as status, count(*) as record_count FROM safe_role_templates;
