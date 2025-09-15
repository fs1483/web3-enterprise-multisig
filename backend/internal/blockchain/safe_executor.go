package blockchain

import (
	"context"
	"crypto/ecdsa"
	"encoding/hex"
	"fmt"
	"log"
	"math/big"
	"sort"
	"strings"

	"github.com/ethereum/go-ethereum"
	"github.com/ethereum/go-ethereum/accounts/abi"
	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/core/types"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/ethereum/go-ethereum/ethclient"
	"github.com/google/uuid"
	"gorm.io/gorm"

	"web3-enterprise-multisig/internal/models"
)

// SafeExecutor 处理Safe合约的交易执行
type SafeExecutor struct {
	client     *ethclient.Client
	privateKey *ecdsa.PrivateKey
	chainID    *big.Int
	db         *gorm.DB
}

// NewSafeExecutor 创建新的Safe执行器
func NewSafeExecutor(client *ethclient.Client, privateKey *ecdsa.PrivateKey, chainID *big.Int, db *gorm.DB) *SafeExecutor {
	return &SafeExecutor{
		client:     client,
		privateKey: privateKey,
		chainID:    chainID,
		db:         db,
	}
}

// ExecuteProposal 执行提案到区块链
func (se *SafeExecutor) ExecuteProposal(proposalID uuid.UUID) error {
	log.Printf("Starting blockchain execution for proposal %s", proposalID)

	// 获取提案信息
	var proposal models.Proposal
	if err := se.db.Preload("Safe").First(&proposal, proposalID).Error; err != nil {
		return fmt.Errorf("failed to get proposal: %v", err)
	}

	// 验证提案状态
	if !proposal.CanExecute() {
		return fmt.Errorf("proposal %s cannot be executed, current status: %s", proposalID, proposal.Status)
	}

	// 获取Safe合约地址
	safeAddress := common.HexToAddress(proposal.Safe.Address)
	log.Printf("Executing proposal on Safe: %s", safeAddress.Hex())

	// 根据提案类型执行不同的逻辑
	var txHash string
	var err error

	// 根据提案数据判断类型
	proposalType := se.determineProposalType(&proposal)

	switch proposalType {
	case "transfer":
		txHash, err = se.executeTransfer(&proposal, safeAddress)
	case "contract_call":
		txHash, err = se.executeContractCall(&proposal, safeAddress)
	case "add_owner":
		txHash, err = se.executeAddOwner(&proposal, safeAddress)
	case "remove_owner":
		txHash, err = se.executeRemoveOwner(&proposal, safeAddress)
	case "change_threshold":
		txHash, err = se.executeChangeThreshold(&proposal, safeAddress)
	default:
		return fmt.Errorf("unsupported proposal type: %s", proposalType)
	}

	if err != nil {
		log.Printf("Failed to execute proposal %s: %v", proposalID, err)
		return err
	}

	// 更新提案状态
	if err := se.updateProposalExecution(&proposal, txHash); err != nil {
		log.Printf("Failed to update proposal status: %v", err)
		return err
	}

	log.Printf("Proposal %s executed successfully, tx hash: %s", proposalID, txHash)
	return nil
}

