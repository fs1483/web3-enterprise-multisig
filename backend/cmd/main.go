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
	
	// 初始化管理员服务
	adminInitService := services.NewAdminInitService(database.DB)
	adminInitHandler := handlers.NewAdminInitHandler(adminInitService)

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

	// 创建Safe角色模板处理器
	safeRoleTemplateHandler := handlers.NewSafeRoleTemplateHandler(database.DB)
	
	// 创建Safe自定义角色处理器
	safeCustomRoleHandler := handlers.NewSafeCustomRoleHandler(database.DB)
	
	// 创建系统角色模板处理器
	systemRoleTemplateHandler := handlers.NewSystemRoleTemplateHandler(database.DB)

	// 创建路由
	router := setupRouter(wsHub, safeTransactionHandler, adminInitHandler, safeRoleTemplateHandler, safeCustomRoleHandler, systemRoleTemplateHandler)

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

func setupRouter(wsHub *websocket.Hub, safeTransactionHandler *handlers.SafeTransactionHandler, adminInitHandler *handlers.AdminInitHandler, safeRoleTemplateHandler *handlers.SafeRoleTemplateHandler, safeCustomRoleHandler *handlers.SafeCustomRoleHandler, systemRoleTemplateHandler *handlers.SystemRoleTemplateHandler) *gin.Engine {
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

	// 管理员路由 - 无需认证，用于系统初始化 (放在根API组下)
	adminAPI := router.Group("/api")
	admin := adminAPI.Group("/admin")
	{
		admin.POST("/init", adminInitHandler.InitializeSystem)
		admin.GET("/health", adminInitHandler.CheckSystemHealth)
		admin.POST("/reset-password", adminInitHandler.ResetSuperAdminPassword)
		admin.POST("/set-password", adminInitHandler.SetCustomPassword)
	}

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
		// 用户管理路由
		protected.GET("/users/profile", handlers.GetProfile)
		protected.PUT("/users/profile", handlers.UpdateProfile)
		protected.POST("/users/change-password", handlers.ChangePassword)
		protected.GET("/users", handlers.GetUsers) // 需要管理员权限
		
		// 临时开发路由 - 不需要认证
		api.GET("/users/selection", handlers.GetUsersForSelection)
		
		protected.GET("/users/:id/permissions", handlers.GetUserPermissions)
		protected.POST("/users/:id/permissions", handlers.AssignPermissions)

		// Safe 钱包路由
		protected.GET("/safes", handlers.GetSafes)
		protected.POST("/safes", handlers.CreateSafe)
		protected.GET("/safes/address/:address", middleware.RequireSafeAccessByAddress("safe.info.view"), handlers.GetSafeByAddress)
		protected.GET("/safes/:safeId", middleware.RequireSafeAccess("safe.info.view"), handlers.GetSafe)
		protected.PUT("/safes/:safeId", middleware.RequireSafeAccess("safe.info.manage"), handlers.UpdateSafe)
		protected.GET("/safes/:safeId/nonce", middleware.RequireSafeAccess("safe.info.view"), handlers.GetSafeNonce)
		// 临时开发路由 - Safe相关不需要认证的端点
		api.GET("/safes/:safeId/available-users", handlers.GetAvailableUsersForSafe)
		
		protected.GET("/safes/:safeId/available-users-protected", handlers.GetAvailableUsersForSafe)

		// Safe 交易状态路由
		protected.GET("/safe-transactions/:id", safeTransactionHandler.GetSafeTransaction)
		protected.GET("/safe-transactions", safeTransactionHandler.GetUserSafeTransactions)
		protected.GET("/safe-transactions/stats", safeTransactionHandler.GetTransactionStats)

		// 提案路由
		protected.GET("/proposals", handlers.GetProposals)
		protected.POST("/proposals", middleware.RequirePermission(middleware.PermissionConfig{
			PermissionCode: "proposal.create",
			SafeIDParam:    "safe_id", // 从请求体中获取
		}), handlers.CreateProposal)
		protected.GET("/proposals/:id", middleware.OptionalPermissionCheck("proposal.view"), handlers.GetProposal)
		protected.PUT("/proposals/:id", middleware.RequireAnyPermission("proposal.manage", "proposal.edit"), handlers.UpdateProposal)
		protected.DELETE("/proposals/:id", middleware.RequireAnyPermission("proposal.manage", "proposal.delete"), handlers.DeleteProposal)

		// 提案签名相关
		protected.POST("/proposals/:id/sign", middleware.RequirePermission(middleware.PermissionConfig{
			PermissionCode: "proposal.sign",
		}), handlers.SignProposal)
		protected.DELETE("/proposals/:id/signatures/:signatureId", middleware.RequireAnyPermission("proposal.manage", "signature.revoke"), handlers.RemoveSignature)
		protected.GET("/proposals/:id/signatures", middleware.OptionalPermissionCheck("proposal.view"), handlers.GetSignatures)

		// 提案执行和拒绝
		protected.POST("/proposals/:id/execute", middleware.RequirePermission(middleware.PermissionConfig{
			PermissionCode: "proposal.execute",
		}), handlers.ExecuteProposalByID)
		protected.POST("/proposals/:id/reject", middleware.RequireAnyPermission("proposal.manage", "proposal.reject"), handlers.RejectProposal)

		// 工作流路由
		protected.GET("/workflow/status/:proposalId", handlers.GetWorkflowStatus)
		protected.POST("/workflow/approve/:proposalId", handlers.ApproveProposal)
		protected.POST("/workflow/execute/:proposalId", handlers.ExecuteProposal)

		// Dashboard 路由 - 暂时移除权限检查，保持原有功能
		protected.GET("/dashboard/stats", handlers.GetDashboardStats)
		protected.GET("/dashboard/activity", handlers.GetRecentActivity)
		protected.GET("/dashboard/pending-proposals", handlers.GetPendingProposals)

		// Dashboard 卡片路由 - 新增功能，不影响现有路由
		protected.GET("/dashboard/cards", handlers.GetDashboardCards)

		// Safe创建相关路由
		protected.GET("/safe-creation/available-roles", handlers.GetAvailableRolesForSafeCreation)

		// 权限定义管理路由（操作级权限）
		protected.GET("/permission-definitions", handlers.GetPermissionDefinitionsV2)
		protected.GET("/permission-definitions/categories", handlers.GetPermissionCategories)
		protected.GET("/permission-definitions/scopes", handlers.GetPermissionScopes)
		protected.GET("/permission-definitions/:id", handlers.GetPermissionDefinitionByID)
		protected.POST("/permission-definitions", handlers.CreatePermissionDefinition)
		protected.PUT("/permission-definitions/:id", handlers.UpdatePermissionDefinition)
		protected.DELETE("/permission-definitions/:id", handlers.DeletePermissionDefinition)
		protected.PATCH("/permission-definitions/:id/toggle", handlers.TogglePermissionDefinition)

		// 权限管理路由 - 开发环境暂时移除严格权限检查
        protected.GET("/safes/:safeId/members", handlers.GetSafeMembers)
        protected.GET("/safes/:safeId/roles", handlers.GetSafeRoleConfigurations)
        protected.POST("/safes/:safeId/roles", handlers.CreateCustomRole)
        protected.PUT("/safes/:safeId/roles/:role", handlers.UpdateRolePermissions)
        protected.DELETE("/safes/:safeId/roles/:role", handlers.DeleteCustomRole)
        protected.POST("/safes/:safeId/members/roles", handlers.AssignSafeRole)
        protected.DELETE("/safes/:safeId/members/:user_id", handlers.RemoveSafeMember)
        protected.GET("/safes/:safeId/members/:user_id/role", handlers.GetUserSafeRole)
        protected.POST("/safes/:safeId/permissions/check", handlers.CheckPermission)
        
        // 权限定义管理路由
        protected.GET("/permissions/definitions", handlers.GetPermissionDefinitionsV2)
        protected.POST("/permissions/definitions", handlers.CreatePermissionDefinition)
        protected.PUT("/permissions/definitions/:id", handlers.UpdatePermissionDefinition)
        protected.DELETE("/permissions/definitions/:id", handlers.DeletePermissionDefinition)
        protected.PATCH("/permissions/definitions/:id/toggle", handlers.TogglePermissionDefinition)
        protected.GET("/permissions/categories", handlers.GetPermissionCategories)
        protected.GET("/permissions/scopes", handlers.GetPermissionScopes)
        
        protected.GET("/safes/:safeId/permissions/audit-logs", handlers.GetPermissionAuditLogs)

		// 策略管理路由
		protected.GET("/safes/:safeId/policies", middleware.RequireSafeAccess("safe.policy.view"), handlers.GetSafePolicies)
		protected.POST("/safes/:safeId/policies", middleware.RequireSafeAccess("safe.policy.manage"), handlers.CreateSafePolicy)
		protected.POST("/policies/validate", middleware.RequireSystemPermission("system.policy.validate"), handlers.ValidatePolicy)

		// 权限模板路由
		protected.GET("/role-templates", handlers.GetRoleTemplates)
		protected.GET("/role-templates/:id", handlers.GetRoleTemplate)
		protected.POST("/role-templates/validate", middleware.RequireSystemPermission("system.permission.manage"), handlers.ValidateRoleTemplate)
		protected.POST("/role-templates/custom", middleware.RequireSystemPermission("system.permission.manage"), handlers.CreateCustomRoleTemplate)
		protected.GET("/safes/:safeId/recommended-role", middleware.RequireSafeAccess("safe.member.view"), handlers.GetRecommendedRole)
		protected.POST("/safes/:safeId/apply-template/:template_id", middleware.RequireSafeAccess("safe.member.manage"), handlers.ApplyRoleTemplate)

		// Safe角色模板管理路由（新增）
		protected.POST("/safe-role-templates/apply", middleware.RequireAnyPermission("system.permission.manage", "safe.member.manage"), safeRoleTemplateHandler.ApplyTemplateToSafes)
		protected.GET("/safes/:safeId/role-templates", middleware.RequireSafeAccess("safe.member.view"), safeRoleTemplateHandler.GetSafeRoleTemplates)
		protected.DELETE("/safes/:safeId/role-templates/:templateId", middleware.RequireSafeAccess("safe.member.manage"), safeRoleTemplateHandler.RemoveTemplateFromSafe)
		protected.GET("/safes/:safeId/available-roles", middleware.RequireSafeAccess("safe.member.view"), safeRoleTemplateHandler.GetAvailableRolesForSafe)
		protected.GET("/safes/:safeId/debug-templates", middleware.RequireSafeAccess("safe.member.view"), safeRoleTemplateHandler.DebugSafeRoleTemplates) // 临时调试接口
		protected.GET("/safe-role-templates/stats", middleware.RequireSystemPermission("system.audit.view"), safeRoleTemplateHandler.GetSafeRoleTemplateStats)

		// Safe自定义角色管理路由（新增）
		protected.POST("/safes/:safeId/custom-roles", middleware.RequireSafeAccess("safe.member.manage"), safeCustomRoleHandler.CreateCustomRole)
		protected.GET("/safes/:safeId/custom-roles", middleware.RequireSafeAccess("safe.member.view"), safeCustomRoleHandler.GetCustomRoles)
		protected.PUT("/safes/:safeId/custom-roles/:roleId", middleware.RequireSafeAccess("safe.member.manage"), safeCustomRoleHandler.UpdateCustomRole)
		protected.DELETE("/safes/:safeId/custom-roles/:roleId", middleware.RequireSafeAccess("safe.member.manage"), safeCustomRoleHandler.DeleteCustomRole)
		protected.GET("/safes/:safeId/custom-roles/stats", middleware.RequireSafeAccess("safe.member.view"), safeCustomRoleHandler.GetRoleUsageStats)

		// 系统角色模板路由（用于Safe创建时的角色选择）
		protected.GET("/system-role-templates", systemRoleTemplateHandler.GetSystemRoleTemplates)
		protected.GET("/system-role-templates/default-creator", systemRoleTemplateHandler.GetDefaultCreatorRole)
		protected.GET("/system-role-templates/:roleId", systemRoleTemplateHandler.GetRoleTemplateByID)
		
		// Safe创建专用角色模板路由
		protected.GET("/role-templates/safe-creation", handlers.GetRoleTemplatesForSafeCreation)

		// 权限映射管理路由（新增）
		protected.GET("/permission-mappings", middleware.RequireSystemPermission("system.permission.view"), handlers.GetPermissionMappings)
		protected.GET("/permission-mappings/type/:type", middleware.RequireSystemPermission("system.permission.view"), handlers.GetPermissionMappingsByType)
		protected.GET("/permission-mappings/user", handlers.GetUserPermissionMappings) // 用户获取自己的权限映射，无需额外权限
		protected.GET("/permission-mappings/stats", middleware.RequireSystemPermission("system.audit.view"), handlers.GetPermissionMappingStats)
		protected.PUT("/permission-mappings/:code", middleware.RequireSystemPermission("system.permission.manage"), handlers.UpdatePermissionMapping)
		protected.POST("/permission-mappings/validate", middleware.RequireSystemPermission("system.permission.manage"), handlers.ValidatePermissionMapping)
		protected.GET("/permission-mappings/element/:elementId", handlers.GetPermissionMappingByElement)
		protected.GET("/permission-mappings/api", handlers.GetPermissionMappingByAPI)
	}

	return router
}
