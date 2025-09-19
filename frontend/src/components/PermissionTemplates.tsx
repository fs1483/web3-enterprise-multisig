// =====================================================
// 权限模板组件
// 版本: v1.0
// 功能: 提供权限模板管理和应用的界面
// 作者: sfan
// 创建时间: 2024-12-18
// =====================================================

import React, { useState, useEffect } from 'react';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { Modal } from './ui/Modal';
import { Select } from './ui/Select';
import { permissionTemplateService, type RoleTemplate } from '../services/permissionTemplateService';
import { ApplyTemplateToSafesModal } from './permissions/ApplyTemplateToSafesModal';
import { 
  Shield, 
  Eye, 
  AlertCircle,
  Crown,
  Briefcase,
  UserCheck,
  Search
} from 'lucide-react';

// Inline Badge component
const Badge: React.FC<{ children: React.ReactNode; variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'danger'; size?: 'sm' | 'md'; className?: string }> = ({ 
  children, 
  variant = 'default', 
  size = 'sm',
  className = ''
}) => {
  const variantClasses = {
    default: 'bg-gray-100 text-gray-800',
    secondary: 'bg-blue-100 text-blue-800',
    outline: 'bg-white text-gray-700 border border-gray-300',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-yellow-100 text-yellow-800',
    danger: 'bg-red-100 text-red-800'
  };
  const sizeClasses = {
    sm: 'px-2 py-1 text-xs',
    md: 'px-3 py-1 text-sm'
  };
  return (
    <span className={`inline-flex items-center rounded-full font-medium ${variantClasses[variant]} ${sizeClasses[size]} ${className}`}>
      {children}
    </span>
  );
};

// =====================================================
// 类型定义
// =====================================================

interface User {
  id: string;
  username: string;
  email: string;
  wallet_address: string;
}

interface PermissionTemplatesProps {
  safeId?: string;
  onTemplateApplied?: () => void;
}

interface ApplyTemplateModalProps {
  open: boolean;
  onClose: () => void;
  template: RoleTemplate | null;
  safeId: string;
  availableUsers: User[];
  onApply: (userId: string) => void;
}

// =====================================================
// 应用模板对话框组件
// =====================================================

