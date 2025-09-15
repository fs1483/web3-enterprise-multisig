package blockchain

import (
	"context"
	"fmt"
	"log"
	"sync"
	"time"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"web3-enterprise-multisig/internal/models"
	"web3-enterprise-multisig/internal/services"
	"web3-enterprise-multisig/internal/websocket"
)

// PendingProposal 待监控的提案执行
type PendingProposal struct {
	ProposalID  uuid.UUID `json:"proposal_id"`
	TxHash      string    `json:"tx_hash"`
	SafeAddress string    `json:"safe_address"`
	SubmitTime  time.Time `json:"submit_time"`
	RetryCount  int       `json:"retry_count"`
}

// SafeCreationMonitor 企业级Safe创建监听器
// 负责监听区块链上的Safe创建事件，并更新数据库状态
// 同时监控提案执行状态
type SafeCreationMonitor struct {
	// 区块链客户端连接
	ethClient *ethclient.Client
	wsClient  *ethclient.Client // WebSocket连接用于实时事件监听

	// 数据库和服务
	db                     *gorm.DB
	safeTransactionService *services.SafeTransactionService
	wsHub                  *websocket.Hub

	// 配置参数
	config MonitorConfig

	// 控制通道
	ctx    context.Context
	cancel context.CancelFunc

	// 提案执行监控
	pendingProposals map[string]*PendingProposal // key: txHash
	proposalMutex    sync.RWMutex                // 并发安全锁
}

// MonitorConfig 监听器配置
type MonitorConfig struct {
	// 区块链网络配置
	ChainID int64  `json:"chain_id"`
	RPCUrl  string `json:"rpc_url"`
	WSUrl   string `json:"ws_url"`

	// Safe合约地址
	SafeFactoryAddress   string `json:"safe_factory_address"`
	SafeSingletonAddress string `json:"safe_singleton_address"`

	// 监听配置
	PollInterval       time.Duration `json:"poll_interval"`       // 轮询间隔（备用机制）
	ConfirmationBlocks int64         `json:"confirmation_blocks"` // 确认区块数
	MaxRetries         int           `json:"max_retries"`         // 最大重试次数
	BatchSize          int           `json:"batch_size"`          // 批处理大小
}

// NewSafeCreationMonitor 创建Safe创建监听器实例
func NewSafeCreationMonitor(
	rpcUrl, wsUrl string,
	db *gorm.DB,
	safeTransactionService *services.SafeTransactionService,
	wsHub *websocket.Hub,
	config MonitorConfig,
) (*SafeCreationMonitor, error) {
	// 创建HTTP客户端（用于查询）
	ethClient, err := ethclient.Dial(rpcUrl)
	if err != nil {
		return nil, fmt.Errorf("连接以太坊RPC节点失败: %w", err)
	}

	// 创建WebSocket客户端（用于实时事件监听）
	wsClient, err := ethclient.Dial(wsUrl)
	if err != nil {
		return nil, fmt.Errorf("连接以太坊WebSocket节点失败: %w", err)
	}

	// 验证网络连接
	chainID, err := ethClient.ChainID(context.Background())
	if err != nil {
		return nil, fmt.Errorf("获取链ID失败: %w", err)
	}

	if chainID.Int64() != config.ChainID {
		return nil, fmt.Errorf("链ID不匹配: 期望 %d, 实际 %d", config.ChainID, chainID.Int64())
	}

	ctx, cancel := context.WithCancel(context.Background())

	return &SafeCreationMonitor{
		ethClient:              ethClient,
		wsClient:               wsClient,
		db:                     db,
		safeTransactionService: safeTransactionService,
		wsHub:                  wsHub,
		config:                 config,
		ctx:                    ctx,
		cancel:                 cancel,
		pendingProposals:       make(map[string]*PendingProposal),
	}, nil
}

// Start 启动监听服务
// 同时启动事件监听和轮询备份机制，确保不遗漏任何交易
func (m *SafeCreationMonitor) Start() error {
	log.Println("🚀 启动企业级Safe创建监听服务...")

	// 启动实时事件监听（主要机制）
	go m.startEventListener()

	// 启动Safe记录创建器
	go m.startTransactionUpdater()

	// 启动轮询检查（备用机制，防止事件遗漏）
	go m.startPollingChecker()

	// 恢复历史待监控的提案
	go m.recoverPendingProposals()

	// 启动提案执行监控
	go m.startProposalExecutionMonitor()

	log.Printf("✅ Safe创建监听服务已启动 (链ID: %d)", m.config.ChainID)
	log.Printf("✅ 提案执行监控服务已启动")
	return nil
}

// Stop 停止监听服务
func (m *SafeCreationMonitor) Stop() {
	log.Println("🛑 停止Safe创建监听服务...")
	m.cancel()

	if m.ethClient != nil {
		m.ethClient.Close()
	}
	if m.wsClient != nil {
		m.wsClient.Close()
	}

	log.Println("✅ Safe创建监听服务已停止")
}

