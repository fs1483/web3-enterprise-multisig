package blockchain

import (
    "fmt"
    "math/big"

    "github.com/ethereum/go-ethereum/common"
    "github.com/ethereum/go-ethereum/common/hexutil"
    "github.com/ethereum/go-ethereum/crypto"
)

type SignatureValidator struct {
    chainID *big.Int
}

func NewSignatureValidator(chainID *big.Int) *SignatureValidator {
    return &SignatureValidator{
        chainID: chainID,
    }
}

// VerifySignature 验证以太坊签名
func (sv *SignatureValidator) VerifySignature(
    message []byte,
    signature string,
    expectedSigner common.Address,
) (bool, error) {
    // 解析签名
    sigBytes, err := hexutil.Decode(signature)
    if err != nil {
        return false, fmt.Errorf("invalid signature format: %w", err)
    }

    if len(sigBytes) != 65 {
        return false, fmt.Errorf("invalid signature length: expected 65, got %d", len(sigBytes))
    }

    // 调整 v 值（以太坊签名格式）
    if sigBytes[64] < 27 {
        sigBytes[64] += 27
    }

    // 创建消息哈希（以太坊签名消息格式）
    messageHash := crypto.Keccak256Hash(
        []byte(fmt.Sprintf("\x19Ethereum Signed Message:\n%d", len(message))),
        message,
    )

    // 恢复公钥
    sigBytes[64] -= 27 // 调整回 0/1 格式
    pubKey, err := crypto.SigToPub(messageHash.Bytes(), sigBytes)
    if err != nil {
        return false, fmt.Errorf("failed to recover public key: %w", err)
    }

    // 获取签名者地址
    signerAddress := crypto.PubkeyToAddress(*pubKey)

    // 验证签名者
    return signerAddress == expectedSigner, nil
}

// RecoverSigner 从签名中恢复签名者地址
func (sv *SignatureValidator) RecoverSigner(messageHash []byte, signature string) (common.Address, error) {
    sigBytes, err := hexutil.Decode(signature)
    if err != nil {
        return common.Address{}, fmt.Errorf("invalid signature format: %w", err)
    }

    if len(sigBytes) != 65 {
        return common.Address{}, fmt.Errorf("invalid signature length")
    }

    // 调整 v 值
    if sigBytes[64] < 27 {
        sigBytes[64] += 27
    }
    sigBytes[64] -= 27

    pubKey, err := crypto.SigToPub(messageHash, sigBytes)
    if err != nil {
        return common.Address{}, fmt.Errorf("failed to recover public key: %w", err)
    }

    return crypto.PubkeyToAddress(*pubKey), nil
}

// GenerateMessageHash 生成消息哈希
func (sv *SignatureValidator) GenerateMessageHash(message []byte) common.Hash {
    return crypto.Keccak256Hash(
        []byte(fmt.Sprintf("\x19Ethereum Signed Message:\n%d", len(message))),
        message,
    )
}
