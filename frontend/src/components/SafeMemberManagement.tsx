// =====================================================
// Safe成员管理组件 - 企业级权限管理
// 版本: v2.0
// 功能: 集成角色配置和权限模板的成员管理
// 作者: sfan
// 创建时间: 2024-01-25
// =====================================================

import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { useAuthStore } from '../stores/authStore';
import { 
  Users, 
  Plus, 
  Edit3, 
  Trash2, 
  Shield, 
  Settings,
  AlertCircle,
  CheckCircle,
  Crown,
  UserCheck
} from 'lucide-react';

// =====================================================
// 类型定义
// =====================================================

interface SafeMember {
  id: string;
  user_id: string;
  username: string;
  email: string;
  wallet_address: string;
  role: string;
  role_display_name?: string;
  role_category?: string;
  permissions: string[];
  is_active: boolean;
  joined_at: string;
}

interface RoleOption {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string; // 'template', 'custom', 'default'
  permissions: string[];
  is_default: boolean;
}

interface User {
  id: string;
  username: string;
  email: string;
  wallet_address: string;
}

interface SafeMemberManagementProps {
  safeId: string;
  safeName: string;
}

// =====================================================
// 添加/编辑成员模态框
// =====================================================

const MemberModal: React.FC<{
  open: boolean;
  onClose: () => void;
  safeId: string;
  member?: SafeMember;
  onSuccess: () => void;
}> = ({ open, onClose, safeId, member, onSuccess }) => {
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [availableRoles, setAvailableRoles] = useState<RoleOption[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [selectedRoleId, setSelectedRoleId] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { token } = useAuthStore();
  const isEdit = !!member;

  // 获取可用用户列表
  const fetchAvailableUsers = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/safes/${safeId}/available-users`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAvailableUsers(data.users || []);
      }
    } catch (error) {
      console.error('获取可用用户失败:', error);
    }
  };

  // 获取可用角色列表（来自权限模板 + 自定义角色）
  const fetchAvailableRoles = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/safes/${safeId}/available-roles`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('🎯 获取到的可用角色:', data);
        setAvailableRoles(data.data?.roles || []);
      } else {
        setError('获取可用角色失败');
      }
    } catch (error) {
      console.error('获取可用角色失败:', error);
      setError('网络错误，请检查后端服务');
    }
  };

  // 添加或更新成员
  const handleSubmit = async () => {
    if (!selectedUserId || !selectedRoleId) {
      setError('请选择用户和角色');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const url = isEdit 
        ? `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/safes/${safeId}/members/${member?.user_id}`
        : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/safes/${safeId}/members/roles`;

      const method = isEdit ? 'PUT' : 'POST';
      const body = isEdit 
        ? { role: selectedRoleId }
        : { user_id: selectedUserId, role: selectedRoleId };

      const response = await fetch(url, {
        method,
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (response.ok) {
        onSuccess();
        onClose();
        // 重置表单
        setSelectedUserId('');
        setSelectedRoleId('');
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || `${isEdit ? '更新' : '添加'}成员失败`);
      }
    } catch (error) {
      console.error(`${isEdit ? '更新' : '添加'}成员失败:`, error);
      setError('操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 获取角色分类图标和颜色
  const getRoleCategoryStyle = (category: string) => {
    switch (category) {
      case 'template':
        return { icon: Shield, color: 'bg-blue-100 text-blue-800' };
      case 'custom':
        return { icon: Settings, color: 'bg-purple-100 text-purple-800' };
      case 'default':
        return { icon: Crown, color: 'bg-yellow-100 text-yellow-800' };
      default:
        return { icon: UserCheck, color: 'bg-gray-100 text-gray-800' };
    }
  };

  // 组件打开时获取数据
  useEffect(() => {
    if (open) {
      fetchAvailableRoles();
      if (!isEdit) {
        fetchAvailableUsers();
      } else {
        // 编辑模式下预填充数据
        setSelectedUserId(member?.user_id || '');
        setSelectedRoleId(member?.role || '');
      }
    }
  }, [open, safeId, isEdit, member]);

  return (
    <Modal 
      isOpen={open} 
      onClose={onClose} 
      title={isEdit ? `编辑成员: ${member?.username}` : '添加Safe成员'}
      size="lg"
    >
      <div className="space-y-6">
        {/* 用户选择（仅新增时显示） */}
        {!isEdit && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              选择用户
            </label>
            {availableUsers.length === 0 ? (
              <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">暂无可添加的用户</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {availableUsers.map((user) => (
                  <div 
                    key={user.id}
                    className={`p-3 cursor-pointer rounded-lg border transition-all ${
                      selectedUserId === user.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedUserId(user.id)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-medium text-gray-900">{user.username}</h4>
                        <p className="text-sm text-gray-600">{user.email}</p>
                      </div>
                      {selectedUserId === user.id && (
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 角色选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择角色
            <span className="text-xs text-gray-500 ml-2">
              （来源：权限模板 + 自定义角色）
            </span>
          </label>
          
          {availableRoles.length === 0 ? (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">暂无可用角色</p>
              <p className="text-xs text-gray-400 mt-1">
                请先在角色配置中应用权限模板或创建自定义角色
              </p>
            </div>
          ) : (
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {availableRoles.map((role) => {
                const { icon: Icon, color } = getRoleCategoryStyle(role.category);
                return (
                  <div 
                    key={role.id}
                    className={`p-4 cursor-pointer rounded-lg border transition-all ${
                      selectedRoleId === role.id 
                        ? 'border-blue-500 bg-blue-50' 
                        : 'border-gray-200 hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedRoleId(role.id)}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <Icon className="w-4 h-4" />
                          <h4 className="font-medium text-gray-900">{role.display_name}</h4>
                          <Badge className={color}>
                            {role.category === 'template' ? '模板角色' : 
                             role.category === 'custom' ? '自定义' : '默认'}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mb-2">{role.description}</p>
                        <div className="flex flex-wrap gap-1">
                          {role.permissions.slice(0, 3).map((permission) => (
                            <Badge key={permission} variant="outline" className="text-xs">
                              {permission.split('.').pop()}
                            </Badge>
                          ))}
                          {role.permissions.length > 3 && (
                            <Badge variant="outline" className="text-xs">
                              +{role.permissions.length - 3} 更多
                            </Badge>
                          )}
                        </div>
                      </div>
                      {selectedRoleId === role.id && (
                        <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-1" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 错误提示 */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-red-500 mt-0.5" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end gap-3 pt-4 border-t">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            取消
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={(!selectedUserId && !isEdit) || !selectedRoleId || loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isEdit ? '更新中...' : '添加中...'}
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                {isEdit ? '更新成员' : '添加成员'}
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// =====================================================
// 主组件
// =====================================================

export const SafeMemberManagement: React.FC<SafeMemberManagementProps> = ({
  safeId,
  safeName
}) => {
  const [members, setMembers] = useState<SafeMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingMember, setEditingMember] = useState<SafeMember | null>(null);

  const { token } = useAuthStore();

  // 获取Safe成员列表
  const fetchMembers = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/safes/${safeId}/members`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      } else {
        setError('获取成员列表失败');
      }
    } catch (error) {
      console.error('获取成员列表失败:', error);
      setError('网络错误，请检查后端服务');
    } finally {
      setLoading(false);
    }
  };

  // 移除成员
  const handleRemoveMember = async (userId: string, username: string) => {
    if (!confirm(`确定要移除成员 "${username}" 吗？`)) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/safes/${safeId}/members/${userId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        fetchMembers(); // 刷新列表
      } else {
        alert('移除成员失败');
      }
    } catch (error) {
      console.error('移除成员失败:', error);
      alert('移除成员失败');
    }
  };

  // 获取角色分类样式
  const getRoleCategoryBadge = (category?: string) => {
    switch (category) {
      case 'template':
        return <Badge className="bg-blue-100 text-blue-800">模板角色</Badge>;
      case 'custom':
        return <Badge className="bg-purple-100 text-purple-800">自定义</Badge>;
      case 'default':
        return <Badge className="bg-yellow-100 text-yellow-800">默认</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">未知</Badge>;
    }
  };

  // 组件挂载时获取数据
  useEffect(() => {
    fetchMembers();
  }, [safeId]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">加载成员列表中...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">成员管理</h2>
          <p className="text-gray-600">Safe: {safeName}</p>
        </div>
        <Button 
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          添加成员
        </Button>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-5 h-5 text-red-500 mt-0.5" />
            <p className="text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* 成员列表 */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            Safe成员 ({members.length})
          </h3>
        </div>
        
        {members.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">暂无Safe成员</p>
            <Button 
              onClick={() => setShowAddModal(true)}
              className="mt-4"
            >
              添加第一个成员
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {members.map((member) => (
              <div key={member.id} className="px-6 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                      <Users className="w-5 h-5 text-gray-600" />
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">{member.username}</h4>
                      <p className="text-sm text-gray-600">{member.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-sm font-medium text-gray-700">
                          {member.role_display_name || member.role}
                        </span>
                        {getRoleCategoryBadge(member.role_category)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingMember(member)}
                    >
                      <Edit3 className="w-4 h-4 mr-1" />
                      编辑
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleRemoveMember(member.user_id, member.username)}
                      className="text-red-600 hover:text-red-700 hover:border-red-300"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      移除
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 添加成员模态框 */}
      <MemberModal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        safeId={safeId}
        onSuccess={fetchMembers}
      />

      {/* 编辑成员模态框 */}
      <MemberModal
        open={!!editingMember}
        onClose={() => setEditingMember(null)}
        safeId={safeId}
        member={editingMember || undefined}
        onSuccess={fetchMembers}
      />
    </div>
  );
};
