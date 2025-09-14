import { create } from 'zustand';
import { ethToWei, validateEthAmount } from '../utils/ethUtils';

export interface Proposal {
  id: string;
  title: string;
  description: string;
  proposal_type: 'transfer' | 'contract_call' | 'add_owner' | 'remove_owner' | 'change_threshold';
  status: 'pending' | 'approved' | 'executed' | 'rejected';
  safe_id: string;
  to_address: string;
  value: string;
  data: string;
  required_signatures: number;
  current_signatures: number;
  signatures: Array<{
    signer: string;
    signature: string;
    signedAt: string;
  }>;
  created_by: string;
  created_at: string;
  updated_at: string;
  executed_at?: string;
  tx_hash?: string;
  nonce?: number;  // Safe交易nonce
  // Safe关联对象
  Safe?: {
    id: string;
    name: string;
    address?: string;
    Address?: string;  // 后端返回的大写字段
    chain_id: number;
    threshold: number;
    owners: string[];
  };
  // 为了向后兼容，添加计算属性
  type?: 'transfer' | 'contract_call' | 'add_owner' | 'remove_owner' | 'change_threshold';
  to?: string;
  requiredSignatures?: number;
  currentSignatures?: number;
  safeAddress?: string;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
  executedAt?: string;
  transactionHash?: string;
}

// 创建提案时的数据接口
export interface CreateProposalData {
  safeId: string;
  title: string;
  description: string;
  proposalType: 'transfer' | 'contract_call' | 'add_owner' | 'remove_owner' | 'change_threshold';
  toAddress: string;
  value: string;
  data?: string;
  requiredSignatures: number;
}

