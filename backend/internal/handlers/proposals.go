package handlers

import (
	"log"
	"math/big"
	"net/http"
	"strconv"
	"strings"

	"web3-enterprise-multisig/internal/database"
	"web3-enterprise-multisig/internal/models"
	"web3-enterprise-multisig/internal/validators"
	"web3-enterprise-multisig/internal/workflow"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
)

// GetProposals 获取提案列表
func GetProposals(c *gin.Context) {
	userID, _ := c.Get("user_id")

	// 获取用户信息以获取钱包地址
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch user information",
			"code":  "USER_FETCH_ERROR",
		})
		return
	}

	// 分页参数
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	offset := (page - 1) * limit

	// 过滤参数
	safeID := c.Query("safe_id")
	status := c.Query("status")

	query := database.DB.Model(&models.Proposal{})

	// 只显示用户有权限的提案：用户是Safe创建者或用户钱包地址在Safe的owners中
	if user.WalletAddress != nil {
		query = query.Joins("JOIN safes ON proposals.safe_id = safes.id").
			Where("safes.created_by = ? OR ? = ANY(safes.owners)", userID, *user.WalletAddress)
	} else {
		// 如果用户没有钱包地址，只显示用户创建的Safe的提案
		query = query.Joins("JOIN safes ON proposals.safe_id = safes.id").
			Where("safes.created_by = ?", userID)
	}

	if safeID != "" {
		query = query.Where("proposals.safe_id = ?", safeID)
	}

	if status != "" {
		query = query.Where("proposals.status = ?", status)
	}

	var proposals []models.Proposal
	var total int64

	query.Count(&total)

	if err := query.Preload("Safe").Preload("Creator").
		Offset(offset).Limit(limit).
		Order("proposals.created_at DESC").
		Find(&proposals).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch proposals",
			"code":  "FETCH_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"proposals": proposals,
		"pagination": gin.H{
			"page":  page,
			"limit": limit,
			"total": total,
		},
	})
}

// CreateProposal 创建提案
func CreateProposal(c *gin.Context) {
	userID, _ := c.Get("user_id")

	var req validators.CreateProposalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
			"code":  "INVALID_REQUEST",
		})
		return
	}

	if err := validators.ValidateStruct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Validation failed",
			"code":    "VALIDATION_ERROR",
			"details": err.Error(),
		})
		return
	}

	// 验证 Safe 存在且用户有权限
	safeUUID, err := uuid.Parse(req.SafeID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid safe ID",
			"code":  "INVALID_SAFE_ID",
		})
		return
	}

	var safe models.Safe
	if err := database.DB.First(&safe, safeUUID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Safe not found",
			"code":  "SAFE_NOT_FOUND",
		})
		return
	}

	// 检查用户是否为 Safe 的所有者
	userIDStr := userID.(uuid.UUID).String()
	isOwner := false
	for _, owner := range safe.Owners {
		if owner == userIDStr {
			isOwner = true
			break
		}
	}

	if !isOwner && safe.CreatedBy != userID {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Not authorized to create proposals for this safe",
			"code":  "NOT_AUTHORIZED",
		})
		return
	}

	// 转换ETH金额为wei
	valueInWei := convertEthToWei(req.Value)
	
	// 验证转换后的Wei值是否合理
	if weiValue, ok := new(big.Int).SetString(valueInWei, 10); ok {
		// 检查是否超过合理范围 (例如不超过1000万ETH)
		maxReasonableWei := new(big.Int).Mul(big.NewInt(10000000), new(big.Int).Exp(big.NewInt(10), big.NewInt(18), nil))
		if weiValue.Cmp(maxReasonableWei) > 0 {
			log.Printf("ERROR: Wei value too large: %s", valueInWei)
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Transaction value is unreasonably large",
				"code":  "VALUE_TOO_LARGE",
			})
			return
		}
		log.Printf("Validated Wei value: %s", valueInWei)
	} else {
		log.Printf("ERROR: Invalid Wei value: %s", valueInWei)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid transaction value format",
			"code":  "INVALID_VALUE",
		})
		return
	}

	// 创建提案
	proposal := models.Proposal{
		SafeID:             safeUUID,
		Title:              req.Title,
		Description:        &req.Description,
		ProposalType:       req.ProposalType,
		ToAddress:          &req.ToAddress,
		Value:              valueInWei,
		Data:               &req.Data,
		Status:             "pending",
		RequiredSignatures: req.RequiredSignatures,
		CreatedBy:          userID.(uuid.UUID),
	}

	if err := database.DB.Create(&proposal).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create proposal",
			"code":  "CREATE_ERROR",
		})
		return
	}

	// 重新查询提案以包含Safe关联数据
	var createdProposal models.Proposal
	if err := database.DB.Preload("Safe").Preload("Creator").Preload("Signatures.Signer").
		First(&createdProposal, proposal.ID).Error; err != nil {
		log.Printf("Failed to reload proposal with associations: %v", err)
		// 如果重新查询失败，仍然返回原始proposal
		createdProposal = proposal
	}
	

	// 初始化工作流（异步处理，不阻塞响应）
	go func() {
		if err := workflow.InitializeProposalWorkflow(proposal.ID); err != nil {
			log.Printf("Failed to initialize workflow for proposal %s: %v", proposal.ID, err)
		}
	}()

	c.JSON(http.StatusCreated, gin.H{
		"message":  "Proposal created successfully",
		"proposal": createdProposal,
	})
}

