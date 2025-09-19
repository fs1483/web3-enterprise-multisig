package services

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
	"web3-enterprise-multisig/internal/models"
)

// SafeRoleTemplateService Safe角色模板服务
type SafeRoleTemplateService struct {
	db *gorm.DB
	permissionTemplateService *PermissionTemplateService
}

// NewSafeRoleTemplateService 创建Safe角色模板服务实例
func NewSafeRoleTemplateService(db *gorm.DB) *SafeRoleTemplateService {
	return &SafeRoleTemplateService{
		db: db,
		permissionTemplateService: NewPermissionTemplateService(db),
	}
}

// SafeRoleTemplate Safe角色模板关联记录
type SafeRoleTemplate struct {
	ID                  uuid.UUID              `json:"id"`
	SafeID              uuid.UUID              `json:"safe_id"`
	TemplateID          string                 `json:"template_id"`
	TemplateName        string                 `json:"template_name"`
	TemplateDisplayName string                 `json:"template_display_name"`
	TemplateCategory    string                 `json:"template_category"`
	Permissions         models.JSONStringArray `json:"permissions" gorm:"type:jsonb"`
	Restrictions        models.JSONMap         `json:"restrictions,omitempty" gorm:"type:jsonb"`
	IsActive            bool                   `json:"is_active"`
	AppliedBy           uuid.UUID              `json:"applied_by"`
	AppliedAt           time.Time              `json:"applied_at"`
	UpdatedAt           time.Time              `json:"updated_at"`
}

// RoleOption 角色选项（用于成员分配）
type RoleOption struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	DisplayName string   `json:"displayName"`
	Description string   `json:"description"`
	Category    string   `json:"category"`
	Permissions []string `json:"permissions"`
	IsDefault   bool     `json:"isDefault"`
}

// ApplyTemplateToSafesRequest 批量应用模板到Safe的请求
type ApplyTemplateToSafesRequest struct {
	TemplateID string      `json:"template_id" binding:"required"`
	SafeIDs    []uuid.UUID `json:"safe_ids" binding:"required,min=1"`
}

// ApplyTemplateToSafesWithPermissionCheck 批量应用权限模板到多个Safe（带权限验证）
func (s *SafeRoleTemplateService) ApplyTemplateToSafesWithPermissionCheck(ctx context.Context, req ApplyTemplateToSafesRequest, appliedBy uuid.UUID, hasSystemPermission bool) error {
	// 1. 获取权限模板信息
	template, err := s.permissionTemplateService.GetRoleTemplate(req.TemplateID)
	if err != nil {
		return fmt.Errorf("获取权限模板失败: %w", err)
	}

	// 2. 验证Safe是否存在
	var safes []struct {
		ID      uuid.UUID `json:"id"`
		Name    string    `json:"name"`
		Status  string    `json:"status"`
	}
	err = s.db.WithContext(ctx).Table("safes").
		Select("id, name, status").
		Where("id IN ?", req.SafeIDs).
		Find(&safes).Error
	if err != nil {
		return fmt.Errorf("查询Safe信息失败: %w", err)
	}

	if len(safes) != len(req.SafeIDs) {
		return fmt.Errorf("部分Safe不存在")
	}

	// 检查Safe状态
	for _, safe := range safes {
		if safe.Status != "active" {
			return fmt.Errorf("Safe[%s]状态异常，无法应用模板", safe.Name)
		}
	}

	// 3. 权限验证：如果不是系统管理员，需要验证每个Safe的权限
	if !hasSystemPermission {
		err = s.validateUserSafePermissions(ctx, appliedBy, req.SafeIDs)
		if err != nil {
			return fmt.Errorf("权限验证失败: %w", err)
		}
	}

	// 4. 批量应用模板
	return s.applyTemplateToSafesInternal(ctx, *template, safes, appliedBy)
}

// ApplyTemplateToSafes 批量应用权限模板到多个Safe（保持向后兼容）
func (s *SafeRoleTemplateService) ApplyTemplateToSafes(ctx context.Context, req ApplyTemplateToSafesRequest, appliedBy uuid.UUID) error {
	// 默认假设有系统权限（向后兼容）
	return s.ApplyTemplateToSafesWithPermissionCheck(ctx, req, appliedBy, true)
}