// startEventListener 启动实时事件监听
// 监听Safe Factory合约的ProxyCreation事件
func (m *SafeCreationMonitor) startEventListener() {
	log.Println("🎧 启动Safe创建事件监听器...")

	// Safe Factory合约地址
	factoryAddress := common.HexToAddress(m.config.SafeFactoryAddress)

	// 创建事件过滤器 - 修复配置
	query := ethereum.FilterQuery{
		Addresses: []common.Address{factoryAddress},
		Topics: [][]common.Hash{
			{common.HexToHash("0x4f51faf6c4561ff95f067657e43439f0f856d97c04d9ec9070a6199ad418e235")}, // ProxyCreation事件签名
		},
		// 不设置FromBlock和ToBlock，监听最新事件
	}

	log.Printf("🔍 WebSocket事件过滤器配置:")
	log.Printf("🔍 - Factory地址: %s", factoryAddress.Hex())
	log.Printf("🔍 - 事件签名: 0x4f51faf6c4561ff95f067657e43439f0f856d97c04d9ec9070a6199ad418e235")
	log.Printf("🔍 - Topics配置: %d个过滤条件", len(query.Topics))

	// 订阅事件日志
	logs := make(chan types.Log)
	sub, err := m.wsClient.SubscribeFilterLogs(m.ctx, query, logs)
	if err != nil {
		log.Printf("❌ 订阅Safe创建事件失败: %v", err)
		return
	}
	defer sub.Unsubscribe()

	log.Println("✅ Safe创建事件监听器已启动")

	for {
		select {
		case err := <-sub.Err():
			log.Printf("❌ 事件订阅错误: %v", err)
			// 重新连接逻辑
			time.Sleep(5 * time.Second)
			return // 退出当前goroutine，让外部重启

		case vLog := <-logs:
			log.Printf("📡 收到Safe创建事件: TxHash=%s, BlockNumber=%d", vLog.TxHash.Hex(), vLog.BlockNumber)

			// 处理Safe创建事件
			if err := m.handleSafeCreationEvent(vLog); err != nil {
				log.Printf("❌ 处理Safe创建事件失败: %v", err)
			}

		case <-m.ctx.Done():
			log.Println("🛑 事件监听器收到停止信号")
			return
		}
	}
}

// startPollingChecker 启动轮询检查器（备用机制）
// 定期检查待处理的交易状态，防止事件监听遗漏
func (m *SafeCreationMonitor) startPollingChecker() {
	log.Printf("⏰ 启动交易轮询检查器 (间隔: %v)", m.config.PollInterval)

	ticker := time.NewTicker(m.config.PollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			if err := m.checkPendingTransactions(); err != nil {
				log.Printf("❌ 轮询检查失败: %v", err)
			}

		case <-m.ctx.Done():
			log.Println("🛑 轮询检查器收到停止信号")
			return
		}
	}
}

// startTransactionUpdater 启动Safe记录创建器
// 专门处理已确认的交易，创建Safe记录
func (m *SafeCreationMonitor) startTransactionUpdater() {
	log.Println("🔄 启动Safe记录创建器...")

	ticker := time.NewTicker(15 * time.Second) // 每15秒检查一次
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			if err := m.processConfirmedTransactions(); err != nil {
				log.Printf("❌ 创建Safe记录失败: %v", err)
			}

		case <-m.ctx.Done():
			log.Println("🛑 Safe记录创建器收到停止信号")
			return
		}
	}
}

// handleSafeCreationEvent 处理Safe创建事件
func (m *SafeCreationMonitor) handleSafeCreationEvent(vLog types.Log) error {
	// 检查Topics数组长度，ProxyCreation事件只需要1个Topic（事件签名）
	if len(vLog.Topics) < 1 {
		log.Printf("⚠️ 事件日志Topics长度不足: %d, 跳过处理", len(vLog.Topics))
		return nil
	}

	// ========== 详细打印WebSocket事件数据结构 ==========
	log.Printf("🔍 [WebSocket] 事件详细信息:")
	log.Printf("🔍 [WebSocket] - Address: %s", vLog.Address.Hex())
	log.Printf("🔍 [WebSocket] - Topics数量: %d", len(vLog.Topics))
	for i, topic := range vLog.Topics {
		log.Printf("🔍 [WebSocket] - Topic[%d]: %s", i, topic.Hex())
	}
	log.Printf("🔍 [WebSocket] - Data: %s (长度: %d)", common.Bytes2Hex(vLog.Data), len(vLog.Data))
	log.Printf("🔍 [WebSocket] - BlockNumber: %d", vLog.BlockNumber)
	log.Printf("🔍 [WebSocket] - TxHash: %s", vLog.TxHash.Hex())
	log.Printf("🔍 [WebSocket] - TxIndex: %d", vLog.TxIndex)
	log.Printf("🔍 [WebSocket] - BlockHash: %s", vLog.BlockHash.Hex())
	log.Printf("🔍 [WebSocket] - Index: %d", vLog.Index)
	log.Printf("🔍 [WebSocket] - Removed: %t", vLog.Removed)
	log.Printf("🔍 [WebSocket] ========================================")
	// ========== 详细打印结束 ==========

	// 解析事件数据获取Safe地址 - 修复为从Data字段提取
	var safeAddress common.Address
	if len(vLog.Data) >= 32 {
		// ProxyCreation事件的Data结构：
		// 前32字节：Safe地址（带前导零填充）
		// 后32字节：Singleton地址（带前导零填充）
		safeAddressBytes := vLog.Data[12:32] // 跳过前12个零字节，取20字节地址
		safeAddress = common.BytesToAddress(safeAddressBytes)
		log.Printf("🔍 [WebSocket] 从Data字段提取Safe地址: %s", safeAddress.Hex())
	} else {
		log.Printf("❌ [WebSocket] Data长度不足，无法提取Safe地址: %d", len(vLog.Data))
		return fmt.Errorf("Data长度不足: %d", len(vLog.Data))
	}

	txHash := vLog.TxHash.Hex()
	log.Printf("🔍 WebSocket处理Safe创建事件: Safe地址=%s, 交易哈希=%s", safeAddress.Hex(), txHash)

	// 检查数据库中是否存在此交易记录
	existingTx, err := m.safeTransactionService.GetSafeTransactionByTxHash(txHash)
	if err != nil {
		log.Printf("⚠️ 数据库中未找到交易记录: %s, 跳过WebSocket处理", txHash)
		return nil // 不是错误，可能是其他用户的交易
	}

	// 检查交易是否已经被处理过
	if existingTx.Status != models.StatusSubmitted && existingTx.Status != models.StatusPending {
		log.Printf("⚠️ 交易已被处理，跳过WebSocket处理: %s, 状态=%s", txHash, existingTx.Status)
		return nil
	}

	log.Printf("✅ 开始WebSocket处理交易: %s", txHash)

	// 获取交易详情（用于日志记录，失败不影响主流程）
	_, _, err = m.ethClient.TransactionByHash(context.Background(), vLog.TxHash)
	if err != nil {
		log.Printf("⚠️ 获取交易详情失败: %v, 继续处理", err)
	}

	// 获取交易收据
	receipt, err := m.ethClient.TransactionReceipt(context.Background(), vLog.TxHash)
	if err != nil {
		log.Printf("❌ WebSocket获取交易收据失败: %v", err)
		return fmt.Errorf("获取交易收据失败: %w", err)
	}

	log.Printf("📄 WebSocket获取交易收据成功: BlockNumber=%d, GasUsed=%d",
		vLog.BlockNumber, receipt.GasUsed)

	// 更新数据库中的交易状态
	err = m.safeTransactionService.ConfirmTransaction(
		txHash,
		safeAddress.Hex(),
		int64(vLog.BlockNumber),
		int64(receipt.GasUsed),
	)
	if err != nil {
		log.Printf("❌ WebSocket更新交易状态失败: %s, 错误: %v", txHash, err)
		return fmt.Errorf("更新交易状态失败: %w", err)
	}

	log.Printf("✅ WebSocket处理完成: %s -> CONFIRMED, Safe地址: %s", txHash, safeAddress.Hex())
	return nil
}

