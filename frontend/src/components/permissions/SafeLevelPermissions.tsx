// =====================================================
import { buildApiUrl, API_ENDPOINTS, getAuthHeaders } from '../../config/api';
// Safe级权限管理模块
// 版本: v1.0
// 功能: Safe级权限管理，包含Safe选择、成员管理、角色配置、权限模板
// 作者: sfan
// 创建时间: 2024-06-30
// =====================================================

import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Shield, 
  Settings, 
  Plus, 
  Trash2, 
  Building,
  RefreshCw,
  UserPlus,
  ChevronDown, 
  UserMinus,
  Edit, 
  Copy
} from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { useAuthStore } from '../../stores/authStore';
import { useNotification } from '../../hooks/useNotification';
import { useConfirm } from '../../hooks/useConfirm';
import { ApplyTemplateToSafesModal } from './ApplyTemplateToSafesModal';

// =====================================================
// 类型定义
// =====================================================

interface Safe {
  id: string;
  address: string;
  name: string;
  description: string;
  threshold: number;
  owner_count: number;
  created_at: string;
  is_active: boolean;
}

interface SafeMember {
  id: string;
  safe_id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  wallet_address?: string; // 钱包地址，Safe所有者必有
  role: string;
  permissions: string[];
  joined_at: string;
  is_active: boolean;
}

interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  role_type: string;
  is_system_template: boolean;
  created_at: string;
}

interface RoleConfiguration {
  role: string;
  name: string;
  description: string;
  color: string;
  role_level: number;
  permissions: string[];
  is_system: boolean;
  created_at: string;
}

interface SafeLevelPermissionsProps {
  activeModule: string;
  onError: (error: string) => void;
  onLoading: (loading: boolean) => void;
  preSelectedSafeId?: string; // 预选的Safe ID（从URL参数传入）
}

// =====================================================
// 主组件
// =====================================================