// executeTransfer 执行转账提案
func (se *SafeExecutor) executeTransfer(proposal *models.Proposal, safeAddress common.Address) (string, error) {
	log.Printf("Executing transfer: %s ETH to %s", proposal.Value, *proposal.ToAddress)

	// 构建交易数据
	toAddress := common.HexToAddress(*proposal.ToAddress)
	value, ok := new(big.Int).SetString(proposal.Value, 10)
	if !ok {
		return "", fmt.Errorf("invalid value: %s", proposal.Value)
	}

	// 企业级nonce管理：动态获取当前Safe nonce
	currentNonce, err := se.getSafeNonce(safeAddress)
	if err != nil {
		return "", fmt.Errorf("failed to get current Safe nonce: %v", err)
	}

	log.Printf("Current Safe nonce: %s", currentNonce.String())

	// 企业级nonce管理：验证签名并处理nonce不匹配情况
	log.Printf("=== 企业级nonce管理：智能签名验证 ===")

	// 首先尝试验证当前nonce的签名
	validSignatures, err := se.validateSignaturesForCurrentNonce(proposal.ID, safeAddress, currentNonce)
	if err != nil {
		return "", fmt.Errorf("failed to validate signatures for current nonce: %v", err)
	}

	log.Printf("Found %d signatures valid for current nonce %s", len(validSignatures), currentNonce.String())

	// 如果当前nonce的签名不足，检查是否有其他nonce的签名可用
	if len(validSignatures) < int(proposal.RequiredSignatures) {
		log.Printf("⚠️ 当前nonce %s的签名不足 (%d/%d)，检查是否需要重新签名",
			currentNonce.String(), len(validSignatures), proposal.RequiredSignatures)

		// 查询所有签名，分析nonce分布
		var allSignatures []models.Signature
		err = se.db.Preload("Signer").Where("proposal_id = ? AND status = ?", proposal.ID, "valid").
			Find(&allSignatures).Error
		if err == nil && len(allSignatures) > 0 {
			log.Printf("📊 签名nonce分布分析:")
			nonceCount := make(map[string]int)
			for _, sig := range allSignatures {
				if sig.UsedNonce != nil {
					nonce := big.NewInt(*sig.UsedNonce).String()
					nonceCount[nonce]++
					walletAddr := "unknown"
					if sig.Signer.WalletAddress != nil {
						walletAddr = *sig.Signer.WalletAddress
					}
					log.Printf("  - 签名者 %s 使用nonce %s", walletAddr, nonce)
				}
			}

			for nonce, count := range nonceCount {
				log.Printf("  - Nonce %s: %d个签名", nonce, count)
			}
		}

		return "", fmt.Errorf("insufficient valid signatures for current nonce %s. Need %d, have %d. 请用户使用当前nonce %s重新签名",
			currentNonce.String(), proposal.RequiredSignatures, len(validSignatures), currentNonce.String())
	}

	// 执行Safe交易，使用验证过的签名
	txHash, err := se.executeSafeTransaction(
		safeAddress,
		toAddress,
		value,
		[]byte{}, // 转账不需要data
		currentNonce,
		proposal.ID,
	)

	if err != nil {
		return "", fmt.Errorf("failed to execute transfer: %v", err)
	}

	return txHash, nil
}

// executeContractCall 执行合约调用提案
func (se *SafeExecutor) executeContractCall(proposal *models.Proposal, safeAddress common.Address) (string, error) {
	log.Printf("Executing contract call to %s", *proposal.ToAddress)

	toAddress := common.HexToAddress(*proposal.ToAddress)
	value, ok := new(big.Int).SetString(proposal.Value, 10)
	if !ok {
		return "", fmt.Errorf("invalid value: %s", proposal.Value)
	}

	// 解析合约调用数据
	var data []byte
	if proposal.Data != nil {
		data = common.FromHex(*proposal.Data)
	}

	// 获取Safe nonce
	nonce, err := se.getSafeNonce(safeAddress)
	if err != nil {
		return "", fmt.Errorf("failed to get Safe nonce: %v", err)
	}

	// 执行Safe交易
	txHash, err := se.executeSafeTransaction(
		safeAddress,
		toAddress,
		value,
		data,
		nonce,
		proposal.ID,
	)

	if err != nil {
		return "", fmt.Errorf("failed to execute contract call: %v", err)
	}

	return txHash, nil
}

// executeAddOwner 执行添加所有者提案
func (se *SafeExecutor) executeAddOwner(proposal *models.Proposal, safeAddress common.Address) (string, error) {
	log.Printf("Adding owner %s to Safe", *proposal.ToAddress)

	// 构建addOwnerWithThreshold调用数据
	safeABI := getSafeABI()
	newOwner := common.HexToAddress(*proposal.ToAddress)
	threshold := big.NewInt(int64(proposal.Safe.Threshold)) // 保持当前阈值

	data, err := safeABI.Pack("addOwnerWithThreshold", newOwner, threshold)
	if err != nil {
		return "", fmt.Errorf("failed to pack addOwnerWithThreshold: %v", err)
	}

	// 获取Safe nonce - 修复硬编码问题
	nonce, err := se.getSafeNonce(safeAddress)
	if err != nil {
		return "", fmt.Errorf("failed to get Safe nonce: %v", err)
	}
	log.Printf("Using current Safe nonce=%s for add owner", nonce.String())

	// 执行Safe交易（调用自身）
	txHash, err := se.executeSafeTransaction(
		safeAddress,
		safeAddress, // 调用自身
		big.NewInt(0),
		data,
		nonce,
		proposal.ID,
	)

	if err != nil {
		return "", fmt.Errorf("failed to add owner: %v", err)
	}

	return txHash, nil
}

