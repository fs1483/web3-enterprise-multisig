import React, { useState, useEffect } from 'react';
import { buildApiUrl, API_ENDPOINTS, getAuthHeaders } from '../config/api';
import { useAuthStore } from '../stores/authStore';

interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
}

interface SystemHealth {
  super_admin_count: number;
  total_users: number;
  total_safes: number;
  system_status: string;
}

const AdminManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'users' | 'system' | 'init'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [showPasswordModal, setShowPasswordModal] = useState<User | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState<User | null>(null);

  const { token, user: currentUser } = useAuthStore();

  // 检查是否为管理员（支持 admin 和 super_admin 角色）
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  useEffect(() => {
    if (isAdmin) {
      fetchUsers();
      fetchSystemHealth();
    }
  }, [isAdmin]);

  const fetchUsers = async () => {
    try {
      console.log('正在获取用户列表...');
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || buildApiUrl('')}/api/v1/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...getAuthHeaders()
        }
      });
      
      console.log('API响应状态:', response.status);
      
      if (response.ok) {
        const data = await response.json();
        console.log('API返回数据:', data);
        setUsers(data.users || data || []);
      } else {
        const errorText = await response.text();
        console.error('API请求失败:', response.status, errorText);
        setError(`获取用户列表失败: ${response.status}`);
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
      setError('网络错误，请检查后端服务是否正常运行');
    }
  };

  const fetchSystemHealth = async () => {
    try {
      const response = await fetch('/api/admin/health');
      
      if (response.ok) {
        const data = await response.json();
        setSystemHealth(data.data);
      }
    } catch (error) {
      console.error('获取系统状态失败:', error);
    }
  };

  const handleInitSystem = async () => {
    setIsLoading(true);
    setError('');

    try {
      const response = await fetch('/api/admin/init', {
        method: 'POST',
        headers: {
          ...getAuthHeaders()
        }
      });

      const data = await response.json();

      if (data.success) {
        if (data.data.temp_password) {
          alert(`系统初始化成功！\n超级管理员邮箱: ${data.data.super_admin_email}\n临时密码: ${data.data.temp_password}\n\n请立即登录并修改密码！`);
        } else {
          alert('系统已经初始化过了');
        }
        fetchSystemHealth();
      } else {
        setError(data.message || '系统初始化失败');
      }
    } catch (error) {
      console.error('系统初始化失败:', error);
      setError('网络错误，请稍后重试');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetCustomPassword = async (adminEmail: string, newPassword: string) => {
    try {
      const response = await fetch('/api/admin/set-password', {
        method: 'POST',
        headers: {
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          admin_email: adminEmail,
          new_password: newPassword
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('密码设置成功！');
        setShowPasswordModal(null);
      } else {
        alert(`密码设置失败: ${data.message}`);
      }
    } catch (error) {
      console.error('密码设置失败:', error);
      alert('网络错误，请稍后重试');
    }
  };

  const handleResetPassword = async (adminEmail: string) => {
    try {
      const response = await fetch('/api/admin/reset-password', {
        method: 'POST',
        headers: {
          ...getAuthHeaders()
        },
        body: JSON.stringify({
          admin_email: adminEmail
        })
      });

      const data = await response.json();

      if (data.success) {
        alert(`密码重置成功！\n新临时密码: ${data.data.temp_password}\n\n请立即登录并修改密码！`);
      } else {
        alert(`密码重置失败: ${data.message}`);
      }
    } catch (error) {
      console.error('密码重置失败:', error);
      alert('网络错误，请稍后重试');
    }
  };

  const handleAssignPermissions = async (userId: string, permissions: string[]) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || buildApiUrl('')}/api/v1/users/${userId}/permissions`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          permissions: permissions
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('权限分配成功！');
        fetchUsers();
        setShowPermissionModal(null);
      } else {
        alert(`权限分配失败: ${data.message}`);
      }
    } catch (error) {
      console.error('权限分配失败:', error);
      alert('网络错误，请稍后重试');
    }
  };

  // 权限分配模态框
  const PermissionAssignmentModal: React.FC<{ user: User; onClose: () => void }> = ({ user, onClose }) => {
    const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
    const [isLoadingPermissions, setIsLoadingPermissions] = useState(true);

    const availablePermissions = [
      { id: 'system.admin.full', name: '系统管理员权限', description: '拥有系统完全管理权限' },
      { id: 'system.user.manage', name: '用户管理权限', description: '允许管理用户账户和权限' },
      { id: 'system.audit.view', name: '审计日志查看', description: '允许查看系统审计日志' },
      { id: 'safe.info.view', name: 'Safe查看权限', description: '允许查看Safe钱包信息' },
      { id: 'safe.info.manage', name: 'Safe管理权限', description: '允许管理Safe钱包设置' },
      { id: 'safe.member.view', name: 'Safe成员查看', description: '允许查看Safe成员信息' },
      { id: 'safe.member.invite', name: 'Safe成员邀请', description: '允许邀请新成员加入Safe' },
      { id: 'safe.proposal.view', name: '提案查看权限', description: '允许查看提案详情' },
      { id: 'safe.proposal.create', name: '提案创建权限', description: '允许创建新提案' },
      { id: 'safe.proposal.sign', name: '提案签名权限', description: '允许签名提案' },
      { id: 'safe.proposal.execute', name: '提案执行权限', description: '允许执行提案' }
    ];

    // 获取用户当前权限
    useEffect(() => {
      const fetchUserPermissions = async () => {
        try {
          setIsLoadingPermissions(true);
          
          // 从authStore获取token，如果不存在则从localStorage获取
          const authToken = useAuthStore.getState().token || localStorage.getItem('token');
          
          console.log('Auth token:', authToken ? `${authToken.substring(0, 20)}...` : 'null');
          
          if (!authToken) {
            console.error('未找到认证token');
            setIsLoadingPermissions(false);
            return;
          }

          const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || buildApiUrl('')}/api/v1/users/${user.id}/permissions`, {
            headers: {
              'Authorization': `Bearer ${authToken}`,
              ...getAuthHeaders(),
            },
          });

          if (response.ok) {
            const result = await response.json();
            console.log('API返回结果:', result);
            if (result.success && result.data.permissions) {
              console.log('用户当前权限:', result.data.permissions);
              setSelectedPermissions(result.data.permissions);
            } else {
              console.log('权限数据为空或格式错误');
              setSelectedPermissions([]);
            }
          } else {
            console.error('获取用户权限失败:', response.status, response.statusText);
            const errorData = await response.text();
            console.error('错误详情:', errorData);
            if (response.status === 401) {
              console.error('认证失败，请重新登录');
              // 可能需要重定向到登录页面或清除无效token
            }
          }
        } catch (error) {
          console.error('获取用户权限时发生错误:', error);
        } finally {
          setIsLoadingPermissions(false);
        }
      };

      fetchUserPermissions();
    }, [user.id]);

    const handlePermissionToggle = (permissionId: string) => {
      setSelectedPermissions(prev => 
        prev.includes(permissionId)
          ? prev.filter(id => id !== permissionId)
          : [...prev, permissionId]
      );
    };

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (selectedPermissions.length === 0) {
        alert('请至少选择一个权限');
        return;
      }
      handleAssignPermissions(user.id, selectedPermissions);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-96 max-h-96 overflow-y-auto">
          <h3 className="text-lg font-semibold mb-4">为 {user.email} 分配权限</h3>
          
          {isLoadingPermissions ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              <span className="ml-3 text-gray-600">正在加载当前权限...</span>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <div className="space-y-3 mb-4">
                {availablePermissions.map((permission) => (
                  <div key={permission.id} className="flex items-start space-x-3">
                    <input
                      type="checkbox"
                      id={permission.id}
                      checked={selectedPermissions.includes(permission.id)}
                      onChange={() => handlePermissionToggle(permission.id)}
                      className="mt-1"
                    />
                    <div className="flex-1">
                      <label htmlFor={permission.id} className="text-sm font-medium text-gray-700 cursor-pointer">
                        {permission.name}
                      </label>
                      <p className="text-xs text-gray-500">{permission.description}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="flex space-x-3">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  分配权限
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  取消
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  };

  // 自定义密码模态框
  const CustomPasswordModal: React.FC<{ user: User; onClose: () => void }> = ({ user, onClose }) => {
    const [newPassword, setNewPassword] = useState('');

    const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (newPassword.length < 8) {
        alert('密码至少需要8位字符');
        return;
      }
      handleSetCustomPassword(user.email, newPassword);
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-96">
          <h3 className="text-lg font-semibold mb-4">为 {user.email} 设置自定义密码</h3>
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                新密码（至少8位）
              </label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
                minLength={8}
              />
            </div>
            <div className="flex space-x-3">
              <button
                type="submit"
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                设置密码
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                取消
              </button>
            </div>
          </form>
        </div>
      </div>
    );
  };

  if (!isAdmin) {
    return (
      <div className="p-8 text-center">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h1 className="text-xl font-semibold text-red-800 mb-2">访问受限</h1>
          <p className="text-red-600">只有超级管理员才能访问此页面</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md">
        {/* 标题 */}
        <div className="border-b border-gray-200 px-6 py-4">
          <h1 className="text-2xl font-semibold text-gray-900">超级管理员权限配置</h1>
          <p className="text-sm text-gray-600 mt-1">系统管理和用户权限配置</p>
        </div>

        {/* 标签页导航 */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'users', label: '用户管理', icon: '👥' },
              { key: 'system', label: '系统状态', icon: '⚙️' },
              { key: 'init', label: '系统初始化', icon: '🚀' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* 标签页内容 */}
        <div className="p-6">
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">用户管理</h2>
                <button
                  onClick={fetchUsers}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                >
                  刷新列表
                </button>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        用户信息
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        角色
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        状态
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        注册时间
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        操作
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users
                    .filter((user) => {
                      // 超管可以看到所有用户
                      if (currentUser?.role === 'super_admin') {
                        return true;
                      }
                      // 管理员只能看到管理员和普通用户，看不到超管
                      if (currentUser?.role === 'admin') {
                        return user.role !== 'super_admin';
                      }
                      // 其他角色不应该访问这个页面
                      return false;
                    })
                    .map((user) => (
                      <tr key={user.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">{user.email}</div>
                            <div className="text-sm text-gray-500">{user.username}</div>
                            {user.full_name && (
                              <div className="text-sm text-gray-500">{user.full_name}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.role === 'super_admin' 
                              ? 'bg-purple-100 text-purple-800 border border-purple-200' 
                              : user.role === 'admin'
                              ? 'bg-red-100 text-red-800' 
                              : 'bg-blue-100 text-blue-800'
                          }`}>
                            {user.role === 'super_admin' ? '🔥 超级管理员' : user.role === 'admin' ? '管理员' : '普通用户'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.is_active 
                              ? 'bg-green-100 text-green-800' 
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.is_active ? '活跃' : '禁用'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(user.created_at).toLocaleString('zh-CN')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex space-x-2">
                            {user.id === currentUser?.id ? (
                              // 对自己只显示重置密码
                              <button
                                onClick={() => handleResetPassword(user.email)}
                                className="px-3 py-1 bg-yellow-600 text-white rounded text-xs hover:bg-yellow-700"
                              >
                                重置密码
                              </button>
                            ) : (
                              // 对其他用户显示分配权限
                              <button
                                onClick={() => setShowPermissionModal(user)}
                                className="px-3 py-1 bg-green-600 text-white rounded text-xs hover:bg-green-700"
                              >
                                分配权限
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'system' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">系统状态</h2>
                <button
                  onClick={fetchSystemHealth}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                >
                  刷新状态
                </button>
              </div>

              {systemHealth && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-blue-800 mb-2">超级管理员数量</h3>
                    <p className="text-2xl font-bold text-blue-900">{systemHealth.super_admin_count}</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-green-800 mb-2">总用户数</h3>
                    <p className="text-2xl font-bold text-green-900">{systemHealth.total_users}</p>
                  </div>
                  <div className="bg-purple-50 rounded-lg p-4">
                    <h3 className="text-sm font-medium text-purple-800 mb-2">Safe钱包数</h3>
                    <p className="text-2xl font-bold text-purple-900">{systemHealth.total_safes}</p>
                  </div>
                </div>
              )}

              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-800 mb-2">系统状态</h3>
                <p className="text-lg text-gray-900">
                  {systemHealth?.system_status === 'healthy' ? '✅ 系统正常运行' : '⚠️ 系统异常'}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'init' && (
            <div className="space-y-6">
              <h2 className="text-lg font-medium text-gray-900">系统初始化</h2>
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-4">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-yellow-800 mb-2">⚠️ 注意事项</h3>
                <ul className="text-sm text-yellow-700 space-y-1">
                  <li>• 系统初始化只需要执行一次</li>
                  <li>• 如果系统已经初始化，此操作不会创建新的超级管理员</li>
                  <li>• 初始化成功后会生成临时密码，请立即修改</li>
                </ul>
              </div>

              <button
                onClick={handleInitSystem}
                disabled={isLoading}
                className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? '初始化中...' : '初始化系统'}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* 权限分配模态框 */}
      {showPermissionModal && (
        <PermissionAssignmentModal
          user={showPermissionModal}
          onClose={() => setShowPermissionModal(null)}
        />
      )}

      {/* 自定义密码模态框 */}
      {showPasswordModal && (
        <CustomPasswordModal
          user={showPasswordModal}
          onClose={() => setShowPasswordModal(null)}
        />
      )}
    </div>
  );
};

export default AdminManagement;
