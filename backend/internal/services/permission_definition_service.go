package services

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"web3-enterprise-multisig/internal/models"
)

// PermissionDefinitionService 权限定义服务
type PermissionDefinitionService struct {
	db *gorm.DB
}

// NewPermissionDefinitionService 创建权限定义服务实例
func NewPermissionDefinitionService(db *gorm.DB) *PermissionDefinitionService {
	return &PermissionDefinitionService{db: db}
}

// GetPermissionDefinitions 获取权限定义列表
func (s *PermissionDefinitionService) GetPermissionDefinitions(ctx context.Context, filter models.PermissionDefinitionFilter) ([]models.PermissionDefinitionResponse, int64, error) {
	var definitions []models.PermissionDefinition
	var total int64

	// 构建查询
	query := s.db.WithContext(ctx).Model(&models.PermissionDefinition{})

	// 应用过滤条件
	if filter.Category != "" {
		query = query.Where("category = ?", filter.Category)
	}
	if filter.Scope != "" {
		query = query.Where("scope = ?", filter.Scope)
	}
	if filter.IsSystem != nil {
		query = query.Where("is_system = ?", *filter.IsSystem)
	}
	if filter.IsActive != nil {
		query = query.Where("is_active = ?", *filter.IsActive)
	}
	if filter.Search != "" {
		searchTerm := "%" + strings.ToLower(filter.Search) + "%"
		query = query.Where("LOWER(code) LIKE ? OR LOWER(name) LIKE ? OR LOWER(description) LIKE ?", 
			searchTerm, searchTerm, searchTerm)
	}

	// 获取总数
	if err := query.Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("获取权限定义总数失败: %w", err)
	}

	// 分页
	if filter.Page <= 0 {
		filter.Page = 1
	}
	if filter.PageSize <= 0 {
		filter.PageSize = 20
	}
	offset := (filter.Page - 1) * filter.PageSize

	// 查询数据
	if err := query.Preload("Creator").
		Order("scope ASC, category ASC, code ASC").
		Offset(offset).
		Limit(filter.PageSize).
		Find(&definitions).Error; err != nil {
		return nil, 0, fmt.Errorf("查询权限定义失败: %w", err)
	}

	// 转换为响应格式
	var responses []models.PermissionDefinitionResponse
	for _, def := range definitions {
		response := models.PermissionDefinitionResponse{
			ID:          def.ID,
			Code:        def.Code,
			Name:        def.Name,
			Description: def.Description,
			Category:    def.Category,
			Scope:       def.Scope,
			IsSystem:    def.IsSystem,
			IsActive:    def.IsActive,
			CreatedAt:   def.CreatedAt,
			UpdatedAt:   def.UpdatedAt,
		}

		// 添加权限映射字段
		if def.MappingType != nil {
			response.MappingType = def.MappingType
		}
		if def.MappingURL != nil {
			response.MappingURL = def.MappingURL
		}
		if def.MappingMethod != nil {
			response.MappingMethod = def.MappingMethod
		}
		if def.UIElementID != nil {
			response.UIElementID = def.UIElementID
		}
		if def.ParentPermission != nil {
			response.ParentPermission = def.ParentPermission
		}
		// DisplayOrder是int类型，直接赋值
		response.DisplayOrder = &def.DisplayOrder

		if def.Creator != nil {
			response.CreatedBy = def.Creator.Email
			response.CreatorName = def.Creator.Username
		}

		responses = append(responses, response)
	}

	return responses, total, nil
}

// GetPermissionDefinitionByID 根据ID获取权限定义
func (s *PermissionDefinitionService) GetPermissionDefinitionByID(ctx context.Context, id uuid.UUID) (*models.PermissionDefinitionResponse, error) {
	var definition models.PermissionDefinition

	if err := s.db.WithContext(ctx).
		Preload("Creator").
		Where("id = ?", id).
		First(&definition).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("权限定义不存在")
		}
		return nil, fmt.Errorf("查询权限定义失败: %w", err)
	}

	response := &models.PermissionDefinitionResponse{
		ID:          definition.ID,
		Code:        definition.Code,
		Name:        definition.Name,
		Description: definition.Description,
		Category:    definition.Category,
		Scope:       definition.Scope,
		IsSystem:    definition.IsSystem,
		IsActive:    definition.IsActive,
		CreatedAt:   definition.CreatedAt,
		UpdatedAt:   definition.UpdatedAt,
	}

	if definition.Creator != nil {
		response.CreatedBy = definition.Creator.Email
		response.CreatorName = definition.Creator.Username
	}

	return response, nil
}

