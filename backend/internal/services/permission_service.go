// =====================================================
// 权限管理服务层
// 版本: v2.0
// 功能: 提供企业级多签系统的权限验证和管理服务
// 作者: Cascade AI
// 创建时间: 2025-09-16
// =====================================================

package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"web3-enterprise-multisig/internal/models"
)

// PermissionService 权限管理服务
type PermissionService struct {
	db *gorm.DB
}

// NewPermissionService 创建权限管理服务实例
func NewPermissionService(db *gorm.DB) *PermissionService {
	return &PermissionService{
		db: db,
	}
}

// PermissionRequest 权限验证请求
type PermissionRequest struct {
	UserID         uuid.UUID              `json:"user_id"`
	SafeID         uuid.UUID              `json:"safe_id"`
	PermissionCode string                 `json:"permission_code"`
	Context        map[string]interface{} `json:"context"`
}

// PermissionResult 权限验证结果
type PermissionResult struct {
	UserID         uuid.UUID              `json:"user_id"`
	SafeID         uuid.UUID              `json:"safe_id"`
	PermissionCode string                 `json:"permission_code"`
	Granted        bool                   `json:"granted"`
	Source         string                 `json:"source"`
	Role           string                 `json:"role"`
	Restrictions   map[string]interface{} `json:"restrictions"`
	DenialReason   string                 `json:"denial_reason"`
	Context        map[string]interface{} `json:"context"`
}

// SafeRole Safe角色信息
type SafeRole struct {
	ID             uuid.UUID              `json:"id"`
	SafeID         uuid.UUID              `json:"safe_id"`
	UserID         uuid.UUID              `json:"user_id"`
	UserEmail      string                 `json:"user_email"`      // 用户邮箱
	UserName       string                 `json:"user_name"`       // 用户名
	WalletAddress  string                 `json:"wallet_address"`
	Role           string                 `json:"role"`
	RoleLevel      int                    `json:"role_level"`
	Permissions    map[string]bool        `json:"permissions"`
	Restrictions   map[string]interface{} `json:"restrictions"`
	IsActive       bool                   `json:"is_active"`
	AssignedBy     uuid.UUID              `json:"assigned_by"`
	AssignedAt     time.Time              `json:"assigned_at"`
	ExpiresAt      *time.Time             `json:"expires_at"`
}

// CheckPermission 检查用户权限 - 核心权限验证方法
func (s *PermissionService) CheckPermission(ctx context.Context, req PermissionRequest) (*PermissionResult, error) {
	fmt.Printf("🔍 CheckPermission: 开始权限检查 - 用户ID: %s, SafeID: %s, 权限代码: %s\n", 
		req.UserID, req.SafeID, req.PermissionCode)
	
	result := &PermissionResult{
		UserID:         req.UserID,
		SafeID:         req.SafeID,
		PermissionCode: req.PermissionCode,
		Context:        req.Context,
		Granted:        false,
	}

	// 1. 检查系统级权限
	fmt.Printf("🔍 CheckPermission: 开始检查系统级权限\n")
	if systemGranted, userRole, err := s.checkSystemPermission(ctx, req.UserID, req.PermissionCode); err != nil {
		fmt.Printf("❌ CheckPermission: 系统权限检查失败 - %v\n", err)
		return nil, fmt.Errorf("检查系统权限失败: %w", err)
	} else if systemGranted {
		fmt.Printf("✅ CheckPermission: 系统权限检查通过\n")
		result.Granted = true
		result.Source = "system_permission"
		result.Role = userRole // 使用实际的用户角色
		s.logPermissionCheck(ctx, req, result)
		return result, nil
	}
	fmt.Printf("⚠️ CheckPermission: 系统权限检查未通过，继续检查Safe级权限\n")

	// 2. 检查Safe级角色权限
	userRole, err := s.GetUserSafeRole(ctx, req.UserID, req.SafeID)
	if err != nil {
		return nil, fmt.Errorf("获取用户Safe角色失败: %w", err)
	}

	if userRole != nil {
		hasRolePermission, restrictions, err := s.checkRolePermission(ctx, req.SafeID, userRole.Role, req.PermissionCode)
		if err != nil {
			return nil, fmt.Errorf("检查角色权限失败: %w", err)
		}

		if hasRolePermission {
			if valid, reason := s.validateRestrictions(restrictions, req.Context); valid {
				result.Granted = true
				result.Source = "role_permission"
				result.Role = userRole.Role
				result.Restrictions = restrictions
			} else {
				result.DenialReason = reason
			}
		}
	}

	// 3. 检查用户特殊权限
	customPermission, err := s.getUserCustomPermission(ctx, req.UserID, req.SafeID, req.PermissionCode)
	if err != nil {
		return nil, fmt.Errorf("检查用户自定义权限失败: %w", err)
	}

	if customPermission != nil {
		if customPermission.ExpiresAt == nil || customPermission.ExpiresAt.After(time.Now()) {
			if customPermission.Granted {
				if valid, reason := s.validateRestrictions(customPermission.Restrictions, req.Context); valid {
					result.Granted = true
					result.Source = "custom_permission"
					result.Restrictions = customPermission.Restrictions
				} else {
					result.DenialReason = reason
				}
			} else {
				result.Granted = false
				result.DenialReason = "权限已被明确撤销"
			}
		}
	}

	if !result.Granted && result.DenialReason == "" {
		result.DenialReason = "用户没有执行此操作的权限"
	}

	s.logPermissionCheck(ctx, req, result)
	return result, nil
}

