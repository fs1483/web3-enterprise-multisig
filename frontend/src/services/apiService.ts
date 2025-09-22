import axios from 'axios';
import type { AxiosInstance, AxiosResponse } from 'axios';
import { buildApiUrl, getAuthHeaders } from '../config/api';

// API Base Configuration - Use environment variable or fallback
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || buildApiUrl('');

class ApiService {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_BASE_URL,
      timeout: 10000,
      headers: {
        ...getAuthHeaders(),
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        const token = this.getAuthToken();
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        if (error.response?.status === 401) {
          // Handle unauthorized access
          this.clearAuthToken();
          window.location.href = '/login';
        }
        return Promise.reject(error);
      }
    );
  }

  private getAuthToken(): string | null {
    try {
      const authStorage = localStorage.getItem('auth-storage');
      if (authStorage) {
        const parsed = JSON.parse(authStorage);
        // 修复token获取路径，匹配authStore的persist格式
        return parsed.state?.token || parsed.token || null;
      }
    } catch (error) {
      console.error('Failed to get auth token:', error);
    }
    return null;
  }

  private clearAuthToken(): void {
    localStorage.removeItem('auth-storage');
  }

  // Generic HTTP methods
  async get<T>(url: string, params?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, { params });
    return response.data;
  }

  async post<T>(url: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data);
    return response.data;
  }

  async put<T>(url: string, data?: any): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data);
    return response.data;
  }

  async delete<T>(url: string): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url);
    return response.data;
  }

  // Auth API methods
  async login(email: string, password: string) {
    return this.post('/api/v1/auth/login', { email, password });
  }

  async register(userData: { name: string; email: string; password: string }) {
    return this.post('/api/v1/auth/register', userData);
  }

  async getProfile() {
    return this.get('/api/v1/users/profile');
  }

  async updateProfile(userData: any) {
    return this.put('/api/v1/users/profile', userData);
  }

  // Proposal API methods
  async getProposals(page = 1, limit = 10) {
    return this.get('/api/v1/proposals', { page, limit });
  }

  async getProposal(id: string) {
    return this.get(`/api/v1/proposals/${id}`);
  }

  async createProposal(proposalData: any) {
    return this.post('/api/v1/proposals', proposalData);
  }

  async updateProposal(id: string, proposalData: any) {
    return this.put(`/api/v1/proposals/${id}`, proposalData);
  }

  async deleteProposal(id: string) {
    return this.delete(`/api/v1/proposals/${id}`);
  }

  async signProposal(id: string, signatureData: any) {
    return this.post(`/api/v1/proposals/${id}/sign`, signatureData);
  }

  // Safe API methods
  async getSafes() {
    return this.get('/api/v1/safes');
  }

  async getSafe(id: string) {
    return this.get(`/api/v1/safes/${id}`);
  }

  async createSafe(safeData: any) {
    return this.post('/api/v1/safes', safeData);
  }

  // Transaction API methods
  async getTransactions(safeAddress: string) {
    return this.get(`/api/v1/transactions/${safeAddress}`);
  }

  async getTransaction(txHash: string) {
    return this.get(`/api/v1/transactions/hash/${txHash}`);
  }

  // Dashboard API methods
  async getDashboardStats() {
    return this.get('/api/v1/dashboard/stats');
  }

  async getRecentActivity() {
    return this.get('/api/v1/dashboard/activity');
  }

  // User API methods
  async getUsersForSelection() {
    return this.get('/api/v1/users/selection');
  }

  // Dashboard API methods - 待处理提案
  async getPendingProposals() {
    return this.get('/api/v1/dashboard/pending-proposals');
  }
}

export const apiService = new ApiService();
export default apiService;