// executeRemoveOwner 执行移除所有者提案
func (se *SafeExecutor) executeRemoveOwner(proposal *models.Proposal, safeAddress common.Address) (string, error) {
	log.Printf("Removing owner %s from Safe", *proposal.ToAddress)

	// 获取当前所有者列表
	owners, err := se.getSafeOwners(safeAddress)
	if err != nil {
		return "", fmt.Errorf("failed to get Safe owners: %v", err)
	}

	// 找到要移除的所有者的前一个所有者
	ownerToRemove := common.HexToAddress(*proposal.ToAddress)
	var prevOwner common.Address

	for i, owner := range owners {
		if owner == ownerToRemove {
			if i == 0 {
				prevOwner = common.HexToAddress("0x0000000000000000000000000000000000000001") // SENTINEL_OWNERS
			} else {
				prevOwner = owners[i-1]
			}
			break
		}
	}

	// 构建removeOwner调用数据
	safeABI := getSafeABI()
	threshold := big.NewInt(int64(proposal.Safe.Threshold))

	data, err := safeABI.Pack("removeOwner", prevOwner, ownerToRemove, threshold)
	if err != nil {
		return "", fmt.Errorf("failed to pack removeOwner: %v", err)
	}

	// 获取Safe nonce
	nonce, err := se.getSafeNonce(safeAddress)
	if err != nil {
		return "", fmt.Errorf("failed to get Safe nonce: %v", err)
	}

	// 执行Safe交易
	txHash, err := se.executeSafeTransaction(
		safeAddress,
		safeAddress,
		big.NewInt(0),
		data,
		nonce,
		proposal.ID,
	)

	if err != nil {
		return "", fmt.Errorf("failed to remove owner: %v", err)
	}

	return txHash, nil
}

// executeChangeThreshold 执行修改阈值提案
func (se *SafeExecutor) executeChangeThreshold(proposal *models.Proposal, safeAddress common.Address) (string, error) {
	newThreshold := big.NewInt(int64(proposal.RequiredSignatures))
	log.Printf("Changing Safe threshold to %s", newThreshold.String())

	// 构建changeThreshold调用数据
	safeABI := getSafeABI()
	data, err := safeABI.Pack("changeThreshold", newThreshold)
	if err != nil {
		return "", fmt.Errorf("failed to pack changeThreshold: %v", err)
	}

	// 获取Safe nonce
	nonce, err := se.getSafeNonce(safeAddress)
	if err != nil {
		return "", fmt.Errorf("failed to get Safe nonce: %v", err)
	}

	// 执行Safe交易
	txHash, err := se.executeSafeTransaction(
		safeAddress,
		safeAddress,
		big.NewInt(0),
		data,
		nonce,
		proposal.ID,
	)

	if err != nil {
		return "", fmt.Errorf("failed to change threshold: %v", err)
	}

	return txHash, nil
}

