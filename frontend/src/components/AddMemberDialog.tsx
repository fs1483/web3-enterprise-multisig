// =====================================================
// 企业级成员添加对话框组件
// 版本: v3.0 - 可视化权限配置
// 功能: 提供用户友好的成员添加和权限配置界面
// 作者: Cascade AI
// 创建时间: 2025-09-16
// =====================================================

import React, { useState } from 'react';
import { Modal } from './ui/Modal';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Card } from './ui/Card';
import { Badge } from './ui/Badge';
// Switch组件暂时用原生input实现
// import { Switch } from './ui/Switch';
import { 
  Users, 
  Clock, 
  DollarSign, 
  Calendar,
  CheckCircle,
  Info,
  Settings
} from 'lucide-react';

// =====================================================
// 类型定义
// =====================================================

interface User {
  id: string;
  username: string;
  email: string;
  wallet_address: string;
  department?: string;
  position?: string;
}

interface RoleTemplate {
  id: string;
  name: string;
  display_name: string;
  description: string;
  permissions: string[];
  default_restrictions: PermissionRestrictions;
  category: 'admin' | 'operator' | 'viewer' | 'finance';
}

interface PermissionRestrictions {
  // 金额限制
  max_transaction_amount?: number;
  max_daily_amount?: number;
  
  // 时间限制
  allowed_hours?: {
    start: string; // "09:00"
    end: string;   // "18:00"
  };
  allowed_days?: number[]; // [1,2,3,4,5] 周一到周五
  
  // 操作限制
  require_additional_approval?: boolean;
  max_pending_proposals?: number;
  
  // 过期时间
  expires_at?: string;
  
  // IP限制
  allowed_ips?: string[];
  
  // 其他限制
  can_execute_immediately?: boolean;
  require_time_lock?: boolean;
}

interface AddMemberDialogProps {
  open: boolean;
  onClose: () => void;
  onAddMember: (userId: string, roleId: string, restrictions: PermissionRestrictions) => Promise<void>;
  availableUsers: User[];
  roleTemplates: RoleTemplate[];
}

// =====================================================
// 权限限制配置组件
// =====================================================