// GetUserSafeRole 获取用户在Safe中的角色
func (s *PermissionService) GetUserSafeRole(ctx context.Context, userID, safeID uuid.UUID) (*SafeRole, error) {
	var roleRecord struct {
		ID             uuid.UUID  `gorm:"column:id"`
		SafeID         uuid.UUID  `gorm:"column:safe_id"`
		UserID         uuid.UUID  `gorm:"column:user_id"`
		WalletAddress  string     `gorm:"column:wallet_address"`
		Role           string     `gorm:"column:role"`
		RoleLevel      int        `gorm:"column:role_level"`
		Permissions    string     `gorm:"column:permissions"`
		Restrictions   string     `gorm:"column:restrictions"`
		IsActive       bool       `gorm:"column:is_active"`
		AssignedBy     uuid.UUID  `gorm:"column:assigned_by"`
		AssignedAt     time.Time  `gorm:"column:assigned_at"`
		ExpiresAt      *time.Time `gorm:"column:expires_at"`
	}

	err := s.db.WithContext(ctx).
		Table("safe_member_roles").
		Where("user_id = ? AND safe_id = ? AND is_active = ?", userID, safeID, true).
		First(&roleRecord).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, fmt.Errorf("查询用户Safe角色失败: %w", err)
	}

	var permissions map[string]bool
	var restrictions map[string]interface{}

	if roleRecord.Permissions != "" {
		json.Unmarshal([]byte(roleRecord.Permissions), &permissions)
	}
	if roleRecord.Restrictions != "" {
		json.Unmarshal([]byte(roleRecord.Restrictions), &restrictions)
	}

	return &SafeRole{
		ID:             roleRecord.ID,
		SafeID:         roleRecord.SafeID,
		UserID:         roleRecord.UserID,
		WalletAddress:  roleRecord.WalletAddress,
		Role:           roleRecord.Role,
		RoleLevel:      roleRecord.RoleLevel,
		Permissions:    permissions,
		Restrictions:   restrictions,
		IsActive:       roleRecord.IsActive,
		AssignedBy:     roleRecord.AssignedBy,
		AssignedAt:     roleRecord.AssignedAt,
		ExpiresAt:      roleRecord.ExpiresAt,
	}, nil
}

// AssignSafeRole 为用户分配Safe角色
func (s *PermissionService) AssignSafeRole(ctx context.Context, safeID, userID, assignedBy uuid.UUID, role string, restrictions map[string]interface{}) error {
	// 验证分配者权限
	canAssign, err := s.CheckPermission(ctx, PermissionRequest{
		UserID:         assignedBy,
		SafeID:         safeID,
		PermissionCode: "safe.member.assign_role",
		Context:        map[string]interface{}{"target_user_id": userID, "target_role": role},
	})
	if err != nil {
		return fmt.Errorf("验证分配者权限失败: %w", err)
	}
	if !canAssign.Granted {
		return errors.New("没有权限分配角色")
	}

	// 获取用户信息
	var user models.User
	if err := s.db.WithContext(ctx).First(&user, userID).Error; err != nil {
		return fmt.Errorf("获取用户信息失败: %w", err)
	}
	if user.WalletAddress == nil || *user.WalletAddress == "" {
		return errors.New("用户必须有钱包地址才能分配Safe角色")
	}

	// 验证角色有效性
	validRoles := []string{"safe_admin", "safe_treasurer", "safe_operator", "safe_viewer"}
	isValidRole := false
	for _, validRole := range validRoles {
		if role == validRole {
			isValidRole = true
			break
		}
	}
	if !isValidRole {
		return fmt.Errorf("无效的角色: %s", role)
	}

	// 序列化限制条件
	restrictionsJSON := "{}"
	if restrictions != nil {
		restrictionsBytes, err := json.Marshal(restrictions)
		if err != nil {
			return fmt.Errorf("序列化限制条件失败: %w", err)
		}
		restrictionsJSON = string(restrictionsBytes)
	}

	roleLevel := s.getRoleLevel(role)

	// 使用事务执行角色分配
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 检查是否已存在角色记录
		var existingCount int64
		if err := tx.Table("safe_member_roles").
			Where("user_id = ? AND safe_id = ?", userID, safeID).
			Count(&existingCount).Error; err != nil {
			return fmt.Errorf("检查现有角色失败: %w", err)
		}

		if existingCount > 0 {
			// 更新现有角色记录
			updateData := map[string]interface{}{
				"role":         role,
				"role_level":   roleLevel,
				"restrictions": restrictionsJSON,
				"assigned_by":  assignedBy,
				"assigned_at":  time.Now(),
				"updated_at":   time.Now(),
				"is_active":    true, // 确保角色是激活状态
			}
			
			if err := tx.Table("safe_member_roles").
				Where("user_id = ? AND safe_id = ?", userID, safeID).
				Updates(updateData).Error; err != nil {
				return fmt.Errorf("更新角色失败: %w", err)
			}
		} else {
			// 创建新角色记录
			roleRecord := map[string]interface{}{
				"id":             uuid.New(),
				"safe_id":        safeID,
				"user_id":        userID,
				"wallet_address": *user.WalletAddress,
				"role":           role,
				"role_level":     roleLevel,
				"permissions":    "{}",
				"restrictions":   restrictionsJSON,
				"is_active":      true,
				"assigned_by":    assignedBy,
				"assigned_at":    time.Now(),
				"created_at":     time.Now(),
				"updated_at":     time.Now(),
			}

			if err := tx.Table("safe_member_roles").Create(roleRecord).Error; err != nil {
				return fmt.Errorf("创建角色失败: %w", err)
			}
		}

		return nil
	})
}