// executeSafeTransaction 执行Safe交易的核心方法
func (se *SafeExecutor) executeSafeTransaction(
	safeAddress, to common.Address,
	value *big.Int,
	data []byte,
	nonce *big.Int,
	proposalID uuid.UUID,
) (string, error) {
	log.Printf("=== 开始执行Safe交易 ===")
	log.Printf("Safe地址: %s", safeAddress.Hex())
	log.Printf("目标地址: %s", to.Hex())
	log.Printf("转账金额: %s wei", value.String())
	log.Printf("交易数据: %x", data)
	log.Printf("Safe Nonce: %s", nonce.String())
	log.Printf("提案ID: %s", proposalID.String())

	// Safe交易参数
	operation := uint8(0) // CALL
	safeTxGas := big.NewInt(0)
	baseGas := big.NewInt(0)
	gasPrice := big.NewInt(0)
	gasToken := common.Address{}
	refundReceiver := common.Address{}

	log.Printf("Safe交易参数:")
	log.Printf("  - operation: %d", operation)
	log.Printf("  - safeTxGas: %s", safeTxGas.String())
	log.Printf("  - baseGas: %s", baseGas.String())
	log.Printf("  - gasPrice: %s", gasPrice.String())
	log.Printf("  - gasToken: %s", gasToken.Hex())
	log.Printf("  - refundReceiver: %s", refundReceiver.Hex())

	// 构建Safe交易哈希 - 使用统一的buildSafeTxHash方法
	safeTxHash := se.buildSafeTxHash(safeAddress, to, value, data, nonce)
	log.Printf("Safe交易哈希: %s", safeTxHash.Hex())

	// 收集提案的所有签名
	signatures, err := se.collectProposalSignatures(proposalID, safeTxHash)
	if err != nil {
		return "", fmt.Errorf("failed to collect signatures: %v", err)
	}
	log.Printf("收集到签名数据: %x (长度: %d字节)", signatures, len(signatures))

	// 构建execTransaction调用
	safeABI := getSafeABI()
	log.Printf("准备调用execTransaction，参数:")
	log.Printf("  - to: %s", to.Hex())
	log.Printf("  - value: %s", value.String())
	log.Printf("  - data: %x", data)
	log.Printf("  - operation: %d", operation)
	log.Printf("  - safeTxGas: %s", safeTxGas.String())
	log.Printf("  - baseGas: %s", baseGas.String())
	log.Printf("  - gasPrice: %s", gasPrice.String())
	log.Printf("  - gasToken: %s", gasToken.Hex())
	log.Printf("  - refundReceiver: %s", refundReceiver.Hex())
	log.Printf("  - signatures: %x", signatures)

	execData, err := safeABI.Pack(
		"execTransaction",
		to, value, data, operation,
		safeTxGas, baseGas, gasPrice,
		gasToken, refundReceiver, signatures,
	)
	if err != nil {
		return "", fmt.Errorf("failed to pack execTransaction: %v", err)
	}
	log.Printf("execTransaction编码数据: %x (长度: %d字节)", execData, len(execData))

	// 获取当前nonce
	ctx := context.Background()
	fromAddress := crypto.PubkeyToAddress(se.privateKey.PublicKey)
	log.Printf("发送方地址: %s", fromAddress.Hex())

	nonceUint64, err := se.client.PendingNonceAt(ctx, fromAddress)
	if err != nil {
		return "", fmt.Errorf("failed to get nonce: %v", err)
	}
	log.Printf("发送方nonce: %d", nonceUint64)

	// 获取gas价格
	gasPriceBig, err := se.client.SuggestGasPrice(ctx)
	if err != nil {
		return "", fmt.Errorf("failed to get gas price: %v", err)
	}
	log.Printf("建议gas价格: %s wei", gasPriceBig.String())

	// 估算gas
	gasLimit := uint64(500000) // 设置合理的gas限制
	log.Printf("gas限制: %d", gasLimit)

	tx := types.NewTransaction(
		nonceUint64,
		safeAddress,
		big.NewInt(0), // 调用Safe合约本身不需要发送ETH，ETH由Safe合约内部转账
		gasLimit,
		gasPriceBig,
		execData,
	)
	log.Printf("创建以太坊交易:")
	log.Printf("  - nonce: %d", nonceUint64)
	log.Printf("  - to: %s", safeAddress.Hex())
	log.Printf("  - value: 0 ETH")
	log.Printf("  - gasLimit: %d", gasLimit)
	log.Printf("  - gasPrice: %s", gasPriceBig.String())
	log.Printf("  - data长度: %d字节", len(execData))

	// 签名并发送交易
	signedTx, err := types.SignTx(tx, types.NewEIP155Signer(se.chainID), se.privateKey)
	if err != nil {
		return "", fmt.Errorf("failed to sign transaction: %v", err)
	}
	log.Printf("交易签名成功")

	err = se.client.SendTransaction(ctx, signedTx)
	if err != nil {
		log.Printf("发送交易失败: %v", err)
		return "", fmt.Errorf("failed to send transaction: %v", err)
	}

	txHash := signedTx.Hash().Hex()
	log.Printf("=== 交易发送成功 ===")
	log.Printf("交易哈希: %s", txHash)
	log.Printf("Etherscan链接: https://sepolia.etherscan.io/tx/%s", txHash)

	return txHash, nil
}

// 辅助方法
func (se *SafeExecutor) getSafeNonce(safeAddress common.Address) (*big.Int, error) {
	// 调用Safe合约的nonce方法
	safeABI := getSafeABI()
	data, err := safeABI.Pack("nonce")
	if err != nil {
		return nil, err
	}

	msg := ethereum.CallMsg{
		To:   &safeAddress,
		Data: data,
	}
	result, err := se.client.CallContract(context.Background(), msg, nil)
	if err != nil {
		return nil, err
	}

	nonce := new(big.Int).SetBytes(result)
	return nonce, nil
}

func (se *SafeExecutor) getSafeOwners(safeAddress common.Address) ([]common.Address, error) {
	// 调用Safe合约的getOwners方法
	safeABI := getSafeABI()
	data, err := safeABI.Pack("getOwners")
	if err != nil {
		return nil, err
	}

	msg := ethereum.CallMsg{
		To:   &safeAddress,
		Data: data,
	}
	result, err := se.client.CallContract(context.Background(), msg, nil)
	if err != nil {
		return nil, err
	}

	var owners []common.Address
	err = safeABI.UnpackIntoInterface(&owners, "getOwners", result)
	if err != nil {
		return nil, err
	}

	return owners, nil
}

// 旧的buildSafeTransactionHash方法已移除，统一使用buildSafeTxHash

func (se *SafeExecutor) updateProposalExecution(proposal *models.Proposal, txHash string) error {
	updates := map[string]interface{}{
		"status":  "executed",
		"tx_hash": txHash,
	}

	return se.db.Model(proposal).Updates(updates).Error
}

