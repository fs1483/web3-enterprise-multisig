import React, { useState, useEffect } from 'react';
import { buildApiUrl, API_ENDPOINTS, getAuthHeaders } from '../../config/api';
import { Plus, Search, Edit, Trash2, ChevronLeft, ChevronRight, ToggleLeft, ToggleRight } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';

interface PermissionDefinition {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  scope: string;
  is_system: boolean;
  is_active: boolean;
  mapping_type?: string;
  mapping_url?: string;
  mapping_method?: string;
  ui_element_id?: string;
  parent_permission?: string;
  display_order?: number;
  created_at: string;
  updated_at: string;
}

interface PaginationInfo {
  current_page: number;
  total_pages: number;
  total_count: number;
  page_size: number;
}

interface PermissionDefinitionRequest {
  code: string;
  name: string;
  description: string;
  category: string;
  scope: string;
  // 权限映射字段
  mapping_type?: string;
  mapping_url?: string;
  mapping_method?: string;
  ui_element_id?: string;
  parent_permission?: string;
  display_order?: number;
}


export const PermissionDefinitions: React.FC = () => {
  const { token } = useAuthStore();
  const [permissions, setPermissions] = useState<PermissionDefinition[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // 分页相关状态
  const [pagination, setPagination] = useState<PaginationInfo>({
    current_page: 1,
    total_pages: 1,
    total_count: 0,
    page_size: 10
  });

  // 搜索和筛选状态
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [scopeFilter, setScopeFilter] = useState('');
  const [editingPermission, setEditingPermission] = useState<PermissionDefinition | null>(null);

  const [formData, setFormData] = useState<PermissionDefinitionRequest>({
    code: '',
    name: '',
    description: '',
    category: '',
    scope: 'system',
    mapping_type: '',
    mapping_url: '',
    mapping_method: '',
    ui_element_id: '',
    parent_permission: '',
    display_order: 0
  });

  // 获取权限定义列表
  const fetchPermissions = async (page = 1) => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pagination.page_size.toString(),
        sort: 'created_at',
        order: 'desc'
      });
      
      if (searchTerm) params.append('search', searchTerm);
      if (categoryFilter) params.append('category', categoryFilter);
      if (scopeFilter) params.append('scope', scopeFilter);

      const apiUrl = `${import.meta.env.VITE_API_BASE_URL || buildApiUrl('')}/api/v1/permissions/definitions?${params}`;
      console.log('Fetching permissions from:', apiUrl);

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...getAuthHeaders()
        }
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('未授权访问，请检查登录状态');
        } else if (response.status === 404) {
          throw new Error('API接口不存在，请检查后端服务');
        } else {
          throw new Error(`请求失败: ${response.status} ${response.statusText}`);
        }
      }

      const data = await response.json();
      console.log('API response:', data);
      
      if (data.success) {
        // 后端返回的数据结构：data.data.definitions
        const permissionsData = Array.isArray(data.data?.definitions) ? data.data.definitions : [];
        console.log('Permissions data:', permissionsData);
        setPermissions(permissionsData);
        
        // 后端返回的分页结构：data.data.pagination
        const paginationData = data.data?.pagination || {};
        setPagination({
          current_page: paginationData.page || page,
          total_pages: paginationData.total_pages || 1,
          total_count: paginationData.total || 0,
          page_size: paginationData.page_size || 10
        });
      } else {
        throw new Error(data.error || '获取权限定义失败');
      }
    } catch (err: any) {
      console.error('Fetch permissions error:', err);
      setError(err.message);
      // 临时使用模拟数据
      setPermissions([]);
      setPagination({
        current_page: 1,
        total_pages: 1,
        total_count: 0,
        page_size: 10
      });
    } finally {
      setLoading(false);
    }
  };


  // 获取权限分类
  const fetchCategories = async () => {
    try {
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL || buildApiUrl('')}/api/v1/permissions/categories`;
      console.log('Fetching categories from:', apiUrl);

      const response = await fetch(apiUrl, {
        headers: {
          'Authorization': `Bearer ${token}`,
          ...getAuthHeaders()
        }
      });

      console.log('Categories response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('Categories response:', data);
        if (data.success) {
          // 后端返回的数据结构：data.data.categories
          const categoriesData = Array.isArray(data.data?.categories) ? data.data.categories : [];
          setCategories(categoriesData);
        }
      } else {
        console.warn('获取权限分类失败:', response.status, response.statusText);
        // 使用默认分类
        setCategories(['system', 'safe', 'proposal', 'member', 'policy']);
      }
    } catch (err) {
      console.error('获取权限分类失败:', err);
      // 使用默认分类
      setCategories(['system', 'safe', 'proposal', 'member', 'policy']);
    }
  };

  // 创建权限定义
  const createPermission = async () => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || buildApiUrl('')}/api/v1/permissions/definitions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            ...getAuthHeaders()
          },
          body: JSON.stringify(formData)
        }
      );

      if (!response.ok) {
        throw new Error('创建权限定义失败');
      }

      const data = await response.json();
      if (data.success) {
        setFormData({
          code: '',
          name: '',
          description: '',
          category: '',
          scope: 'system',
          mapping_type: '',
          mapping_url: '',
          mapping_method: '',
          ui_element_id: '',
          parent_permission: '',
          display_order: 0
        });
        setShowCreateModal(false);
        fetchPermissions();
      } else {
        throw new Error(data.error || '创建权限定义失败');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 更新权限定义
  const updatePermission = async () => {
    if (!editingPermission) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || buildApiUrl('')}/api/v1/permissions/definitions/${editingPermission.id}`,
        {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${token}`,
            ...getAuthHeaders()
          },
          body: JSON.stringify(formData)
        }
      );

      if (!response.ok) {
        throw new Error('更新权限定义失败');
      }

      const data = await response.json();
      if (data.success) {
        setEditingPermission(null);
        setFormData({
          code: '',
          name: '',
          description: '',
          category: '',
          scope: 'system',
          mapping_type: '',
          mapping_url: '',
          mapping_method: '',
          ui_element_id: '',
          parent_permission: '',
          display_order: 0
        });
        fetchPermissions();
      } else {
        throw new Error(data.error || '更新权限定义失败');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 删除权限定义
  const deletePermission = async (id: string) => {
    if (!confirm('确定要删除这个权限定义吗？')) return;

    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || buildApiUrl('')}/api/v1/permissions/definitions/${id}`,
        {
          method: 'DELETE',
          headers: {
            'Authorization': `Bearer ${token}`,
            ...getAuthHeaders()
          }
        }
      );

      if (!response.ok) {
        throw new Error('删除权限定义失败');
      }

      const data = await response.json();
      if (data.success) {
        fetchPermissions();
      } else {
        throw new Error(data.error || '删除权限定义失败');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 切换权限状态
  const togglePermission = async (id: string) => {
    try {
      const response = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || buildApiUrl('')}/api/v1/permissions/definitions/${id}/toggle`,
        {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${token}`,
            ...getAuthHeaders()
          }
        }
      );

      if (!response.ok) {
        throw new Error('切换权限状态失败');
      }

      const data = await response.json();
      if (data.success) {
        fetchPermissions();
      } else {
        throw new Error(data.error || '切换权限状态失败');
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  // 开始编辑
  const startEdit = (permission: PermissionDefinition) => {
    setEditingPermission(permission);
    setFormData({
      code: permission.code,
      name: permission.name,
      description: permission.description,
      category: permission.category,
      scope: permission.scope,
      mapping_type: permission.mapping_type || '',
      mapping_url: permission.mapping_url || '',
      mapping_method: permission.mapping_method || '',
      ui_element_id: permission.ui_element_id || '',
      parent_permission: permission.parent_permission || '',
      display_order: permission.display_order || 0
    });
  };

  // 取消编辑
  const cancelEdit = () => {
    setEditingPermission(null);
    setFormData({
      code: '',
      name: '',
      description: '',
      category: '',
      scope: 'system',
      mapping_type: '',
      mapping_url: '',
      mapping_method: '',
      ui_element_id: '',
      parent_permission: '',
      display_order: 0
    });
  };

  // 应用过滤器
  const applyFilters = () => {
    // 直接调用fetchPermissions，它会使用当前的搜索和筛选状态
    fetchPermissions(1);
  };

  // 获取范围显示名称
  const getScopeDisplayName = (scope: string) => {
    const scopeNames: Record<string, string> = {
      system: '系统级',
      safe: 'Safe级',
      operation: '操作级'
    };
    return scopeNames[scope] || scope;
  };

  // 过滤后的权限列表
  const filteredPermissions = Array.isArray(permissions) ? permissions.filter(permission => {
    const matchesSearch = !searchTerm || 
      permission.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      permission.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !categoryFilter || permission.category === categoryFilter;
    const matchesScope = !scopeFilter || permission.scope === scopeFilter;
    
    return matchesSearch && matchesCategory && matchesScope;
  }) : [];

  // 初始化数据
  useEffect(() => {
    fetchCategories();
    fetchPermissions(1);
  }, []);

  // 当搜索或筛选条件变化时重新获取数据
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      fetchPermissions(1);
    }, 500);
    
    return () => clearTimeout(timeoutId);
  }, [searchTerm, categoryFilter, scopeFilter]);

  // 渲染表单模态框
  const renderFormModal = () => {
    const isEditing = !!editingPermission;
    
    if (!showCreateModal && !isEditing) return null;

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
        <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
          <h3 className="text-lg font-medium mb-4">
            {isEditing ? '编辑权限定义' : '创建权限定义'}
          </h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                权限代码
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例如: safe.proposal.create"
                disabled={isEditing}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                权限名称
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="例如: 创建提案"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                权限描述
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                rows={3}
                placeholder="描述这个权限的作用..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                权限分类
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                required
              >
                <option value="">请选择权限分类</option>
                <option value="system">系统管理</option>
                <option value="safe">Safe管理</option>
                <option value="proposal">提案管理</option>
                <option value="member">成员管理</option>
                <option value="policy">策略管理</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                权限范围
              </label>
              <select
                value={formData.scope}
                onChange={(e) => setFormData({ ...formData, scope: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="system">系统级</option>
                <option value="safe">Safe级</option>
                <option value="operation">操作级</option>
              </select>
            </div>

            {/* 权限映射字段 */}
            <div className="border-t pt-4 mt-4">
              <h4 className="text-sm font-medium text-gray-900 mb-3">权限映射配置</h4>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    映射类型
                  </label>
                  <select
                    value={formData.mapping_type || ''}
                    onChange={(e) => setFormData({ ...formData, mapping_type: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">未设置</option>
                    <option value="menu">导航菜单</option>
                    <option value="button">操作按钮</option>
                    <option value="api">API接口</option>
                    <option value="page">页面访问</option>
                    <option value="feature">功能模块</option>
                  </select>
                </div>

                {formData.mapping_type === 'api' && (
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        API URL
                      </label>
                      <input
                        type="text"
                        value={formData.mapping_url || ''}
                        onChange={(e) => setFormData({ ...formData, mapping_url: e.target.value || undefined })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="例如: /api/v1/proposals"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        HTTP方法
                      </label>
                      <select
                        value={formData.mapping_method || ''}
                        onChange={(e) => setFormData({ ...formData, mapping_method: e.target.value || undefined })}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="">选择方法</option>
                        <option value="GET">GET</option>
                        <option value="POST">POST</option>
                        <option value="PUT">PUT</option>
                        <option value="DELETE">DELETE</option>
                        <option value="PATCH">PATCH</option>
                      </select>
                    </div>
                  </>
                )}

                {(formData.mapping_type === 'menu' || formData.mapping_type === 'button') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      UI元素ID
                    </label>
                    <input
                      type="text"
                      value={formData.ui_element_id || ''}
                      onChange={(e) => setFormData({ ...formData, ui_element_id: e.target.value || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="例如: create-proposal-btn"
                    />
                  </div>
                )}

                {(formData.mapping_type === 'page' || formData.mapping_type === 'feature') && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      页面URL
                    </label>
                    <input
                      type="text"
                      value={formData.mapping_url || ''}
                      onChange={(e) => setFormData({ ...formData, mapping_url: e.target.value || undefined })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="例如: /proposals"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    父权限
                  </label>
                  <input
                    type="text"
                    value={formData.parent_permission || ''}
                    onChange={(e) => setFormData({ ...formData, parent_permission: e.target.value || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="例如: system.admin"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    显示顺序
                  </label>
                  <input
                    type="number"
                    value={formData.display_order || 0}
                    onChange={(e) => setFormData({ ...formData, display_order: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>
          </div>
          
          <div className="flex justify-end space-x-3 mt-6">
            <button
              onClick={() => {
                setShowCreateModal(false);
                cancelEdit();
              }}
              className="px-4 py-2 text-gray-600 border border-gray-300 hover:bg-gray-50 rounded-md transition-colors"
            >
              取消
            </button>
            <button
              onClick={isEditing ? updatePermission : createPermission}
              className="px-4 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-md transition-colors"
              disabled={!formData.code || !formData.name || !formData.category}
            >
              {isEditing ? '更新' : '创建'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* 页面标题和操作 */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">权限定义管理</h2>
            <p className="text-gray-600 mt-1">管理系统中所有权限的基本信息和配置</p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <Plus className="h-4 w-4 mr-2" />
            创建权限
          </button>
        </div>

        {/* 搜索和过滤 */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">搜索</label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="搜索权限代码、名称或描述"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">分类</label>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有分类</option>
              {categories.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">范围</label>
            <select
              value={scopeFilter}
              onChange={(e) => setScopeFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">所有范围</option>
              <option value="system">系统级</option>
              <option value="safe">Safe级</option>
              <option value="operation">操作级</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={applyFilters}
              className="w-full px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
            >
              应用过滤器
            </button>
          </div>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {/* 权限列表 */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">
            权限列表 ({filteredPermissions.length})
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
                    分类/范围
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    权限映射
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    状态
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    创建时间
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPermissions.map((permission) => (
                  <tr key={permission.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <div className="text-sm font-medium text-gray-900">
                          {permission.name}
                        </div>
                        <div className="text-sm text-gray-500 font-mono">
                          {permission.code}
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          {permission.description}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {permission.category}
                        </span>
                        <div className="text-sm text-gray-500 mt-1">
                          {getScopeDisplayName(permission.scope)}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        {permission.mapping_type ? (
                          <>
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              permission.mapping_type === 'menu' ? 'bg-green-100 text-green-800' :
                              permission.mapping_type === 'button' ? 'bg-yellow-100 text-yellow-800' :
                              permission.mapping_type === 'api' ? 'bg-purple-100 text-purple-800' :
                              permission.mapping_type === 'page' ? 'bg-indigo-100 text-indigo-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {permission.mapping_type === 'menu' ? '导航菜单' :
                               permission.mapping_type === 'button' ? '操作按钮' :
                               permission.mapping_type === 'api' ? 'API接口' :
                               permission.mapping_type === 'page' ? '页面访问' :
                               permission.mapping_type === 'feature' ? '功能模块' :
                               permission.mapping_type}
                            </span>
                            <div className="text-xs text-gray-500 mt-1 font-mono">
                              {permission.mapping_type === 'api' && permission.mapping_url && (
                                <span>{permission.mapping_method} {permission.mapping_url}</span>
                              )}
                              {(permission.mapping_type === 'menu' || permission.mapping_type === 'button') && permission.ui_element_id && (
                                <span>#{permission.ui_element_id}</span>
                              )}
                              {(permission.mapping_type === 'page' || permission.mapping_type === 'feature') && permission.mapping_url && (
                                <span>{permission.mapping_url}</span>
                              )}
                            </div>
                          </>
                        ) : (
                          <span className="text-xs text-gray-400">未配置映射</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => togglePermission(permission.id)}
                          className="text-gray-400 hover:text-gray-600"
                        >
                          {permission.is_active ? (
                            <ToggleRight className="h-5 w-5 text-green-500" />
                          ) : (
                            <ToggleLeft className="h-5 w-5 text-gray-400" />
                          )}
                        </button>
                        <span className={`text-sm ${permission.is_active ? 'text-green-600' : 'text-gray-400'}`}>
                          {permission.is_active ? '启用' : '禁用'}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {new Date(permission.created_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => startEdit(permission)}
                          className="text-blue-600 hover:text-blue-900"
                          title="编辑"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        {!permission.is_system && (
                          <button
                            onClick={() => deletePermission(permission.id)}
                            className="text-red-600 hover:text-red-900"
                            title="删除"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!loading && permissions.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            没有找到匹配的权限定义
          </div>
        )}

        {/* 分页控件 */}
        {pagination.total_pages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200">
            <div className="text-sm text-gray-700">
              显示 {((pagination.current_page - 1) * pagination.page_size) + 1} 到{' '}
              {Math.min(pagination.current_page * pagination.page_size, pagination.total_count)} 条，
              共 {pagination.total_count} 条记录
            </div>
            <div className="flex items-center space-x-2">
              <button
                onClick={() => fetchPermissions(pagination.current_page - 1)}
                disabled={pagination.current_page <= 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm text-gray-700">
                第 {pagination.current_page} 页，共 {pagination.total_pages} 页
              </span>
              <button
                onClick={() => fetchPermissions(pagination.current_page + 1)}
                disabled={pagination.current_page >= pagination.total_pages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {renderFormModal()}
    </div>
  );
};

export default PermissionDefinitions;
