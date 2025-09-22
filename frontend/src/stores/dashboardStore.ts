import { create } from 'zustand';
import { buildApiUrl, API_ENDPOINTS, getAuthHeaders } from '../config/api';
import { useAuthStore } from './authStore';

// Dashboard卡片数据接口定义
export interface ProposalCenterCard {
  pendingSignatures: number;    // 需要用户签名的待处理提案数量
  urgentCount: number;          // 紧急提案数量（创建时间超过24小时）
  totalProposals: number;       // 用户相关的提案总数
  confirmedProposals: number;   // 执行成功的提案数量
  failedProposals: number;      // 执行失败的提案数量
  approvalRate: string;         // 提案通过率（百分比字符串）
}

export interface AssetOverviewCard {
  totalETH: string;             // 所有Safe的ETH余额汇总（ETH单位）
  safeCount: number;            // 用户管理的Safe数量
}

export interface DashboardCardsData {
  proposalCenter: ProposalCenterCard | null;
  assetOverview: AssetOverviewCard | null;
  lastUpdated: string;          // 数据最后更新时间
}

interface DashboardState {
  // 状态数据
  cardsData: DashboardCardsData | null;
  loading: boolean;
  error: string | null;
  
  // 操作方法
  fetchDashboardCards: () => Promise<void>;
  clearError: () => void;
  reset: () => void;
}

// Dashboard Store - 管理Dashboard卡片数据
export const dashboardStore = create<DashboardState>((set) => ({
  // 初始状态
  cardsData: null,
  loading: false,
  error: null,

  // 获取Dashboard卡片数据
  fetchDashboardCards: async () => {
    try {
      set({ loading: true, error: null });

      // 获取认证信息
      const authData = useAuthStore.getState();
      console.log('Dashboard API调用 - 认证状态:', { 
        isAuthenticated: authData.isAuthenticated, 
        hasToken: !!authData.token 
      });
      
      if (!authData.isAuthenticated || !authData.token) {
        throw new Error('用户未认证');
      }

      // 调用新的Dashboard Cards API
      const apiUrl = `${import.meta.env.VITE_API_BASE_URL || buildApiUrl('')}/api/v1/dashboard/cards`;
      console.log('Dashboard API调用 - URL:', apiUrl);
      
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authData.token}`,
          ...getAuthHeaders(),
        },
      });

      console.log('Dashboard API响应 - 状态:', response.status);

      if (!response.ok) {
        const errorData = await response.json();
        console.error('Dashboard API错误:', errorData);
        throw new Error(errorData.error || `API请求失败: ${response.status}`);
      }

      const data = await response.json();
      console.log('Dashboard API响应 - 数据:', data);
      
      // 验证响应数据结构 - 后端返回的是 data.data.proposalCenter 格式
      if (!data.success || !data.data || !data.data.proposalCenter || !data.data.assetOverview) {
        console.error('Dashboard API数据格式错误:', data);
        throw new Error('API响应数据格式错误');
      }

      // 直接使用后端数据，格式已经匹配
      const cardsData = {
        proposalCenter: data.data.proposalCenter,
        assetOverview: data.data.assetOverview,
        lastUpdated: data.data.lastUpdated
      };

      console.log('Dashboard数据处理完成:', cardsData);

      set({ 
        cardsData: cardsData,
        loading: false,
        error: null 
      });

    } catch (error) {
      console.error('获取Dashboard卡片数据失败:', error);
      
      // 如果是认证错误，不设置Mock数据
      if (error instanceof Error && error.message.includes('未认证')) {
        set({ 
          loading: false, 
          error: error.message,
          cardsData: null
        });
        return;
      }
      
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : '未知错误' 
      });
      
      // 不使用Mock数据，保持错误状态让用户知道问题所在
    }
  },

  // 清除错误状态
  clearError: () => {
    set({ error: null });
  },

  // 重置状态
  reset: () => {
    set({
      cardsData: null,
      loading: false,
      error: null
    });
  }
}));

// 导出store hook供组件使用
export const useDashboardStore = dashboardStore;

// 导出store实例供组件使用
export default dashboardStore;
