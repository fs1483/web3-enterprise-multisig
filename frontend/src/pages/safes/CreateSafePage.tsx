import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../../components/layout/Layout';
import { useAuthStore } from '../../stores/authStore';
import { useWalletStore } from '../../stores/walletStore';
import { apiService } from '../../services/apiService';
import { fetchActiveGovernancePolicies } from '../../data/governancePolicies';
import { AlertCircle, CheckCircle } from 'lucide-react';

interface Owner {
  address: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  wallet_address: string;
}

interface GovernancePolicy {
  id: string;
  name: string;
  description: string;
  category: string;
  rules: {
    signature_threshold: string;
    daily_limit?: string;
    time_lock_hours?: number;
    min_time_lock_amount?: string;
    emergency_override?: boolean;
  };
}

// 移除自定义策略配置，改为从后端API加载预设策略

interface MemberRole {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  color: string;
}

export const CreateSafePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, token, user } = useAuthStore();
  const { isConnected, address, signer } = useWalletStore();

  // 表单数据
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    threshold: 1
  });

  // 所有者列表
  const [owners, setOwners] = useState<Owner[]>([
    { address: address || '', name: user?.name || '' }
  ]);

  // UI状态
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // 用户列表状态
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [loadingPolicies, setLoadingPolicies] = useState(false);

  // 治理策略和成员角色
  const [governancePolicies, setGovernancePolicies] = useState<GovernancePolicy[]>([]);
  const [memberRoles, setMemberRoles] = useState<MemberRole[]>([]);
  const [selectedPolicy, setSelectedPolicy] = useState<string>('');
  const [ownerRoles, setOwnerRoles] = useState<Record<string, string>>({});
  
  // 企业级RBAC架构：
  // 1. 权限模板 → Safe角色配置 → 成员角色分配
  // 2. 创建Safe时选择权限模板，建立Safe与模板的关联关系
  // 3. 就像在权限模板页面"应用给某个Safe"的操作一样

  // 加载用户列表、治理策略和成员角色
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoadingUsers(true);
        const response = await apiService.getUsersForSelection() as { users: User[] };
        setUsers(response.users || []);
      } catch (err) {
        console.error('Failed to load users:', err);
      } finally {
        setLoadingUsers(false);
      }
    };

    const loadGovernancePolicies = async () => {
      try {
        setLoadingPolicies(true);
        
        // 使用统一的策略数据源，确保与Policies页面数据一致
        const policies = await fetchActiveGovernancePolicies();
        setGovernancePolicies(policies);
        
        // 从权限模板API加载Safe级角色模板
        const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/role-templates?category=safe`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        if (response.ok) {
          const data = await response.json();
          console.log('权限模板数据:', data); // 调试日志
          
          // 处理API返回的数据结构（与SafeLevelPermissions保持一致）
          let templates = [];
          if (data.success && data.data && data.data.templates) {
            templates = data.data.templates;
          } else if (data.templates) {
            templates = data.templates;
          } else if (Array.isArray(data)) {
            templates = data;
          }
          
          // 转换模板数据格式以匹配前端接口
          const roles: MemberRole[] = templates.map((template: any) => ({
            id: template.id || template.ID,
            name: template.display_name || template.DisplayName || template.name || template.Name,
            description: template.description || template.Description,
            permissions: template.permissions || template.Permissions || [],
            color: '#8B5CF6' // 使用默认颜色
          }));
          
          setMemberRoles(roles);
          console.log('✅ Safe创建角色模板加载成功:', roles);
        } else {
          console.error('❌ Safe创建角色模板加载失败');
          setError('无法加载权限模板，请稍后重试');
        }
      } catch (err) {
        console.error('Failed to load policy templates:', err);
      } finally {
        setLoadingPolicies(false);
      }
    };

    if (isAuthenticated && token) {
      loadUsers();
      loadGovernancePolicies();
    }
  }, [isAuthenticated, token]);

  // 添加所有者
  const addOwner = () => {
    setOwners([...owners, { address: '', name: '' }]);
  };

  // 移除所有者
  const removeOwner = (index: number) => {
    if (owners.length > 1) {
      setOwners(owners.filter((_, i) => i !== index));
    }
  };

  // 更新所有者信息
  const updateOwner = (index: number, field: keyof Owner, value: string) => {
    const newOwners = [...owners];
    newOwners[index][field] = value;
    setOwners(newOwners);
  };

  // 处理用户选择
  const handleUserSelect = (index: number, user: User) => {
    const newOwners = [...owners];
    newOwners[index].name = user.name;
    newOwners[index].address = user.wallet_address;
    setOwners(newOwners);
  };

  // 选择治理策略
  const selectGovernancePolicy = (policyId: string) => {
    setSelectedPolicy(policyId);
  };


  // 为成员分配角色
  const assignMemberRole = (ownerAddress: string, roleId: string) => {
    setOwnerRoles(prev => ({
      ...prev,
      [ownerAddress]: roleId
    }));
  };

  // 表单验证
  const validateForm = (): string | null => {
    if (!formData.name.trim()) {
      return 'Safe名称不能为空';
    }

    if (!selectedPolicy) {
      return '请选择一个治理策略';
    }
    
    // 检查是否所有成员都分配了角色
    const unassignedMembers = owners.filter(owner => !ownerRoles[owner.address]);
    if (unassignedMembers.length > 0) {
      return '请为所有成员分配角色';
    }

    if (owners.length === 0) {
      return '至少需要一个所有者';
    }

    for (let i = 0; i < owners.length; i++) {
      const owner = owners[i];
      if (!owner.address.trim()) {
        return `第${i + 1}个所有者地址不能为空`;
      }
      if (!owner.name.trim()) {
        return `第${i + 1}个所有者名称不能为空`;
      }
    }

    if (formData.threshold < 1 || formData.threshold > owners.length) {
      return '签名阈值必须在1到所有者数量之间';
    }

    return null;
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    if (!isConnected || !signer) {
      setError('请先连接钱包');
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 模拟交易哈希（实际应该调用智能合约）
      const txHash = `0x${Math.random().toString(16).substr(2, 64)}`;
      
      // 调用后端API
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/safes`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            tx_hash: txHash,
            name: formData.name,
            description: formData.description,
            owners: owners.map(owner => owner.address),
            threshold: formData.threshold,
            chain_id: 11155111, // Sepolia测试网
            governance_policy: selectedPolicy, // 选择的治理策略
            member_roles: Object.entries(ownerRoles).map(([address, roleId]) => ({
              address,
              role_id: roleId
            })), // 成员角色分配
            permission_templates: Array.from(new Set(Object.values(ownerRoles))) // 获取所有使用的权限模板ID，去重
          })
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'API调用失败');
      }

      const result = await response.json();
      console.log('✅ 后端API响应:', result);

      // 保存交易信息到localStorage（用于状态页面）
      localStorage.setItem('pendingSafeCreation', JSON.stringify({
        id: result.transaction.id,
        txHash: result.transaction.tx_hash,
        status: result.transaction.status,
        safeName: formData.name
      }));

      setSuccess('Safe创建交易已提交！正在跳转到状态页面...');
      
      // 3秒后跳转到状态页面
      setTimeout(() => {
        navigate('/safes/status/' + result.transaction.id);
      }, 3000);

    } catch (err: unknown) {
      console.error('❌ 创建Safe失败:', err);
      setError(err instanceof Error ? err.message : '创建Safe失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-gray-900 mb-4">请先登录</h2>
            <p className="text-gray-600">您需要登录才能创建Safe</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto py-8 px-4">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h1 className="text-2xl font-bold text-gray-900 mb-6">创建新的Safe</h1>
          
          {/* 错误和成功消息 */}
          {error && (
            <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg mb-6">
              <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
              <span className="text-sm text-red-700">{error}</span>
            </div>
          )}

          {success && (
            <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg mb-6">
              <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
              <span className="text-sm text-green-700">{success}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-8">
            {/* 基本信息 */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">基本信息</h2>
              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Safe名称 *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="输入Safe名称"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    描述（可选）
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="输入Safe描述"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* 所有者管理 */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">所有者管理</h2>
              <div className="space-y-4">
                {owners.map((owner, index) => (
                  <div key={index} className="flex items-center space-x-4 p-4 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <input
                        type="text"
                        value={owner.name}
                        onChange={(e) => updateOwner(index, 'name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="所有者名称"
                        required
                      />
                    </div>
                    <div className="flex-2">
                      <input
                        type="text"
                        value={owner.address}
                        onChange={(e) => updateOwner(index, 'address', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="钱包地址"
                        required
                      />
                    </div>
                    {loadingUsers ? (
                      <div className="text-sm text-gray-500">加载中...</div>
                    ) : (
                      <select
                        onChange={(e) => {
                          const selectedUser = users.find(u => u.id === e.target.value);
                          if (selectedUser) {
                            handleUserSelect(index, selectedUser);
                          }
                        }}
                        className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="">选择用户</option>
                        {users.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.name} ({user.wallet_address.slice(0, 6)}...{user.wallet_address.slice(-4)})
                          </option>
                        ))}
                      </select>
                    )}
                    {owners.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOwner(index)}
                        className="px-3 py-2 text-sm text-red-600 hover:text-red-800"
                      >
                        移除
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addOwner}
                  className="w-full px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  + 添加所有者
                </button>
              </div>

              {/* 签名阈值 */}
              <div className="mt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  签名阈值
                </label>
                <div className="flex items-center space-x-2">
                  <select
                    value={formData.threshold}
                    onChange={(e) => setFormData({...formData, threshold: parseInt(e.target.value)})}
                    className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    {Array.from({ length: owners.length }, (_, i) => i + 1).map(num => (
                      <option key={num} value={num}>{num}</option>
                    ))}
                  </select>
                  <label className="text-sm text-gray-700">
                    个签名（共{owners.length}个所有者）
                  </label>
                </div>
              </div>
            </div>

            {/* 治理策略选择 */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">🏛️ 治理策略配置</h2>
              <p className="text-sm text-gray-600 mb-4">
                选择适合的治理策略来配置Safe的签名规则、时间锁和支出限制
              </p>
              
              {loadingPolicies ? (
                <div className="text-center py-4">
                  <div className="text-sm text-gray-500">正在加载治理策略...</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {governancePolicies.map((policy) => (
                    <div
                      key={policy.id}
                      className={`border rounded-lg transition-all cursor-pointer ${
                        selectedPolicy === policy.id
                          ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                      onClick={() => selectGovernancePolicy(policy.id)}
                    >
                      <div className="p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium text-gray-900 mb-1">
                              {policy.name}
                            </h3>
                            <p className="text-sm text-gray-600 mb-3">
                              {policy.description}
                            </p>
                            
                            {/* 策略规则展示 */}
                            <div className="space-y-2">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                                <div className="flex items-center">
                                  <span className="font-medium text-gray-700 mr-2">签名阈值:</span>
                                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded">
                                    {policy.rules.signature_threshold}
                                  </span>
                                </div>
                                {policy.rules.daily_limit && (
                                  <div className="flex items-center">
                                    <span className="font-medium text-gray-700 mr-2">日限额:</span>
                                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded">
                                      {policy.rules.daily_limit}
                                    </span>
                                  </div>
                                )}
                                {policy.rules.time_lock_hours !== undefined && policy.rules.time_lock_hours > 0 && (
                                  <div className="flex items-center">
                                    <span className="font-medium text-gray-700 mr-2">时间锁:</span>
                                    <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded">
                                      {policy.rules.time_lock_hours}小时
                                    </span>
                                  </div>
                                )}
                                {policy.rules.emergency_override !== undefined && (
                                  <div className="flex items-center">
                                    <span className="font-medium text-gray-700 mr-2">紧急覆盖:</span>
                                    <span className={`px-2 py-1 rounded ${
                                      policy.rules.emergency_override 
                                        ? 'bg-red-100 text-red-800' 
                                        : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      {policy.rules.emergency_override ? '允许' : '禁止'}
                                    </span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div className="mt-3">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                                policy.category === 'enterprise' ? 'bg-blue-100 text-blue-800' :
                                policy.category === 'security' ? 'bg-red-100 text-red-800' :
                                policy.category === 'operational' ? 'bg-green-100 text-green-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {policy.category}
                              </span>
                            </div>
                          </div>
                          <div className="ml-3">
                            <input
                              type="radio"
                              name="governance-policy"
                              checked={selectedPolicy === policy.id}
                              onChange={() => selectGovernancePolicy(policy.id)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300"
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 成员角色分配 */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">👥 成员角色分配</h2>
              <p className="text-sm text-gray-600 mb-4">
                为每个成员分配合适的角色，角色决定了成员在Safe中的权限
              </p>
              
              <div className="space-y-4">
                {owners.map((owner, index) => (
                  <div key={index} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <h4 className="font-medium text-gray-900">
                          {owner.name || `成员 ${index + 1}`}
                        </h4>
                        <p className="text-sm text-gray-500 font-mono">
                          {owner.address || '未设置地址'}
                        </p>
                      </div>
                      <div className="text-right">
                        <select
                          value={ownerRoles[owner.address] || ''}
                          onChange={(e) => assignMemberRole(owner.address, e.target.value)}
                          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">选择角色</option>
                          {memberRoles.map((role) => (
                            <option key={role.id} value={role.id}>
                              {role.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                    
                    {/* 显示选中角色的详情 */}
                    {ownerRoles[owner.address] && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-md">
                        {(() => {
                          const selectedRole = memberRoles.find(r => r.id === ownerRoles[owner.address]);
                          if (!selectedRole) return null;
                          return (
                            <div>
                              <div className="flex items-center mb-2">
                                <div 
                                  className="w-3 h-3 rounded-full mr-2" 
                                  style={{ backgroundColor: selectedRole.color }}
                                ></div>
                                <span className="text-sm font-medium text-gray-900">
                                  {selectedRole.name}
                                </span>
                              </div>
                              <p className="text-xs text-gray-600 mb-2">
                                {selectedRole.description}
                              </p>
                              <div className="flex flex-wrap gap-1">
                                {selectedRole.permissions.map((permission) => (
                                  <span
                                    key={permission}
                                    className="inline-flex px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded"
                                  >
                                    {permission}
                                  </span>
                                ))}
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* 提交按钮 */}
            <div className="flex justify-end space-x-4 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/safes')}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? '创建中...' : '创建Safe'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  );
};

export default CreateSafePage;
