package main

import (
	"log"

	"web3-enterprise-multisig/internal/database"
	"web3-enterprise-multisig/internal/models"

	"github.com/joho/godotenv"
)

func main() {
	// 加载环境变量
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found")
	}

	// 连接数据库
	if err := database.ConnectDatabase(); err != nil {
		log.Fatal("Failed to connect to database:", err)
	}

	// 健康检查
	if err := database.HealthCheck(); err != nil {
		log.Fatal("Database health check failed:", err)
	}

	// 测试查询用户
	var users []models.User
	result := database.DB.Find(&users)
	if result.Error != nil {
		log.Fatal("Failed to query users:", result.Error)
	}
	log.Printf("✅ Found %d users in database", len(users))

	// 测试查询 Safe
	var safes []models.Safe
	result = database.DB.Find(&safes)
	if result.Error != nil {
		log.Fatal("Failed to query safes:", result.Error)
	}
	log.Printf("✅ Found %d safes in database", len(safes))

	// 测试关联查询
	var safeWithProposals models.Safe
	result = database.DB.Preload("Proposals").First(&safeWithProposals)
	if result.Error != nil {
		log.Printf("⚠️ No safes found or failed to load proposals: %v", result.Error)
	} else {
		log.Printf("✅ Safe '%s' has %d proposals", safeWithProposals.Name, len(safeWithProposals.Proposals))
	}

	log.Println("🎉 Database connection and models working correctly!")
}