// determineProposalType 根据提案数据判断提案类型
func (se *SafeExecutor) determineProposalType(proposal *models.Proposal) string {
	// 简化的类型判断逻辑
	// 实际应用中可以根据更复杂的规则判断

	if proposal.Data != nil && len(*proposal.Data) > 2 {
		// 有合约调用数据，判断为合约调用
		return "contract_call"
	}

	if proposal.Value != "0" {
		// 有转账金额，判断为转账
		return "transfer"
	}

	// 默认为转账类型
	return "transfer"
}

// getSafeABI 返回Safe合约的ABI
func getSafeABI() abi.ABI {
	// 官方Safe v1.3.0 ABI定义，确保与合约完全一致
	abiJSON := `[
		{
			"inputs": [
				{"internalType": "address", "name": "to", "type": "address"},
				{"internalType": "uint256", "name": "value", "type": "uint256"},
				{"internalType": "bytes", "name": "data", "type": "bytes"},
				{"internalType": "uint8", "name": "operation", "type": "uint8"},
				{"internalType": "uint256", "name": "safeTxGas", "type": "uint256"},
				{"internalType": "uint256", "name": "baseGas", "type": "uint256"},
				{"internalType": "uint256", "name": "gasPrice", "type": "uint256"},
				{"internalType": "address", "name": "gasToken", "type": "address"},
				{"internalType": "address", "name": "refundReceiver", "type": "address"},
				{"internalType": "bytes", "name": "signatures", "type": "bytes"}
			],
			"name": "execTransaction",
			"outputs": [{"internalType": "bool", "name": "success", "type": "bool"}],
			"stateMutability": "payable",
			"type": "function"
		},
		{
			"inputs": [],
			"name": "nonce",
			"outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
			"stateMutability": "view",
			"type": "function"
		},
		{
			"inputs": [],
			"name": "getOwners",
			"outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
			"stateMutability": "view",
			"type": "function"
		},
		{
			"inputs": [],
			"name": "getThreshold",
			"outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
			"stateMutability": "view",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "address", "name": "owner", "type": "address"},
				{"internalType": "uint256", "name": "_threshold", "type": "uint256"}
			],
			"name": "addOwnerWithThreshold",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "address", "name": "prevOwner", "type": "address"},
				{"internalType": "address", "name": "owner", "type": "address"},
				{"internalType": "uint256", "name": "_threshold", "type": "uint256"}
			],
			"name": "removeOwner",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		},
		{
			"inputs": [
				{"internalType": "uint256", "name": "_threshold", "type": "uint256"}
			],
			"name": "changeThreshold",
			"outputs": [],
			"stateMutability": "nonpayable",
			"type": "function"
		}
	]`

	parsedABI, _ := abi.JSON(strings.NewReader(abiJSON))
	return parsedABI
}

