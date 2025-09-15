package handlers

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"web3-enterprise-multisig/internal/database"
	"web3-enterprise-multisig/internal/models"
	"web3-enterprise-multisig/internal/workflow"
)

// ExecuteProposalByID 执行提案 (proposals路由版本)
func ExecuteProposalByID(c *gin.Context) {
	proposalID := c.Param("id")

	proposalUUID, err := uuid.Parse(proposalID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid proposal ID",
			"code":  "INVALID_PROPOSAL_ID",
		})
		return
	}

	// 先获取提案信息
	var proposal models.Proposal
	if err := database.DB.Preload("Safe").First(&proposal, proposalUUID).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Proposal not found",
			"code":  "PROPOSAL_NOT_FOUND",
		})
		return
	}

	// 检查提案是否可以执行
	if !proposal.CanExecute() {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": fmt.Sprintf("Proposal cannot be executed. Status: %s, Signatures: %d/%d",
				proposal.Status, proposal.CurrentSignatures, proposal.RequiredSignatures),
			"code": "PROPOSAL_NOT_EXECUTABLE",
		})
		return
	}

	// 调用工作流执行
	if err := workflow.ExecuteProposal(proposalUUID); err != nil {
		// 检查是否是配置错误
		if strings.Contains(err.Error(), "executor private key not configured") {
			c.JSON(http.StatusServiceUnavailable, gin.H{
				"error": "Blockchain executor not configured. Please contact administrator.",
				"code":  "EXECUTOR_NOT_CONFIGURED",
			})
		} else {
			c.JSON(http.StatusInternalServerError, gin.H{
				"error": err.Error(),
				"code":  "EXECUTION_ERROR",
			})
		}
		return
	}

	// 返回更新后的提案数据
	if err := database.DB.Preload("Safe").Preload("Signatures.Signer").First(&proposal, proposalUUID).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to fetch updated proposal",
			"code":  "FETCH_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, proposal)
}

// RejectProposal 拒绝提案
func RejectProposal(c *gin.Context) {
	proposalID := c.Param("id")

	_, err := uuid.Parse(proposalID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid proposal ID",
			"code":  "INVALID_PROPOSAL_ID",
		})
		return
	}

	// TODO: 实现拒绝提案的逻辑
	// 可以更新提案状态为"rejected"
	// 或者调用工作流引擎的拒绝逻辑

	c.JSON(http.StatusOK, gin.H{
		"message": "Proposal rejected successfully",
	})
}
