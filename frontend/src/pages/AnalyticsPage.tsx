import React from 'react';
import { Layout } from '../components/layout/Layout';
import { BarChart3, TrendingUp, Activity, PieChart } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  return (
    <Layout>
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          {/* 页面标题 */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-blue-100 rounded-full">
                <BarChart3 className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">数据分析</h1>
            <p className="text-lg text-gray-600">深入了解您的Safe钱包和提案数据</p>
          </div>

          {/* 即将推出的功能预览 */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <TrendingUp className="h-6 w-6 text-green-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">交易趋势</h3>
              </div>
              <p className="text-gray-600 text-sm">
                查看Safe钱包的交易量、频率和价值趋势分析
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <PieChart className="h-6 w-6 text-purple-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">资产分布</h3>
              </div>
              <p className="text-gray-600 text-sm">
                分析不同代币和资产在Safe钱包中的分布情况
              </p>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <Activity className="h-6 w-6 text-orange-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">活动统计</h3>
              </div>
              <p className="text-gray-600 text-sm">
                统计提案创建、签名、执行等各类活动的数据
              </p>
            </div>
          </div>

          {/* 即将推出提示 */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="text-blue-600 mb-4">
                <BarChart3 className="h-12 w-12 mx-auto" />
              </div>
              <h2 className="text-xl font-semibold text-blue-900 mb-2">功能开发中</h2>
              <p className="text-blue-700 mb-4">
                我们正在开发强大的数据分析功能，包括实时图表、自定义报表和深度洞察。
              </p>
              <div className="inline-flex items-center px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium">
                <Activity className="h-4 w-4 mr-2" />
                敬请期待
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default AnalyticsPage;
