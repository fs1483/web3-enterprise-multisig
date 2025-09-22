package handlers

import (
	"errors"
	"fmt"
	"net/http"
	"strings"

	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"web3-enterprise-multisig/internal/auth"
	"web3-enterprise-multisig/internal/database"
	"web3-enterprise-multisig/internal/models"
	"web3-enterprise-multisig/internal/services"
	"web3-enterprise-multisig/internal/validators"
)

// Register 用户注册
func Register(c *gin.Context) {
	var req validators.RegisterRequest
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

	// 检查用户是否已存在（邮箱或钱包地址）
	var existingUser models.User
	if err := database.DB.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"error": "User with this email already exists",
			"code":  "EMAIL_EXISTS",
		})
		return
	}

	// 如果提供了钱包地址，检查是否已被使用
	if req.WalletAddress != nil && *req.WalletAddress != "" {
		if err := database.DB.Where("wallet_address = ?", *req.WalletAddress).First(&existingUser).Error; err == nil {
			c.JSON(http.StatusConflict, gin.H{
				"error": "User with this wallet address already exists",
				"code":  "WALLET_EXISTS",
			})
			return
		}
	}

	// 哈希密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to hash password",
			"code":  "HASH_ERROR",
		})
		return
	}

	// 创建用户
	user := models.User{
		Email:         req.Email,
		Username:      req.Email, // 使用邮箱作为用户名
		PasswordHash:  string(hashedPassword),
		FullName:      &req.Name,
		WalletAddress: req.WalletAddress, // 关联钱包地址
		Role:          "user",
		IsActive:      true,
	}

	if err := database.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create user",
			"code":  "CREATE_USER_ERROR",
		})
		return
	}

	// 初始化用户权限
	if err := initializeUserPermissions(user.ID, user.Role); err != nil {
		// 权限初始化失败不影响用户创建，只记录错误
		fmt.Printf("Warning: Failed to initialize permissions for user %s: %v\n", user.ID, err)
	}

	// 生成 JWT token
	token, err := auth.GenerateToken(user.ID, user.Username, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to generate token",
			"code":  "TOKEN_ERROR",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "User registered successfully",
		"user": gin.H{
			"id":             user.ID,
			"email":          user.Email,
			"username":       user.Username,
			"wallet_address": user.WalletAddress,
			"role":           user.Role,
		},
		"token": token,
	})
}

