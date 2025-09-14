package services

import (
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"web3-enterprise-multisig/internal/models"
)

// SafeTransactionService 企业级Safe交易状态管理服务
// 负责Safe创建流程的异步状态管理和业务逻辑处理
type SafeTransactionService struct {
	db *gorm.DB
}

// NewSafeTransactionService 创建Safe交易服务实例
func NewSafeTransactionService(db *gorm.DB) *SafeTransactionService {
	return &SafeTransactionService{
		db: db,
	}
}

// CreateSafeTransaction 创建Safe交易记录
// 当用户提交Safe创建交易到区块链后，立即创建交易记录用于状态跟踪
func (s *SafeTransactionService) CreateSafeTransaction(userID uuid.UUID, req models.CreateSafeTransactionRequest) (*models.SafeTransaction, error) {
	// 验证请求参数
	if err := s.validateCreateRequest(req); err != nil {
		return nil, fmt.Errorf("参数验证失败: %w", err)
	}

	// 检查交易哈希是否已存在（防重复提交）
	var existingTx models.SafeTransaction
	if err := s.db.Where("tx_hash = ?", req.TxHash).First(&existingTx).Error; err == nil {
		return nil, fmt.Errorf("交易哈希已存在: %s", req.TxHash)
	}

	// 创建Safe交易记录
	safeTransaction := &models.SafeTransaction{
		ID:              uuid.New(),
		UserID:          userID,
		TxHash:          req.TxHash,
		Status:          models.StatusSubmitted, // 初始状态为已提交
		SafeName:        req.SafeName,
		SafeDescription: req.SafeDescription,
		Owners:          models.StringArray(req.Owners),
		Threshold:       req.Threshold,
		ChainID:         req.ChainID,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
		RetryCount:      0,
	}

	// 保存到数据库
	if err := s.db.Create(safeTransaction).Error; err != nil {
		return nil, fmt.Errorf("创建Safe交易记录失败: %w", err)
	}

	return safeTransaction, nil
}

// GetSafeTransactionByID 根据ID获取Safe交易记录
func (s *SafeTransactionService) GetSafeTransactionByID(id uuid.UUID) (*models.SafeTransaction, error) {
	var safeTransaction models.SafeTransaction
	if err := s.db.Where("id = ?", id).First(&safeTransaction).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("Safe交易记录不存在")
		}
		return nil, fmt.Errorf("查询Safe交易记录失败: %w", err)
	}
	return &safeTransaction, nil
}

// GetSafeTransactionByTxHash 根据交易哈希获取Safe交易记录
func (s *SafeTransactionService) GetSafeTransactionByTxHash(txHash string) (*models.SafeTransaction, error) {
	var safeTransaction models.SafeTransaction
	if err := s.db.Where("tx_hash = ?", txHash).First(&safeTransaction).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return nil, fmt.Errorf("Safe交易记录不存在")
		}
		return nil, fmt.Errorf("查询Safe交易记录失败: %w", err)
	}
	return &safeTransaction, nil
}

// GetUserSafeTransactions 获取用户的Safe交易历史
func (s *SafeTransactionService) GetUserSafeTransactions(userID uuid.UUID, limit, offset int) ([]*models.SafeTransaction, int64, error) {
	var transactions []*models.SafeTransaction
	var total int64

	// 查询总数
	if err := s.db.Model(&models.SafeTransaction{}).Where("user_id = ?", userID).Count(&total).Error; err != nil {
		return nil, 0, fmt.Errorf("查询交易总数失败: %w", err)
	}

	// 查询分页数据
	if err := s.db.Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(limit).
		Offset(offset).
		Find(&transactions).Error; err != nil {
		return nil, 0, fmt.Errorf("查询用户交易历史失败: %w", err)
	}

	return transactions, total, nil
}

// GetPendingTransactions 获取待处理的交易（用于区块链监听器）
func (s *SafeTransactionService) GetPendingTransactions() ([]*models.SafeTransaction, error) {
	var transactions []*models.SafeTransaction

	// 查询状态为SUBMITTED或PENDING的交易
	if err := s.db.Where("status IN ?", []models.SafeTransactionStatus{
		models.StatusSubmitted,
		models.StatusPending,
	}).Order("created_at ASC").Find(&transactions).Error; err != nil {
		return nil, fmt.Errorf("查询待处理交易失败: %w", err)
	}

	return transactions, nil
}

