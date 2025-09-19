import React, { useState } from 'react';
import { Settings, Map, Shield, Users } from 'lucide-react';
import PermissionMappingManager from './PermissionMappingManager';
import PermissionDefinitions from './PermissionDefinitions';
import SystemLevelPermissions from './SystemLevelPermissions';
import SafeLevelPermissions from './SafeLevelPermissions';

export const PermissionManagementTabs: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'system' | 'safe' | 'definitions' | 'mappings'>('system');
  const [activeSafeModule, setActiveSafeModule] = useState<'safe-selector' | 'member-management' | 'role-config' | 'permission-templates'>('safe-selector');
  const [error, setError] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);

  const tabs = [
    {
      id: 'system' as const,
      name: '系统权限管理',
      icon: Shield,
      description: '管理系统级权限和用户角色'
    },
    {
      id: 'safe' as const,
      name: 'Safe权限管理',
      icon: Users,
      description: '管理Safe级权限和成员角色'
    },
    {
      id: 'definitions' as const,
      name: '权限定义',
      icon: Settings,
      description: '管理系统权限定义'
    },
    {
      id: 'mappings' as const,
      name: '权限映射',
      icon: Map,
      description: '管理权限与UI元素的映射关系'
    }
  ];

  return (
    <div className="space-y-6">
      {/* 标签页导航 */}
      <div className="bg-white rounded-lg shadow">
        <div className="border-b border-gray-200">
          <nav className="-mb-px flex space-x-8 px-6" aria-label="Tabs">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`
                    group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                    ${activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }
                  `}
                >
                  <Icon
                    className={`
                      -ml-0.5 mr-2 h-5 w-5
                      ${activeTab === tab.id
                        ? 'text-blue-500'
                        : 'text-gray-400 group-hover:text-gray-500'
                      }
                    `}
                  />
                  <div className="text-left">
                    <div>{tab.name}</div>
                    <div className="text-xs text-gray-400 font-normal">
                      {tab.description}
                    </div>
                  </div>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* 错误提示 */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <div className="text-red-800">{error}</div>
        </div>
      )}

      {/* 加载状态 */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">加载中...</span>
        </div>
      )}

      {/* 标签页内容 */}
      <div className="min-h-[600px]">
        {activeTab === 'system' && (
          <SystemLevelPermissions 
            activeModule="user-management"
            onError={setError}
            onLoading={setLoading}
          />
        )}
        {activeTab === 'safe' && (
          <div className="space-y-6">
            {/* Safe权限管理子标签页 */}
            <div className="bg-white rounded-lg shadow">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 px-6" aria-label="Safe权限管理">
                  {[
                    { id: 'safe-selector', name: 'Safe选择', description: '选择要管理的Safe' },
                    { id: 'member-management', name: '成员管理', description: '管理Safe成员' },
                    { id: 'role-config', name: '角色配置', description: '配置Safe角色' },
                    { id: 'permission-templates', name: '权限模板', description: '管理权限模板' }
                  ].map((subTab) => (
                    <button
                      key={subTab.id}
                      onClick={() => setActiveSafeModule(subTab.id as any)}
                      className={`
                        group inline-flex items-center py-4 px-1 border-b-2 font-medium text-sm
                        ${activeSafeModule === subTab.id
                          ? 'border-blue-500 text-blue-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                        }
                      `}
                    >
                      <div className="text-left">
                        <div>{subTab.name}</div>
                        <div className="text-xs text-gray-400 font-normal">
                          {subTab.description}
                        </div>
                      </div>
                    </button>
                  ))}
                </nav>
              </div>
            </div>

            {/* Safe权限管理内容 */}
            <SafeLevelPermissions 
              activeModule={activeSafeModule}
              onError={setError}
              onLoading={setLoading}
            />
          </div>
        )}
        {activeTab === 'definitions' && <PermissionDefinitions />}
        {activeTab === 'mappings' && <PermissionMappingManager />}
      </div>
    </div>
  );
};

export default PermissionManagementTabs;
