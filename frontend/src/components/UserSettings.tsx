import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import ChangePassword from './ChangePassword';

interface UserProfile {
  id: string;
  email: string;
  username: string;
  full_name: string;
  avatar_url: string;
  role: string;
  email_verified: boolean;
  created_at: string;
}

const UserSettings: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'security'>('profile');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [editForm, setEditForm] = useState({
    full_name: '',
    avatar_url: ''
  });

  const { token, logout } = useAuthStore();

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await fetch('/api/v1/users/profile', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      if (response.ok) {
        const data = await response.json();
        setProfile(data.user);
        setEditForm({
          full_name: data.user.full_name || '',
          avatar_url: data.user.avatar_url || ''
        });
      }
    } catch (error) {
      console.error('获取用户资料失败:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/v1/users/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(editForm)
      });

      if (response.ok) {
        alert('资料更新成功！');
        setIsEditing(false);
        fetchProfile();
      } else {
        const data = await response.json();
        alert(`更新失败: ${data.error}`);
      }
    } catch (error) {
      console.error('更新资料失败:', error);
      alert('网络错误，请稍后重试');
    }
  };

  const handlePasswordChangeSuccess = () => {
    alert('密码修改成功！请重新登录。');
    logout();
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('zh-CN');
  };

  const getRoleName = (role: string) => {
    const roleMap: Record<string, string> = {
      'super_admin': '🔥 超级管理员',
      'admin': '管理员',
      'user': '普通用户',
      'viewer': '查看者'
    };
    return roleMap[role] || role;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-md">
        {/* 标题 */}
        <div className="border-b border-gray-200 px-6 py-4">
          <h1 className="text-2xl font-semibold text-gray-900">用户设置</h1>
          <p className="text-sm text-gray-600 mt-1">管理您的账户信息和安全设置</p>
        </div>

        {/* 标签页导航 */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6">
            {[
              { key: 'profile', label: '个人资料', icon: '👤' },
              { key: 'password', label: '修改密码', icon: '🔒' },
              { key: 'security', label: '安全设置', icon: '🛡️' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-4 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <span className="mr-2">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* 标签页内容 */}
        <div className="p-6">
          {activeTab === 'profile' && profile && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-lg font-medium text-gray-900">个人资料</h2>
                <button
                  onClick={() => setIsEditing(!isEditing)}
                  className="px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-md hover:bg-blue-100"
                >
                  {isEditing ? '取消编辑' : '编辑资料'}
                </button>
              </div>

              {isEditing ? (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      姓名
                    </label>
                    <input
                      type="text"
                      value={editForm.full_name}
                      onChange={(e) => setEditForm(prev => ({ ...prev, full_name: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="请输入您的姓名"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      头像URL
                    </label>
                    <input
                      type="url"
                      value={editForm.avatar_url}
                      onChange={(e) => setEditForm(prev => ({ ...prev, avatar_url: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="请输入头像图片URL"
                    />
                  </div>
                  <div className="flex space-x-3">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      保存更改
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsEditing(false)}
                      className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                    >
                      取消
                    </button>
                  </div>
                </form>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">邮箱</label>
                      <p className="mt-1 text-sm text-gray-900">{profile.email}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">用户名</label>
                      <p className="mt-1 text-sm text-gray-900">{profile.username}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">姓名</label>
                      <p className="mt-1 text-sm text-gray-900">{profile.full_name || '未设置'}</p>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-500">角色</label>
                      <span className="mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                        {getRoleName(profile.role)}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">邮箱验证状态</label>
                      <span className={`mt-1 inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        profile.email_verified 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {profile.email_verified ? '已验证' : '未验证'}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-500">注册时间</label>
                      <p className="mt-1 text-sm text-gray-900">{formatDate(profile.created_at)}</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'password' && (
            <div>
              <h2 className="text-lg font-medium text-gray-900 mb-4">修改密码</h2>
              <p className="text-sm text-gray-600 mb-6">
                为了您的账户安全，请定期更换密码。新密码应该包含至少8位字符。
              </p>
              <ChangePassword onSuccess={handlePasswordChangeSuccess} />
            </div>
          )}

          {activeTab === 'security' && (
            <div className="space-y-6">
              <h2 className="text-lg font-medium text-gray-900">安全设置</h2>
              
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-2">账户安全</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-700">两步验证</p>
                      <p className="text-xs text-gray-500">增强账户安全性</p>
                    </div>
                    <span className="text-xs text-gray-500">即将推出</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-700">登录通知</p>
                      <p className="text-xs text-gray-500">新设备登录时发送邮件通知</p>
                    </div>
                    <span className="text-xs text-gray-500">即将推出</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm text-gray-700">会话管理</p>
                      <p className="text-xs text-gray-500">查看和管理活跃会话</p>
                    </div>
                    <span className="text-xs text-gray-500">即将推出</span>
                  </div>
                </div>
              </div>

              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-red-800 mb-2">危险操作</h3>
                <p className="text-xs text-red-600 mb-3">
                  以下操作不可逆，请谨慎操作
                </p>
                <button
                  onClick={() => {
                    if (confirm('确定要注销账户吗？此操作不可逆！')) {
                      alert('账户注销功能即将推出');
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                >
                  注销账户
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSettings;