const RestrictionConfigPanel: React.FC<{
  restrictions: PermissionRestrictions;
  onChange: (restrictions: PermissionRestrictions) => void;
  selectedRole?: RoleTemplate;
}> = ({ restrictions, onChange }) => {
  
  const updateRestriction = (key: keyof PermissionRestrictions, value: unknown) => {
    onChange({
      ...restrictions,
      [key]: value
    });
  };

  return (
    <div className="space-y-6">
      {/* 金额限制 */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <DollarSign className="w-4 h-4 text-green-600" />
          <h4 className="font-medium text-gray-900">金额限制</h4>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              单笔交易限额 (ETH)
            </label>
            <Input
              type="number"
              placeholder="如：10"
              value={restrictions.max_transaction_amount || ''}
              onChange={(e) => updateRestriction('max_transaction_amount', parseFloat(e.target.value) || undefined)}
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              日累计限额 (ETH)
            </label>
            <Input
              type="number"
              placeholder="如：50"
              value={restrictions.max_daily_amount || ''}
              onChange={(e) => updateRestriction('max_daily_amount', parseFloat(e.target.value) || undefined)}
            />
          </div>
        </div>
      </Card>

      {/* 时间限制 */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Clock className="w-4 h-4 text-blue-600" />
          <h4 className="font-medium text-gray-900">时间限制</h4>
        </div>
        
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                允许操作时间 - 开始
              </label>
              <Input
                type="time"
                value={restrictions.allowed_hours?.start || '09:00'}
                onChange={(e) => updateRestriction('allowed_hours', {
                  ...restrictions.allowed_hours,
                  start: e.target.value,
                  end: restrictions.allowed_hours?.end || '18:00'
                })}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                允许操作时间 - 结束
              </label>
              <Input
                type="time"
                value={restrictions.allowed_hours?.end || '18:00'}
                onChange={(e) => updateRestriction('allowed_hours', {
                  ...restrictions.allowed_hours,
                  start: restrictions.allowed_hours?.start || '09:00',
                  end: e.target.value
                })}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              允许操作日期
            </label>
            <div className="flex flex-wrap gap-2">
              {['周一', '周二', '周三', '周四', '周五', '周六', '周日'].map((day, index) => (
                <label key={day} className="flex items-center gap-1 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={restrictions.allowed_days?.includes(index + 1) || false}
                    onChange={(e) => {
                      const currentDays = restrictions.allowed_days || [];
                      const newDays = e.target.checked
                        ? [...currentDays, index + 1]
                        : currentDays.filter(d => d !== index + 1);
                      updateRestriction('allowed_days', newDays);
                    }}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">{day}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </Card>

      {/* 操作限制 */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Settings className="w-4 h-4 text-purple-600" />
          <h4 className="font-medium text-gray-900">操作限制</h4>
        </div>
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">需要额外审批</label>
              <p className="text-xs text-gray-500">大额交易需要上级审批</p>
            </div>
            <input
              type="checkbox"
              checked={restrictions.require_additional_approval || false}
              onChange={(e) => updateRestriction('require_additional_approval', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div>
              <label className="text-sm font-medium text-gray-700">可立即执行</label>
              <p className="text-xs text-gray-500">跳过时间锁直接执行</p>
            </div>
            <input
              type="checkbox"
              checked={restrictions.can_execute_immediately || false}
              onChange={(e) => updateRestriction('can_execute_immediately', e.target.checked)}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              最大待处理提案数
            </label>
            <Input
              type="number"
              placeholder="如：5"
              value={restrictions.max_pending_proposals || ''}
              onChange={(e) => updateRestriction('max_pending_proposals', parseInt(e.target.value) || undefined)}
            />
          </div>
        </div>
      </Card>

      {/* 过期时间 */}
      <Card className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Calendar className="w-4 h-4 text-orange-600" />
          <h4 className="font-medium text-gray-900">权限有效期</h4>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            权限过期时间（可选）
          </label>
          <Input
            type="datetime-local"
            value={restrictions.expires_at || ''}
            onChange={(e) => updateRestriction('expires_at', e.target.value || undefined)}
          />
          <p className="text-xs text-gray-500 mt-1">
            留空表示永不过期
          </p>
        </div>
      </Card>
    </div>
  );
};

// =====================================================
// 角色模板选择组件
// =====================================================

const RoleTemplateSelector: React.FC<{
  templates: RoleTemplate[];
  selectedTemplate?: RoleTemplate;
  onSelect: (template: RoleTemplate) => void;
}> = ({ templates, selectedTemplate, onSelect }) => {
  
  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'admin': return 'bg-red-100 text-red-800';
      case 'finance': return 'bg-green-100 text-green-800';
      case 'operator': return 'bg-blue-100 text-blue-800';
      case 'viewer': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <div className="space-y-3">
      {templates.map((template) => (
        <div 
          key={template.id}
          className={`p-4 cursor-pointer transition-all hover:shadow-md bg-white rounded-lg border border-gray-200 shadow-sm ${
            selectedTemplate?.id === template.id 
              ? 'ring-2 ring-blue-500 bg-blue-50' 
              : 'hover:bg-gray-50'
          }`}
          onClick={() => onSelect(template)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium text-gray-900">{template.display_name}</h4>
                <Badge className={getCategoryColor(template.category)}>
                  {template.category}
                </Badge>
              </div>
              
              <p className="text-sm text-gray-600 mb-3">{template.description}</p>
              
              <div className="flex flex-wrap gap-1">
                {template.permissions.slice(0, 3).map((permission) => (
                  <Badge key={permission} variant="outline" className="text-xs">
                    {permission.split('.').pop()}
                  </Badge>
                ))}
                {template.permissions.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{template.permissions.length - 3} 更多
                  </Badge>
                )}
              </div>
            </div>
            
            {selectedTemplate?.id === template.id && (
              <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0" />
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// =====================================================
// 主对话框组件
// =====================================================

const AddMemberDialog: React.FC<AddMemberDialogProps> = ({
  open,
  onClose,
  onAddMember,
  availableUsers,
  roleTemplates
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [selectedRole, setSelectedRole] = useState<RoleTemplate | null>(null);
  const [restrictions, setRestrictions] = useState<PermissionRestrictions>({});

  // 调试：在组件挂载时检查数据
  React.useEffect(() => {
    console.log('🔍 AddMemberDialog 数据检查:');
    console.log('- 弹窗打开状态:', open);
    console.log('- 可用用户数量:', availableUsers.length);
    console.log('- 可用用户列表:', availableUsers);
    console.log('- 角色模板数量:', roleTemplates.length);
  }, [open, availableUsers, roleTemplates]);
  const [loading, setLoading] = useState(false);

  // 重置表单
  const resetForm = () => {
    setCurrentStep(1);
    setSelectedUser(null);
    setSelectedRole(null);
    setRestrictions({});
  };

  // 处理关闭
  const handleClose = () => {
    resetForm();
    onClose();
  };

  // 选择角色时应用默认限制
  const handleRoleSelect = (role: RoleTemplate) => {
    setSelectedRole(role);
    setRestrictions(role.default_restrictions);
  };

  // 提交添加成员
  const handleSubmit = async () => {
    if (!selectedUser || !selectedRole) return;
    
    try {
      setLoading(true);
      await onAddMember(selectedUser.id, selectedRole.id, restrictions);
      handleClose();
    } catch (error) {
      console.error('添加成员失败:', error);
    } finally {
      setLoading(false);
    }
  };

  // 步骤指示器
  const StepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      {[1, 2, 3].map((step) => (
        <React.Fragment key={step}>
          <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
            currentStep >= step 
              ? 'bg-blue-600 text-white' 
              : 'bg-gray-200 text-gray-600'
          }`}>
            {step}
          </div>
          {step < 3 && (
            <div className={`w-12 h-0.5 mx-2 ${
              currentStep > step ? 'bg-blue-600' : 'bg-gray-200'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  return (
    <Modal 
      isOpen={open} 
      onClose={handleClose} 
      title="添加Safe成员"
      size="lg"
    >
      <div className="space-y-6">
        <StepIndicator />
        
        {/* 步骤1: 选择用户 */}
        {currentStep === 1 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">选择用户</h3>
            
            {/* 调试信息 */}
            <div className="mb-4 p-2 bg-gray-100 rounded text-sm text-gray-600">
              可用用户数量: {availableUsers.length}
            </div>
            
            <div className="space-y-3">
              {availableUsers.length === 0 ? (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">暂无可添加的用户</p>
                  <p className="text-sm text-gray-400 mt-2">所有系统用户可能已经是Safe成员</p>
                </div>
              ) : (
                availableUsers.map((user) => (
                <div 
                  key={user.id}
                  className={`p-4 cursor-pointer transition-all hover:shadow-md bg-white rounded-lg border border-gray-200 shadow-sm ${
                    selectedUser?.id === user.id 
                      ? 'ring-2 ring-blue-500 bg-blue-50' 
                      : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gray-200 rounded-full flex items-center justify-center">
                        <Users className="w-5 h-5 text-gray-600" />
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{user.username}</h4>
                        <p className="text-sm text-gray-600">{user.email}</p>
                        {user.department && (
                          <p className="text-xs text-gray-500">{user.department} - {user.position}</p>
                        )}
                      </div>
                    </div>
                    
                    {selectedUser?.id === user.id && (
                      <CheckCircle className="w-5 h-5 text-blue-600" />
                    )}
                  </div>
                </div>
                ))
              )}
            </div>
            
            <div className="flex justify-end mt-6">
              <Button 
                onClick={() => setCurrentStep(2)}
                disabled={!selectedUser}
              >
                下一步
              </Button>
            </div>
          </div>
        )}
        
        {/* 步骤2: 选择角色 */}
        {currentStep === 2 && (
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">选择角色模板</h3>
            
            <RoleTemplateSelector
              templates={roleTemplates}
              selectedTemplate={selectedRole || undefined}
              onSelect={handleRoleSelect}
            />
            
            <div className="flex justify-between mt-6">
              <Button 
                variant="outline"
                onClick={() => setCurrentStep(1)}
              >
                上一步
              </Button>
              <Button 
                onClick={() => setCurrentStep(3)}
                disabled={!selectedRole}
              >
                下一步
              </Button>
            </div>
          </div>
        )}
        
        {/* 步骤3: 配置权限限制 */}
        {currentStep === 3 && (
          <div>
            <div className="flex items-center gap-2 mb-4">
              <h3 className="text-lg font-medium text-gray-900">配置权限限制</h3>
              <Info className="w-4 h-4 text-blue-600" />
            </div>
            
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
              <p className="text-sm text-blue-800">
                为 <strong>{selectedUser?.username}</strong> 配置 <strong>{selectedRole?.display_name}</strong> 角色的具体权限限制
              </p>
            </div>
            
            <RestrictionConfigPanel
              restrictions={restrictions}
              onChange={setRestrictions}
              selectedRole={selectedRole || undefined}
            />
            
            <div className="flex justify-between mt-6">
              <Button 
                variant="outline"
                onClick={() => setCurrentStep(2)}
              >
                上一步
              </Button>
              <Button 
                onClick={handleSubmit}
                isLoading={loading}
                disabled={!selectedUser || !selectedRole}
              >
                添加成员
              </Button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AddMemberDialog;
