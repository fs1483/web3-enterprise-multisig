// =====================================================
import { buildApiUrl, API_ENDPOINTS, getAuthHeaders } from '../config/api';
// API 客户端
// 版本: v2.0
// 功能: 提供统一的API调用接口
// 作者: sfan
// 创建时间: 2024-02-08
// =====================================================

interface ApiResponse<T = any> {
  data: T;
  message?: string;
  success?: boolean;
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL: string = `${buildApiUrl('')}/api/v1`) {
    this.baseURL = baseURL;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const defaultHeaders: Record<string, string> = {
      ...getAuthHeaders(),
    };

    // 获取token的逻辑
    let token = this.getToken();
    
    console.log('API请求调试:', {
      url,
      endpoint,
      hasToken: !!token,
      tokenPreview: token ? `${token.substring(0, 20)}...` : 'null'
    });
    
    if (token) {
      defaultHeaders['Authorization'] = `Bearer ${token}`;
    } else {
      console.warn('API请求缺少token:', url);
    }

    const config: RequestInit = {
      ...options,
      headers: {
        ...defaultHeaders,
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      
      if (!response.ok) {
        console.error('API请求失败:', {
          url,
          status: response.status,
          statusText: response.statusText,
          hasToken: !!token
        });
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  private getToken(): string | null {
    // 1. 首先尝试直接从localStorage获取
    let token = localStorage.getItem('token');
    if (token) {
      console.log('从localStorage获取到token');
      return token;
    }
    
    // 2. 尝试从auth-storage获取token（Zustand persist格式）
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        token = parsed.state?.token || parsed.token;
        if (token) {
          console.log('从auth-storage获取到token');
          return token;
        }
      }
    } catch (error) {
      console.warn('解析auth-storage失败:', error);
    }
    
    // 3. 尝试从Zustand store直接获取
    try {
      // 动态导入避免循环依赖
      const { useAuthStore } = require('../stores/authStore');
      const authState = useAuthStore.getState();
      if (authState?.token) {
        console.log('从Zustand store获取到token');
        return authState.token;
      }
    } catch (error) {
      console.warn('从Zustand store获取token失败:', error);
    }
    
    console.warn('所有token获取方式都失败了');
    return null;
  }

  async get<T>(endpoint: string, params?: Record<string, any>): Promise<ApiResponse<T>> {
    let url = endpoint;
    
    if (params) {
      const searchParams = new URLSearchParams();
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          searchParams.append(key, String(value));
        }
      });
      
      if (searchParams.toString()) {
        url += `?${searchParams.toString()}`;
      }
    }

    return this.request<T>(url, {
      method: 'GET',
    });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'DELETE',
    });
  }
}

export const apiClient = new ApiClient();
export default apiClient;