// 私有辅助方法
func (s *PermissionService) checkSystemPermission(ctx context.Context, userID uuid.UUID, permissionCode string) (bool, string, error) {
	fmt.Printf("🔍 checkSystemPermission: 检查用户 %s 的系统权限\n", userID)
	
	var user models.User
	err := s.db.WithContext(ctx).First(&user, userID).Error
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			fmt.Printf("⚠️ checkSystemPermission: 用户不存在\n")
			return false, "", nil
		}
		fmt.Printf("❌ checkSystemPermission: 获取用户信息失败 - %v\n", err)
		return false, "", fmt.Errorf("获取用户信息失败: %w", err)
	}

	fmt.Printf("🔍 checkSystemPermission: 用户角色 = %s, 权限代码 = %s\n", user.Role, permissionCode)

	// 超级管理员拥有所有权限
	if user.Role == "super_admin" {
		fmt.Printf("✅ checkSystemPermission: 超级管理员权限通过\n")
		return true, user.Role, nil
	}
	// 普通管理员只有系统级权限
	if user.Role == "admin" && strings.HasPrefix(permissionCode, "system.") {
		fmt.Printf("✅ checkSystemPermission: 管理员系统权限通过\n")
		return true, user.Role, nil
	}

	fmt.Printf("⚠️ checkSystemPermission: 非系统管理员用户，权限未通过\n")
	// 非系统管理员用户，返回false但不报错，让后续的Safe级权限检查继续
	return false, user.Role, nil
}

func (s *PermissionService) checkRolePermission(ctx context.Context, safeID uuid.UUID, role, permissionCode string) (bool, map[string]interface{}, error) {
	var rolePermission struct {
		Restrictions string `gorm:"column:restrictions"`
	}

	err := s.db.WithContext(ctx).
		Table("safe_role_permissions").
		Select("restrictions").
		Where("safe_id = ? AND role = ? AND permission_code = ? AND is_active = ?", safeID, role, permissionCode, true).
		First(&rolePermission).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return s.getDefaultRolePermission(role, permissionCode), nil, nil
		}
		return false, nil, fmt.Errorf("查询角色权限失败: %w", err)
	}

	var restrictions map[string]interface{}
	if rolePermission.Restrictions != "" {
		json.Unmarshal([]byte(rolePermission.Restrictions), &restrictions)
	}

	return true, restrictions, nil
}

func (s *PermissionService) getUserCustomPermission(ctx context.Context, userID, safeID uuid.UUID, permissionCode string) (*struct {
	Granted      bool                   `json:"granted"`
	Restrictions map[string]interface{} `json:"restrictions"`
	ExpiresAt    *time.Time             `json:"expires_at"`
}, error) {
	var customPerm struct {
		Granted      bool       `gorm:"column:granted"`
		Restrictions string     `gorm:"column:restrictions"`
		ExpiresAt    *time.Time `gorm:"column:expires_at"`
	}

	err := s.db.WithContext(ctx).
		Table("user_custom_permissions").
		Where("user_id = ? AND safe_id = ? AND permission_code = ?", userID, safeID, permissionCode).
		First(&customPerm).Error

	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil
		}
		return nil, fmt.Errorf("查询用户自定义权限失败: %w", err)
	}

	var restrictions map[string]interface{}
	if customPerm.Restrictions != "" {
		json.Unmarshal([]byte(customPerm.Restrictions), &restrictions)
	}

	return &struct {
		Granted      bool                   `json:"granted"`
		Restrictions map[string]interface{} `json:"restrictions"`
		ExpiresAt    *time.Time             `json:"expires_at"`
	}{
		Granted:      customPerm.Granted,
		Restrictions: restrictions,
		ExpiresAt:    customPerm.ExpiresAt,
	}, nil
}

func (s *PermissionService) validateRestrictions(restrictions map[string]interface{}, context map[string]interface{}) (bool, string) {
	// TODO: 实现具体的限制条件验证逻辑
	return true, ""
}

func (s *PermissionService) getDefaultRolePermission(role, permissionCode string) bool {
	// 从权限模板服务获取角色权限（消除重复定义）
	templateService := NewPermissionTemplateService(s.db)
	roleTemplates := templateService.GetSafeRoleTemplates()
	
	// 查找对应的角色模板
	for _, template := range roleTemplates {
		if template.ID == role {
			// 检查权限是否在模板的权限列表中
			for _, perm := range template.Permissions {
				if perm == permissionCode {
					return true
				}
			}
			return false
		}
	}
	
	return false
}

func (s *PermissionService) getRoleLevel(role string) int {
	// 从权限模板服务获取角色级别（消除重复定义）
	templateService := NewPermissionTemplateService(s.db)
	roleTemplates := templateService.GetSafeRoleTemplates()
	
	// 定义角色级别映射（与角色配置中保持一致）
	roleLevels := map[string]int{
		"safe_admin":     1,
		"safe_treasurer": 2,
		"safe_operator":  3,
		"safe_viewer":    4,
		"safe_auditor":   5,
	}
	
	// 查找对应的角色模板
	for _, template := range roleTemplates {
		if template.ID == role {
			if level, exists := roleLevels[role]; exists {
				return level
			}
		}
	}
	
	return 10 // 默认最低级别
}

