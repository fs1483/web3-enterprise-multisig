import React from 'react';
import { Layout } from '../components/layout/Layout';
import { Users } from 'lucide-react';

export const TeamPage: React.FC = () => {
  return (
    <Layout>
      <div className="p-8">
        <div className="max-w-4xl mx-auto">
          {/* 页面标题 */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className="p-3 bg-green-100 rounded-full">
                <Users className="h-8 w-8 text-green-600" />
              </div>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">团队管理</h1>
            <p className="text-lg text-gray-600">管理您的团队成员和协作权限</p>
          </div>


          {/* 即将推出提示 */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 p-8 text-center">
            <div className="max-w-md mx-auto">
              <div className="text-green-600 mb-4">
                <Users className="h-12 w-12 mx-auto" />
              </div>
              <h2 className="text-xl font-semibold text-green-900 mb-2">功能开发中</h2>
              <p className="text-green-700 mb-4">
                我们正在开发完整的团队管理功能，包括成员邀请、角色分配和协作工具。
              </p>
              <div className="inline-flex items-center px-4 py-2 bg-green-100 text-green-800 rounded-full text-sm font-medium">
                <Users className="h-4 w-4 mr-2" />
                敬请期待
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
};

export default TeamPage;