interface ProposalState {
  proposals: Proposal[];
  currentProposal: Proposal | null;
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface ProposalActions {
  fetchProposals: (page?: number, limit?: number) => Promise<void>;
  fetchProposal: (id: string) => Promise<void>;
  createProposal: (proposalData: CreateProposalData) => Promise<any>;
  signProposal: (id: string, signature: string, usedNonce?: number, safeTxHash?: string) => Promise<void>;
  executeProposal: (id: string) => Promise<void>;
  rejectProposal: (id: string) => Promise<void>;
  clearError: () => void;
  setCurrentProposal: (proposal: Proposal | null) => void;
}

export const useProposalStore = create<ProposalState & ProposalActions>((set) => ({
  // State
  proposals: [],
  currentProposal: null,
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  },

  // Actions
  fetchProposals: async (page = 1, limit = 10) => {
    set({ isLoading: true, error: null });

    try {
      const authStorage = localStorage.getItem('auth-storage');
      const authData = authStorage ? JSON.parse(authStorage) : null;
      
      // 检查多种可能的token路径
      const token = authData?.token || authData?.state?.token;
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/proposals?page=${page}&limit=${limit}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch proposals');
      }

      const data = await response.json();
      
      // 处理后端返回的数据，添加向后兼容的字段映射
      const mappedProposals = data.proposals?.map((proposal: any) => ({
        ...proposal,
        // 向后兼容的字段映射
        type: proposal.proposal_type,
        to: proposal.to_address,
        requiredSignatures: proposal.required_signatures,
        currentSignatures: proposal.current_signatures,
        safeAddress: proposal.Safe?.address,
        createdBy: proposal.created_by,
        createdAt: proposal.created_at,
        updatedAt: proposal.updated_at,
        executedAt: proposal.executed_at,
        transactionHash: proposal.tx_hash,
      })) || [];
      
      set({
        proposals: mappedProposals,
        pagination: {
          page: data.pagination?.page || data.page || 1,
          limit: data.pagination?.limit || data.limit || 10,
          total: data.pagination?.total || data.total || 0,
          totalPages: data.pagination?.totalPages || data.totalPages || 0,
        },
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch proposals',
        isLoading: false,
      });
      throw error;
    }
  },

  fetchProposal: async (id: string) => {
    set({ isLoading: true, error: null });
    
    try {
      const authStorage = localStorage.getItem('auth-storage');
      const authData = authStorage ? JSON.parse(authStorage) : null;
      
      // 检查多种可能的token路径
      const token = authData?.token || authData?.state?.token;
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/proposals/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const proposal = data.proposal;
      
      // 处理单个提案数据的字段映射
      const mappedProposal = {
        ...proposal,
        // 向后兼容的字段映射
        type: proposal.proposal_type,
        to: proposal.to_address,
        requiredSignatures: proposal.required_signatures,
        currentSignatures: proposal.current_signatures,
        safeAddress: proposal.Safe?.address || proposal.Safe?.Address,
        createdBy: proposal.created_by,
        createdAt: proposal.created_at,
        updatedAt: proposal.updated_at,
        executedAt: proposal.executed_at,
        transactionHash: proposal.tx_hash,
      };
      
      set({
        currentProposal: mappedProposal,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to fetch proposal',
        isLoading: false,
      });
      throw error;
    }
  },

  createProposal: async (proposalData) => {
    set({ isLoading: true, error: null });

    try {
      const authStorage = localStorage.getItem('auth-storage');
      const authData = authStorage ? JSON.parse(authStorage) : null;
      
      // 检查多种可能的token路径
      const token = authData?.token || authData?.state?.token;
      if (!token) {
        throw new Error('No authentication token');
      }

      // 验证ETH金额格式
      const validation = validateEthAmount(proposalData.value);
      if (!validation.isValid) {
        throw new Error(`Invalid ETH amount: ${validation.error}`);
      }

      // 将ETH转换为Wei
      const valueInWei = ethToWei(proposalData.value);

      // 将前端字段映射到后端API期望的字段名
      const apiData = {
        safe_id: proposalData.safeId,
        title: proposalData.title,
        description: proposalData.description,
        proposal_type: proposalData.proposalType,
        to_address: proposalData.toAddress,
        value: valueInWei, // 使用Wei值
        data: proposalData.data || '0x',
        required_signatures: proposalData.requiredSignatures,
      };

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/proposals`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(apiData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create proposal');
      }

      const data = await response.json();
      console.log('API Response:', data); // 添加调试日志
      
      // 获取proposal数据，支持多种响应格式
      const newProposal = data.proposal || data.data || data;
      
      // 确保我们获取到了有效的proposal数据
      if (!newProposal || !newProposal.id) {
        console.error('No valid proposal data in response:', data);
        throw new Error('No valid proposal data returned from server');
      }

      // 处理新创建提案的字段映射
      const mappedProposal = {
        ...newProposal,
        // 向后兼容的字段映射
        type: newProposal.proposal_type,
        to: newProposal.to_address,
        requiredSignatures: newProposal.required_signatures,
        currentSignatures: newProposal.current_signatures,
        safeAddress: newProposal.Safe?.address || newProposal.Safe?.Address,
        createdBy: newProposal.created_by,
        createdAt: newProposal.created_at,
        updatedAt: newProposal.updated_at,
        executedAt: newProposal.executed_at,
        transactionHash: newProposal.tx_hash,
      };
      
      set((state) => ({
        proposals: [mappedProposal, ...state.proposals],
        isLoading: false,
        error: null,
      }));
      
      return mappedProposal;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to create proposal';
      set({
        error: errorMessage,
        isLoading: false,
      });
      // 返回null表示失败
      return null;
    }
  },

  signProposal: async (id: string, signature: string, usedNonce?: number, safeTxHash?: string) => {
    set({ isLoading: true, error: null });

    try {
      const authStorage = localStorage.getItem('auth-storage');
      const authData = authStorage ? JSON.parse(authStorage) : null;
      
      if (!authData?.token && !authData?.state?.token) {
        throw new Error('No authentication token');
      }
      
      const token = authData.token || authData.state.token;

      const requestBody: any = { 
        signature_data: signature,
        signature_type: 'eth_signTypedData'
      };
      
      // 添加nonce和safeTxHash信息用于企业级nonce管理
      if (usedNonce !== undefined) {
        requestBody.used_nonce = usedNonce;
      }
      
      if (safeTxHash) {
        requestBody.safe_tx_hash = safeTxHash;
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/proposals/${id}/sign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify(requestBody),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to sign proposal');
      }

      const updatedProposal = await response.json();
      
      set((state) => ({
        proposals: state.proposals.map(p => p.id === id ? updatedProposal : p),
        currentProposal: state.currentProposal?.id === id ? updatedProposal : state.currentProposal,
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to sign proposal',
        isLoading: false,
      });
      throw error;
    }
  },

  executeProposal: async (id: string) => {
    set({ isLoading: true, error: null });

    try {
      const authStorage = localStorage.getItem('auth-storage');
      const authData = authStorage ? JSON.parse(authStorage) : null;
      
      // 检查多种可能的token路径
      const token = authData?.token || authData?.state?.token;
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/proposals/${id}/execute`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to execute proposal');
      }

      const updatedProposal = await response.json();
      
      set((state) => ({
        proposals: state.proposals.map(p => p.id === id ? updatedProposal : p),
        currentProposal: state.currentProposal?.id === id ? updatedProposal : state.currentProposal,
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to execute proposal',
        isLoading: false,
      });
      throw error;
    }
  },

  rejectProposal: async (id: string) => {
    set({ isLoading: true, error: null });

    try {
      const authStorage = localStorage.getItem('auth-storage');
      const authData = authStorage ? JSON.parse(authStorage) : null;
      
      // 检查多种可能的token路径
      const token = authData?.token || authData?.state?.token;
      if (!token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/proposals/${id}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to reject proposal');
      }

      const updatedProposal = await response.json();
      
      set((state) => ({
        proposals: state.proposals.map(p => p.id === id ? updatedProposal : p),
        currentProposal: state.currentProposal?.id === id ? updatedProposal : state.currentProposal,
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to reject proposal',
        isLoading: false,
      });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },

  setCurrentProposal: (proposal: Proposal | null) => {
    set({ currentProposal: proposal });
  },
}));
