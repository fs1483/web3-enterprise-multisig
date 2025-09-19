// 调试认证状态的工具函数
export const debugAuthState = () => {
  console.log('=== 认证状态调试 ===');
  
  // 检查localStorage中的token
  const directToken = localStorage.getItem('token');
  console.log('直接token:', directToken);
  
  // 检查Zustand persist存储
  const authStorage = localStorage.getItem('auth-storage');
  console.log('auth-storage原始数据:', authStorage);
  
  if (authStorage) {
    try {
      const parsed = JSON.parse(authStorage);
      console.log('解析后的auth-storage:', parsed);
      console.log('state中的token:', parsed.state?.token);
      console.log('state中的isAuthenticated:', parsed.state?.isAuthenticated);
      console.log('state中的user:', parsed.state?.user);
    } catch (error) {
      console.error('解析auth-storage失败:', error);
    }
  }
  
  // 检查所有localStorage键
  console.log('所有localStorage键:', Object.keys(localStorage));
  
  return {
    directToken,
    authStorage: authStorage ? JSON.parse(authStorage) : null
  };
};

// 设置测试用户认证状态
export const setTestAuth = () => {
  const testAuthData = {
    state: {
      user: {
        id: "f68ee291-dd3f-4acb-8ba6-03888bc8b84a",
        email: "admin@example.com",
        name: "Admin User",
        role: "member",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      },
      token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VyX2lkIjoiZjY4ZWUyOTEtZGQzZi00YWNiLThiYTYtMDM4ODhiYzhiODRhIiwidXNlcm5hbWUiOiJhZG1pbkBleGFtcGxlLmNvbSIsInJvbGUiOiJ1c2VyIiwiaXNzIjoibXVsdGlzaWctYXBpIiwiZXhwIjoxNzU4MTI4MDY5LCJpYXQiOjE3NTgwNDE2Njl9.Mpc6n4Pn0cHiSWCWVO7EmNtulYbR9sKxuv2li9jcRuA",
      isAuthenticated: true
    },
    version: 0
  };
  
  localStorage.setItem('auth-storage', JSON.stringify(testAuthData));
  localStorage.setItem('token', testAuthData.state.token);
  
  console.log('已设置测试认证状态');
  return testAuthData;
};
