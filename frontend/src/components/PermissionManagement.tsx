import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Layout } from './layout/Layout';
import { 
  Users, 
  Shield, 
  Plus,
  Activity
} from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { PermissionService } from '../services/permissionService';
import { debugAuthState } from '../utils/debugAuth';
import { runFullTest } from '../utils/testAuth';


interface SafeMember {
  user_id: string;
  username: string;
  email: string;
  wallet_address: string;
  role?: string;
}

interface GlobalUser {
  id: string;
  username: string;
  email: string;
  wallet_address: string;
  role: string;
  status: string;
  created_at: string;
}

interface PermissionDefinition {
  name: string;
  description: string;
  code: string;
}

interface AuditLog {
  id: string;
  action: string;
  user_id: string;
  created_at: string;
  details?: string;
  permission_granted?: boolean;
}

const PermissionManagement: React.FC = () => {
  const { safeId } = useParams<{ safeId?: string }>();
  const { isAuthenticated, token, user } = useAuthStore();
  const [members, setMembers] = useState<SafeMember[]>([]);
  const [permissionDefinitions, setPermissionDefinitions] = useState<PermissionDefinition[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [globalUsers, setGlobalUsers] = useState<GlobalUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentTab, setCurrentTab] = useState(0);

  // 处理自动测试登录
  const handleAutoTestLogin = async () => {
    try {
      console.log('🚀 开始自动测试登录流程...');
      localStorage.removeItem('token');
      localStorage.removeItem('auth-storage');
      await runFullTest();
      window.location.reload();
    } catch (error) {
      console.error('❌ 自动测试登录失败:', error);
      setError('自动测试登录失败，请手动登录');
    }
  };

  // 获取用户角色显示
  const getUserRoleDisplay = (user: SafeMember) => {
    return user.role || 'member';
  };

  // 数据加载
  useEffect(() => {
    debugAuthState();
    console.log('权限管理组件认证状态:', { 
      isAuthenticated, 
      token: token ? '有token' : '无token', 
      user: user?.email,
      userRole: user?.role,
      isAdmin: user?.role === 'admin' || user?.role === 'super_admin'
    });
    
    if (!isAuthenticated || !token) {
      setError('请先登录以访问权限管理功能');
      return;
    }

    setError(null);
    loadPermissionDefinitions();
    
    if (!safeId) {
      loadGlobalUsers();
    } else {
      loadMembers();
      loadAuditLogs();
    }
  }, [safeId, isAuthenticated, token, user]);

  const loadGlobalUsers = async () => {
    try {
      setLoading(true);
      
      if (!token) {
        setError('未找到认证令牌');
        return;
      }

      // 解析token查看role信息
      try {
        const tokenPayload = JSON.parse(atob(token.split('.')[1]));
        console.log('Token payload:', tokenPayload);
        console.log('Token role:', tokenPayload.role);
        console.log('User object role:', user?.role);
      } catch (e) {
        console.error('Failed to parse token:', e);
      }

      const response = await fetch('/api/v1/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.text();
        console.error('API Error Response:', errorData);
        throw new Error(`HTTP error! status: ${response.status}, response: ${errorData}`);
      }

      const data = await response.json();
      setGlobalUsers(data.users || []);
    } catch (error) {
      console.error('Failed to load users:', error);
      setError('加载用户列表失败');
    } finally {
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    if (!safeId) return;
    
    try {
      setLoading(true);
      const response = await PermissionService.getSafeMembers(safeId);
      setMembers(response.members || []);
    } catch (error) {
      console.error('Failed to load members:', error);
      setError('加载成员失败');
    } finally {
      setLoading(false);
    }
  };

  const loadPermissionDefinitions = async () => {
    try {
      const response = await PermissionService.getPermissionDefinitions();
      setPermissionDefinitions(response.definitions || []);
    } catch (err) {
      console.error('Failed to load permission definitions:', err);
      setError('加载权限定义失败');
    }
  };

  const loadAuditLogs = async () => {
    if (!safeId) return;
    
    try {
      const response = await PermissionService.getPermissionAuditLogs(safeId);
      setAuditLogs(response.logs || []);
    } catch (error) {
      console.error('Failed to load audit logs:', error);
      setError('加载审计日志失败');
    }
  };

  // 处理添加成员
  const handleAddMember = async () => {
    if (!safeId) return;
    
    try {
      console.log('Add member placeholder');
      await loadMembers();
    } catch (error) {
      console.error('Failed to add member:', error);
      setError('添加成员失败');
    }
  };

  // 处理删除成员
  const handleDeleteMember = async (member: SafeMember) => {
    if (!safeId) return;
    
    if (window.confirm(`确定要删除成员 ${member.username} 吗？`)) {
      try {
        console.log('Delete member:', member);
        await loadMembers();
      } catch (error) {
        console.error('Failed to delete member:', error);
        setError('删除成员失败');
      }
    }
  };

  // 处理更新权限
  const handleUpdateMemberPermissions = async (userId: string, permissions: string[]) => {
    if (!safeId) return;
    
    try {
      console.log('Update permissions:', userId, permissions);
      await loadMembers();
    } catch (error) {
      console.error('Failed to update permissions:', error);
      setError('更新权限失败');
    }
  };

  // 渲染成员管理标签页
  const renderMembersTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Safe成员</h3>
        <Button
          onClick={handleAddMember}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          添加成员
        </Button>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">加载中...</p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {!loading && !error && members.length === 0 && (
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无成员</h3>
          <p className="text-gray-600 mb-4">开始添加成员来管理Safe权限</p>
          <Button onClick={handleAddMember}>
            添加第一个成员
          </Button>
        </div>
      )}

      {!loading && !error && members.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <div className="space-y-4">
              {members.map((member, index) => (
                <div key={index} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{member.username}</h4>
                      <p className="text-sm text-gray-500">{member.email}</p>
                      <p className="text-xs text-gray-400">{member.wallet_address}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {getUserRoleDisplay(member)}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleUpdateMemberPermissions(member.user_id, [])}
                    >
                      管理权限
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDeleteMember(member)}
                      className="text-red-600 hover:text-red-700"
                    >
                      删除
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // 渲染权限定义标签页
  const renderPermissionsTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">权限定义</h3>
      <div className="grid gap-4">
        {permissionDefinitions.map((permission) => (
          <Card key={permission.code} className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-medium text-gray-900">{permission.name}</div>
                <div className="text-sm text-gray-500">{permission.description}</div>
                <div className="text-xs text-gray-400 mt-1">代码: {permission.code}</div>
              </div>
              <Shield className="w-5 h-5 text-blue-500" />
            </div>
          </Card>
        ))}
      </div>
    </div>
  );

  // 渲染全局用户管理标签页
  const renderGlobalUsersTab = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">用户管理</h3>
        <Button
          onClick={() => console.log('添加用户')}
          className="flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          添加用户
        </Button>
      </div>

      {loading && (
        <div className="text-center py-8">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <p className="mt-2 text-gray-600">加载中...</p>
        </div>
      )}

      {!loading && globalUsers.length === 0 && (
        <div className="text-center py-8">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">暂无用户</h3>
          <p className="text-gray-600 mb-4">开始添加用户来管理系统权限</p>
        </div>
      )}

      {!loading && globalUsers.length > 0 && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
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
                  {globalUsers.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                            <Users className="w-5 h-5 text-blue-600" />
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{user.username}</div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                            <div className="text-xs text-gray-400">{user.wallet_address}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          user.status === 'active' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}>
                          {user.status === 'active' ? '活跃' : '禁用'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(user.created_at).toLocaleDateString('zh-CN')}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Button variant="outline" size="sm" className="mr-2">
                          编辑
                        </Button>
                        <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                          删除
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  // 渲染系统配置标签页
  const renderSystemConfigTab = () => (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900">系统配置</h3>
      <div className="grid gap-4">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">系统维护模式</div>
              <div className="text-sm text-gray-500">启用后系统将进入维护状态</div>
            </div>
            <Button variant="outline" size="sm">
              配置
            </Button>
          </div>
        </Card>
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="font-medium text-gray-900">权限缓存设置</div>
              <div className="text-sm text-gray-500">配置权限验证缓存时间</div>
            </div>
            <Button variant="outline" size="sm">
              配置
            </Button>
          </div>
        </Card>
      </div>
    </div>
  );

  // 渲染审计日志标签页
  const renderAuditTab = () => {
    if (!safeId) {
      return (
        <div className="text-center py-8">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">选择Safe查看审计日志</h3>
          <p className="text-gray-500">请从Safe列表中选择一个Safe来查看权限审计日志</p>
        </div>
      );
    }
    
    return (
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-gray-900">审计日志</h3>
        <div className="grid gap-4">
          {auditLogs.map((log) => (
            <Card key={log.id} className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900">{log.action}</div>
                  <div className="text-sm text-gray-500">{log.user_id}</div>
                  <div className="text-xs text-gray-400 mt-1">{new Date(log.created_at).toLocaleString('zh-CN')}</div>
                </div>
                <div className={`px-2 py-1 rounded text-xs ${
                  log.permission_granted ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {log.permission_granted ? '允许' : '拒绝'}
                </div>
              </div>
            </Card>
          ))}
          {auditLogs.length === 0 && (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">暂无审计日志</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  // 如果用户未认证，显示登录提示
  if (!isAuthenticated || !token) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-6">
          <Card className="p-8 text-center">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">需要登录</h2>
            <p className="text-gray-600 mb-4">
              请先登录以访问权限管理功能
            </p>
            <Button 
              onClick={handleAutoTestLogin}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              自动测试登录
            </Button>
          </Card>
        </div>
      </Layout>
    );
  }

  // 如果没有Safe ID，显示全局权限管理页面
  if (!safeId) {
    return (
      <Layout>
        <div className="max-w-6xl mx-auto p-6">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">超级管理员权限配置</h1>
            <p className="text-gray-600">
              系统级权限管理和用户配置
            </p>
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-blue-800 text-sm">
                当前用户角色: <strong>{user?.role || '未知'}</strong> | 
                需要admin角色才能访问用户管理功能
              </p>
            </div>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
              <p className="text-red-800">{error}</p>
              {error.includes('需要管理员权限') && (
                <div className="mt-3">
                  <Button 
                    onClick={handleAutoTestLogin}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    尝试获取管理员权限
                  </Button>
                </div>
              )}
            </div>
          )}

          <Card>
            <div className="border-b border-gray-200">
              <nav className="flex space-x-8 px-6">
                {['用户管理', '系统权限', '系统配置'].map((tab, index) => (
                  <button
                    key={tab}
                    onClick={() => setCurrentTab(index)}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      currentTab === index
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    {tab}
                  </button>
                ))}
              </nav>
            </div>

            <div className="p-6">
              {currentTab === 0 && renderGlobalUsersTab()}
              {currentTab === 1 && renderPermissionsTab()}
              {currentTab === 2 && renderSystemConfigTab()}
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

  // 主渲染 - Safe特定的权限管理
  return (
    <Layout>
      <div className="max-w-6xl mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">Safe权限管理</h1>
          </div>
          <p className="text-gray-600">Safe ID: {safeId}</p>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="text-red-600 text-sm">{error}</div>
              <button 
                onClick={() => setError(null)}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                ×
              </button>
            </div>
          </div>
        )}

        <Card>
          <div className="border-b border-gray-200">
            <nav className="flex space-x-8 px-6">
              {['成员管理', '权限定义', '审计日志'].map((tab, index) => (
                <button
                  key={tab}
                  onClick={() => setCurrentTab(index)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    currentTab === index
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </nav>
          </div>

          <div className="p-6">
            {currentTab === 0 && renderMembersTab()}
            {currentTab === 1 && renderPermissionsTab()}
            {currentTab === 2 && renderAuditTab()}
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default PermissionManagement;
