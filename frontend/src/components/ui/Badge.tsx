// =====================================================
// Badge UI组件
// 版本: v1.0
// 功能: 提供标签样式的UI组件
// 作者: Cascade AI
// 创建时间: 2025-09-16
// =====================================================

import React from 'react';
import { cn } from '../../utils/cn';

// =====================================================
// 类型定义
// =====================================================

interface BadgeProps {
  children: React.ReactNode;
  variant?: 'default' | 'secondary' | 'outline' | 'success' | 'warning' | 'error';
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

// =====================================================
// Badge组件
// =====================================================

export const Badge: React.FC<BadgeProps> = ({
  children,
  variant = 'default',
  size = 'md',
  className,
}) => {
  const baseClasses = 'inline-flex items-center font-medium rounded-full border';
  
  const variantClasses = {
    default: 'bg-blue-100 text-blue-800 border-blue-200',
    secondary: 'bg-gray-100 text-gray-800 border-gray-200',
    outline: 'bg-transparent text-gray-700 border-gray-300',
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    error: 'bg-red-100 text-red-800 border-red-200',
  };
  
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-0.5 text-sm',
    lg: 'px-3 py-1 text-sm',
  };

  return (
    <span
      className={cn(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </span>
  );
};