// UpdateTransactionStatus 更新交易状态
// 由区块链监听器调用，更新交易的确认状态和相关信息
func (s *SafeTransactionService) UpdateTransactionStatus(txHash string, req models.UpdateSafeTransactionRequest) error {
	// 开启事务确保数据一致性
	return s.db.Transaction(func(tx *gorm.DB) error {
		var safeTransaction models.SafeTransaction
		if err := tx.Where("tx_hash = ?", txHash).First(&safeTransaction).Error; err != nil {
			return fmt.Errorf("交易记录不存在: %w", err)
		}

		// 更新状态和相关信息
		updates := map[string]interface{}{
			"status":     req.Status,
			"updated_at": time.Now(),
		}

		// 根据状态更新相应的时间戳
		switch req.Status {
		case models.StatusConfirmed:
			updates["confirmed_at"] = time.Now()
			if req.SafeAddress != nil {
				updates["safe_address"] = *req.SafeAddress
			}
			if req.BlockNumber != nil {
				updates["block_number"] = *req.BlockNumber
			}
			if req.GasUsed != nil {
				updates["gas_used"] = *req.GasUsed
			}
		case models.StatusProcessed:
			updates["processed_at"] = time.Now()
		case models.StatusFailed:
			if req.ErrorMessage != nil {
				updates["error_message"] = *req.ErrorMessage
			}
			// 增加重试次数
			updates["retry_count"] = safeTransaction.RetryCount + 1
		}

		if err := tx.Model(&safeTransaction).Updates(updates).Error; err != nil {
			return fmt.Errorf("更新交易状态失败: %w", err)
		}

		return nil
	})
}

// MarkTransactionAsPending 将交易标记为等待确认状态
func (s *SafeTransactionService) MarkTransactionAsPending(txHash string) error {
	return s.UpdateTransactionStatus(txHash, models.UpdateSafeTransactionRequest{
		Status: models.StatusPending,
	})
}

// ConfirmTransaction 确认交易并设置Safe地址
func (s *SafeTransactionService) ConfirmTransaction(txHash string, safeAddress string, blockNumber int64, gasUsed int64) error {
	return s.UpdateTransactionStatus(txHash, models.UpdateSafeTransactionRequest{
		Status:      models.StatusConfirmed,
		SafeAddress: &safeAddress,
		BlockNumber: &blockNumber,
		GasUsed:     &gasUsed,
	})
}

// MarkTransactionAsProcessed 标记交易为已处理（Safe记录已创建）
func (s *SafeTransactionService) MarkTransactionAsProcessed(txHash string) error {
	return s.UpdateTransactionStatus(txHash, models.UpdateSafeTransactionRequest{
		Status: models.StatusProcessed,
	})
}

// MarkTransactionAsCompleted 标记交易为完全完成
func (s *SafeTransactionService) MarkTransactionAsCompleted(txHash string) error {
	return s.UpdateTransactionStatus(txHash, models.UpdateSafeTransactionRequest{
		Status: models.StatusCompleted,
	})
}

// MarkTransactionAsFailed 标记交易为失败
func (s *SafeTransactionService) MarkTransactionAsFailed(txHash string, errorMessage string) error {
	return s.UpdateTransactionStatus(txHash, models.UpdateSafeTransactionRequest{
		Status:       models.StatusFailed,
		ErrorMessage: &errorMessage,
	})
}

// GetTransactionStats 获取交易统计信息
func (s *SafeTransactionService) GetTransactionStats(userID uuid.UUID) (map[string]int64, error) {
	stats := make(map[string]int64)

	// 统计各状态的交易数量
	statuses := []models.SafeTransactionStatus{
		models.StatusSubmitted,
		models.StatusPending,
		models.StatusConfirmed,
		models.StatusProcessed,
		models.StatusCompleted,
		models.StatusFailed,
	}

	for _, status := range statuses {
		var count int64
		if err := s.db.Model(&models.SafeTransaction{}).
			Where("user_id = ? AND status = ?", userID, status).
			Count(&count).Error; err != nil {
			return nil, fmt.Errorf("统计交易状态失败: %w", err)
		}
		stats[string(status)] = count
	}

	// 计算总数
	var total int64
	if err := s.db.Model(&models.SafeTransaction{}).
		Where("user_id = ?", userID).
		Count(&total).Error; err != nil {
		return nil, fmt.Errorf("统计交易总数失败: %w", err)
	}
	stats["TOTAL"] = total

	return stats, nil
}

// CleanupOldFailedTransactions 清理超过30天的失败交易记录
func (s *SafeTransactionService) CleanupOldFailedTransactions() error {
	thirtyDaysAgo := time.Now().AddDate(0, 0, -30)

	result := s.db.Where("status = ? AND created_at < ?", models.StatusFailed, thirtyDaysAgo).
		Delete(&models.SafeTransaction{})

	if result.Error != nil {
		return fmt.Errorf("清理失败交易记录失败: %w", result.Error)
	}

	return nil
}

// validateCreateRequest 验证创建请求参数
func (s *SafeTransactionService) validateCreateRequest(req models.CreateSafeTransactionRequest) error {
	if len(req.TxHash) != 66 {
		return fmt.Errorf("交易哈希格式错误")
	}
	if req.SafeName == "" {
		return fmt.Errorf("Safe名称不能为空")
	}
	if len(req.Owners) == 0 {
		return fmt.Errorf("所有者列表不能为空")
	}
	if req.Threshold <= 0 || req.Threshold > len(req.Owners) {
		return fmt.Errorf("签名阈值设置错误")
	}
	for _, owner := range req.Owners {
		if len(owner) != 42 {
			return fmt.Errorf("所有者地址格式错误: %s", owner)
		}
	}
	return nil
}