func (s *PermissionService) logPermissionCheck(ctx context.Context, req PermissionRequest, result *PermissionResult) {
	contextJSON := "{}"
	if req.Context != nil {
		if contextBytes, err := json.Marshal(req.Context); err == nil {
			contextJSON = string(contextBytes)
		}
	}

	logRecord := map[string]interface{}{
		"id":                 uuid.New(),
		"user_id":            req.UserID,
		"action":             "check_permission",
		"resource_type":      "permission",
		"permission_granted": result.Granted,
		"required_permission": req.PermissionCode,
		"user_role":          result.Role,
		"denial_reason":      result.DenialReason,
		"request_context":    contextJSON,
		"created_at":         time.Now(),
	}

	// 只有当SafeID不为空UUID时才设置safe_id字段
	if req.SafeID != uuid.Nil {
		logRecord["safe_id"] = req.SafeID
	}

	go func() {
		s.db.Table("permission_audit_logs").Create(logRecord)
	}()
}

// GetSafeMembers 获取Safe成员列表（包含所有者和已分配角色的成员）
func (s *PermissionService) GetSafeMembers(ctx context.Context, safeID uuid.UUID) ([]SafeRole, error) {
	fmt.Printf("🔍 GetSafeMembers: 开始获取Safe成员列表, SafeID: %s\n", safeID.String())
	var roleRecords []struct {
		ID             uuid.UUID  `gorm:"column:id"`
		SafeID         uuid.UUID  `gorm:"column:safe_id"`
		UserID         uuid.UUID  `gorm:"column:user_id"`
		UserEmail      string     `gorm:"column:user_email"`
		UserName       string     `gorm:"column:user_name"`
		WalletAddress  string     `gorm:"column:wallet_address"`
		Role           string     `gorm:"column:role"`
		RoleLevel      int        `gorm:"column:role_level"`
		Permissions    string     `gorm:"column:permissions"`
		Restrictions   string     `gorm:"column:restrictions"`
		IsActive       bool       `gorm:"column:is_active"`
		AssignedBy     uuid.UUID  `gorm:"column:assigned_by"`
		AssignedAt     time.Time  `gorm:"column:assigned_at"`
		ExpiresAt      *time.Time `gorm:"column:expires_at"`
	}

	err := s.db.WithContext(ctx).
		Table("safe_member_roles smr").
		Select(`smr.id, smr.safe_id, smr.user_id, smr.wallet_address, smr.role, 
				smr.role_level, smr.permissions, smr.restrictions, smr.is_active, 
				smr.assigned_by, smr.assigned_at, smr.expires_at,
				u.email as user_email, u.username as user_name`).
		Joins("LEFT JOIN users u ON smr.user_id = u.id").
		Where("smr.safe_id = ? AND smr.is_active = ?", safeID, true).
		Order("smr.role_level, smr.assigned_at").
		Find(&roleRecords).Error

	if err != nil {
		fmt.Printf("❌ GetSafeMembers: 查询角色记录失败: %v\n", err)
		return nil, fmt.Errorf("获取Safe成员列表失败: %w", err)
	}
	fmt.Printf("✅ GetSafeMembers: 找到 %d 个角色记录\n", len(roleRecords))

	var members []SafeRole
	for _, record := range roleRecords {
		var permissions map[string]bool
		var restrictions map[string]interface{}

		if record.Permissions != "" {
			json.Unmarshal([]byte(record.Permissions), &permissions)
		}
		if record.Restrictions != "" {
			json.Unmarshal([]byte(record.Restrictions), &restrictions)
		}

		members = append(members, SafeRole{
			ID:             record.ID,
			SafeID:         record.SafeID,
			UserID:         record.UserID,
			UserEmail:      record.UserEmail,
			UserName:       record.UserName,
			WalletAddress:  record.WalletAddress,
			Role:           record.Role,
			RoleLevel:      record.RoleLevel,
			Permissions:    permissions,
			Restrictions:   restrictions,
			IsActive:       record.IsActive,
			AssignedBy:     record.AssignedBy,
			AssignedAt:     record.AssignedAt,
			ExpiresAt:      record.ExpiresAt,
		})
	}

	// 获取Safe的区块链所有者信息
	var safe models.Safe
	
	err = s.db.WithContext(ctx).
		Where("id = ?", safeID).
		First(&safe).Error
	
	if err != nil {
		fmt.Printf("❌ GetSafeMembers: 查询Safe信息失败: %v\n", err)
		return nil, fmt.Errorf("获取Safe信息失败: %w", err)
	}
	fmt.Printf("✅ GetSafeMembers: 找到Safe信息, Owners: %v\n", safe.Owners)

	// 创建已存在成员的钱包地址映射，避免重复
	existingWallets := make(map[string]bool)
	for _, member := range members {
		if member.WalletAddress != "" {
			existingWallets[strings.ToLower(member.WalletAddress)] = true
		}
	}

	// 为每个Safe所有者创建成员记录（如果还没有角色分配）
	// 将PostgreSQLStringArray转换为[]string
	ownersSlice := []string(safe.Owners)
	for _, ownerAddress := range ownersSlice {
		if ownerAddress == "" {
			continue
		}
		
		// 检查是否已经存在
		if existingWallets[strings.ToLower(ownerAddress)] {
			continue
		}

		// 查找对应的用户信息
		var user struct {
			ID            uuid.UUID `gorm:"column:id"`
			Email         string    `gorm:"column:email"`
			Username      string    `gorm:"column:username"`
			WalletAddress *string   `gorm:"column:wallet_address"`
		}
		
		// 先尝试精确匹配
		err := s.db.WithContext(ctx).
			Table("users").
			Select("id, email, username, wallet_address").
			Where("wallet_address = ?", ownerAddress).
			First(&user).Error
		
		// 如果精确匹配失败，尝试大小写不敏感匹配
		if err != nil {
			err = s.db.WithContext(ctx).
				Table("users").
				Select("id, email, username, wallet_address").
				Where("LOWER(wallet_address) = LOWER(?)", ownerAddress).
				First(&user).Error
		}
		
		fmt.Printf("🔍 查找用户: 钱包地址=%s, 查询结果: %v\n", ownerAddress, err)
		if err == nil {
			fmt.Printf("✅ 找到用户: ID=%s, Email=%s, Username=%s, WalletAddress=%v\n", 
				user.ID, user.Email, user.Username, user.WalletAddress)
		}

		// 创建Safe所有者成员记录
		ownerMember := SafeRole{
			ID:            uuid.New(),
			SafeID:        safeID,
			WalletAddress: ownerAddress,
			Role:          "safe_owner", // 标识为Safe所有者
			RoleLevel:     0,            // 最高级别
			Permissions:   make(map[string]bool),
			Restrictions:  make(map[string]interface{}),
			IsActive:      true,
			AssignedAt:    time.Now(),
		}

		// 如果找到对应用户，填充用户信息
		if err == nil {
			ownerMember.UserID = user.ID
			ownerMember.UserEmail = user.Email
			ownerMember.UserName = user.Username
			fmt.Printf("✅ 找到对应用户: %s (%s)\n", user.Email, user.Username)
		} else {
			// 如果没有找到对应用户，使用零值UUID，但仍然是有效的Safe所有者
			ownerMember.UserID = uuid.Nil
			ownerMember.UserEmail = ""
			ownerMember.UserName = ""
			fmt.Printf("⚠️ 未找到对应用户，但仍作为Safe所有者: %s\n", ownerAddress)
		}

		members = append(members, ownerMember)
		fmt.Printf("✅ GetSafeMembers: 添加Safe所有者: %s\n", ownerAddress)
	}

	fmt.Printf("🎯 GetSafeMembers: 最终返回 %d 个成员\n", len(members))
	return members, nil
}

