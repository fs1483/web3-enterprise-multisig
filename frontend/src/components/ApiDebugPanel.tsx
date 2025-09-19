import React, { useState } from 'react';
import { userService } from '../services/userService';

interface ApiDebugPanelProps {
  safeId?: string;
}

export const ApiDebugPanel: React.FC<ApiDebugPanelProps> = ({ safeId }) => {
  const [debugInfo, setDebugInfo] = useState<any>({});
  const [loading, setLoading] = useState(false);

  const testApiCalls = async () => {
    setLoading(true);
    const results: any = {};

    // 检查认证状态
    const token = localStorage.getItem('token');
    results.hasToken = !!token;
    results.tokenPreview = token ? `${token.substring(0, 20)}...` : 'No token';

    // 测试获取所有用户
    try {
      const allUsers = await userService.getAllUsers({ limit: 5 });
      results.allUsersSuccess = true;
      results.allUsersCount = allUsers.users?.length || 0;
      results.allUsersData = allUsers.users?.slice(0, 2) || [];
    } catch (error) {
      results.allUsersSuccess = false;
      results.allUsersError = error instanceof Error ? error.message : String(error);
      
      // 添加更详细的错误信息
      if (error instanceof Error && error.message.includes('401')) {
        results.allUsersErrorDetail = '认证失败 - token无效或已过期';
      } else if (error instanceof Error && error.message.includes('403')) {
        results.allUsersErrorDetail = '权限不足 - 用户没有访问权限';
      } else if (error instanceof Error && error.message.includes('404')) {
        results.allUsersErrorDetail = 'API端点不存在';
      } else if (error instanceof Error && error.message.includes('500')) {
        results.allUsersErrorDetail = '服务器内部错误';
      }
    }

    // 测试获取Safe可用用户
    if (safeId) {
      try {
        const availableUsers = await userService.getAvailableUsersForSafe(safeId);
        results.availableUsersSuccess = true;
        results.availableUsersCount = availableUsers?.length || 0;
        results.availableUsersData = availableUsers?.slice(0, 2) || [];
      } catch (error) {
        results.availableUsersSuccess = false;
        results.availableUsersError = error instanceof Error ? error.message : String(error);
      }
    }

    setDebugInfo(results);
    setLoading(false);
  };

  const loginWithTestCredentials = async () => {
    // 直接测试不需要认证的端点
    try {
      const response = await fetch('http://localhost:8080/api/v1/users', {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      });
      
      if (response.status === 401) {
        alert('后端需要认证。暂时跳过认证，使用模拟数据。');
        localStorage.removeItem('token');
      } else if (response.ok) {
        alert('API可以直接访问，无需认证token');
        localStorage.removeItem('token');
      } else {
        alert(`API返回状态: ${response.status}`);
      }
    } catch (error) {
      alert('无法连接到后端服务，请确保后端正在运行');
    }
  };

  return (
    <div style={{ 
      position: 'fixed', 
      top: '10px', 
      right: '10px', 
      width: '400px', 
      background: 'white', 
      border: '1px solid #ccc', 
      padding: '15px',
      borderRadius: '8px',
      boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
      zIndex: 9999,
      fontSize: '12px',
      maxHeight: '80vh',
      overflowY: 'auto'
    }}>
      <h3 style={{ margin: '0 0 10px 0', fontSize: '14px' }}>API 调试面板</h3>
      
      <div style={{ marginBottom: '10px' }}>
        <strong>Safe ID:</strong> {safeId || 'Not provided'}
      </div>

      <button 
        onClick={testApiCalls} 
        disabled={loading}
        style={{ 
          marginRight: '10px', 
          padding: '5px 10px',
          background: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        {loading ? '测试中...' : '测试API调用'}
      </button>

      <button 
        onClick={loginWithTestCredentials}
        style={{ 
          padding: '5px 10px',
          background: '#28a745',
          color: 'white',
          border: 'none',
          borderRadius: '4px',
          cursor: 'pointer'
        }}
      >
        设置测试Token
      </button>

      {Object.keys(debugInfo).length > 0 && (
        <div style={{ marginTop: '15px' }}>
          <h4 style={{ margin: '0 0 10px 0', fontSize: '13px' }}>调试结果:</h4>
          <pre style={{ 
            background: '#f8f9fa', 
            padding: '10px', 
            borderRadius: '4px',
            fontSize: '11px',
            overflow: 'auto',
            maxHeight: '300px'
          }}>
            {JSON.stringify(debugInfo, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
};
