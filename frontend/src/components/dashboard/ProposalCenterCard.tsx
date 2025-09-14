import React from 'react';
import { Clock, FileText, CheckCircle, TrendingUp } from 'lucide-react';
import type { ProposalCenterCard as ProposalCenterData } from '../../stores/dashboardStore';

interface ProposalCenterCardProps {
  data: ProposalCenterData | null;
  loading?: boolean;
}

/**
 * 提案中心卡片组件
 * 显示用户相关的提案统计信息，包括待签名提案、紧急提案、总提案数和通过率
 */
export const ProposalCenterCard: React.FC<ProposalCenterCardProps> = ({ data, loading }) => {
  // 加载状态显示
  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6 animate-pulse">
        <div className="flex items-center justify-between mb-4">
          <div className="h-6 bg-gray-200 rounded w-24"></div>
          <div className="h-8 w-8 bg-gray-200 rounded"></div>
        </div>
        <div className="space-y-3">
          <div className="h-4 bg-gray-200 rounded w-full"></div>
          <div className="h-4 bg-gray-200 rounded w-3/4"></div>
          <div className="h-4 bg-gray-200 rounded w-1/2"></div>
        </div>
      </div>
    );
  }

  // 数据不存在时的默认显示
  if (!data) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">提案中心</h3>
          <FileText className="h-8 w-8 text-blue-500" />
        </div>
        <div className="text-center py-8 text-gray-500">
          暂无数据
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow duration-200">
      {/* 卡片标题 */}
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">提案中心</h3>
        <FileText className="h-8 w-8 text-blue-500" />
      </div>

      {/* 统计数据网格 */}
      <div className="grid grid-cols-2 gap-4">
        {/* 待签名提案 */}
        <div className="bg-orange-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-orange-600">待签名</p>
              <p className="text-2xl font-bold text-orange-700">{data.pendingSignatures}</p>
            </div>
            <Clock className="h-6 w-6 text-orange-500" />
          </div>
        </div>

        {/* 紧急提案 */}
        <div className="bg-red-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-600">紧急提案</p>
              <p className="text-2xl font-bold text-red-700">{data.urgentProposals}</p>
            </div>
            <div className="h-6 w-6 bg-red-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">!</span>
            </div>
          </div>
        </div>

        {/* 总提案数 */}
        <div className="bg-blue-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-600">总提案</p>
              <p className="text-2xl font-bold text-blue-700">{data.totalProposals}</p>
            </div>
            <FileText className="h-6 w-6 text-blue-500" />
          </div>
        </div>

        {/* 已执行提案 */}
        <div className="bg-green-50 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-600">已执行</p>
              <p className="text-2xl font-bold text-green-700">{data.executedProposals}</p>
            </div>
            <CheckCircle className="h-6 w-6 text-green-500" />
          </div>
        </div>
      </div>

      {/* 通过率显示 */}
      <div className="mt-6 pt-4 border-t border-gray-100">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <TrendingUp className="h-5 w-5 text-gray-500" />
            <span className="text-sm font-medium text-gray-600">提案通过率</span>
          </div>
          <div className="flex items-center space-x-2">
            <span className="text-lg font-bold text-gray-900">{data.approvalRate}%</span>
            <div className="w-16 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-green-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(parseFloat(data.approvalRate), 100)}%` }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      {/* 操作提示 */}
      {data.pendingSignatures > 0 && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm text-yellow-800">
            您有 <span className="font-semibold">{data.pendingSignatures}</span> 个提案等待签名
          </p>
        </div>
      )}
    </div>
  );
};

export default ProposalCenterCard;
