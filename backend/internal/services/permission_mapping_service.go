package services

import (
	"web3-enterprise-multisig/internal/database"
	"github.com/google/uuid"
)

// UserPermissionMapping 用户权限映射结构
type UserPermissionMapping struct {
	Code         string `json:"code"`
	MappingType  string `json:"mapping_type"`
	MappingURL   string `json:"mapping_url"`
	UIElementID  string `json:"ui_element_id"`
	DisplayOrder int    `json:"display_order"`
}

// GetUserPermissionMappings 获取用户的权限映射
func GetUserPermissionMappings(userID uuid.UUID) (map[string][]UserPermissionMapping, error) {
	// 查询用户拥有的权限映射
	query := `
		SELECT DISTINCT 
			pd.code,
			COALESCE(pd.mapping_type, '') as mapping_type,
			COALESCE(pd.mapping_url, '') as mapping_url,
			COALESCE(pd.ui_element_id, '') as ui_element_id,
			pd.display_order
		FROM permission_definitions pd
		WHERE pd.mapping_type IS NOT NULL 
		AND pd.is_active = true
		AND (
			-- 超级管理员拥有所有权限
			EXISTS (
				SELECT 1 FROM users u 
				WHERE u.id = ? AND u.role = 'super_admin'
			)
			OR
			-- 系统级自定义权限
			EXISTS (
				SELECT 1 FROM user_custom_permissions ucp
				WHERE ucp.user_id = ? 
				AND ucp.permission_code = pd.code 
				AND ucp.granted = true
				AND ucp.safe_id IS NULL
				AND (ucp.expires_at IS NULL OR ucp.expires_at > NOW())
			)
			OR
			-- Safe级自定义权限
			EXISTS (
				SELECT 1 FROM user_custom_permissions ucp
				WHERE ucp.user_id = ? 
				AND ucp.permission_code = pd.code 
				AND ucp.granted = true
				AND ucp.safe_id IS NOT NULL
				AND (ucp.expires_at IS NULL OR ucp.expires_at > NOW())
			)
		)
		ORDER BY pd.mapping_type, pd.display_order, pd.code
	`
	
	var mappings []UserPermissionMapping
	if err := database.DB.Raw(query, userID, userID, userID).Scan(&mappings).Error; err != nil {
		return nil, err
	}
	
	// 按映射类型分组
	groupedMappings := make(map[string][]UserPermissionMapping)
	for _, mapping := range mappings {
		if mapping.MappingType != "" {
			groupedMappings[mapping.MappingType] = append(groupedMappings[mapping.MappingType], mapping)
		}
	}
	
	return groupedMappings, nil
}

// GetUserMenuPermissions 获取用户菜单权限
func GetUserMenuPermissions(userID uuid.UUID) ([]string, error) {
	mappings, err := GetUserPermissionMappings(userID)
	if err != nil {
		return nil, err
	}
	
	var menuPermissions []string
	if menus, exists := mappings["menu"]; exists {
		for _, menu := range menus {
			menuPermissions = append(menuPermissions, menu.Code)
		}
	}
	
	return menuPermissions, nil
}

// GetUserButtonPermissions 获取用户按钮权限
func GetUserButtonPermissions(userID uuid.UUID) ([]string, error) {
	mappings, err := GetUserPermissionMappings(userID)
	if err != nil {
		return nil, err
	}
	
	var buttonPermissions []string
	if buttons, exists := mappings["button"]; exists {
		for _, button := range buttons {
			buttonPermissions = append(buttonPermissions, button.Code)
		}
	}
	
	return buttonPermissions, nil
}

// GetUserAPIPermissions 获取用户API权限
func GetUserAPIPermissions(userID uuid.UUID) ([]string, error) {
	mappings, err := GetUserPermissionMappings(userID)
	if err != nil {
		return nil, err
	}
	
	var apiPermissions []string
	if apis, exists := mappings["api"]; exists {
		for _, api := range apis {
			apiPermissions = append(apiPermissions, api.Code)
		}
	}
	
	return apiPermissions, nil
}

// CheckUserPermissionByElement 检查用户是否有特定UI元素的权限
func CheckUserPermissionByElement(userID uuid.UUID, elementID string) (bool, error) {
	query := `
		SELECT COUNT(*) > 0
		FROM permission_definitions pd
		WHERE pd.ui_element_id = ?
		AND pd.is_active = true
		AND (
			-- 超级管理员拥有所有权限
			EXISTS (
				SELECT 1 FROM users u 
				WHERE u.id = ? AND u.role = 'super_admin'
			)
			OR
			-- 系统级自定义权限
			EXISTS (
				SELECT 1 FROM user_custom_permissions ucp
				WHERE ucp.user_id = ? 
				AND ucp.permission_code = pd.code 
				AND ucp.granted = true
				AND ucp.safe_id IS NULL
				AND (ucp.expires_at IS NULL OR ucp.expires_at > NOW())
			)
			OR
			-- Safe级自定义权限
			EXISTS (
				SELECT 1 FROM user_custom_permissions ucp
				WHERE ucp.user_id = ? 
				AND ucp.permission_code = pd.code 
				AND ucp.granted = true
				AND ucp.safe_id IS NOT NULL
				AND (ucp.expires_at IS NULL OR ucp.expires_at > NOW())
			)
		)
	`
	
	var hasPermission bool
	if err := database.DB.Raw(query, elementID, userID, userID, userID).Scan(&hasPermission).Error; err != nil {
		return false, err
	}
	
	return hasPermission, nil
}

// CheckUserPermissionByAPI 检查用户是否有特定API的权限
func CheckUserPermissionByAPI(userID uuid.UUID, apiURL, method string) (bool, error) {
	query := `
		SELECT COUNT(*) > 0
		FROM permission_definitions pd
		WHERE pd.mapping_url = ? AND pd.mapping_method = ?
		AND pd.mapping_type = 'api'
		AND pd.is_active = true
		AND (
			-- 超级管理员拥有所有权限
			EXISTS (
				SELECT 1 FROM users u 
				WHERE u.id = ? AND u.role = 'super_admin'
			)
			OR
			-- 系统级自定义权限
			EXISTS (
				SELECT 1 FROM user_custom_permissions ucp
				WHERE ucp.user_id = ? 
				AND ucp.permission_code = pd.code 
				AND ucp.granted = true
				AND ucp.safe_id IS NULL
				AND (ucp.expires_at IS NULL OR ucp.expires_at > NOW())
			)
			OR
			-- Safe级自定义权限
			EXISTS (
				SELECT 1 FROM user_custom_permissions ucp
				WHERE ucp.user_id = ? 
				AND ucp.permission_code = pd.code 
				AND ucp.granted = true
				AND ucp.safe_id IS NOT NULL
				AND (ucp.expires_at IS NULL OR ucp.expires_at > NOW())
			)
		)
	`
	
	var hasPermission bool
	if err := database.DB.Raw(query, apiURL, method, userID, userID, userID).Scan(&hasPermission).Error; err != nil {
		return false, err
	}
	
	return hasPermission, nil
}
