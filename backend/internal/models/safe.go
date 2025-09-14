package models

import (
    "time"
    "github.com/google/uuid"
    "gorm.io/gorm"
)

type Safe struct {
    ID          uuid.UUID      `json:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
    Name        string         `json:"name" gorm:"not null"`
    Description *string        `json:"description"`
    Address     string         `json:"address" gorm:"uniqueIndex;not null"`
    ChainID     int            `json:"chain_id" gorm:"default:11155111"`
    Threshold   int            `json:"threshold" gorm:"not null;check:threshold > 0"`
    Owners      PostgreSQLStringArray `json:"owners" gorm:"type:text[];not null"`
    SafeVersion *string        `json:"safe_version"`
    Status      string         `json:"status" gorm:"default:active;check:status IN ('active','inactive','frozen')"`
    CreatedBy     uuid.UUID  `json:"created_by" gorm:"not null"`
    TransactionID *uuid.UUID `json:"transaction_id,omitempty" gorm:"type:uuid"` // 关联的交易记录ID
    CreatedAt     time.Time  `json:"created_at"`
    UpdatedAt     time.Time  `json:"updated_at"`

    // 关联关系
    Creator     User            `json:"creator" gorm:"foreignKey:CreatedBy"`
    Transaction *SafeTransaction `json:"transaction,omitempty" gorm:"foreignKey:TransactionID"`
    Policies    []Policy        `json:"policies"`
    Proposals   []Proposal      `json:"proposals"`
}

func (Safe) TableName() string {
    return "safes"
}

func (s *Safe) BeforeCreate(tx *gorm.DB) error {
    if s.ID == uuid.Nil {
        s.ID = uuid.New()
    }
    return nil
}

// GetTotalOwners 获取所有者总数
func (s *Safe) GetTotalOwners() int {
    return len(s.Owners)
}

// IsOwner 检查地址是否为所有者
func (s *Safe) IsOwner(address string) bool {
    for _, owner := range s.Owners {
        if owner == address {
            return true
        }
    }
    return false
}