// Login 用户登录
func Login(c *gin.Context) {
	fmt.Printf("\n🚀 ========== LOGIN REQUEST START ==========\n")
	fmt.Printf("🔍 Login请求调试:\n")
	fmt.Printf("   Content-Type: %s\n", c.GetHeader("Content-Type"))
	fmt.Printf("   Content-Length: %s\n", c.GetHeader("Content-Length"))
	fmt.Printf("   Request Method: %s\n", c.Request.Method)
	fmt.Printf("   Remote Addr: %s\n", c.ClientIP())
	fmt.Printf("   User-Agent: %s\n", c.GetHeader("User-Agent"))
	
	// 检查数据库连接
	fmt.Printf("🔍 检查数据库连接...\n")
	if database.DB == nil {
		fmt.Printf("❌ 数据库连接为空\n")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Database connection error",
			"code":  "DB_CONNECTION_ERROR",
		})
		return
	}
	
	// 测试数据库连接
	sqlDB, err := database.DB.DB()
	if err != nil {
		fmt.Printf("❌ 获取数据库实例失败: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Database connection error",
			"code":  "DB_CONNECTION_ERROR",
		})
		return
	}
	
	if err := sqlDB.Ping(); err != nil {
		fmt.Printf("❌ 数据库连接测试失败: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Database connection error",
			"code":  "DB_CONNECTION_ERROR",
		})
		return
	}
	fmt.Printf("✅ 数据库连接正常\n")
	
	var req validators.LoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		fmt.Printf("❌ JSON绑定失败: %v\n", err)
		fmt.Printf("❌ 请求体原始数据: %+v\n", c.Request.Body)
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
			"code":  "INVALID_REQUEST",
			"details": err.Error(),
		})
		return
	}
	
	fmt.Printf("✅ Login请求解析成功: email=%s, password_length=%d\n", req.Email, len(req.Password))

	// 验证请求数据
	if err := validators.ValidateStruct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Validation failed",
			"code":    "VALIDATION_ERROR",
			"details": err.Error(),
		})
		return
	}

	// 查找用户
	fmt.Printf("🔍 开始查找用户: email=%s\n", req.Email)
	
	// 先检查用户表是否存在
	var tableExists bool
	if err := database.DB.Raw("SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'users')").Scan(&tableExists).Error; err != nil {
		fmt.Printf("❌ 检查用户表失败: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Database error",
			"code":  "DB_ERROR",
		})
		return
	}
	
	if !tableExists {
		fmt.Printf("❌ 用户表不存在\n")
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Database not initialized",
			"code":  "DB_NOT_INITIALIZED",
		})
		return
	}
	fmt.Printf("✅ 用户表存在\n")
	
	// 查询用户总数
	var userCount int64
	database.DB.Model(&models.User{}).Count(&userCount)
	fmt.Printf("🔍 数据库中用户总数: %d\n", userCount)
	
	// 查询指定邮箱的用户
	var user models.User
	query := database.DB.Where("email = ?", req.Email)
	fmt.Printf("🔍 执行SQL查询: SELECT * FROM users WHERE email = '%s'\n", req.Email)
	
	if err := query.First(&user).Error; err != nil {
		fmt.Printf("❌ 用户查找失败: %v\n", err)
		
		// 检查是否是记录不存在的错误
		if errors.Is(err, gorm.ErrRecordNotFound) {
			fmt.Printf("❌ 用户不存在: %s\n", req.Email)
			
			// 查询所有用户信息用于调试
			var allUsers []models.User
			database.DB.Find(&allUsers)
			fmt.Printf("🔍 数据库中所有用户:\n")
			for _, u := range allUsers {
				fmt.Printf("   - Email: %s, Role: %s, Active: %v, PasswordHash: %s...\n", 
					u.Email, u.Role, u.IsActive, u.PasswordHash[:50])
			}
		}
		
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid credentials",
			"code":  "INVALID_CREDENTIALS",
		})
		return
	}
	
	fmt.Printf("✅ 用户查找成功:\n")
	fmt.Printf("   ID: %s\n", user.ID)
	fmt.Printf("   Username: %s\n", user.Username)
	fmt.Printf("   Email: %s\n", user.Email)
	fmt.Printf("   Role: %s\n", user.Role)
	fmt.Printf("   IsActive: %v\n", user.IsActive)
	fmt.Printf("   CreatedAt: %v\n", user.CreatedAt)
	fmt.Printf("   PasswordHash长度: %d\n", len(user.PasswordHash))

	// 验证密码
	fmt.Printf("🔍 开始验证密码...\n")
	fmt.Printf("   存储的hash: %s\n", user.PasswordHash[:50]+"...")
	fmt.Printf("   输入的密码: %s\n", req.Password)
	
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		fmt.Printf("❌ 密码验证失败: %v\n", err)
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid credentials",
			"code":  "INVALID_CREDENTIALS",
		})
		return
	}
	
	fmt.Printf("✅ 密码验证成功\n")

	// 检查用户是否激活
	if !user.IsActive {
		fmt.Printf("❌ 用户未激活\n")
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Account is deactivated",
			"code":  "ACCOUNT_DEACTIVATED",
		})
		return
	}
	
	fmt.Printf("✅ 用户状态检查通过\n")

	// 生成 JWT token
	fmt.Printf("🔍 开始生成JWT token...\n")
	fmt.Printf("   用户ID: %s\n", user.ID)
	fmt.Printf("   用户名: %s\n", user.Username)
	fmt.Printf("   角色: %s\n", user.Role)
	
	token, err := auth.GenerateToken(user.ID, user.Username, user.Role)
	if err != nil {
		fmt.Printf("❌ JWT token生成失败: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to generate token",
			"code":  "TOKEN_ERROR",
		})
		return
	}
	
	fmt.Printf("✅ JWT token生成成功: %s...\n", token[:50])

	// 更新最后登录时间
	fmt.Printf("🔍 更新最后登录时间...\n")
	if err := database.DB.Model(&user).Update("last_login_at", "NOW()").Error; err != nil {
		fmt.Printf("⚠️ 更新登录时间失败: %v\n", err)
		// 不影响登录流程，继续执行
	} else {
		fmt.Printf("✅ 登录时间更新成功\n")
	}

	fmt.Printf("🎉 ========== LOGIN SUCCESS ==========\n")
	fmt.Printf("   用户: %s (%s)\n", user.Email, user.Role)
	fmt.Printf("   Token: %s...\n", token[:50])
	fmt.Printf("========================================\n\n")

	c.JSON(http.StatusOK, gin.H{
		"message": "Login successful",
		"user": gin.H{
			"id":       user.ID,
			"email":    user.Email,
			"username": user.Username,
			"role":     user.Role,
		},
		"token": token,
	})
}

