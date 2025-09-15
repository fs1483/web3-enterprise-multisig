package main

import (
	"log"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"

	"web3-enterprise-multisig/internal/blockchain"
	"web3-enterprise-multisig/internal/database"
	"web3-enterprise-multisig/internal/handlers"
	"web3-enterprise-multisig/internal/middleware"
	"web3-enterprise-multisig/internal/services"
	"web3-enterprise-multisig/internal/websocket"
	"web3-enterprise-multisig/internal/workflow"
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

	// 初始化WebSocket Hub
	wsHub := websocket.NewHub()
	go wsHub.Run()
	log.Println("📡 WebSocket Hub started")

	// 设置WebSocket Hub到workflow引擎
	workflow.SetWebSocketHub(wsHub)

	// 初始化服务
	safeTransactionService := services.NewSafeTransactionService(database.DB)
	safeTransactionHandler := handlers.NewSafeTransactionHandler(safeTransactionService)

	// 初始化区块链监听器
	rpcUrl := os.Getenv("ETHEREUM_RPC_URL")
	wsUrl := os.Getenv("BLOCKCHAIN_WS_URL")

	// 检查是否配置了区块链节点URL
	if rpcUrl == "" || wsUrl == "" {
		log.Println("⚠️ 区块链节点URL未配置，跳过区块链监听器初始化")
		log.Println("💡 请在.env文件中配置以下环境变量:")
		log.Println("   ETHEREUM_RPC_URL=https://sepolia.infura.io/v3/YOUR_PROJECT_ID")
		log.Println("   BLOCKCHAIN_WS_URL=wss://sepolia.infura.io/ws/v3/YOUR_PROJECT_ID")
		log.Println("💡 系统将在没有区块链监听的情况下启动，Safe创建功能仍可正常使用")
	} else {
		// 创建区块链监听器配置
		monitorConfig := blockchain.MonitorConfig{
			ChainID:              11155111, // Sepolia测试网链ID
			SafeFactoryAddress:   "0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2",
			SafeSingletonAddress: "0xd9Db270c1B5E3Bd161E8c8503c55cEABeE709552",
			PollInterval:         30 * time.Second, // 30秒轮询间隔
			ConfirmationBlocks:   3,                // 3个区块确认
			MaxRetries:           5,                // 最大重试次数
			BatchSize:            10,               // 批处理大小
		}

		monitor, err := blockchain.NewSafeCreationMonitor(
			rpcUrl, wsUrl, database.DB, safeTransactionService, wsHub, monitorConfig,
		)
		if err != nil {
			log.Printf("⚠️ 区块链监听器初始化失败: %v", err)
			log.Println("💡 请检查区块链节点URL和API密钥是否正确")
			log.Println("💡 系统将在没有区块链监听的情况下启动")
		} else {
			// 🔥 关键修复：设置监控器到workflow引擎，启用提案执行监控
			workflow.SetSafeMonitor(monitor)
			
			// 启动区块链监听器
			go func() {
				log.Println("🔗 [Safe监控] 启动Safe创建监听器...")
				log.Println("📋 [提案监控] 启动提案执行监控器...")
				if err := monitor.Start(); err != nil {
					log.Printf("❌ 区块链监听器启动失败: %v", err)
				}
			}()
			log.Println("✅ Safe创建监听器初始化成功")
			log.Println("✅ 提案执行监控器初始化成功")
		}
	}

	// 设置 Gin 模式
	if os.Getenv("GIN_MODE") == "release" {
		gin.SetMode(gin.ReleaseMode)
	}

	// 创建路由
	router := setupRouter(wsHub, safeTransactionHandler)

	// 启动服务器
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("🚀 Server starting on port %s", port)
	if err := router.Run(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}

func setupRouter(wsHub *websocket.Hub, safeTransactionHandler *handlers.SafeTransactionHandler) *gin.Engine {
	router := gin.New()

	// 禁用自动重定向，避免CORS问题
	router.RedirectTrailingSlash = false
	router.RedirectFixedPath = false

	// 全局中间件
	router.Use(middleware.Logger())
	router.Use(middleware.CORS())
	router.Use(middleware.ErrorHandler())

	// 健康检查
	router.GET("/health", handlers.HealthCheck)

	// WebSocket 路由 (在HandleWebSocket内部处理JWT认证)
	router.GET("/ws", wsHub.HandleWebSocket)

	// API 路由组
	api := router.Group("/api/v1")

	// 认证路由（无需 JWT）
	auth := api.Group("/auth")
	{
		auth.POST("/register", handlers.Register)
		auth.POST("/login", handlers.Login)
		auth.POST("/wallet-register", handlers.WalletRegister)
		auth.POST("/wallet-login", handlers.WalletLogin)
		auth.POST("/refresh", handlers.RefreshToken)
	}

	// 需要认证的路由 - 统一使用直接路由注册，避免重定向问题
	protected := api.Group("")
	protected.Use(middleware.JWTAuth())
	{
		// 用户路由
		protected.GET("/users/profile", handlers.GetProfile)
		protected.PUT("/users/profile", handlers.UpdateProfile)
		protected.GET("/users", handlers.GetUsers)
		protected.GET("/users/selection", handlers.GetUsersForSelection)

		// Safe 钱包路由
		protected.GET("/safes", handlers.GetSafes)
		protected.POST("/safes", handlers.CreateSafe)
		protected.GET("/safes/:id", handlers.GetSafe)
		protected.PUT("/safes/:id", handlers.UpdateSafe)
		protected.GET("/safes/:id/nonce", handlers.GetSafeNonce)
		protected.GET("/safes/address/:address", handlers.GetSafeByAddress)

		// Safe 交易状态路由
		protected.GET("/safe-transactions/:id", safeTransactionHandler.GetSafeTransaction)
		protected.GET("/safe-transactions", safeTransactionHandler.GetUserSafeTransactions)
		protected.GET("/safe-transactions/stats", safeTransactionHandler.GetTransactionStats)

		// 提案路由
		protected.GET("/proposals", handlers.GetProposals)
		protected.POST("/proposals", handlers.CreateProposal)
		protected.GET("/proposals/:id", handlers.GetProposal)
		protected.PUT("/proposals/:id", handlers.UpdateProposal)
		protected.DELETE("/proposals/:id", handlers.DeleteProposal)

		// 提案签名相关
		protected.POST("/proposals/:id/sign", handlers.SignProposal)
		protected.DELETE("/proposals/:id/signatures/:signatureId", handlers.RemoveSignature)
		protected.GET("/proposals/:id/signatures", handlers.GetSignatures)

		// 提案执行和拒绝
		protected.POST("/proposals/:id/execute", handlers.ExecuteProposalByID)
		protected.POST("/proposals/:id/reject", handlers.RejectProposal)

		// 工作流路由
		protected.GET("/workflow/status/:proposalId", handlers.GetWorkflowStatus)
		protected.POST("/workflow/approve/:proposalId", handlers.ApproveProposal)
		protected.POST("/workflow/execute/:proposalId", handlers.ExecuteProposal)

		// Dashboard 路由
		protected.GET("/dashboard/stats", handlers.GetDashboardStats)
		protected.GET("/dashboard/activity", handlers.GetRecentActivity)
		protected.GET("/dashboard/pending-proposals", handlers.GetPendingProposals)

		// Dashboard 卡片路由 - 新增功能，不影响现有路由
		protected.GET("/dashboard/cards", handlers.GetDashboardCards)
	}

	return router
}
