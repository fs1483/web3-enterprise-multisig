import { ethers } from 'ethers';
import { getNetworkConfig, getSafeContracts } from '../config/blockchain';

// 简化的 SafeService，专注于基础 Web3 连接
export class SafeService {
  private provider: ethers.BrowserProvider | null = null;
  private signer: ethers.JsonRpcSigner | null = null;
  private isInitialized = false;

  async initialize() {
    try {
      // 检查 MetaMask
      if (!window.ethereum) {
        throw new Error('MetaMask not detected. Please install MetaMask extension.');
      }

      // 检查 MetaMask 是否可用
      if (typeof window.ethereum.request !== 'function') {
        throw new Error('MetaMask is not properly initialized');
      }

      // 请求连接权限
      await window.ethereum.request({ method: 'eth_requestAccounts' });

      // 创建 provider 和 signer
      this.provider = new ethers.BrowserProvider(window.ethereum);
      this.signer = await this.provider.getSigner();

      // 获取网络配置
      const network = await this.provider.getNetwork();
      const networkConfig = getNetworkConfig(Number(network.chainId));

      this.isInitialized = true;
      console.log('✅ Web3 connection initialized successfully');
      console.log('Connected to network:', networkConfig.name);
      console.log('User address:', await this.signer.getAddress());
      
      return true;
    } catch (error) {
      console.error('❌ Failed to initialize Web3 connection:', error);
      throw error;
    }
  }

  // 检查是否已初始化
  checkInitialized() {
    if (!this.isInitialized || !this.provider || !this.signer) {
      throw new Error('SafeService not initialized. Call initialize() first.');
    }
  }

  // 公共方法：检查是否已初始化
  get initialized(): boolean {
    return this.isInitialized && !!this.provider && !!this.signer;
  }

  // 获取用户地址
  async getUserAddress(): Promise<string> {
    this.checkInitialized();
    return await this.signer!.getAddress();
  }

  // 获取余额
  async getBalance(address?: string): Promise<string> {
    this.checkInitialized();
    const targetAddress = address || await this.getUserAddress();
    const balance = await this.provider!.getBalance(targetAddress);
    return ethers.formatEther(balance);
  }

  // 获取网络信息
  async getNetworkInfo() {
    this.checkInitialized();
    const network = await this.provider!.getNetwork();
    return {
      chainId: Number(network.chainId),
      name: network.name,
      config: getNetworkConfig(Number(network.chainId))
    };
  }

  // 发送简单转账
  async sendTransaction(to: string, value: string): Promise<string> {
    this.checkInitialized();
    
    const tx = await this.signer!.sendTransaction({
      to,
      value: ethers.parseEther(value)
    });
    
    console.log('Transaction sent:', tx.hash);
    return tx.hash;
  }

