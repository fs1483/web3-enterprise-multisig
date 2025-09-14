package handlers

import (
	"context"
	"fmt"
	"math/big"
	"net/http"
	"strings"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"web3-enterprise-multisig/internal/database"
	"web3-enterprise-multisig/internal/models"
)

// DashboardCardsResponse Dashboard卡片数据响应结构
// 包含提案中心和资产概况两个卡片的所有数据
type DashboardCardsResponse struct {
	ProposalCenter *ProposalCenterCard `json:"proposalCenter"` // 提案中心卡片数据
	AssetOverview  *AssetOverviewCard  `json:"assetOverview"`  // 资产概况卡片数据
	LastUpdated    time.Time           `json:"lastUpdated"`    // 数据最后更新时间
}

// ProposalCenterCard 提案中心卡片数据结构
// 显示用户需要签名的提案数量和统计信息
type ProposalCenterCard struct {
	PendingSignatures int `json:"pendingSignatures"` // 需要用户签名的提案数量
	UrgentCount       int `json:"urgentCount"`       // 紧急提案数量（超过24小时）
	TotalProposals    int `json:"totalProposals"`    // 用户相关的提案总数
	ExecutedProposals int `json:"executedProposals"` // 已执行的提案数量
	ApprovalRate      int `json:"approvalRate"`      // 提案通过率（百分比）
}

// AssetOverviewCard 资产概况卡片数据结构
// 显示ETH总量和Safe数量
type AssetOverviewCard struct {
	TotalETH  string `json:"totalETH"`  // 所有Safe的ETH余额汇总（Wei单位转换为ETH显示）
	SafeCount int    `json:"safeCount"` // 用户管理的Safe数量
}

