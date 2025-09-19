import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { usePermissions } from '../../hooks/usePermissions';

const PermissionDebugger: React.FC = () => {
  const { token, user } = useAuthStore();
  const { permissions, hasMenuPermission, loading } = usePermissions();
  const [debugInfo, setDebugInfo] = useState<any>(null);

  const debugPermissions = async () => {
    if (!token) return;

    try {
      // 1. 获取用户权限映射
      const mappingsResponse = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/permission-mappings/user`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const mappingsData = mappingsResponse.ok ? await mappingsResponse.json() : { error: await mappingsResponse.text() };

      // 2. 获取用户权限列表
      const userPermissionsResponse = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/users/${user?.id}/permissions`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const userPermissionsData = userPermissionsResponse.ok ? await userPermissionsResponse.json() : { error: await userPermissionsResponse.text() };

      // 3. 获取权限定义
      const definitionsResponse = await fetch(
        `${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/permissions/definitions?scope=system`,
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }
      );
      const definitionsData = definitionsResponse.ok ? await definitionsResponse.json() : { error: await definitionsResponse.text() };

      setDebugInfo({
        user: user,
        mappings: mappingsData,
        userPermissions: userPermissionsData,
        definitions: definitionsData,
        hookPermissions: permissions,
        hasSettingsMenu: hasMenuPermission('system.menu.settings')
      });

    } catch (error) {
      console.error('权限调试失败:', error);
      setDebugInfo({ error: error instanceof Error ? error.message : String(error) });
    }
  };

  useEffect(() => {
    if (user && token && !loading) {
      debugPermissions();
    }
  }, [user, token, loading]);

  if (loading) {
    return <div>加载权限信息中...</div>;
  }

  return (
    <div className="p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4">权限调试工具</h2>
      
      <div className="space-y-4">
        <div className="p-4 bg-blue-50 rounded">
          <h3 className="font-semibold text-blue-800">用户信息</h3>
          <pre className="text-sm mt-2 overflow-x-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>

        <div className="p-4 bg-green-50 rounded">
          <h3 className="font-semibold text-green-800">Settings菜单权限检查</h3>
          <div className="mt-2">
            <p>用户角色: {user?.role}</p>
            <p>是否为管理员: {user?.role === 'admin' || user?.role === 'super_admin' ? '是' : '否'}</p>
            <p>hasMenuPermission('system.menu.settings'): {hasMenuPermission('system.menu.settings') ? '✅ 有权限' : '❌ 无权限'}</p>
          </div>
        </div>

        {debugInfo && (
          <>
            <div className="p-4 bg-yellow-50 rounded">
              <h3 className="font-semibold text-yellow-800">权限映射API响应</h3>
              <pre className="text-xs mt-2 overflow-x-auto max-h-40">
                {JSON.stringify(debugInfo.mappings, null, 2)}
              </pre>
            </div>

            <div className="p-4 bg-purple-50 rounded">
              <h3 className="font-semibold text-purple-800">用户权限API响应</h3>
              <pre className="text-xs mt-2 overflow-x-auto max-h-40">
                {JSON.stringify(debugInfo.userPermissions, null, 2)}
              </pre>
            </div>

            <div className="p-4 bg-gray-50 rounded">
              <h3 className="font-semibold text-gray-800">权限定义API响应</h3>
              <pre className="text-xs mt-2 overflow-x-auto max-h-40">
                {JSON.stringify(debugInfo.definitions, null, 2)}
              </pre>
            </div>

            <div className="p-4 bg-indigo-50 rounded">
              <h3 className="font-semibold text-indigo-800">Hook中的权限数据</h3>
              <pre className="text-xs mt-2 overflow-x-auto max-h-40">
                {JSON.stringify(debugInfo.hookPermissions, null, 2)}
              </pre>
            </div>
          </>
        )}
      </div>

      <button 
        onClick={debugPermissions}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
      >
        重新调试权限
      </button>
    </div>
  );
};

export default PermissionDebugger;
