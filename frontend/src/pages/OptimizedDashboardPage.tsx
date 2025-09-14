import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout } from '../components/layout/Layout';
import { DashboardCards } from '../components/dashboard/DashboardCards';
import { PendingProposalsWidget } from '../components/dashboard/PendingProposalsWidget';

/**
 * 优化后的Dashboard页面
 * 专注于两个核心卡片：提案中心和资产概况
 * 使用新的 /api/v1/dashboard/cards API接口，避免信息过载
 */
export const OptimizedDashboardPage: React.FC = () => {
  const navigate = useNavigate();

  return (
    <Layout>
      <div className="p-6 space-y-8">
        {/* 页面标题 */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-gray-900">
            Dashboard
          </h1>
        </div>

        {/* 快速操作区域 */}
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg p-6 border border-blue-100">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            快速操作
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <button 
              onClick={() => navigate('/proposals/create')}
              className="bg-white hover:bg-gray-50 border border-gray-200 rounded-lg p-4 text-left transition-colors"
            >
              <div className="text-blue-600 font-medium">创建新提案</div>
              <div className="text-sm text-gray-600 mt-1">发起新的多签交易提案</div>
            </button>
            <button 
              onClick={() => navigate('/safes/create')}
              className="bg-white hover:bg-gray-50 border border-gray-200 rounded-lg p-4 text-left transition-colors"
            >
              <div className="text-green-600 font-medium">创建Safe钱包</div>
              <div className="text-sm text-gray-600 mt-1">部署新的多签钱包</div>
            </button>
            <button 
              onClick={() => navigate('/safes')}
              className="bg-white hover:bg-gray-50 border border-gray-200 rounded-lg p-4 text-left transition-colors"
            >
              <div className="text-purple-600 font-medium">查看所有Safe</div>
              <div className="text-sm text-gray-600 mt-1">管理您的多签钱包</div>
            </button>
          </div>
        </div>

        {/* Dashboard概览 */}
        <div className="space-y-4">
          {/* <h2 className="text-xl font-semibold text-gray-900">
            Dashboard概览
          </h2>
          <p className="text-gray-600">
            提案中心和资产概况的关键数据
          </p> */}
          <DashboardCards />
        </div>

        {/* 待处理提案详情 */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">
              待处理提案
            </h2>
            <span className="text-sm text-gray-500">
              需要您关注的提案
            </span>
          </div>
          <PendingProposalsWidget />
        </div>


      </div>
    </Layout>
  );
};

export default OptimizedDashboardPage;