// convertEthToWei 将ETH金额转换为wei
// 注意：前端已经将ETH转换为Wei，所以这里主要是验证和直接返回
func convertEthToWei(ethAmount string) string {
	// 移除空格
	ethAmount = strings.TrimSpace(ethAmount)

	// 验证是否为有效的Wei值（纯数字）
	if val, ok := new(big.Int).SetString(ethAmount, 10); ok {
		// 前端已经发送Wei值，直接返回
		log.Printf("Received Wei value: %s", ethAmount)
		return val.String()
	}

	// 如果不是纯数字，可能是ETH格式，进行转换
	if strings.Contains(ethAmount, ".") || len(ethAmount) < 10 {
		ethValue, ok := new(big.Float).SetString(ethAmount)
		if !ok {
			log.Printf("Warning: invalid ETH amount %s, using 0", ethAmount)
			return "0"
		}

		// 乘以 10^18 转换为Wei
		weiMultiplier := new(big.Float).SetInt(new(big.Int).Exp(big.NewInt(10), big.NewInt(18), nil))
		weiValue := new(big.Float).Mul(ethValue, weiMultiplier)

		// 转换为整数
		weiInt, _ := weiValue.Int(nil)

		log.Printf("Converted %s ETH to %s wei", ethAmount, weiInt.String())
		return weiInt.String()
	}

	// 默认情况，尝试作为Wei值处理
	log.Printf("Warning: ambiguous amount format %s, treating as Wei", ethAmount)
	return ethAmount
}

// GetProposal 获取单个提案
func GetProposal(c *gin.Context) {
	proposalID := c.Param("id")
	userID, _ := c.Get("user_id")

	proposalUUID, err := uuid.Parse(proposalID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid proposal ID",
			"code":  "INVALID_PROPOSAL_ID",
		})
		return
	}

	var proposal models.Proposal
	if err := database.DB.Preload("Safe").Preload("Creator").Preload("Signatures.Signer").
		First(&proposal, proposalUUID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Proposal not found",
			"code":  "PROPOSAL_NOT_FOUND",
		})
		return
	}


	// 检查用户权限
	hasAccess := proposal.Safe.CreatedBy == userID

	if !hasAccess {
		// 获取用户钱包地址
		var user models.User
		if err := database.DB.First(&user, userID).Error; err == nil && user.WalletAddress != nil {
			// 使用钱包地址匹配Safe owners
			for _, owner := range proposal.Safe.Owners {
				if owner == *user.WalletAddress {
					hasAccess = true
					break
				}
			}
		}
	}

	if !hasAccess {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Not authorized to view this proposal",
			"code":  "NOT_AUTHORIZED",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"proposal": proposal,
	})
}

