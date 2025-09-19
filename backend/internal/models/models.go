package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// Policy 策略模型
type Policy struct {
	ID          uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	SafeID      uuid.UUID `json:"safe_id" gorm:"not null"`
	Name        string    `json:"name" gorm:"not null"`
	Description *string   `json:"description"`
	Rules       string    `json:"rules" gorm:"type:jsonb;not null;default:'{}'"`
	IsActive    bool      `json:"is_active" gorm:"default:true"`
	CreatedBy   uuid.UUID `json:"created_by" gorm:"not null"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`

	// 关联关系
	Safe    Safe `json:"safe" gorm:"foreignKey:SafeID"`
	Creator User `json:"creator" gorm:"foreignKey:CreatedBy"`
}

// Proposal 提案模型 - 严格按照005_create_proposals_tables.sql定义
type Proposal struct {
	// 主键和基础信息
	ID        uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	SafeID    uuid.UUID `json:"safe_id" gorm:"not null"`
	CreatedBy uuid.UUID `json:"created_by" gorm:"not null"`

	// 提案基本信息
	Title        string  `json:"title" gorm:"size:255;not null"`
	Description  *string `json:"description" gorm:"type:text"`
	ProposalType string  `json:"proposal_type" gorm:"size:50;not null;check:proposal_type IN ('transfer','contract_call','add_owner','remove_owner','change_threshold')"`

	// 交易参数
	ToAddress *string `json:"to_address" gorm:"size:42"` // 可选，某些操作类型不需要
	Value     string  `json:"value" gorm:"type:decimal(78,0);default:0"`
	Data      *string `json:"data" gorm:"type:text"`

	// 签名管理
	RequiredSignatures int `json:"required_signatures" gorm:"not null"`
	CurrentSignatures  int `json:"current_signatures" gorm:"default:0"`

	// 状态管理
	Status string `json:"status" gorm:"size:20;not null;default:pending;check:status IN ('pending','approved','executed','confirmed','failed','rejected')"`

	// 区块链执行信息
	TxHash      *string `json:"tx_hash" gorm:"size:66"` // 区块链交易哈希
	BlockNumber *int64  `json:"block_number"`           // 执行区块号
	GasUsed     *int64  `json:"gas_used"`               // 消耗的Gas

	// 时间戳
	CreatedAt   time.Time  `json:"created_at" gorm:"default:now()"`
	ApprovedAt  *time.Time `json:"approved_at"`  // 获得足够签名的时间
	ExecutedAt  *time.Time `json:"executed_at"`  // 区块链执行时间
	ConfirmedAt *time.Time `json:"confirmed_at"` // 区块链确认成功时间
	FailedAt    *time.Time `json:"failed_at"`    // 区块链执行失败时间
	UpdatedAt   time.Time  `json:"updated_at" gorm:"default:now()"`

	// 失败信息
	FailureReason *string `json:"failure_reason" gorm:"type:text"` // 失败原因描述

	// 审计字段
	Nonce      *int64  `json:"nonce"`                       // Safe nonce (签名时使用的nonce)
	SafeTxHash *string `json:"safe_tx_hash" gorm:"size:66"` // Safe交易哈希

	// 关联关系
	Safe       Safe        `json:"Safe" gorm:"foreignKey:SafeID"`
	Creator    User        `json:"creator" gorm:"foreignKey:CreatedBy"`
	Signatures []Signature `json:"signatures"`
}

// Signature 签名模型
type Signature struct {
	ID            uuid.UUID `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	ProposalID    uuid.UUID `json:"proposal_id" gorm:"not null"`
	SignerID      uuid.UUID `json:"signer_id" gorm:"not null"`
	SignatureData string    `json:"signature_data" gorm:"not null"`
	SignatureType string    `json:"signature_type" gorm:"default:eth_sign;check:signature_type IN ('eth_sign','eth_signTypedData','contract')"`
	Status        string    `json:"status" gorm:"default:valid;check:status IN ('valid','invalid','revoked')"`
	SignedAt      time.Time `json:"signed_at" gorm:"default:now()"`
	UsedNonce     *int64    `json:"used_nonce"`                  // 签名时使用的nonce值
	SafeTxHash    *string   `json:"safe_tx_hash" gorm:"size:66"` // 签名对应的Safe交易哈希

	// 关联关系
	Proposal Proposal `json:"proposal" gorm:"foreignKey:ProposalID"`
	Signer   User     `json:"signer" gorm:"foreignKey:SignerID"`
}

// 表名定义
func (Policy) TableName() string    { return "policies" }
func (Proposal) TableName() string  { return "proposals" }
func (Signature) TableName() string { return "signatures" }

// BeforeCreate hooks
func (p *Policy) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}

func (p *Proposal) BeforeCreate(tx *gorm.DB) error {
	if p.ID == uuid.Nil {
		p.ID = uuid.New()
	}
	return nil
}

func (s *Signature) BeforeCreate(tx *gorm.DB) error {
	if s.ID == uuid.Nil {
		s.ID = uuid.New()
	}
	return nil
}

// Proposal 业务方法
func (p *Proposal) IsApproved() bool {
	return p.CurrentSignatures >= p.RequiredSignatures
}

func (p *Proposal) CanExecute() bool {
	return p.Status == "approved" && p.IsApproved()
}

// UserCustomPermission 用户自定义权限模型
type UserCustomPermission struct {
	ID             uuid.UUID  `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	SafeID         *uuid.UUID `json:"safe_id" gorm:"index"` // 允许为NULL，表示系统级权限
	UserID         uuid.UUID  `json:"user_id" gorm:"not null"`
	PermissionCode string     `json:"permission_code" gorm:"size:100;not null"`
	Granted        bool       `json:"granted" gorm:"default:true"`
	Restrictions   string     `json:"restrictions" gorm:"type:jsonb;default:'{}'"`
	ExpiresAt      *time.Time `json:"expires_at"`
	GrantedBy      uuid.UUID  `json:"granted_by" gorm:"not null"`
	GrantedReason  *string    `json:"granted_reason"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`

	// 关联关系
	Safe          *Safe `json:"safe,omitempty" gorm:"foreignKey:SafeID"`
	User          User  `json:"user" gorm:"foreignKey:UserID"`
	GrantedByUser User  `json:"granted_by_user" gorm:"foreignKey:GrantedBy"`
}

// IsSystemPermission 检查是否为系统级权限
func (ucp *UserCustomPermission) IsSystemPermission() bool {
	return ucp.SafeID == nil
}

// IsActive 检查权限是否有效
func (ucp *UserCustomPermission) IsActive() bool {
	if !ucp.Granted {
		return false
	}
	if ucp.ExpiresAt != nil && ucp.ExpiresAt.Before(time.Now()) {
		return false
	}
	return true
}
