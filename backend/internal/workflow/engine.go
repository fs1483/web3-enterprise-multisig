package workflow

import (
	"fmt"
	"log"
	"math/big"
	"os"
	"strconv"
	"strings"

	"web3-enterprise-multisig/internal/blockchain"
	"web3-enterprise-multisig/internal/database"
	"web3-enterprise-multisig/internal/models"
	"web3-enterprise-multisig/internal/websocket"

	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/google/uuid"
)

// WorkflowStatus 工作流状态
type WorkflowStatus struct {
	ProposalID         uuid.UUID `json:"proposal_id"`
	Status             string    `json:"status"`
	SignaturesRequired int       `json:"signatures_required"`
	SignaturesCount    int       `json:"signatures_count"`
	CanExecute         bool      `json:"can_execute"`
	NextActions        []string  `json:"next_actions"`
}

// InitializeProposalWorkflow 初始化提案工作流
func InitializeProposalWorkflow(proposalID uuid.UUID) error {
	log.Printf("🚀 Initializing workflow for proposal %s", proposalID)

	// 获取提案详情和Safe信息
	var proposal models.Proposal
	if err := database.DB.Preload("Safe").Preload("Creator").
		First(&proposal, proposalID).Error; err != nil {
		log.Printf("Failed to fetch proposal %s: %v", proposalID, err)
		return err
	}

	// 1. 发送实时通知给在线的Safe所有者
	log.Printf("🔔 开始通知在线Safe所有者...")
	if err := notifyOnlineOwners(&proposal); err != nil {
		log.Printf("❌ Failed to notify online owners for proposal %s: %v", proposalID, err)
		// 通知失败不应该阻止工作流初始化
	} else {
		log.Printf("✅ 在线所有者通知完成")
	}

	// 2. 处理离线用户通知
	if err := handleOfflineOwnerNotifications(&proposal); err != nil {
		log.Printf("Failed to handle offline notifications for proposal %s: %v", proposalID, err)
		// 离线通知失败也不应该阻止工作流初始化
	}

	// 3. 记录审计日志
	log.Printf("✅ Proposal workflow initialized: ID=%s, Title=%s, Creator=%s, RequiredSignatures=%d",
		proposal.ID, proposal.Title, proposal.Creator.Username, proposal.RequiredSignatures)

	return nil
}

// GetWorkflowStatus 获取工作流状态
func GetWorkflowStatus(proposalID uuid.UUID) (*WorkflowStatus, error) {
	var proposal models.Proposal
	if err := database.DB.Preload("Safe").Preload("Signatures").
		First(&proposal, proposalID).Error; err != nil {
		return nil, err
	}

	status := &WorkflowStatus{
		ProposalID:         proposal.ID,
		Status:             proposal.Status,
		SignaturesRequired: proposal.RequiredSignatures,
		SignaturesCount:    proposal.CurrentSignatures,
		CanExecute:         proposal.CanExecute(),
		NextActions:        getNextActions(&proposal),
	}

	return status, nil
}

// ApproveProposal 审批提案
func ApproveProposal(proposalID uuid.UUID, userID uuid.UUID, signatureData string) error {
	var proposal models.Proposal
	if err := database.DB.Preload("Safe").First(&proposal, proposalID).Error; err != nil {
		return err
	}

	// 检查用户是否已经签名
	var existingSignature models.Signature
	if err := database.DB.Where("proposal_id = ? AND signer_id = ?", proposalID, userID).
		First(&existingSignature).Error; err == nil {
		return fmt.Errorf("user has already signed this proposal")
	}

	// 创建签名记录
	signature := models.Signature{
		ProposalID:    proposalID,
		SignerID:      userID,
		SignatureData: signatureData,
		SignatureType: "eth_sign",
		Status:        "valid",
	}

	if err := database.DB.Create(&signature).Error; err != nil {
		return err
	}

	// 更新提案签名计数
	if err := database.DB.Model(&proposal).
		Update("signatures_count", proposal.CurrentSignatures+1).Error; err != nil {
		return err
	}

	// 检查是否达到执行条件
	if proposal.CurrentSignatures+1 >= proposal.RequiredSignatures {
		database.DB.Model(&proposal).Update("status", "approved")
	}

	log.Printf("Proposal %s approved by user %s", proposalID, userID)
	return nil
}

