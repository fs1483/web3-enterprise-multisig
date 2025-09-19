// =====================================================
// 策略服务 API 调用
// 版本: v2.0
// 功能: 提供策略管理相关的API调用服务
// 作者: sfan
// 创建时间: 2024-07-29
// =====================================================

import React from 'react';
import { apiClient } from './apiClient';

// =====================================================
// 类型定义
// =====================================================

export interface Policy {
  id: string;
  safe_id: string;
  name: string;
  description?: string;
  policy_type: string;
  parameters: Record<string, any>;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PolicyTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  policy_type: string;
  default_params: Record<string, any>;
  is_public: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface CreatePolicyRequest {
  name: string;
  description?: string;
  policy_type: string;
  parameters: Record<string, any>;
  is_active: boolean;
}

export interface UpdatePolicyRequest {
  name?: string;
  description?: string;
  parameters?: Record<string, any>;
  is_active?: boolean;
}

export interface PolicyValidationRequest {
  policy_type: string;
  parameters: Record<string, any>;
  context?: Record<string, any>;
}

export interface PolicyValidationResult {
  is_valid: boolean;
  error?: string;
  policy_type: string;
  warnings?: string[];
  suggestions?: string[];
}

export interface CreatePolicyTemplateRequest {
  name: string;
  description: string;
  category: string;
  policy_type: string;
  default_params: Record<string, any>;
  is_public: boolean;
}

// =====================================================
// 策略服务类
// =====================================================

export class PolicyService {
  // Safe策略管理
  static async getSafePolicies(safeId: string, params?: {
    policy_type?: string;
    is_active?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ policies: Policy[]; total: number }> {
    const response = await apiClient.get(`/safes/${safeId}/policies`, { params });
    return response.data as { policies: Policy[]; total: number; };
  }

  static async createSafePolicy(safeId: string, request: CreatePolicyRequest): Promise<{ policy: Policy }> {
    const response = await apiClient.post(`/safes/${safeId}/policies`, request);
    return response.data as { policy: Policy; };
  }

  static async updateSafePolicy(safeId: string, policyId: string, request: UpdatePolicyRequest): Promise<{ policy: Policy }> {
    const response = await apiClient.put(`/safes/${safeId}/policies/${policyId}`, request);
    return response.data as { policy: Policy; };
  }

  static async deleteSafePolicy(safeId: string, policyId: string): Promise<void> {
    await apiClient.delete(`/safes/${safeId}/policies/${policyId}`);
  }

  static async getSafePolicy(safeId: string, policyId: string): Promise<{ policy: Policy }> {
    const response = await apiClient.get(`/safes/${safeId}/policies/${policyId}`);
    return response.data as { policy: Policy; };
  }

  // 策略模板管理
  static async getPolicyTemplates(params?: {
    category?: string;
    policy_type?: string;
    is_public?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<{ templates: PolicyTemplate[]; total: number }> {
    const response = await apiClient.get('/policies/templates', { params });
    return response.data as { templates: PolicyTemplate[]; total: number; };
  }

  static async createPolicyTemplate(request: CreatePolicyTemplateRequest): Promise<{ template: PolicyTemplate }> {
    const response = await apiClient.post('/policies/templates', request);
    return response.data as { template: PolicyTemplate; };
  }

  // 策略验证
  static async validatePolicy(request: PolicyValidationRequest): Promise<PolicyValidationResult> {
    const response = await apiClient.post('/policies/validate', request);
    return response.data as PolicyValidationResult;
  }

  // 策略执行日志（如果后端实现了相关接口）
  static async getPolicyExecutionLogs(safeId: string, params?: {
    policy_id?: string;
    execution_result?: 'passed' | 'failed';
    start_date?: string;
    end_date?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ logs: any[]; total: number }> {
    const response = await apiClient.get(`/safes/${safeId}/policies/execution-logs`, { params });
    return response.data as { logs: any[]; total: number; };
  }

  // 策略辅助方法
  static async togglePolicyStatus(safeId: string, policyId: string, isActive: boolean): Promise<void> {
    await this.updateSafePolicy(safeId, policyId, { is_active: isActive });
  }

  static async duplicatePolicy(safeId: string, policyId: string, newName?: string): Promise<{ policy: Policy }> {
    const { policy } = await this.getSafePolicy(safeId, policyId);
    
    const duplicatedPolicy: CreatePolicyRequest = {
      name: newName || `${policy.name} (副本)`,
      description: policy.description,
      policy_type: policy.policy_type,
      parameters: { ...policy.parameters },
      is_active: false, // 默认禁用副本
    };

    return this.createSafePolicy(safeId, duplicatedPolicy);
  }

  // 批量策略操作
  static async bulkUpdatePolicies(safeId: string, policyIds: string[], updates: UpdatePolicyRequest): Promise<void> {
    const promises = policyIds.map(id => this.updateSafePolicy(safeId, id, updates));
    await Promise.all(promises);
  }

  static async bulkDeletePolicies(safeId: string, policyIds: string[]): Promise<void> {
    const promises = policyIds.map(id => this.deleteSafePolicy(safeId, id));
    await Promise.all(promises);
  }

  // 策略类型和参数验证
  static validatePolicyParameters(policyType: string, parameters: Record<string, any>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    switch (policyType) {
      case 'approval_threshold':
        if (!parameters.thresholds || !Array.isArray(parameters.thresholds)) {
          errors.push('审批阈值策略需要thresholds数组参数');
        } else {
          parameters.thresholds.forEach((threshold: any, index: number) => {
            if (!threshold.max_amount || !threshold.required_signatures) {
              errors.push(`阈值配置${index + 1}缺少必要参数`);
            }
          });
        }
        break;

      case 'time_lock':
        if (!parameters.delay_hours || typeof parameters.delay_hours !== 'number') {
          errors.push('时间锁策略需要delay_hours数值参数');
        }
        if (!parameters.min_amount) {
          errors.push('时间锁策略需要min_amount参数');
        }
        break;

      case 'spending_limit':
        if (!parameters.daily_limit && !parameters.monthly_limit) {
          errors.push('支出限制策略需要至少一个限制参数');
        }
        break;

      case 'role_based_approval':
        if (!parameters.required_roles || !Array.isArray(parameters.required_roles)) {
          errors.push('基于角色的审批策略需要required_roles数组参数');
        }
        if (!parameters.transaction_types || !Array.isArray(parameters.transaction_types)) {
          errors.push('基于角色的审批策略需要transaction_types数组参数');
        }
        break;

      default:
        errors.push(`未知的策略类型: ${policyType}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// =====================================================
// React Hook for Policy Management
// =====================================================

export const usePolicies = (safeId: string) => {
  const [policies, setPolicies] = React.useState<Policy[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const fetchPolicies = React.useCallback(async () => {
    if (!safeId) return;

    setLoading(true);
    setError(null);
    try {
      const result = await PolicyService.getSafePolicies(safeId);
      setPolicies(result.policies);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取策略失败');
    } finally {
      setLoading(false);
    }
  }, [safeId]);

  const createPolicy = React.useCallback(async (request: CreatePolicyRequest) => {
    if (!safeId) return null;

    try {
      const result = await PolicyService.createSafePolicy(safeId, request);
      setPolicies(prev => [...prev, result.policy]);
      return result.policy;
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建策略失败');
      return null;
    }
  }, [safeId]);

  const updatePolicy = React.useCallback(async (policyId: string, request: UpdatePolicyRequest) => {
    if (!safeId) return null;

    try {
      const result = await PolicyService.updateSafePolicy(safeId, policyId, request);
      setPolicies(prev => prev.map(p => p.id === policyId ? result.policy : p));
      return result.policy;
    } catch (err) {
      setError(err instanceof Error ? err.message : '更新策略失败');
      return null;
    }
  }, [safeId]);

  const deletePolicy = React.useCallback(async (policyId: string) => {
    if (!safeId) return false;

    try {
      await PolicyService.deleteSafePolicy(safeId, policyId);
      setPolicies(prev => prev.filter(p => p.id !== policyId));
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : '删除策略失败');
      return false;
    }
  }, [safeId]);

  const togglePolicyStatus = React.useCallback(async (policyId: string, isActive: boolean) => {
    return updatePolicy(policyId, { is_active: isActive });
  }, [updatePolicy]);

  React.useEffect(() => {
    fetchPolicies();
  }, [fetchPolicies]);

  return {
    policies,
    loading,
    error,
    fetchPolicies,
    createPolicy,
    updatePolicy,
    deletePolicy,
    togglePolicyStatus,
  };
};

export default PolicyService;
