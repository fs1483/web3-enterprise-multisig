package blockchain

import (
	"encoding/json"
	"fmt"
	"math/big"
	"net/http"
	"time"

	"github.com/ethereum/go-ethereum/common"
	"github.com/ethereum/go-ethereum/crypto"
)

type SafeService struct {
	client     *EthereumClient
	validator  *SignatureValidator
	serviceURL string
	httpClient *http.Client
}

type SafeTransaction struct {
	To             common.Address `json:"to"`
	Value          *big.Int       `json:"value"`
	Data           []byte         `json:"data"`
	Operation      uint8          `json:"operation"`
	SafeTxGas      *big.Int       `json:"safeTxGas"`
	BaseGas        *big.Int       `json:"baseGas"`
	GasPrice       *big.Int       `json:"gasPrice"`
	GasToken       common.Address `json:"gasToken"`
	RefundReceiver common.Address `json:"refundReceiver"`
	Nonce          *big.Int       `json:"nonce"`
	Signatures     []byte         `json:"signatures"`
}

type SafeInfo struct {
	Address   common.Address   `json:"address"`
	Nonce     *big.Int         `json:"nonce"`
	Threshold *big.Int         `json:"threshold"`
	Owners    []common.Address `json:"owners"`
	Version   string           `json:"version"`
}

func NewSafeService(client *EthereumClient, serviceURL string) *SafeService {
	return &SafeService{
		client:     client,
		validator:  NewSignatureValidator(client.chainID),
		serviceURL: serviceURL,
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// BuildTransactionHash 构建交易哈希
func (ss *SafeService) BuildTransactionHash(
	safeAddress common.Address,
	tx *SafeTransaction,
) (common.Hash, error) {
	// Safe 交易哈希计算
	// 这里简化实现，实际应该按照 Safe 合约的 encodeTransactionData 方法

	data := []byte{}
	data = append(data, safeAddress.Bytes()...)
	data = append(data, tx.To.Bytes()...)
	data = append(data, common.LeftPadBytes(tx.Value.Bytes(), 32)...)
	data = append(data, tx.Data...)
	data = append(data, byte(tx.Operation))
	data = append(data, common.LeftPadBytes(tx.SafeTxGas.Bytes(), 32)...)
	data = append(data, common.LeftPadBytes(tx.BaseGas.Bytes(), 32)...)
	data = append(data, common.LeftPadBytes(tx.GasPrice.Bytes(), 32)...)
	data = append(data, tx.GasToken.Bytes()...)
	data = append(data, tx.RefundReceiver.Bytes()...)
	data = append(data, common.LeftPadBytes(tx.Nonce.Bytes(), 32)...)

	return crypto.Keccak256Hash(data), nil
}

// ValidateSignatures 验证交易签名
func (ss *SafeService) ValidateSignatures(
	txHash common.Hash,
	signatures []string,
	owners []common.Address,
	threshold int,
) error {
	if len(signatures) < threshold {
		return fmt.Errorf("insufficient signatures: got %d, need %d", len(signatures), threshold)
	}

	validSignatures := 0
	usedOwners := make(map[common.Address]bool)

	for _, sig := range signatures {
		signer, err := ss.validator.RecoverSigner(txHash.Bytes(), sig)
		if err != nil {
			continue
		}

		// 检查签名者是否为所有者
		isOwner := false
		for _, owner := range owners {
			if signer == owner && !usedOwners[owner] {
				isOwner = true
				usedOwners[owner] = true
				break
			}
		}

		if isOwner {
			validSignatures++
		}
	}

	if validSignatures < threshold {
		return fmt.Errorf("insufficient valid signatures: got %d, need %d",
			validSignatures, threshold)
	}

	return nil
}

// ExecuteTransaction 执行 Safe 交易
func (ss *SafeService) ExecuteTransaction(
	safeAddress common.Address,
	tx *SafeTransaction,
) (common.Hash, error) {
	// 这里应该调用 Safe 合约的 execTransaction 方法
	// 简化实现，实际需要构建合约调用

	// 验证交易哈希
	txHash, err := ss.BuildTransactionHash(safeAddress, tx)
	if err != nil {
		return common.Hash{}, fmt.Errorf("failed to build transaction hash: %w", err)
	}

	// 这里应该发送交易到区块链
	// 返回交易哈希
	return txHash, nil
}

// GetSafeInfo 获取 Safe 信息
func (ss *SafeService) GetSafeInfo(safeAddress common.Address) (*SafeInfo, error) {
	url := fmt.Sprintf("%s/api/v1/safes/%s/", ss.serviceURL, safeAddress.Hex())

	resp, err := ss.httpClient.Get(url)
	if err != nil {
		return nil, fmt.Errorf("failed to get safe info: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("safe service returned status %d", resp.StatusCode)
	}

	var safeInfo SafeInfo
	if err := json.NewDecoder(resp.Body).Decode(&safeInfo); err != nil {
		return nil, fmt.Errorf("failed to decode safe info: %w", err)
	}

	return &safeInfo, nil
}
