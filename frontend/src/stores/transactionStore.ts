import { create } from 'zustand';
import { buildApiUrl, API_ENDPOINTS, getAuthHeaders } from '../config/api';

export interface Transaction {
  id: string;
  hash: string;
  type: 'incoming' | 'outgoing' | 'contract_interaction';
  status: 'pending' | 'confirmed' | 'failed';
  from: string;
  to: string;
  value: string;
  gasUsed?: string;
  gasPrice?: string;
  timestamp: string;
  blockNumber?: number;
  safeAddress: string;
  safeName: string;
  description?: string;
  proposalId?: string;
  network: string;
}

interface TransactionState {
  transactions: Transaction[];
  isLoading: boolean;
  error: string | null;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

interface TransactionActions {
  fetchTransactions: (page?: number, limit?: number, filters?: any) => Promise<void>;
  fetchTransactionsByProposal: (proposalId: string) => Promise<Transaction[]>;
  fetchTransactionsBySafe: (safeAddress: string) => Promise<Transaction[]>;
  addTransaction: (transaction: Transaction) => void;
  updateTransaction: (id: string, updates: Partial<Transaction>) => void;
  clearError: () => void;
}

export const useTransactionStore = create<TransactionState & TransactionActions>((set, get) => ({
  // State
  transactions: [],
  isLoading: false,
  error: null,
  pagination: {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 0,
  },

  // Actions
  fetchTransactions: async (page = 1, limit = 20, filters = {}) => {
    set({ isLoading: true, error: null });

    try {
      const token = localStorage.getItem('auth-storage');
      const authData = token ? JSON.parse(token) : null;
      
      if (!authData?.token) {
        throw new Error('No authentication token');
      }

      const queryParams = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters
      });

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || buildApiUrl('')}/api/v1/transactions?${queryParams}`, {
        headers: {
          'Authorization': `Bearer ${authData.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch transactions');
      }

      const data = await response.json();
      
      set({
        transactions: data.transactions,
        pagination: {
          page: data.page,
          limit: data.limit,
          total: data.total,
          totalPages: data.totalPages,
        },
        isLoading: false,
        error: null,
      });
    } catch (error) {
      // Fallback to mock data
      const mockTransactions: Transaction[] = [
        {
          id: '1',
          hash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
          type: 'outgoing',
          status: 'confirmed',
          from: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4c0e6',
          to: '0x8ba1f109551bD432803012645Hac136c22C2a1b',
          value: '1.5',
          gasUsed: '21000',
          gasPrice: '20',
          timestamp: new Date(Date.now() - 3600000).toISOString(),
          blockNumber: 18500000,
          safeAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4c0e6',
          safeName: 'Company Treasury',
          description: 'Marketing budget transfer',
          proposalId: 'prop-001',
          network: 'ethereum'
        },
        {
          id: '2',
          hash: '0xabcdef1234567890abcdef1234567890abcdef1234567890abcdef1234567890',
          type: 'incoming',
          status: 'confirmed',
          from: '0x8ba1f109551bD432803012645Hac136c22C2a1b',
          to: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4c0e6',
          value: '5.0',
          gasUsed: '21000',
          gasPrice: '18',
          timestamp: new Date(Date.now() - 7200000).toISOString(),
          blockNumber: 18499500,
          safeAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4c0e6',
          safeName: 'Company Treasury',
          description: 'Client payment received',
          network: 'ethereum'
        },
        {
          id: '3',
          hash: '0xfedcba0987654321fedcba0987654321fedcba0987654321fedcba0987654321',
          type: 'contract_interaction',
          status: 'pending',
          from: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4c0e6',
          to: '0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984',
          value: '0',
          timestamp: new Date(Date.now() - 1800000).toISOString(),
          safeAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4c0e6',
          safeName: 'Company Treasury',
          description: 'Token approval for DEX',
          proposalId: 'prop-002',
          network: 'ethereum'
        },
        {
          id: '4',
          hash: '0x9876543210fedcba9876543210fedcba9876543210fedcba9876543210fedcba',
          type: 'outgoing',
          status: 'failed',
          from: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4c0e6',
          to: '0x3f5CE5FBFe3E9af3971dD833D26bA9b5C936f0bE',
          value: '0.1',
          gasUsed: '0',
          gasPrice: '25',
          timestamp: new Date(Date.now() - 10800000).toISOString(),
          blockNumber: 18499000,
          safeAddress: '0x742d35Cc6634C0532925a3b8D4C9db96C4b4c0e6',
          safeName: 'Company Treasury',
          description: 'Failed transaction - insufficient gas',
          network: 'ethereum'
        }
      ];

      set({
        transactions: mockTransactions,
        pagination: {
          page: 1,
          limit: 20,
          total: mockTransactions.length,
          totalPages: 1,
        },
        error: error instanceof Error ? error.message : 'Failed to fetch transactions',
        isLoading: false,
      });
    }
  },

  fetchTransactionsByProposal: async (proposalId: string) => {
    const { transactions } = get();
    return transactions.filter(tx => tx.proposalId === proposalId);
  },

  fetchTransactionsBySafe: async (safeAddress: string) => {
    const { transactions } = get();
    return transactions.filter(tx => tx.safeAddress.toLowerCase() === safeAddress.toLowerCase());
  },

  addTransaction: (transaction: Transaction) => {
    set((state) => ({
      transactions: [transaction, ...state.transactions],
    }));
  },

  updateTransaction: (id: string, updates: Partial<Transaction>) => {
    set((state) => ({
      transactions: state.transactions.map(tx => 
        tx.id === id ? { ...tx, ...updates } : tx
      ),
    }));
  },

  clearError: () => {
    set({ error: null });
  },
}));
