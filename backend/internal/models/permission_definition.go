package models

import (
	"time"
	"github.com/google/uuid"
)

// PermissionDefinition 权限定义模型
type PermissionDefinition struct {
	ID          uuid.UUID  `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Code        string     `json:"code" gorm:"uniqueIndex;not null;size:100"`
	Name        string     `json:"name" gorm:"not null;size:255"`
	Description string     `json:"description" gorm:"type:text"`
	Category    string     `json:"category" gorm:"not null;size:50"`
	Scope       string     `json:"scope" gorm:"not null;size:20;check:scope IN ('system','safe','operation')"`
	IsSystem    bool       `json:"is_system" gorm:"default:false"`
	IsActive    bool       `json:"is_active" gorm:"default:true"`
	CreatedBy   *uuid.UUID `json:"created_by" gorm:"type:uuid"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`

	// 权限映射字段
	MappingType      *string `json:"mapping_type" gorm:"size:20"`       // 'menu', 'button', 'api', 'page', 'feature'
	MappingURL       *string `json:"mapping_url" gorm:"size:500"`       // 对应的URL或API端点
	MappingMethod    *string `json:"mapping_method" gorm:"size:10"`     // HTTP方法
	UIElementID      *string `json:"ui_element_id" gorm:"size:100"`     // 前端元素ID
	ParentPermission *string `json:"parent_permission" gorm:"size:100"` // 父权限
	DisplayOrder     int     `json:"display_order" gorm:"default:0"`    // 显示顺序

	// 关联关系
	Creator *User `json:"creator,omitempty" gorm:"foreignKey:CreatedBy"`
}

func (PermissionDefinition) TableName() string {
	return "permission_definitions"
}

// PermissionDefinitionRequest 创建/更新权限定义的请求结构
type PermissionDefinitionRequest struct {
	Code        string `json:"code" binding:"required,max=100" example:"safe.proposal.create"`
	Name        string `json:"name" binding:"required,max=255" example:"创建提案"`
	Description string `json:"description" example:"创建新的提案"`
	Category    string `json:"category" binding:"required,max=50" example:"proposal"`
	Scope       string `json:"scope" binding:"required,oneof=system safe operation" example:"operation"`
}

// PermissionDefinitionResponse 权限定义响应结构
type PermissionDefinitionResponse struct {
	ID               uuid.UUID `json:"id"`
	Code             string    `json:"code"`
	Name             string    `json:"name"`
	Description      string    `json:"description"`
	Category         string    `json:"category"`
	Scope            string    `json:"scope"`
	IsSystem         bool      `json:"is_system"`
	IsActive         bool      `json:"is_active"`
	// 权限映射字段
	MappingType      *string   `json:"mapping_type,omitempty"`
	MappingURL       *string   `json:"mapping_url,omitempty"`
	MappingMethod    *string   `json:"mapping_method,omitempty"`
	UIElementID      *string   `json:"ui_element_id,omitempty"`
	ParentPermission *string   `json:"parent_permission,omitempty"`
	DisplayOrder     *int      `json:"display_order,omitempty"`
	// 创建者信息
	CreatedBy        string    `json:"created_by,omitempty"`
	CreatorName      string    `json:"creator_name,omitempty"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}

// PermissionDefinitionFilter 权限定义查询过滤器
type PermissionDefinitionFilter struct {
	Category string `form:"category" example:"proposal"`
	Scope    string `form:"scope" example:"operation"`
	IsSystem *bool  `form:"is_system" example:"false"`
	IsActive *bool  `form:"is_active" example:"true"`
	Search   string `form:"search" example:"proposal"`
	Page     int    `form:"page" example:"1"`
	PageSize int    `form:"page_size" example:"20"`
}