// checkPendingTransactions 检查待处理的交易
func (m *SafeCreationMonitor) checkPendingTransactions() error {
	// 获取所有待处理的交易
	pendingTxs, err := m.safeTransactionService.GetPendingTransactions()
	if err != nil {
		return fmt.Errorf("获取待处理交易失败: %w", err)
	}

	if len(pendingTxs) == 0 {
		return nil
	}

	log.Printf("🔍 检查 %d 个待处理交易", len(pendingTxs))

	for _, tx := range pendingTxs {
		if err := m.checkTransactionStatus(tx); err != nil {
			log.Printf("❌ 检查交易状态失败 (TxHash: %s): %v", tx.TxHash, err)
		}
	}

	return nil
}

// checkTransactionStatus 检查单个交易的状态
func (m *SafeCreationMonitor) checkTransactionStatus(tx *models.SafeTransaction) error {
	// 检查交易状态，避免重复处理
	if tx.Status != models.StatusSubmitted && tx.Status != models.StatusPending {
		log.Printf("⚠️ 交易已被处理，跳过轮询检查: %s, 状态=%s", tx.TxHash, tx.Status)
		return nil
	}

	log.Printf("🔍 轮询检查交易状态: %s", tx.TxHash)

	txHash := common.HexToHash(tx.TxHash)

	// 获取交易收据
	receipt, err := m.ethClient.TransactionReceipt(context.Background(), txHash)
	if err != nil {
		if err.Error() == "not found" {
			log.Printf("⏳ 轮询: 交易尚未被挖矿: %s", tx.TxHash)
			return nil // 交易还未被挖矿，不是错误
		}
		log.Printf("❌ 轮询获取交易收据失败: %s, 错误: %v", tx.TxHash, err)
		return fmt.Errorf("获取交易收据失败: %w", err)
	}

	log.Printf("📄 轮询获取交易收据成功: TxHash=%s, BlockNumber=%d, Status=%d",
		tx.TxHash, receipt.BlockNumber.Uint64(), receipt.Status)

	// ========== 详细打印交易收据结构 ==========
	log.Printf("🔍 [轮询] 交易收据详细信息:")
	log.Printf("🔍 [轮询] - TxHash: %s", receipt.TxHash.Hex())
	log.Printf("🔍 [轮询] - BlockHash: %s", receipt.BlockHash.Hex())
	log.Printf("🔍 [轮询] - BlockNumber: %d", receipt.BlockNumber.Uint64())
	log.Printf("🔍 [轮询] - TransactionIndex: %d", receipt.TransactionIndex)
	log.Printf("🔍 [轮询] - ContractAddress: %s", receipt.ContractAddress.Hex())
	log.Printf("🔍 [轮询] - GasUsed: %d", receipt.GasUsed)
	log.Printf("🔍 [轮询] - Status: %d", receipt.Status)
	log.Printf("🔍 [轮询] - Logs数量: %d", len(receipt.Logs))

	// 打印所有事件日志
	for i, eventLog := range receipt.Logs {
		log.Printf("🔍 [轮询] - Log[%d] Address: %s", i, eventLog.Address.Hex())
		log.Printf("🔍 [轮询] - Log[%d] Topics数量: %d", i, len(eventLog.Topics))
		for j, topic := range eventLog.Topics {
			log.Printf("🔍 [轮询] - Log[%d] Topic[%d]: %s", i, j, topic.Hex())
		}
		log.Printf("🔍 [轮询] - Log[%d] Data: %s (长度: %d)", i, common.Bytes2Hex(eventLog.Data), len(eventLog.Data))
		log.Printf("🔍 [轮询] - Log[%d] BlockNumber: %d", i, eventLog.BlockNumber)
		log.Printf("🔍 [轮询] - Log[%d] TxHash: %s", i, eventLog.TxHash.Hex())
		log.Printf("🔍 [轮询] - Log[%d] TxIndex: %d", i, eventLog.TxIndex)
		log.Printf("🔍 [轮询] - Log[%d] BlockHash: %s", i, eventLog.BlockHash.Hex())
		log.Printf("🔍 [轮询] - Log[%d] Index: %d", i, eventLog.Index)
		log.Printf("🔍 [轮询] - Log[%d] Removed: %t", i, eventLog.Removed)
		log.Printf("🔍 [轮询] ----------------------------------------")
	}
	// ========== 详细打印结束 ==========

	// 检查交易是否成功
	if receipt.Status == 0 {
		log.Printf("❌ 轮询: 交易执行失败: %s", tx.TxHash)
		return m.safeTransactionService.MarkTransactionAsFailed(tx.TxHash, "交易执行失败")
	}

	// 提取Safe地址
	safeAddress, err := m.extractSafeAddressFromReceipt(receipt)
	if err != nil {
		log.Printf("❌ 轮询提取Safe地址失败: %s, 错误: %v", tx.TxHash, err)
		return fmt.Errorf("提取Safe地址失败: %w", err)
	}

	log.Printf("✅ 轮询提取Safe地址成功: %s -> %s", tx.TxHash, safeAddress)

	// 更新交易状态为已确认
	err = m.safeTransactionService.ConfirmTransaction(
		tx.TxHash,
		safeAddress,
		receipt.BlockNumber.Int64(),
		int64(receipt.GasUsed),
	)
	if err != nil {
		log.Printf("❌ 轮询更新交易状态失败: %s, 错误: %v", tx.TxHash, err)
		return fmt.Errorf("更新交易状态失败: %w", err)
	}

	log.Printf("✅ 轮询处理完成: %s -> CONFIRMED, Safe地址: %s", tx.TxHash, safeAddress)
	return nil
}

