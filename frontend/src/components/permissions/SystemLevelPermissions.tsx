// =====================================================
import { buildApiUrl, API_ENDPOINTS, getAuthHeaders } from '../../config/api';
// 系统级权限管理模块
// 版本: v1.0
// 功能: 系统级权限管理，包含用户管理、系统配置、系统初始化
// 作者: sfan
// 创建时间: 2024-04-07
// =====================================================

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { 
  Shield, 
  Users, 
  Settings,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Zap
} from 'lucide-react';

// =====================================================
// 类型定义
// =====================================================

interface User {
  id: string;
  email: string;
  username: string;
  full_name: string;
  role: string;
  is_active: boolean;
  created_at: string;
  wallet_address?: string;
}

interface SystemHealth {
  super_admin_count: number;
  total_users: number;
  total_safes: number;
  system_status: string;
}

interface SystemLevelPermissionsProps {
  activeModule: string;
  onError: (error: string) => void;
  onLoading: (loading: boolean) => void;
}

// =====================================================
// 主组件
// =====================================================

const SystemLevelPermissions: React.FC<SystemLevelPermissionsProps> = ({
  activeModule,
  onError,
  onLoading
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [systemHealth, setSystemHealth] = useState<SystemHealth | null>(null);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [availablePermissions, setAvailablePermissions] = useState<Array<{
    id: string;
    code: string;
    name: string;
    description: string;
    category: string;
    scope: string;
  }>>([]);
  
  // 权限分配弹窗的分页和搜索状态
  const [permissionPage, setPermissionPage] = useState(1);
  const [permissionPageSize] = useState(10);
  const [permissionSearch, setPermissionSearch] = useState('');
  const [permissionCategory, setPermissionCategory] = useState('');
  const [permissionTotal, setPermissionTotal] = useState(0);
  const [refreshing, setRefreshing] = useState(false);

  const { token, user: currentUser } = useAuthStore();

  // 获取用户列表
  const fetchUsers = async () => {
    try {
      setRefreshing(true);
      onLoading(true);
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || buildApiUrl('')}/api/v1/users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...getAuthHeaders()
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setUsers(data.users || data || []);
        onError('');
      } else {
          onError(`获取用户列表失败: ${response.status}`);
      }
    } catch (error) {
      console.error('获取用户列表失败:', error);
      onError('网络错误，请检查后端服务是否正常运行');
    } finally {
      setRefreshing(false);
      onLoading(false);
    }
  };

  // 获取系统健康状态
  const fetchSystemHealth = async () => {
    try {
      onLoading(true);
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || buildApiUrl('')}/api/admin/health`);
      
      if (response.ok) {
        const data = await response.json();
        setSystemHealth(data.data);
        onError('');
      } else {
        onError('获取系统状态失败');
      }
    } catch (error) {
      console.error('获取系统状态失败:', error);
      onError('获取系统状态失败');
    } finally {
      onLoading(false);
    }
  };

  // 系统初始化
  const handleInitSystem = async () => {
    try {
      onLoading(true);
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || buildApiUrl('')}/api/admin/init`, {
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
        onError('');
      } else {
        onError(data.message || '系统初始化失败');
      }
    } catch (error) {
      console.error('系统初始化失败:', error);
      onError('网络错误，请稍后重试');
    } finally {
      onLoading(false);
    }
  };

  // 重置密码
  const handleResetPassword = async (adminEmail: string) => {
    try {
      onLoading(true);
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || buildApiUrl('')}/api/admin/reset-password`, {
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
        onError('');
      } else {
        onError(`密码重置失败: ${data.message}`);
      }
    } catch (error) {
      console.error('密码重置失败:', error);
      onError('网络错误，请稍后重试');
    } finally {
      onLoading(false);
    }
  };

  // 打开权限分配模态框
  const openPermissionModal = async (user: User) => {
    setSelectedUser(user);
    setSelectedPermissions([]);
    setShowPermissionModal(true);
    
    // 重置分页和搜索状态
    setPermissionPage(1);
    setPermissionSearch('');
    setPermissionCategory('');
    
    // 获取最新的权限定义
    await fetchPermissionDefinitions(1, '', '');
    
    // 获取用户已有的权限
    await fetchUserPermissions(user.id);
  };

  // 获取用户已有权限
  const fetchUserPermissions = async (userId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || buildApiUrl('')}/api/v1/users/${userId}/permissions`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...getAuthHeaders()
        }
      });

      const data = await response.json();

      if (data.success && data.data.permissions) {
        // 设置用户已有的权限为选中状态
        setSelectedPermissions(data.data.permissions);
        console.log('用户已有权限:', data.data.permissions);
      } else {
        console.warn('获取用户权限失败:', data.message);
      }
    } catch (error) {
      console.error('获取用户权限失败:', error);
    }
  };

  // 关闭权限分配模态框
  const closePermissionModal = () => {
    setSelectedUser(null);
    setSelectedPermissions([]);
    setShowPermissionModal(false);
  };

  // 权限分配
  const handleAssignPermissions = async () => {
    if (!selectedUser) return;
    
    try {
      onLoading(true);
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || buildApiUrl('')}/api/v1/users/${selectedUser.id}/permissions`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          permissions: selectedPermissions
        })
      });

      const data = await response.json();

      if (data.success) {
        alert('权限分配成功！');
        fetchUsers();
        closePermissionModal();
        onError('');
      } else {
        onError(`权限分配失败: ${data.message}`);
      }
    } catch (error) {
      console.error('权限分配失败:', error);
      onError('权限分配失败，请检查网络连接');
    } finally {
      onLoading(false);
    }
  };

  // 获取权限定义列表（支持分页和搜索）
  const fetchPermissionDefinitions = async (page = 1, search = '', category = '') => {
    try {
      const params = new URLSearchParams({
        scope: 'system',
        page: page.toString(),
        page_size: permissionPageSize.toString()
      });
      
      if (search) params.append('search', search);
      if (category) params.append('category', category);
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || buildApiUrl('')}/api/v1/permissions/definitions?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...getAuthHeaders()
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        const definitions = data.data?.definitions || [];
        const pagination = data.data?.pagination || {};
        
        setAvailablePermissions(definitions);
        setPermissionTotal(pagination.total || 0);
      } else {
        console.error('获取权限定义失败:', response.status);
        setAvailablePermissions([]);
        setPermissionTotal(0);
      }
    } catch (error) {
      console.error('获取权限定义失败:', error);
      setAvailablePermissions([]);
      setPermissionTotal(0);
    }
  };

  // 切换权限选择
  const togglePermission = (permissionId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  // 处理搜索
  const handlePermissionSearch = async (searchValue: string) => {
    setPermissionSearch(searchValue);
    setPermissionPage(1);
    await fetchPermissionDefinitions(1, searchValue, permissionCategory);
  };

  // 处理分类筛选
  const handleCategoryFilter = async (categoryValue: string) => {
    setPermissionCategory(categoryValue);
    setPermissionPage(1);
    await fetchPermissionDefinitions(1, permissionSearch, categoryValue);
  };

  // 处理分页
  const handlePageChange = async (page: number) => {
    setPermissionPage(page);
    await fetchPermissionDefinitions(page, permissionSearch, permissionCategory);
  };

  // 初始化数据
  useEffect(() => {
    if (activeModule === 'user-management') {
      fetchUsers();
    } else if (activeModule === 'system-config') {
      fetchSystemHealth();
    }
  }, [activeModule]);

  // 渲染用户管理模块
  const renderUserManagement = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5" />
            用户管理
          </h3>
          <p className="text-sm text-gray-600 mt-1">管理系统用户、角色分配和权限配置</p>
        </div>
        <Button
          onClick={fetchUsers}
          disabled={refreshing}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          {refreshing ? (
            <>
              <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
              刷新中
            </>
          ) : (
            <>
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新列表
            </>
          )}
        </Button>
      </div>

      <Card>
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
                <tr key={user.id} className="hover:bg-gray-50">
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
                        <Button
                          onClick={() => handleResetPassword(user.email)}
                          size="sm"
                          className="bg-yellow-600 hover:bg-yellow-700 text-white"
                        >
                          重置密码
                        </Button>
                      ) : (
                        // 对其他用户显示分配权限
                        <Button
                          onClick={() => openPermissionModal(user)}
                          size="sm"
                          className="bg-green-600 hover:bg-green-700 text-white"
                        >
                          分配权限
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {users.length === 0 && (
            <div className="text-center py-8">
              <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">暂无用户数据</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );

  // 渲染系统配置模块
  const renderSystemConfig = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            系统配置
          </h3>
          <p className="text-sm text-gray-600 mt-1">系统健康监控、全局策略配置</p>
        </div>
        <Button
          onClick={fetchSystemHealth}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          刷新状态
        </Button>
      </div>

      {systemHealth && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="p-6 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-blue-800 mb-2">超级管理员数量</h4>
                <p className="text-2xl font-bold text-blue-900">{systemHealth.super_admin_count}</p>
              </div>
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
          </Card>
          
          <Card className="p-6 bg-green-50 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-green-800 mb-2">总用户数</h4>
                <p className="text-2xl font-bold text-green-900">{systemHealth.total_users}</p>
              </div>
              <Users className="w-8 h-8 text-green-600" />
            </div>
          </Card>
          
          <Card className="p-6 bg-purple-50 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-purple-800 mb-2">Safe钱包数</h4>
                <p className="text-2xl font-bold text-purple-900">{systemHealth.total_safes}</p>
              </div>
              <Settings className="w-8 h-8 text-purple-600" />
            </div>
          </Card>
        </div>
      )}

      <Card className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h4 className="text-sm font-medium text-gray-800 mb-2">系统状态</h4>
            <div className="flex items-center gap-2">
              {systemHealth?.system_status === 'healthy' ? (
                <>
                  <CheckCircle className="w-5 h-5 text-green-500" />
                  <span className="text-lg text-green-700 font-medium">系统正常运行</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  <span className="text-lg text-red-700 font-medium">系统异常</span>
                </>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );

  // 渲染系统初始化模块
  const renderSystemInit = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
          <Zap className="w-5 h-5" />
          系统初始化
        </h3>
        <p className="text-sm text-gray-600 mt-1">初始化系统超级管理员和基础配置</p>
      </div>
      
      <Card className="p-6 bg-yellow-50 border-yellow-200">
        <div className="flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-yellow-600 mt-0.5" />
          <div>
            <h4 className="text-sm font-medium text-yellow-800 mb-2">⚠️ 注意事项</h4>
            <ul className="text-sm text-yellow-700 space-y-1">
              <li>• 系统初始化只需要执行一次</li>
              <li>• 如果系统已经初始化，此操作不会创建新的超级管理员</li>
              <li>• 初始化成功后会生成临时密码，请立即修改</li>
              <li>• 超级管理员拥有系统的完全控制权限</li>
            </ul>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="text-center">
          <Zap className="w-16 h-16 text-blue-600 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">系统初始化</h4>
          <p className="text-gray-600 mb-6">
            点击下方按钮初始化系统超级管理员账户
          </p>
          <Button
            onClick={handleInitSystem}
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3"
          >
            <Zap className="w-4 h-4 mr-2" />
            初始化系统
          </Button>
        </div>
      </Card>
    </div>
  );

  // 渲染权限分配模态框
  const renderPermissionModal = () => {
    if (!showPermissionModal || !selectedUser) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              为 {selectedUser.email} 分配权限
            </h3>
            <Button
              onClick={closePermissionModal}
              size="sm"
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </Button>
          </div>

          <div className="space-y-4 mb-6">
            <p className="text-sm text-gray-600">
              请选择要分配给用户的权限。用户将能够执行所选权限对应的操作。
            </p>
            
            {/* 搜索和筛选区域 */}
            <div className="flex flex-col sm:flex-row gap-3 p-4 bg-gray-50 rounded-lg">
              <div className="flex-1">
                <input
                  type="text"
                  placeholder="搜索权限名称或代码..."
                  value={permissionSearch}
                  onChange={(e) => handlePermissionSearch(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                />
              </div>
              <div className="sm:w-48">
                <select
                  value={permissionCategory}
                  onChange={(e) => handleCategoryFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                >
                  <option value="">所有分类</option>
                  <option value="system">系统管理</option>
                  <option value="api">API访问</option>
                  <option value="menu">菜单权限</option>
                  <option value="audit">审计权限</option>
                </select>
              </div>
            </div>
            
            {/* 权限列表 */}
            <div className="space-y-3 max-h-96 overflow-y-auto">
              {availablePermissions.length > 0 ? (
                availablePermissions.map((permission) => (
                  <div key={permission.code} className="flex items-start space-x-3 p-3 border rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      id={permission.code}
                      checked={selectedPermissions.includes(permission.code)}
                      onChange={() => togglePermission(permission.code)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <label htmlFor={permission.code} className="text-sm font-medium text-gray-900 cursor-pointer">
                        {permission.name}
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        {permission.description}
                      </p>
                      <p className="text-xs text-blue-600 mt-1">
                        {permission.code} ({permission.category})
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <div className="text-4xl mb-2">🔍</div>
                  <p>没有找到匹配的权限</p>
                  <p className="text-xs mt-1">请尝试调整搜索条件</p>
                </div>
              )}
            </div>
            
            {/* 分页控件 */}
            {permissionTotal > permissionPageSize && (
              <div className="flex items-center justify-between pt-4 border-t">
                <div className="text-sm text-gray-500">
                  共 {permissionTotal} 个权限，第 {permissionPage} 页
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => handlePageChange(permissionPage - 1)}
                    disabled={permissionPage <= 1}
                    className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    上一页
                  </button>
                  <span className="px-3 py-1 text-sm">
                    {permissionPage} / {Math.ceil(permissionTotal / permissionPageSize)}
                  </span>
                  <button
                    onClick={() => handlePageChange(permissionPage + 1)}
                    disabled={permissionPage >= Math.ceil(permissionTotal / permissionPageSize)}
                    className="px-3 py-1 text-sm border rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    下一页
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              onClick={closePermissionModal}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700"
            >
              取消
            </Button>
            <Button
              onClick={handleAssignPermissions}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={selectedPermissions.length === 0}
            >
              分配权限 ({selectedPermissions.length})
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // 根据激活的模块渲染内容
  const renderContent = () => {
    switch (activeModule) {
      case 'user-management':
        return renderUserManagement();
      case 'system-config':
        return renderSystemConfig();
      case 'system-init':
        return renderSystemInit();
      default:
        return (
          <div className="text-center py-12">
            <Settings className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">系统级权限管理</h3>
            <p className="text-gray-500">请选择一个功能模块开始管理系统级权限</p>
          </div>
        );
    }
  };

  return (
    <>
      {renderContent()}
      {renderPermissionModal()}
    </>
  );
};

export default SystemLevelPermissions;
