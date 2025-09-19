import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Layout } from './layout/Layout';
import { Card } from './ui/Card';
import { Button } from './ui/Button';
import { 
  Shield, 
  Users, 
  Settings, 
  Activity,
  Globe,
  Building,
  Zap,
  ChevronRight
} from 'lucide-react';

// 导入子组件
import SystemLevelPermissions from './permissions/SystemLevelPermissions';
import SafeLevelPermissions from './permissions/SafeLevelPermissions';
import OperationLevelPermissions from './permissions/OperationLevelPermissions';

interface PermissionLevel {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  subModules: SubModule[];
}

interface SubModule {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
}

const UnifiedPermissionManagement: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [activeLevel, setActiveLevel] = useState<string>('system');
  const [activeSubModule, setActiveSubModule] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>('');

  const { user, token } = useAuthStore();

  // 处理URL参数，自动切换到指定的Tab和Safe
  useEffect(() => {
    const tab = searchParams.get('tab');
    
    if (tab === 'safe') {
      console.log('🔄 URL参数处理: 切换到Safe级权限');
      setActiveLevel('safe');
      // 从Safe卡片跳转时，自动切换到成员管理Tab
      console.log('🔄 URL参数处理: 设置activeSubModule为member-management');
      setActiveSubModule('member-management');
    }
  }, [searchParams]);

  const isAdmin = user?.role === 'admin' || user?.role === 'super_admin';
  const isAuthenticated = !!token && !!user;

  const permissionLevels: PermissionLevel[] = [
    {
      id: 'system',
      name: '系统级权限管理',
      description: '管理用户对整个平台的访问权限',
      icon: <Globe className="w-5 h-5" />,
      color: 'blue',
      subModules: [
        {
          id: 'user-management',
          name: '用户管理',
          description: '用户注册审核、角色分配、状态管理',
          icon: <Users className="w-4 h-4" />
        },
        {
          id: 'system-config',
          name: '系统配置',
          description: '全局策略、安全设置、健康监控',
          icon: <Settings className="w-4 h-4" />
        },
        {
          id: 'system-init',
          name: '系统初始化',
          description: '超管初始化、基础数据配置',
          icon: <Zap className="w-4 h-4" />
        }
      ]
    },
    {
      id: 'safe',
      name: 'Safe级权限管理',
      description: '管理用户在特定Safe内的角色权限',
      icon: <Building className="w-5 h-5" />,
      color: 'green',
      subModules: [
        {
          id: 'safe-selector',
          name: 'Safe选择器',
          description: 'Safe列表、信息展示、快速切换',
          icon: <Building className="w-4 h-4" />
        },
        {
          id: 'member-management',
          name: '成员管理',
          description: '成员列表、角色分配、邀请移除',
          icon: <Users className="w-4 h-4" />
        },
        {
          id: 'role-config',
          name: '角色配置',
          description: '角色定义、权限配置、继承关系',
          icon: <Shield className="w-4 h-4" />
        },
        {
          id: 'permission-templates',
          name: '权限模板',
          description: '预定义模板、快速应用、自定义创建',
          icon: <Settings className="w-4 h-4" />
        }
      ]
    },
    {
      id: 'operation',
      name: '权限字典',
      description: '定义和管理系统中所有可用的权限原子',
      icon: <Zap className="w-5 h-5" />,
      color: 'purple',
      subModules: [
        {
          id: 'permission-definitions',
          name: '权限定义',
          description: '权限列表、分类描述、依赖关系',
          icon: <Shield className="w-4 h-4" />
        },
        {
          id: 'audit-logs',
          name: '审计日志',
          description: '操作记录、验证日志、异常告警',
          icon: <Activity className="w-4 h-4" />
        },
        {
          id: 'permission-monitoring',
          name: '权限监控',
          description: '使用统计、分布分析、实时状态',
          icon: <Activity className="w-4 h-4" />
        }
      ]
    }
  ];

  useEffect(() => {
    const currentLevel = permissionLevels.find(level => level.id === activeLevel);
    const tab = searchParams.get('tab');
    const isFromSafeJump = tab === 'safe'; // 是否来自Safe卡片跳转
    const shouldSetDefault = currentLevel && 
      currentLevel.subModules && 
      currentLevel.subModules.length > 0 && 
      !activeSubModule && 
      !isFromSafeJump; // 如果是从Safe跳转来的，不设置默认值
    
    console.log('🔍 默认子模块检查:', {
      activeLevel,
      activeSubModule,
      isFromSafeJump,
      hasCurrentLevel: !!currentLevel,
      hasSubModules: (currentLevel?.subModules?.length || 0) > 0,
      shouldSetDefault
    });
    
    if (shouldSetDefault) {
      console.log('🔄 设置默认子模块:', currentLevel.subModules[0].id);
      setActiveSubModule(currentLevel.subModules[0].id);
    }
  }, [activeLevel, activeSubModule, permissionLevels, searchParams]);

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-6">
          <Card className="p-8 text-center">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">需要登录</h2>
            <p className="text-gray-600 mb-4">请先登录以访问权限管理功能</p>
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              前往登录
            </Button>
          </Card>
        </div>
      </Layout>
    );
  }

  if (!isAdmin) {
    return (
      <Layout>
        <div className="max-w-4xl mx-auto p-6">
          <Card className="p-8 text-center">
            <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">访问受限</h2>
            <p className="text-gray-600 mb-4">只有管理员才能访问权限管理功能</p>
            <div className="text-sm text-gray-500">
              当前用户角色: <span className="font-medium">{user?.role || '未知'}</span>
            </div>
          </Card>
        </div>
      </Layout>
    );
  }

  const currentLevel = permissionLevels.find(level => level.id === activeLevel);

  const renderLevelSelector = () => (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {permissionLevels.map((level) => (
        <div
          key={level.id}
          className={`cursor-pointer transition-all duration-200 hover:shadow-lg rounded-lg border ${
            activeLevel === level.id 
              ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200' 
              : 'border-gray-200 hover:bg-gray-50'
          }`}
          onClick={() => {
            setActiveLevel(level.id);
            setActiveSubModule('');
          }}
        >
          <div className="p-6">
            <div className="flex items-center mb-3">
              <div className="p-2 rounded-lg bg-blue-100 text-blue-600 mr-3">
                {level.icon}
              </div>
              <h3 className="text-lg font-semibold text-gray-900">{level.name}</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">{level.description}</p>
            <div className="flex items-center text-sm text-gray-500">
              <span>{level.subModules.length} 个功能模块</span>
              <ChevronRight className="w-4 h-4 ml-1" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderSubModuleNav = () => {
    if (!currentLevel) return null;

    return (
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {currentLevel.subModules.map((module) => (
            <button
              key={module.id}
              onClick={() => setActiveSubModule(module.id)}
              className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeSubModule === module.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {module.icon}
              {module.name}
            </button>
          ))}
        </nav>
      </div>
    );
  };

  const renderContent = () => {
    if (!activeSubModule) {
      return (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <Shield className="w-16 h-16 mx-auto" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">选择功能模块</h3>
          <p className="text-gray-500">请从上方选择一个功能模块开始管理权限</p>
        </div>
      );
    }

    switch (activeLevel) {
      case 'system':
        return (
          <SystemLevelPermissions 
            activeModule={activeSubModule}
            onError={setError}
            onLoading={setIsLoading}
          />
        );
      case 'safe':
        return (
          <SafeLevelPermissions 
            activeModule={activeSubModule}
            onError={setError}
            onLoading={setIsLoading}
            preSelectedSafeId={searchParams.get('safeId') || undefined}
          />
        );
      case 'operation':
        return (
          <OperationLevelPermissions 
            activeModule={activeSubModule}
            onError={setError}
            onLoading={setIsLoading}
          />
        );
      default:
        return null;
    }
  };

  return (
    <Layout>
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Shield className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-gray-900">企业级权限管理</h1>
          </div>
          <p className="text-gray-600">
            基于三层权限架构的统一权限管理系统
          </p>
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-blue-800 text-sm">
              当前用户: <strong>{user?.email}</strong> | 
              角色: <strong>{user?.role}</strong> | 
              权限级别: <strong>管理员</strong>
            </p>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="text-red-600 text-sm">{error}</div>
              <button 
                onClick={() => setError('')}
                className="ml-auto text-red-400 hover:text-red-600"
              >
                ×
              </button>
            </div>
          </div>
        )}

        {isLoading && (
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-3"></div>
              <div className="text-blue-600 text-sm">正在加载...</div>
            </div>
          </div>
        )}

        {renderLevelSelector()}

        <Card>
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center text-sm text-gray-500">
              <span>权限管理</span>
              {currentLevel && (
                <>
                  <ChevronRight className="w-4 h-4 mx-2" />
                  <span className="text-gray-700">{currentLevel.name}</span>
                </>
              )}
            </div>
          </div>

          {currentLevel && (
            <div className="px-6">
              {renderSubModuleNav()}
            </div>
          )}

          <div className="p-6">
            {renderContent()}
          </div>
        </Card>
      </div>
    </Layout>
  );
};

export default UnifiedPermissionManagement;