// RoleConfiguration 角色配置结构
type RoleConfiguration struct {
	Role        string                 `json:"role"`
	Name        string                 `json:"name"`
	Description string                 `json:"description"`
	Color       string                 `json:"color"`
	RoleLevel   int                    `json:"role_level"`
	Permissions []string               `json:"permissions"`
	IsSystem    bool                   `json:"is_system"`
	CreatedAt   time.Time              `json:"created_at"`
}

// GetSafeRoleConfigurations 获取Safe的角色配置
// 注意：此API只返回该Safe中实际配置的角色实例，不返回预制角色模板
// 预制角色模板应该通过权限模板API获取
func (s *PermissionService) GetSafeRoleConfigurations(ctx context.Context, safeID uuid.UUID) ([]RoleConfiguration, error) {
	// 只查询数据库中该Safe实际配置的角色
	// 不再返回预制角色，预制角色应该在权限模板中管理
	customRoles, err := s.getCustomRoles(ctx, safeID)
	if err != nil {
		return nil, fmt.Errorf("获取角色配置失败: %w", err)
	}

	// 查询该Safe中实际使用的系统角色（有成员分配的角色）
	actualSystemRoles, err := s.getActualSystemRoles(ctx, safeID)
	if err != nil {
		return nil, fmt.Errorf("获取实际系统角色失败: %w", err)
	}

	// 合并自定义角色和实际使用的系统角色
	allRoles := append(customRoles, actualSystemRoles...)

	return allRoles, nil
}

// getActualSystemRoles 获取该Safe中实际使用的系统角色
func (s *PermissionService) getActualSystemRoles(ctx context.Context, safeID uuid.UUID) ([]RoleConfiguration, error) {
	// 查询该Safe中有成员分配的系统角色
	var usedSystemRoles []string
	err := s.db.WithContext(ctx).
		Table("safe_member_roles").
		Select("DISTINCT role").
		Where("safe_id = ? AND is_active = ? AND role IN (?)", 
			safeID, true, []string{"safe_admin", "safe_treasurer", "safe_operator", "safe_viewer"}).
		Pluck("role", &usedSystemRoles).Error
	
	if err != nil {
		return nil, fmt.Errorf("查询实际使用的系统角色失败: %w", err)
	}

	// 如果没有使用任何系统角色，返回空列表
	if len(usedSystemRoles) == 0 {
		return []RoleConfiguration{}, nil
	}

	// 从权限模板服务获取系统角色的详细信息
	templateService := NewPermissionTemplateService(s.db)
	roleTemplates := templateService.GetSafeRoleTemplates()
	
	// 定义角色颜色和级别映射
	roleColors := map[string]string{
		"safe_admin":     "red",
		"safe_treasurer": "blue", 
		"safe_operator":  "green",
		"safe_viewer":    "gray",
	}
	
	roleLevels := map[string]int{
		"safe_admin":     1,
		"safe_treasurer": 2,
		"safe_operator":  3,
		"safe_viewer":    4,
	}

	var actualRoles []RoleConfiguration
	
	// 只返回实际使用的系统角色
	for _, usedRole := range usedSystemRoles {
		for _, template := range roleTemplates {
			if template.ID == usedRole {
				roleConfig := RoleConfiguration{
					Role:        template.ID,
					Name:        template.DisplayName,
					Description: template.Description,
					Color:       roleColors[template.ID],
					RoleLevel:   roleLevels[template.ID],
					Permissions: template.Permissions,
					IsSystem:    true,
					CreatedAt:   time.Now(),
				}
				actualRoles = append(actualRoles, roleConfig)
				break
			}
		}
	}

	return actualRoles, nil
}