// ExecuteProposal 执行提案
func ExecuteProposal(proposalID uuid.UUID) error {
	var proposal models.Proposal
	if err := database.DB.Preload("Safe").First(&proposal, proposalID).Error; err != nil {
		return err
	}

	if !proposal.CanExecute() {
		return fmt.Errorf("proposal cannot be executed")
	}

	// 调用区块链执行逻辑
	rpcURL := os.Getenv("ETHEREUM_RPC_URL")
	if rpcURL == "" {
		rpcURL = "https://sepolia.infura.io/v3/your-project-id" // 默认值
	}

	privateKey := os.Getenv("PRIVATE_KEY")
	if privateKey == "" {
		log.Printf("Warning: No executor private key configured")
		return fmt.Errorf("executor private key not configured")
	}

	chainIDStr := os.Getenv("CHAIN_ID")
	if chainIDStr == "" {
		chainIDStr = "11155111" // 默认Sepolia
	}
	chainIDInt, err := strconv.ParseInt(chainIDStr, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid chain ID: %v", err)
	}
	chainID := big.NewInt(chainIDInt)

	// 连接以太坊客户端
	client, err := ethclient.Dial(rpcURL)
	if err != nil {
		return fmt.Errorf("failed to connect to Ethereum client: %v", err)
	}

	// 解析私钥
	privateKeyECDSA, err := crypto.HexToECDSA(strings.TrimPrefix(privateKey, "0x"))
	if err != nil {
		return fmt.Errorf("failed to parse private key: %v", err)
	}

	// 创建SafeExecutor实例
	executor := blockchain.NewSafeExecutor(client, privateKeyECDSA, chainID, database.DB)

	// 执行区块链交易
	if err := executor.ExecuteProposal(proposalID); err != nil {
		log.Printf("Failed to execute proposal on blockchain: %v", err)
		return fmt.Errorf("failed to execute proposal on blockchain: %v", err)
	}

	// 🔥 关键修复：获取交易哈希并添加到提案执行监控
	// 重新查询提案以获取更新后的交易哈希
	var updatedProposal models.Proposal
	if err := database.DB.First(&updatedProposal, proposalID).Error; err != nil {
		log.Printf("⚠️ 无法获取更新后的提案信息: %v", err)
	} else if updatedProposal.TxHash != nil && *updatedProposal.TxHash != "" {
		// 获取监控器实例并添加提案执行监控
		monitor := getSafeMonitor()
		if monitor != nil {
			log.Printf("📋 [工作流] 添加提案执行监控: 提案ID=%s, 交易哈希=%s, Safe地址=%s", 
				proposalID.String(), *updatedProposal.TxHash, proposal.Safe.Address)
			
			monitor.AddProposalExecution(proposalID, *updatedProposal.TxHash, proposal.Safe.Address)
		} else {
			log.Printf("⚠️ [工作流] Safe监控器未初始化，跳过提案执行监控")
		}
	} else {
		log.Printf("⚠️ [工作流] 提案执行后未找到交易哈希，跳过监控")
	}

	log.Printf("Proposal %s executed successfully on blockchain", proposalID)
	return nil
}

// notifyOnlineOwners 通知在线的Safe所有者新提案创建
func notifyOnlineOwners(proposal *models.Proposal) error {
	// 获取WebSocket Hub实例 (需要从main.go传递或使用全局变量)
	// 这里假设有全局的WebSocket Hub实例
	hub := getWebSocketHub()
	if hub == nil {
		log.Printf("⚠️ WebSocket Hub未初始化，跳过在线用户通知")
		return nil
	}

	// 构建提案通知消息
	notificationData := map[string]interface{}{
		"proposal_id":          proposal.ID.String(),
		"proposal_title":       proposal.Title,
		"proposal_description": proposal.Description,
		"safe_id":              proposal.SafeID.String(),
		"safe_name":            proposal.Safe.Name,
		"creator_name":         proposal.Creator.Username,
		"signatures_required":  proposal.RequiredSignatures,
		"to_address":           proposal.ToAddress,
		"value":                proposal.Value,
		"created_at":           proposal.CreatedAt,
	}

	message := websocket.WebSocketMessage{
		Type:      "new_proposal_created",
		Data:      notificationData,
		Timestamp: proposal.CreatedAt.Unix(),
	}

	// 通知所有Safe所有者（除了创建者）
	notifiedCount := 0
	log.Printf("🔍 Safe所有者列表(钱包地址): %v", proposal.Safe.Owners)
	log.Printf("🔍 提案创建者ID: %s", proposal.CreatedBy.String())

	// 将PostgreSQLStringArray转换为[]string
	ownersSlice := []string(proposal.Safe.Owners)
	log.Printf("🔍 转换后的所有者列表: %v", ownersSlice)

	// 获取提案创建者的钱包地址
	var creatorUser models.User
	if err := database.DB.First(&creatorUser, proposal.CreatedBy).Error; err != nil {
		log.Printf("⚠️ 无法获取提案创建者信息: %v", err)
	}

	for _, ownerAddress := range ownersSlice {
		log.Printf("🔍 处理所有者地址: %s", ownerAddress)

		// 跳过提案创建者（通过钱包地址比较）
		if creatorUser.WalletAddress != nil && *creatorUser.WalletAddress == ownerAddress {
			log.Printf("⏭️ 跳过提案创建者地址: %s", ownerAddress)
			continue
		}

		// 根据钱包地址查找用户ID
		var ownerUser models.User
		if err := database.DB.Where("wallet_address = ?", ownerAddress).First(&ownerUser).Error; err != nil {
			log.Printf("⚠️ 未找到钱包地址对应的用户: %s, 错误: %v", ownerAddress, err)
			continue
		}

		log.Printf("🔍 找到用户: 地址=%s, 用户ID=%s", ownerAddress, ownerUser.ID.String())

		// 发送WebSocket通知
		log.Printf("📤 向用户发送通知: 用户ID=%s, 钱包地址=%s", ownerUser.ID.String(), ownerAddress)
		hub.SendToUser(ownerUser.ID, message)
		notifiedCount++
	}

	log.Printf("📤 已向 %d 个在线Safe所有者发送新提案通知: %s", notifiedCount, proposal.Title)
	return nil
}

