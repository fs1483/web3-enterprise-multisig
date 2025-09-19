package handlers

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/ethereum/go-ethereum/common/hexutil"
	"github.com/ethereum/go-ethereum/crypto"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"

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
	var req validators.LoginRequest
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

	// 查找用户
	var user models.User
	if err := database.DB.Where("email = ?", req.Email).First(&user).Error; err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid credentials",
			"code":  "INVALID_CREDENTIALS",
		})
		return
	}

	// 验证密码
	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "Invalid credentials",
			"code":  "INVALID_CREDENTIALS",
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
		PasswordHash:  "", // 钱包注册用户无需密码
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
