// =====================================================
// 用户管理API服务
// 版本: v1.0
// 功能: 提供用户相关的API调用接口
// 作者: Cascade AI
// 创建时间: 2025-09-17
// =====================================================

import { apiClient } from './apiClient';

// =====================================================
// 类型定义
// =====================================================

export interface User {
  id: string;
  username: string;
  email: string;
  wallet_address: string;
  department?: string;
  position?: string;
  status: 'active' | 'inactive' | 'pending';
  created_at: string;
  updated_at: string;
}

export interface UserListResponse {
  users: User[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateUserRequest {
  username: string;
  email: string;
  wallet_address: string;
  department?: string;
  position?: string;
}

export interface UpdateUserRequest {
  username?: string;
  email?: string;
  wallet_address?: string;
  department?: string;
  position?: string;
  status?: 'active' | 'inactive' | 'pending';
}

// =====================================================
// 用户服务类
// =====================================================

class UserService {
  
  /**
   * 获取所有系统用户
   * @param params 查询参数
   * @returns 用户列表
   */
  async getAllUsers(params?: {
    page?: number;
    limit?: number;
    status?: string;
    department?: string;
    search?: string;
  }): Promise<UserListResponse> {
    try {
      const response = await apiClient.get<UserListResponse>('/users', params);
      return response.data;
    } catch (error) {
      console.error('获取用户列表失败:', error);
      throw new Error('获取用户列表失败');
    }
  }

  /**
   * 获取可添加到Safe的用户（排除已存在的成员）
   * @param safeId Safe ID
   * @returns 可用用户列表
   */
  async getAvailableUsersForSafe(safeId: string): Promise<User[]> {
    try {
      const response = await apiClient.get<{ users: User[] }>(`/safes/${safeId}/available-users`);
      return response.data.users;
    } catch (error) {
      console.error('获取可用用户失败:', error);
      throw new Error('获取可用用户失败');
    }
  }

  /**
   * 根据ID获取用户详情
   * @param userId 用户ID
   * @returns 用户详情
   */
  async getUserById(userId: string): Promise<User> {
    try {
      const response = await apiClient.get<{ user: User }>(`/users/${userId}`);
      return response.data.user;
    } catch (error) {
      console.error('获取用户详情失败:', error);
      throw new Error('获取用户详情失败');
    }
  }

  /**
   * 创建新用户
   * @param userData 用户数据
   * @returns 创建的用户
   */
  async createUser(userData: CreateUserRequest): Promise<User> {
    try {
      const response = await apiClient.post<{ user: User }>('/users', userData);
      return response.data.user;
    } catch (error) {
      console.error('创建用户失败:', error);
      throw new Error('创建用户失败');
    }
  }

  /**
   * 更新用户信息
   * @param userId 用户ID
   * @param userData 更新数据
   * @returns 更新后的用户
   */
  async updateUser(userId: string, userData: UpdateUserRequest): Promise<User> {
    try {
      const response = await apiClient.put<{ user: User }>(`/users/${userId}`, userData);
      return response.data.user;
    } catch (error) {
      console.error('更新用户失败:', error);
      throw new Error('更新用户失败');
    }
  }

  /**
   * 删除用户
   * @param userId 用户ID
   */
  async deleteUser(userId: string): Promise<void> {
    try {
      await apiClient.delete(`/users/${userId}`);
    } catch (error) {
      console.error('删除用户失败:', error);
      throw new Error('删除用户失败');
    }
  }

  /**
   * 搜索用户
   * @param query 搜索关键词
   * @param filters 过滤条件
   * @returns 搜索结果
   */
  async searchUsers(query: string, filters?: {
    department?: string;
    status?: string;
    limit?: number;
  }): Promise<User[]> {
    try {
      const params = {
        search: query,
        ...filters
      };
      const response = await apiClient.get<{ users: User[] }>('/users/search', params);
      return response.data.users;
    } catch (error) {
      console.error('搜索用户失败:', error);
      throw new Error('搜索用户失败');
    }
  }

  /**
   * 批量获取用户信息
   * @param userIds 用户ID列表
   * @returns 用户列表
   */
  async getUsersByIds(userIds: string[]): Promise<User[]> {
    try {
      const response = await apiClient.post<{ users: User[] }>('/users/batch', { user_ids: userIds });
      return response.data.users;
    } catch (error) {
      console.error('批量获取用户失败:', error);
      throw new Error('批量获取用户失败');
    }
  }
}

// =====================================================
// 导出服务实例
// =====================================================

export const userService = new UserService();
export default userService;
