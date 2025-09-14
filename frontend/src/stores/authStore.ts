import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'admin' | 'member';
  walletAddress?: string;
  createdAt: string;
  updatedAt: string;
}

interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (email: string, password: string) => Promise<void>;
  register: (userData: { name: string; email: string; password: string }) => Promise<void>;
  walletRegister: (userData: { name: string; email: string; walletAddress: string; signature: string; message: string }) => Promise<void>;
  walletLogin: (walletAddress: string, signature: string, message: string) => Promise<void>;
  logout: () => void;
  clearError: () => void;
  setUser: (user: User) => void;
  setToken: (token: string) => void;
  updateProfile: (userData: Partial<User>) => Promise<void>;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      // State
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,

      // Actions
      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await fetch('/api/v1/auth/login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ email, password }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Login failed');
          }

          const data = await response.json();
          
          // 转换后端用户数据格式到前端格式
          const user = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.username || data.user.name,
            role: data.user.role === 'user' ? 'member' : data.user.role,
            walletAddress: data.user.wallet_address,
            createdAt: data.user.created_at || new Date().toISOString(),
            updatedAt: data.user.updated_at || new Date().toISOString(),
          };
          
          set({
            user: user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      register: async (userData: { name: string; email: string; password: string }) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await fetch('/api/v1/auth/register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(userData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Registration failed');
          }

          const data = await response.json();
          
          // 转换后端用户数据格式到前端格式
          const user = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.username,
            role: data.user.role === 'user' ? 'member' : data.user.role,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          set({
            user: user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Registration failed',
            isLoading: false,
          });
          throw error;
        }
      },

      walletRegister: async (userData: { name: string; email: string; walletAddress: string; signature: string; message: string }) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await fetch('/api/v1/auth/wallet-register', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              name: userData.name,
              email: userData.email,
              wallet_address: userData.walletAddress,
              signature: userData.signature,
              message: userData.message,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Wallet registration failed');
          }

          const data = await response.json();
          
          // 转换后端用户数据格式到前端格式
          const user = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.username,
            role: data.user.role === 'user' ? 'member' : data.user.role,
            walletAddress: data.user.wallet_address,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          set({
            user: user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Wallet registration failed',
            isLoading: false,
          });
          throw error;
        }
      },

      walletLogin: async (walletAddress: string, signature: string, message: string) => {
        set({ isLoading: true, error: null });
        
        try {
          const response = await fetch('/api/v1/auth/wallet-login', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              wallet_address: walletAddress,
              signature: signature,
              message: message,
            }),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Wallet login failed');
          }

          const data = await response.json();
          
          // 转换后端用户数据格式到前端格式
          const user = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.username,
            role: data.user.role === 'user' ? 'member' : data.user.role,
            walletAddress: data.user.wallet_address,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };
          
          set({
            user: user,
            token: data.token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Wallet login failed',
            isLoading: false,
          });
          throw error;
        }
      },

      logout: () => {
        set({
          user: null,
          token: null,
          isAuthenticated: false,
          error: null,
        });
      },

      clearError: () => {
        set({ error: null });
      },

      setUser: (user: User) => {
        set({ user, isAuthenticated: true });
      },

      setToken: (token: string) => {
        set({ token });
      },

      updateProfile: async (userData: Partial<User>) => {
        const { token } = get();
        if (!token) throw new Error('No authentication token');

        set({ isLoading: true, error: null });
        
        try {
          const response = await fetch('/api/v1/users/profile', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify(userData),
          });

          if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.message || 'Profile update failed');
          }

          const updatedUser = await response.json();
          
          set({
            user: updatedUser,
            isLoading: false,
            error: null,
          });
        } catch (error) {
          set({
            error: error instanceof Error ? error.message : 'Profile update failed',
            isLoading: false,
          });
          throw error;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
