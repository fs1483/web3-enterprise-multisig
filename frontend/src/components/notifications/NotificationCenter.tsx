import React, { useState, useEffect } from 'react';
import { useNotificationStore } from '../../stores/notificationStore';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { Bell, X, CheckCheck, Trash2, Check, ExternalLink } from 'lucide-react';
import type { Notification as CustomNotification } from '../../stores/notificationStore';
import NotificationPermissionChecker from './NotificationPermissionChecker';

/**
 * 通知中心组件
 * 显示实时通知和历史通知列表
 */
const NotificationCenter: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, token } = useAuthStore();
  const {
    notifications,
    wsState,
    markAsRead,
    markAllAsRead,
    removeNotification,
    clearNotifications,
    connectWebSocket,
    getUnreadCount,
  } = useNotificationStore();

  const [isOpen, setIsOpen] = useState(false);
  const [filter, setFilter] = useState<string>('all');

  // 自动连接WebSocket
  useEffect(() => {
    if (isAuthenticated && token && !wsState.connected && !wsState.connecting) {
      console.log('🔗 自动连接WebSocket用于通知');
      connectWebSocket(token);
    }

    return () => {
      // 组件卸载时不断开连接，保持全局连接
    };
  }, [isAuthenticated, token, wsState.connected, wsState.connecting, connectWebSocket]);

  // 处理通知点击
  const handleNotificationClick = (notification: CustomNotification) => {
    markAsRead(notification.id);
    
    // 根据通知类型导航
    if (notification.type === 'new_proposal_created' && notification.data?.proposal_id) {
      navigate(`/proposals/${notification.data.proposal_id}`);
    } else if (notification.type === 'safe_created' && notification.data?.safe_id) {
      navigate(`/safes/${notification.data.safe_id}`);
    }
    
    setIsOpen(false);
  };

  // 获取通知图标
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_proposal_created':
        return '📝';
      case 'proposal_signed':
        return '✍️';
      case 'proposal_executed':
        return '✅';
      case 'safe_created':
        return '🔐';
      case 'info':
        return 'ℹ️';
      case 'warning':
        return '⚠️';
      case 'error':
        return '❌';
      default:
        return '🔔';
    }
  };

  // 获取通知样式
  const getNotificationStyle = (notification: CustomNotification) => {
    const baseStyle = `p-4 border-l-4 cursor-pointer transition-colors ${
      notification.read ? 'bg-gray-50' : 'bg-blue-50'
    }`;

    switch (notification.type) {
      case 'new_proposal_created':
        return `${baseStyle} border-blue-500 hover:bg-blue-100`;
      case 'proposal_signed':
        return `${baseStyle} border-green-500 hover:bg-green-100`;
      case 'proposal_executed':
        return `${baseStyle} border-purple-500 hover:bg-purple-100`;
      case 'safe_created':
        return `${baseStyle} border-indigo-500 hover:bg-indigo-100`;
      case 'warning':
        return `${baseStyle} border-yellow-500 hover:bg-yellow-100`;
      case 'error':
        return `${baseStyle} border-red-500 hover:bg-red-100`;
      default:
        return `${baseStyle} border-gray-500 hover:bg-gray-100`;
    }
  };

  // 过滤通知
  const filteredNotifications = notifications.filter((notification: CustomNotification) => {
    if (filter === 'unread') return !notification.read;
    if (filter === 'read') return notification.read;
    if (filter === 'all') return true;
    return notification.type === filter;
  });

  const unreadCount = getUnreadCount();

  return (
    <div className="relative">
      {/* 通知铃铛按钮 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors"
      >
        <Bell className="w-6 h-6" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
        
        {/* WebSocket连接状态指示器 */}
        <div className={`absolute -bottom-1 -right-1 w-3 h-3 rounded-full ${
          wsState.connected ? 'bg-green-500' : wsState.connecting ? 'bg-yellow-500' : 'bg-red-500'
        }`} />
      </button>

      {/* 通知面板 */}
      {isOpen && (
        <div className="absolute right-0 top-full mt-2 w-96 max-h-[500px] overflow-hidden">
            {/* 权限检查 */}
            <div className="p-4">
              <NotificationPermissionChecker />
            </div>
            
            {/* 头部 */}
            <div className="p-4 border-b border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">通知中心</h3>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs rounded-full ${
                    wsState.connected 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {wsState.connected ? '已连接' : '未连接'}
                  </span>
                  <button
                    onClick={() => setIsOpen(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* 过滤器 */}
            {/* 过滤器 */}
            <div className="flex space-x-2 mt-3">
              <button
                onClick={() => setFilter('all')}
                className={`px-3 py-1 text-sm rounded-full ${
                  filter === 'all' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                全部
              </button>
              <button
                onClick={() => setFilter('unread')}
                className={`px-3 py-1 text-sm rounded-full ${
                  filter === 'unread' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                }`}
              >
                未读 ({unreadCount})
              </button>
            </div>

            {/* 操作按钮 */}
            {notifications.length > 0 && (
              <div className="flex space-x-2 mt-3">
                <button
                  onClick={markAllAsRead}
                  className="flex items-center space-x-1 px-3 py-1 text-sm text-blue-600 hover:text-blue-800"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>全部已读</span>
                </button>
                <button
                  onClick={clearNotifications}
                  className="flex items-center space-x-1 px-3 py-1 text-sm text-red-600 hover:text-red-800"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>清空</span>
                </button>
              </div>
            )}
          </div>

          {/* 通知列表 */}
          <div className="max-h-96 overflow-y-auto">
            {filteredNotifications.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <Bell className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>暂无通知</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {filteredNotifications.map((notification: CustomNotification) => (
                  <div
                    key={notification.id}
                    className={getNotificationStyle(notification)}
                    onClick={() => handleNotificationClick(notification)}
                  >
                    <div className="flex items-start space-x-3">
                      <span className="text-2xl flex-shrink-0">
                        {getNotificationIcon(notification.type)}
                      </span>
                      
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className={`text-sm font-medium ${
                            notification.read ? 'text-gray-700' : 'text-gray-900'
                          }`}>
                            {notification.title}
                          </h4>
                          
                          <div className="flex items-center space-x-1">
                            {!notification.read && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  markAsRead(notification.id);
                                }}
                                className="text-blue-600 hover:text-blue-800"
                              >
                                <Check className="w-4 h-4" />
                              </button>
                            )}
                            <button
                              onClick={() => removeNotification(notification.id)}
                              className="text-gray-400 hover:text-red-600"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                        
                        <p className={`text-sm mt-1 ${
                          notification.read ? 'text-gray-500' : 'text-gray-700'
                        }`}>
                          {notification.message}
                        </p>
                        
                        <p className="text-xs text-gray-400 mt-2">
                          {new Date(notification.timestamp).toLocaleString('zh-CN')}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* 底部 */}
          {notifications.length > 0 && (
            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => {
                  navigate('/notifications');
                  setIsOpen(false);
                }}
                className="w-full text-center text-sm text-blue-600 hover:text-blue-800 flex items-center justify-center space-x-1"
              >
                <span>查看全部通知</span>
                <ExternalLink className="w-4 h-4" />
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationCenter;
