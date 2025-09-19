// =====================================================
// 超级管理员初始化服务
// 版本: v1.0
// 功能: 系统启动时初始化超级管理员账户
// 作者: sfan
// 创建时间: 2024-09-16
// =====================================================

package services

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"log"
	"time"

	"golang.org/x/crypto/bcrypt"
	"gorm.io/gorm"

	"web3-enterprise-multisig/internal/models"
)

// AdminInitService 超级管理员初始化服务
type AdminInitService struct {
	db *gorm.DB
}

// NewAdminInitService 创建超级管理员初始化服务
func NewAdminInitService(db *gorm.DB) *AdminInitService {
	return &AdminInitService{
		db: db,
	}
}

// InitSystemResult 系统初始化结果
type InitSystemResult struct {
	SuperAdminCreated bool   `json:"super_admin_created"`
	SuperAdminEmail   string `json:"super_admin_email"`
	TempPassword      string `json:"temp_password,omitempty"`
	Message           string `json:"message"`
}

// InitializeSystem 初始化系统超级管理员
func (s *AdminInitService) InitializeSystem() (*InitSystemResult, error) {
	result := &InitSystemResult{}

	// 检查是否已存在超级管理员
	var existingAdmin models.User
	err := s.db.Where("role = ? AND is_active = ?", "super_admin", true).First(&existingAdmin).Error

	if err == nil {
		// 超级管理员已存在
		result.SuperAdminCreated = false
		result.SuperAdminEmail = existingAdmin.Email
		result.Message = "超级管理员已存在，无需重复创建"
		return result, nil
	}

	if err != gorm.ErrRecordNotFound {
		return nil, fmt.Errorf("检查超级管理员时出错: %v", err)
	}

	// 生成临时密码
	tempPassword, err := s.generateTempPassword()
	if err != nil {
		return nil, fmt.Errorf("生成临时密码失败: %v", err)
	}

	// 创建超级管理员用户
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(tempPassword), bcrypt.DefaultCost)
	if err != nil {
		return nil, fmt.Errorf("密码哈希失败: %v", err)
	}

	walletAddr := "0x0000000000000000000000000000000000000001"
	superAdmin := models.User{
		Username:      "superadmin",
		Email:         "admin@company.com",
		PasswordHash:  string(hashedPassword),
		WalletAddress: &walletAddr, // 使用指针
		Role:          "super_admin",
		IsActive:      true,
		CreatedAt:     time.Now(),
		UpdatedAt:     time.Now(),
	}

	// 创建用户
	if err := s.db.Create(&superAdmin).Error; err != nil {
		return nil, fmt.Errorf("创建超级管理员用户失败: %v", err)
	}

	result.SuperAdminCreated = true
	result.SuperAdminEmail = superAdmin.Email
	result.TempPassword = tempPassword
	result.Message = "超级管理员创建成功，请立即登录并修改密码"

	log.Printf("超级管理员初始化完成: %s", superAdmin.Email)
	return result, nil
}

// generateTempPassword 生成临时密码
func (s *AdminInitService) generateTempPassword() (string, error) {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	return "Admin" + hex.EncodeToString(bytes)[:12] + "!", nil
}

// CheckSystemHealth 检查系统健康状态
func (s *AdminInitService) CheckSystemHealth() map[string]interface{} {
	health := make(map[string]interface{})

	// 检查超级管理员
	var adminCount int64
	s.db.Model(&models.User{}).Where("role = ? AND is_active = ?", "super_admin", true).Count(&adminCount)
	health["super_admin_count"] = adminCount

	// 检查用户总数
	var userCount int64
	s.db.Model(&models.User{}).Where("is_active = ?", true).Count(&userCount)
	health["total_users"] = userCount

	// 检查Safe总数
	var safeCount int64
	s.db.Model(&models.Safe{}).Count(&safeCount)
	health["total_safes"] = safeCount

	// 系统状态
	health["status"] = "healthy"
	if adminCount == 0 {
		health["status"] = "needs_initialization"
	}

	return health
}

// ResetSuperAdminPassword 重置超级管理员密码
func (s *AdminInitService) ResetSuperAdminPassword(adminEmail string) (string, error) {
	// 生成新的临时密码
	newPassword, err := s.generateTempPassword()
	if err != nil {
		return "", fmt.Errorf("生成新密码失败: %v", err)
	}

	// 哈希密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return "", fmt.Errorf("密码哈希失败: %v", err)
	}

	// 更新密码
	result := s.db.Model(&models.User{}).
		Where("email = ? AND role = ? AND is_active = ?", adminEmail, "super_admin", true).
		Update("password_hash", string(hashedPassword))

	if result.Error != nil {
		return "", fmt.Errorf("更新密码失败: %v", result.Error)
	}

	if result.RowsAffected == 0 {
		return "", fmt.Errorf("未找到指定的超级管理员用户")
	}

	log.Printf("超级管理员密码重置成功: %s", adminEmail)
	return newPassword, nil
}

// SetCustomPassword 设置管理员自定义密码
func (s *AdminInitService) SetCustomPassword(adminEmail, newPassword string) error {
	// 验证密码强度
	if len(newPassword) < 8 {
		return fmt.Errorf("密码长度至少8位")
	}

	// 查找管理员用户
	var admin models.User
	if err := s.db.Where("email = ? AND role = ?", adminEmail, "super_admin").First(&admin).Error; err != nil {
		if err == gorm.ErrRecordNotFound {
			return fmt.Errorf("管理员账户不存在")
		}
		return fmt.Errorf("查询管理员失败: %v", err)
	}

	// 加密新密码
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(newPassword), bcrypt.DefaultCost)
	if err != nil {
		return fmt.Errorf("密码加密失败: %v", err)
	}

	// 更新密码
	if err := s.db.Model(&admin).Update("password_hash", string(hashedPassword)).Error; err != nil {
		return fmt.Errorf("密码更新失败: %v", err)
	}

	log.Printf("✅ 管理员 %s 密码已更新", adminEmail)
	return nil
}