// extractSafeAddressFromReceipt 从交易收据中提取Safe地址
func (m *SafeCreationMonitor) extractSafeAddressFromReceipt(receipt *types.Receipt) (string, error) {
	// ProxyCreation事件签名
	proxyCreationTopic := common.HexToHash("0x4f51faf6c4561ff95f067657e43439f0f856d97c04d9ec9070a6199ad418e235")
	// Safe Factory合约地址
	factoryAddress := common.HexToAddress(m.config.SafeFactoryAddress)

	log.Printf("🔍 开始提取Safe地址，交易哈希: %s", receipt.TxHash.Hex())
	log.Printf("🔍 交易收据包含 %d 个事件日志", len(receipt.Logs))
	log.Printf("🔍 期望的Factory地址: %s", factoryAddress.Hex())
	log.Printf("🔍 期望的事件签名: %s", proxyCreationTopic.Hex())

	for i, eventLog := range receipt.Logs {
		log.Printf("🔍 检查事件日志 %d: 合约地址=%s, Topics数量=%d",
			i, eventLog.Address.Hex(), len(eventLog.Topics))

		// 打印所有Topics用于调试
		for j, topic := range eventLog.Topics {
			log.Printf("🔍 事件日志 %d - Topic[%d]: %s", i, j, topic.Hex())
		}

		// 打印Data字段用于调试
		log.Printf("🔍 事件日志 %d - Data: %s (长度: %d)", i, common.Bytes2Hex(eventLog.Data), len(eventLog.Data))

		// 验证事件来源合约地址
		if eventLog.Address != factoryAddress {
			log.Printf("⚠️ 事件日志 %d: 合约地址不匹配，跳过", i)
			continue
		}

		// 验证Topics数量
		if len(eventLog.Topics) == 0 {
			log.Printf("⚠️ 事件日志 %d: Topics为空，跳过", i)
			continue
		}

		log.Printf("🔍 事件日志 %d: 事件签名=%s", i, eventLog.Topics[0].Hex())

		// 验证事件签名
		if eventLog.Topics[0] == proxyCreationTopic {
			log.Printf("✅ 找到ProxyCreation事件！")

			// 正确的Safe地址提取方式：从Data字段的第12-32字节提取
			if len(eventLog.Data) >= 32 {
				// ProxyCreation事件的Data结构：
				// 前32字节：Safe地址（带前导零填充）
				// 后32字节：Singleton地址（带前导零填充）
				safeAddressBytes := eventLog.Data[12:32] // 跳过前12个零字节，取20字节地址
				safeAddress := common.BytesToAddress(safeAddressBytes).Hex()
				log.Printf("✅ 从Data字段正确提取Safe地址: %s", safeAddress)
				return safeAddress, nil
			}

			// 备用方式1: 从Topics[1]提取（如果存在）
			if len(eventLog.Topics) > 1 {
				safeAddress := common.HexToAddress(eventLog.Topics[1].Hex()).Hex()
				log.Printf("✅ 备用方式 - 从Topics[1]提取Safe地址: %s", safeAddress)
				return safeAddress, nil
			}

			log.Printf("❌ ProxyCreation事件Data长度不足或格式错误: Data长度=%d", len(eventLog.Data))
		}
	}

	log.Printf("❌ 未找到Safe创建事件，所有事件日志都不匹配")
	return "", fmt.Errorf("未找到Safe创建事件")
}

// processConfirmedTransactions 处理已确认的交易，创建Safe记录
func (m *SafeCreationMonitor) processConfirmedTransactions() error {
	// 查询状态为CONFIRMED且有Safe地址的交易
	var confirmedTxs []models.SafeTransaction
	if err := m.db.Where("status = ? AND safe_address IS NOT NULL", models.StatusConfirmed).Find(&confirmedTxs).Error; err != nil {
		return fmt.Errorf("查询已确认交易失败: %w", err)
	}

	if len(confirmedTxs) == 0 {
		return nil // 没有需要处理的交易
	}

	log.Printf("🔄 处理 %d 个已确认交易，创建Safe记录", len(confirmedTxs))

	for _, tx := range confirmedTxs {
		if err := m.createSafeRecord(&tx); err != nil {
			log.Printf("❌ 创建Safe记录失败 (TxHash: %s): %v", tx.TxHash, err)
		} else {
			log.Printf("✅ Safe记录创建成功 (TxHash: %s)", tx.TxHash)
		}
	}

	return nil
}

