import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Shield, 
  Settings, 
  Trash2, 
  Edit3,
  Crown,
  AlertCircle
} from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

interface SafeMember {
  id: string;
  address: string;
  name?: string;
  role: string;
  roleDisplayName: string;
  permissions: string[];
  isActive: boolean;
  joinedAt: string;
}

interface AvailableRole {
  id: string;
  name: string;
  displayName: string;
  description: string;
  category: 'template' | 'custom' | 'default';
  permissions: string[];
}

interface SafeMemberManagementProps {
  safeId: string;
  safeAddress: string;
  isOwner: boolean;
}

/**
 * Safe成员管理组件 - 整合了成员列表、角色分配、权限管理
 * 替代原来独立的"权限管理"页面，避免功能重复
 */
export const SafeMemberManagement: React.FC<SafeMemberManagementProps> = ({
  safeId,
  safeAddress,
  isOwner
}) => {
  const { token } = useAuthStore();
  const [members, setMembers] = useState<SafeMember[]>([]);
  const [availableRoles, setAvailableRoles] = useState<AvailableRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddMember, setShowAddMember] = useState(false);
  const [editingMember, setEditingMember] = useState<string | null>(null);

  // 获取Safe成员列表
  const fetchMembers = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/safes/${safeId}/members`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      } else {
        setError('获取成员列表失败');
      }
    } catch (err) {
      setError('网络错误');
      console.error('Failed to fetch members:', err);
    }
  };

  // 获取可用角色列表（来源：权限模板 + 自定义角色）
  const fetchAvailableRoles = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/safes/${safeId}/available-roles`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        setAvailableRoles(data.roles || []);
      }
    } catch (err) {
      console.error('Failed to fetch available roles:', err);
    }
  };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      await Promise.all([fetchMembers(), fetchAvailableRoles()]);
      setLoading(false);
    };

    if (token && safeId) {
      loadData();
    }
  }, [token, safeId]);

  // 更新成员角色
  const updateMemberRole = async (memberId: string, newRoleId: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/safes/${safeId}/members/${memberId}/role`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ role_id: newRoleId })
        }
      );

      if (response.ok) {
        await fetchMembers(); // 刷新成员列表
        setEditingMember(null);
      } else {
        setError('更新成员角色失败');
      }
    } catch (err) {
      setError('网络错误');
      console.error('Failed to update member role:', err);
    }
  };

  // 移除成员
  const removeMember = async (memberId: string) => {
    if (!confirm('确定要移除此成员吗？')) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/safes/${safeId}/members/${memberId}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );

      if (response.ok) {
        await fetchMembers(); // 刷新成员列表
      } else {
        setError('移除成员失败');
      }
    } catch (err) {
      setError('网络错误');
      console.error('Failed to remove member:', err);
    }
  };

  // 获取角色显示信息
  const getRoleInfo = (roleId: string) => {
    const role = availableRoles.find(r => r.id === roleId);
    return role || { displayName: roleId, description: '', category: 'default' as const };
  };

  // 获取角色颜色
  const getRoleColor = (category: string) => {
    switch (category) {
      case 'template': return 'bg-blue-100 text-blue-800';
      case 'custom': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">加载中...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">成员管理</h2>
          <p className="text-sm text-gray-600 mt-1">
            管理Safe成员、分配角色和权限
          </p>
        </div>
        {isOwner && (
          <button
            onClick={() => setShowAddMember(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
          >
            <UserPlus className="w-4 h-4 mr-2" />
            添加成员
          </button>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-center">
            <AlertCircle className="w-5 h-5 text-red-500 mr-2" />
            <span className="text-red-700">{error}</span>
          </div>
        </div>
      )}

      {/* 成员统计 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <Users className="w-8 h-8 text-blue-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">总成员数</p>
              <p className="text-2xl font-bold text-gray-900">{members.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <Crown className="w-8 h-8 text-yellow-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">管理员</p>
              <p className="text-2xl font-bold text-gray-900">
                {members.filter(m => m.role.includes('admin')).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <div className="flex items-center">
            <Shield className="w-8 h-8 text-green-500 mr-3" />
            <div>
              <p className="text-sm text-gray-600">可用角色</p>
              <p className="text-2xl font-bold text-gray-900">{availableRoles.length}</p>
            </div>
          </div>
        </div>
      </div>

      {/* 成员列表 */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">成员列表</h3>
        </div>
        
        <div className="divide-y divide-gray-200">
          {members.map((member) => {
            const roleInfo = getRoleInfo(member.role);
            const isEditing = editingMember === member.id;
            
            return (
              <div key={member.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    {/* 成员头像 */}
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-gray-500" />
                    </div>
                    
                    {/* 成员信息 */}
                    <div>
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-gray-900">
                          {member.name || '未设置名称'}
                        </p>
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleColor(roleInfo.category)}`}>
                          {roleInfo.displayName}
                        </span>
                      </div>
                      <p className="text-sm text-gray-500 font-mono">{member.address}</p>
                      <p className="text-xs text-gray-400">
                        加入时间: {new Date(member.joinedAt).toLocaleDateString('zh-CN')}
                      </p>
                    </div>
                  </div>

                  {/* 操作按钮 */}
                  {isOwner && (
                    <div className="flex items-center space-x-2">
                      {isEditing ? (
                        <div className="flex items-center space-x-2">
                          <select
                            value={member.role}
                            onChange={(e) => updateMemberRole(member.id, e.target.value)}
                            className="text-sm border border-gray-300 rounded px-2 py-1"
                          >
                            {availableRoles.map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.displayName}
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => setEditingMember(null)}
                            className="text-gray-500 hover:text-gray-700"
                          >
                            取消
                          </button>
                        </div>
                      ) : (
                        <>
                          <button
                            onClick={() => setEditingMember(member.id)}
                            className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                            title="编辑角色"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => removeMember(member.id)}
                            className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                            title="移除成员"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* 权限详情（可展开） */}
                {member.permissions && member.permissions.length > 0 && (
                  <div className="mt-3 pl-14">
                    <details className="text-sm">
                      <summary className="text-gray-600 cursor-pointer hover:text-gray-800">
                        查看权限详情 ({member.permissions.length}个权限)
                      </summary>
                      <div className="mt-2 space-y-1">
                        {member.permissions.map((permission, index) => (
                          <span
                            key={index}
                            className="inline-block bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs mr-2 mb-1"
                          >
                            {permission}
                          </span>
                        ))}
                      </div>
                    </details>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {members.length === 0 && (
          <div className="px-6 py-8 text-center">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">暂无成员</p>
          </div>
        )}
      </div>

      {/* 角色配置概览 */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">可用角色</h3>
          <p className="text-sm text-gray-600 mt-1">
            当前Safe配置的角色来源：权限模板 + 自定义角色
          </p>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableRoles.map((role) => (
              <div key={role.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-gray-900">{role.displayName}</h4>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(role.category)}`}>
                    {role.category === 'template' ? '模板角色' : 
                     role.category === 'custom' ? '自定义' : '默认角色'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mb-3">{role.description}</p>
                <div className="text-xs text-gray-500">
                  {role.permissions.length} 个权限
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
