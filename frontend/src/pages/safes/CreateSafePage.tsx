import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Shield, Users, AlertCircle, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useWalletStore } from '../../stores/walletStore';
import { Layout } from '../../components/layout/Layout';
import { UserSelectInput } from '../../components/ui/UserSelectInput';
import apiService from '../../services/apiService';
import { ethers } from 'ethers';

interface Owner {
  address: string;
  name: string;
}

interface User {
  id: string;
  name: string;
  wallet_address: string;
}

/**
 * 简化版Safe创建页面 - 支持异步交易提交
 */
export const CreateSafePage: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, token, user } = useAuthStore();
  const { isConnected, address, signer } = useWalletStore();

  // 表单状态
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    threshold: 1
  });
  const [owners, setOwners] = useState<Owner[]>([
    { address: '', name: '' }
  ]);

  // UI状态
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // 用户列表状态
  const [users, setUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);

  // 加载用户列表
  useEffect(() => {
    const loadUsers = async () => {
      try {
        setLoadingUsers(true);
        const response = await apiService.getUsersForSelection() as { users: User[] };
        setUsers(response.users || []);
      } catch (err) {
        console.error('Failed to load users:', err);
        // 静默失败，不影响主要功能
      } finally {
        setLoadingUsers(false);
      }
    };

    if (isAuthenticated) {
      loadUsers();
    }
  }, [isAuthenticated]);

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
  const updateOwner = (index: number, field: 'name' | 'address', value: string) => {
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

  // 表单验证
  const validateForm = (): string | null => {
    if (!formData.name.trim()) {
      return 'Safe名称不能为空';
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
      if (!/^0x[a-fA-F0-9]{40}$/.test(owner.address)) {
        return `第${i + 1}个所有者地址格式不正确`;
      }
    }

    if (formData.threshold < 1 || formData.threshold > owners.length) {
      return `签名阈值必须在1到${owners.length}之间`;
    }

    return null;
  };

  // 提交表单 - 异步模式
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // 验证用户登录状态
    if (!isAuthenticated || !token || !user) {
      setError('请先登录');
      navigate('/login');
      return;
    }

    // 表单验证
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // 检查钱包连接状态
      if (!isConnected || !address) {
        throw new Error('请先连接钱包');
      }

      console.log('🚀 开始创建Safe交易...');
      
      // 调用真实的区块链Safe创建
      console.log('📝 调用区块链Safe创建...');
      
      if (!signer) {
        throw new Error('钱包签名器未初始化');
      }
      
      // Safe Factory 合约地址 (Sepolia)
      const SAFE_FACTORY_ADDRESS = '0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2';
      const SAFE_SINGLETON_ADDRESS = '0xd9Db270c1B5E3Bd161E8c8503c55cEABeE709552';
      
      // Safe Factory ABI (简化版)
      const safeFactoryABI = [
        'function createProxyWithNonce(address _singleton, bytes initializer, uint256 saltNonce) returns (address proxy)'
      ];
      
      // Safe Singleton ABI (简化版)
      const safeSingletonABI = [
        'function setup(address[] _owners, uint256 _threshold, address to, bytes data, address fallbackHandler, address paymentToken, uint256 payment, address paymentReceiver)'
      ];
      
      const safeFactory = new ethers.Contract(SAFE_FACTORY_ADDRESS, safeFactoryABI, signer);
      const safeSingleton = new ethers.Contract(SAFE_SINGLETON_ADDRESS, safeSingletonABI, signer);
      
      // 编码初始化数据
      const setupData = safeSingleton.interface.encodeFunctionData('setup', [
        owners.map(owner => owner.address),
        formData.threshold,
        ethers.ZeroAddress, // to
        '0x', // data
        ethers.ZeroAddress, // fallbackHandler
        ethers.ZeroAddress, // paymentToken
        0, // payment
        ethers.ZeroAddress // paymentReceiver
      ]);
      
      // 创建Safe
      const saltNonce = Date.now(); // 使用时间戳作为nonce
      const tx = await safeFactory.createProxyWithNonce(
        SAFE_SINGLETON_ADDRESS,
        setupData,
        saltNonce
      );
      
      console.log('✅ Safe创建交易已提交:', tx.hash);
      const txHash = tx.hash;

      // 调用后端API创建异步交易记录
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
            chain_id: 11155111 // Sepolia测试网
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

    } catch (err: any) {
      console.error('❌ 创建Safe失败:', err);
      setError(err.message || '创建Safe失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="max-w-2xl mx-auto">
        {/* 头部 */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center text-gray-600 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-5 h-5 mr-2" />
            返回控制台
          </button>
          
          <div className="flex items-center mb-2">
            <Shield className="w-8 h-8 text-blue-600 mr-3" />
            <h1 className="text-3xl font-bold text-gray-900">创建Safe钱包</h1>
          </div>
          <p className="text-gray-600">
            创建一个新的多签Safe钱包，支持多人共同管理资产
          </p>
        </div>

        {/* 表单 */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* 基本信息 */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">基本信息</h2>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Safe名称 *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入Safe钱包名称"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    描述（可选）
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="输入Safe钱包描述"
                    rows={3}
                  />
                </div>
              </div>
            </div>

            {/* 所有者设置 */}
            <div className="mb-32">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-gray-900">所有者设置</h2>
                <button
                  type="button"
                  onClick={addOwner}
                  className="flex items-center px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-lg hover:bg-blue-200"
                >
                  <Users className="w-4 h-4 mr-1" />
                  添加所有者
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                {owners.map((owner, index) => (
                  <div 
                    key={index} 
                    style={{ 
                      position: 'relative',
                      zIndex: 1000 - index,
                      minHeight: '4rem',
                      paddingBottom: '0.5rem'
                    }}
                  >
                    {/* 水平布局：名称和地址在同一行 */}
                    <div style={{ display: 'flex', alignItems: 'flex-start', gap: '4rem' }}>
                      {/* 所有者名称 */}
                      <div style={{ position: 'relative', zIndex: 10000, width: '18rem' }}>
                        <label style={{ 
                          display: 'block', 
                          fontSize: '0.875rem', 
                          fontWeight: '500', 
                          color: '#374151', 
                          marginBottom: '0.5rem' 
                        }}>
                          所有者名称
                        </label>
                        <UserSelectInput
                          value={owner.name}
                          onChange={(value) => updateOwner(index, 'name', value)}
                          onUserSelect={(user) => handleUserSelect(index, user)}
                          placeholder="输入名称或选择用户"
                          users={users}
                        />
                        {loadingUsers && (
                          <div style={{ 
                            fontSize: '0.75rem', 
                            color: '#6b7280', 
                            marginTop: '0.5rem' 
                          }}>
                            正在加载用户列表...
                          </div>
                        )}
                      </div>
                      
                      {/* 钱包地址 */}
                      <div style={{ width: '24rem' }}>
                        <label style={{ 
                          display: 'block', 
                          fontSize: '0.875rem', 
                          fontWeight: '500', 
                          color: '#374151', 
                          marginBottom: '0.5rem' 
                        }}>
                          钱包地址
                        </label>
                        <input
                          type="text"
                          value={owner.address}
                          onChange={(e) => updateOwner(index, 'address', e.target.value)}
                          style={{
                            width: '100%',
                            padding: '0.5rem 0.75rem',
                            border: '1px solid #d1d5db',
                            borderRadius: '0.5rem',
                            fontSize: '0.875rem',
                            fontFamily: 'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
                            outline: 'none',
                            transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out'
                          }}
                          placeholder="0x..."
                          required
                          onFocus={(e) => {
                            e.target.style.borderColor = '#3b82f6';
                            e.target.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.1)';
                          }}
                          onBlur={(e) => {
                            e.target.style.borderColor = '#d1d5db';
                            e.target.style.boxShadow = 'none';
                          }}
                        />
                      </div>
                      
                      {/* 删除按钮 */}
                      {owners.length > 1 && (
                        <div style={{ paddingTop: '1.75rem' }}>
                          <button
                            type="button"
                            onClick={() => removeOwner(index)}
                            style={{
                              padding: '0.5rem',
                              color: '#dc2626',
                              backgroundColor: 'transparent',
                              border: 'none',
                              borderRadius: '0.5rem',
                              cursor: 'pointer',
                              transition: 'background-color 0.15s ease-in-out'
                            }}
                            title="移除所有者"
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = '#fef2f2';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'transparent';
                            }}
                          >
                            ✕
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* 签名阈值 */}
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">签名阈值</h2>
              <div className="flex items-center space-x-4">
                <label className="text-sm text-gray-700">
                  需要
                </label>
                <select
                  value={formData.threshold}
                  onChange={(e) => setFormData({ ...formData, threshold: parseInt(e.target.value) })}
                  className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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

            {/* 错误和成功消息 */}
            {error && (
              <div className="flex items-center p-4 bg-red-50 border border-red-200 rounded-lg">
                <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
                <span className="text-red-700">{error}</span>
              </div>
            )}

            {success && (
              <div className="flex items-center p-4 bg-green-50 border border-green-200 rounded-lg">
                <CheckCircle className="w-5 h-5 text-green-500 mr-2" />
                <span className="text-green-700">{success}</span>
              </div>
            )}

            {/* 提交按钮 */}
            <div className="flex justify-end space-x-4">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
                disabled={loading}
              >
                取消
              </button>
              <button
                type="submit"
                disabled={loading || !isAuthenticated}
                className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {loading ? '创建中...' : '创建Safe'}
              </button>
            </div>
          </form>
        </div>

        {/* 说明信息 */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="text-sm font-medium text-blue-900 mb-2">创建流程说明</h3>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• 点击"创建Safe"后，系统将异步提交区块链交易</li>
            <li>• 您可以立即关闭页面，系统会在后台处理</li>
            <li>• 交易确认后，您将收到WebSocket实时通知</li>
            <li>• 可以在状态页面查看创建进度</li>
          </ul>
        </div>
      </div>
    </Layout>
  );
};

export default CreateSafePage;
