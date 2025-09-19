// =====================================================
// Safe自定义角色管理组件
// 版本: v1.0
// 功能: 创建和管理Safe级自定义角色
// 作者: Cascade AI
// 创建时间: 2025-09-18
// =====================================================

import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { Input } from './ui/Input';
import { Badge } from './ui/Badge';
import { useAuthStore } from '../stores/authStore';
import { 
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  Shield,
  Settings
} from 'lucide-react';

// =====================================================
// 类型定义
// =====================================================

interface SafeCustomRole {
  id: string;
  safe_id: string;
  role_id: string;
  role_name: string;
  role_description: string;
  permissions: string[];
  restrictions: Record<string, any>;
  is_active: boolean;
  created_by: string;
  created_at: string;
  updated_at: string;
}

interface PermissionOption {
  id: string;
  name: string;
  description: string;
  category: string;
}

interface SafeCustomRolesProps {
  safeId: string;
  safeName: string;
}

// =====================================================
// 权限选择组件
// =====================================================

const PermissionSelector: React.FC<{
  selectedPermissions: string[];
  onChange: (permissions: string[]) => void;
}> = ({ selectedPermissions, onChange }) => {
  // 预定义的权限选项
  const permissionOptions: PermissionOption[] = [
    // Safe基础权限
    { id: 'safe.view', name: 'safe.view', description: '查看Safe信息', category: 'safe' },
    { id: 'safe.member.view', name: 'safe.member.view', description: '查看Safe成员', category: 'safe' },
    { id: 'safe.member.manage', name: 'safe.member.manage', description: '管理Safe成员', category: 'safe' },
    { id: 'safe.settings.view', name: 'safe.settings.view', description: '查看Safe设置', category: 'safe' },
    { id: 'safe.settings.manage', name: 'safe.settings.manage', description: '管理Safe设置', category: 'safe' },
    
    // 提案权限
    { id: 'proposal.view', name: 'proposal.view', description: '查看提案', category: 'proposal' },
    { id: 'proposal.create', name: 'proposal.create', description: '创建提案', category: 'proposal' },
    { id: 'proposal.sign', name: 'proposal.sign', description: '签名提案', category: 'proposal' },
    { id: 'proposal.execute', name: 'proposal.execute', description: '执行提案', category: 'proposal' },
    { id: 'proposal.cancel', name: 'proposal.cancel', description: '取消提案', category: 'proposal' },
    
    // 交易权限
    { id: 'transaction.view', name: 'transaction.view', description: '查看交易记录', category: 'transaction' },
    { id: 'transaction.create', name: 'transaction.create', description: '创建交易', category: 'transaction' },
    { id: 'transaction.approve', name: 'transaction.approve', description: '批准交易', category: 'transaction' },
    
    // 财务权限
    { id: 'finance.view', name: 'finance.view', description: '查看财务信息', category: 'finance' },
    { id: 'finance.transfer', name: 'finance.transfer', description: '发起转账', category: 'finance' },
    { id: 'finance.approve', name: 'finance.approve', description: '审批财务操作', category: 'finance' },
  ];

  const togglePermission = (permissionId: string) => {
    const newPermissions = selectedPermissions.includes(permissionId)
      ? selectedPermissions.filter(p => p !== permissionId)
      : [...selectedPermissions, permissionId];
    onChange(newPermissions);
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'safe': return 'bg-blue-100 text-blue-800';
      case 'proposal': return 'bg-green-100 text-green-800';
      case 'transaction': return 'bg-purple-100 text-purple-800';
      case 'finance': return 'bg-yellow-100 text-yellow-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  // 按分类分组权限
  const groupedPermissions = permissionOptions.reduce((acc, permission) => {
    if (!acc[permission.category]) {
      acc[permission.category] = [];
    }
    acc[permission.category].push(permission);
    return acc;
  }, {} as Record<string, PermissionOption[]>);

  return (
    <div className="space-y-4">
      {Object.entries(groupedPermissions).map(([category, permissions]) => (
        <div key={category} className="border rounded-lg p-4">
          <h4 className="font-medium text-gray-900 mb-3 capitalize">
            {category} 权限
          </h4>
          <div className="space-y-2">
            {permissions.map((permission) => (
              <label 
                key={permission.id}
                className="flex items-start gap-3 cursor-pointer hover:bg-gray-50 p-2 rounded"
              >
                <input
                  type="checkbox"
                  checked={selectedPermissions.includes(permission.id)}
                  onChange={() => togglePermission(permission.id)}
                  className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-900">
                      {permission.name}
                    </span>
                    <Badge className={getCategoryColor(category)}>
                      {category}
                    </Badge>
                  </div>
                  <p className="text-xs text-gray-600 mt-1">
                    {permission.description}
                  </p>
                </div>
              </label>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
};

// =====================================================
// 创建/编辑角色模态框
// =====================================================

const RoleModal: React.FC<{
  open: boolean;
  onClose: () => void;
  safeId: string;
  role?: SafeCustomRole;
  onSuccess: () => void;
}> = ({ open, onClose, safeId, role, onSuccess }) => {
  const [roleId, setRoleId] = useState('');
  const [roleName, setRoleName] = useState('');
  const [roleDescription, setRoleDescription] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { token } = useAuthStore();
  const isEdit = !!role;

  // 重置表单
  const resetForm = () => {
    setRoleId('');
    setRoleName('');
    setRoleDescription('');
    setSelectedPermissions([]);
    setError(null);
  };

  // 提交表单
  const handleSubmit = async () => {
    if (!roleId || !roleName || selectedPermissions.length === 0) {
      setError('请填写所有必填字段并选择至少一个权限');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const url = isEdit 
        ? `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/safes/${safeId}/custom-roles/${role?.role_id}`
        : `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/safes/${safeId}/custom-roles`;

      const method = isEdit ? 'PUT' : 'POST';
      const body = {
        role_id: roleId,
        role_name: roleName,
        role_description: roleDescription,
        permissions: selectedPermissions,
        restrictions: {}
      };

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
        resetForm();
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.message || `${isEdit ? '更新' : '创建'}角色失败`);
      }
    } catch (error) {
      console.error(`${isEdit ? '更新' : '创建'}角色失败:`, error);
      setError('操作失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  // 编辑模式下预填充数据
  useEffect(() => {
    if (open && role) {
      setRoleId(role.role_id);
      setRoleName(role.role_name);
      setRoleDescription(role.role_description);
      setSelectedPermissions(role.permissions);
    } else if (open && !role) {
      resetForm();
    }
  }, [open, role]);

  return (
    <Modal 
      isOpen={open} 
      onClose={onClose} 
      title={isEdit ? `编辑角色: ${role?.role_name}` : '创建自定义角色'}
      size="xl"
    >
      <div className="space-y-6">
        {/* 基本信息 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              角色ID <span className="text-red-500">*</span>
            </label>
            <Input
              value={roleId}
              onChange={(e) => setRoleId(e.target.value)}
              placeholder="如: finance_reviewer"
              disabled={isEdit} // 编辑时不允许修改ID
            />
            <p className="text-xs text-gray-500 mt-1">
              角色的唯一标识符，只能包含字母、数字和下划线
            </p>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              角色名称 <span className="text-red-500">*</span>
            </label>
            <Input
              value={roleName}
              onChange={(e) => setRoleName(e.target.value)}
              placeholder="如: 财务审核员"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            角色描述
          </label>
          <textarea
            value={roleDescription}
            onChange={(e) => setRoleDescription(e.target.value)}
            placeholder="描述这个角色的职责和权限范围..."
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            rows={3}
          />
        </div>

        {/* 权限选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-3">
            权限配置 <span className="text-red-500">*</span>
          </label>
          <div className="max-h-96 overflow-y-auto border rounded-lg p-4">
            <PermissionSelector
              selectedPermissions={selectedPermissions}
              onChange={setSelectedPermissions}
            />
          </div>
          <p className="text-xs text-gray-500 mt-2">
            已选择 {selectedPermissions.length} 个权限
          </p>
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
            <X className="w-4 h-4 mr-2" />
            取消
          </Button>
          <Button 
            onClick={handleSubmit}
            disabled={loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                {isEdit ? '更新中...' : '创建中...'}
              </>
            ) : (
              <>
                <Save className="w-4 h-4 mr-2" />
                {isEdit ? '更新角色' : '创建角色'}
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

export const SafeCustomRoles: React.FC<SafeCustomRolesProps> = ({
  safeId,
  safeName
}) => {
  const [roles, setRoles] = useState<SafeCustomRole[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingRole, setEditingRole] = useState<SafeCustomRole | null>(null);

  const { token } = useAuthStore();

  // 获取Safe自定义角色列表
  const fetchRoles = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/safes/${safeId}/custom-roles`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setRoles(data.data?.roles || []);
      } else {
        setError('获取自定义角色失败');
      }
    } catch (error) {
      console.error('获取自定义角色失败:', error);
      setError('网络错误，请检查后端服务');
    } finally {
      setLoading(false);
    }
  };

  // 删除角色
  const handleDeleteRole = async (roleId: string, roleName: string) => {
    if (!confirm(`确定要删除角色 "${roleName}" 吗？此操作不可撤销。`)) return;

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/safes/${safeId}/custom-roles/${roleId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        fetchRoles(); // 刷新列表
      } else {
        alert('删除角色失败');
      }
    } catch (error) {
      console.error('删除角色失败:', error);
      alert('删除角色失败');
    }
  };

  // 组件挂载时获取数据
  useEffect(() => {
    fetchRoles();
  }, [safeId]);

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2">加载自定义角色中...</span>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">自定义角色</h2>
          <p className="text-gray-600">Safe: {safeName}</p>
        </div>
        <Button 
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <Plus className="w-4 h-4 mr-2" />
          创建角色
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

      {/* 角色列表 */}
      <Card className="overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            自定义角色 ({roles.length})
          </h3>
        </div>
        
        {roles.length === 0 ? (
          <div className="text-center py-12">
            <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">暂无自定义角色</p>
            <p className="text-sm text-gray-400 mb-4">
              创建自定义角色来满足您的特殊权限需求
            </p>
            <Button 
              onClick={() => setShowCreateModal(true)}
              className="mt-4"
            >
              创建第一个角色
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {roles.map((role) => (
              <div key={role.id} className="px-6 py-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Shield className="w-5 h-5 text-purple-600" />
                      <h4 className="font-medium text-gray-900">{role.role_name}</h4>
                      <Badge className="bg-purple-100 text-purple-800">自定义</Badge>
                      {!role.is_active && (
                        <Badge className="bg-red-100 text-red-800">已停用</Badge>
                      )}
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-3">
                      {role.role_description || '暂无描述'}
                    </p>
                    
                    <div className="flex flex-wrap gap-1 mb-2">
                      {role.permissions.slice(0, 5).map((permission) => (
                        <Badge key={permission} variant="outline" className="text-xs">
                          {permission.split('.').pop()}
                        </Badge>
                      ))}
                      {role.permissions.length > 5 && (
                        <Badge variant="outline" className="text-xs">
                          +{role.permissions.length - 5} 更多
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-xs text-gray-500">
                      创建时间: {new Date(role.created_at).toLocaleString()}
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2 ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingRole(role)}
                    >
                      <Edit3 className="w-4 h-4 mr-1" />
                      编辑
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleDeleteRole(role.role_id, role.role_name)}
                      className="text-red-600 hover:text-red-700 hover:border-red-300"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      删除
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* 创建角色模态框 */}
      <RoleModal
        open={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        safeId={safeId}
        onSuccess={fetchRoles}
      />

      {/* 编辑角色模态框 */}
      <RoleModal
        open={!!editingRole}
        onClose={() => setEditingRole(null)}
        safeId={safeId}
        role={editingRole || undefined}
        onSuccess={fetchRoles}
      />
    </div>
  );
};
