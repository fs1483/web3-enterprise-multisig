package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
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

// 注意：GetPendingProposals 函数已移至 dashboard_cards.go 文件中
// 这里移除重复定义以避免编译错误

// getStringValue 安全获取字符串指针的值
func getStringValue(s *string) string {
	if s == nil {
		return ""
	}
	return *s
}
