import React from 'react';
import { Layout } from '../components/layout/Layout';
import { BarChart3, Activity } from 'lucide-react';

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