// collectProposalSignatures 从数据库收集提案的所有签名并验证其有效性
func (se *SafeExecutor) collectProposalSignatures(proposalID uuid.UUID, safeTxHash common.Hash) ([]byte, error) {
	log.Printf("=== 开始收集提案签名 ===")
	log.Printf("提案ID: %s", proposalID.String())
	log.Printf("Safe交易哈希: %s", safeTxHash.Hex())

	var signatures []models.Signature
	err := se.db.Preload("Signer").Where("proposal_id = ? AND status = ?", proposalID, "valid").
		Find(&signatures).Error
	if err != nil {
		return nil, fmt.Errorf("failed to query signatures: %v", err)
	}

	if len(signatures) == 0 {
		return nil, fmt.Errorf("no valid signatures found for proposal")
	}

	log.Printf("从数据库查询到 %d 个有效签名", len(signatures))

	// 验证签名的有效性结构
	type ValidatedSignature struct {
		Address   common.Address
		Signature []byte
		Original  models.Signature
	}

	var validatedSigs []ValidatedSignature

	// 验证每个签名
	for i, sig := range signatures {
		log.Printf("验证签名 %d:", i+1)

		// 验证签名数据格式
		if sig.SignatureData == "" {
			log.Printf("  ❌ 签名数据为空，跳过")
			continue
		}

		// 获取签名者钱包地址
		if sig.Signer.WalletAddress == nil {
			log.Printf("  ❌ 签名者钱包地址为空，跳过")
			continue
		}
		expectedSigner := common.HexToAddress(*sig.Signer.WalletAddress)
		log.Printf("  - 期望签名者: %s", expectedSigner.Hex())

		// 移除0x前缀并解码
		sigData := strings.TrimPrefix(sig.SignatureData, "0x")
		sigBytes, err := hex.DecodeString(sigData)
		if err != nil {
			log.Printf("  ❌ 签名解码失败: %v", err)
			continue
		}

		// 验证签名长度
		if len(sigBytes) != 65 {
			log.Printf("  ❌ 签名长度无效: %d字节，期望65字节", len(sigBytes))
			continue
		}

		// 关键修复：验证签名是否针对当前safeTxHash
		recoveredAddr, err := se.recoverSignerFromSignature(safeTxHash, sigBytes)
		if err != nil {
			log.Printf("  ❌ 签名恢复失败: %v", err)
			log.Printf("    签名数据: %x", sigBytes)
			log.Printf("    SafeTxHash: %s", safeTxHash.Hex())
			continue
		}

		log.Printf("  - 恢复的签名者: %s", recoveredAddr.Hex())

		// 验证恢复的地址与期望的签名者地址匹配 (大小写不敏感)
		if !strings.EqualFold(recoveredAddr.Hex(), expectedSigner.Hex()) {
			log.Printf("  ❌ 签名者地址不匹配:")
			log.Printf("    期望: %s", expectedSigner.Hex())
			log.Printf("    实际: %s", recoveredAddr.Hex())

			// 检查签名是否记录了SafeTxHash，用于调试
			if sig.SafeTxHash != nil {
				log.Printf("    记录的SafeTxHash: %s", *sig.SafeTxHash)
				log.Printf("    当前SafeTxHash:   %s", safeTxHash.Hex())
				if !strings.EqualFold(*sig.SafeTxHash, safeTxHash.Hex()) {
					log.Printf("    ⚠️ SafeTxHash不匹配，可能是nonce变化导致")
				}
			}
			continue
		}

		// 处理v值以符合Safe合约要求
		processedSig := make([]byte, 65)
		copy(processedSig, sigBytes)

		// Safe合约签名v值处理
		if processedSig[64] == 0 || processedSig[64] == 1 {
			processedSig[64] += 27
		} else if processedSig[64] > 30 {
			if processedSig[64]%2 == 0 {
				processedSig[64] = 28
			} else {
				processedSig[64] = 27
			}
		}

		log.Printf("  ✅ 签名验证通过:")
		log.Printf("    - 签名者地址: %s", recoveredAddr.Hex())
		log.Printf("    - r: %x", processedSig[:32])
		log.Printf("    - s: %x", processedSig[32:64])
		log.Printf("    - v: %d", processedSig[64])

		validatedSigs = append(validatedSigs, ValidatedSignature{
			Address:   recoveredAddr,
			Signature: processedSig,
			Original:  sig,
		})
	}

	if len(validatedSigs) == 0 {
		return nil, fmt.Errorf("no valid signatures after verification - all signatures failed validation against safeTxHash %s", safeTxHash.Hex())
	}

	// 按签名者地址排序（Safe合约要求）
	sort.Slice(validatedSigs, func(i, j int) bool {
		return strings.ToLower(validatedSigs[i].Address.Hex()) < strings.ToLower(validatedSigs[j].Address.Hex())
	})

	log.Printf("签名按地址排序完成")

	// 组合最终签名数据
	var combinedSignatures []byte
	for i, validSig := range validatedSigs {
		log.Printf("添加签名 %d: %s", i+1, validSig.Address.Hex())
		combinedSignatures = append(combinedSignatures, validSig.Signature...)
	}

	log.Printf("=== 签名收集和验证完成 ===")
	log.Printf("验证通过的签名数量: %d", len(validatedSigs))
	log.Printf("合并后签名总长度: %d字节", len(combinedSignatures))
	log.Printf("合并签名数据: %x", combinedSignatures)

	return combinedSignatures, nil
}

