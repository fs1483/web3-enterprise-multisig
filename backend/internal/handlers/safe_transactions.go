package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"web3-enterprise-multisig/internal/models"
	"web3-enterprise-multisig/internal/services"
)

// SafeTransactionHandler 企业级Safe交易处理器
// 负责处理异步Safe创建流程的API接口
type SafeTransactionHandler struct {
	safeTransactionService *services.SafeTransactionService
}

// NewSafeTransactionHandler 创建Safe交易处理器实例
func NewSafeTransactionHandler(safeTransactionService *services.SafeTransactionService) *SafeTransactionHandler {
	return &SafeTransactionHandler{
		safeTransactionService: safeTransactionService,
	}
}

// CreateSafeTransaction 创建Safe交易记录（异步模式）
// POST /api/v1/safe-transactions
// 前端提交区块链交易后，立即调用此接口创建交易记录用于状态跟踪
func (h *SafeTransactionHandler) CreateSafeTransaction(c *gin.Context) {
	// 获取当前用户ID
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "用户未认证",
			"code":  "UNAUTHORIZED",
		})
		return
	}

	// 解析请求参数
	var req models.CreateSafeTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "请求参数格式错误",
			"code":  "INVALID_REQUEST",
			"details": err.Error(),
		})
		return
	}

	// 创建Safe交易记录
	safeTransaction, err := h.safeTransactionService.CreateSafeTransaction(
		userID.(uuid.UUID),
		req,
	)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
			"code":  "CREATE_TRANSACTION_ERROR",
		})
		return
	}

	// 返回交易记录信息
	c.JSON(http.StatusCreated, gin.H{
		"message":     "Safe创建交易已记录，正在等待区块链确认",
		"transaction": safeTransaction.ToResponse(),
		"status_description": safeTransaction.GetStatusDescription(),
		"progress":    safeTransaction.GetProgress(),
	})
}

// GetSafeTransaction 获取Safe交易详情
// GET /api/v1/safe-transactions/:id
func (h *SafeTransactionHandler) GetSafeTransaction(c *gin.Context) {
	// 解析交易ID
	transactionID := c.Param("id")
	txUUID, err := uuid.Parse(transactionID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "交易ID格式错误",
			"code":  "INVALID_TRANSACTION_ID",
		})
		return
	}

	// 获取交易记录
	safeTransaction, err := h.safeTransactionService.GetSafeTransactionByID(txUUID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": err.Error(),
			"code":  "TRANSACTION_NOT_FOUND",
		})
		return
	}

	// 检查用户权限
	userID, _ := c.Get("userID")
	if safeTransaction.UserID != userID.(uuid.UUID) {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "无权访问此交易记录",
			"code":  "ACCESS_DENIED",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"transaction": safeTransaction.ToResponse(),
		"status_description": safeTransaction.GetStatusDescription(),
		"progress":    safeTransaction.GetProgress(),
	})
}

// GetUserSafeTransactions 获取用户的Safe交易历史
// GET /api/v1/safe-transactions
func (h *SafeTransactionHandler) GetUserSafeTransactions(c *gin.Context) {
	// 获取当前用户ID
	userID, _ := c.Get("userID")

	// 分页参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	// 获取用户交易历史
	transactions, total, err := h.safeTransactionService.GetUserSafeTransactions(
		userID.(uuid.UUID),
		limit,
		offset,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
			"code":  "FETCH_TRANSACTIONS_ERROR",
		})
		return
	}

	// 转换为响应格式
	var transactionResponses []models.SafeTransactionResponse
	for _, tx := range transactions {
		transactionResponses = append(transactionResponses, tx.ToResponse())
	}

	c.JSON(http.StatusOK, gin.H{
		"transactions": transactionResponses,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	})
}

// GetTransactionStats 获取用户的交易统计信息
// GET /api/v1/safe-transactions/stats
func (h *SafeTransactionHandler) GetTransactionStats(c *gin.Context) {
	// 获取当前用户ID
	userID, _ := c.Get("userID")

	// 获取统计信息
	stats, err := h.safeTransactionService.GetTransactionStats(userID.(uuid.UUID))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
			"code":  "FETCH_STATS_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"stats": stats,
	})
}

// UpdateTransactionStatus 更新交易状态（内部API，由区块链监听器调用）
// PUT /api/v1/safe-transactions/:txHash/status
// 注意：此接口应该有特殊的认证机制，只允许内部服务调用
func (h *SafeTransactionHandler) UpdateTransactionStatus(c *gin.Context) {
	// 获取交易哈希
	txHash := c.Param("txHash")
	if len(txHash) != 66 {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "交易哈希格式错误",
			"code":  "INVALID_TX_HASH",
		})
		return
	}

	// 解析请求参数
	var req models.UpdateSafeTransactionRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "请求参数格式错误",
			"code":  "INVALID_REQUEST",
			"details": err.Error(),
		})
		return
	}

	// 更新交易状态
	if err := h.safeTransactionService.UpdateTransactionStatus(txHash, req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
			"code":  "UPDATE_STATUS_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "交易状态更新成功",
	})
}

// GetPendingTransactions 获取待处理的交易（内部API，由区块链监听器调用）
// GET /api/v1/safe-transactions/pending
func (h *SafeTransactionHandler) GetPendingTransactions(c *gin.Context) {
	// 获取待处理交易
	transactions, err := h.safeTransactionService.GetPendingTransactions()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": err.Error(),
			"code":  "FETCH_PENDING_ERROR",
		})
		return
	}

	// 转换为响应格式
	var transactionResponses []models.SafeTransactionResponse
	for _, tx := range transactions {
		transactionResponses = append(transactionResponses, tx.ToResponse())
	}

	c.JSON(http.StatusOK, gin.H{
		"transactions": transactionResponses,
		"count":        len(transactionResponses),
	})
}
