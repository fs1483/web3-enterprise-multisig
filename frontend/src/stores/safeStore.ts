import { create } from 'zustand';

export interface Safe {
  id: string;
  address: string;
  name: string;
  description?: string;
  owners: Array<{
    address: string;
    name: string;
  }>;
  threshold: number;
  balance: string;
  nonce: number;
  network: string;
  createdAt: string;
  updatedAt: string;
  isActive: boolean;
}

interface SafeState {
  safes: Safe[];
  currentSafe: Safe | null;
  isLoading: boolean;
  error: string | null;
}

interface SafeActions {
  fetchSafes: () => Promise<void>;
  fetchSafe: (address: string) => Promise<void>;
  createSafe: (safeData: Omit<Safe, 'id' | 'balance' | 'nonce' | 'createdAt' | 'updatedAt' | 'isActive'>) => Promise<void>;
  updateSafe: (address: string, updates: Partial<Safe>) => Promise<void>;
  clearError: () => void;
  setCurrentSafe: (safe: Safe | null) => void;
}

export const useSafeStore = create<SafeState & SafeActions>((set, get) => ({
  // State
  safes: [],
  currentSafe: null,
  isLoading: false,
  error: null,

  // Actions
  fetchSafes: async () => {
    set({ isLoading: true, error: null });

    try {
      const authStorage = localStorage.getItem('auth-storage');
      const authData = authStorage ? JSON.parse(authStorage) : null;
      
      if (!authData?.state?.token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/api/v1/safes`, {
        headers: {
          'Authorization': `Bearer ${authData.state.token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('API响应数据:', data);
      
      // 转换后端API数据格式到前端Safe接口格式
      const backendSafes = data.safes || [];
      const safes = backendSafes.map((safe: any) => ({
        id: safe.id,
        address: safe.address,
        name: safe.name,
        description: safe.description || '',
        owners: Array.isArray(safe.owners) ? safe.owners.map((owner: string) => ({
          address: owner,
          name: owner // 使用地址作为名称，后续可以从用户数据库获取真实名称
        })) : [],
        threshold: safe.threshold || 1,
        balance: '0', // 后续可以从区块链获取实际余额
        nonce: 0, // 后续可以从区块链获取实际nonce
        network: safe.chain_id === 11155111 ? 'Sepolia' : 'Unknown',
        createdAt: safe.created_at,
        updatedAt: safe.updated_at,
        isActive: safe.status === 'active'
      }));
      
      console.log('转换后的safes数据:', safes);
      
      set({
        safes: safes,
        error: null,
        isLoading: false,
      });
    } catch (error) {
      console.error('Failed to fetch safes from API:', error);
      
      set({
        safes: [],
        error: error instanceof Error ? error.message : 'Failed to fetch safes',
        isLoading: false,
      });
    }
  },

  fetchSafe: async (address: string) => {
    set({ isLoading: true, error: null });

    try {
      const authStorage = localStorage.getItem('auth-storage');
      const authData = authStorage ? JSON.parse(authStorage) : null;
      
      if (!authData?.state?.token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/safes/${address}`, {
        headers: {
          'Authorization': `Bearer ${authData.state.token}`,
        },
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to fetch safe');
      }

      const safe = await response.json();
      
      set({
        currentSafe: safe,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      // Fallback to finding in existing safes
      const { safes } = get();
      const safe = safes.find(s => s.address.toLowerCase() === address.toLowerCase());
      
      set({
        currentSafe: safe || null,
        error: safe ? null : (error instanceof Error ? error.message : 'Safe not found'),
        isLoading: false,
      });
    }
  },

  createSafe: async (safeData) => {
    set({ isLoading: true, error: null });

    try {
      const authStorage = localStorage.getItem('auth-storage');
      const authData = authStorage ? JSON.parse(authStorage) : null;
      
      if (!authData?.state?.token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/safes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.state.token}`,
        },
        body: JSON.stringify(safeData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to create safe');
      }

      const newSafe = await response.json();
      
      set((state) => ({
        safes: [newSafe, ...state.safes],
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      // For demo purposes, create a mock safe
      const newSafe: Safe = {
        ...safeData,
        id: Date.now().toString(),
        balance: '0',
        nonce: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isActive: true
      };

      set((state) => ({
        safes: [newSafe, ...state.safes],
        error: null,
        isLoading: false,
      }));
    }
  },

  updateSafe: async (address: string, updates: Partial<Safe>) => {
    set({ isLoading: true, error: null });

    try {
      const authStorage = localStorage.getItem('auth-storage');
      const authData = authStorage ? JSON.parse(authStorage) : null;
      
      if (!authData?.state?.token) {
        throw new Error('No authentication token');
      }

      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/safes/${address}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authData.state.token}`,
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update safe');
      }

      const updatedSafe = await response.json();
      
      set((state) => ({
        safes: state.safes.map(s => s.address === address ? updatedSafe : s),
        currentSafe: state.currentSafe?.address === address ? updatedSafe : state.currentSafe,
        isLoading: false,
        error: null,
      }));
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to update safe',
        isLoading: false,
      });
      throw error;
    }
  },

  clearError: () => {
    set({ error: null });
  },

  setCurrentSafe: (safe: Safe | null) => {
    set({ currentSafe: safe });
  },
}));