// CreatePermissionDefinition 创建权限定义
func (s *PermissionDefinitionService) CreatePermissionDefinition(ctx context.Context, req models.PermissionDefinitionRequest, createdBy uuid.UUID) (*models.PermissionDefinitionResponse, error) {
	// 检查权限代码是否已存在
	var count int64
	if err := s.db.WithContext(ctx).Model(&models.PermissionDefinition{}).
		Where("code = ?", req.Code).Count(&count).Error; err != nil {
		return nil, fmt.Errorf("检查权限代码失败: %w", err)
	}
	if count > 0 {
		return nil, fmt.Errorf("权限代码 '%s' 已存在", req.Code)
	}

	// 验证权限代码格式
	if !isValidPermissionCode(req.Code) {
		return nil, fmt.Errorf("权限代码格式无效，应为 'category.resource.action' 格式")
	}

	// 创建权限定义
	definition := models.PermissionDefinition{
		Code:        req.Code,
		Name:        req.Name,
		Description: req.Description,
		Category:    req.Category,
		Scope:       req.Scope,
		IsSystem:    false, // 用户创建的权限不是系统权限
		IsActive:    true,
		CreatedBy:   &createdBy,
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	if err := s.db.WithContext(ctx).Create(&definition).Error; err != nil {
		return nil, fmt.Errorf("创建权限定义失败: %w", err)
	}

	// 返回创建的权限定义
	return s.GetPermissionDefinitionByID(ctx, definition.ID)
}

// UpdatePermissionDefinition 更新权限定义
func (s *PermissionDefinitionService) UpdatePermissionDefinition(ctx context.Context, id uuid.UUID, req models.PermissionDefinitionRequest, updatedBy uuid.UUID) (*models.PermissionDefinitionResponse, error) {
	// 检查权限定义是否存在
	var definition models.PermissionDefinition
	if err := s.db.WithContext(ctx).Where("id = ?", id).First(&definition).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("权限定义不存在")
		}
		return nil, fmt.Errorf("查询权限定义失败: %w", err)
	}

	// 系统权限不允许修改
	if definition.IsSystem {
		return nil, fmt.Errorf("系统权限不允许修改")
	}

	// 如果修改了权限代码，检查新代码是否已存在
	if req.Code != definition.Code {
		var count int64
		if err := s.db.WithContext(ctx).Model(&models.PermissionDefinition{}).
			Where("code = ? AND id != ?", req.Code, id).Count(&count).Error; err != nil {
			return nil, fmt.Errorf("检查权限代码失败: %w", err)
		}
		if count > 0 {
			return nil, fmt.Errorf("权限代码 '%s' 已存在", req.Code)
		}

		// 验证权限代码格式
		if !isValidPermissionCode(req.Code) {
			return nil, fmt.Errorf("权限代码格式无效，应为 'category.resource.action' 格式")
		}
	}

	// 更新权限定义
	updates := map[string]interface{}{
		"code":        req.Code,
		"name":        req.Name,
		"description": req.Description,
		"category":    req.Category,
		"scope":       req.Scope,
		"updated_at":  time.Now(),
	}

	if err := s.db.WithContext(ctx).Model(&definition).Updates(updates).Error; err != nil {
		return nil, fmt.Errorf("更新权限定义失败: %w", err)
	}

	// 返回更新后的权限定义
	return s.GetPermissionDefinitionByID(ctx, id)
}

