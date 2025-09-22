// =====================================================
// 角色权限配置
// 定义不同角色的菜单、页面和操作权限
// =====================================================

export interface RolePermissions {
  menus: string[];           // 可访问的菜单
  pages: string[];           // 可访问的页面
  buttons: string[];         // 可使用的按钮/操作
  apis: string[];           // 可调用的API
}

// 角色权限映射
export const ROLE_PERMISSIONS: Record<string, RolePermissions> = {
  // 超级管理员 - 拥有所有权限
  super_admin: {
    menus: ['*'], // 所有菜单
    pages: ['*'], // 所有页面
    buttons: ['*'], // 所有操作
    apis: ['*'] // 所有API
  },

  // 管理员 - 除系统管理外的所有权限
  admin: {
    menus: [
      'system.menu.dashboard',
      'system.menu.proposals',
      'system.menu.safes',
      'system.menu.transactions',
      'system.menu.permissions',
      'system.menu.policies',
      'system.menu.analytics',
      'system.menu.team',
      'system.menu.settings'
    ],
    pages: [
      'page.dashboard',
      'page.proposals',
      'page.safes',
      'page.transactions',
      'page.permissions',
      'page.policies',
      'page.analytics',
      'page.team',
      'page.settings'
    ],
    buttons: [
      'button.proposal.create',
      'button.proposal.edit',
      'button.proposal.delete',
      'button.safe.create',
      'button.safe.edit',
      'button.safe.delete',
      'button.member.add',
      'button.member.edit',
      'button.member.remove',
      'button.role.create',
      'button.role.edit',
      'button.role.delete',
      'button.policy.create',
      'button.policy.edit',
      'button.policy.delete'
    ],
    apis: ['*'] // 管理员可以调用所有API
  },

  // 普通用户 - 基础操作权限
  user: {
    menus: [
      'system.menu.dashboard',
      'system.menu.proposals',
      'system.menu.safes',
      'system.menu.transactions',
      'system.menu.analytics'
    ],
    pages: [
      'page.dashboard',
      'page.proposals',
      'page.safes',
      'page.transactions',
      'page.analytics'
    ],
    buttons: [
      'button.proposal.create',
      'button.proposal.edit', // 只能编辑自己创建的
      'button.safe.create',
      'button.transaction.view'
    ],
    apis: [
      'api.proposals.list',
      'api.proposals.create',
      'api.proposals.update',
      'api.safes.list',
      'api.safes.create',
      'api.transactions.list'
    ]
  },

  // 查看者 - 只读权限
  viewer: {
    menus: [
      'system.menu.dashboard',
      'system.menu.proposals',
      'system.menu.safes',
      'system.menu.transactions',
      'system.menu.analytics'
    ],
    pages: [
      'page.dashboard',
      'page.proposals',
      'page.safes',
      'page.transactions',
      'page.analytics'
    ],
    buttons: [
      // 查看者没有任何操作按钮权限
    ],
    apis: [
      'api.proposals.list',
      'api.safes.list',
      'api.transactions.list',
      'api.analytics.view'
    ]
  }
};

// 检查用户是否有特定权限
export const hasRolePermission = (
  userRole: string,
  permissionType: 'menus' | 'pages' | 'buttons' | 'apis',
  permission: string
): boolean => {
  const rolePermissions = ROLE_PERMISSIONS[userRole];
  if (!rolePermissions) return false;

  const permissions = rolePermissions[permissionType];
  
  // 如果有通配符权限，返回true
  if (permissions.includes('*')) return true;
  
  // 检查是否有具体权限
  return permissions.includes(permission);
};

// 获取用户的所有权限
export const getUserPermissions = (userRole: string): RolePermissions => {
  return ROLE_PERMISSIONS[userRole] || {
    menus: [],
    pages: [],
    buttons: [],
    apis: []
  };
};

// 菜单权限检查
export const hasMenuPermission = (userRole: string, menuCode: string): boolean => {
  return hasRolePermission(userRole, 'menus', menuCode);
};

// 页面权限检查
export const hasPagePermission = (userRole: string, pageCode: string): boolean => {
  return hasRolePermission(userRole, 'pages', pageCode);
};

// 按钮权限检查
export const hasButtonPermission = (userRole: string, buttonCode: string): boolean => {
  return hasRolePermission(userRole, 'buttons', buttonCode);
};

// API权限检查
export const hasAPIPermission = (userRole: string, apiCode: string): boolean => {
  return hasRolePermission(userRole, 'apis', apiCode);
};
