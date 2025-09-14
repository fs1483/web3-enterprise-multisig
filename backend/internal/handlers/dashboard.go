package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"web3-enterprise-multisig/internal/database"
	"web3-enterprise-multisig/internal/models"
)

// DashboardStats 仪表板统计数据结构
type DashboardStats struct {
	TotalProposals       int    `json:"totalProposals"`
	PendingProposals     int    `json:"pendingProposals"`
	ApprovedProposals    int    `json:"approvedProposals"`
	ExecutedProposals    int    `json:"executedProposals"`
	RejectedProposals    int    `json:"rejectedProposals"`
	TotalSafes           int    `json:"totalSafes"`
	ActiveSafes          int    `json:"activeSafes"`
	TotalBalance         string `json:"totalBalance"`
	MonthlyVolume        string `json:"monthlyVolume"`
	TotalSigners         int    `json:"totalSigners"`
	AverageExecutionTime string `json:"averageExecutionTime"`
	SecurityScore        int    `json:"securityScore"`
}

// RecentActivity 最近活动结构
type RecentActivity struct {
	ID          string    `json:"id"`
	Type        string    `json:"type"`
	Title       string    `json:"title"`
	Description string    `json:"description"`
	Timestamp   time.Time `json:"timestamp"`
	User        string    `json:"user"`
}

// GetDashboardStats 获取仪表板统计数据
func GetDashboardStats(c *gin.Context) {
	// 返回模拟的仪表板统计数据
	stats := DashboardStats{
		TotalProposals:       15,
		PendingProposals:     3,
		ApprovedProposals:    8,
		ExecutedProposals:    4,
		RejectedProposals:    0,
		TotalSafes:           5,
		ActiveSafes:          4,
		TotalBalance:         "125.5",
		MonthlyVolume:        "89.2",
		TotalSigners:         12,
		AverageExecutionTime: "2.4h",
		SecurityScore:        95,
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    stats,
	})
}

// GetRecentActivity 获取最近活动
func GetRecentActivity(c *gin.Context) {
	// TODO: 从数据库获取真实数据
	// 目前返回模拟数据
	activities := []RecentActivity{
		{
			ID:          "1",
			Type:        "proposal_created",
			Title:       "New Proposal Created",
			Description: "Treasury fund allocation proposal created",
			Timestamp:   time.Now().Add(-2 * time.Hour),
			User:        "John Doe",
		},
		{
			ID:          "2",
			Type:        "proposal_signed",
			Title:       "Proposal Signed",
			Description: "Marketing budget proposal received signature",
			Timestamp:   time.Now().Add(-1 * time.Hour),
			User:        "Jane Smith",
		},
		{
			ID:          "3",
			Type:        "safe_created",
			Title:       "New Safe Created",
			Description: "Development team safe wallet created",
			Timestamp:   time.Now().Add(-30 * time.Minute),
			User:        "Alice Johnson",
		},
		{
			ID:          "4",
			Type:        "proposal_executed",
			Title:       "Proposal Executed",
			Description: "Infrastructure upgrade proposal executed successfully",
			Timestamp:   time.Now().Add(-15 * time.Minute),
			User:        "Bob Wilson",
		},
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    activities,
	})
}

// PendingProposal 待处理提案结构
type PendingProposal struct {
	ID                 string    `json:"id"`
	Title              string    `json:"title"`
	Description        string    `json:"description"`
	SafeID             string    `json:"safe_id"`
	SafeName           string    `json:"safe_name"`
	CreatorName        string    `json:"creator_name"`
	RequiredSignatures int       `json:"required_signatures"`
	CurrentSignatures  int       `json:"current_signatures"`
	ToAddress          string    `json:"to_address"`
	Value              string    `json:"value"`
	CreatedAt          time.Time `json:"created_at"`
	Priority           string    `json:"priority"`
}

// GetPendingProposals 获取用户的待处理提案
func GetPendingProposals(c *gin.Context) {
	userID, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "用户未认证",
			"code":  "UNAUTHORIZED",
		})
		return
	}

	userUUID := userID.(uuid.UUID)

	// 查询用户需要签名的待处理提案
	var proposals []models.Proposal
	query := database.DB.Model(&models.Proposal{}).
		Preload("Safe").
		Preload("Creator").
		Joins("JOIN safes ON proposals.safe_id = safes.id").
		Where("proposals.status = ?", "pending").
		Where("? = ANY(safes.owners)", userUUID.String()).
		Where("proposals.created_by != ?", userUUID) // 排除自己创建的提案

	// 排除已经签名的提案
	query = query.Where("proposals.id NOT IN (?)", 
		database.DB.Model(&models.Signature{}).
			Select("proposal_id").
			Where("user_id = ?", userUUID))

	if err := query.Order("proposals.created_at DESC").Find(&proposals).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "获取待处理提案失败",
			"code":  "FETCH_ERROR",
		})
		return
	}

	// 转换为前端需要的格式
	pendingProposals := make([]PendingProposal, 0, len(proposals))
	for _, proposal := range proposals {
		// 计算优先级（基于时间和签名进度）
		priority := calculateProposalPriority(&proposal)
		
		pendingProposal := PendingProposal{
			ID:                 proposal.ID.String(),
			Title:              proposal.Title,
			Description:        getStringValue(proposal.Description),
			SafeID:             proposal.SafeID.String(),
			SafeName:           proposal.Safe.Name,
			CreatorName:        proposal.Creator.Username,
			RequiredSignatures: proposal.RequiredSignatures,
			CurrentSignatures:  proposal.CurrentSignatures,
			ToAddress:          *proposal.ToAddress,
			Value:              proposal.Value,
			CreatedAt:          proposal.CreatedAt,
			Priority:           priority,
		}
		pendingProposals = append(pendingProposals, pendingProposal)
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    pendingProposals,
		"total":   len(pendingProposals),
	})
}

// calculateProposalPriority 计算提案优先级
func calculateProposalPriority(proposal *models.Proposal) string {
	// 基于创建时间和签名进度计算优先级
	hoursOld := time.Since(proposal.CreatedAt).Hours()
	signatureProgress := float64(proposal.CurrentSignatures) / float64(proposal.RequiredSignatures)

	if proposal.CurrentSignatures >= proposal.RequiredSignatures {
		return "high"
	}

	// 超过24小时且签名进度低的为高优先级
	if hoursOld > 24 && signatureProgress < 0.5 {
		return "high"
	}
	// 超过12小时的为中优先级
	if hoursOld > 12 {
		return "medium"
	}
	// 其他为低优先级
	return "low"
}

// getStringValue 安全获取字符串指针的值
func getStringValue(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