const ApplyTemplateModal: React.FC<ApplyTemplateModalProps> = ({
  open,
  onClose,
  template,
  safeId,
  availableUsers,
  onApply,
}) => {
  const [selectedUser, setSelectedUser] = useState('');
  const [recommendedRole, setRecommendedRole] = useState<RoleTemplate | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && selectedUser) {
      loadRecommendedRole();
    }
  }, [open, selectedUser, safeId]);

  const loadRecommendedRole = async () => {
    try {
      setLoading(true);
      const recommended = await permissionTemplateService.getRecommendedRole(safeId, selectedUser);
      setRecommendedRole(recommended);
    } catch (error) {
      console.error('获取推荐角色失败:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (selectedUser) {
      onApply(selectedUser);
      setSelectedUser('');
      onClose();
    }
  };

  const handleClose = () => {
    setSelectedUser('');
    setRecommendedRole(null);
    onClose();
  };

  if (!template) return null;

  const permissionDescriptions = permissionTemplateService.getPermissionDescriptions(template);
  const restrictionDescriptions = permissionTemplateService.getRestrictionsDescription(template);

  return (
    <Modal isOpen={open} onClose={handleClose} title={`应用角色模板: ${template.display_name}`}>
      <div className="space-y-6">
        {/* 模板信息 */}
        <div className="bg-gray-50 p-4 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-2">{template.display_name}</h4>
          <p className="text-sm text-gray-600 mb-3">{template.description}</p>
          
          <div className="space-y-2">
            <div>
              <span className="text-sm font-medium text-gray-700">权限列表:</span>
              <div className="flex flex-wrap gap-1 mt-1">
                {template.permissions.map((permission) => (
                  <Badge key={permission} variant="secondary" className="text-xs">
                    {permissionDescriptions[permission]}
                  </Badge>
                ))}
              </div>
            </div>
            
            {restrictionDescriptions.length > 0 && (
              <div>
                <span className="text-sm font-medium text-gray-700">限制条件:</span>
                <ul className="text-sm text-gray-600 mt-1 space-y-1">
                  {restrictionDescriptions.map((restriction, index) => (
                    <li key={index} className="flex items-center gap-2">
                      <AlertCircle className="w-3 h-3 text-amber-500" />
                      {restriction}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* 用户选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            选择用户
          </label>
          <Select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            placeholder="请选择要分配角色的用户"
            options={availableUsers.map((user) => ({
              value: user.id,
              label: `${user.username} (${user.email})`
            }))}
          />
        </div>

        {/* 推荐角色提示 */}
        {selectedUser && recommendedRole && recommendedRole.id !== template.id && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-blue-500 mt-0.5" />
              <div className="text-sm">
                <p className="text-blue-800 font-medium">系统推荐</p>
                <p className="text-blue-700">
                  基于用户情况，推荐使用 <strong>{recommendedRole.display_name}</strong> 角色
                </p>
              </div>
            </div>
          </div>
        )}

        {/* 操作按钮 */}
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={handleClose}>
            取消
          </Button>
          <Button 
            onClick={handleApply} 
            disabled={!selectedUser || loading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {loading ? '处理中...' : '应用模板'}
          </Button>
        </div>
      </div>
    </Modal>
  );
};

// =====================================================
// 权限模板主组件
// =====================================================

export const PermissionTemplates: React.FC<PermissionTemplatesProps> = ({
  safeId,
  onTemplateApplied,
}) => {
  const [safeTemplates, setSafeTemplates] = useState<RoleTemplate[]>([]);
  const [systemTemplates, setSystemTemplates] = useState<RoleTemplate[]>([]);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTemplate, setSelectedTemplate] = useState<RoleTemplate | null>(null);
  const [showApplyModal, setShowApplyModal] = useState(false);
  const [showBatchApplyModal, setShowBatchApplyModal] = useState(false);
  const [activeCategory, setActiveCategory] = useState<'safe' | 'system'>('safe');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    loadTemplates();
    if (safeId) {
      loadAvailableUsers();
    }
  }, [safeId]);

  const loadTemplates = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const [safeTemplatesData, systemTemplatesData] = await Promise.all([
        permissionTemplateService.getSafeRoleTemplates(),
        permissionTemplateService.getSystemRoleTemplates(),
      ]);
      
      setSafeTemplates(safeTemplatesData);
      setSystemTemplates(systemTemplatesData);
    } catch (err) {
      setError('加载权限模板失败');
      console.error('加载权限模板失败:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadAvailableUsers = async () => {
    try {
      // 这里应该调用获取可用用户的API
      // 暂时使用空数组
      setAvailableUsers([]);
    } catch (err) {
      console.error('加载可用用户失败:', err);
    }
  };

  const handleApplyTemplate = async (template: RoleTemplate) => {
    // 如果指定了safeId，使用原有的单Safe应用逻辑
    if (safeId) {
      setSelectedTemplate(template);
      setShowApplyModal(true);
      return;
    }
    
    // 否则使用新的批量应用逻辑
    setSelectedTemplate(template);
    setShowBatchApplyModal(true);
  };

  const handleTemplateApplied = async (userId: string) => {
    if (!selectedTemplate || !safeId) return;

    try {
      await permissionTemplateService.applyRoleTemplate(safeId, selectedTemplate.id, userId);
      
      // 触发回调
      onTemplateApplied?.();
      
      // 显示成功消息
      alert('角色模板应用成功！');
    } catch (err) {
      console.error('应用角色模板失败:', err);
      alert('应用角色模板失败，请重试');
    }
  };

  const getRoleIcon = (templateId: string) => {
    switch (templateId) {
      case 'safe_admin':
        return <Crown className="w-5 h-5 text-yellow-600" />;
      case 'safe_treasurer':
        return <Briefcase className="w-5 h-5 text-green-600" />;
      case 'safe_operator':
        return <UserCheck className="w-5 h-5 text-blue-600" />;
      case 'safe_viewer':
        return <Eye className="w-5 h-5 text-gray-600" />;
      case 'safe_auditor':
        return <Search className="w-5 h-5 text-purple-600" />;
      default:
        return <Shield className="w-5 h-5 text-gray-600" />;
    }
  };

  const filteredTemplates = (templates: RoleTemplate[]) => {
    if (!searchTerm) return templates;
    
    return templates.filter(template =>
      template.display_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      template.permissions.some(permission => 
        permission.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  };

  const currentTemplates = activeCategory === 'safe' ? safeTemplates : systemTemplates;
  const displayTemplates = filteredTemplates(currentTemplates);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">加载权限模板中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center p-8">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-red-600 mb-4">{error}</p>
        <Button onClick={loadTemplates} variant="outline">
          重新加载
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 头部 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">权限模板</h2>
          <p className="text-sm text-gray-600 mt-1">
            使用预设的角色模板快速分配权限
          </p>
        </div>
      </div>

      {/* 分类切换和搜索 */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveCategory('safe')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeCategory === 'safe'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            Safe角色
          </button>
          <button
            onClick={() => setActiveCategory('system')}
            className={`px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
              activeCategory === 'system'
                ? 'bg-white text-blue-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            系统角色
          </button>
        </div>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="搜索模板..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* 模板列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {displayTemplates.map((template) => {
          const permissionDescriptions = permissionTemplateService.getPermissionDescriptions(template);
          const restrictionDescriptions = permissionTemplateService.getRestrictionsDescription(template);

          return (
            <Card key={template.id} className="p-4 hover:shadow-md transition-shadow">
              <div className="space-y-3">
                {/* 模板头部 */}
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2">
                    {getRoleIcon(template.id)}
                    <div>
                      <h3 className="font-medium text-gray-900">{template.display_name}</h3>
                      {template.is_default && (
                        <Badge variant="secondary" className="text-xs mt-1">
                          默认模板
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {/* 描述 */}
                <p className="text-sm text-gray-600 line-clamp-2">
                  {template.description}
                </p>

                {/* 权限数量 */}
                <div className="flex items-center gap-4 text-xs text-gray-500">
                  <span className="flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    {template.permissions.length} 项权限
                  </span>
                  {restrictionDescriptions.length > 0 && (
                    <span className="flex items-center gap-1">
                      <AlertCircle className="w-3 h-3" />
                      {restrictionDescriptions.length} 项限制
                    </span>
                  )}
                </div>

                {/* 权限预览 */}
                <div className="space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {template.permissions.slice(0, 3).map((permission) => (
                      <Badge key={permission} variant="outline" className="text-xs">
                        {permissionDescriptions[permission]}
                      </Badge>
                    ))}
                    {template.permissions.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{template.permissions.length - 3} 更多
                      </Badge>
                    )}
                  </div>
                </div>

                {/* 操作按钮 */}
                <div className="flex gap-2 pt-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      // 显示模板详情
                      alert(`模板详情:\n${JSON.stringify(template, null, 2)}`);
                    }}
                    className="flex-1"
                  >
                    查看详情
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleApplyTemplate(template)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700"
                  >
                    {safeId ? '应用模板' : '批量应用'}
                  </Button>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {/* 空状态 */}
      {displayTemplates.length === 0 && (
        <div className="text-center py-12">
          <Shield className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">
            {searchTerm ? '没有找到匹配的模板' : '暂无可用的权限模板'}
          </p>
        </div>
      )}

      {/* 应用模板对话框 */}
      {showApplyModal && selectedTemplate && safeId && (
        <Modal isOpen={showApplyModal} onClose={() => setShowApplyModal(false)} title={`应用模板: ${selectedTemplate?.display_name}`}>
          <ApplyTemplateModal
            open={showApplyModal}
            onClose={() => setShowApplyModal(false)}
            template={selectedTemplate}
            safeId={safeId || ''}
            availableUsers={availableUsers}
            onApply={handleTemplateApplied}
          />
        </Modal>
      )}

      {/* 批量应用模板对话框 */}
      {showBatchApplyModal && selectedTemplate && (
        <ApplyTemplateToSafesModal
          open={showBatchApplyModal}
          onClose={() => setShowBatchApplyModal(false)}
          template={selectedTemplate}
          onSuccess={() => {
            onTemplateApplied?.();
            alert('权限模板批量应用成功！');
          }}
        />
      )}
    </div>
  );
};
