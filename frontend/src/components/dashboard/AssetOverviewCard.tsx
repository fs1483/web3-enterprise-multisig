import React from 'react';
import { Wallet, Shield, TrendingUp } from 'lucide-react';
import type { AssetOverviewCard as AssetOverviewData } from '../../stores/dashboardStore';

interface AssetOverviewCardProps {
  data: AssetOverviewData | null;
  loading?: boolean;
}

/**
 * 资产概况卡片组件
 * 显示用户所有Safe的ETH余额汇总和Safe数量统计
 */
export const AssetOverviewCard: React.FC<AssetOverviewCardProps> = ({ data, loading }) => {
  // 加载状态显示
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-gray-200 rounded w-24"></div>
          <div className="h-8 w-8 bg-gray-200 rounded"></div>
        </div>
        <div className="space-y-4">
          <div className="h-12 bg-gray-200 rounded w-full"></div>
          <div className="h-8 bg-gray-200 rounded w-2/3"></div>
        </div>
      </div>
    );
  }

  // 数据不存在时的默认显示
  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">资产概况</h3>
          <Wallet className="h-8 w-8 text-green-500" />
        </div>
        <div className="text-center py-8 text-gray-500">
          暂无数据
        </div>
      </div>
    );
  }

  // 格式化ETH显示
  const formatETH = (ethAmount: string): string => {
    const amount = parseFloat(ethAmount);
    if (amount === 0) return '0.00';
    if (amount < 0.001) return '< 0.001';
    return amount.toFixed(4);
  };

  // 计算USD价值（模拟ETH价格，实际应该从API获取）
  const ethPriceUSD = 2500; // TODO: 从实际API获取ETH价格
  const totalUSD = (parseFloat(data.totalETH) * ethPriceUSD).toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD'
  });

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200">
      {/* 卡片标题 */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">资产概况</h3>
        <Wallet className="h-8 w-8 text-green-500" />
      </div>

      {/* 主要资产信息 */}
      <div className="space-y-6">
        {/* ETH余额显示 */}
        <div className="bg-gradient-to-r from-blue-50 to-green-50 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-600">总ETH余额</span>
            <TrendingUp className="h-5 w-5 text-green-500" />
          </div>
          <div className="space-y-1">
            <div className="flex items-baseline space-x-2">
              <span className="text-3xl font-bold text-gray-900">
                {formatETH(data.totalETH)}
              </span>
              <span className="text-lg font-medium text-gray-600">ETH</span>
            </div>
            <div className="text-sm text-gray-500">
              ≈ {totalUSD}
            </div>
          </div>
        </div>

        {/* Safe数量统计 */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-purple-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-purple-600">Safe钱包</p>
                <p className="text-2xl font-bold text-purple-700">{data.safeCount}</p>
              </div>
              <Shield className="h-6 w-6 text-purple-500" />
            </div>
          </div>

          <div className="bg-indigo-50 rounded-lg p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-indigo-600">平均余额</p>
                <p className="text-lg font-bold text-indigo-700">
                  {data.safeCount > 0 
                    ? formatETH((parseFloat(data.totalETH) / data.safeCount).toString())
                    : '0.00'
                  } ETH
                </p>
              </div>
              <div className="h-6 w-6 bg-indigo-500 rounded-full flex items-center justify-center">
                <span className="text-white text-xs font-bold">Ø</span>
              </div>
            </div>
          </div>
        </div>

        {/* 资产状态指示器 */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-100">
          <div className="flex items-center space-x-2">
            <div className="h-2 w-2 bg-green-500 rounded-full"></div>
            <span className="text-sm text-gray-600">资产状态正常</span>
          </div>
          <span className="text-xs text-gray-500">
            实时更新
          </span>
        </div>

        {/* 操作提示 */}
        {parseFloat(data.totalETH) === 0 && (
          <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-800">
              您的Safe钱包余额为空，请先向Safe地址转入ETH
            </p>
          </div>
        )}

        {data.safeCount === 0 && (
          <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
            <p className="text-sm text-yellow-800">
              您还没有创建Safe钱包，点击创建您的第一个Safe
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetOverviewCard;
