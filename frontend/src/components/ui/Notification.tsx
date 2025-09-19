// =====================================================
// 现代化通知组件 - 中央弹出式设计
// 版本: v2.0
// 功能: 提供成功、错误、警告、信息等类型的通知
// 设计: 参考现代UI库(Ant Design, Chakra UI, Mantine)
// 位置: 页面中央弹出，更好的用户体验
// 作者: sfan
// 更新时间: 2025-09-19
// =====================================================

import React, { useEffect, useState } from 'react';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  X 
} from 'lucide-react';

export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface NotificationProps {
  type: NotificationType;
  title: string;
  message?: string;
  duration?: number; // 自动关闭时间（毫秒），0表示不自动关闭
  onClose?: () => void;
  show: boolean;
}

const Notification: React.FC<NotificationProps> = ({
  type,
  title,
  message,
  duration = 4000,
  onClose,
  show
}) => {
  const [isVisible, setIsVisible] = useState(show);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (show) {
      setIsVisible(true);
      // 延迟一帧以确保动画效果
      requestAnimationFrame(() => {
        setIsAnimating(true);
      });
      
      if (duration > 0) {
        const timer = setTimeout(() => {
          handleClose();
        }, duration);
        
        return () => clearTimeout(timer);
      }
    }
  }, [show, duration]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      setIsVisible(false);
      onClose?.();
    }, 300); // 等待动画完成
  };

  if (!isVisible) return null;

  const getIcon = () => {
    const iconClass = "w-6 h-6 flex-shrink-0";
    switch (type) {
      case 'success':
        return <CheckCircle className={`${iconClass} text-green-500`} />;
      case 'error':
        return <XCircle className={`${iconClass} text-red-500`} />;
      case 'warning':
        return <AlertTriangle className={`${iconClass} text-amber-500`} />;
      case 'info':
        return <Info className={`${iconClass} text-blue-500`} />;
      default:
        return <Info className={`${iconClass} text-gray-500`} />;
    }
  };

  const getNotificationStyles = () => {
    const baseStyles = `
      relative w-full max-w-sm mx-auto
      bg-white dark:bg-gray-800
      rounded-xl shadow-2xl border
      overflow-hidden
      backdrop-blur-sm
    `;
    
    switch (type) {
      case 'success':
        return `${baseStyles} border-green-200 dark:border-green-700`;
      case 'error':
        return `${baseStyles} border-red-200 dark:border-red-700`;
      case 'warning':
        return `${baseStyles} border-amber-200 dark:border-amber-700`;
      case 'info':
        return `${baseStyles} border-blue-200 dark:border-blue-700`;
      default:
        return `${baseStyles} border-gray-200 dark:border-gray-700`;
    }
  };

  const getAccentBar = () => {
    const barClass = "absolute top-0 left-0 w-full h-1";
    switch (type) {
      case 'success':
        return `${barClass} bg-gradient-to-r from-green-400 to-green-600`;
      case 'error':
        return `${barClass} bg-gradient-to-r from-red-400 to-red-600`;
      case 'warning':
        return `${barClass} bg-gradient-to-r from-amber-400 to-amber-600`;
      case 'info':
        return `${barClass} bg-gradient-to-r from-blue-400 to-blue-600`;
      default:
        return `${barClass} bg-gradient-to-r from-gray-400 to-gray-600`;
    }
  };

  const getTitleStyles = () => {
    switch (type) {
      case 'success':
        return 'text-green-800 dark:text-green-200';
      case 'error':
        return 'text-red-800 dark:text-red-200';
      case 'warning':
        return 'text-amber-800 dark:text-amber-200';
      case 'info':
        return 'text-blue-800 dark:text-blue-200';
      default:
        return 'text-gray-800 dark:text-gray-200';
    }
  };

  const getMessageStyles = () => {
    switch (type) {
      case 'success':
        return 'text-green-700 dark:text-green-300';
      case 'error':
        return 'text-red-700 dark:text-red-300';
      case 'warning':
        return 'text-amber-700 dark:text-amber-300';
      case 'info':
        return 'text-blue-700 dark:text-blue-300';
      default:
        return 'text-gray-700 dark:text-gray-300';
    }
  };

  const getCloseButtonStyles = () => {
    const baseClass = `
      absolute top-3 right-3 p-1.5 rounded-lg
      transition-all duration-200 ease-in-out
      hover:scale-110 active:scale-95
      focus:outline-none focus:ring-2 focus:ring-offset-2
    `;
    
    switch (type) {
      case 'success':
        return `${baseClass} text-green-400 hover:text-green-600 hover:bg-green-50 focus:ring-green-500 dark:hover:bg-green-900/20`;
      case 'error':
        return `${baseClass} text-red-400 hover:text-red-600 hover:bg-red-50 focus:ring-red-500 dark:hover:bg-red-900/20`;
      case 'warning':
        return `${baseClass} text-amber-400 hover:text-amber-600 hover:bg-amber-50 focus:ring-amber-500 dark:hover:bg-amber-900/20`;
      case 'info':
        return `${baseClass} text-blue-400 hover:text-blue-600 hover:bg-blue-50 focus:ring-blue-500 dark:hover:bg-blue-900/20`;
      default:
        return `${baseClass} text-gray-400 hover:text-gray-600 hover:bg-gray-50 focus:ring-gray-500 dark:hover:bg-gray-900/20`;
    }
  };

  return (
    <>
      {/* 背景遮罩 */}
      <div 
        className={`
          fixed inset-0 z-50 flex items-start justify-center pt-20
          transition-all duration-300 ease-out
          ${isAnimating ? 'opacity-100' : 'opacity-0'}
        `}
        style={{ pointerEvents: isAnimating ? 'auto' : 'none' }}
      >
        {/* 通知卡片 */}
        <div
          className={`
            ${getNotificationStyles()}
            transform transition-all duration-300 ease-out
            ${isAnimating 
              ? 'translate-y-0 opacity-100 scale-100' 
              : '-translate-y-8 opacity-0 scale-95'
            }
          `}
          role="alert"
          aria-live="polite"
        >
          {/* 顶部彩色条 */}
          <div className={getAccentBar()} />
          
          {/* 主要内容区域 */}
          <div className="p-4 pr-12">
            <div className="flex items-start space-x-3">
              {/* 图标 */}
              <div className="mt-0.5">
                {getIcon()}
              </div>
              
              {/* 文本内容 */}
              <div className="flex-1 min-w-0">
                <h3 className={`
                  text-sm font-semibold leading-5
                  ${getTitleStyles()}
                `}>
                  {title}
                </h3>
                {message && (
                  <p className={`
                    mt-1 text-sm leading-5
                    ${getMessageStyles()}
                  `}>
                    {message}
                  </p>
                )}
              </div>
            </div>
          </div>
          
          {/* 关闭按钮 */}
          <button
            onClick={handleClose}
            className={getCloseButtonStyles()}
            aria-label="关闭通知"
          >
            <X className="w-4 h-4" />
          </button>
          
          {/* 进度条（如果有自动关闭时间） */}
          {duration > 0 && (
            <div className="absolute bottom-0 left-0 w-full h-1 bg-gray-200 dark:bg-gray-700 overflow-hidden">
              <div 
                className={`
                  h-full transition-all ease-linear
                  ${type === 'success' ? 'bg-green-500' : ''}
                  ${type === 'error' ? 'bg-red-500' : ''}
                  ${type === 'warning' ? 'bg-amber-500' : ''}
                  ${type === 'info' ? 'bg-blue-500' : ''}
                `}
                style={{
                  width: '100%',
                  transition: `width ${duration}ms linear`,
                  transform: 'scaleX(1)',
                  transformOrigin: 'left',
                  animation: `shrink-progress ${duration}ms linear forwards`
                }}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Notification;
