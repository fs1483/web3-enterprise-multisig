// =====================================================
import { buildApiUrl, API_ENDPOINTS, getAuthHeaders } from '../config/api';
// Safe角色配置调试工具
// 用于分析角色配置显示问题
// =====================================================

import React, { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';

interface DebugInfo {
  safeId: string;
  rolesAPI: any;
  templatesAPI: any;
  appliedTemplatesAPI: any;
  availableRolesAPI: any;
  customRolesAPI: any;
}

const SafeRoleDebugger: React.FC = () => {
  const { token } = useAuthStore();
  const [safeId, setSafeId] = useState('');
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const debugSafeRoles = async () => {
    if (!safeId.trim()) {
      setError('请输入Safe ID');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const baseURL = import.meta.env.VITE_API_BASE_URL || buildApiUrl('');
      const headers = {
        'Authorization': `Bearer ${token}`,
        ...getAuthHeaders()
      };

      // 1. 获取Safe的角色配置（旧API）
      const rolesResponse = await fetch(`${baseURL}/api/v1/safes/${safeId}/roles`, { headers });
      const rolesData = rolesResponse.ok ? await rolesResponse.json() : { error: await rolesResponse.text() };

      // 2. 获取所有权限模板
      const templatesResponse = await fetch(`${baseURL}/api/v1/role-templates?category=safe`, { headers });
      const templatesData = templatesResponse.ok ? await templatesResponse.json() : { error: await templatesResponse.text() };

      // 3. 获取应用到该Safe的模板（正确的API）
      const appliedTemplatesResponse = await fetch(`${baseURL}/api/v1/safes/${safeId}/role-templates`, { headers });
      const appliedTemplatesData = appliedTemplatesResponse.ok ? await appliedTemplatesResponse.json() : { error: await appliedTemplatesResponse.text() };

      // 4. 获取统一的可用角色API（包括权限模板和自定义角色）
      const availableRolesResponse = await fetch(`${baseURL}/api/v1/safes/${safeId}/available-roles`, { headers });
      const availableRolesData = availableRolesResponse.ok ? await availableRolesResponse.json() : { error: await availableRolesResponse.text() };

      // 5. 获取自定义角色API
      const customRolesResponse = await fetch(`${baseURL}/api/v1/safes/${safeId}/custom-roles`, { headers });
      const customRolesData = customRolesResponse.ok ? await customRolesResponse.json() : { error: await customRolesResponse.text() };

      setDebugInfo({
        safeId,
        rolesAPI: rolesData,
        templatesAPI: templatesData,
        appliedTemplatesAPI: appliedTemplatesData,
        availableRolesAPI: availableRolesData,
        customRolesAPI: customRolesData
      });

      console.log('🧪 Safe角色调试信息:', {
        safeId,
        rolesAPI: rolesData,
        templatesAPI: templatesData,
        appliedTemplatesAPI: appliedTemplatesData,
        availableRolesAPI: availableRolesData,
        customRolesAPI: customRolesData
      });

    } catch (err) {
      console.error('❌ 调试失败:', err);
      setError(err instanceof Error ? err.message : '调试失败');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed top-4 left-4 z-50 bg-white p-4 rounded-lg shadow-lg border max-w-2xl max-h-96 overflow-y-auto">
      <h3 className="text-sm font-semibold mb-3">🔍 Safe角色配置调试器</h3>
      
      <div className="space-y-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={safeId}
            onChange={(e) => setSafeId(e.target.value)}
            placeholder="输入Safe ID"
            className="flex-1 px-2 py-1 text-xs border rounded"
          />
          <button
            onClick={debugSafeRoles}
            disabled={loading}
            className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
          >
            {loading ? '调试中...' : '开始调试'}
          </button>
        </div>

        {error && (
          <div className="p-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            {error}
          </div>
        )}

        {debugInfo && (
          <div className="space-y-3 text-xs">
            <div className="p-2 bg-blue-50 border border-blue-200 rounded">
              <strong>Safe ID:</strong> {debugInfo.safeId}
            </div>

            <div className="p-2 bg-gray-50 border border-gray-200 rounded">
              <strong>1. 角色配置API (/safes/{debugInfo.safeId}/roles):</strong>
              <pre className="mt-1 text-xs overflow-x-auto">
                {JSON.stringify(debugInfo.rolesAPI, null, 2)}
              </pre>
            </div>

            <div className="p-2 bg-green-50 border border-green-200 rounded">
              <strong>2. 权限模板API (/role-templates?category=safe):</strong>
              <pre className="mt-1 text-xs overflow-x-auto">
                {JSON.stringify(debugInfo.templatesAPI, null, 2)}
              </pre>
            </div>

            <div className="p-2 bg-yellow-50 border border-yellow-200 rounded">
              <strong>3. 应用模板API (/safes/{debugInfo.safeId}/role-templates):</strong>
              <pre className="mt-1 text-xs overflow-x-auto">
                {JSON.stringify(debugInfo.appliedTemplatesAPI, null, 2)}
              </pre>
            </div>

            {/* 分析结果 */}
            <div className="p-2 bg-purple-50 border border-purple-200 rounded">
              <strong>📊 分析结果:</strong>
              <div className="mt-1 space-y-1">
                {(() => {
                  const roles = debugInfo.rolesAPI?.roles || debugInfo.rolesAPI?.data?.roles || [];
                  const templates = debugInfo.templatesAPI?.templates || debugInfo.templatesAPI?.data?.templates || [];
                  const appliedTemplates = debugInfo.appliedTemplatesAPI?.templates || debugInfo.appliedTemplatesAPI?.data?.templates || [];
                  
                  return (
                    <>
                      <div>• 旧API角色数量: {Array.isArray(roles) ? roles.length : 0}</div>
                      <div>• 可用权限模板数量: {Array.isArray(templates) ? templates.length : 0}</div>
                      <div>• 应用到Safe的模板数量: {Array.isArray(appliedTemplates) ? appliedTemplates.length : 0}</div>
                      <div>• 应用模板API状态: {debugInfo.appliedTemplatesAPI.error ? '❌ 失败' : '✅ 成功'}</div>
                      {Array.isArray(appliedTemplates) && appliedTemplates.length > 0 && (
                        <div className="mt-2 p-2 bg-green-100 rounded">
                          <strong>✅ 找到问题！</strong> Safe有 {appliedTemplates.length} 个应用的模板，但角色配置页面可能使用了错误的API端点。
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SafeRoleDebugger;
