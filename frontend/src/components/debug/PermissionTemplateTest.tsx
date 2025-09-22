// =====================================================
import { buildApiUrl, API_ENDPOINTS, getAuthHeaders } from '../config/api';
// 权限模板API测试组件
// 用于验证权限模板API是否正常工作
// =====================================================

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';

interface PermissionTemplate {
  id: string;
  name: string;
  description: string;
  permissions: string[];
  is_system_template: boolean;
}

const PermissionTemplateTest: React.FC = () => {
  const { token } = useAuthStore();
  const [templates, setTemplates] = useState<PermissionTemplate[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const fetchTemplates = async () => {
    try {
      setLoading(true);
      setError('');
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || buildApiUrl('')}/api/v1/role-templates?category=safe`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...getAuthHeaders()
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log('🧪 权限模板API响应:', data);
        
        // 处理API返回的数据结构
        let templateList = [];
        if (data.success && data.data && data.data.templates) {
          templateList = data.data.templates;
        } else if (data.templates) {
          templateList = data.templates;
        } else if (Array.isArray(data)) {
          templateList = data;
        }
        
        // 转换数据格式
        const formattedTemplates = templateList.map((template: any) => ({
          id: template.id || template.ID,
          name: template.display_name || template.DisplayName || template.name || template.Name,
          description: template.description || template.Description,
          permissions: template.permissions || template.Permissions || [],
          is_system_template: template.is_default !== undefined ? template.is_default : true
        }));
        
        setTemplates(formattedTemplates);
        console.log('✅ 权限模板加载成功:', formattedTemplates);
      } else {
        const errorText = await response.text();
        setError(`API调用失败: ${response.status} - ${errorText}`);
      }
    } catch (err) {
      console.error('❌ 权限模板加载失败:', err);
      setError(err instanceof Error ? err.message : '未知错误');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchTemplates();
    }
  }, [token]);

  return (
    <div className="fixed bottom-4 left-4 z-50 bg-white p-4 rounded-lg shadow-lg border max-w-md">
      <h3 className="text-sm font-semibold mb-2">🧪 权限模板API测试</h3>
      
      <button
        onClick={fetchTemplates}
        disabled={loading}
        className="mb-3 px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
      >
        {loading ? '加载中...' : '重新加载'}
      </button>

      {error && (
        <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {error}
        </div>
      )}

      <div className="space-y-2 max-h-60 overflow-y-auto">
        {templates.length === 0 ? (
          <div className="text-xs text-gray-500">
            {loading ? '加载中...' : '暂无权限模板'}
          </div>
        ) : (
          templates.map((template) => (
            <div key={template.id} className="p-2 bg-gray-50 rounded text-xs">
              <div className="font-medium text-gray-900">{template.name}</div>
              <div className="text-gray-600 mb-1">{template.description}</div>
              <div className="text-gray-500">ID: {template.id}</div>
              <div className="text-gray-500">
                权限数量: {template.permissions.length}
              </div>
              {template.is_system_template && (
                <span className="inline-block px-1 py-0.5 bg-blue-100 text-blue-800 rounded text-xs">
                  系统模板
                </span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default PermissionTemplateTest;
