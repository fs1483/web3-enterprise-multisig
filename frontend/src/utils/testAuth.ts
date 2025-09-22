// 测试认证功能的工具
import { buildApiUrl, API_ENDPOINTS, getAuthHeaders } from '../config/api';
export const testAuthFlow = async () => {
  console.log('=== 开始测试认证流程 ===');
  
  // 1. 清除现有认证状态
  localStorage.removeItem('token');
  localStorage.removeItem('auth-storage');
  console.log('已清除现有认证状态');
  
  // 2. 测试注册/登录
  try {
    const registerResponse = await fetch('buildApiUrl(API_ENDPOINTS.AUTH.REGISTER)', {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        name: 'Test User',
        username: 'testuser',
        email: 'testuser@example.com',
        password: 'testpass123'
      }),
    });

    if (registerResponse.ok) {
      const data = await registerResponse.json();
      console.log('注册成功:', data);
      
      // 设置认证状态
      localStorage.setItem('token', data.token);
      
      const authData = {
        state: {
          user: {
            id: data.user.id,
            email: data.user.email,
            name: data.user.username,
            role: 'member',
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          },
          token: data.token,
          isAuthenticated: true
        },
        version: 0
      };
      
      localStorage.setItem('auth-storage', JSON.stringify(authData));
      console.log('已设置认证状态到localStorage');
      
      return data.token;
    } else {
      // 如果注册失败，尝试登录
      const loginResponse = await fetch('buildApiUrl(API_ENDPOINTS.AUTH.LOGIN)', {
        method: 'POST',
        headers: {
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          email: 'admin@example.com',
          password: 'admin123'
        }),
      });
      
      if (loginResponse.ok) {
        const data = await loginResponse.json();
        console.log('登录成功:', data);
        
        // 设置认证状态
        localStorage.setItem('token', data.token);
        
        const authData = {
          state: {
            user: {
              id: data.user.id,
              email: data.user.email,
              name: data.user.username,
              role: 'member',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString()
            },
            token: data.token,
            isAuthenticated: true
          },
          version: 0
        };
        
        localStorage.setItem('auth-storage', JSON.stringify(authData));
        console.log('已设置认证状态到localStorage');
        
        return data.token;
      }
    }
  } catch (error) {
    console.error('认证流程失败:', error);
  }
  
  return null;
};

// 测试API调用
export const testApiCall = async (token: string) => {
  console.log('=== 测试API调用 ===');
  
  try {
    const response = await fetch('buildApiUrl(API_ENDPOINTS.PERMISSIONS.DEFINITIONS)', {
      method: 'GET',
      headers: {
        ...getAuthHeaders(),
        'Authorization': `Bearer ${token}`
      }
    });
    
    if (response.ok) {
      const data = await response.json();
      console.log('API调用成功:', data);
      return true;
    } else {
      console.error('API调用失败:', response.status, response.statusText);
      return false;
    }
  } catch (error) {
    console.error('API调用异常:', error);
    return false;
  }
};

// 完整测试流程
export const runFullTest = async () => {
  const token = await testAuthFlow();
  if (token) {
    await testApiCall(token);
    console.log('=== 测试完成，请刷新页面查看效果 ===');
  } else {
    console.error('认证失败，无法继续测试');
  }
};