// RefreshToken 刷新 token
func RefreshToken(c *gin.Context) {
	var req struct {
		Token string `json:"token" binding:"required"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Token is required",
			"code":  "MISSING_TOKEN",
		})
		return
	}

	newToken, err := auth.RefreshToken(req.Token)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid or non-refreshable token",
			"code":  "REFRESH_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"token": newToken,
	})
}

// WalletRegister 钱包签名注册
func WalletRegister(c *gin.Context) {
	var req validators.WalletRegisterRequest
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

	// 验证签名
	if !verifyWalletSignature(req.Message, req.Signature, req.WalletAddress) {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid wallet signature",
			"code":  "INVALID_SIGNATURE",
		})
		return
	}

	// 检查用户是否已存在（邮箱或钱包地址）
	var existingUser models.User
	if err := database.DB.Where("email = ?", req.Email).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"error": "User with this email already exists",
			"code":  "EMAIL_EXISTS",
		})
		return
	}

	if err := database.DB.Where("wallet_address = ?", req.WalletAddress).First(&existingUser).Error; err == nil {
		c.JSON(http.StatusConflict, gin.H{
			"error": "User with this wallet address already exists",
			"code":  "WALLET_EXISTS",
		})
		return
	}

	// 创建用户（无需密码，使用钱包地址认证）
	user := models.User{
		Email:         req.Email,
		Username:      req.Email, // 使用邮箱作为用户名
		PasswordHash:  "",        // 钱包注册用户无需密码
		FullName:      &req.Name,
		WalletAddress: &req.WalletAddress, // 关联钱包地址
		Role:          "user",
		IsActive:      true,
	}

	if err := database.DB.Create(&user).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to create user",
			"code":  "CREATE_USER_ERROR",
		})
		return
	}

	// 初始化用户权限
	if err := initializeUserPermissions(user.ID, user.Role); err != nil {
		// 权限初始化失败不影响用户创建，只记录错误
		fmt.Printf("Warning: Failed to initialize permissions for user %s: %v\n", user.ID, err)
	}

	// 生成 JWT token
	token, err := auth.GenerateToken(user.ID, user.Username, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to generate token",
			"code":  "TOKEN_ERROR",
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "User registered successfully with wallet",
		"user": gin.H{
			"id":             user.ID,
			"email":          user.Email,
			"username":       user.Username,
			"wallet_address": user.WalletAddress,
			"role":           user.Role,
		},
		"token": token,
	})
}

// WalletLogin 钱包签名登录
func WalletLogin(c *gin.Context) {
	var req validators.WalletLoginRequest
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

	// 验证签名
	if !verifyWalletSignature(req.Message, req.Signature, req.WalletAddress) {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid wallet signature",
			"code":  "INVALID_SIGNATURE",
		})
		return
	}

	// 查找用户
	var user models.User
	if err := database.DB.Where("wallet_address = ?", req.WalletAddress).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Wallet address not registered",
			"code":  "WALLET_NOT_FOUND",
		})
		return
	}

	// 检查用户是否激活
	if !user.IsActive {
		c.JSON(http.StatusForbidden, gin.H{
			"error": "Account is deactivated",
			"code":  "ACCOUNT_DEACTIVATED",
		})
		return
	}

	// 生成 JWT token
	token, err := auth.GenerateToken(user.ID, user.Username, user.Role)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to generate token",
			"code":  "TOKEN_ERROR",
		})
		return
	}

	// 更新最后登录时间
	database.DB.Model(&user).Update("last_login_at", "NOW()")

	c.JSON(http.StatusOK, gin.H{
		"message": "Wallet login successful",
		"user": gin.H{
			"id":             user.ID,
			"email":          user.Email,
			"username":       user.Username,
			"wallet_address": user.WalletAddress,
			"role":           user.Role,
		},
		"token": token,
	})
}

// verifyWalletSignature 验证钱包签名
func verifyWalletSignature(message, signature, expectedAddress string) bool {
	// 添加以太坊消息前缀
	prefixedMessage := fmt.Sprintf("\x19Ethereum Signed Message:\n%d%s", len(message), message)
	messageHash := crypto.Keccak256Hash([]byte(prefixedMessage))

	// 解码签名
	signatureBytes, err := hexutil.Decode(signature)
	if err != nil {
		return false
	}

	// 调整 v 值（如果需要）
	if signatureBytes[64] == 27 || signatureBytes[64] == 28 {
		signatureBytes[64] -= 27
	}

	// 恢复公钥
	publicKey, err := crypto.SigToPub(messageHash.Bytes(), signatureBytes)
	if err != nil {
		return false
	}

	// 获取地址
	recoveredAddress := crypto.PubkeyToAddress(*publicKey)

	// 比较地址（不区分大小写）
	return strings.EqualFold(recoveredAddress.Hex(), expectedAddress)
}

// initializeUserPermissions 初始化用户权限
func initializeUserPermissions(userID uuid.UUID, userRole string) error {
	// 创建权限服务实例
	permissionService := services.NewPermissionService(database.DB)

	// 根据用户角色初始化基础权限
	switch userRole {
	case "admin":
		// 管理员获得系统级权限
		return permissionService.InitializeSystemAdminPermissions(userID.String())
	case "user":
		// 普通用户获得基础权限
		return permissionService.InitializeBasicUserPermissions(userID.String())
	default:
		// 默认权限
		return permissionService.InitializeBasicUserPermissions(userID.String())
	}
}
