import { create } from 'zustand';
import { ethers } from 'ethers';

export interface WalletState {
  isConnected: boolean;
  address: string | null;
  balance: string | null;
  network: {
    chainId: number;
    name: string;
  } | null;
  provider: ethers.BrowserProvider | null;
  signer: ethers.JsonRpcSigner | null;
  isLoading: boolean;
  error: string | null;
}

interface WalletActions {
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
  getBalance: () => Promise<void>;
  clearError: () => void;
}

export const useWalletStore = create<WalletState & WalletActions>((set, get) => ({
  // State
  isConnected: false,
  address: null,
  balance: null,
  network: null,
  provider: null,
  signer: null,
  isLoading: false,
  error: null,

  // Actions
  connect: async () => {
    set({ isLoading: true, error: null });

    try {
      if (!window.ethereum) {
        throw new Error('MetaMask未安装，请先安装MetaMask钱包');
      }

      // 首先检查是否已经连接
      const existingAccounts = await window.ethereum.request({
        method: 'eth_accounts',
      });

      let accounts;
      
      // 如果没有连接的账户，或者用户想要重新选择账户
      if (existingAccounts.length === 0) {
        // 请求用户选择账户
        accounts = await window.ethereum.request({
          method: 'eth_requestAccounts',
        });
      } else {
        // 强制显示账户选择器，让用户可以切换账户
        try {
          await window.ethereum!.request({
            method: 'wallet_requestPermissions',
            params: [{ eth_accounts: {} }]
          });
          accounts = await window.ethereum!.request({
            method: 'eth_requestAccounts',
          });
        } catch (permissionError) {
          // 如果权限请求失败，使用现有账户
          accounts = existingAccounts;
        }
      }

      if (accounts.length === 0) {
        throw new Error('未找到可用账户，请在MetaMask中创建或导入账户');
      }

      const provider = new ethers.BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();
      const address = await signer.getAddress();
      const network = await provider.getNetwork();

      // Get balance
      const balance = await provider.getBalance(address);
      const balanceInEth = ethers.formatEther(balance);

      set({
        isConnected: true,
        address,
        balance: balanceInEth,
        network: {
          chainId: Number(network.chainId),
          name: network.name,
        },
        provider,
        signer,
        isLoading: false,
        error: null,
      });

      // Listen for account changes
      if (window.ethereum) {
        window.ethereum.on('accountsChanged', (accounts: string[]) => {
          if (accounts.length === 0) {
            get().disconnect();
          } else {
            get().connect();
          }
        });

        // Listen for network changes
        window.ethereum.on('chainChanged', () => {
          get().connect();
        });
      }

    } catch (error) {
      set({
        error: error instanceof Error ? error.message : 'Failed to connect wallet',
        isLoading: false,
      });
      throw error;
    }
  },

  disconnect: () => {
    set({
      isConnected: false,
      address: null,
      balance: null,
      network: null,
      provider: null,
      signer: null,
      error: null,
    });
  },

  switchNetwork: async (chainId: number) => {
    set({ isLoading: true, error: null });

    try {
      if (!window.ethereum) {
        throw new Error('MetaMask is not installed');
      }

      if (window.ethereum) {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: `0x${chainId.toString(16)}` }],
        });
      }

      // Reconnect to update network info
      await get().connect();
    } catch (error: any) {
      // If the network doesn't exist, add it
      if (error.code === 4902) {
        // Network configurations
        const networks: Record<number, any> = {
          11155111: { // Sepolia
            chainId: '0xaa36a7',
            chainName: 'Sepolia Testnet',
            nativeCurrency: {
              name: 'ETH',
              symbol: 'ETH',
              decimals: 18,
            },
            rpcUrls: ['https://sepolia.infura.io/v3/'],
            blockExplorerUrls: ['https://sepolia.etherscan.io/'],
          },
        };

        const networkConfig = networks[chainId];
        if (networkConfig && window.ethereum) {
          try {
            await window.ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [networkConfig],
            });
            await get().connect();
          } catch (addError) {
            set({
              error: 'Failed to add network',
              isLoading: false,
            });
            throw addError;
          }
        } else {
          set({
            error: 'Unsupported network',
            isLoading: false,
          });
          throw new Error('Unsupported network');
        }
      } else {
        set({
          error: error instanceof Error ? error.message : 'Failed to switch network',
          isLoading: false,
        });
        throw error;
      }
    }
  },

  getBalance: async () => {
    const { provider, address } = get();
    
    if (!provider || !address) {
      return;
    }

    try {
      const balance = await provider.getBalance(address);
      const balanceInEth = ethers.formatEther(balance);
      
      set({ balance: balanceInEth });
    } catch (error) {
      console.error('Failed to get balance:', error);
    }
  },

  clearError: () => {
    set({ error: null });
  },
}));