// getCustomRoles 获取自定义角色配置
func (s *PermissionService) getCustomRoles(ctx context.Context, safeID uuid.UUID) ([]RoleConfiguration, error) {
	// 查询该Safe的所有自定义角色（不在预设角色列表中的角色）
	systemRoles := []string{"safe_admin", "safe_treasurer", "safe_operator", "safe_viewer"}
	
	var roleRecords []struct {
		Role            string    `json:"role"`
		PermissionCode  string    `json:"permission_code"`
		CreatedAt       time.Time `json:"created_at"`
	}

	query := s.db.WithContext(ctx).
		Table("safe_role_permissions").
		Select("role, permission_code, created_at").
		Where("safe_id = ? AND is_active = ?", safeID, true)

	// 排除系统预设角色
	for _, sysRole := range systemRoles {
		query = query.Where("role != ?", sysRole)
	}

	err := query.Find(&roleRecords).Error
	if err != nil {
		return nil, fmt.Errorf("查询自定义角色失败: %w", err)
	}

	// 按角色分组权限
	roleMap := make(map[string]RoleConfiguration)
	for _, record := range roleRecords {
		if role, exists := roleMap[record.Role]; exists {
			role.Permissions = append(role.Permissions, record.PermissionCode)
			roleMap[record.Role] = role
		} else {
			roleMap[record.Role] = RoleConfiguration{
				Role:        record.Role,
				Name:        s.generateRoleName(record.Role),
				Description: "自定义角色",
				Color:       "purple",
				RoleLevel:   5, // 自定义角色默认级别
				Permissions: []string{record.PermissionCode},
				IsSystem:    false,
				CreatedAt:   record.CreatedAt,
			}
		}
	}

	// 转换为切片
	var customRoles []RoleConfiguration
	for _, role := range roleMap {
		customRoles = append(customRoles, role)
	}

	return customRoles, nil
}

// generateRoleName 生成角色显示名称
func (s *PermissionService) generateRoleName(role string) string {
	// 简单的名称生成逻辑，可以根据需要扩展
	switch {
	case strings.Contains(role, "admin"):
		return "自定义管理员"
	case strings.Contains(role, "manager"):
		return "自定义管理者"
	case strings.Contains(role, "operator"):
		return "自定义操作员"
	case strings.Contains(role, "viewer"):
		return "自定义观察者"
	default:
		return strings.Title(strings.ReplaceAll(role, "_", " "))
	}
}

// getRolePermissions 获取角色的权限列表
func (s *PermissionService) getRolePermissions(ctx context.Context, safeID uuid.UUID, role string) ([]string, error) {
	var permissions []string

	// 根据角色返回预设权限
	switch role {
	case "safe_admin":
		permissions = []string{
			"safe.info.view", "safe.info.manage", "safe.info.delete",
			"safe.proposal.view", "safe.proposal.create", "safe.proposal.edit", "safe.proposal.delete", "safe.proposal.sign", "safe.proposal.execute",
			"safe.proposal.create.transfer", "safe.proposal.create.contract", "safe.proposal.create.governance",
			"safe.member.view", "safe.member.invite", "safe.member.remove", "safe.member.assign_role",
			"safe.policy.view", "safe.policy.create", "safe.policy.edit", "safe.policy.delete", "safe.policy.activate",
		}
	case "safe_treasurer":
		permissions = []string{
			"safe.info.view",
			"safe.proposal.view", "safe.proposal.create", "safe.proposal.sign", "safe.proposal.execute",
			"safe.proposal.create.transfer", "safe.proposal.create.contract",
			"safe.member.view",
			"safe.policy.view",
		}
	case "safe_operator":
		permissions = []string{
			"safe.info.view",
			"safe.proposal.view", "safe.proposal.create", "safe.proposal.sign",
			"safe.proposal.create.transfer",
			"safe.member.view",
			"safe.policy.view",
		}
	case "safe_viewer":
		permissions = []string{
			"safe.info.view",
			"safe.proposal.view",
			"safe.member.view",
			"safe.policy.view",
		}
	default:
		// TODO: 查询数据库获取自定义角色权限
		permissions = []string{}
	}

	return permissions, nil
}

