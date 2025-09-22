import React, { useState, useEffect } from 'react';
import { buildApiUrl, API_ENDPOINTS, getAuthHeaders } from '../config/api';
import { Search, Edit, Save, X } from 'lucide-react';

interface PermissionMapping {
  code: string;
  name: string;
  description: string;
  category: string;
  scope: string;
  mapping_type?: string;
  mapping_url?: string;
  mapping_method?: string;
  ui_element_id?: string;
  parent_permission?: string;
  display_order?: number;
  is_active: boolean;
}

interface PermissionMappingStats {
  mapping_type: string;
  count: number;
  description: string;
}

const MAPPING_TYPES = [
  { value: 'menu', label: '导航菜单', description: '主导航菜单项' },
  { value: 'button', label: '操作按钮', description: '页面中的操作按钮' },
  { value: 'api', label: 'API接口', description: '后端API端点' },
  { value: 'page', label: '页面访问', description: '页面级别的访问控制' },
  { value: 'feature', label: '功能模块', description: '特定功能模块' }
];

const HTTP_METHODS = ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'];

export const PermissionMappingManager: React.FC = () => {
  const [mappings, setMappings] = useState<PermissionMapping[]>([]);
  const [stats, setStats] = useState<PermissionMappingStats[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('');
  const [editingMapping, setEditingMapping] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<PermissionMapping>>({});

  // 获取权限映射列表
  const fetchMappings = async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (selectedType) params.append('mapping_type', selectedType);
      if (searchTerm) params.append('search', searchTerm);

      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || buildApiUrl('')}/api/v1/permission-mappings?${params}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            ...getAuthHeaders()
          }
        }
      );

      if (!response.ok) {
        throw new Error('获取权限映射失败');
      }

      const data = await response.json();
      if (data.success) {
        setMappings(data.data.mappings || []);
      } else {
        throw new Error(data.error || '获取权限映射失败');
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // 获取权限映射统计
  const fetchStats = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || buildApiUrl('')}/api/v1/permission-mappings/stats`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            ...getAuthHeaders()
          }
        }
      );

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setStats(data.data.stats || []);
        }
      }
    } catch (err) {
      console.error('获取统计信息失败:', err);
    }
  };

  // 更新权限映射
  const updateMapping = async (code: string, updates: Partial<PermissionMapping>) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || buildApiUrl('')}/api/v1/permission-mappings/${code}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`,
            ...getAuthHeaders()
          },
          body: JSON.stringify({
            mapping_type: updates.mapping_type,
            mapping_url: updates.mapping_url,
            mapping_method: updates.mapping_method,
            ui_element_id: updates.ui_element_id,
            parent_permission: updates.parent_permission,
            display_order: updates.display_order || 0
          })
        }
      );

      if (!response.ok) {
        throw new Error('更新权限映射失败');
      }

      const data = await response.json();
      if (data.success) {
        await fetchMappings();
        await fetchStats();
        setEditingMapping(null);
        setEditForm({});
      } else {
        throw new Error(data.error || '更新权限映射失败');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 开始编辑
  const startEdit = (mapping: PermissionMapping) => {
    setEditingMapping(mapping.code);
    setEditForm({
      mapping_type: mapping.mapping_type,
      mapping_url: mapping.mapping_url,
      mapping_method: mapping.mapping_method,
      ui_element_id: mapping.ui_element_id,
      parent_permission: mapping.parent_permission,
      display_order: mapping.display_order
    });
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingMapping(null);
    setEditForm({});
  };

  // 保存编辑
  const saveEdit = async () => {
    if (!editingMapping) return;
    await updateMapping(editingMapping, editForm);
  };

  // 过滤映射
  const filteredMappings = mappings.filter(mapping => {
    const matchesSearch = !searchTerm || 
      mapping.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      mapping.name.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = !selectedType || mapping.mapping_type === selectedType;
    
    return matchesSearch && matchesType;
  });

  useEffect(() => {
    fetchMappings();
    fetchStats();
  }, [selectedType]);

  return (
    <div className="space-y-6">
      {/* 页面标题和统计 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">权限映射管理</h2>
            <p className="text-gray-600 mt-1">管理权限与UI元素、API端点的映射关系</p>
          </div>
          <button
            onClick={() => {
              fetchMappings();
              fetchStats();
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            刷新数据
          </button>
        </div>

        {/* 统计卡片 */}
        {stats.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {stats.map((stat) => (
              <div key={stat.mapping_type} className="bg-gray-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-gray-900">{stat.count}</div>
                <div className="text-sm text-gray-600">{stat.description}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 搜索和过滤 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="搜索权限代码或名称..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="md:w-48">
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">所有类型</option>
              {MAPPING_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {/* 权限映射列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            权限映射列表 ({filteredMappings.length})
          </h3>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-gray-600">加载中...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    权限信息
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    映射类型
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    映射配置
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    显示顺序
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredMappings.map((mapping) => (
                  <tr key={mapping.code} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {mapping.name}
                        </div>
                        <div className="text-sm text-gray-500">
                          {mapping.code}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {mapping.category} • {mapping.scope}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {editingMapping === mapping.code ? (
                        <select
                          value={editForm.mapping_type || ''}
                          onChange={(e) => setEditForm({
                            ...editForm,
                            mapping_type: e.target.value || undefined
                          })}
                          className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                        >
                          <option value="">未设置</option>
                          {MAPPING_TYPES.map((type) => (
                            <option key={type.value} value={type.value}>
                              {type.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          mapping.mapping_type
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {mapping.mapping_type 
                            ? MAPPING_TYPES.find(t => t.value === mapping.mapping_type)?.label || mapping.mapping_type
                            : '未设置'
                          }
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingMapping === mapping.code ? (
                        <div className="space-y-2">
                          {editForm.mapping_type === 'api' && (
                            <>
                              <input
                                type="text"
                                placeholder="API URL"
                                value={editForm.mapping_url || ''}
                                onChange={(e) => setEditForm({
                                  ...editForm,
                                  mapping_url: e.target.value || undefined
                                })}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              />
                              <select
                                value={editForm.mapping_method || ''}
                                onChange={(e) => setEditForm({
                                  ...editForm,
                                  mapping_method: e.target.value || undefined
                                })}
                                className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                              >
                                <option value="">选择方法</option>
                                {HTTP_METHODS.map((method) => (
                                  <option key={method} value={method}>
                                    {method}
                                  </option>
                                ))}
                              </select>
                            </>
                          )}
                          {(editForm.mapping_type === 'menu' || editForm.mapping_type === 'button') && (
                            <input
                              type="text"
                              placeholder="UI元素ID"
                              value={editForm.ui_element_id || ''}
                              onChange={(e) => setEditForm({
                                ...editForm,
                                ui_element_id: e.target.value || undefined
                              })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          )}
                          {(editForm.mapping_type === 'page' || editForm.mapping_type === 'feature') && (
                            <input
                              type="text"
                              placeholder="页面URL"
                              value={editForm.mapping_url || ''}
                              onChange={(e) => setEditForm({
                                ...editForm,
                                mapping_url: e.target.value || undefined
                              })}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-sm"
                            />
                          )}
                        </div>
                      ) : (
                        <div className="text-sm text-gray-900">
                          {mapping.mapping_type === 'api' && (
                            <div>
                              <div className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                                {mapping.mapping_method} {mapping.mapping_url}
                              </div>
                            </div>
                          )}
                          {(mapping.mapping_type === 'menu' || mapping.mapping_type === 'button') && (
                            <div className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                              #{mapping.ui_element_id}
                            </div>
                          )}
                          {(mapping.mapping_type === 'page' || mapping.mapping_type === 'feature') && (
                            <div className="font-mono text-xs bg-gray-100 px-2 py-1 rounded">
                              {mapping.mapping_url}
                            </div>
                          )}
                          {!mapping.mapping_type && (
                            <span className="text-gray-400 text-xs">未配置</span>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingMapping === mapping.code ? (
                        <input
                          type="number"
                          value={editForm.display_order || 0}
                          onChange={(e) => setEditForm({
                            ...editForm,
                            display_order: parseInt(e.target.value) || 0
                          })}
                          className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                        />
                      ) : (
                        <span className="text-sm text-gray-900">
                          {mapping.display_order || 0}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {editingMapping === mapping.code ? (
                        <div className="flex space-x-2">
                          <button
                            onClick={saveEdit}
                            className="text-green-600 hover:text-green-900"
                            title="保存"
                          >
                            <Save className="h-4 w-4" />
                          </button>
                          <button
                            onClick={cancelEdit}
                            className="text-gray-600 hover:text-gray-900"
                            title="取消"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(mapping)}
                          className="text-blue-600 hover:text-blue-900"
                          title="编辑映射"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && filteredMappings.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            没有找到匹配的权限映射
          </div>
        )}
      </div>
    </div>
  );
};

export default PermissionMappingManager;