// DeletePermissionDefinition 删除权限定义
func (s *PermissionDefinitionService) DeletePermissionDefinition(ctx context.Context, id uuid.UUID) error {
	// 检查权限定义是否存在
	var definition models.PermissionDefinition
	if err := s.db.WithContext(ctx).Where("id = ?", id).First(&definition).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("权限定义不存在")
		}
		return fmt.Errorf("查询权限定义失败: %w", err)
	}

	// 系统权限不允许删除
	if definition.IsSystem {
		return fmt.Errorf("系统权限不允许删除")
	}

	// 检查是否有其他地方在使用这个权限
	if err := s.checkPermissionUsage(ctx, definition.Code); err != nil {
		return err
	}

	// 删除权限定义
	if err := s.db.WithContext(ctx).Delete(&definition).Error; err != nil {
		return fmt.Errorf("删除权限定义失败: %w", err)
	}

	return nil
}

// TogglePermissionDefinition 切换权限定义的激活状态
func (s *PermissionDefinitionService) TogglePermissionDefinition(ctx context.Context, id uuid.UUID) (*models.PermissionDefinitionResponse, error) {
	// 检查权限定义是否存在
	var definition models.PermissionDefinition
	if err := s.db.WithContext(ctx).Where("id = ?", id).First(&definition).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("权限定义不存在")
		}
		return nil, fmt.Errorf("查询权限定义失败: %w", err)
	}

	// 切换激活状态
	newStatus := !definition.IsActive
	if err := s.db.WithContext(ctx).Model(&definition).Updates(map[string]interface{}{
		"is_active":  newStatus,
		"updated_at": time.Now(),
	}).Error; err != nil {
		return nil, fmt.Errorf("更新权限状态失败: %w", err)
	}

	// 返回更新后的权限定义
	return s.GetPermissionDefinitionByID(ctx, id)
}

// GetPermissionCategories 获取权限分类列表
func (s *PermissionDefinitionService) GetPermissionCategories(ctx context.Context) ([]string, error) {
	var categories []string
	if err := s.db.WithContext(ctx).Model(&models.PermissionDefinition{}).
		Distinct("category").
		Where("is_active = ?", true).
		Pluck("category", &categories).Error; err != nil {
		return nil, fmt.Errorf("获取权限分类失败: %w", err)
	}
	return categories, nil
}

// GetPermissionScopes 获取权限作用域列表
func (s *PermissionDefinitionService) GetPermissionScopes(ctx context.Context) ([]string, error) {
	return []string{"system", "safe", "operation"}, nil
}

// checkPermissionUsage 检查权限是否被使用
func (s *PermissionDefinitionService) checkPermissionUsage(ctx context.Context, code string) error {
	// 检查是否在角色权限中被使用
	var rolePermCount int64
	if err := s.db.WithContext(ctx).Table("safe_role_permissions").
		Where("permission_code = ?", code).Count(&rolePermCount).Error; err != nil {
		return fmt.Errorf("检查角色权限使用情况失败: %w", err)
	}
	if rolePermCount > 0 {
		return fmt.Errorf("该权限正在被 %d 个角色使用，无法删除", rolePermCount)
	}

	// 检查是否在用户自定义权限中被使用
	var userPermCount int64
	if err := s.db.WithContext(ctx).Table("user_custom_permissions").
		Where("permission_code = ?", code).Count(&userPermCount).Error; err != nil {
		return fmt.Errorf("检查用户权限使用情况失败: %w", err)
	}
	if userPermCount > 0 {
		return fmt.Errorf("该权限正在被 %d 个用户使用，无法删除", userPermCount)
	}

	return nil
}

// isValidPermissionCode 验证权限代码格式
func isValidPermissionCode(code string) bool {
	// 权限代码应该是 category.resource.action 格式
	// 例如: safe.proposal.create, system.user.manage
	parts := strings.Split(code, ".")
	if len(parts) < 2 || len(parts) > 4 {
		return false
	}

	// 每个部分只能包含小写字母、数字和下划线
	for _, part := range parts {
		if part == "" {
			return false
		}
		for _, char := range part {
			if !((char >= 'a' && char <= 'z') || (char >= '0' && char <= '9') || char == '_') {
				return false
			}
		}
	}

	return true
}
