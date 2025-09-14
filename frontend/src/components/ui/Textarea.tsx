import React from 'react';
import { clsx } from 'clsx';

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
  helperText?: string;
}

export const Textarea: React.FC<TextareaProps> = ({
  label,
  error,
  helperText,
  className,
  id,
  ...props
}) => {
  const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={textareaId}
          className="block text-sm font-medium text-gray-900 mb-2"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={clsx(
          // Base styles optimized for Tailwind v4
          'w-full px-4 py-3 text-base font-medium',
          'bg-white/95 backdrop-blur-sm',
          'border-2 border-gray-200 rounded-xl',
          'shadow-sm shadow-gray-900/5',
          'transition-all duration-300 ease-out',
          // Focus states
          'focus:outline-none focus:ring-4 focus:ring-blue-500/20',
          'focus:border-blue-500 focus:bg-white',
          'focus:shadow-lg focus:shadow-blue-500/10',
          // Hover states
          'hover:border-gray-300 hover:shadow-md hover:shadow-gray-900/10',
          // Disabled states
          'disabled:bg-gray-50 disabled:border-gray-200',
          'disabled:text-gray-400 disabled:cursor-not-allowed',
          // Placeholder
          'placeholder:text-gray-400 placeholder:font-normal',
          // Textarea specific
          'resize-none',
          // Error states
          error && [
            'border-red-300 focus:border-red-500 focus:ring-red-500/20',
            'bg-red-50/50 focus:bg-red-50'
          ],
          className
        )}
        {...props}
      />
      {helperText && !error && (
        <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
          <p className="text-sm text-blue-700 flex items-center gap-2 font-medium">
            <span className="text-base">💡</span>
            {helperText}
          </p>
        </div>
      )}
      {error && (
        <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-700 flex items-center gap-2 font-medium">
            <span className="text-base">⚠️</span>
            {error}
          </p>
        </div>
      )}
    </div>
  );
};
