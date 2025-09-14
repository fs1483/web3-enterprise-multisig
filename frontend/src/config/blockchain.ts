export const BLOCKCHAIN_CONFIG = {
  // Sepolia 测试网配置
  SEPOLIA: {
    chainId: 11155111,
    name: 'Sepolia',
    rpcUrl: 'https://sepolia.infura.io/v3/YOUR_INFURA_KEY',
    blockExplorer: 'https://sepolia.etherscan.io',
    safeService: 'https://safe-transaction-sepolia.safe.global',
    safeWebApp: 'https://app.safe.global',
  },
  
  // 本地开发网络
  LOCALHOST: {
    chainId: 31337,
    name: 'Localhost',
    rpcUrl: 'http://localhost:8545',
    blockExplorer: 'http://localhost:4000',
    safeService: 'http://localhost:3000',
    safeWebApp: 'http://localhost:3001',
  }
};

export const SAFE_CONFIG = {
  // Safe 合约版本
  safeVersion: '1.4.1',
  
  // 默认回退处理器
  fallbackHandler: '0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4',
  
  // 默认签名阈值
  defaultThreshold: 2,
  
  // Gas 配置
  gasLimit: 6000000,
  gasPrice: '20000000000', // 20 Gwei
};

// Safe 合约地址配置
export const SAFE_CONTRACTS = {
  // Sepolia 测试网
  11155111: {
    safeFactory: '0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2',
    safeSingleton: '0xd9Db270c1B5E3Bd161E8c8503c55cEABeE709552',
    fallbackHandler: '0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4',
    multiSend: '0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761',
    multiSendCallOnly: '0x40A2aCCbd92BCA938b02010E17A5b8929b49130D',
    createCall: '0x7cbB62EaA69F79e6873cD1ecB2392971036cFdA4',
    signMessageLib: '0xA65387F16B013cf2Af4605Ad8aA5ec25a2cbA3a2'
  },
  
  // 主网 (未来扩展)
  1: {
    safeFactory: '0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2',
    safeSingleton: '0xd9Db270c1B5E3Bd161E8c8503c55cEABeE709552',
    fallbackHandler: '0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4',
    multiSend: '0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761',
    multiSendCallOnly: '0x40A2aCCbd92BCA938b02010E17A5b8929b49130D',
    createCall: '0x7cbB62EaA69F79e6873cD1ecB2392971036cFdA4',
    signMessageLib: '0xA65387F16B013cf2Af4605Ad8aA5ec25a2cbA3a2'
  },
  
  // 本地开发网络
  31337: {
    safeFactory: '0x0000000000000000000000000000000000000000', // 需要部署
    safeSingleton: '0x0000000000000000000000000000000000000000', // 需要部署
    fallbackHandler: '0x0000000000000000000000000000000000000000',
    multiSend: '0x0000000000000000000000000000000000000000',
    multiSendCallOnly: '0x0000000000000000000000000000000000000000',
    createCall: '0x0000000000000000000000000000000000000000',
    signMessageLib: '0x0000000000000000000000000000000000000000'
  }
};

export const getNetworkConfig = (chainId: number) => {
  switch (chainId) {
    case 11155111:
      return BLOCKCHAIN_CONFIG.SEPOLIA;
    case 31337:
      return BLOCKCHAIN_CONFIG.LOCALHOST;
    default:
      throw new Error(`Unsupported network: ${chainId}`);
  }
};

// 获取 Safe 合约地址
export const getSafeContracts = (chainId: number) => {
  const contracts = SAFE_CONTRACTS[chainId as keyof typeof SAFE_CONTRACTS];
  if (!contracts) {
    throw new Error(`Safe contracts not configured for network: ${chainId}`);
  }
  return contracts;
};

// 检查网络是否支持 Safe
export const isSafeSupported = (chainId: number): boolean => {
  return chainId in SAFE_CONTRACTS;
};

// 获取支持的网络列表
export const getSupportedNetworks = () => {
  return Object.keys(SAFE_CONTRACTS).map(Number);
};
