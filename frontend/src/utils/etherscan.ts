/**
 * Etherscan 工具函数
 * 用于生成不同网络的 Etherscan 链接
 */

// 网络配置映射
const NETWORK_CONFIG: Record<number, { name: string; explorerUrl: string }> = {
  1: {
    name: 'Ethereum Mainnet',
    explorerUrl: 'https://etherscan.io'
  },
  11155111: {
    name: 'Sepolia Testnet',
    explorerUrl: 'https://sepolia.etherscan.io'
  },
  5: {
    name: 'Goerli Testnet',
    explorerUrl: 'https://goerli.etherscan.io'
  },
  137: {
    name: 'Polygon Mainnet',
    explorerUrl: 'https://polygonscan.com'
  },
  80001: {
    name: 'Polygon Mumbai',
    explorerUrl: 'https://mumbai.polygonscan.com'
  },
  56: {
    name: 'BSC Mainnet',
    explorerUrl: 'https://bscscan.com'
  },
  97: {
    name: 'BSC Testnet',
    explorerUrl: 'https://testnet.bscscan.com'
  }
};

/**
 * 获取交易的 Etherscan URL
 * @param txHash 交易哈希
 * @param chainId 网络ID，默认为 11155111 (Sepolia)
 * @returns Etherscan 交易链接
 */
export const getTransactionUrl = (txHash: string, chainId: number = 11155111): string => {
  const config = NETWORK_CONFIG[chainId];
  
  if (!config) {
    console.warn(`未知的网络ID: ${chainId}，使用默认的 Sepolia 网络`);
    return `${NETWORK_CONFIG[11155111].explorerUrl}/tx/${txHash}`;
  }
  
  return `${config.explorerUrl}/tx/${txHash}`;
};

/**
 * 获取地址的 Etherscan URL
 * @param address 地址
 * @param chainId 网络ID，默认为 11155111 (Sepolia)
 * @returns Etherscan 地址链接
 */
export const getAddressUrl = (address: string, chainId: number = 11155111): string => {
  const config = NETWORK_CONFIG[chainId];
  
  if (!config) {
    console.warn(`未知的网络ID: ${chainId}，使用默认的 Sepolia 网络`);
    return `${NETWORK_CONFIG[11155111].explorerUrl}/address/${address}`;
  }
  
  return `${config.explorerUrl}/address/${address}`;
};

/**
 * 获取网络名称
 * @param chainId 网络ID
 * @returns 网络名称
 */
export const getNetworkName = (chainId: number): string => {
  const config = NETWORK_CONFIG[chainId];
  return config ? config.name : `Unknown Network (${chainId})`;
};

/**
 * 在新窗口中打开 Etherscan 链接
 * @param url Etherscan URL
 */
export const openInNewTab = (url: string): void => {
  window.open(url, '_blank', 'noopener,noreferrer');
};

/**
 * 获取交易链接并在新窗口打开
 * @param txHash 交易哈希
 * @param chainId 网络ID
 */
export const openTransactionInEtherscan = (txHash: string, chainId?: number): void => {
  const url = getTransactionUrl(txHash, chainId);
  openInNewTab(url);
};

/**
 * 获取地址链接并在新窗口打开
 * @param address 地址
 * @param chainId 网络ID
 */
export const openAddressInEtherscan = (address: string, chainId?: number): void => {
  const url = getAddressUrl(address, chainId);
  openInNewTab(url);
};