// validateUserSafePermissions 验证用户对Safe的权限
func (s *SafeRoleTemplateService) validateUserSafePermissions(ctx context.Context, userID uuid.UUID, safeIDs []uuid.UUID) error {
	// 检查用户在每个Safe中是否有member.manage权限
	for _, safeID := range safeIDs {
		var hasPermission bool
		
		// 方法1: 检查用户是否是Safe的owner
		var ownerCount int64
		err := s.db.WithContext(ctx).Table("safes").
			Where("id = ? AND owners @> ?", safeID, fmt.Sprintf(`["%s"]`, userID.String())).
			Count(&ownerCount).Error
		if err != nil {
			return fmt.Errorf("检查Safe所有者权限失败: %w", err)
		}
		
		if ownerCount > 0 {
			hasPermission = true
		} else {
			// 方法2: 检查用户是否有safe_member_roles中的管理权限
			var roleCount int64
			err = s.db.WithContext(ctx).Table("safe_member_roles smr").
				Joins("JOIN safe_role_permissions srp ON smr.role = srp.role_name AND smr.safe_id = srp.safe_id").
				Where("smr.user_id = ? AND smr.safe_id = ? AND smr.is_active = true", userID, safeID).
				Where("srp.permission_code = 'safe.member.manage' AND srp.is_active = true").
				Count(&roleCount).Error
			if err != nil {
				return fmt.Errorf("检查Safe角色权限失败: %w", err)
			}
			
			if roleCount > 0 {
				hasPermission = true
			}
		}
		
		if !hasPermission {
			return fmt.Errorf("用户对Safe[%s]没有管理权限", safeID.String())
		}
	}
	
	return nil
}

// applyTemplateToSafesInternal 内部方法：实际执行模板应用
func (s *SafeRoleTemplateService) applyTemplateToSafesInternal(ctx context.Context, template RoleTemplate, safes []struct {
	ID      uuid.UUID `json:"id"`
	Name    string    `json:"name"`
	Status  string    `json:"status"`
}, appliedBy uuid.UUID) error {
	// 批量应用模板
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		for _, safe := range safes {
			// 检查是否已经应用过该模板
			var existingCount int64
			err := tx.Table("safe_role_templates").
				Where("safe_id = ? AND template_id = ?", safe.ID, template.ID).
				Count(&existingCount).Error
			if err != nil {
				return fmt.Errorf("检查模板应用状态失败: %w", err)
			}

			if existingCount > 0 {
				// 检查现有记录是否已激活
				var existingRecord struct {
					IsActive bool `json:"is_active"`
				}
				err = tx.Table("safe_role_templates").
					Select("is_active").
					Where("safe_id = ? AND template_id = ?", safe.ID, template.ID).
					First(&existingRecord).Error
				if err != nil {
					return fmt.Errorf("检查Safe[%s]现有模板状态失败: %w", safe.Name, err)
				}
				
				if existingRecord.IsActive {
					// 如果已经是激活状态，跳过不重复应用
					fmt.Printf("Safe[%s]已应用模板[%s]，跳过重复应用\n", safe.Name, template.ID)
					continue
				} else {
					// 如果是非激活状态，重新激活
					err = tx.Table("safe_role_templates").
						Where("safe_id = ? AND template_id = ?", safe.ID, template.ID).
						Updates(map[string]interface{}{
							"is_active":             true,
							"applied_by":            appliedBy,
							"updated_at":            time.Now(),
						}).Error
					if err != nil {
						return fmt.Errorf("重新激活Safe[%s]的模板失败: %w", safe.Name, err)
					}
				}
			} else {
				// 创建新记录
				safeRoleTemplate := map[string]interface{}{
					"id":                    uuid.New(),
					"safe_id":               safe.ID,
					"template_id":           template.ID,
					"template_name":         template.Name,
					"template_display_name": template.DisplayName,
					"template_category":     template.Category,
					"permissions":           models.JSONStringArray(template.Permissions),
					"restrictions":          models.JSONMap(template.Restrictions),
					"is_active":             true,
					"applied_by":            appliedBy,
					"applied_at":            time.Now(),
					"updated_at":            time.Now(),
				}

				err = tx.Table("safe_role_templates").Create(safeRoleTemplate).Error
				if err != nil {
					return fmt.Errorf("为Safe[%s]应用模板失败: %w", safe.Name, err)
				}
			}
		}
		return nil
	})
}