const SafeLevelPermissions: React.FC<SafeLevelPermissionsProps> = ({
  activeModule,
  onError,
  onLoading,
  preSelectedSafeId
}) => {
  const [safes, setSafes] = useState<Safe[]>([]);
  const [selectedSafe, setSelectedSafe] = useState<Safe | null>(null);
  const [safeMembers, setSafeMembers] = useState<SafeMember[]>([]);
  const [permissionTemplates, setPermissionTemplates] = useState<PermissionTemplate[]>([]);
  const [roleConfigurations, setRoleConfigurations] = useState<RoleConfiguration[]>([]);
  const [showSafeSelector, setShowSafeSelector] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showEditRoleModal, setShowEditRoleModal] = useState(false);
  const [editingRole, setEditingRole] = useState<RoleConfiguration | null>(null);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [showEditMemberModal, setShowEditMemberModal] = useState(false);
  const [editingMember, setEditingMember] = useState<SafeMember | null>(null);
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberRole, setNewMemberRole] = useState('safe_viewer');
  const [newRole, setNewRole] = useState({
    role: '',
    name: '',
    description: '',
    color: 'blue',
    role_level: 5,
    permissions: [] as string[]
  });
  const [newTemplate, setNewTemplate] = useState({
    name: '',
    display_name: '',
    description: '',
    category: 'system', // 权限模板页面只能创建系统级模板
    permissions: [] as string[]
  });
  const [showApplyTemplateModal, setShowApplyTemplateModal] = useState(false);
  const [selectedTemplateForApply, setSelectedTemplateForApply] = useState<PermissionTemplate | null>(null);
  const [availableRoles, setAvailableRoles] = useState<any[]>([]);
  const [refreshing, setRefreshing] = useState(false);

  const { token } = useAuthStore();
  const { showSuccess } = useNotification();
  const { confirm } = useConfirm();

  // 编辑成员
  const handleEditMember = async (member: SafeMember) => {
    setEditingMember(member);
    setNewMemberRole(member.role);
    setShowEditMemberModal(true);
    
    // 获取最新的可用角色以填充角色选择
    if (selectedSafe) {
      await fetchAvailableRoles(selectedSafe.id);
    }
  };

  // 获取Safe列表
  const fetchSafes = async () => {
    try {
      setRefreshing(true);
      onLoading(true);
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || buildApiUrl('')}/api/v1/safes`, {
        headers: getAuthHeaders(token || undefined)
      });
      
      if (response.ok) {
        const data = await response.json();
        // 确保 safes 始终是一个数组
        const safesData = data.safes || data || [];
        setSafes(Array.isArray(safesData) ? safesData : []);
        
        // 如果还没有选择Safe且没有预选Safe ID，默认选择第一个
        if (!selectedSafe && !preSelectedSafeId && data.safes && data.safes.length > 0) {
          setSelectedSafe(data.safes[0]);
        }
        
        onError('');
      } else {
        onError(`获取Safe列表失败: ${response.status}`);
      }
    } catch (error) {
      console.error('获取Safe列表失败:', error);
      onError('网络错误，请检查后端服务是否正常运行');
    } finally {
      setRefreshing(false);
      onLoading(false);
    }
  };

  // 获取Safe成员列表
  const fetchSafeMembers = async (safeId: string) => {
    try {
      onLoading(true);
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || buildApiUrl('')}/api/v1/safes/${safeId}/members`, {
        headers: getAuthHeaders(token || undefined)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Safe成员数据:', data); // 调试日志
        
        // 处理后端返回的数据结构，确保始终是数组
        let members = [];
        if (data.success && data.data && data.data.members) {
          members = data.data.members;
        } else if (data.members) {
          members = data.members;
        } else if (Array.isArray(data)) {
          members = data;
        }
        
        // 确保 members 始终是一个数组
        setSafeMembers(Array.isArray(members) ? members : []);
        onError('');
      } else {
        const errorData = await response.json().catch(() => ({}));
        onError(`获取Safe成员失败: ${errorData.message || response.status}`);
      }
    } catch (error) {
      console.error('获取Safe成员失败:', error);
      onError('获取Safe成员失败');
    } finally {
      onLoading(false);
    }
  };

  // 获取角色配置（统一获取权限模板角色和自定义角色）
  const fetchRoleConfigurations = async (safeId: string) => {
    try {
      onLoading(true);
      
      // 使用统一的API端点获取Safe的所有可用角色（包括权限模板和自定义角色）
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || buildApiUrl('')}/api/v1/safes/${safeId}/available-roles`, {
        headers: getAuthHeaders(token || undefined)
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('Safe可用角色数据:', data); // 调试日志
        
        // 处理后端返回的数据结构
        let availableRoles = [];
        if (data.success && data.data && data.data.roles) {
          availableRoles = data.data.roles;
        } else if (data.roles) {
          availableRoles = data.roles;
        } else if (Array.isArray(data)) {
          availableRoles = data;
        }
        
        // 转换角色数据为角色配置格式
        const roles = availableRoles.map((role: any) => ({
          id: role.id,
          name: role.display_name || role.name,
          description: role.description,
          permissions: role.permissions || [],
          role_level: role.role_level || 1,
          is_system_role: role.category === 'template', // 权限模板角色标记为系统角色
          category: role.category, // 'template' 或 'custom'
          is_default: role.is_default || false,
          is_active: true
        }));
        
        setRoleConfigurations(roles);
        console.log('✅ 转换后的角色配置:', roles);
        console.log(`📊 角色统计: 权限模板角色 ${roles.filter((r: any) => r.category === 'template').length} 个, 自定义角色 ${roles.filter((r: any) => r.category === 'custom').length} 个`);
        onError('');
      } else {
        const errorData = await response.json().catch(() => ({}));
        onError(`获取角色配置失败: ${errorData.message || response.status}`);
      }
    } catch (error) {
      console.error('获取角色配置失败:', error);
      onError('获取角色配置失败');
    } finally {
      onLoading(false);
    }
  };

  // 创建自定义角色
  const createCustomRole = async () => {
    if (!selectedSafe) return;

    try {
      onLoading(true);
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || buildApiUrl('')}/api/v1/safes/${selectedSafe.id}/roles`, {
        method: 'POST',
        headers: getAuthHeaders(token || undefined),
        body: JSON.stringify(newRole)
      });
      
      if (response.ok) {
        showSuccess('创建成功', '自定义角色已成功创建');
        setShowRoleModal(false);
        setNewRole({
          role: '',
          name: '',
          description: '',
          color: 'blue',
          role_level: 5,
          permissions: []
        });
        fetchRoleConfigurations(selectedSafe.id);
        onError('');
      } else {
        const errorData = await response.json().catch(() => ({}));
        onError(`创建角色失败: ${errorData.message || response.status}`);
      }
    } catch (error) {
      console.error('创建角色失败:', error);
      onError('创建角色失败');
    } finally {
      onLoading(false);
    }
  };

  // 更新角色权限
  const updateRolePermissions = async () => {
    if (!selectedSafe || !editingRole) return;

    try {
      onLoading(true);
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || buildApiUrl('')}/api/v1/safes/${selectedSafe.id}/roles/${editingRole.role}`, {
        method: 'PUT',
        headers: {
          ...getAuthHeaders(token || undefined)
        },
        body: JSON.stringify({
          name: editingRole.name,
          description: editingRole.description,
          color: editingRole.color,
          role_level: editingRole.role_level,
          permissions: editingRole.permissions
        })
      });
      
      if (response.ok) {
        showSuccess('更新成功', '角色权限已成功更新');
        setShowEditRoleModal(false);
        setEditingRole(null);
        fetchRoleConfigurations(selectedSafe.id);
        onError('');
      } else {
        const errorData = await response.json().catch(() => ({}));
        onError(`更新角色权限失败: ${errorData.message || response.status}`);
      }
    } catch (error) {
      console.error('更新角色权限失败:', error);
      onError('更新角色权限失败');
    } finally {
      onLoading(false);
    }
  };

  // 删除自定义角色
  const deleteCustomRole = async (role: string) => {
    if (!selectedSafe) return;
    
    const confirmed = await confirm({
      type: 'danger',
      title: '确认删除角色',
      message: `确定要删除角色 "${role}" 吗？此操作不可撤销。`,
      confirmText: '删除',
      cancelText: '取消'
    });
    
    if (!confirmed) {
      return;
    }

    try {
      onLoading(true);
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || buildApiUrl('')}/api/v1/safes/${selectedSafe.id}/roles/${role}`, {
        method: 'DELETE',
        headers: {
          ...getAuthHeaders(token || undefined)
        }
      });
      
      if (response.ok) {
        showSuccess('删除成功', '角色已成功删除');
        fetchRoleConfigurations(selectedSafe.id);
        onError('');
      } else {
        const errorData = await response.json().catch(() => ({}));
        onError(`删除角色失败: ${errorData.message || response.status}`);
      }
    } catch (error) {
      console.error('删除角色失败:', error);
      onError('删除角色失败');
    } finally {
      onLoading(false);
    }
  };

  // 创建自定义权限模板
  const createPermissionTemplate = async () => {
    try {
      onLoading(true);
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || buildApiUrl('')}/api/v1/role-templates/custom`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(token || undefined)
        },
        body: JSON.stringify(newTemplate)
      });
      
      if (response.ok) {
        showSuccess('创建成功', '权限模板已成功创建');
        setShowTemplateModal(false);
        setNewTemplate({
          name: '',
          display_name: '',
          description: '',
          category: 'system', // 权限模板页面只能创建系统级模板
          permissions: []
        });
        fetchPermissionTemplates();
        onError('');
      } else {
        const errorData = await response.json().catch(() => ({}));
        onError(`创建模板失败: ${errorData.message || response.status}`);
      }
    } catch (error) {
      console.error('创建模板失败:', error);
      onError('创建模板失败');
    } finally {
      onLoading(false);
    }
  };

  // 获取权限模板
  const fetchPermissionTemplates = async () => {
    try {
      onLoading(true);
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || buildApiUrl('')}/api/v1/role-templates?category=safe`, {
        headers: {
          ...getAuthHeaders(token || undefined)
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('权限模板数据:', data); // 调试日志
        
        // 处理API返回的数据结构
        let templates = [];
        if (data.success && data.data && data.data.templates) {
          templates = data.data.templates;
        } else if (data.templates) {
          templates = data.templates;
        } else if (Array.isArray(data)) {
          templates = data;
        }
        
        // 转换模板数据格式以匹配前端接口
        const formattedTemplates = templates.map((template: any) => ({
          id: template.id || template.ID,
          name: template.display_name || template.DisplayName || template.name || template.Name,
          description: template.description || template.Description,
          role_type: template.name || template.Name || template.id,
          permissions: template.permissions || template.Permissions || [],
          is_system_template: template.is_default !== undefined ? template.is_default : true
        }));
        
        setPermissionTemplates(formattedTemplates);
        onError('');
      } else {
        onError(`获取权限模板失败: ${response.status}`);
      }
    } catch (error) {
      console.error('获取权限模板失败:', error);
      onError('获取权限模板失败');
    } finally {
      onLoading(false);
    }
  };

  // 添加成员
  const addMember = async () => {
    if (!selectedSafe || !newMemberEmail.trim()) {
      onError('请填写成员邮箱');
      return;
    }

    try {
      onLoading(true);
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || buildApiUrl('')}/api/v1/safes/${selectedSafe.id}/members/roles`, {
        method: 'POST',
        headers: {
          ...getAuthHeaders(token || undefined)
        },
        body: JSON.stringify({
          user_email: newMemberEmail.trim(),
          role: newMemberRole
        })
      });
      
      if (response.ok) {
        showSuccess('添加成功', '新成员已成功添加到Safe');
        setNewMemberEmail('');
        setNewMemberRole('safe_viewer');
        setShowMemberModal(false);
        fetchSafeMembers(selectedSafe.id);
        onError('');
      } else {
        const data = await response.json();
        onError(`添加成员失败: ${data.message || response.statusText}`);
      }
    } catch (error) {
      console.error('添加成员失败:', error);
      onError('添加成员失败，请检查网络连接');
    } finally {
      onLoading(false);
    }
  };


  // 获取Safe可用角色
  const fetchAvailableRoles = async (safeId: string) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || buildApiUrl('')}/api/v1/safes/${safeId}/available-roles`, {
        headers: {
          ...getAuthHeaders(token || undefined)
        }
      });

      if (response.ok) {
        const data = await response.json();
        // 确保 roles 始终是一个数组
        const roles = data.data?.roles || [];
        setAvailableRoles(Array.isArray(roles) ? roles : []);
      } else {
        console.warn('获取可用角色失败:', response.status);
        setAvailableRoles([]);
      }
    } catch (error) {
      console.error('获取可用角色失败:', error);
      setAvailableRoles([]);
    }
  };

  // 初始化数据
  useEffect(() => {
    fetchSafes();
    if (activeModule === 'permission-templates') {
      fetchPermissionTemplates();
    }
  }, [activeModule]);

  // 处理预选Safe ID（从URL参数传入）
  useEffect(() => {
    if (preSelectedSafeId && safes.length > 0) {
      const targetSafe = safes.find(safe => safe.id === preSelectedSafeId);
      if (targetSafe) {
        setSelectedSafe(targetSafe);
        console.log('✅ 自动选中Safe:', targetSafe.name, targetSafe.address);
      } else {
        console.warn('⚠️ 未找到指定的Safe ID:', preSelectedSafeId);
      }
    }
  }, [preSelectedSafeId, safes]);

  // 当选择的Safe改变时，重新获取相关数据
  useEffect(() => {
    if (selectedSafe) {
      if (activeModule === 'member-management') {
        fetchSafeMembers(selectedSafe.id);
      } else if (activeModule === 'role-config') {
        fetchRoleConfigurations(selectedSafe.id);
      }
    }
  }, [selectedSafe, activeModule]);

  // 渲染Safe选择器
  const renderSafeSelector = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <Building className="w-5 h-5" />
            Safe选择器
          </h3>
          <p className="text-sm text-gray-600 mt-1">选择要管理的Safe钱包</p>
        </div>
        <Button
          onClick={fetchSafes}
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

      {/* 当前选择的Safe */}
      {selectedSafe && (
        <Card className="p-6 bg-blue-50 border-blue-200">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-lg font-medium text-blue-900 mb-2">当前选择的Safe</h4>
              <div className="space-y-1">
                <p className="text-sm text-blue-800">
                  <span className="font-medium">名称:</span> {selectedSafe.name}
                </p>
                <p className="text-sm text-blue-800">
                  <span className="font-medium">地址:</span> {selectedSafe.address}
                </p>
                <p className="text-sm text-blue-800">
                  <span className="font-medium">签名阈值:</span> {selectedSafe.threshold}/{selectedSafe.owner_count}
                </p>
              </div>
            </div>
            <Button
              onClick={() => setShowSafeSelector(!showSafeSelector)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <ChevronDown className="w-4 h-4 mr-2" />
              切换Safe
            </Button>
          </div>
        </Card>
      )}

      {/* Safe列表 */}
      {(showSafeSelector || !selectedSafe) && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {safes && safes.length > 0 ? safes.map((safe) => (
            <div
              key={safe.id}
              className={`cursor-pointer transition-all duration-200 hover:shadow-lg ${
                selectedSafe?.id === safe.id 
                  ? 'ring-2 ring-blue-500 bg-blue-50' 
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => {
                setSelectedSafe(safe);
                setShowSafeSelector(false);
              }}
            >
              <Card>
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-medium text-gray-900">{safe.name}</h4>
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      safe.is_active 
                        ? 'bg-green-100 text-green-800' 
                        : 'bg-gray-100 text-gray-800'
                    }`}>
                      {safe.is_active ? '活跃' : '禁用'}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{safe.description}</p>
                  <div className="text-xs text-gray-500 space-y-1">
                    <p>地址: {safe.address.slice(0, 10)}...{safe.address.slice(-8)}</p>
                    <p>阈值: {safe.threshold}/{safe.owner_count}</p>
                    <p>创建时间: {new Date(safe.created_at).toLocaleDateString('zh-CN')}</p>
                  </div>
                </div>
              </Card>
            </div>
          )) : (
            <div className="col-span-full">
              <Card className="p-8 text-center">
                <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-2">暂无Safe钱包</p>
                <p className="text-sm text-gray-400">请先创建一个Safe钱包来管理权限</p>
              </Card>
            </div>
          )}
        </div>
      )}
    </div>
  );

  // 渲染成员管理
  const renderMemberManagement = () => {
    if (!selectedSafe) {
      return (
        <div className="text-center py-12">
          <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">请先选择Safe</h3>
          <p className="text-gray-500">请先从Safe选择器中选择一个Safe钱包</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5" />
              成员管理
            </h3>
            <p className="text-sm text-gray-600 mt-1">管理 {selectedSafe.name} 的成员和权限</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => {
                setShowMemberModal(true);
                if (selectedSafe) {
                  fetchAvailableRoles(selectedSafe.id);
                }
              }}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <UserPlus className="w-4 h-4 mr-2" />
              添加成员
            </Button>
            <Button
              onClick={() => fetchSafeMembers(selectedSafe.id)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新
            </Button>
          </div>
        </div>

        <Card>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    成员信息
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    角色
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    权限数量
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    加入时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {safeMembers && safeMembers.length > 0 ? safeMembers.map((member, index) => (
                  <tr key={member.id || `member-${index}`} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{member.user_email || '未知邮箱'}</div>
                        <div className="text-sm text-gray-500">{member.user_name || '未知用户'}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        member.role === 'safe_admin' 
                          ? 'bg-red-100 text-red-800'
                          : member.role === 'safe_treasurer'
                          ? 'bg-blue-100 text-blue-800'
                          : member.role === 'safe_operator'
                          ? 'bg-green-100 text-green-800'
                          : member.role === 'safe_viewer'
                          ? 'bg-gray-100 text-gray-800'
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {member.role === 'safe_admin' ? 'Safe管理员' : 
                         member.role === 'safe_treasurer' ? '财务员' :
                         member.role === 'safe_operator' ? '操作员' : 
                         member.role === 'safe_viewer' ? '观察者' : '未知角色'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {member.permissions?.length || 0} 个权限
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {member.joined_at ? new Date(member.joined_at).toLocaleString('zh-CN') : '未知'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        member.is_active !== false 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {member.is_active !== false ? '活跃' : '禁用'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex space-x-2">
                        <Button 
                          size="sm" 
                          className="bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => handleEditMember(member)}
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          编辑
                        </Button>
                        <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                          <UserMinus className="w-3 h-3 mr-1" />
                          移除
                        </Button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-8 text-center">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-500">暂无成员数据</p>
                      <p className="text-sm text-gray-400 mt-1">请添加成员来管理Safe权限</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  };

  // 渲染角色配置
  const renderRoleConfig = () => {
    if (!selectedSafe) {
      return (
        <div className="text-center py-12">
          <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">请先选择Safe</h3>
          <p className="text-gray-500">请先从Safe选择器中选择一个Safe钱包</p>
        </div>
      );
    }

    // 角色配置页面应该只显示该Safe中实际使用的角色实例
    // 不再显示预制角色模板，预制角色应该在"权限模板"页面管理
    const roleDefinitions = roleConfigurations;

    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Shield className="w-5 h-5" />
              角色配置
            </h3>
            <p className="text-sm text-gray-600 mt-1">管理 {selectedSafe.name} 的专属角色配置（Safe级角色）</p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => setShowRoleModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <Plus className="w-4 h-4 mr-2" />
              创建角色
            </Button>
            <Button
              onClick={() => fetchRoleConfigurations(selectedSafe.id)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <RefreshCw className="w-4 h-4 mr-2" />
              刷新配置
            </Button>
          </div>
        </div>

        {roleDefinitions.length === 0 ? (
          <Card className="p-8 text-center">
            <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <h4 className="text-lg font-medium text-gray-900 mb-2">暂无角色配置</h4>
            <p className="text-gray-500 mb-4">
              该Safe还没有配置任何角色。您可以：
            </p>
            <div className="space-y-2 text-sm text-gray-600">
              <p>• 在"权限模板"页面选择系统级模板并应用到此Safe</p>
              <p>• 点击"创建角色"按钮为此Safe创建专属角色</p>
              <p>• 在"成员管理"中为成员分配角色</p>
            </div>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {roleDefinitions.map((roleDef) => (
            <Card key={roleDef.role} className="p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-lg bg-${roleDef.color}-100`}>
                    <Shield className={`w-5 h-5 text-${roleDef.color}-600`} />
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900">{roleDef.name}</h4>
                    <p className="text-sm text-gray-500">{roleDef.role}</p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button 
                    size="sm" 
                    onClick={() => {
                      setEditingRole(roleDef);
                      setShowEditRoleModal(true);
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    编辑
                  </Button>
                  {!roleDef.is_system && (
                    <Button 
                      size="sm" 
                      onClick={() => deleteCustomRole(roleDef.role)}
                      className="bg-red-600 hover:bg-red-700 text-white"
                    >
                      <Trash2 className="w-3 h-3 mr-1" />
                      删除
                    </Button>
                  )}
                </div>
              </div>
              
              <p className="text-sm text-gray-600 mb-4">{roleDef.description}</p>
              
              <div>
                <h5 className="text-sm font-medium text-gray-900 mb-2">包含权限:</h5>
                <div className="space-y-1">
                  {roleDef.permissions.map((permission) => (
                    <div key={permission} className="flex items-center text-sm text-gray-600">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                      {permission.replace('_', ' ')}
                    </div>
                  ))}
                </div>
              </div>
            </Card>
          ))}
          </div>
        )}
      </div>
    );
  };

  // 渲染权限模板
  const renderPermissionTemplates = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <Settings className="w-5 h-5" />
            权限模板
          </h3>
          <p className="text-sm text-gray-600 mt-1">系统级权限模板库，可应用到任意Safe进行角色分配</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => setShowTemplateModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="w-4 h-4 mr-2" />
            创建模板
          </Button>
          <Button
            onClick={fetchPermissionTemplates}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            刷新
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {permissionTemplates.map((template) => (
          <Card key={template.id} className="p-6">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-lg font-medium text-gray-900">{template.name}</h4>
              <div className="flex gap-1">
                <Button
                  size="sm"
                  onClick={() => {
                    setSelectedTemplateForApply(template);
                    setShowApplyTemplateModal(true);
                  }}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Copy className="w-3 h-3 mr-1" />
                  应用
                </Button>
                {!template.is_system_template && (
                  <Button size="sm" className="bg-red-600 hover:bg-red-700 text-white">
                    <Trash2 className="w-3 h-3" />
                  </Button>
                )}
              </div>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">{template.description}</p>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-500">角色类型:</span>
                <span className={`px-2 py-1 rounded text-xs font-medium ${
                  template.role_type === 'safe_admin' ? 'bg-red-100 text-red-800' :
                  template.role_type === 'treasurer' ? 'bg-blue-100 text-blue-800' :
                  template.role_type === 'operator' ? 'bg-green-100 text-green-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {template.role_type}
                </span>
              </div>
              
              <div className="text-sm">
                <span className="text-gray-500">权限数量:</span>
                <span className="ml-2 font-medium">{template.permissions.length} 个</span>
              </div>
              
              <div className="text-sm">
                <span className="text-gray-500">模板类型:</span>
                <span className={`ml-2 px-2 py-1 rounded text-xs ${
                  template.is_system_template 
                    ? 'bg-blue-100 text-blue-800' 
                    : 'bg-green-100 text-green-800'
                }`}>
                  {template.is_system_template ? '系统模板' : '自定义模板'}
                </span>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {permissionTemplates.length === 0 && (
        <Card className="p-8 text-center">
          <Settings className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">暂无权限模板</p>
        </Card>
      )}
    </div>
  );

  // 渲染添加成员模态框
  const renderMemberModal = () => {
    if (!showMemberModal) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              添加成员到 {selectedSafe?.name}
            </h3>
            <Button
              onClick={() => setShowMemberModal(false)}
              size="sm"
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </Button>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label htmlFor="memberEmail" className="block text-sm font-medium text-gray-700 mb-2">
                成员邮箱
              </label>
              <input
                type="email"
                id="memberEmail"
                value={newMemberEmail}
                onChange={(e) => setNewMemberEmail(e.target.value)}
                placeholder="请输入成员邮箱地址"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label htmlFor="memberRole" className="block text-sm font-medium text-gray-700 mb-2">
                角色
              </label>
              <select
                id="memberRole"
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {availableRoles.length === 0 ? (
                  <option value="">请先应用权限模板到此Safe</option>
                ) : (
                  <>
                    <option value="">请选择角色</option>
                    {availableRoles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.displayName} - {role.description}
                      </option>
                    ))}
                  </>
                )}
              </select>
            </div>

            {availableRoles.length === 0 ? (
              <div className="bg-red-50 border border-red-200 rounded-md p-3">
                <p className="text-sm text-red-800">
                  <strong>无可用角色：</strong>此Safe尚未应用任何权限模板。请先在"权限模板"页面为此Safe应用权限模板，然后才能添加成员。
                </p>
              </div>
            ) : (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                <p className="text-sm text-yellow-800">
                  <strong>注意：</strong>添加成员需要该用户已在系统中注册。成员将根据选择的角色获得相应权限。
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              onClick={() => setShowMemberModal(false)}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700"
            >
              取消
            </Button>
            <Button
              onClick={addMember}
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={!newMemberEmail.trim() || !newMemberRole.trim() || availableRoles.length === 0}
            >
              <UserPlus className="w-4 h-4 mr-2" />
              添加成员
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // 渲染创建角色模态框
  const renderRoleModal = () => {
    if (!showRoleModal) return null;

    const availablePermissions = [
      'safe.info.view', 'safe.info.manage', 'safe.info.delete',
      'safe.proposal.view', 'safe.proposal.create', 'safe.proposal.edit', 'safe.proposal.delete', 'safe.proposal.sign', 'safe.proposal.execute',
      'safe.proposal.create.transfer', 'safe.proposal.create.contract', 'safe.proposal.create.governance',
      'safe.member.view', 'safe.member.invite', 'safe.member.remove', 'safe.member.assign_role',
      'safe.policy.view', 'safe.policy.create', 'safe.policy.edit', 'safe.policy.delete', 'safe.policy.activate'
    ];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">创建自定义角色</h3>
            <Button
              onClick={() => setShowRoleModal(false)}
              size="sm"
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </Button>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">角色标识符</label>
              <input
                type="text"
                value={newRole.role}
                onChange={(e) => setNewRole({...newRole, role: e.target.value})}
                placeholder="例如: custom_reviewer"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">角色名称</label>
              <input
                type="text"
                value={newRole.name}
                onChange={(e) => setNewRole({...newRole, name: e.target.value})}
                placeholder="例如: 自定义审核员"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">描述</label>
              <textarea
                value={newRole.description}
                onChange={(e) => setNewRole({...newRole, description: e.target.value})}
                placeholder="描述这个角色的职责和用途"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">颜色</label>
                <select
                  value={newRole.color}
                  onChange={(e) => setNewRole({...newRole, color: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="blue">蓝色</option>
                  <option value="green">绿色</option>
                  <option value="purple">紫色</option>
                  <option value="orange">橙色</option>
                  <option value="pink">粉色</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">权限级别</label>
                <select
                  value={newRole.role_level}
                  onChange={(e) => setNewRole({...newRole, role_level: parseInt(e.target.value)})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value={5}>5 - 自定义角色</option>
                  <option value={6}>6 - 低权限角色</option>
                  <option value={7}>7 - 最低权限角色</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">权限选择</label>
              <div className="border border-gray-300 rounded-md p-3 max-h-40 overflow-y-auto">
                {availablePermissions.map((permission) => (
                  <label key={permission} className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      checked={newRole.permissions.includes(permission)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewRole({...newRole, permissions: [...newRole.permissions, permission]});
                        } else {
                          setNewRole({...newRole, permissions: newRole.permissions.filter(p => p !== permission)});
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{permission}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              onClick={() => setShowRoleModal(false)}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700"
            >
              取消
            </Button>
            <Button
              onClick={createCustomRole}
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={!newRole.role.trim() || !newRole.name.trim() || newRole.permissions.length === 0}
            >
              <Plus className="w-4 h-4 mr-2" />
              创建角色
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // 渲染编辑成员模态框
  const renderEditMemberModal = () => {
    if (!showEditMemberModal || !editingMember) return null;

    const handleSaveEditMember = async () => {
      try {
        onLoading(true);
        
        // 调用更新成员角色的API
        const response = await fetch(
          `${import.meta.env.VITE_API_BASE_URL || buildApiUrl('')}/api/v1/safes/${selectedSafe?.id}/members/roles`,
          {
            method: 'POST',
            headers: getAuthHeaders(token || undefined),
            body: JSON.stringify({
              user_id: editingMember.user_id,
              role: newMemberRole,
              restrictions: {} // 可以根据需要添加限制
            })
          }
        );

        if (response.ok) {
          // API调用成功，刷新成员列表
          if (selectedSafe) {
            await fetchSafeMembers(selectedSafe.id);
          }
          
          setShowEditMemberModal(false);
          setEditingMember(null);
          setNewMemberRole('');
          onError('');
          showSuccess('更新成功', '成员角色已成功更新');
        } else {
          const errorData = await response.json();
          throw new Error(errorData.error || '更新失败');
        }
      } catch (error) {
        console.error('更新成员角色失败:', error);
        onError(`更新成员角色失败: ${error instanceof Error ? error.message : '未知错误'}`);
      } finally {
        onLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-md">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">
              编辑成员角色: {editingMember.user_email}
            </h3>
            <Button
              onClick={() => setShowEditMemberModal(false)}
              size="sm"
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </Button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                选择新角色
              </label>
              <select
                value={newMemberRole}
                onChange={(e) => setNewMemberRole(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {availableRoles.length === 0 ? (
                  <option value="">请先应用权限模板到此Safe</option>
                ) : (
                  <>
                    <option value="">请选择新角色</option>
                    {availableRoles
                      .filter(role => role.id !== editingMember.role) // 排除当前成员已有的角色
                      .map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.displayName} - {role.description}
                        </option>
                      ))}
                  </>
                )}
              </select>
              
              {/* 当没有其他可选角色时的提示 */}
              {availableRoles.length > 0 && availableRoles.filter(role => role.id !== editingMember.role).length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mt-2">
                  <p className="text-sm text-yellow-800">
                    <strong>提示：</strong>当前成员已拥有唯一可用的角色，无其他角色可选择。
                  </p>
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end space-x-3 mt-6">
            <Button
              onClick={() => setShowEditMemberModal(false)}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700"
            >
              取消
            </Button>
            <Button
              onClick={handleSaveEditMember}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={
                !newMemberRole.trim() || 
                availableRoles.length === 0 || 
                availableRoles.filter(role => role.id !== editingMember.role).length === 0
              }
            >
              保存更改
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // 渲染编辑角色模态框
  const renderEditRoleModal = () => {
    if (!showEditRoleModal || !editingRole) return null;

    const availablePermissions = [
      'safe.info.view', 'safe.info.manage', 'safe.info.delete',
      'safe.proposal.view', 'safe.proposal.create', 'safe.proposal.edit', 'safe.proposal.delete', 'safe.proposal.sign', 'safe.proposal.execute',
      'safe.proposal.create.transfer', 'safe.proposal.create.contract', 'safe.proposal.create.governance',
      'safe.member.view', 'safe.member.invite', 'safe.member.remove', 'safe.member.assign_role',
      'safe.policy.view', 'safe.policy.create', 'safe.policy.edit', 'safe.policy.delete', 'safe.policy.activate'
    ];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">编辑角色: {editingRole.name}</h3>
            <Button
              onClick={() => setShowEditRoleModal(false)}
              size="sm"
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </Button>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">角色名称</label>
              <input
                type="text"
                value={editingRole.name}
                onChange={(e) => setEditingRole({...editingRole, name: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={editingRole.is_system}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">描述</label>
              <textarea
                value={editingRole.description}
                onChange={(e) => setEditingRole({...editingRole, description: e.target.value})}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={editingRole.is_system}
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">权限配置</label>
              <div className="border border-gray-300 rounded-md p-3 max-h-40 overflow-y-auto">
                {availablePermissions.map((permission) => (
                  <label key={permission} className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      checked={editingRole.permissions.includes(permission)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setEditingRole({...editingRole, permissions: [...editingRole.permissions, permission]});
                        } else {
                          setEditingRole({...editingRole, permissions: editingRole.permissions.filter(p => p !== permission)});
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{permission}</span>
                  </label>
                ))}
              </div>
            </div>

            {editingRole.is_system && (
              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  <strong>系统角色：</strong>这是系统预设角色，只能修改权限配置，不能修改名称和描述。
                </p>
              </div>
            )}
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              onClick={() => setShowEditRoleModal(false)}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700"
            >
              取消
            </Button>
            <Button
              onClick={updateRolePermissions}
              className="bg-blue-600 hover:bg-blue-700 text-white"
              disabled={editingRole.permissions.length === 0}
            >
              <Edit className="w-4 h-4 mr-2" />
              保存更改
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // 根据激活的模块渲染内容
  const renderContent = () => {
    switch (activeModule) {
      case 'safe-selector':
        return renderSafeSelector();
      case 'member-management':
        return renderMemberManagement();
      case 'role-config':
        return renderRoleConfig();
      case 'permission-templates':
        return renderPermissionTemplates();
      default:
        return (
          <div className="text-center py-12">
            <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Safe级权限管理</h3>
            <p className="text-gray-500">请选择一个功能模块开始管理Safe级权限</p>
          </div>
        );
    }
  };

  // 渲染创建模板模态框
  const renderTemplateModal = () => {
    if (!showTemplateModal) return null;

    const availablePermissions = [
      'safe.info.view', 'safe.info.manage', 'safe.info.delete',
      'safe.proposal.view', 'safe.proposal.create', 'safe.proposal.edit', 'safe.proposal.delete', 'safe.proposal.sign', 'safe.proposal.execute',
      'safe.proposal.create.transfer', 'safe.proposal.create.contract', 'safe.proposal.create.governance',
      'safe.member.view', 'safe.member.invite', 'safe.member.remove', 'safe.member.assign_role',
      'safe.policy.view', 'safe.policy.create', 'safe.policy.edit', 'safe.policy.delete', 'safe.policy.activate'
    ];

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">创建权限模板</h3>
            <Button
              onClick={() => setShowTemplateModal(false)}
              size="sm"
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </Button>
          </div>

          <div className="space-y-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">模板标识符</label>
              <input
                type="text"
                value={newTemplate.name}
                onChange={(e) => setNewTemplate({...newTemplate, name: e.target.value})}
                placeholder="例如: custom_auditor"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">模板显示名称</label>
              <input
                type="text"
                value={newTemplate.display_name}
                onChange={(e) => setNewTemplate({...newTemplate, display_name: e.target.value})}
                placeholder="例如: 自定义审计员"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">描述</label>
              <textarea
                value={newTemplate.description}
                onChange={(e) => setNewTemplate({...newTemplate, description: e.target.value})}
                placeholder="描述这个模板的用途和适用场景"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">模板分类</label>
              <div className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50">
                <span className="text-gray-700">系统级模板</span>
                <p className="text-xs text-gray-500 mt-1">
                  权限模板页面只能创建系统级模板，可应用到任意Safe。Safe级角色请在"角色配置"页面创建。
                </p>
              </div>
              <input type="hidden" value="system" />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">权限选择</label>
              <div className="border border-gray-300 rounded-md p-3 max-h-40 overflow-y-auto">
                {availablePermissions.map((permission) => (
                  <label key={permission} className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      checked={newTemplate.permissions.includes(permission)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setNewTemplate({...newTemplate, permissions: [...newTemplate.permissions, permission]});
                        } else {
                          setNewTemplate({...newTemplate, permissions: newTemplate.permissions.filter(p => p !== permission)});
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-sm text-gray-700">{permission}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3">
            <Button
              onClick={() => setShowTemplateModal(false)}
              className="bg-gray-300 hover:bg-gray-400 text-gray-700"
            >
              取消
            </Button>
            <Button
              onClick={createPermissionTemplate}
              className="bg-green-600 hover:bg-green-700 text-white"
              disabled={!newTemplate.name.trim() || !newTemplate.display_name.trim() || newTemplate.permissions.length === 0}
            >
              <Plus className="w-4 h-4 mr-2" />
              创建模板
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // 处理模板应用成功
  const handleApplyTemplateSuccess = () => {
    // 刷新权限模板列表或其他必要的数据
    fetchPermissionTemplates();
    setShowApplyTemplateModal(false);
    setSelectedTemplateForApply(null);
  };

  // 将PermissionTemplate转换为RoleTemplate格式
  const convertToRoleTemplate = (template: PermissionTemplate | null) => {
    if (!template) return null;
    
    return {
      id: template.id,
      name: template.name,
      display_name: template.name, // 使用name作为display_name
      description: template.description,
      category: template.role_type === 'system' ? 'system' : 'safe',
      permissions: template.permissions,
      restrictions: {},
      is_default: template.is_system_template
    };
  };

  return (
    <>
      {renderContent()}
      {renderMemberModal()}
      {renderRoleModal()}
      {renderEditMemberModal()}
      {renderEditRoleModal()}
      {renderTemplateModal()}
      
      {/* 新的应用权限模板模态框 */}
      <ApplyTemplateToSafesModal
        open={showApplyTemplateModal}
        onClose={() => {
          setShowApplyTemplateModal(false);
          setSelectedTemplateForApply(null);
        }}
        template={convertToRoleTemplate(selectedTemplateForApply)}
        onSuccess={handleApplyTemplateSuccess}
      />
    </>
  );
};

export default SafeLevelPermissions;