// createSafeRecord 创建Safe记录
func (m *SafeCreationMonitor) createSafeRecord(tx *models.SafeTransaction) error {
	if tx.SafeAddress == nil {
		return fmt.Errorf("未找到Safe地址")
	}

	// 检查Safe记录是否已存在（避免重复创建）
	var existingSafe models.Safe
	if err := m.db.Where("address = ?", *tx.SafeAddress).First(&existingSafe).Error; err == nil {
		log.Printf("⚠️ Safe记录已存在，跳过创建: %s", *tx.SafeAddress)
		// 直接标记交易为完成
		if err := m.safeTransactionService.MarkTransactionAsCompleted(tx.TxHash); err != nil {
			log.Printf("❌ 标记交易完成失败: %v", err)
		}
		return nil
	}

	// 创建Safe记录
	safeVersion := "1.3.0"
	safe := models.Safe{
		Name:          tx.SafeName,
		Description:   &tx.SafeDescription,
		Address:       *tx.SafeAddress,
		ChainID:       tx.ChainID,
		Threshold:     tx.Threshold,
		Owners:        models.PostgreSQLStringArray(tx.Owners),
		SafeVersion:   &safeVersion,
		Status:        "active",
		CreatedBy:     tx.UserID,
		TransactionID: &tx.ID, // 关联交易记录
	}

	log.Printf("🏗️ 开始创建Safe记录: 地址=%s, 名称=%s", *tx.SafeAddress, tx.SafeName)

	// 开启事务确保数据一致性
	return m.db.Transaction(func(dbTx *gorm.DB) error {
		// 创建Safe记录
		if err := dbTx.Create(&safe).Error; err != nil {
			return fmt.Errorf("创建Safe记录失败: %w", err)
		}

		// 更新交易状态为已处理
		if err := m.safeTransactionService.MarkTransactionAsProcessed(tx.TxHash); err != nil {
			return fmt.Errorf("更新交易状态失败: %w", err)
		}

		// 最终标记为完成
		if err := m.safeTransactionService.MarkTransactionAsCompleted(tx.TxHash); err != nil {
			return fmt.Errorf("标记交易完成失败: %w", err)
		}

		log.Printf("✅ Safe创建完成: 地址=%s, 交易哈希=%s", *tx.SafeAddress, tx.TxHash)

		// 发送WebSocket通知 - Safe创建完成
		m.sendWebSocketNotification(tx.ID, string(models.StatusCompleted), map[string]interface{}{
			"safe_address": *tx.SafeAddress,
			"safe_name":    tx.SafeName,
		})

		return nil
	})
}

// sendWebSocketNotification 发送WebSocket通知
func (m *SafeCreationMonitor) sendWebSocketNotification(transactionID uuid.UUID, status string, extraData map[string]interface{}) {
	if m.wsHub == nil {
		log.Printf("⚠️ WebSocket Hub未初始化，跳过通知发送")
		return
	}

	// 获取交易详情以获取用户ID
	tx, err := m.safeTransactionService.GetSafeTransactionByID(transactionID)
	if err != nil {
		log.Printf("❌ 获取交易详情失败，无法发送WebSocket通知: %v", err)
		return
	}

	// 构建通知消息
	notificationData := map[string]interface{}{
		"transaction_id":     transactionID.String(),
		"status":             string(status),
		"status_description": getStatusDescription(status),
		"progress":           getStatusProgress(status),
		"timestamp":          time.Now().Unix(),
	}

	// 合并额外数据
	for key, value := range extraData {
		notificationData[key] = value
	}

	// 发送Safe创建状态更新通知
	message := websocket.WebSocketMessage{
		Type:      "safe_creation_update",
		Data:      notificationData,
		Timestamp: time.Now().Unix(),
	}

	// 发送给特定用户
	m.wsHub.SendToUser(tx.UserID, message)

	log.Printf("📡 已发送WebSocket通知: 用户=%s, 交易=%s, 状态=%s",
		tx.UserID.String(), transactionID.String(), status)
}

// getStatusDescription 获取状态描述
func getStatusDescription(status string) string {
	switch status {
	case string(models.StatusSubmitted):
		return "交易已提交到区块链"
	case string(models.StatusPending):
		return "等待区块链确认"
	case string(models.StatusConfirmed):
		return "交易已确认，Safe合约已部署"
	case string(models.StatusProcessed):
		return "Safe信息已保存到数据库"
	case string(models.StatusCompleted):
		return "Safe钱包创建完成"
	case string(models.StatusFailed):
		return "交易处理失败"
	default:
		return "未知状态"
	}
}

// getStatusProgress 获取状态进度百分比
func getStatusProgress(status string) int {
	switch status {
	case string(models.StatusSubmitted):
		return 20
	case string(models.StatusPending):
		return 40
	case string(models.StatusConfirmed):
		return 60
	case string(models.StatusProcessed):
		return 80
	case string(models.StatusCompleted):
		return 100
	case string(models.StatusFailed):
		return 0
	default:
		return 0
	}
}

// ==================== 提案执行监控功能 ====================

// AddProposalExecution 添加提案执行到监控队列
func (m *SafeCreationMonitor) AddProposalExecution(proposalID uuid.UUID, txHash string, safeAddress string) {
	m.proposalMutex.Lock()
	defer m.proposalMutex.Unlock()

	pending := &PendingProposal{
		ProposalID:  proposalID,
		TxHash:      txHash,
		SubmitTime:  time.Now(),
		RetryCount:  0,
		SafeAddress: safeAddress,
	}

	m.pendingProposals[txHash] = pending
	log.Printf("📋 添加提案执行监控: 提案ID=%s, 交易哈希=%s, Safe地址=%s", 
		proposalID.String(), txHash, safeAddress)
}

