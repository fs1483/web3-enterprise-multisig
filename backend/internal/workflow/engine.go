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
	log.Printf("Initializing workflow for proposal %s", proposalID)

	// 获取提案详情和Safe信息
	var proposal models.Proposal
	if err := database.DB.Preload("Safe").Preload("Creator").
		First(&proposal, proposalID).Error; err != nil {
		log.Printf("Failed to fetch proposal %s: %v", proposalID, err)
		return err
	}

	// 1. 发送实时通知给在线的Safe所有者
	if err := notifyOnlineOwners(&proposal); err != nil {
		log.Printf("Failed to notify online owners for proposal %s: %v", proposalID, err)
		// 通知失败不应该阻止工作流初始化
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
	if err := database.DB.First(&proposal, proposalID).Error; err != nil {
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
	for _, ownerIDStr := range proposal.Safe.Owners {
		ownerID, err := uuid.Parse(ownerIDStr)
		if err != nil {
			log.Printf("⚠️ 无效的所有者ID: %s", ownerIDStr)
			continue
		}

		// 跳过提案创建者（避免自己通知自己）
		if ownerID == proposal.CreatedBy {
			continue
		}

		// 发送WebSocket通知
		hub.SendToUser(ownerID, message)
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

// getWebSocketHub 获取WebSocket Hub实例
// TODO: 这个函数需要根据实际的架构来实现
// 建议通过依赖注入或全局变量的方式获取Hub实例
func getWebSocketHub() *websocket.Hub {
	// 临时实现：返回nil，实际项目中需要传递真实的Hub实例
	// 可以通过以下方式实现：
	// 1. 在main.go中创建Hub实例，通过参数传递给workflow
	// 2. 使用全局变量存储Hub实例
	// 3. 通过依赖注入容器管理Hub实例
	log.Printf("⚠️ getWebSocketHub() 需要实现 - 当前返回nil")
	return nil
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