// recoverSignerFromSignature 从签名中恢复签名者地址
func (se *SafeExecutor) recoverSignerFromSignature(hash common.Hash, signature []byte) (common.Address, error) {
	if len(signature) != 65 {
		return common.Address{}, fmt.Errorf("invalid signature length: %d", len(signature))
	}

	// 复制签名以避免修改原始数据
	sig := make([]byte, 65)
	copy(sig, signature)

	// 详细日志记录签名数据
	log.Printf("    原始签名长度: %d", len(signature))
	log.Printf("    原始v值: %d", signature[64])

	// 处理v值 - EIP-712签名通常使用27/28，需要转换为0/1
	v := sig[64]

	// 尝试不同的v值处理方式
	if v == 27 || v == 28 {
		sig[64] = v - 27 // 标准以太坊签名：27/28 -> 0/1
	} else if v == 0 || v == 1 {
		// 已经是正确格式，无需修改
	} else if v > 28 {
		// 处理EIP-155格式的v值
		sig[64] = (v - 35) % 2
	} else {
		log.Printf("    尝试使用原始v值: %d", v)
	}

	log.Printf("    处理后v值: %d", sig[64])

	// 确保v值在有效范围内
	if sig[64] > 1 {
		// 尝试其他可能的v值
		for tryV := 0; tryV <= 1; tryV++ {
			sig[64] = byte(tryV)
			pubKey, err := crypto.Ecrecover(hash.Bytes(), sig)
			if err == nil {
				pubKeyECDSA, err := crypto.UnmarshalPubkey(pubKey)
				if err == nil {
					address := crypto.PubkeyToAddress(*pubKeyECDSA)
					log.Printf("    成功使用v=%d恢复地址: %s", tryV, address.Hex())
					return address, nil
				}
			}
		}
		return common.Address{}, fmt.Errorf("invalid recovery id after all attempts: original=%d", v)
	}

	// 使用go-ethereum的crypto.Ecrecover恢复公钥
	pubKey, err := crypto.Ecrecover(hash.Bytes(), sig)
	if err != nil {
		return common.Address{}, fmt.Errorf("failed to recover public key: %v", err)
	}

	// 从公钥计算地址
	pubKeyECDSA, err := crypto.UnmarshalPubkey(pubKey)
	if err != nil {
		return common.Address{}, fmt.Errorf("failed to unmarshal public key: %v", err)
	}

	address := crypto.PubkeyToAddress(*pubKeyECDSA)
	return address, nil
}

// validateSignaturesForCurrentNonce 验证签名是否对当前Safe nonce有效
func (se *SafeExecutor) validateSignaturesForCurrentNonce(proposalID uuid.UUID, safeAddress common.Address, currentNonce *big.Int) ([]models.Signature, error) {
	log.Printf("=== 企业级nonce管理：验证签名对当前nonce %s的有效性 ===", currentNonce.String())

	// 1. 查询提案信息
	var proposal models.Proposal
	err := se.db.First(&proposal, "id = ?", proposalID).Error
	if err != nil {
		return nil, fmt.Errorf("failed to query proposal: %v", err)
	}

	// 2. 查询提案的所有有效签名，包含nonce信息
	var signatures []models.Signature
	err = se.db.Preload("Signer").Where("proposal_id = ? AND status = ?", proposalID, "valid").
		Find(&signatures).Error
	if err != nil {
		return nil, fmt.Errorf("failed to query signatures: %v", err)
	}

	log.Printf("Found %d signatures to validate", len(signatures))

	// 3. 构建当前nonce的SafeTxHash用于验证
	toAddress := common.HexToAddress(*proposal.ToAddress)
	value, _ := new(big.Int).SetString(proposal.Value, 10)

	safeTxHash := se.buildSafeTxHash(
		safeAddress,
		toAddress,
		value,
		[]byte{}, // 转账无data
		currentNonce,
	)

	log.Printf("Expected SafeTxHash for nonce %s: %s", currentNonce.String(), safeTxHash.Hex())

	// 4. 验证签名
	var validSignatures []models.Signature

	for _, sig := range signatures {
		walletAddr := "unknown"
		if sig.Signer.WalletAddress != nil {
			walletAddr = *sig.Signer.WalletAddress
		}

		// 检查签名是否记录了使用的nonce
		if sig.UsedNonce == nil {
			log.Printf("  ⚠️  签名缺少nonce记录，跳过: signer=%s", walletAddr)
			continue
		}

		sigNonce := big.NewInt(*sig.UsedNonce)

		// 只验证使用当前nonce的签名
		if sigNonce.Cmp(currentNonce) != 0 {
			log.Printf("  ❌ 签名nonce不匹配: 签名nonce=%s, 当前nonce=%s, signer=%s",
				sigNonce.String(), currentNonce.String(), walletAddr)
			continue
		}

		// 验证签名的SafeTxHash
		if sig.SafeTxHash != nil {
			log.Printf("  📝 记录的SafeTxHash: %s", *sig.SafeTxHash)
		}

		// 解码签名数据
		sigData := strings.TrimPrefix(sig.SignatureData, "0x")
		sigBytes, err := hex.DecodeString(sigData)
		if err != nil {
			log.Printf("  ❌ 签名解码失败: %v", err)
			continue
		}

		// 验证签名长度
		if len(sigBytes) != 65 {
			log.Printf("  ❌ 签名长度无效: %d字节，期望65字节", len(sigBytes))
			continue
		}

		// 恢复签名者地址
		recoveredAddr, err := se.recoverSignerFromSignature(safeTxHash, sigBytes)
		if err != nil {
			log.Printf("  ❌ 签名恢复失败: %v", err)
			continue
		}

		expectedSigner := common.HexToAddress(walletAddr)
		log.Printf("  🔍 期望签名者: %s, 恢复的签名者: %s", expectedSigner.Hex(), recoveredAddr.Hex())

		// 验证恢复的地址与期望的签名者地址匹配 (大小写不敏感)
		if !strings.EqualFold(recoveredAddr.Hex(), expectedSigner.Hex()) {
			log.Printf("  ❌ 签名者地址不匹配:")
			log.Printf("    期望: %s", expectedSigner.Hex())
			log.Printf("    实际: %s", recoveredAddr.Hex())
			continue
		}

		log.Printf("  ✅ 签名验证成功: nonce=%s, signer=%s", sigNonce.String(), walletAddr)
		validSignatures = append(validSignatures, sig)
	}

	log.Printf("=== 企业级nonce验证完成：%d/%d 签名对当前nonce %s有效 ===",
		len(validSignatures), len(signatures), currentNonce.String())

	return validSignatures, nil
}

