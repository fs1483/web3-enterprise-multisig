package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"

	"web3-enterprise-multisig/internal/validators"
	"web3-enterprise-multisig/internal/workflow"
)

// GetWorkflowStatus 获取工作流状态
func GetWorkflowStatus(c *gin.Context) {
	proposalID := c.Param("proposalId")

	proposalUUID, err := uuid.Parse(proposalID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid proposal ID",
			"code":  "INVALID_PROPOSAL_ID",
		})
		return
	}

	status, err := workflow.GetWorkflowStatus(proposalUUID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Proposal not found",
			"code":  "PROPOSAL_NOT_FOUND",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"workflow": status,
	})
}

// ApproveProposal 审批提案
func ApproveProposal(c *gin.Context) {
	proposalID := c.Param("proposalId")
	userID, _ := c.Get("userID")

	proposalUUID, err := uuid.Parse(proposalID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid proposal ID",
			"code":  "INVALID_PROPOSAL_ID",
		})
		return
	}

	var req validators.SignProposalRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request format",
			"code":  "INVALID_REQUEST",
		})
		return
	}

	if err := validators.ValidateStruct(req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Validation failed",
			"code":    "VALIDATION_ERROR",
			"details": err.Error(),
		})
		return
	}

	if err := workflow.ApproveProposal(proposalUUID, userID.(uuid.UUID), req.SignatureData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
			"code":  "APPROVAL_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Proposal approved successfully",
	})
}

// ExecuteProposal 执行提案
func ExecuteProposal(c *gin.Context) {
	proposalID := c.Param("proposalId")

	proposalUUID, err := uuid.Parse(proposalID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid proposal ID",
			"code":  "INVALID_PROPOSAL_ID",
		})
		return
	}

	if err := workflow.ExecuteProposal(proposalUUID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": err.Error(),
			"code":  "EXECUTION_ERROR",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Proposal executed successfully",
	})
}
