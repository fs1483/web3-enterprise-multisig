package models

import (
	"database/sql/driver"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
)

// SafeTransactionStatus 定义Safe交易状态枚举
type SafeTransactionStatus string

const (
	// StatusSubmitted 交易已提交到区块链
	StatusSubmitted SafeTransactionStatus = "SUBMITTED"
	// StatusPending 等待区块链确认
	StatusPending SafeTransactionStatus = "PENDING"
	// StatusConfirmed 区块链已确认，Safe地址已获取
	StatusConfirmed SafeTransactionStatus = "CONFIRMED"
	// StatusProcessed 数据库已保存Safe信息
	StatusProcessed SafeTransactionStatus = "PROCESSED"
	// StatusCompleted 流程完全完成
	StatusCompleted SafeTransactionStatus = "COMPLETED"
	// StatusFailed 交易失败或处理异常
	StatusFailed SafeTransactionStatus = "FAILED"
)

// SafeTransaction 企业级Safe创建交易状态管理模型
// 用于异步处理Safe创建流程的完整生命周期管理
type SafeTransaction struct {
	// 主键和基础信息
	ID     uuid.UUID `json:"id" db:"id" gorm:"type:uuid;primary_key;default:gen_random_uuid()"`
	UserID uuid.UUID `json:"user_id" db:"user_id" gorm:"type:uuid;not null;index"`

	// 区块链交易信息
	TxHash      string  `json:"tx_hash" db:"tx_hash" gorm:"type:varchar(66);unique;not null;index"` // 以太坊交易哈希
	SafeAddress *string `json:"safe_address,omitempty" db:"safe_address" gorm:"type:varchar(42)"`   // Safe合约地址（确认后填入）
	BlockNumber *int64  `json:"block_number,omitempty" db:"block_number"`                           // 区块号
	GasUsed     *int64  `json:"gas_used,omitempty" db:"gas_used"`                                   // 实际消耗的Gas

	// 业务状态管理
	Status SafeTransactionStatus `json:"status" db:"status" gorm:"type:varchar(20);not null;default:'SUBMITTED';index"`

	// Safe创建参数（用于确认后创建Safe记录）
	SafeName        string         `json:"safe_name" db:"safe_name" gorm:"type:varchar(255);not null"`
	SafeDescription string         `json:"safe_description" db:"safe_description" gorm:"type:text"`
	Owners          StringArray    `json:"owners" db:"owners" gorm:"type:jsonb"`        // 所有者地址数组
	Threshold       int            `json:"threshold" db:"threshold" gorm:"not null"`     // 签名阈值
	ChainID         int            `json:"chain_id" db:"chain_id" gorm:"default:11155111"` // 链ID（默认Sepolia）

	// 时间戳管理
	CreatedAt   time.Time  `json:"created_at" db:"created_at" gorm:"default:CURRENT_TIMESTAMP"`   // 交易提交时间
	ConfirmedAt *time.Time `json:"confirmed_at,omitempty" db:"confirmed_at"`                      // 区块链确认时间
	ProcessedAt *time.Time `json:"processed_at,omitempty" db:"processed_at"`                      // 数据库处理完成时间
	UpdatedAt   time.Time  `json:"updated_at" db:"updated_at" gorm:"default:CURRENT_TIMESTAMP"`   // 最后更新时间

	// 错误处理和重试机制
	RetryCount   int     `json:"retry_count" db:"retry_count" gorm:"default:0"`     // 重试次数
	ErrorMessage *string `json:"error_message,omitempty" db:"error_message"`        // 错误信息

	// 关联关系
	User *User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// TableName 指定数据库表名
func (SafeTransaction) TableName() string {
	return "safe_transactions"
}

// CreateSafeTransactionRequest 创建Safe交易请求结构体
type CreateSafeTransactionRequest struct {
	TxHash          string   `json:"tx_hash" binding:"required,len=66"`                    // 交易哈希必须是66位
	SafeName        string   `json:"safe_name" binding:"required,min=1,max=255"`           // Safe名称
	SafeDescription string   `json:"safe_description" binding:"max=1000"`                  // Safe描述
	Owners          []string `json:"owners" binding:"required,min=1,dive,len=42"`          // 所有者地址数组
	Threshold       int      `json:"threshold" binding:"required,min=1"`                   // 签名阈值
	ChainID         int      `json:"chain_id" binding:"required"`                          // 链ID
}

// UpdateSafeTransactionRequest 更新Safe交易状态请求结构体
type UpdateSafeTransactionRequest struct {
	Status      SafeTransactionStatus `json:"status" binding:"required"`
	SafeAddress *string               `json:"safe_address,omitempty" binding:"omitempty,len=42"`
	BlockNumber *int64                `json:"block_number,omitempty"`
	GasUsed     *int64                `json:"gas_used,omitempty"`
	ErrorMessage *string              `json:"error_message,omitempty"`
}

// SafeTransactionResponse Safe交易响应结构体
type SafeTransactionResponse struct {
	ID              uuid.UUID             `json:"id"`
	TxHash          string                `json:"tx_hash"`
	Status          SafeTransactionStatus `json:"status"`
	SafeName        string                `json:"safe_name"`
	SafeDescription string                `json:"safe_description"`
	SafeAddress     *string               `json:"safe_address,omitempty"`
	Owners          []string              `json:"owners"`
	Threshold       int                   `json:"threshold"`
	ChainID         int                   `json:"chain_id"`
	BlockNumber     *int64                `json:"block_number,omitempty"`
	GasUsed         *int64                `json:"gas_used,omitempty"`
	CreatedAt       time.Time             `json:"created_at"`
	ConfirmedAt     *time.Time            `json:"confirmed_at,omitempty"`
	ProcessedAt     *time.Time            `json:"processed_at,omitempty"`
	RetryCount      int                   `json:"retry_count"`
	ErrorMessage    *string               `json:"error_message,omitempty"`
}

// ToResponse 将SafeTransaction转换为响应格式
func (st *SafeTransaction) ToResponse() SafeTransactionResponse {
	return SafeTransactionResponse{
		ID:              st.ID,
		TxHash:          st.TxHash,
		Status:          st.Status,
		SafeName:        st.SafeName,
		SafeDescription: st.SafeDescription,
		SafeAddress:     st.SafeAddress,
		Owners:          []string(st.Owners),
		Threshold:       st.Threshold,
		ChainID:         st.ChainID,
		BlockNumber:     st.BlockNumber,
		GasUsed:         st.GasUsed,
		CreatedAt:       st.CreatedAt,
		ConfirmedAt:     st.ConfirmedAt,
		ProcessedAt:     st.ProcessedAt,
		RetryCount:      st.RetryCount,
		ErrorMessage:    st.ErrorMessage,
	}
}

// IsCompleted 检查交易是否已完成
func (st *SafeTransaction) IsCompleted() bool {
	return st.Status == StatusCompleted || st.Status == StatusFailed
}

// CanRetry 检查是否可以重试（最大重试3次）
func (st *SafeTransaction) CanRetry() bool {
	return st.Status == StatusFailed && st.RetryCount < 3
}

// GetStatusDescription 获取状态描述
func (st *SafeTransaction) GetStatusDescription() string {
	switch st.Status {
	case StatusSubmitted:
		return "交易已提交到区块链"
	case StatusPending:
		return "等待区块链确认中"
	case StatusConfirmed:
		return "区块链已确认，正在处理"
	case StatusProcessed:
		return "Safe信息已保存"
	case StatusCompleted:
		return "Safe创建完成"
	case StatusFailed:
		return "交易处理失败"
	default:
		return "未知状态"
	}
}

// Validate 验证SafeTransaction数据完整性
func (st *SafeTransaction) Validate() error {
	if st.TxHash == "" {
		return ErrInvalidTxHash
	}
	if st.SafeName == "" {
		return ErrInvalidSafeName
	}
	if len(st.Owners) == 0 {
		return ErrInvalidOwners
	}
	if st.Threshold <= 0 || st.Threshold > len(st.Owners) {
		return ErrInvalidThreshold
	}
	return nil
}

// JSONStringArray 用于处理JSONB字段的字符串数组
type JSONStringArray []string

// Value 实现driver.Valuer接口 - JSON格式
func (s JSONStringArray) Value() (driver.Value, error) {
	if s == nil {
		return nil, nil
	}
	return json.Marshal(s)
}

// Scan 实现sql.Scanner接口 - JSON格式
func (s *JSONStringArray) Scan(value interface{}) error {
	if value == nil {
		*s = nil
		return nil
	}

	switch v := value.(type) {
	case []byte:
		return json.Unmarshal(v, s)
	case string:
		return json.Unmarshal([]byte(v), s)
	default:
		return fmt.Errorf("cannot scan %T into JSONStringArray", value)
	}
}

// PostgreSQLStringArray 用于处理PostgreSQL text[]字段的字符串数组
type PostgreSQLStringArray []string

// Value 实现driver.Valuer接口 - PostgreSQL数组格式
func (s PostgreSQLStringArray) Value() (driver.Value, error) {
	if s == nil {
		return nil, nil
	}
	// PostgreSQL数组格式: {item1,item2,item3}
	return fmt.Sprintf("{%s}", strings.Join(s, ",")), nil
}

// Scan 实现sql.Scanner接口 - PostgreSQL数组格式
func (s *PostgreSQLStringArray) Scan(value interface{}) error {
	if value == nil {
		*s = nil
		return nil
	}

	switch v := value.(type) {
	case []byte:
		str := string(v)
		// 解析PostgreSQL数组格式
		if strings.HasPrefix(str, "{") && strings.HasSuffix(str, "}") {
			// PostgreSQL数组格式: {item1,item2,item3}
			content := str[1 : len(str)-1] // 去掉大括号
			if content == "" {
				*s = []string{}
				return nil
			}
			*s = strings.Split(content, ",")
			return nil
		}
		return fmt.Errorf("invalid PostgreSQL array format: %s", str)
	case string:
		// 解析PostgreSQL数组格式
		if strings.HasPrefix(v, "{") && strings.HasSuffix(v, "}") {
			// PostgreSQL数组格式: {item1,item2,item3}
			content := v[1 : len(v)-1] // 去掉大括号
			if content == "" {
				*s = []string{}
				return nil
			}
			*s = strings.Split(content, ",")
			return nil
		}
		return fmt.Errorf("invalid PostgreSQL array format: %s", v)
	default:
		return fmt.Errorf("cannot scan %T into PostgreSQLStringArray", value)
	}
}

// StringArray 为了向后兼容，保持原有类型名
type StringArray = JSONStringArray

// 自定义错误定义
var (
	ErrInvalidTxHash    = fmt.Errorf("invalid transaction hash")
	ErrInvalidSafeName  = fmt.Errorf("invalid safe name")
	ErrInvalidOwners    = fmt.Errorf("invalid owners list")
	ErrInvalidThreshold = fmt.Errorf("invalid threshold value")
)

// WebSocketMessage WebSocket消息结构体
type WebSocketMessage struct {
	Type string      `json:"type"`
	Data interface{} `json:"data"`
}

// SafeCreationStatusMessage Safe创建状态更新消息
type SafeCreationStatusMessage struct {
	TransactionID uuid.UUID             `json:"transaction_id"`
	TxHash        string                `json:"tx_hash"`
	Status        SafeTransactionStatus `json:"status"`
	StatusDesc    string                `json:"status_description"`
	SafeAddress   *string               `json:"safe_address,omitempty"`
	Progress      int                   `json:"progress"` // 进度百分比 0-100
	Message       string                `json:"message"`
	Timestamp     time.Time             `json:"timestamp"`
}

// GetProgress 根据状态计算进度百分比
func (st *SafeTransaction) GetProgress() int {
	switch st.Status {
	case StatusSubmitted:
		return 20
	case StatusPending:
		return 40
	case StatusConfirmed:
		return 60
	case StatusProcessed:
		return 80
	case StatusCompleted:
		return 100
	case StatusFailed:
		return 0
	default:
		return 0
	}
}
