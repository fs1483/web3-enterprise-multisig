import { ethers } from 'ethers';

/**
 * 企业级Web3 ETH金额处理工具类
 * 处理ETH和Wei之间的转换，确保精度和安全性
 */

/**
 * 将ETH转换为Wei
 * @param ethValue ETH金额字符串或数字
 * @returns Wei金额字符串
 */
export function ethToWei(ethValue: string | number): string {
  try {
    // 处理空值或无效值
    if (!ethValue || ethValue === '' || ethValue === '0') {
      return '0';
    }
    
    // 转换为字符串并清理
    const cleanValue = String(ethValue).trim();
    
    // 验证是否为有效数字
    if (!/^\d*\.?\d*$/.test(cleanValue)) {
      throw new Error('Invalid ETH amount format');
    }
    
    // 使用ethers.js进行精确转换
    return ethers.parseEther(cleanValue).toString();
  } catch (error) {
    console.error('ETH to Wei conversion error:', error);
    throw new Error(`Invalid ETH amount: ${ethValue}`);
  }
}

/**
 * 将Wei转换为ETH
 * @param weiValue Wei金额字符串
 * @returns ETH金额字符串
 */
export function weiToEth(weiValue: string | number): string {
  try {
    if (!weiValue || weiValue === '' || weiValue === '0') {
      return '0';
    }
    
    const cleanValue = String(weiValue).trim();
    return ethers.formatEther(cleanValue);
  } catch (error) {
    console.error('Wei to ETH conversion error:', error);
    throw new Error(`Invalid Wei amount: ${weiValue}`);
  }
}

/**
 * 格式化ETH金额显示
 * @param ethValue ETH金额
 * @param decimals 小数位数，默认4位
 * @returns 格式化的ETH金额字符串
 */
export function formatEthAmount(ethValue: string | number, decimals: number = 4): string {
  try {
    const value = parseFloat(String(ethValue));
    if (isNaN(value)) return '0';
    
    // 对于很小的金额，显示更多小数位
    if (value > 0 && value < 0.0001) {
      return value.toFixed(8);
    }
    
    return value.toFixed(decimals);
  } catch (error) {
    return '0';
  }
}

/**
 * 验证ETH金额格式
 * @param ethValue ETH金额字符串
 * @returns 验证结果和错误信息
 */
export function validateEthAmount(ethValue: string): { isValid: boolean; error?: string } {
  if (!ethValue || ethValue.trim() === '') {
    return { isValid: false, error: 'Amount is required' };
  }
  
  const cleanValue = ethValue.trim();
  
  // 检查基本格式
  if (!/^\d*\.?\d*$/.test(cleanValue)) {
    return { isValid: false, error: 'Invalid number format' };
  }
  
  // 检查是否为负数
  const numValue = parseFloat(cleanValue);
  if (numValue < 0) {
    return { isValid: false, error: 'Amount cannot be negative' };
  }
  
  // 检查小数位数（ETH最多18位小数）
  const decimalParts = cleanValue.split('.');
  if (decimalParts.length > 1 && decimalParts[1].length > 18) {
    return { isValid: false, error: 'Too many decimal places (max 18)' };
  }
  
  // 检查是否超过合理范围（防止溢出）
  if (numValue > 1000000) {
    return { isValid: false, error: 'Amount too large' };
  }
  
  try {
    // 尝试转换为Wei验证
    ethers.parseEther(cleanValue);
    return { isValid: true };
  } catch (error) {
    return { isValid: false, error: 'Invalid ETH amount' };
  }
}

/**
 * 企业级ETH金额输入建议
 */
export const ETH_INPUT_SUGGESTIONS = {
  // 常用金额
  COMMON_AMOUNTS: ['0.001', '0.01', '0.1', '1', '10'],
  
  // 最小转账金额（考虑Gas费用）
  MIN_TRANSFER_AMOUNT: '0.001',
  
  // 推荐小数位数
  RECOMMENDED_DECIMALS: 4,
  
  // 最大小数位数
  MAX_DECIMALS: 18,
};

/**
 * 获取ETH金额输入的步长
 * @param currentValue 当前值
 * @returns 合适的步长
 */
export function getEthInputStep(currentValue?: string): string {
  if (!currentValue) return '0.001';
  
  const value = parseFloat(currentValue);
  if (value < 0.01) return '0.001';
  if (value < 0.1) return '0.01';
  if (value < 1) return '0.1';
  return '1';
}
