// =====================================================
// 操作级权限管理模块
// 版本: v1.0
// 功能: 操作级权限管理，包含权限定义、审计日志、权限监控
// 作者: sfan
// 创建时间: 2024-08-11
// =====================================================

import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import PermissionDefinitions from './PermissionDefinitions';
import { 
  Shield, 
  Activity,
  Eye,
  Plus,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  User,
  Calendar,
  BarChart3
} from 'lucide-react';

// =====================================================
// 类型定义
// =====================================================


interface AuditLog {
  id: string;
  user_id: string;
  user_email: string;
  safe_id?: string;
  safe_name?: string;
  action: string;
  resource_type: string;
  resource_id: string;
  old_permissions?: string[];
  new_permissions?: string[];
  result: string;
  error_message?: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

interface PermissionStats {
  total_permissions: number;
  system_permissions: number;
  custom_permissions: number;
  active_users: number;
  recent_changes: number;
}

interface OperationLevelPermissionsProps {
  activeModule: string;
  onError: (error: string) => void;
  onLoading: (loading: boolean) => void;
}

// =====================================================
// 主组件
// =====================================================

const OperationLevelPermissions: React.FC<OperationLevelPermissionsProps> = ({
  activeModule,
  onError,
  onLoading
}) => {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [permissionStats, setPermissionStats] = useState<PermissionStats | null>(null);
  const [dateRange, setDateRange] = useState('7d');
  const [refreshing, setRefreshing] = useState(false);

  const { token } = useAuthStore();


  // 获取审计日志
  const fetchAuditLogs = async () => {
    try {
      setRefreshing(true);
      onLoading(true);
      
      const params = new URLSearchParams({
        limit: '50',
        date_range: dateRange
      });
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/audit-logs?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setAuditLogs(data.logs || data || []);
        onError('');
      } else {
        onError(`获取审计日志失败: ${response.status}`);
      }
    } catch (error) {
      console.error('获取审计日志失败:', error);
      onError('获取审计日志失败');
    } finally {
      setRefreshing(false);
      onLoading(false);
    }
  };