// buildSafeTxHash 构建Safe交易哈希 - 修复版本，与前端EIP-712逻辑完全一致
func (se *SafeExecutor) buildSafeTxHash(safeAddress, to common.Address, value *big.Int, data []byte, nonce *big.Int) common.Hash {
	log.Printf("=== 构建SafeTxHash (修复版本) ===")
	log.Printf("Safe地址: %s", safeAddress.Hex())
	log.Printf("目标地址: %s", to.Hex())
	log.Printf("转账金额: %s wei", value.String())
	log.Printf("数据长度: %d bytes", len(data))
	log.Printf("Nonce: %s", nonce.String())

	// 1. EIP-712 Domain Separator - 与前端完全一致
	domainTypeHash := crypto.Keccak256([]byte("EIP712Domain(uint256 chainId,address verifyingContract)"))
	chainIdBytes := common.LeftPadBytes(big.NewInt(11155111).Bytes(), 32) // Sepolia
	verifyingContractBytes := common.LeftPadBytes(safeAddress.Bytes(), 32)

	domainSeparator := crypto.Keccak256Hash(
		domainTypeHash,
		chainIdBytes,
		verifyingContractBytes,
	)

	log.Printf("Domain separator: %s", domainSeparator.Hex())

	// 2. SafeTx TypeHash - 与前端完全一致
	safeTxTypeHash := crypto.Keccak256([]byte("SafeTx(address to,uint256 value,bytes data,uint8 operation,uint256 safeTxGas,uint256 baseGas,uint256 gasPrice,address gasToken,address refundReceiver,uint256 nonce)"))

	log.Printf("SafeTx TypeHash: %s", common.BytesToHash(safeTxTypeHash).Hex())

	// 3. 构建SafeTx结构体哈希 - 与前端参数完全一致
	// 确保data为空时使用空字节数组
	if data == nil {
		data = []byte{}
	}
	dataHash := crypto.Keccak256(data)

	// 构建结构体哈希的所有字段
	structHashData := [][]byte{
		safeTxTypeHash,                                    // typeHash
		common.LeftPadBytes(to.Bytes(), 32),               // to
		common.LeftPadBytes(value.Bytes(), 32),            // value
		common.LeftPadBytes(dataHash, 32),                 // keccak256(data)
		common.LeftPadBytes([]byte{0}, 32),                // operation = 0 (CALL)
		common.LeftPadBytes(big.NewInt(0).Bytes(), 32),    // safeTxGas = 0
		common.LeftPadBytes(big.NewInt(0).Bytes(), 32),    // baseGas = 0
		common.LeftPadBytes(big.NewInt(0).Bytes(), 32),    // gasPrice = 0
		common.LeftPadBytes(common.Address{}.Bytes(), 32), // gasToken = 0x0
		common.LeftPadBytes(common.Address{}.Bytes(), 32), // refundReceiver = 0x0
		common.LeftPadBytes(nonce.Bytes(), 32),            // nonce
	}

	// 合并所有字段
	var combined []byte
	for _, field := range structHashData {
		combined = append(combined, field...)
	}

	structHash := crypto.Keccak256(combined)
	log.Printf("Struct hash: %s", common.BytesToHash(structHash).Hex())

	// 4. 最终EIP-712哈希 - 与前端完全一致
	finalHashData := []byte{}
	finalHashData = append(finalHashData, []byte("\x19\x01")...)
	finalHashData = append(finalHashData, domainSeparator.Bytes()...)
	finalHashData = append(finalHashData, structHash...)

	finalHash := crypto.Keccak256Hash(finalHashData)

	log.Printf("=== SafeTxHash构建完成 ===")
	log.Printf("最终哈希: %s", finalHash.Hex())

	return finalHash
}
