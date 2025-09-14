import React, { useEffect } from 'react';
import { RefreshCw, AlertCircle } from 'lucide-react';
import { useDashboardStore } from '../../stores/dashboardStore';
import ProposalCenterCard from './ProposalCenterCard';
import AssetOverviewCard from './AssetOverviewCard';

/**
 * Dashboard卡片容器组件
 * 管理提案中心和资产概况两个核心卡片的数据获取和显示
 * 使用新的 /api/v1/dashboard/cards API接口
 */
export const DashboardCards: React.FC = () => {
  // 从store获取状态和方法
  const { 
    cardsData, 
    loading, 
    error, 
    fetchDashboardCards 
  } = useDashboardStore();

  // 组件挂载时获取数据
  useEffect(() => {
    fetchDashboardCards();
  }, [fetchDashboardCards]);

  // 手动刷新数据
  const handleRefresh = () => {
    // clearError();
    fetchDashboardCards();
  };

  // 错误状态显示
  if (error && !cardsData) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center space-x-3">
            <AlertCircle className="h-6 w-6 text-red-500 flex-shrink-0" />
            <div className="flex-1">
              <h3 className="text-sm font-medium text-red-800">数据加载失败</h3>
              <p className="text-sm text-red-700 mt-1">{error}</p>
            </div>
            <button
              onClick={handleRefresh}
              className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm font-medium transition-colors"
            >
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 卡片标题和刷新按钮 */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Dashboard概览</h2>
          <p className="text-sm text-gray-600 mt-1">
            提案中心和资产概况的实时数据
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {/* 最后更新时间 */}
          {cardsData?.lastUpdated && (
            <span className="text-xs text-gray-500">
              更新于: {new Date(cardsData.lastUpdated).toLocaleString('zh-CN')}
            </span>
          )}
          
          {/* 刷新按钮 */}
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="flex items-center space-x-2 bg-blue-500 hover:bg-blue-600 disabled:bg-blue-300 text-white px-3 py-2 rounded-lg text-sm font-medium transition-colors"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
            <span>{loading ? '刷新中...' : '刷新'}</span>
          </button>
        </div>
      </div>

      {/* 错误提示（有数据但刷新失败时显示） */}
      {error && cardsData && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <div className="flex items-center space-x-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            <span className="text-sm text-yellow-800">
              数据刷新失败: {error}，显示的是缓存数据
            </span>
            <button
              onClick={() => {/* TODO: Add clearError function */}}
              className="text-yellow-600 hover:text-yellow-800 text-sm underline ml-auto"
            >
              忽略
            </button>
          </div>
        </div>
      )}

      {/* 卡片网格布局 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 提案中心卡片 */}
        <ProposalCenterCard 
          data={cardsData?.proposalCenter || null}
          loading={loading && !cardsData}
        />

        {/* 资产概况卡片 */}
        <AssetOverviewCard 
          data={cardsData?.assetOverview || null}
          loading={loading && !cardsData}
        />
      </div>

    </div>
  );
};

export default DashboardCards;