// CreateCustomRoleRequest 创建自定义角色请求
type CreateCustomRoleRequest struct {
	SafeID      uuid.UUID `json:"safe_id"`
	Role        string    `json:"role"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Color       string    `json:"color"`
	RoleLevel   int       `json:"role_level"`
	Permissions []string  `json:"permissions"`
	CreatedBy   uuid.UUID `json:"created_by"`
}

// UpdateRolePermissionsRequest 更新角色权限请求
type UpdateRolePermissionsRequest struct {
	SafeID      uuid.UUID `json:"safe_id"`
	Role        string    `json:"role"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Color       string    `json:"color"`
	RoleLevel   *int      `json:"role_level"`
	Permissions []string  `json:"permissions"`
	UpdatedBy   uuid.UUID `json:"updated_by"`
}

// CreateCustomRole 创建自定义角色
func (s *PermissionService) CreateCustomRole(ctx context.Context, req CreateCustomRoleRequest) error {
	// 检查角色名称是否已存在
	var existingRole struct {
		ID string `json:"id"`
	}
	err := s.db.WithContext(ctx).
		Table("safe_role_permissions").
		Select("id").
		Where("safe_id = ? AND role = ?", req.SafeID, req.Role).
		First(&existingRole).Error
	
	if err == nil {
		return fmt.Errorf("角色 %s 已存在", req.Role)
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return fmt.Errorf("检查角色存在性失败: %w", err)
	}

	// 验证权限代码是否有效
	for _, permCode := range req.Permissions {
		var permDef struct {
			Code string `json:"code"`
		}
		err := s.db.WithContext(ctx).
			Table("permission_definitions").
			Select("code").
			Where("code = ? AND is_system = true", permCode).
			First(&permDef).Error
		
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("权限代码 %s 不存在", permCode)
		}
		if err != nil {
			return fmt.Errorf("验证权限代码失败: %w", err)
		}
	}

	// 开始事务创建自定义角色
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 为每个权限创建角色权限记录
		for _, permCode := range req.Permissions {
			rolePermission := map[string]interface{}{
				"id":              uuid.New(),
				"safe_id":         req.SafeID,
				"role":            req.Role,
				"permission_code": permCode,
				"restrictions":    "{}",
				"is_active":       true,
				"created_by":      req.CreatedBy,
				"created_at":      time.Now(),
				"updated_at":      time.Now(),
			}

			err := tx.Table("safe_role_permissions").Create(rolePermission).Error
			if err != nil {
				return fmt.Errorf("创建角色权限记录失败: %w", err)
			}
		}

		// 创建自定义角色元数据记录（如果需要的话）
		// 这里可以扩展一个custom_roles表来存储角色的元数据
		customRole := map[string]interface{}{
			"id":          uuid.New(),
			"safe_id":     req.SafeID,
			"role":        req.Role,
			"name":        req.Name,
			"description": req.Description,
			"color":       req.Color,
			"role_level":  req.RoleLevel,
			"is_system":   false,
			"created_by":  req.CreatedBy,
			"created_at":  time.Now(),
			"updated_at":  time.Now(),
		}

		// 注意：这里假设有一个custom_roles表，如果没有可以先创建或者存储在其他地方
		// 暂时跳过元数据存储，只创建权限关联
		_ = customRole

		return nil
	})
}

// UpdateRolePermissions 更新角色权限配置
func (s *PermissionService) UpdateRolePermissions(ctx context.Context, req UpdateRolePermissionsRequest) error {
	// 检查角色是否存在
	var existingPerms []struct {
		ID string `json:"id"`
	}
	err := s.db.WithContext(ctx).
		Table("safe_role_permissions").
		Select("id").
		Where("safe_id = ? AND role = ?", req.SafeID, req.Role).
		Find(&existingPerms).Error
	
	if err != nil {
		return fmt.Errorf("查询现有角色权限失败: %w", err)
	}

	if len(existingPerms) == 0 {
		return fmt.Errorf("角色 %s 不存在", req.Role)
	}

	// 验证新的权限代码是否有效
	for _, permCode := range req.Permissions {
		var permDef struct {
			Code string `json:"code"`
		}
		err := s.db.WithContext(ctx).
			Table("permission_definitions").
			Select("code").
			Where("code = ? AND is_system = true", permCode).
			First(&permDef).Error
		
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return fmt.Errorf("权限代码 %s 不存在", permCode)
		}
		if err != nil {
			return fmt.Errorf("验证权限代码失败: %w", err)
		}
	}

	// 开始事务更新角色权限
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 删除现有的角色权限记录
		err := tx.Table("safe_role_permissions").
			Where("safe_id = ? AND role = ?", req.SafeID, req.Role).
			Delete(nil).Error
		if err != nil {
			return fmt.Errorf("删除现有角色权限失败: %w", err)
		}

		// 创建新的角色权限记录
		for _, permCode := range req.Permissions {
			rolePermission := map[string]interface{}{
				"id":              uuid.New(),
				"safe_id":         req.SafeID,
				"role":            req.Role,
				"permission_code": permCode,
				"restrictions":    "{}",
				"is_active":       true,
				"created_by":      req.UpdatedBy,
				"created_at":      time.Now(),
				"updated_at":      time.Now(),
			}

			err := tx.Table("safe_role_permissions").Create(rolePermission).Error
			if err != nil {
				return fmt.Errorf("创建新角色权限记录失败: %w", err)
			}
		}

		return nil
	})
}

