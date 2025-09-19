// =====================================================
// 治理策略统一数据源
// 版本: v1.0
// 功能: 提供统一的治理策略数据，确保CreateSafe和Policies页面数据一致
// 作者: Cascade AI
// 创建时间: 2025-09-16
// =====================================================

export interface GovernancePolicy {
  id: string;
  name: string;
  description: string;
  category: string;
  status?: 'active' | 'draft' | 'archived';
  created_at?: string;
  created_by?: string;
  rules: {
    signature_threshold: string;
    daily_limit?: string;
    time_lock_hours?: number;
    min_time_lock_amount?: string;
    emergency_override?: boolean;
  };
}

// 统一的治理策略数据源
// 这些数据应该从后端API加载，这里作为临时的模拟数据
export const GOVERNANCE_POLICIES: GovernancePolicy[] = [
  {
    id: '1',
    name: '🏢 企业保守型',
    description: '适合大型企业，注重安全性和合规性，所有交易需要多重审批',
    category: 'enterprise',
    status: 'active',
    created_at: '2024-01-15T10:00:00Z',
    created_by: 'admin',
    rules: {
      signature_threshold: '3/5',
      daily_limit: '500 ETH',
      time_lock_hours: 24,
      min_time_lock_amount: '100 ETH',
      emergency_override: false
    }
  },
  {
    id: '2',
    name: '💼 企业灵活型',
    description: '平衡安全性和效率，小额交易快速处理，大额交易严格审批',
    category: 'enterprise',
    status: 'active',
    created_at: '2024-01-10T14:30:00Z',
    created_by: 'admin',
    rules: {
      signature_threshold: '2/3',
      daily_limit: '1000 ETH',
      time_lock_hours: 0,
      min_time_lock_amount: '50 ETH',
      emergency_override: true
    }
  },
  {
    id: '3',
    name: '🔒 高安全型',
    description: '最高安全级别，适合存储大额资金，所有操作都需要严格审批和时间锁',
    category: 'security',
    status: 'active',
    created_at: '2024-01-05T09:15:00Z',
    created_by: 'admin',
    rules: {
      signature_threshold: '4/5',
      daily_limit: '100 ETH',
      time_lock_hours: 48,
      min_time_lock_amount: '10 ETH',
      emergency_override: false
    }
  },
  {
    id: '4',
    name: '⚡ 快速操作型',
    description: '适合频繁交易的团队，简化审批流程，提高操作效率',
    category: 'operational',
    status: 'active',
    created_at: '2024-01-01T12:00:00Z',
    created_by: 'admin',
    rules: {
      signature_threshold: '2/3',
      daily_limit: '无限制',
      time_lock_hours: 0,
      emergency_override: true
    }
  }
];

// 获取活跃的治理策略（用于Safe创建页面）
export const getActiveGovernancePolicies = (): GovernancePolicy[] => {
  return GOVERNANCE_POLICIES.filter(policy => policy.status === 'active');
};

// 获取所有治理策略（用于Policies管理页面）
export const getAllGovernancePolicies = (): GovernancePolicy[] => {
  return GOVERNANCE_POLICIES;
};

// 根据ID获取策略
export const getGovernancePolicyById = (id: string): GovernancePolicy | undefined => {
  return GOVERNANCE_POLICIES.find(policy => policy.id === id);
};

// 根据分类获取策略
export const getGovernancePoliciesByCategory = (category: string): GovernancePolicy[] => {
  return GOVERNANCE_POLICIES.filter(policy => policy.category === category);
};

// 模拟API调用 - 获取治理策略
export const fetchGovernancePolicies = async (): Promise<GovernancePolicy[]> => {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // TODO: 替换为真实的API调用
  // return await apiService.getGovernancePolicies();
  
  return getAllGovernancePolicies();
};

// 模拟API调用 - 获取活跃策略（用于Safe创建）
export const fetchActiveGovernancePolicies = async (): Promise<GovernancePolicy[]> => {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 300));
  
  // TODO: 替换为真实的API调用
  // return await apiService.getActiveGovernancePolicies();
  
  return getActiveGovernancePolicies();
};

// 模拟API调用 - 创建新策略
export const createGovernancePolicy = async (policyData: Omit<GovernancePolicy, 'id' | 'created_at' | 'created_by'>): Promise<GovernancePolicy> => {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 800));
  
  const newPolicy: GovernancePolicy = {
    ...policyData,
    id: `custom_${Date.now()}`,
    created_at: new Date().toISOString(),
    created_by: 'current_user',
    status: policyData.status || 'draft'
  };
  
  // TODO: 替换为真实的API调用
  // return await apiService.createGovernancePolicy(newPolicy);
  
  // 临时添加到内存中（实际应该由后端处理）
  GOVERNANCE_POLICIES.push(newPolicy);
  
  return newPolicy;
};

// 模拟API调用 - 更新策略
export const updateGovernancePolicy = async (id: string, updates: Partial<GovernancePolicy>): Promise<GovernancePolicy> => {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 600));
  
  const policyIndex = GOVERNANCE_POLICIES.findIndex(p => p.id === id);
  if (policyIndex === -1) {
    throw new Error('策略不存在');
  }
  
  const updatedPolicy = {
    ...GOVERNANCE_POLICIES[policyIndex],
    ...updates,
    id // 确保ID不被覆盖
  };
  
  // TODO: 替换为真实的API调用
  // return await apiService.updateGovernancePolicy(id, updates);
  
  // 临时更新内存中的数据（实际应该由后端处理）
  GOVERNANCE_POLICIES[policyIndex] = updatedPolicy;
  
  return updatedPolicy;
};

// 模拟API调用 - 删除策略
export const deleteGovernancePolicy = async (id: string): Promise<void> => {
  // 模拟网络延迟
  await new Promise(resolve => setTimeout(resolve, 400));
  
  const policyIndex = GOVERNANCE_POLICIES.findIndex(p => p.id === id);
  if (policyIndex === -1) {
    throw new Error('策略不存在');
  }
  
  // TODO: 替换为真实的API调用
  // await apiService.deleteGovernancePolicy(id);
  
  // 临时从内存中删除（实际应该由后端处理）
  GOVERNANCE_POLICIES.splice(policyIndex, 1);
};