  // 创建 Safe 多签钱包
  async createSafe(owners: string[], threshold: number): Promise<{
    address: string;
    transactionHash: string;
    blockNumber: number;
    gasUsed: string;
  }> {
    this.checkInitialized();
    
    try {
      console.log('🚀 Creating Safe with owners:', owners);
      console.log('🔐 Threshold:', threshold);
      
      // 验证参数
      if (!owners || owners.length === 0) {
        throw new Error('所有者列表不能为空');
      }
      
      if (threshold <= 0 || threshold > owners.length) {
        throw new Error(`阈值无效: ${threshold}, 必须在 1 到 ${owners.length} 之间`);
      }
      
      // 验证所有者地址格式
      for (let i = 0; i < owners.length; i++) {
        if (!ethers.isAddress(owners[i])) {
          throw new Error(`所有者 ${i + 1} 的地址格式不正确: ${owners[i]}`);
        }
      }
      
      console.log('✅ 参数验证通过');
      
      // 获取当前网络信息
      const network = await this.provider!.getNetwork();
      const chainId = Number(network.chainId);
      console.log('🌐 当前网络:', { chainId, name: network.name });
      
      // 获取当前网络的 Safe 合约地址
      const safeContracts = getSafeContracts(chainId);
      console.log('📍 合约地址:', safeContracts);
      
      console.log('📍 Network:', chainId, getNetworkConfig(chainId).name);
      console.log('🏭 Safe Factory:', safeContracts.safeFactory);
      console.log('🔧 Safe Singleton:', safeContracts.safeSingleton);
      
      // Safe Factory ABI (简化版，只包含创建Safe的方法)
      const SAFE_FACTORY_ABI = [
        {
          "inputs": [
            {"internalType": "address", "name": "_singleton", "type": "address"},
            {"internalType": "bytes", "name": "initializer", "type": "bytes"},
            {"internalType": "uint256", "name": "saltNonce", "type": "uint256"}
          ],
          "name": "createProxyWithNonce",
          "outputs": [{"internalType": "contract GnosisSafeProxy", "name": "proxy", "type": "address"}],
          "stateMutability": "nonpayable",
          "type": "function"
        },
        {
          "inputs": [
            {"internalType": "address", "name": "_singleton", "type": "address"},
            {"internalType": "bytes", "name": "initializer", "type": "bytes"},
            {"internalType": "uint256", "name": "saltNonce", "type": "uint256"},
            {"internalType": "contract IProxyCreationCallback", "name": "callback", "type": "address"}
          ],
          "name": "createProxyWithCallback",
          "outputs": [{"internalType": "contract GnosisSafeProxy", "name": "proxy", "type": "address"}],
          "stateMutability": "nonpayable",
          "type": "function"
        }
      ];
      
      // Safe Setup ABI (用于初始化)
      const SAFE_SETUP_ABI = [
        {
          "inputs": [
            {"internalType": "address[]", "name": "_owners", "type": "address[]"},
            {"internalType": "uint256", "name": "_threshold", "type": "uint256"},
            {"internalType": "address", "name": "to", "type": "address"},
            {"internalType": "bytes", "name": "data", "type": "bytes"},
            {"internalType": "address", "name": "fallbackHandler", "type": "address"},
            {"internalType": "address", "name": "paymentToken", "type": "address"},
            {"internalType": "uint256", "name": "payment", "type": "uint256"},
            {"internalType": "address payable", "name": "paymentReceiver", "type": "address"}
          ],
          "name": "setup",
          "outputs": [],
          "stateMutability": "nonpayable",
          "type": "function"
        }
      ];
      
      // 创建合约实例
      const factoryContract = new ethers.Contract(safeContracts.safeFactory, SAFE_FACTORY_ABI, this.signer);
      
      // 编码初始化数据
      const setupInterface = new ethers.Interface(SAFE_SETUP_ABI);
      const initializer = setupInterface.encodeFunctionData('setup', [
        owners,                    // _owners
        threshold,                 // _threshold
        ethers.ZeroAddress,       // to (no module)
        '0x',                     // data (empty)
        ethers.ZeroAddress,       // fallbackHandler
        ethers.ZeroAddress,       // paymentToken
        0,                        // payment
        ethers.ZeroAddress        // paymentReceiver
      ]);
      
      // 生成随机 salt
      const saltNonce = Math.floor(Math.random() * 1000000);
      
      console.log('📝 Preparing Safe deployment transaction...');
      console.log('Salt nonce:', saltNonce);
      
      // 检查用户余额
      const userAddress = await this.signer!.getAddress();
      const balance = await this.provider!.getBalance(userAddress);
      console.log('💰 用户地址:', userAddress);
      console.log('💰 用户余额:', ethers.formatEther(balance), 'ETH');
      
      if (balance === BigInt(0)) {
        throw new Error('账户余额为0，无法支付gas费用。请先获取一些Sepolia ETH。');
      }
      
      // 估算 gas，添加兼容性处理
      console.log('📝 开始估算gas...');
      let gasEstimate: bigint;
      try {
        gasEstimate = await factoryContract.createProxyWithNonce.estimateGas(
          safeContracts.safeSingleton,
          initializer,
          saltNonce,
          {
            // 强制使用传统gas价格，避免EIP-1559
            gasPrice: BigInt(20000000000) // 20 Gwei
          }
        );
      } catch (estimateError) {
        console.warn('⚠️ Gas估算失败，使用默认值:', estimateError);
        // 使用默认gas限制
        gasEstimate = BigInt(500000); // 500k gas
      }
      
      console.log('⛽ Estimated gas:', gasEstimate.toString());
      
      // 获取gas价格，兼容不同网络
      let gasPrice: bigint;
      try {
        const feeData = await this.provider!.getFeeData();
        gasPrice = feeData.gasPrice || BigInt(20000000000); // 20 Gwei fallback
      } catch (feeError) {
        console.warn('⚠️ 无法获取fee data，使用默认gas价格:', feeError);
        // 直接使用默认gas价格，避免进一步的API调用错误
        gasPrice = BigInt(20000000000); // 20 Gwei
      }
      
      const estimatedCost = gasEstimate * gasPrice;
      console.log('💲 预估gas成本:', ethers.formatEther(estimatedCost), 'ETH');
      
      if (balance < estimatedCost) {
        throw new Error(`余额不足以支付gas费用。需要: ${ethers.formatEther(estimatedCost)} ETH，当前: ${ethers.formatEther(balance)} ETH`);
      }
      
      // 发送交易创建 Safe，使用兼容的gas配置
      const txOptions: any = {
        gasLimit: gasEstimate * BigInt(120) / BigInt(100), // 增加20%的gas余量
        gasPrice: gasPrice // 使用传统gas价格而非EIP-1559
      };
      
      const tx = await factoryContract.createProxyWithNonce(
        safeContracts.safeSingleton,
        initializer,
        saltNonce,
        txOptions
      );
      
      console.log('📤 Transaction sent:', tx.hash);
      console.log('⏳ Waiting for confirmation...');
      
      // 等待交易确认
      const receipt = await tx.wait();
      
      if (!receipt) {
        throw new Error('Transaction receipt is null');
      }
      
      console.log('✅ Transaction confirmed in block:', receipt.blockNumber);
      
      // 从事件日志中提取 Safe 地址
      let safeAddress = '';
      
      console.log('📋 交易日志数量:', receipt.logs.length);
      
      // 查找 ProxyCreation 事件
      for (let i = 0; i < receipt.logs.length; i++) {
        const log = receipt.logs[i];
        console.log(`📜 日志 ${i}:`, {
          address: log.address,
          topics: log.topics,
          data: log.data
        });
        
        try {
          // 多种方式尝试提取Safe地址
          
          // 方法1: 查找ProxyCreation事件
          const proxyCreationTopic = ethers.id('ProxyCreation(address,address)');
          if (log.topics[0] === proxyCreationTopic) {
            safeAddress = '0x' + log.topics[1].slice(26);
            console.log('🎉 方法1成功 - ProxyCreation事件，Safe地址:', safeAddress);
            break;
          }
          
          // 方法2: 查找来自Factory合约的事件
          if (log.address.toLowerCase() === safeContracts.safeFactory.toLowerCase()) {
            console.log('📍 Factory合约事件，尝试提取地址...');
            
            // 从topics中提取地址
            for (let j = 1; j < log.topics.length; j++) {
              const topic = log.topics[j];
              if (topic && topic.length === 66) {
                const potentialAddress = '0x' + topic.slice(26);
                if (ethers.isAddress(potentialAddress) && potentialAddress !== ethers.ZeroAddress) {
                  console.log(`🎉 方法2成功 - 从topic[${j}]提取到地址:`, potentialAddress);
                  safeAddress = potentialAddress;
                  break;
                }
              }
            }
            
            if (safeAddress) break;
          }
          
          // 方法3: 尝试从任何日志的data中提取地址
          if (log.data && log.data.length >= 66) {
            try {
              const dataAddress = '0x' + log.data.slice(26, 66);
              if (ethers.isAddress(dataAddress) && dataAddress !== ethers.ZeroAddress) {
                console.log('🎉 方法3成功 - 从data中提取到地址:', dataAddress);
                safeAddress = dataAddress;
                break;
              }
            } catch (dataError) {
              console.warn('解析data失败:', dataError);
            }
          }
        } catch (error) {
          console.warn('Failed to parse log:', error);
        }
      }
      
      // 如果从事件中没有找到地址，尝试其他方法
      if (!safeAddress) {
        console.warn('⚠️ 未从事件中找到Safe地址，尝试计算预期地址...');
        
        // 尝试使用CREATE2计算预期地址
        try {
          const create2Address = ethers.getCreate2Address(
            safeContracts.safeFactory,
            ethers.solidityPackedKeccak256(['uint256'], [saltNonce]),
            ethers.keccak256('0x608060405234801561001057600080fd5b506040516101e63803806101e68339818101604052602081101561003357600080fd5b8101908080519060200190929190505050600073ffffffffffffffffffffffffffffffffffffffff168173ffffffffffffffffffffffffffffffffffffffff1614156100ca576040517f08c379a00000000000000000000000000000000000000000000000000000000081526004018080602001828103825260248152602001806101c26024913960400191505060405180910390fd5b806000806101000a81548173ffffffffffffffffffffffffffffffffffffffff021916908373ffffffffffffffffffffffffffffffffffffffff1602179055505061010e565b60a58061013d6000396000f3fe608060405273ffffffffffffffffffffffffffffffffffffffff600054167fa619486e0000000000000000000000000000000000000000000000000000000060003514156050578060005260206000f35b3660008037600080366000845af43d6000803e60008114156070573d6000fd5b3d6000f3fea2646970667358221220d1429297349653a4918076d650332de1a1068c5f3e07c5c82360c277770b955264736f6c63430007060033496e76616c6964206d617374657220636f707920616464726573732070726f7669646564')
          );
          
          console.log('🧮 计算的CREATE2地址:', create2Address);
          
          // 验证这个地址是否有代码（即是否已部署）
          const code = await this.provider!.getCode(create2Address);
          if (code !== '0x') {
            console.log('✅ 找到已部署的合约，使用计算地址');
            safeAddress = create2Address;
          }
        } catch (create2Error) {
          console.warn('CREATE2地址计算失败:', create2Error);
        }
      }
      
      // 最后的fallback：提供交易哈希让用户手动查找
      if (!safeAddress) {
        const etherscanUrl = `https://sepolia.etherscan.io/tx/${tx.hash}`;
        const errorMsg = `✅ Safe创建交易已成功提交！\n\n` +
                        `但自动提取Safe地址失败。请手动查看：\n` +
                        `🔗 交易链接: ${etherscanUrl}\n\n` +
                        `在交易详情中查找 'ProxyCreation' 事件，\n` +
                        `其中包含您的Safe地址。`;
        throw new Error(errorMsg);
      }
      
      console.log('🎉 Safe created successfully!');
      console.log('📍 Safe address:', safeAddress);
      console.log('🔗 Transaction hash:', tx.hash);
      console.log('⛽ Gas used:', receipt.gasUsed.toString());
      
      return {
        address: safeAddress,
        transactionHash: tx.hash,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString()
      };
      
    } catch (error) {
      console.error('❌ Failed to create Safe:', error);
      
      if (error instanceof Error) {
        // 记录详细错误信息
        console.error('🔴 Safe创建失败详情:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        
        // 获取当前网络信息用于错误消息
        let currentChainId = 0;
        let networkName = 'unknown';
        
        try {
          const network = await this.provider!.getNetwork();
          currentChainId = Number(network.chainId);
          networkName = getNetworkConfig(currentChainId).name;
        } catch (networkError) {
          console.warn('Failed to get network info for error message:', networkError);
        }
        
        // 处理常见错误
        if (error.message.includes('insufficient funds')) {
          throw new Error(`Insufficient ETH balance to pay for gas fees. Please add more ${networkName} ETH to your wallet.`);
        } else if (error.message.includes('user rejected')) {
          throw new Error('Transaction was rejected by user.');
        } else if (error.message.includes('network')) {
          throw new Error('Network error. Please check your connection and try again.');
        } else if (error.message.includes('Safe contracts not configured')) {
          throw new Error(`Safe is not supported on this network (Chain ID: ${currentChainId}). Please switch to a supported network.`);
        }
      }
      
      throw error;
    }
  }

  async getSafeInfo(safeAddress: string) {
    this.checkInitialized();
    
    try {
      console.log('📋 Getting Safe info for:', safeAddress);
      
      // Safe 合约 ABI (简化版)
      const SAFE_ABI = [
        {
          "inputs": [],
          "name": "getOwners",
          "outputs": [{"internalType": "address[]", "name": "", "type": "address[]"}],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "getThreshold",
          "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
          "stateMutability": "view",
          "type": "function"
        },
        {
          "inputs": [],
          "name": "nonce",
          "outputs": [{"internalType": "uint256", "name": "", "type": "uint256"}],
          "stateMutability": "view",
          "type": "function"
        }
      ];
      
      // 创建 Safe 合约实例
      const safeContract = new ethers.Contract(safeAddress, SAFE_ABI, this.provider);
      
      // 并行获取 Safe 信息
      const [owners, threshold, nonce] = await Promise.all([
        safeContract.getOwners(),
        safeContract.getThreshold(),
        safeContract.nonce()
      ]);
      
      console.log('✅ Safe info retrieved successfully');
      
      return {
        address: safeAddress,
        owners: owners,
        threshold: Number(threshold),
        nonce: Number(nonce)
      };
      
    } catch (error) {
      console.error('❌ Failed to get Safe info:', error);
      
      // 返回默认值，避免页面崩溃
      return {
        address: safeAddress,
        owners: [],
        threshold: 0,
        nonce: 0
      };
    }
  }
}

// 单例模式
export const safeService = new SafeService();