// GetSafeRoleTemplates 获取Safe的角色模板列表
func (s *SafeRoleTemplateService) GetSafeRoleTemplates(ctx context.Context, safeID uuid.UUID) ([]SafeRoleTemplate, error) {
	var templates []SafeRoleTemplate

	err := s.db.WithContext(ctx).Table("safe_role_templates").
		Where("safe_id = ? AND is_active = true", safeID).
		Order("applied_at DESC").
		Find(&templates).Error
	if err != nil {
		return nil, fmt.Errorf("查询Safe角色模板失败: %w", err)
	}

	return templates, nil
}

// RemoveTemplateFromSafe 从Safe中移除角色模板
func (s *SafeRoleTemplateService) RemoveTemplateFromSafe(ctx context.Context, safeID uuid.UUID, templateID string) error {
	// 检查是否有成员正在使用该角色
	var memberCount int64
	err := s.db.WithContext(ctx).Table("safe_members").
		Where("safe_id = ? AND role = ? AND is_active = true", safeID, templateID).
		Count(&memberCount).Error
	if err != nil {
		return fmt.Errorf("检查角色使用情况失败: %w", err)
	}

	if memberCount > 0 {
		return fmt.Errorf("该角色正在被 %d 个成员使用，无法移除", memberCount)
	}

	// 软删除：设置为非激活状态
	err = s.db.WithContext(ctx).Table("safe_role_templates").
		Where("safe_id = ? AND template_id = ?", safeID, templateID).
		Update("is_active", false).Error
	if err != nil {
		return fmt.Errorf("移除角色模板失败: %w", err)
	}

	return nil
}

// GetAvailableRolesForSafe 获取Safe可用的角色列表（用于成员分配）
// 合并来源：1. 应用的权限模板 2. Safe自定义角色
func (s *SafeRoleTemplateService) GetAvailableRolesForSafe(ctx context.Context, safeID uuid.UUID) ([]RoleOption, error) {
	var roles []RoleOption
	roleMap := make(map[string]RoleOption) // 用于去重

	// 调试：先查看数据库中的原始数据
	var debugTemplates []SafeRoleTemplate
	debugErr := s.db.WithContext(ctx).Table("safe_role_templates").
		Where("safe_id = ? AND is_active = true", safeID).
		Find(&debugTemplates).Error
	if debugErr == nil {
		fmt.Printf("🔍 调试信息 - Safe[%s]的原始模板记录数量: %d\n", safeID.String(), len(debugTemplates))
		for i, t := range debugTemplates {
			fmt.Printf("  记录%d: ID=%s, TemplateID=%s, Name=%s, DisplayName=%s\n", 
				i+1, t.ID.String(), t.TemplateID, t.TemplateName, t.TemplateDisplayName)
		}
	}

	// 1. 获取应用到该Safe的权限模板角色（使用子查询去重）
	var templates []SafeRoleTemplate
	err := s.db.WithContext(ctx).Raw(`
		SELECT DISTINCT ON (template_id) 
			id, safe_id, template_id, template_name, template_display_name, 
			template_category, permissions, restrictions, is_active, 
			applied_by, applied_at, updated_at
		FROM safe_role_templates 
		WHERE safe_id = ? AND is_active = true 
		ORDER BY template_id, updated_at DESC
	`, safeID).Find(&templates).Error
	if err != nil {
		return nil, fmt.Errorf("查询Safe角色模板失败: %w", err)
	}

	fmt.Printf("🔍 调试信息 - 去重后的模板记录数量: %d\n", len(templates))
	for i, t := range templates {
		fmt.Printf("  去重后记录%d: TemplateID=%s, Name=%s, DisplayName=%s\n", 
			i+1, t.TemplateID, t.TemplateName, t.TemplateDisplayName)
	}

	// 转换权限模板为角色选项
	for _, template := range templates {
		role := RoleOption{
			ID:          template.TemplateID,
			Name:        template.TemplateName,
			DisplayName: template.TemplateDisplayName,
			Description: fmt.Sprintf("来自%s级权限模板", template.TemplateCategory),
			Category:    "template", // 标识为模板角色
			Permissions: []string(template.Permissions),
			IsDefault:   false,
		}
		// 使用map去重，以template_id为key
		roleMap[template.TemplateID] = role
	}

	// 2. 获取该Safe的自定义角色
	var customRoles []struct {
		RoleID      string                     `json:"role_id"`
		RoleName    string                     `json:"role_name"`
		Description string                     `json:"role_description"`
		Permissions models.JSONStringArray     `json:"permissions" gorm:"type:jsonb"`
	}
	
	err = s.db.WithContext(ctx).Table("safe_custom_roles").
		Select("role_id, role_name, role_description, permissions").
		Where("safe_id = ? AND is_active = true", safeID).
		Find(&customRoles).Error
	if err != nil {
		// 如果表不存在或查询失败，记录日志但不返回错误
		fmt.Printf("查询Safe自定义角色失败（可能表未创建）: %v\n", err)
	} else {
		// 转换自定义角色为角色选项
		for _, customRole := range customRoles {
			role := RoleOption{
				ID:          customRole.RoleID,
				Name:        customRole.RoleID,
				DisplayName: customRole.RoleName,
				Description: customRole.Description,
				Category:    "custom", // 标识为自定义角色
				Permissions: []string(customRole.Permissions),
				IsDefault:   false,
			}
			// 使用map去重，以role_id为key
			roleMap[customRole.RoleID] = role
		}
	}

	// 将map转换为数组
	fmt.Printf("🔍 调试信息 - roleMap中的角色数量: %d\n", len(roleMap))
	for key, role := range roleMap {
		fmt.Printf("  roleMap[%s]: ID=%s, DisplayName=%s\n", key, role.ID, role.DisplayName)
		roles = append(roles, role)
	}
	
	fmt.Printf("🔍 调试信息 - 最终返回的角色数量: %d\n", len(roles))
	for i, role := range roles {
		fmt.Printf("  最终角色%d: ID=%s, DisplayName=%s, Description=%s\n", 
			i+1, role.ID, role.DisplayName, role.Description)
	}

	// 企业级RBAC原则：不提供默认角色，强制使用权限模板
	// 如果Safe没有应用任何权限模板，则不应该有角色可选
	// 这样可以确保：
	// 1. 权限治理的一致性
	// 2. 强制管理员先配置权限模板
	// 3. 避免权限配置的随意性
	
	// 注意：如果需要紧急访问，管理员应该：
	// 1. 创建临时权限模板
	// 2. 应用到该Safe
	// 3. 然后分配成员角色

	return roles, nil
}

