import { ethers } from 'ethers';

/**
 * 生成钱包验证消息
 */
export function generateVerificationMessage(email: string, timestamp: number): string {
  return `Verify wallet ownership for MultisigSafe account:
Email: ${email}
Timestamp: ${timestamp}
Please sign this message to prove you own this wallet.`;
}

/**
 * 请求用户签名验证钱包所有权
 */
export async function verifyWalletOwnership(
  email: string,
  walletAddress: string
): Promise<{ signature: string; message: string; timestamp: number }> {
  if (!window.ethereum) {
    throw new Error('MetaMask is not installed');
  }

  const provider = new ethers.BrowserProvider(window.ethereum);
  const signer = await provider.getSigner();
  
  // 确保连接的地址匹配
  const connectedAddress = await signer.getAddress();
  if (connectedAddress.toLowerCase() !== walletAddress.toLowerCase()) {
    throw new Error('Connected wallet address does not match');
  }

  // 生成验证消息
  const timestamp = Date.now();
  const message = generateVerificationMessage(email, timestamp);

  try {
    // 请求用户签名
    const signature = await signer.signMessage(message);
    
    return {
      signature,
      message,
      timestamp
    };
  } catch (error) {
    if (error instanceof Error && error.message.includes('User denied')) {
      throw new Error('User rejected the signature request');
    }
    throw new Error('Failed to sign verification message');
  }
}

/**
 * 验证签名是否有效
 */
export function verifySignature(
  message: string,
  signature: string,
  expectedAddress: string
): boolean {
  try {
    const recoveredAddress = ethers.verifyMessage(message, signature);
    return recoveredAddress.toLowerCase() === expectedAddress.toLowerCase();
  } catch (error) {
    console.error('Signature verification failed:', error);
    return false;
  }
}