// recoverPendingProposals 从数据库恢复待监控的历史提案
func (m *SafeCreationMonitor) recoverPendingProposals() {
	log.Println("🔄 [提案监控] 开始恢复历史待监控提案...")

	// 查询状态为"executed"且有交易哈希的提案，预加载Safe关联数据
	var proposals []models.Proposal
	result := m.db.Preload("Safe").Where("status = ? AND tx_hash IS NOT NULL AND tx_hash != ''", "executed").Find(&proposals)
	
	log.Printf("📋 [提案监控] 数据库查询结果: 找到 %d 条executed状态且有tx_hash的提案", len(proposals))
	
	// 如果查询结果为0，检查是否有executed状态的提案
	if len(proposals) == 0 {
		var allExecuted []models.Proposal
		m.db.Where("status = ?", "executed").Find(&allExecuted)
		log.Printf("🔍 [提案监控] 调试信息: 总共有 %d 条executed状态的提案", len(allExecuted))
		
		if len(allExecuted) > 0 {
			// 检查第一条记录的tx_hash情况
			var firstProposal models.Proposal
			m.db.Where("status = ?", "executed").First(&firstProposal)
			if firstProposal.TxHash == nil {
				log.Printf("🔍 [提案监控] 调试信息: tx_hash字段为NULL")
			} else {
				log.Printf("🔍 [提案监控] 调试信息: tx_hash字段值='%s'", *firstProposal.TxHash)
			}
		}
	}
	
	if result.Error != nil {
		log.Printf("❌ [提案监控] 查询历史提案失败: %v", result.Error)
		return
	}

	if len(proposals) == 0 {
		log.Println("📋 [提案监控] 没有需要恢复的历史提案")
		return
	}

	log.Printf("📋 [提案监控] 发现 %d 个需要恢复监控的历史提案", len(proposals))

	// 为每个提案检查交易状态并添加到监控队列
	for i, proposal := range proposals {
		log.Printf("📋 [提案监控] 处理提案 %d: ID=%s, SafeID=%s, TxHash=%v", 
			i+1, proposal.ID.String(), proposal.SafeID.String(), proposal.TxHash)
		
		if proposal.TxHash == nil || *proposal.TxHash == "" {
			log.Printf("⚠️ [提案监控] 提案 %s 没有交易哈希，跳过监控", proposal.ID.String())
			continue
		}
		
		// 检查Safe关联数据是否存在
		log.Printf("📋 [提案监控] Safe关联数据: Address='%s', ID=%s", 
			proposal.Safe.Address, proposal.Safe.ID.String())
		
		if proposal.Safe.Address == "" {
			log.Printf("⚠️ [提案监控] 提案 %s 缺少Safe地址信息，跳过监控", proposal.ID.String())
			continue
		}

		// 先检查交易是否已经确认
		txHash := common.HexToHash(*proposal.TxHash)
		receipt, err := m.ethClient.TransactionReceipt(context.Background(), txHash)
		
		if err != nil {
			// 交易还未确认，添加到监控队列
			log.Printf("📋 [提案监控] 恢复监控提案: ID=%s, TxHash=%s (交易未确认)", 
				proposal.ID.String(), *proposal.TxHash)
			
			m.proposalMutex.Lock()
			m.pendingProposals[*proposal.TxHash] = &PendingProposal{
				ProposalID:  proposal.ID,
				TxHash:      *proposal.TxHash,
				SubmitTime:  proposal.UpdatedAt, // 使用更新时间作为提交时间
				RetryCount:  0,
				SafeAddress: proposal.Safe.Address,
			}
			m.proposalMutex.Unlock()
			continue
		}

		// 交易已确认，检查当前区块高度和确认数
		currentBlock, err := m.ethClient.BlockNumber(context.Background())
		if err != nil {
			log.Printf("❌ [提案监控] 获取当前区块高度失败: %v", err)
			continue
		}

		confirmations := currentBlock - receipt.BlockNumber.Uint64()
		
		if confirmations < uint64(m.config.ConfirmationBlocks) {
			// 确认数不足，添加到监控队列
			log.Printf("📋 [提案监控] 恢复监控提案: ID=%s, TxHash=%s (确认数不足: %d/%d)", 
				proposal.ID.String(), *proposal.TxHash, confirmations, m.config.ConfirmationBlocks)
			
			m.proposalMutex.Lock()
			m.pendingProposals[*proposal.TxHash] = &PendingProposal{
				ProposalID:  proposal.ID,
				TxHash:      *proposal.TxHash,
				SubmitTime:  proposal.UpdatedAt,
				RetryCount:  0,
				SafeAddress: proposal.Safe.Address,
			}
			m.proposalMutex.Unlock()
		} else {
			// 确认数足够，直接更新最终状态
			pendingProposal := &PendingProposal{
				ProposalID:  proposal.ID,
				TxHash:      *proposal.TxHash,
				SubmitTime:  proposal.UpdatedAt,
				RetryCount:  0,
				SafeAddress: proposal.Safe.Address,
			}
			
			if receipt.Status == 1 {
				log.Printf("✅ [提案监控] 历史提案已确认成功: ID=%s, TxHash=%s", 
					proposal.ID.String(), *proposal.TxHash)
				m.markProposalAsConfirmed(pendingProposal, receipt)
			} else {
				log.Printf("❌ [提案监控] 历史提案执行失败: ID=%s, TxHash=%s", 
					proposal.ID.String(), *proposal.TxHash)
				m.markProposalAsFailed(pendingProposal, "交易执行失败")
			}
		}
	}

	log.Printf("✅ [提案监控] 历史提案恢复完成，当前监控队列: %d 个提案", len(m.pendingProposals))
}

// startProposalExecutionMonitor 启动提案执行监控器
func (m *SafeCreationMonitor) startProposalExecutionMonitor() {
	log.Println("📋 [提案监控] 启动提案执行监控器...")

	ticker := time.NewTicker(m.config.PollInterval)
	defer ticker.Stop()

	for {
		select {
		case <-m.ctx.Done():
			log.Println("📋 [提案监控] 提案执行监控器已停止")
			return
		case <-ticker.C:
			m.checkPendingProposals()
		}
	}
}

