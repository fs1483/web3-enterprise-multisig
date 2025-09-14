import React from 'react';
import { clsx } from 'clsx';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger';
  size?: 'sm' | 'md' | 'lg';
  isLoading?: boolean;
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  isLoading = false,
  disabled,
  children,
  className,
  ...props
}) => {
  const baseClasses = 'inline-flex items-center justify-center font-bold rounded-2xl transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed shadow-lg transform hover:scale-105 active:scale-95';
  
  const variantClasses = {
    primary: 'bg-gradient-to-r from-blue-600 via-blue-700 to-indigo-700 text-white hover:from-blue-700 hover:via-blue-800 hover:to-indigo-800 hover:shadow-2xl focus:ring-blue-500 shadow-blue-500/25',
    secondary: 'bg-gradient-to-r from-gray-600 via-gray-700 to-slate-700 text-white hover:from-gray-700 hover:via-gray-800 hover:to-slate-800 hover:shadow-2xl focus:ring-gray-500 shadow-gray-500/25',
    outline: 'border-2 border-gray-300 bg-white/80 backdrop-blur-sm text-gray-700 hover:bg-white hover:border-gray-400 hover:shadow-xl focus:ring-gray-500 shadow-gray-300/25',
    ghost: 'text-gray-700 hover:bg-gray-100/80 backdrop-blur-sm focus:ring-gray-500',
    danger: 'bg-gradient-to-r from-red-600 via-red-700 to-pink-700 text-white hover:from-red-700 hover:via-red-800 hover:to-pink-800 hover:shadow-2xl focus:ring-red-500 shadow-red-500/25',
  };

  const sizeClasses = {
    sm: 'px-5 py-3 text-sm',
    md: 'px-8 py-4 text-lg',
    lg: 'px-10 py-5 text-xl',
  };

  return (
    <button
      className={clsx(
        baseClasses,
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading && (
        <div className="mr-3">
          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
        </div>
      )}
      {children}
    </button>
  );
};
