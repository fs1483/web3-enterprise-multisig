import React from 'react';
import { Layout } from '../components/layout/Layout';
import { Users, UserPlus, Shield, Settings, Crown, Star } from 'lucide-react';

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

          {/* 即将推出的功能预览 */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <UserPlus className="h-6 w-6 text-blue-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">成员邀请</h3>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                通过邮件邀请新成员加入您的团队，支持批量邀请和自定义权限设置
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">邮件邀请</span>
                <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded">批量操作</span>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <Shield className="h-6 w-6 text-purple-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">角色管理</h3>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                创建和管理自定义角色，为不同团队成员分配合适的权限级别
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">自定义角色</span>
                <span className="px-2 py-1 bg-purple-100 text-purple-800 text-xs rounded">权限模板</span>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <Settings className="h-6 w-6 text-orange-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">团队设置</h3>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                配置团队级别的设置，包括通知偏好、工作流程和安全策略
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">通知设置</span>
                <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded">工作流程</span>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center mb-4">
                <Star className="h-6 w-6 text-yellow-600 mr-3" />
                <h3 className="text-lg font-semibold text-gray-900">活动监控</h3>
              </div>
              <p className="text-gray-600 text-sm mb-4">
                实时监控团队成员的活动，包括登录记录、操作日志和安全事件
              </p>
              <div className="flex flex-wrap gap-2">
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">活动日志</span>
                <span className="px-2 py-1 bg-yellow-100 text-yellow-800 text-xs rounded">安全监控</span>
              </div>
            </div>
          </div>

          {/* 角色层级预览 */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Crown className="h-5 w-5 text-yellow-600 mr-2" />
              团队角色层级
            </h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                  <span className="font-medium text-gray-900">超级管理员</span>
                </div>
                <span className="text-sm text-gray-600">完全控制权限</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-orange-500 rounded-full mr-3"></div>
                  <span className="font-medium text-gray-900">管理员</span>
                </div>
                <span className="text-sm text-gray-600">管理团队和Safe</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                  <span className="font-medium text-gray-900">成员</span>
                </div>
                <span className="text-sm text-gray-600">参与提案和签名</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center">
                  <div className="w-3 h-3 bg-gray-500 rounded-full mr-3"></div>
                  <span className="font-medium text-gray-900">观察者</span>
                </div>
                <span className="text-sm text-gray-600">只读权限</span>
              </div>
            </div>
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