  // 获取权限统计
  const fetchPermissionStats = async () => {
    try {
      onLoading(true);
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/permissions/stats`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setPermissionStats(data.stats || data);
        onError('');
      } else {
        onError('获取权限统计失败');
      }
    } catch (error) {
      console.error('获取权限统计失败:', error);
      onError('获取权限统计失败');
    } finally {
      onLoading(false);
    }
  };

  // 导出审计日志
  const exportAuditLogs = async () => {
    try {
      onLoading(true);
      
      const params = new URLSearchParams({
        format: 'csv',
        date_range: dateRange
      });
      
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080'}/api/v1/audit-logs/export?${params}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        a.download = `audit-logs-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        onError('');
      } else {
        onError('导出审计日志失败');
      }
    } catch (error) {
      console.error('导出审计日志失败:', error);
      onError('导出审计日志失败');
    } finally {
      onLoading(false);
    }
  };

  // 初始化数据
  useEffect(() => {
    if (activeModule === 'audit-logs') {
      fetchAuditLogs();
    } else if (activeModule === 'permission-monitoring') {
      fetchPermissionStats();
    }
  }, [activeModule]);

  // 渲染权限定义模块
  const renderPermissionDefinitions = () => <PermissionDefinitions />;

  // 渲染审计日志模块
  const renderAuditLogs = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <Activity className="w-5 h-5" />
            审计日志
          </h3>
          <p className="text-sm text-gray-600 mt-1">查看系统权限变更和操作记录</p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={exportAuditLogs}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Download className="w-4 h-4 mr-2" />
            导出日志
          </Button>
          <Button
            onClick={fetchAuditLogs}
            disabled={refreshing}
            className="bg-blue-600 hover:bg-blue-700 text-white"
          >
            {refreshing ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                刷新中
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4 mr-2" />
                刷新
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 时间范围选择 */}
      <Card className="p-4">
        <div className="flex items-center gap-4">
          <Calendar className="w-5 h-5 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">时间范围:</span>
          <select
            value={dateRange}
            onChange={(e) => {
              setDateRange(e.target.value);
              // 自动刷新数据
              setTimeout(fetchAuditLogs, 100);
            }}
            className="px-3 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="1d">最近1天</option>
            <option value="7d">最近7天</option>
            <option value="30d">最近30天</option>
            <option value="90d">最近90天</option>
          </select>
        </div>
      </Card>

      {/* 审计日志列表 */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  用户
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  操作
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  资源
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  结果
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  详情
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div className="flex items-center gap-2">
                      <Clock className="w-4 h-4 text-gray-400" />
                      {new Date(log.created_at).toLocaleString('zh-CN')}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <User className="w-4 h-4 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{log.user_email}</div>
                        <div className="text-xs text-gray-500">{log.ip_address}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                      {log.action}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <div>
                      <div>{log.resource_type}</div>
                      {log.safe_name && (
                        <div className="text-xs text-gray-500">Safe: {log.safe_name}</div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      {log.result === 'success' ? (
                        <>
                          <CheckCircle className="w-4 h-4 text-green-500" />
                          <span className="text-sm text-green-700">成功</span>
                        </>
                      ) : (
                        <>
                          <AlertTriangle className="w-4 h-4 text-red-500" />
                          <span className="text-sm text-red-700">失败</span>
                        </>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    <Button size="sm" className="bg-gray-600 hover:bg-gray-700 text-white">
                      <Eye className="w-3 h-3 mr-1" />
                      查看
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          
          {auditLogs.length === 0 && (
            <div className="text-center py-8">
              <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-500">暂无审计日志</p>
            </div>
          )}
        </div>
      </Card>
    </div>
  );


  // 渲染权限监控模块
  const renderPermissionMonitoring = () => (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
            <BarChart3 className="w-5 h-5" />
            权限监控
          </h3>
          <p className="text-sm text-gray-600 mt-1">监控权限使用情况和系统状态</p>
        </div>
        <Button
          onClick={fetchPermissionStats}
          className="bg-blue-600 hover:bg-blue-700 text-white"
        >
          <RefreshCw className="w-4 h-4 mr-2" />
          刷新数据
        </Button>
      </div>

      {/* 统计卡片 */}
      {permissionStats && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card className="p-6 bg-blue-50 border-blue-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-blue-800 mb-2">总权限数</h4>
                <p className="text-2xl font-bold text-blue-900">{permissionStats.total_permissions}</p>
              </div>
              <Shield className="w-8 h-8 text-blue-600" />
            </div>
          </Card>
          
          <Card className="p-6 bg-red-50 border-red-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-red-800 mb-2">系统权限</h4>
                <p className="text-2xl font-bold text-red-900">{permissionStats.system_permissions}</p>
              </div>
              <Shield className="w-8 h-8 text-red-600" />
            </div>
          </Card>
          
          <Card className="p-6 bg-green-50 border-green-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-green-800 mb-2">自定义权限</h4>
                <p className="text-2xl font-bold text-green-900">{permissionStats.custom_permissions}</p>
              </div>
              <Plus className="w-8 h-8 text-green-600" />
            </div>
          </Card>
          
          <Card className="p-6 bg-purple-50 border-purple-200">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-medium text-purple-800 mb-2">活跃用户</h4>
                <p className="text-2xl font-bold text-purple-900">{permissionStats.active_users}</p>
              </div>
              <User className="w-8 h-8 text-purple-600" />
            </div>
          </Card>
        </div>
      )}

      {/* 最近变更 */}
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-lg font-medium text-gray-900">最近权限变更</h4>
          <span className="text-sm text-gray-500">
            {permissionStats?.recent_changes || 0} 项变更
          </span>
        </div>
        
        <div className="space-y-3">
          {auditLogs.slice(0, 5).map((log) => (
            <div key={log.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-full ${
                  log.result === 'success' ? 'bg-green-100' : 'bg-red-100'
                }`}>
                  {log.result === 'success' ? (
                    <CheckCircle className="w-4 h-4 text-green-600" />
                  ) : (
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-900">
                    {log.user_email} {log.action}
                  </div>
                  <div className="text-xs text-gray-500">
                    {new Date(log.created_at).toLocaleString('zh-CN')}
                  </div>
                </div>
              </div>
              <Button size="sm" className="bg-gray-600 hover:bg-gray-700 text-white">
                <Eye className="w-3 h-3" />
              </Button>
            </div>
          ))}
        </div>
        
        {auditLogs.length === 0 && (
          <div className="text-center py-8">
            <Activity className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">暂无最近变更</p>
          </div>
        )}
      </Card>
    </div>
  );

  // 根据激活的模块渲染内容
  switch (activeModule) {
    case 'permission-definitions':
      return renderPermissionDefinitions();
    case 'audit-logs':
      return renderAuditLogs();
    case 'permission-monitoring':
      return renderPermissionMonitoring();
    default:
      return (
        <div className="text-center py-12">
          <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">操作级权限管理</h3>
          <p className="text-gray-500">请选择一个功能模块开始管理操作级权限</p>
        </div>
      );
  }
};

export default OperationLevelPermissions;
