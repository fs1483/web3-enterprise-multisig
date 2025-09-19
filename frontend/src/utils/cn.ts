// =====================================================
// Class Name Utility
// 版本: v1.0
// 功能: 合并CSS类名的工具函数
// 作者: sfan
// 创建时间: 2024-05-27
// =====================================================

export function cn(...classes: (string | undefined | null | boolean)[]): string {
  return classes
    .filter(Boolean)
    .join(' ')
    .trim();
}
