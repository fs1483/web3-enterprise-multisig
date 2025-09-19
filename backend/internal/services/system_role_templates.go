package services

import (
	"context"
	"fmt"

	"gorm.io/gorm"
)

// SystemRoleTemplateService 系统级角色模板服务
type SystemRoleTemplateService struct {
	db *gorm.DB
}

// NewSystemRoleTemplateService 创建系统级角色模板服务
func NewSystemRoleTemplateService(db *gorm.DB) *SystemRoleTemplateService {
	return &SystemRoleTemplateService{
		db: db,
	}
}

// SystemRoleTemplate 系统级角色模板（用于Safe创建时的初始角色分配）
type SystemRoleTemplate struct {
	ID          string   `json:"id"`
	Name        string   `json:"name"`
	DisplayName string   `json:"display_name"`
	Description string   `json:"description"`
	Category    string   `json:"category"` // 'founder', 'finance', 'technical', 'auditor'
	Permissions []string `json:"permissions"`
	Color       string   `json:"color"`
	IsDefault   bool     `json:"is_default"`
	SortOrder   int      `json:"sort_order"`
}

// GetSystemRoleTemplates 获取系统级角色模板（用于Safe创建）
func (s *SystemRoleTemplateService) GetSystemRoleTemplates(ctx context.Context) ([]SystemRoleTemplate, error) {
	// 系统预定义的角色模板，不依赖数据库
	templates := []SystemRoleTemplate{
		{
			ID:          "founder_ceo",
			Name:        "founder_ceo",
			DisplayName: "👑 创始人/CEO",
			Description: "最高管理权限，可以修改Safe设置和管理所有成员",
			Category:    "founder",
			Color:       "#8B5CF6",
			IsDefault:   true,
			SortOrder:   1,
			Permissions: []string{
				"safe.info.view",
				"safe.member.view",
				"safe.member.add",
				"safe.member.remove",
				"safe.proposal.view",
				"safe.proposal.create",
				"safe.proposal.sign",
				"safe.proposal.execute",
				"safe.policy.view",
				"safe.policy.edit",
				"safe.settings.manage",
			},
		},
		{
			ID:          "finance_director",
			Name:        "finance_director",
			DisplayName: "💰 财务总监",
			Description: "负责财务相关操作，可以创建和签署转账提案",
			Category:    "finance",
			Color:       "#10B981",
			IsDefault:   false,
			SortOrder:   2,
			Permissions: []string{
				"safe.info.view",
				"safe.member.view",
				"safe.proposal.view",
				"safe.proposal.create",
				"safe.proposal.sign",
				"safe.policy.view",
				"finance.transfer.create",
				"finance.transfer.approve",
			},
		},
		{
			ID:          "technical_lead",
			Name:        "technical_lead",
			DisplayName: "🔧 技术负责人",
			Description: "负责技术相关操作，可以创建合约交互提案",
			Category:    "technical",
			Color:       "#3B82F6",
			IsDefault:   false,
			SortOrder:   3,
			Permissions: []string{
				"safe.info.view",
				"safe.member.view",
				"safe.proposal.view",
				"safe.proposal.create",
				"safe.proposal.sign",
				"safe.policy.view",
				"contract.interaction.create",
				"contract.interaction.execute",
			},
		},
		{
			ID:          "auditor",
			Name:        "auditor",
			DisplayName: "📊 审计员",
			Description: "只读权限，可以查看所有信息但不能执行操作",
			Category:    "auditor",
			Color:       "#6B7280",
			IsDefault:   false,
			SortOrder:   4,
			Permissions: []string{
				"safe.info.view",
				"safe.member.view",
				"safe.proposal.view",
				"safe.policy.view",
				"audit.view",
				"transaction.view",
			},
		},
		{
			ID:          "operations_manager",
			Name:        "operations_manager",
			DisplayName: "⚙️ 运营经理",
			Description: "负责日常运营，可以创建和管理常规提案",
			Category:    "operations",
			Color:       "#F59E0B",
			IsDefault:   false,
			SortOrder:   5,
			Permissions: []string{
				"safe.info.view",
				"safe.member.view",
				"safe.proposal.view",
				"safe.proposal.create",
				"safe.proposal.sign",
				"safe.policy.view",
				"operations.manage",
			},
		},
		{
			ID:          "compliance_officer",
			Name:        "compliance_officer",
			DisplayName: "🛡️ 合规官",
			Description: "负责合规审查，具有审批和监督权限",
			Category:    "compliance",
			Color:       "#EF4444",
			IsDefault:   false,
			SortOrder:   6,
			Permissions: []string{
				"safe.info.view",
				"safe.member.view",
				"safe.proposal.view",
				"safe.proposal.approve",
				"safe.policy.view",
				"compliance.review",
				"audit.view",
			},
		},
	}

	return templates, nil
}

// GetDefaultRoleForCreator 获取Safe创建者的默认角色
func (s *SystemRoleTemplateService) GetDefaultRoleForCreator(ctx context.Context) (*SystemRoleTemplate, error) {
	templates, err := s.GetSystemRoleTemplates(ctx)
	if err != nil {
		return nil, err
	}

	for _, template := range templates {
		if template.IsDefault {
			return &template, nil
		}
	}

	// 如果没有找到默认角色，返回第一个
	if len(templates) > 0 {
		return &templates[0], nil
	}

	return nil, fmt.Errorf("no system role templates available")
}

// GetRoleTemplateByID 根据ID获取角色模板
func (s *SystemRoleTemplateService) GetRoleTemplateByID(ctx context.Context, roleID string) (*SystemRoleTemplate, error) {
	templates, err := s.GetSystemRoleTemplates(ctx)
	if err != nil {
		return nil, err
	}

	for _, template := range templates {
		if template.ID == roleID {
			return &template, nil
		}
	}

	return nil, fmt.Errorf("role template not found: %s", roleID)
}