// UpdateProposal 更新提案信息
func UpdateProposal(c *gin.Context) {
	proposalID := c.Param("id")
	userID, _ := c.Get("user_id")

	proposalUUID, err := uuid.Parse(proposalID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid proposal ID",
			"code":  "INVALID_PROPOSAL_ID",
		})
		return
	}

	var proposal models.Proposal
	if err := database.DB.Preload("Safe").First(&proposal, proposalUUID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Proposal not found",
			"code":  "PROPOSAL_NOT_FOUND",
		})
		return
	}

	// 检查权限：只有创建者可以更新提案
	if proposal.CreatedBy != userID {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Only the creator can update this proposal",
			"code":  "NOT_AUTHORIZED",
		})
		return
	}

	// 检查提案状态：只有 pending 状态的提案可以更新
	if proposal.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Only pending proposals can be updated",
			"code":  "INVALID_STATUS",
		})
		return
	}

	var req struct {
		Title       string `json:"title" validate:"omitempty,min=1,max=255"`
		Description string `json:"description" validate:"max=1000"`
		ToAddress   string `json:"to_address" validate:"omitempty,ethereum_address"`
		Value       string `json:"value"`
		Data        string `json:"data"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
			"code":  "INVALID_REQUEST",
		})
		return
	}

	// 验证请求数据
	if err := validators.ValidateStruct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Validation failed",
			"code":    "VALIDATION_ERROR",
			"details": err.Error(),
		})
		return
	}

	// 更新提案信息
	updates := make(map[string]interface{})
	if req.Title != "" {
		updates["title"] = req.Title
	}
	if req.Description != "" {
		updates["description"] = req.Description
	}
	if req.ToAddress != "" {
		updates["to_address"] = req.ToAddress
	}
	if req.Value != "" {
		updates["value"] = req.Value
	}
	if req.Data != "" {
		updates["data"] = req.Data
	}

	if len(updates) > 0 {
		if err := database.DB.Model(&proposal).Updates(updates).Error; err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": "Failed to update proposal",
				"code":  "UPDATE_ERROR",
			})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Proposal updated successfully",
	})
}

// DeleteProposal 删除提案
func DeleteProposal(c *gin.Context) {
	proposalID := c.Param("id")
	userID, _ := c.Get("user_id")

	proposalUUID, err := uuid.Parse(proposalID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid proposal ID",
			"code":  "INVALID_PROPOSAL_ID",
		})
		return
	}

	var proposal models.Proposal
	if err := database.DB.First(&proposal, proposalUUID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Proposal not found",
			"code":  "PROPOSAL_NOT_FOUND",
		})
		return
	}

	// 检查权限：只有创建者可以删除提案
	if proposal.CreatedBy != userID {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Only the creator can delete this proposal",
			"code":  "NOT_AUTHORIZED",
		})
		return
	}

	// 检查提案状态：只有 pending 状态的提案可以删除
	if proposal.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Only pending proposals can be deleted",
			"code":  "INVALID_STATUS",
		})
		return
	}

	// 删除相关的签名记录
	if err := database.DB.Where("proposal_id = ?", proposalUUID).Delete(&models.Signature{}).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete proposal signatures",
			"code":  "DELETE_ERROR",
		})
		return
	}

	// 删除提案
	if err := database.DB.Delete(&proposal).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to delete proposal",
			"code":  "DELETE_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Proposal deleted successfully",
	})
}

// SignProposal 签名提案
func SignProposal(c *gin.Context) {
	proposalID := c.Param("id")
	userID, _ := c.Get("user_id")

	proposalUUID, err := uuid.Parse(proposalID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid proposal ID",
			"code":  "INVALID_PROPOSAL_ID",
		})
		return
	}

	var req validators.SignProposalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
			"code":  "INVALID_REQUEST",
		})
		return
	}

	if err := validators.ValidateStruct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Validation failed",
			"code":    "VALIDATION_ERROR",
			"details": err.Error(),
		})
		return
	}

	var proposal models.Proposal
	if err := database.DB.Preload("Safe").First(&proposal, proposalUUID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Proposal not found",
			"code":  "PROPOSAL_NOT_FOUND",
		})
		return
	}

	// 检查提案状态
	if proposal.Status != "pending" {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Proposal is not in pending status",
			"code":  "INVALID_STATUS",
		})
		return
	}

	// 检查用户是否为 Safe 的所有者
	// 需要通过用户的钱包地址来检查，而不是用户ID
	var user models.User
	if err := database.DB.First(&user, userID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get user information",
			"code":  "USER_ERROR",
		})
		return
	}

	// 检查用户是否有钱包地址
	if user.WalletAddress == nil || *user.WalletAddress == "" {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "User must have a wallet address to sign proposals",
			"code":  "NO_WALLET_ADDRESS",
		})
		return
	}

	// 检查用户的钱包地址是否在Safe的所有者列表中
	isOwner := false
	userWalletAddress := strings.ToLower(*user.WalletAddress)
	
	// 添加详细调试日志
	log.Printf("=== Safe所有者验证调试 ===")
	log.Printf("用户钱包地址: %s", userWalletAddress)
	log.Printf("Safe ID: %s", proposal.Safe.ID)
	log.Printf("Safe地址: %s", proposal.Safe.Address)
	log.Printf("Safe所有者列表长度: %d", len(proposal.Safe.Owners))
	for i, owner := range proposal.Safe.Owners {
		log.Printf("所有者 %d: %s", i+1, strings.ToLower(owner))
		if strings.ToLower(owner) == userWalletAddress {
			isOwner = true
			log.Printf("✅ 找到匹配的所有者")
			break
		}
	}
	
	if !isOwner {
		log.Printf("❌ 用户不是Safe所有者，拒绝签名")
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Only safe owners can sign proposals",
			"code":  "NOT_AUTHORIZED",
			"debug": gin.H{
				"user_wallet": userWalletAddress,
				"safe_owners": proposal.Safe.Owners,
			},
		})
		return
	}
	
	log.Printf("✅ 用户验证通过，允许签名")

	// 检查用户是否已经签名
	var existingSignature models.Signature
	if err := database.DB.Where("proposal_id = ? AND signer_id = ?", proposalUUID, userID).
		First(&existingSignature).Error; err == nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "User has already signed this proposal",
		})
		return
	}

	// 获取签名时使用的nonce和交易哈希
	var usedNonce *int64
	var safeTxHash *string
	
	if req.UsedNonce != nil {
		nonce := int64(*req.UsedNonce)
		usedNonce = &nonce
	}
	
	if req.SafeTxHash != "" {
		safeTxHash = &req.SafeTxHash
	}

	// 创建签名记录
	signature := models.Signature{
		ProposalID:    proposalUUID,
		SignerID:      userID.(uuid.UUID),
		SignatureData: req.SignatureData,
		SignatureType: req.SignatureType,
		Status:        "valid",
		UsedNonce:     usedNonce,
		SafeTxHash:    safeTxHash,
	}

	// 验证签名数据格式
	if strings.HasPrefix(req.SignatureData, "0x") && len(req.SignatureData) == 132 {
		// 正确的EIP-712签名格式：0x + 130个十六进制字符 = 132个字符总长度
		log.Printf("✅ 接收到有效的EIP-712签名: %s", req.SignatureData[:20]+"...")
	} else {
		log.Printf("⚠️  签名格式可能不正确: 长度=%d, 前缀=%s", len(req.SignatureData), req.SignatureData[:10])
	}

	if err := database.DB.Create(&signature).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create signature",
			"code":  "CREATE_ERROR",
		})
		return
	}

	// 更新提案签名计数
	newSignatureCount := proposal.CurrentSignatures + 1
	updates := map[string]interface{}{
		"current_signatures": newSignatureCount,
	}

	// 检查是否达到执行条件
	if newSignatureCount >= proposal.RequiredSignatures {
		updates["status"] = "approved"
	}

	if err := database.DB.Model(&proposal).Updates(updates).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to update proposal",
			"code":  "UPDATE_ERROR",
		})
		return
	}

	// 重新获取更新后的提案信息
	if err := database.DB.Preload("Safe").Preload("Signatures.Signer").First(&proposal, proposalUUID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch updated proposal",
			"code":  "FETCH_ERROR",
		})
		return
	}

	// 如果达到签名阈值，触发工作流引擎进行下一步处理
	if newSignatureCount >= proposal.RequiredSignatures {
		if err := workflow.ExecuteProposal(proposalUUID); err != nil {
			log.Printf("Failed to execute proposal %s: %v", proposalUUID, err)
			// 执行失败不影响签名成功的响应，但记录错误日志
		} else {
			log.Printf("Proposal %s automatically executed after reaching signature threshold", proposalUUID)
		}
	}

	// 返回成功响应
	c.JSON(http.StatusOK, gin.H{
		"message":   "Proposal signed successfully",
		"proposal":  proposal,
		"signature": signature,
	})
}

// GetSignatures 获取提案的所有签名
func GetSignatures(c *gin.Context) {
	proposalID := c.Param("id")
	proposalUUID, err := uuid.Parse(proposalID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid proposal ID",
			"code":  "INVALID_ID",
		})
		return
	}

	var proposal models.Proposal
	if err := database.DB.First(&proposal, proposalUUID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Proposal not found",
			"code":  "NOT_FOUND",
		})
		return
	}

	var signatures []models.Signature
	if err := database.DB.Preload("Signer").Where("proposal_id = ?", proposalUUID).Find(&signatures).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch signatures",
			"code":  "FETCH_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"signatures":          signatures,
		"total":               len(signatures),
		"required_signatures": proposal.RequiredSignatures,
	})
}

// RemoveSignature 移除签名
func RemoveSignature(c *gin.Context) {
	proposalID := c.Param("id")
	signatureID := c.Param("signatureId")

	proposalUUID, err := uuid.Parse(proposalID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid proposal ID",
			"code":  "INVALID_ID",
		})
		return
	}

	signatureUUID, err := uuid.Parse(signatureID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid signature ID",
			"code":  "INVALID_ID",
		})
		return
	}

	// 验证用户权限
	userID, _ := c.Get("user_id")
	var signature models.Signature
	if err := database.DB.Where("id = ? AND proposal_id = ? AND signer_id = ?",
		signatureUUID, proposalUUID, userID).First(&signature).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Signature not found or no permission",
			"code":  "NOT_FOUND",
		})
		return
	}

	// 删除签名
	if err := database.DB.Delete(&signature).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to remove signature",
			"code":  "DELETE_ERROR",
		})
		return
	}

	// 更新提案签名计数
	var proposal models.Proposal
	if err := database.DB.First(&proposal, proposalUUID).Error; err == nil {
		database.DB.Model(&proposal).Update("current_signatures", proposal.CurrentSignatures-1)
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Signature removed successfully",
	})
}
