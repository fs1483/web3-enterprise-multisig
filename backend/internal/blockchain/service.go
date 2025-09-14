package blockchain

import (
	"context"
	"fmt"
	"log"
	"math/big"
	"os"
	"time"

	"github.com/ethereum/go-ethereum/common"
)

type BlockchainService struct {
	client    *EthereumClient
	safe      *SafeService
	validator *SignatureValidator
	config    RetryConfig
}

func NewBlockchainService() (*BlockchainService, error) {
	// 根据环境选择网络配置
	var networkConfig NetworkConfig
	chainID := os.Getenv("CHAIN_ID")

	switch chainID {
	case "11155111":
		networkConfig = SepoliaConfig
	case "31337":
		networkConfig = LocalConfig
	default:
		networkConfig = SepoliaConfig // 默认使用 Sepolia
	}

	// 创建以太坊客户端
	client, err := NewEthereumClient(networkConfig)
	if err != nil {
		return nil, fmt.Errorf("failed to create ethereum client: %w", err)
	}

	// 创建 Safe 服务
	safeServiceURL := os.Getenv("SAFE_SERVICE_URL")
	if safeServiceURL == "" {
		safeServiceURL = "https://safe-transaction-sepolia.safe.global"
	}

	safeService := NewSafeService(client, safeServiceURL)
	validator := NewSignatureValidator(client.chainID)

	return &BlockchainService{
		client:    client,
		safe:      safeService,
		validator: validator,
		config:    DefaultRetryConfig,
	}, nil
}

// ValidateTransactionSignature 验证交易签名
func (bs *BlockchainService) ValidateTransactionSignature(
	txHash string,
	signature string,
	signerAddress string,
) (bool, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	var result bool
	var err error

	retryErr := WithRetry(ctx, bs.config, func() error {
		txHashBytes := common.HexToHash(txHash).Bytes()
		signer := common.HexToAddress(signerAddress)

		result, err = bs.validator.VerifySignature(txHashBytes, signature, signer)
		return err
	})

	if retryErr != nil {
		return false, fmt.Errorf("failed to validate signature: %w", retryErr)
	}

	return result, nil
}

// ExecuteSafeTransaction 执行 Safe 交易
func (bs *BlockchainService) ExecuteSafeTransaction(
	safeAddress string,
	to string,
	value string,
	data string,
	signatures []string,
) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Minute)
	defer cancel()

	var txHash common.Hash

	retryErr := WithRetry(ctx, bs.config, func() error {
		// 构建交易
		valueInt, ok := new(big.Int).SetString(value, 10)
		if !ok {
			return fmt.Errorf("invalid value: %s", value)
		}

		tx := &SafeTransaction{
			To:             common.HexToAddress(to),
			Value:          valueInt,
			Data:           common.FromHex(data),
			Operation:      0, // CALL
			SafeTxGas:      big.NewInt(0),
			BaseGas:        big.NewInt(0),
			GasPrice:       big.NewInt(0),
			GasToken:       common.Address{},
			RefundReceiver: common.Address{},
			Nonce:          big.NewInt(0), // 应该从 Safe 获取
		}

		var err error
		txHash, err = bs.safe.ExecuteTransaction(common.HexToAddress(safeAddress), tx)
		return err
	})

	if retryErr != nil {
		return "", fmt.Errorf("failed to execute transaction: %w", retryErr)
	}

	log.Printf("✅ Transaction executed: %s", txHash.Hex())
	return txHash.Hex(), nil
}

// GetTransactionStatus 获取交易状态
func (bs *BlockchainService) GetTransactionStatus(txHash string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	var status string

	retryErr := WithRetry(ctx, bs.config, func() error {
		hash := common.HexToHash(txHash)
		receipt, err := bs.client.GetTransactionReceipt(hash)
		if err != nil {
			return err
		}

		if receipt.Status == 1 {
			status = "success"
		} else {
			status = "failed"
		}

		return nil
	})

	if retryErr != nil {
		return "pending", nil // 如果获取不到，可能还在pending
	}

	return status, nil
}

// WaitForTransactionConfirmation 等待交易确认
func (bs *BlockchainService) WaitForTransactionConfirmation(
	txHash string,
	timeout time.Duration,
) error {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()

	return WithRetry(ctx, bs.config, func() error {
		hash := common.HexToHash(txHash)
		_, err := bs.client.WaitForTransaction(hash, timeout)
		return err
	})
}
