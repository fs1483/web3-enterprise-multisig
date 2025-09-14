package main

import (
	"log"

	"web3-enterprise-multisig/internal/blockchain"

	"github.com/joho/godotenv"
)

func main() {
	// 加载环境变量
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	log.Println("🧪 Testing blockchain service...")

	// 创建区块链服务
	service, err := blockchain.NewBlockchainService()
	if err != nil {
		log.Fatal("Failed to create blockchain service:", err)
	}

	log.Println("✅ Blockchain service created successfully")

	// 测试签名验证
	txHash := "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef"
	signature := "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef1b"
	signerAddress := "0x1234567890123456789012345678901234567890"

	// 注意：这个测试会失败，因为是假数据
	valid, err := service.ValidateTransactionSignature(txHash, signature, signerAddress)
	if err != nil {
		log.Printf("⚠️ Signature validation test failed (expected): %v", err)
	} else {
		log.Printf("Signature valid: %v", valid)
	}

	log.Println("🎉 Blockchain service test completed")
}
