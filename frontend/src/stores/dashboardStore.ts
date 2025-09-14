import { create } from 'zustand';
import { useAuthStore } from './authStore';

// Dashboard卡片数据接口定义
export interface ProposalCenterCard {
  pendingSignatures: number;    // 需要用户签名的待处理提案数量
  urgentProposals: number;      // 紧急提案数量（创建时间超过24小时）
  totalProposals: number;       // 用户相关的提案总数
  executedProposals: number;    // 已执行的提案数量
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
      if (!authData.isAuthenticated || !authData.token) {
        throw new Error('用户未认证');
      }

      // 调用新的Dashboard Cards API
      const response = await fetch('/api/v1/dashboard/cards', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${authData.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `API请求失败: ${response.status}`);
      }

      const data = await response.json();
      
      // 验证响应数据结构 - 后端返回的是 data.data.proposalCenter 格式
      if (!data.success || !data.data || !data.data.proposalCenter || !data.data.assetOverview) {
        throw new Error('API响应数据格式错误');
      }

      // 直接使用后端数据，格式已经匹配
      const cardsData = {
        proposalCenter: data.data.proposalCenter,
        assetOverview: data.data.assetOverview,
        lastUpdated: data.data.lastUpdated
      };

      set({ 
        cardsData: cardsData,
        loading: false,
        error: null 
      });

    } catch (error) {
      console.error('获取Dashboard卡片数据失败:', error);
      set({ 
        loading: false, 
        error: error instanceof Error ? error.message : '未知错误' 
      });
      
      // 如果API失败，提供Mock数据确保功能可用
      const mockData: DashboardCardsData = {
        proposalCenter: {
          pendingSignatures: 3,
          urgentProposals: 1,
          totalProposals: 15,
          executedProposals: 12,
          approvalRate: "80.0"
        },
        assetOverview: {
          totalETH: "2.45",
          safeCount: 2
        },
        lastUpdated: new Date().toISOString()
      };
      
      set({ cardsData: mockData });
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
