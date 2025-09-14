package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type User struct {
	ID            uuid.UUID  `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	Email         string     `json:"email" gorm:"uniqueIndex;not null"`
	PasswordHash  string     `json:"-" gorm:"not null"`
	Username      string     `json:"username" gorm:"uniqueIndex;not null"`
	FullName      *string    `json:"full_name"`
	AvatarURL     *string    `json:"avatar_url"`
	WalletAddress *string    `json:"wallet_address" gorm:"uniqueIndex"` // 新增钱包地址字段
	Role          string     `json:"role" gorm:"default:user;check:role IN ('admin','user','viewer')"`
	IsActive      bool       `json:"is_active" gorm:"default:true"`
	EmailVerified bool       `json:"email_verified" gorm:"default:false"`
	LastLoginAt   *time.Time `json:"last_login_at"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`

	// 关联关系
	CreatedSafes     []Safe      `json:"created_safes" gorm:"foreignKey:CreatedBy"`
	CreatedPolicies  []Policy    `json:"created_policies" gorm:"foreignKey:CreatedBy"`
	CreatedProposals []Proposal  `json:"created_proposals" gorm:"foreignKey:CreatedBy"`
	Signatures       []Signature `json:"signatures" gorm:"foreignKey:SignerID"`
}

func (User) TableName() string {
	return "users"
}

func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == uuid.Nil {
		u.ID = uuid.New()
	}
	return nil
}
