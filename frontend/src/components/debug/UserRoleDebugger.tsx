import React from 'react';
import { useAuthStore } from '../../stores/authStore';
import { usePermissions } from '../../hooks/usePermissions';

const UserRoleDebugger: React.FC = () => {
  const { user, token } = useAuthStore();
  const { hasMenuPermission, loading } = usePermissions();

  return (
    <div className="fixed top-4 right-4 bg-white p-4 border border-red-500 rounded-lg shadow-lg z-50 max-w-md">
      <h3 className="font-bold text-red-600 mb-2">用户角色调试</h3>
      
      <div className="space-y-2 text-sm">
        <div>
          <strong>用户数据:</strong>
          <pre className="bg-gray-100 p-2 rounded text-xs overflow-x-auto">
            {JSON.stringify(user, null, 2)}
          </pre>
        </div>
        
        <div>
          <strong>Token存在:</strong> {token ? '✅ 是' : '❌ 否'}
        </div>
        
        <div>
          <strong>权限加载中:</strong> {loading ? '⏳ 是' : '✅ 否'}
        </div>
        
        <div>
          <strong>用户角色:</strong> {user?.role || '未知'}
        </div>
        
        <div>
          <strong>是否为管理员:</strong> {
            user?.role === 'admin' || user?.role === 'super_admin' ? '✅ 是' : '❌ 否'
          }
        </div>
        
        <div>
          <strong>Settings菜单权限:</strong> {
            hasMenuPermission('system.menu.settings') ? '✅ 有权限' : '❌ 无权限'
          }
        </div>
        
        <div className="mt-2 p-2 bg-yellow-50 rounded">
          <strong>调试信息:</strong>
          <div>user存在: {user ? '是' : '否'}</div>
          <div>user.role: {user?.role}</div>
          <div>检查条件: user.role === 'super_admin' || user.role === 'admin'</div>
          <div>结果: {user?.role === 'super_admin' || user?.role === 'admin' ? '通过' : '不通过'}</div>
        </div>
      </div>
    </div>
  );
};

export default UserRoleDebugger;