// handleOfflineOwnerNotifications 处理离线用户通知
func handleOfflineOwnerNotifications(proposal *models.Proposal) error {
	// TODO: 实现离线用户通知机制
	// 企业级实现建议：
	// 1. 邮件通知：使用SMTP服务发送邮件给离线用户
	//    - 获取用户邮箱地址
	//    - 构建提案通知邮件模板
	//    - 异步发送邮件（使用消息队列如Redis/RabbitMQ）
	// 2. 短信通知：对于重要提案，发送SMS通知
	// 3. 推送通知：移动端App推送通知
	// 4. 企业内部通讯工具：如Slack、钉钉、企业微信等
	// 5. 数据库记录：在notifications表中记录通知状态，供用户登录后查看

	// 当前实现：记录需要通知的离线用户，供Dashboard展示
	offlineOwners := []string{}
	for _, ownerIDStr := range proposal.Safe.Owners {
		ownerID, err := uuid.Parse(ownerIDStr)
		if err != nil {
			continue
		}

		// 跳过提案创建者
		if ownerID == proposal.CreatedBy {
			continue
		}

		// TODO: 检查用户是否在线（查询WebSocket连接状态）
		// 如果离线，添加到离线用户列表
		offlineOwners = append(offlineOwners, ownerIDStr)
	}

	if len(offlineOwners) > 0 {
		log.Printf("📝 待通知的离线用户数量: %d, 提案: %s", len(offlineOwners), proposal.Title)
		// TODO: 在这里实现具体的离线通知逻辑
		// 例如：将通知任务加入消息队列、发送邮件等
	}

	return nil
}

// 全局WebSocket Hub实例
var globalWebSocketHub *websocket.Hub

// 全局监控器实例
var globalSafeMonitor *blockchain.SafeCreationMonitor

// SetWebSocketHub 设置全局WebSocket Hub实例
func SetWebSocketHub(hub *websocket.Hub) {
	globalWebSocketHub = hub
	log.Printf("✅ WebSocket Hub已设置到workflow引擎")
}

// SetSafeMonitor 设置全局Safe监控器实例
func SetSafeMonitor(monitor *blockchain.SafeCreationMonitor) {
	globalSafeMonitor = monitor
	log.Printf("✅ Safe监控器已设置到workflow引擎")
}

// getWebSocketHub 获取WebSocket Hub实例
func getWebSocketHub() *websocket.Hub {
	if globalWebSocketHub == nil {
		log.Printf("⚠️ WebSocket Hub未设置，无法发送实时通知")
		return nil
	}
	return globalWebSocketHub
}

// getSafeMonitor 获取Safe监控器实例
func getSafeMonitor() *blockchain.SafeCreationMonitor {
	if globalSafeMonitor == nil {
		log.Printf("⚠️ Safe监控器未设置，无法监控提案执行")
		return nil
	}
	return globalSafeMonitor
}

// getNextActions 获取下一步可执行的操作
func getNextActions(proposal *models.Proposal) []string {
	actions := []string{}

	switch proposal.Status {
	case "pending":
		if proposal.CurrentSignatures < proposal.RequiredSignatures {
			actions = append(actions, "sign")
		}
		if proposal.CurrentSignatures >= proposal.RequiredSignatures {
			actions = append(actions, "execute")
		}
	case "approved":
		actions = append(actions, "execute")
	}

	return actions
}
