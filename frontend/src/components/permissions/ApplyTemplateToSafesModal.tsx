// =====================================================
// 批量应用权限模板到Safe的模态框组件
// 版本: v1.0
// 功能: 支持选择多个Safe并应用权限模板
// 作者: Cascade AI
// 创建时间: 2025-09-18
// =====================================================

import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useAuthStore } from '../../stores/authStore';
import { 
  Shield, 
  Building, 
  CheckCircle, 
  AlertCircle,
  Settings
} from 'lucide-react';

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
  is_active: boolean;
}

interface RoleTemplate {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: string;
  permissions: string[];
  restrictions?: Record<string, any>;
  is_default: boolean;
}

interface ApplyTemplateToSafesModalProps {
  open: boolean;
  onClose: () => void;
  template: RoleTemplate | null;
  onSuccess: () => void;
}

// =====================================================
// 主组件
// =====================================================

export const ApplyTemplateToSafesModal: React.FC<ApplyTemplateToSafesModalProps> = ({
  open,
  onClose,
  template,
  onSuccess,
}) => {
  const [safes, setSafes] = useState<Safe[]>([]);
  const [selectedSafeIds, setSelectedSafeIds] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { token } = useAuthStore();

  // 获取Safe列表
  const fetchSafes = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/safes`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setSafes(data.safes || data || []);
      } else {
        setError(`获取Safe列表失败: ${response.status}`);
      }
    } catch (error) {
      console.error('获取Safe列表失败:', error);
      setError('网络错误，请检查后端服务是否正常运行');
    } finally {
      setLoading(false);
    }
  };

  // 应用模板到选中的Safe
  const handleApplyTemplate = async () => {
    if (!template || selectedSafeIds.length === 0) {
      setError('请至少选择一个Safe');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/safe-role-templates/apply`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          template_id: template.id,
          safe_ids: selectedSafeIds
        })
      });
      
      if (response.ok) {
        onSuccess();
        onClose();
        // 重置状态
        setSelectedSafeIds([]);
        setError(null);
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(`应用模板失败: ${errorData.message || response.status}`);
      }
    } catch (error) {
      console.error('应用模板失败:', error);
      setError('应用模板失败，请重试');
    } finally {
      setSubmitting(false);
    }
  };

  // 切换Safe选择状态
  const toggleSafeSelection = (safeId: string) => {
    setSelectedSafeIds(prev => 
      prev.includes(safeId) 
        ? prev.filter(id => id !== safeId)
        : [...prev, safeId]
    );
  };

  // 全选/取消全选
  const handleSelectAll = () => {
    if (selectedSafeIds.length === safes.length) {
      setSelectedSafeIds([]);
    } else {
      setSelectedSafeIds(safes.map(safe => safe.id));
    }
  };

  // 组件打开时获取数据
  useEffect(() => {
    if (open) {
      fetchSafes();
      setSelectedSafeIds([]);
      setError(null);
    }
  }, [open]);

  if (!template) return null;

  return (
    <Modal 
      isOpen={open} 
      onClose={onClose} 
      title={`应用权限模板: ${template.display_name}`}
      size="lg"
    >
      <div className="space-y-6">
        {/* 模板信息 */}
        <Card className="p-4 bg-blue-50 border-blue-200">
          <div className="flex items-start gap-3">
            <Shield className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-medium text-blue-900 mb-1">{template.display_name}</h4>
              <p className="text-sm text-blue-700 mb-2">{template.description}</p>
              <div className="flex items-center gap-4 text-xs text-blue-600">
                <span className="flex items-center gap-1">
                  <Shield className="w-3 h-3" />
                  {template.permissions.length} 项权限
                </span>
                <span className="flex items-center gap-1">
                  <Settings className="w-3 h-3" />
                  {template.category === 'safe' ? 'Safe级模板' : '系统级模板'}
                </span>
              </div>
            </div>
          </div>
        </Card>

        {/* 选择Safe */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h4 className="text-lg font-medium text-gray-900 flex items-center gap-2">
              <Building className="w-5 h-5" />
              选择目标Safe
            </h4>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-600">
                已选择 {selectedSafeIds.length}/{safes.length} 个Safe
              </span>
              <Button
                size="sm"
                variant="outline"
                onClick={handleSelectAll}
                disabled={loading || safes.length === 0}
              >
                {selectedSafeIds.length === safes.length ? '取消全选' : '全选'}
              </Button>
            </div>
          </div>

          {/* Safe列表 */}
          {loading ? (
            <div className="flex items-center justify-center p-8">
              <div className="text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">加载Safe列表中...</p>
              </div>
            </div>
          ) : safes.length === 0 ? (
            <Card className="p-8 text-center">
              <Building className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">暂无可用的Safe</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-h-96 overflow-y-auto">
              {safes.map((safe) => (
                <div 
                  key={safe.id}
                  className={`p-4 cursor-pointer transition-all duration-200 hover:shadow-md border rounded-lg ${
                    selectedSafeIds.includes(safe.id) 
                      ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200' 
                      : 'hover:bg-gray-50 border-gray-200'
                  }`}
                  onClick={() => toggleSafeSelection(safe.id)}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h5 className="font-medium text-gray-900">{safe.name}</h5>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          safe.is_active 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {safe.is_active ? '活跃' : '禁用'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{safe.description}</p>
                      <div className="text-xs text-gray-500 space-y-1">
                        <p>地址: {safe.address.slice(0, 10)}...{safe.address.slice(-8)}</p>
                        <p>阈值: {safe.threshold}/{safe.owner_count}</p>
                      </div>
                    </div>
                    <div className="ml-3">
                      {selectedSafeIds.includes(safe.id) ? (
                        <CheckCircle className="w-5 h-5 text-blue-600" />
                      ) : (
                        <div className="w-5 h-5 border-2 border-gray-300 rounded-full"></div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
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
          <Button variant="outline" onClick={onClose} disabled={submitting}>
            取消
          </Button>
          <Button 
            onClick={handleApplyTemplate}
            disabled={selectedSafeIds.length === 0 || submitting}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                应用中...
              </>
            ) : (
              <>
                <Shield className="w-4 h-4 mr-2" />
                应用到 {selectedSafeIds.length} 个Safe
              </>
            )}
          </Button>
        </div>
      </div>
    </Modal>
  );
};
