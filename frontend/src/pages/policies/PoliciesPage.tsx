import React, { useState, useEffect } from 'react';
import { Layout } from '../../components/layout/Layout';
import { useAuthStore } from '../../stores/authStore';
import { fetchGovernancePolicies, type GovernancePolicy } from '../../data/governancePolicies';
import { Plus, Edit, Trash2, Shield, Clock, DollarSign, AlertTriangle } from 'lucide-react';

interface PolicyFormData {
  name: string;
  description: string;
  category: string;
  signature_threshold_numerator: number;
  signature_threshold_denominator: number;
  daily_limit_enabled: boolean;
  daily_limit_amount: string;
  time_lock_enabled: boolean;
  time_lock_hours: number;
  min_time_lock_amount: string;
  emergency_override: boolean;
}

export const PoliciesPage: React.FC = () => {
  const { isAuthenticated } = useAuthStore();
  
  // 状态管理
  const [policies, setPolicies] = useState<GovernancePolicy[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingPolicy, setEditingPolicy] = useState<GovernancePolicy | null>(null);
  
  // 表单数据
  const [formData, setFormData] = useState<PolicyFormData>({
    name: '',
    description: '',
    category: 'enterprise',
    signature_threshold_numerator: 2,
    signature_threshold_denominator: 3,
    daily_limit_enabled: false,
    daily_limit_amount: '100',
    time_lock_enabled: false,
    time_lock_hours: 24,
    min_time_lock_amount: '50',
    emergency_override: false
  });

  // 加载策略列表
  const loadPolicies = async () => {
    try {
      setLoading(true);
      // 使用统一的策略数据源，确保与CreateSafe页面数据一致
      const policies = await fetchGovernancePolicies();
      setPolicies(policies);
    } catch (err) {
      console.error('Failed to load policies:', err);
      setError('加载策略失败');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadPolicies();
    }
  }, [isAuthenticated]);

  // 创建策略
  const handleCreatePolicy = async () => {
    try {
      setLoading(true);
      
      // 构建策略规则
      // const rules = {
      //   signature_threshold: `${formData.signature_threshold_numerator}/${formData.signature_threshold_denominator}`,
      //   daily_limit: formData.daily_limit_enabled ? `${formData.daily_limit_amount} ETH` : undefined,
      //   time_lock_hours: formData.time_lock_enabled ? formData.time_lock_hours : 0,
      //   min_time_lock_amount: formData.time_lock_enabled ? `${formData.min_time_lock_amount} ETH` : undefined,
      //   emergency_override: formData.emergency_override
      // };

      // TODO: 实际API调用
      // await apiService.createGovernancePolicy({
      //   name: formData.name,
      //   description: formData.description,
      //   category: formData.category,
      //   rules
      // });

      // console.log('创建策略:', { ...formData, rules });
      
      // 重新加载策略列表
      await loadPolicies();
      
      // 重置表单并关闭模态框
      resetForm();
      setShowCreateModal(false);
      
    } catch (err) {
      console.error('Failed to create policy:', err);
      setError('创建策略失败');
    } finally {
      setLoading(false);
    }
  };

  // 重置表单
  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'enterprise',
      signature_threshold_numerator: 2,
      signature_threshold_denominator: 3,
      daily_limit_enabled: false,
      daily_limit_amount: '100',
      time_lock_enabled: false,
      time_lock_hours: 24,
      min_time_lock_amount: '50',
      emergency_override: false
    });
    setEditingPolicy(null);
  };

  // 删除策略
  const handleDeletePolicy = async (_policyId: string) => {
    if (!window.confirm('确定要删除这个策略吗？此操作不可撤销。')) {
      return;
    }

    try {
      // TODO: 实际API调用
      // await apiService.deleteGovernancePolicy(policyId);
      
      // console.log('删除策略:', policyId);
      await loadPolicies();
    } catch (err) {
      console.error('Failed to delete policy:', err);
      setError('删除策略失败');
    }
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900 mb-2">请先登录</h2>
            <p className="text-gray-600">您需要登录才能访问策略管理页面</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* 页面标题 */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">🏛️ 治理策略管理</h1>
              <p className="mt-2 text-gray-600">
                创建和管理企业级多签钱包的治理策略，定义签名规则、时间锁和支出限制
              </p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              <Plus className="h-4 w-4 mr-2" />
              创建策略
            </button>
          </div>
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-md p-4">
            <div className="flex">
              <AlertTriangle className="h-5 w-5 text-red-400" />
              <div className="ml-3">
                <p className="text-sm text-red-800">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* 策略列表 */}
        {loading ? (
          <div className="text-center py-12">
            <div className="text-lg text-gray-500">正在加载策略...</div>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {policies.map((policy) => (
              <div key={policy.id} className="bg-white rounded-lg shadow border border-gray-200 overflow-hidden">
                <div className="p-6">
                  {/* 策略标题和状态 */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 mb-1">
                        {policy.name}
                      </h3>
                      <p className="text-sm text-gray-600 mb-3">
                        {policy.description}
                      </p>
                      <div className="flex items-center space-x-2">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          policy.status === 'active' ? 'bg-green-100 text-green-800' :
                          policy.status === 'draft' ? 'bg-yellow-100 text-yellow-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {policy.status === 'active' ? '活跃' : policy.status === 'draft' ? '草稿' : '已归档'}
                        </span>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          policy.category === 'enterprise' ? 'bg-blue-100 text-blue-800' :
                          policy.category === 'security' ? 'bg-red-100 text-red-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {policy.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* 策略规则 */}
                  <div className="space-y-3 mb-4">
                    <div className="flex items-center text-sm">
                      <Shield className="h-4 w-4 text-blue-500 mr-2" />
                      <span className="font-medium text-gray-700 mr-2">签名阈值:</span>
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                        {policy.rules.signature_threshold}
                      </span>
                    </div>
                    
                    {policy.rules.daily_limit && (
                      <div className="flex items-center text-sm">
                        <DollarSign className="h-4 w-4 text-green-500 mr-2" />
                        <span className="font-medium text-gray-700 mr-2">日限额:</span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                          {policy.rules.daily_limit}
                        </span>
                      </div>
                    )}
                    
                    {policy.rules.time_lock_hours !== undefined && policy.rules.time_lock_hours > 0 && (
                      <div className="flex items-center text-sm">
                        <Clock className="h-4 w-4 text-yellow-500 mr-2" />
                        <span className="font-medium text-gray-700 mr-2">时间锁:</span>
                        <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded text-xs">
                          {policy.rules.time_lock_hours}小时
                        </span>
                      </div>
                    )}
                  </div>

                  {/* 操作按钮 */}
                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <div className="text-xs text-gray-500">
                      创建于 {policy.created_at ? new Date(policy.created_at).toLocaleDateString() : '未知'}
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => {
                          setEditingPolicy(policy);
                          setShowCreateModal(true);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 transition-colors"
                        title="编辑策略"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDeletePolicy(policy.id)}
                        className="p-2 text-gray-400 hover:text-red-600 transition-colors"
                        title="删除策略"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* 创建/编辑策略模态框 */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-11/12 md:w-3/4 lg:w-1/2 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingPolicy ? '编辑策略' : '创建新策略'}
                </h3>
                
                <form onSubmit={(e) => { e.preventDefault(); handleCreatePolicy(); }} className="space-y-4">
                  {/* 基本信息 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      策略名称 *
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="例如：企业标准型"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      策略描述 *
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="描述这个策略的适用场景和特点"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      策略类别
                    </label>
                    <select
                      value={formData.category}
                      onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="enterprise">企业级</option>
                      <option value="security">高安全</option>
                      <option value="operational">操作型</option>
                    </select>
                  </div>

                  {/* 签名阈值 */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      签名阈值 *
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="1"
                        value={formData.signature_threshold_numerator}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          signature_threshold_numerator: parseInt(e.target.value) || 1 
                        }))}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-gray-500">/</span>
                      <input
                        type="number"
                        min="1"
                        value={formData.signature_threshold_denominator}
                        onChange={(e) => setFormData(prev => ({ 
                          ...prev, 
                          signature_threshold_denominator: parseInt(e.target.value) || 1 
                        }))}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                      <span className="text-sm text-gray-600">
                        需要 {formData.signature_threshold_numerator} 个签名（共 {formData.signature_threshold_denominator} 个成员）
                      </span>
                    </div>
                  </div>

                  {/* 日限额 */}
                  <div>
                    <div className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        id="daily_limit_enabled"
                        checked={formData.daily_limit_enabled}
                        onChange={(e) => setFormData(prev => ({ ...prev, daily_limit_enabled: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="daily_limit_enabled" className="ml-2 block text-sm font-medium text-gray-700">
                        启用日限额
                      </label>
                    </div>
                    {formData.daily_limit_enabled && (
                      <div className="flex items-center space-x-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={formData.daily_limit_amount}
                          onChange={(e) => setFormData(prev => ({ ...prev, daily_limit_amount: e.target.value }))}
                          className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-600">ETH</span>
                      </div>
                    )}
                  </div>

                  {/* 时间锁 */}
                  <div>
                    <div className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        id="time_lock_enabled"
                        checked={formData.time_lock_enabled}
                        onChange={(e) => setFormData(prev => ({ ...prev, time_lock_enabled: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="time_lock_enabled" className="ml-2 block text-sm font-medium text-gray-700">
                        启用时间锁
                      </label>
                    </div>
                    {formData.time_lock_enabled && (
                      <div className="space-y-2">
                        <div className="flex items-center space-x-2">
                          <label className="text-sm text-gray-600 w-20">等待时间:</label>
                          <input
                            type="number"
                            min="1"
                            value={formData.time_lock_hours}
                            onChange={(e) => setFormData(prev => ({ ...prev, time_lock_hours: parseInt(e.target.value) || 1 }))}
                            className="w-20 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-600">小时</span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <label className="text-sm text-gray-600 w-20">最小金额:</label>
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={formData.min_time_lock_amount}
                            onChange={(e) => setFormData(prev => ({ ...prev, min_time_lock_amount: e.target.value }))}
                            className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                          />
                          <span className="text-sm text-gray-600">ETH（超过此金额才启用时间锁）</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 紧急覆盖 */}
                  <div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="emergency_override"
                        checked={formData.emergency_override}
                        onChange={(e) => setFormData(prev => ({ ...prev, emergency_override: e.target.checked }))}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="emergency_override" className="ml-2 block text-sm font-medium text-gray-700">
                        允许紧急覆盖
                      </label>
                    </div>
                    <p className="mt-1 text-xs text-gray-500">
                      允许在紧急情况下绕过时间锁等限制
                    </p>
                  </div>

                  {/* 按钮 */}
                  <div className="flex items-center justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCreateModal(false);
                        resetForm();
                      }}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      取消
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {loading ? '保存中...' : (editingPolicy ? '更新策略' : '创建策略')}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
};

export default PoliciesPage;