// checkPendingProposals 检查所有待处理的提案执行
func (m *SafeCreationMonitor) checkPendingProposals() {
	m.proposalMutex.RLock()
	pendingCount := len(m.pendingProposals)
	m.proposalMutex.RUnlock()

	if pendingCount == 0 {
		return
	}

	log.Printf("📋 [提案监控] 检查 %d 个待处理的提案执行", pendingCount)

	// 创建副本以避免长时间持有锁
	m.proposalMutex.RLock()
	pendingCopy := make(map[string]*PendingProposal)
	for k, v := range m.pendingProposals {
		pendingCopy[k] = v
	}
	m.proposalMutex.RUnlock()

	// 检查每个待处理的提案
	for _, pending := range pendingCopy {
		m.checkProposalTransaction(pending)
	}
}

// checkProposalTransaction 检查单个提案执行交易状态
func (m *SafeCreationMonitor) checkProposalTransaction(pending *PendingProposal) {
	txHash := common.HexToHash(pending.TxHash)
	
	log.Printf("📋 [提案监控] 检查提案执行: 提案ID=%s, 交易哈希=%s", 
		pending.ProposalID.String(), pending.TxHash)
	
	receipt, err := m.ethClient.TransactionReceipt(m.ctx, txHash)
	if err != nil {
		// 检查是否超时
		if time.Since(pending.SubmitTime) > 10*time.Minute {
			log.Printf("❌ [提案监控] 交易超时未确认: %s", pending.TxHash)
			m.markProposalAsFailed(pending, "交易超时未确认")
		} else {
			log.Printf("⏳ [提案监控] 交易尚未被挖矿: %s", pending.TxHash)
		}
		return
	}

	log.Printf("📄 [提案监控] 获取交易收据成功: TxHash=%s, BlockNumber=%d, Status=%d",
		pending.TxHash, receipt.BlockNumber.Uint64(), receipt.Status)

	// 检查确认区块数
	currentBlock, err := m.ethClient.BlockNumber(m.ctx)
	if err != nil {
		log.Printf("❌ 获取当前区块号失败: %v", err)
		return
	}

	confirmations := int64(currentBlock) - receipt.BlockNumber.Int64()
	log.Printf("📋 [提案监控] 确认区块数: %d/%d", confirmations, m.config.ConfirmationBlocks)

	if confirmations < m.config.ConfirmationBlocks {
		log.Printf("⏳ [提案监控] 等待更多确认: %d/%d", confirmations, m.config.ConfirmationBlocks)
		return
	}

	// 根据交易状态更新提案
	if receipt.Status == 1 {
		log.Printf("✅ [提案监控] 交易执行成功: %s", pending.TxHash)
		m.markProposalAsConfirmed(pending, receipt)
	} else {
		log.Printf("❌ [提案监控] 交易执行失败: %s", pending.TxHash)
		m.markProposalAsFailed(pending, "交易执行失败")
	}
}

// markProposalAsConfirmed 标记提案为已确认
func (m *SafeCreationMonitor) markProposalAsConfirmed(pending *PendingProposal, receipt *types.Receipt) {
	now := time.Now()
	blockNumber := receipt.BlockNumber.Int64()
	
	// 更新数据库中的提案状态
	result := m.db.Model(&models.Proposal{}).
		Where("id = ?", pending.ProposalID).
		Updates(map[string]interface{}{
			"status":         "confirmed",
			"confirmed_at":   &now,
			"tx_hash":        pending.TxHash,
			"block_number":   &blockNumber,
			"gas_used":       &receipt.GasUsed,
			"updated_at":     now,
		})

	if result.Error != nil {
		log.Printf("❌ 更新提案状态失败: %v", result.Error)
		return
	}

	log.Printf("✅ 提案执行成功: 提案ID=%s, 交易哈希=%s, 区块=%d", 
		pending.ProposalID.String(), pending.TxHash, blockNumber)

	// 发送WebSocket通知给Safe owners
	m.notifyProposalExecutionResult(pending.ProposalID, "confirmed", pending.SafeAddress, pending.TxHash, nil)

	// 从监控队列中移除
	m.proposalMutex.Lock()
	delete(m.pendingProposals, pending.TxHash)
	m.proposalMutex.Unlock()
}

// markProposalAsFailed 标记提案为执行失败
func (m *SafeCreationMonitor) markProposalAsFailed(pending *PendingProposal, reason string) {
	now := time.Now()
	
	// 更新数据库中的提案状态
	result := m.db.Model(&models.Proposal{}).
		Where("id = ?", pending.ProposalID).
		Updates(map[string]interface{}{
			"status":         "failed",
			"failure_reason": reason,
			"updated_at":     now,
		})

	if result.Error != nil {
		log.Printf("❌ 更新提案状态失败: %v", result.Error)
		return
	}

	log.Printf("❌ 提案执行失败: 提案ID=%s, 交易哈希=%s, 原因=%s", 
		pending.ProposalID.String(), pending.TxHash, reason)

	// 发送WebSocket通知给Safe owners
	m.notifyProposalExecutionResult(pending.ProposalID, "failed", pending.SafeAddress, pending.TxHash, &reason)

	// 从监控队列中移除
	m.proposalMutex.Lock()
	delete(m.pendingProposals, pending.TxHash)
	m.proposalMutex.Unlock()
}