// DeleteCustomRole 删除自定义角色
func (s *PermissionService) DeleteCustomRole(ctx context.Context, safeID uuid.UUID, role string, deletedBy uuid.UUID) error {
	// 检查是否有用户正在使用这个角色
	var memberCount int64
	err := s.db.WithContext(ctx).
		Table("safe_member_roles").
		Where("safe_id = ? AND role = ? AND is_active = ?", safeID, role, true).
		Count(&memberCount).Error
	
	if err != nil {
		return fmt.Errorf("检查角色使用情况失败: %w", err)
	}

	if memberCount > 0 {
		return fmt.Errorf("角色 %s 正在被 %d 个成员使用，无法删除", role, memberCount)
	}

	// 开始事务删除角色
	return s.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 删除角色权限记录
		err := tx.Table("safe_role_permissions").
			Where("safe_id = ? AND role = ?", safeID, role).
			Delete(nil).Error
		if err != nil {
			return fmt.Errorf("删除角色权限记录失败: %w", err)
		}

		// 如果有自定义角色元数据表，也需要删除
		// 暂时跳过，因为我们还没有创建custom_roles表

		return nil
	})
}

// RemoveSafeRole 移除用户的Safe角色
func (s *PermissionService) RemoveSafeRole(ctx context.Context, safeID, userID, removedBy uuid.UUID) error {
	// 检查操作权限
	hasPermission, err := s.CheckPermission(ctx, PermissionRequest{
		UserID:         removedBy,
		SafeID:         safeID,
		PermissionCode: "safe.member.manage",
		Context:        map[string]interface{}{},
	})
	if err != nil {
		return fmt.Errorf("权限检查失败: %w", err)
	}

	if !hasPermission.Granted {
		return fmt.Errorf("没有权限移除Safe成员")
	}

	// 移除用户角色
	err = s.db.WithContext(ctx).Table("safe_member_roles").
		Where("safe_id = ? AND user_id = ?", safeID, userID).
		Delete(nil).Error
	if err != nil {
		return fmt.Errorf("移除用户角色失败: %w", err)
	}

	// TODO: 记录审计日志
	// s.logPermissionAction(ctx, safeID, removedBy, "REMOVE_MEMBER", "safe_member", &userID, true, nil, nil, "移除Safe成员", map[string]interface{}{
	//	"target_user_id": userID,
	// })

	return nil
}

// GetPermissionDefinitions 获取权限定义列表
func (s *PermissionService) GetPermissionDefinitions(ctx context.Context, category, scope string) ([]map[string]interface{}, error) {
	query := s.db.WithContext(ctx).Table("permission_definitions")

	if category != "" {
		query = query.Where("category = ?", category)
	}

	if scope != "" {
		query = query.Where("scope = ?", scope)
	}

	var definitions []struct {
		Code        string `json:"code"`
		Name        string `json:"name"`
		Description string `json:"description"`
		Category    string `json:"category"`
		Scope       string `json:"scope"`
		IsActive    bool   `json:"is_active"`
	}

	err := query.Order("category, code").Find(&definitions).Error
	if err != nil {
		return nil, fmt.Errorf("获取权限定义失败: %w", err)
	}

	// 调试日志：检查是否包含 system.menu.settings
	fmt.Printf("🔍 权限定义查询结果 (总数: %d):\n", len(definitions))
	for _, def := range definitions {
		if def.Code == "system.menu.settings" {
			fmt.Printf("✅ 找到 system.menu.settings: %+v\n", def)
		}
	}

	result := make([]map[string]interface{}, len(definitions))
	for i, def := range definitions {
		result[i] = map[string]interface{}{
			"code":        def.Code,
			"name":        def.Name,
			"description": def.Description,
			"category":    def.Category,
			"scope":       def.Scope,
			"is_active":   def.IsActive,
		}
	}

	return result, nil
}

// CreateCustomPermission 创建自定义权限
func (s *PermissionService) CreateCustomPermission(ctx context.Context, createdBy uuid.UUID, code, name, description, category, scope string) error {
	// 检查权限代码是否已存在
	var count int64
	err := s.db.WithContext(ctx).Table("permission_definitions").
		Where("code = ?", code).Count(&count).Error
	if err != nil {
		return fmt.Errorf("检查权限代码失败: %w", err)
	}

	if count > 0 {
		return fmt.Errorf("权限代码已存在: %s", code)
	}

	// 创建权限定义
	err = s.db.WithContext(ctx).Exec(`
		INSERT INTO permission_definitions (code, name, description, category, scope, is_system, is_active, created_by)
		VALUES (?, ?, ?, ?, ?, false, true, ?)
	`, code, name, description, category, scope, createdBy).Error

	if err != nil {
		return fmt.Errorf("创建自定义权限失败: %w", err)
	}

	return nil
}

// InitializeSystemAdminPermissions 初始化系统管理员权限
func (s *PermissionService) InitializeSystemAdminPermissions(userID string) error {
	// 系统管理员暂时不需要特殊初始化，因为系统级权限通过用户角色验证
	// 这里可以添加特定的系统管理员权限配置
	return nil
}

// InitializeBasicUserPermissions 初始化基础用户权限
func (s *PermissionService) InitializeBasicUserPermissions(userID string) error {
	// 普通用户暂时不需要特殊初始化
	// 用户权限主要通过Safe成员角色来管理
	// 这里可以添加用户级别的默认权限配置
	return nil
}