// GetDashboardCards 获取Dashboard卡片数据
// 路由: GET /api/v1/dashboard/cards
// 功能: 返回提案中心和资产概况两个卡片的数据
// 认证: 需要JWT token
func GetDashboardCards(c *gin.Context) {
	// 1. 获取用户ID（从JWT token中获取用户信息）
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户未认证"})
		return
	}

	// 解析用户UUID - JWT中间件存储的是uuid.UUID类型
	userUUID, ok := userID.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的用户ID格式"})
		return
	}

	// 2. 并发获取两个卡片的数据
	proposalChan := make(chan *ProposalCenterCard, 1)
	assetChan := make(chan *AssetOverviewCard, 1)
	errorChan := make(chan error, 2)

	// 获取提案中心数据
	go func() {
		proposalCard, err := getProposalCenterData(userUUID)
		if err != nil {
			errorChan <- fmt.Errorf("获取提案数据失败: %v", err)
			return
		}
		proposalChan <- proposalCard
	}()

	// 获取资产概况数据
	go func() {
		assetCard, err := getAssetOverviewData(userUUID)
		if err != nil {
			errorChan <- fmt.Errorf("获取资产数据失败: %v", err)
			return
		}
		assetChan <- assetCard
	}()

	// 3. 等待数据获取完成
	var proposalCard *ProposalCenterCard
	var assetCard *AssetOverviewCard
	var errors []string

	for i := 0; i < 2; i++ {
		select {
		case pc := <-proposalChan:
			proposalCard = pc
		case ac := <-assetChan:
			assetCard = ac
		case err := <-errorChan:
			errors = append(errors, err.Error())
		case <-time.After(10 * time.Second):
			errors = append(errors, "数据获取超时")
		}
	}

	// 4. 检查是否有错误
	if len(errors) > 0 {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "获取Dashboard数据失败",
			"code":  "FETCH_ERROR",
			"details": errors,
		})
		return
	}

	// 5. 返回成功响应
	response := DashboardCardsResponse{
		ProposalCenter: proposalCard,
		AssetOverview:  assetCard,
		LastUpdated:    time.Now(),
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// getProposalCenterData 获取提案中心卡片数据
// 参数: userUUID - 用户UUID
// 返回: 提案中心卡片数据和错误信息
func getProposalCenterData(userUUID uuid.UUID) (*ProposalCenterCard, error) {
	// 获取用户的钱包地址
	var user models.User
	if err := database.DB.Where("id = ?", userUUID).First(&user).Error; err != nil {
		return nil, fmt.Errorf("查询用户信息失败: %v", err)
	}

	// 1. 查询需要用户签名的待处理提案（包括用户创建但还需要签名的提案）
	var pendingProposals []models.Proposal
	pendingQuery := database.DB.Model(&models.Proposal{}).
		Preload("Safe").
		Joins("JOIN safes ON proposals.safe_id = safes.id").
		Where("proposals.status = ?", "pending")

	// 查询用户有权限签名的Safe中的提案
	if user.WalletAddress != nil && *user.WalletAddress != "" {
		// 用户作为owner的Safe中的提案 或 用户创建的Safe中的提案
		pendingQuery = pendingQuery.Where("? = ANY(safes.owners) OR safes.created_by = ?", *user.WalletAddress, userUUID)
	} else {
		// 如果用户没有钱包地址，只查询用户创建的Safe中的提案
		pendingQuery = pendingQuery.Where("safes.created_by = ?", userUUID)
	}

	// 排除用户已经签名的提案
	pendingQuery = pendingQuery.Where("proposals.id NOT IN (?)", 
		database.DB.Model(&models.Signature{}).
			Select("proposal_id").
			Where("signer_id = ?", userUUID))
	if err := pendingQuery.Find(&pendingProposals).Error; err != nil {
		return nil, fmt.Errorf("查询待签名提案失败: %v", err)
	}

	// 2. 计算紧急提案数量（创建时间超过24小时）
	urgentCount := 0
	for _, proposal := range pendingProposals {
		if time.Since(proposal.CreatedAt).Hours() > 24 {
			urgentCount++
		}
	}

	// 3. 查询用户相关的所有提案统计
	var totalProposals int64
	var executedProposals int64

	// 用户参与的Safe的所有提案 - 包括用户创建的提案和用户参与的Safe中的提案
	totalQuery := database.DB.Model(&models.Proposal{}).
		Joins("LEFT JOIN safes ON proposals.safe_id = safes.id").
		Where("proposals.created_by = ?", userUUID)

	// 如果用户有钱包地址，也查询用户作为owner的Safe中的提案
	if user.WalletAddress != nil && *user.WalletAddress != "" {
		totalQuery = totalQuery.Or("(safes.id IS NOT NULL AND ? = ANY(safes.owners))", *user.WalletAddress)
	} else {
		// 如果用户没有钱包地址，也查询用户创建的Safe中的提案
		totalQuery = totalQuery.Or("safes.created_by = ?", userUUID)
	}

	if err := totalQuery.Count(&totalProposals).Error; err != nil {
		return nil, fmt.Errorf("查询提案总数失败: %v", err)
	}

	// 已执行的提案数量 - 需要重新构建查询，避免WHERE条件叠加
	executedQuery := database.DB.Model(&models.Proposal{}).
		Joins("LEFT JOIN safes ON proposals.safe_id = safes.id").
		Where("proposals.status = ?", "executed").
		Where("proposals.created_by = ?", userUUID)

	// 如果用户有钱包地址，也查询用户作为owner的Safe中的已执行提案
	if user.WalletAddress != nil && *user.WalletAddress != "" {
		executedQuery = executedQuery.Or("(proposals.status = ? AND safes.id IS NOT NULL AND ? = ANY(safes.owners))", "executed", *user.WalletAddress)
	} else {
		// 如果用户没有钱包地址，也查询用户创建的Safe中的已执行提案
		executedQuery = executedQuery.Or("(proposals.status = ? AND safes.created_by = ?)", "executed", userUUID)
	}

	if err := executedQuery.Count(&executedProposals).Error; err != nil {
		return nil, fmt.Errorf("查询已执行提案数失败: %v", err)
	}

	// 4. 计算通过率
	approvalRate := 0
	if totalProposals > 0 {
		approvalRate = int((executedProposals * 100) / totalProposals)
	}

	// 5. 构建返回数据
	proposalCard := &ProposalCenterCard{
		PendingSignatures: len(pendingProposals),
		UrgentCount:       urgentCount,
		TotalProposals:    int(totalProposals),
		ExecutedProposals: int(executedProposals),
		ApprovalRate:      approvalRate,
	}

	return proposalCard, nil
}

// getAssetOverviewData 获取资产概况卡片数据
// 参数: userUUID - 用户UUID
// 返回: 资产概况卡片数据和错误信息
func getAssetOverviewData(userUUID uuid.UUID) (*AssetOverviewCard, error) {
	// 获取用户的钱包地址
	var user models.User
	if err := database.DB.Where("id = ?", userUUID).First(&user).Error; err != nil {
		return nil, fmt.Errorf("查询用户信息失败: %v", err)
	}

	// 1. 查询用户的所有Safe - 包括用户创建的和用户参与的
	var safes []models.Safe
	safeQuery := database.DB.Where("created_by = ?", userUUID)
	
	// 如果用户有钱包地址，也查询用户作为owner的Safe
	if user.WalletAddress != nil && *user.WalletAddress != "" {
		safeQuery = safeQuery.Or("? = ANY(owners)", *user.WalletAddress)
	}
	
	if err := safeQuery.Find(&safes).Error; err != nil {
		return nil, fmt.Errorf("查询用户Safe列表失败: %v", err)
	}

	// 2. 获取ETH总余额
	totalETH, err := getTotalETHBalance(safes)
	if err != nil {
		// TODO: 如果区块链调用失败，考虑使用缓存数据或返回默认值
		// 当前先返回错误，后续可以优化为降级处理
		return nil, fmt.Errorf("获取ETH余额失败: %v", err)
	}

	// 3. 构建返回数据
	assetCard := &AssetOverviewCard{
		TotalETH:  totalETH,
		SafeCount: len(safes),
	}

	return assetCard, nil
}

// getTotalETHBalance 获取所有Safe的ETH余额汇总
// 参数: safes - Safe列表
// 返回: ETH总余额（字符串格式）和错误信息
func getTotalETHBalance(safes []models.Safe) (string, error) {
	// TODO: 这里需要配置RPC URL，建议从环境变量读取
	// 当前使用Sepolia测试网，生产环境需要配置为主网
	rpcURL := "https://sepolia.infura.io/v3/2051fcdf4e21463aa06f161d13a0a5f4"
	
	// 1. 连接以太坊客户端
	client, err := ethclient.Dial(rpcURL)
	if err != nil {
		return "0", fmt.Errorf("连接以太坊节点失败: %v", err)
	}
	defer client.Close()

	// 2. 累计所有Safe的ETH余额
	totalBalance := big.NewInt(0)

	for _, safe := range safes {
		// 获取单个Safe的ETH余额
		address := common.HexToAddress(safe.Address)
		balance, err := client.BalanceAt(context.TODO(), address, nil)
		if err != nil {
			// TODO: 单个Safe余额获取失败时，可以记录日志但不中断整个流程
			// 当前先跳过失败的Safe，继续处理其他Safe
			fmt.Printf("获取Safe %s 余额失败: %v\n", safe.Address, err)
			continue
		}

		// 累加到总余额
		totalBalance.Add(totalBalance, balance)
	}

	// 3. 将Wei转换为ETH（保留4位小数）
	ethBalance := weiToEthString(totalBalance)

	return ethBalance, nil
}

// weiToEthString 将Wei转换为ETH字符串格式
// 参数: weiAmount - Wei数量（big.Int）
// 返回: ETH数量字符串（保留4位小数）
func weiToEthString(weiAmount *big.Int) string {
	// 1 ETH = 10^18 Wei
	ethDivisor := new(big.Int).Exp(big.NewInt(10), big.NewInt(18), nil)
	
	// 计算整数部分
	ethInteger := new(big.Int).Div(weiAmount, ethDivisor)
	
	// 计算小数部分（保留4位）
	remainder := new(big.Int).Mod(weiAmount, ethDivisor)
	
	// 将小数部分转换为4位精度
	decimalDivisor := new(big.Int).Exp(big.NewInt(10), big.NewInt(14), nil) // 10^14
	decimalPart := new(big.Int).Div(remainder, decimalDivisor)
	
	// 格式化为字符串
	if decimalPart.Cmp(big.NewInt(0)) == 0 {
		return ethInteger.String()
	}
	
	// 去除尾部的0
	decimalStr := fmt.Sprintf("%04d", decimalPart.Int64())
	decimalStr = strings.TrimRight(decimalStr, "0")
	
	if decimalStr == "" {
		return ethInteger.String()
	}
	
	return fmt.Sprintf("%s.%s", ethInteger.String(), decimalStr)
}

// GetPendingProposals 获取待处理提案列表
// 路由: GET /api/v1/dashboard/pending-proposals
// 功能: 返回需要用户签名的待处理提案列表
// 认证: 需要JWT token
func GetPendingProposals(c *gin.Context) {
	// 1. 获取用户ID
	userID, exists := c.Get("userID")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "用户未认证"})
		return
	}

	userUUID, ok := userID.(uuid.UUID)
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "无效的用户ID格式"})
		return
	}

	// 2. 获取用户信息
	var user models.User
	if err := database.DB.Where("id = ?", userUUID).First(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询用户信息失败"})
		return
	}

	// 3. 查询待处理提案
	var proposals []models.Proposal
	query := database.DB.Model(&models.Proposal{}).
		Preload("Safe").
		Joins("JOIN safes ON proposals.safe_id = safes.id").
		Where("proposals.status = ?", "pending")

	// 根据用户权限过滤提案
	if user.WalletAddress != nil && *user.WalletAddress != "" {
		query = query.Where("? = ANY(safes.owners) OR safes.created_by = ?", *user.WalletAddress, userUUID)
	} else {
		query = query.Where("safes.created_by = ?", userUUID)
	}

	// 排除用户已签名的提案
	query = query.Where("proposals.id NOT IN (?)", 
		database.DB.Model(&models.Signature{}).
			Select("proposal_id").
			Where("signer_id = ?", userUUID))

	// 按创建时间倒序排列
	query = query.Order("proposals.created_at DESC")

	if err := query.Find(&proposals).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "查询待处理提案失败"})
		return
	}

	// 4. 构建响应数据
	pendingProposals := make([]gin.H, 0, len(proposals))
	for _, proposal := range proposals {
		// 计算优先级
		priority := calculateProposalPriority(proposal.CreatedAt)
		
		// 获取创建者信息
		var creator models.User
		creatorName := "Unknown"
		if err := database.DB.Where("id = ?", proposal.CreatedBy).First(&creator).Error; err == nil {
			if creator.FullName != nil && *creator.FullName != "" {
				creatorName = *creator.FullName
			} else {
				creatorName = creator.Username
			}
		}

		// 获取签名数量
		var signatureCount int64
		database.DB.Model(&models.Signature{}).Where("proposal_id = ?", proposal.ID).Count(&signatureCount)

		pendingProposal := gin.H{
			"id":                  proposal.ID,
			"title":              proposal.Title,
			"description":        proposal.Description,
			"safe_id":            proposal.SafeID,
			"safe_name":          proposal.Safe.Name,
			"creator_name":       creatorName,
			"signatures_required": proposal.RequiredSignatures,
			"signatures_count":   int(signatureCount),
			"to_address":         proposal.ToAddress,
			"value":              weiToEthString(parseStringToBigInt(proposal.Value)),
			"created_at":         proposal.CreatedAt.Format(time.RFC3339),
			"priority":           priority,
		}
		pendingProposals = append(pendingProposals, pendingProposal)
	}

	// 5. 返回响应
	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    pendingProposals,
		"count":   len(pendingProposals),
	})
}

// calculateProposalPriority 根据创建时间计算提案优先级
func calculateProposalPriority(createdAt time.Time) string {
	hoursAgo := time.Since(createdAt).Hours()
	if hoursAgo > 48 {
		return "high"
	} else if hoursAgo > 24 {
		return "medium"
	}
	return "low"
}

// parseStringToBigInt 将字符串转换为big.Int
func parseStringToBigInt(s string) *big.Int {
	if s == "" {
		return big.NewInt(0)
	}
	result, ok := new(big.Int).SetString(s, 10)
	if !ok {
		return big.NewInt(0)
	}
	return result
}