// sendProposalConfirmedNotification 发送提案确认通知
func (m *SafeCreationMonitor) sendProposalConfirmedNotification(pending *PendingProposal, receipt *types.Receipt) {
	if m.wsHub == nil {
		log.Printf("⚠️ WebSocket Hub未初始化，跳过提案确认通知发送")
		return
	}

	// 获取提案详情以获取相关用户
	var proposal models.Proposal
	if err := m.db.Preload("Safe").First(&proposal, pending.ProposalID).Error; err != nil {
		log.Printf("❌ 获取提案详情失败，无法发送通知: %v", err)
		return
	}

	// 构建通知消息
	notificationData := map[string]interface{}{
		"proposal_id":     pending.ProposalID.String(),
		"tx_hash":         pending.TxHash,
		"safe_address":    pending.SafeAddress,
		"block_number":    receipt.BlockNumber.Int64(),
		"gas_used":        receipt.GasUsed,
		"status":          "executed",
		"timestamp":       time.Now().Unix(),
		"proposal_title":  proposal.Title,
		"safe_name":       proposal.Safe.Name,
	}

	message := websocket.WebSocketMessage{
		Type:      "proposal_execution_confirmed",
		Data:      notificationData,
		Timestamp: time.Now().Unix(),
	}

	// 通知Safe的所有所有者
	for _, ownerAddress := range proposal.Safe.Owners {
		var ownerUser models.User
		if err := m.db.Where("wallet_address = ?", ownerAddress).First(&ownerUser).Error; err != nil {
			log.Printf("⚠️ 未找到钱包地址对应的用户: %s", ownerAddress)
			continue
		}
		m.wsHub.SendToUser(ownerUser.ID, message)
	}

	log.Printf("📡 已发送提案执行确认通知: 提案ID=%s, 交易哈希=%s", 
		pending.ProposalID.String(), pending.TxHash)
}

// sendProposalFailedNotification 发送提案失败通知
func (m *SafeCreationMonitor) sendProposalFailedNotification(pending *PendingProposal, reason string) {
	if m.wsHub == nil {
		log.Printf("⚠️ WebSocket Hub未初始化，跳过提案失败通知发送")
		return
	}

	// 获取提案详情以获取相关用户
	var proposal models.Proposal
	if err := m.db.Preload("Safe").First(&proposal, pending.ProposalID).Error; err != nil {
		log.Printf("❌ 获取提案详情失败，无法发送通知: %v", err)
		return
	}

	// 构建通知消息
	notificationData := map[string]interface{}{
		"proposal_id":     pending.ProposalID.String(),
		"tx_hash":         pending.TxHash,
		"safe_address":    pending.SafeAddress,
		"status":          "failed",
		"failure_reason":  reason,
		"timestamp":       time.Now().Unix(),
		"proposal_title":  proposal.Title,
		"safe_name":       proposal.Safe.Name,
	}

	message := websocket.WebSocketMessage{
		Type:      "proposal_execution_failed",
		Data:      notificationData,
		Timestamp: time.Now().Unix(),
	}

	// 通知Safe的所有所有者
	for _, ownerAddress := range proposal.Safe.Owners {
		var ownerUser models.User
		if err := m.db.Where("wallet_address = ?", ownerAddress).First(&ownerUser).Error; err != nil {
			log.Printf("⚠️ 未找到钱包地址对应的用户: %s", ownerAddress)
			continue
		}
		m.wsHub.SendToUser(ownerUser.ID, message)
	}

	log.Printf("📡 已发送提案执行失败通知: 提案ID=%s, 交易哈希=%s, 原因=%s", 
		pending.ProposalID.String(), pending.TxHash, reason)
}

// notifyProposalExecutionResult 统一的提案执行结果通知方法
func (m *SafeCreationMonitor) notifyProposalExecutionResult(proposalID uuid.UUID, status, safeAddress, txHash string, failureReason *string) {
	if m.wsHub == nil {
		log.Printf("⚠️ WebSocket Hub 未初始化，无法发送通知")
		return
	}

	// 获取提案详情
	var proposal models.Proposal
	if err := m.db.Where("id = ?", proposalID).First(&proposal).Error; err != nil {
		log.Printf("❌ 获取提案详情失败: %v", err)
		return
	}

	// 获取Safe的所有owners
	var safe models.Safe
	if err := m.db.Where("address = ?", safeAddress).First(&safe).Error; err != nil {
		log.Printf("❌ 获取Safe详情失败: %v", err)
		return
	}

	// Safe的owners存储在Owners字段中，是一个字符串数组
	owners := safe.Owners

	// 构造通知消息
	var message map[string]interface{}
	if status == "confirmed" {
		message = map[string]interface{}{
			"type":        "proposal_execution_success",
			"proposal_id": proposalID,
			"title":       "提案执行成功",
			"message":     fmt.Sprintf("提案\"%s\"已在区块链上成功执行", proposal.Title),
			"data": map[string]interface{}{
				"proposal_id":   proposalID,
				"proposal_title": proposal.Title,
				"safe_address":  safeAddress,
				"tx_hash":       txHash,
				"status":        status,
			},
			"timestamp": time.Now(),
		}
	} else {
		reasonText := "未知原因"
		if failureReason != nil {
			reasonText = *failureReason
		}
		message = map[string]interface{}{
			"type":        "proposal_execution_failed",
			"proposal_id": proposalID,
			"title":       "提案执行失败",
			"message":     fmt.Sprintf("提案\"%s\"执行失败: %s", proposal.Title, reasonText),
			"data": map[string]interface{}{
				"proposal_id":     proposalID,
				"proposal_title":  proposal.Title,
				"safe_address":    safeAddress,
				"tx_hash":         txHash,
				"status":          status,
				"failure_reason":  reasonText,
			},
			"timestamp": time.Now(),
		}
	}

	// 构造WebSocket消息
	wsMessage := websocket.WebSocketMessage{
		Type:      message["type"].(string),
		Data:      message,
		Timestamp: time.Now().Unix(),
	}

	// 发送给所有Safe owners
	for _, ownerAddress := range owners {
		var ownerUser models.User
		if err := m.db.Where("wallet_address = ?", ownerAddress).First(&ownerUser).Error; err != nil {
			log.Printf("⚠️ 未找到钱包地址对应的用户: %s", ownerAddress)
			continue
		}
		m.wsHub.SendToUser(ownerUser.ID, wsMessage)
	}

	// 保存到通知中心 (暂时注释，后续实现)
	// m.saveExecutionNotificationToCenter(proposalID, status, safeAddress, txHash, failureReason, owners)

	log.Printf("📡 已发送提案执行结果通知: 提案ID=%s, 状态=%s, 交易哈希=%s", 
		proposalID.String(), status, txHash)
}