// GetAvailableRolesForSafeExcluding 获取Safe可用的角色列表（排除指定角色）
func (s *SafeRoleTemplateService) GetAvailableRolesForSafeExcluding(ctx context.Context, safeID uuid.UUID, excludeRoleID string) ([]RoleOption, error) {
	// 先获取所有可用角色
	allRoles, err := s.GetAvailableRolesForSafe(ctx, safeID)
	if err != nil {
		return nil, err
	}
	
	// 过滤掉指定的角色
	var filteredRoles []RoleOption
	for _, role := range allRoles {
		if role.ID != excludeRoleID {
			filteredRoles = append(filteredRoles, role)
		}
	}
	
	return filteredRoles, nil
}

// GetTemplateUsageStats 获取模板使用统计
func (s *SafeRoleTemplateService) GetTemplateUsageStats(ctx context.Context, templateID string) (map[string]interface{}, error) {
	var stats struct {
		TotalSafes   int64 `json:"total_safes"`
		ActiveSafes  int64 `json:"active_safes"`
		TotalMembers int64 `json:"total_members"`
	}

	// 应用该模板的Safe总数
	err := s.db.WithContext(ctx).Table("safe_role_templates").
		Where("template_id = ?", templateID).
		Count(&stats.TotalSafes).Error
	if err != nil {
		return nil, fmt.Errorf("查询模板使用统计失败: %w", err)
	}

	// 活跃应用该模板的Safe数
	err = s.db.WithContext(ctx).Table("safe_role_templates").
		Where("template_id = ? AND is_active = true", templateID).
		Count(&stats.ActiveSafes).Error
	if err != nil {
		return nil, fmt.Errorf("查询活跃模板使用统计失败: %w", err)
	}

	// 使用该角色的成员总数
	err = s.db.WithContext(ctx).Table("safe_members").
		Where("role = ? AND is_active = true", templateID).
		Count(&stats.TotalMembers).Error
	if err != nil {
		return nil, fmt.Errorf("查询角色成员统计失败: %w", err)
	}

	result := map[string]interface{}{
		"template_id":    templateID,
		"total_safes":    stats.TotalSafes,
		"active_safes":   stats.ActiveSafes,
		"total_members":  stats.TotalMembers,
		"usage_rate":     float64(stats.ActiveSafes) / float64(stats.TotalSafes) * 100,
	}

	return result, nil
}
