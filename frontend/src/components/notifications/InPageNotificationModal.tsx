import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, Bell, FileText, CheckCircle, Shield, AlertTriangle, Info } from 'lucide-react';
import type { Notification as CustomNotification } from '../../stores/notificationStore';

interface InPageNotificationModalProps {
  notification: CustomNotification | null;
  onClose: () => void;
  onAction?: (action: 'view' | 'ignore') => void;
}

const InPageNotificationModal: React.FC<InPageNotificationModalProps> = ({
  notification,
  onClose,
  onAction
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [countdown, setCountdown] = useState(8);

  useEffect(() => {
    if (notification) {
      setIsVisible(true);
      setCountdown(8);
      
      // 自动关闭倒计时
      const timer = setInterval(() => {
        setCountdown(prev => {
          if (prev <= 1) {
            handleClose();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    } else {
      setIsVisible(false);
    }
  }, [notification]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => onClose(), 300); // 等待动画完成
  };

  const handleAction = (action: 'view' | 'ignore') => {
    onAction?.(action);
    handleClose();
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  // 获取通知图标
  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'new_proposal_created':
        return <FileText className="w-6 h-6 text-blue-600" />;
      case 'proposal_signed':
        return <CheckCircle className="w-6 h-6 text-green-600" />;
      case 'proposal_executed':
        return <CheckCircle className="w-6 h-6 text-purple-600" />;
      case 'safe_created':
        return <Shield className="w-6 h-6 text-indigo-600" />;
      case 'warning':
        return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
      case 'error':
        return <AlertTriangle className="w-6 h-6 text-red-600" />;
      default:
        return <Bell className="w-6 h-6 text-gray-600" />;
    }
  };

  // 获取通知样式
  const getNotificationStyle = (type: string) => {
    switch (type) {
      case 'new_proposal_created':
        return 'border-blue-500 bg-blue-50';
      case 'proposal_signed':
        return 'border-green-500 bg-green-50';
      case 'proposal_executed':
        return 'border-purple-500 bg-purple-50';
      case 'safe_created':
        return 'border-indigo-500 bg-indigo-50';
      case 'warning':
        return 'border-yellow-500 bg-yellow-50';
      case 'error':
        return 'border-red-500 bg-red-50';
      default:
        return 'border-gray-500 bg-gray-50';
    }
  };

  // 格式化时间
  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString('zh-CN', {
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (!notification) return null;

  return createPortal(
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-300 ${
        isVisible ? 'opacity-100 backdrop-blur-sm' : 'opacity-0 pointer-events-none'
      }`}
      style={{ backgroundColor: 'rgba(0, 0, 0, 0.4)' }}
      onClick={handleBackdropClick}
    >
      <div
        className={`relative bg-white rounded-xl shadow-2xl border-l-4 max-w-md w-full transform transition-all duration-300 ${
          isVisible ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'
        } ${getNotificationStyle(notification.type)}`}
      >
        {/* 关闭按钮 */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-1 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* 倒计时指示器 */}
        <div className="absolute top-3 left-3 flex items-center space-x-1 text-xs text-gray-500">
          <div className="w-2 h-2 bg-gray-400 rounded-full animate-pulse" />
          <span>{countdown}s</span>
        </div>

        {/* 通知内容 */}
        <div className="p-6 pt-8">
          {/* 头部 */}
          <div className="flex items-start space-x-4 mb-4">
            <div className="flex-shrink-0 mt-1">
              {getNotificationIcon(notification.type)}
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 mb-1">
                {notification.title}
              </h3>
              <p className="text-sm text-gray-600 mb-2">
                {notification.message}
              </p>
              <div className="flex items-center text-xs text-gray-500">
                <Info className="w-3 h-3 mr-1" />
                <span>{formatTime(notification.timestamp)}</span>
              </div>
            </div>
          </div>

          {/* 操作按钮 */}
          <div className="flex space-x-3 pt-4 border-t border-gray-200">
            <button
              onClick={() => handleAction('view')}
              className="flex-1 px-4 py-2 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            >
              查看详情
            </button>
            <button
              onClick={() => handleAction('ignore')}
              className="px-4 py-2 text-gray-600 text-sm font-medium border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              忽略
            </button>
          </div>
        </div>

        {/* 进度条 */}
        <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-xl overflow-hidden">
          <div
            className="h-full bg-blue-500 transition-all duration-1000 ease-linear"
            style={{
              width: `${((8 - countdown) / 8) * 100}%`
            }}
          />
        </div>
      </div>
    </div>,
    document.body
  );
};

export default InPageNotificationModal;
