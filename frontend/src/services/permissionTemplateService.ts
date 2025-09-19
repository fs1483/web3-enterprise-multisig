// =====================================================
// 权限模板服务
// 版本: v1.0
// 功能: 提供权限模板管理的API接口
// 作者: Cascade AI
// 创建时间: 2025-09-16
// =====================================================

import { apiClient } from './apiClient';

// =====================================================
// 类型定义
// =====================================================

export interface RoleTemplate {
  id: string;
  name: string;
  display_name: string;
  description: string;
  category: 'safe' | 'system';
  permissions: string[];
  restrictions?: Record<string, any>;
  is_default: boolean;
}

export interface RoleTemplateResponse {
  success: boolean;
  data: {
    templates: RoleTemplate[] | Record<string, RoleTemplate[]>;
    category: string;
  };
}

export interface SingleTemplateResponse {
  success: boolean;
  template: RoleTemplate;
}

export interface RecommendedRoleResponse {
  success: boolean;
  recommended_role: RoleTemplate;
  user_id: string;
  safe_id: string;
}

export interface ApplyTemplateRequest {
  target_user_id: string;
}

export interface ValidationResponse {
  success: boolean;
  message: string;
  template?: RoleTemplate;
}

// =====================================================
// 权限模板服务类
// =====================================================

export class PermissionTemplateService {
  private static instance: PermissionTemplateService;

  public static getInstance(): PermissionTemplateService {
    if (!PermissionTemplateService.instance) {
      PermissionTemplateService.instance = new PermissionTemplateService();
    }
    return PermissionTemplateService.instance;
  }

  /**
   * 获取角色模板列表
   * @param category - 模板类别 ('all' | 'safe' | 'system')
   */
  async getRoleTemplates(category: 'all' | 'safe' | 'system' = 'all'): Promise<RoleTemplate[] | Record<string, RoleTemplate[]>> {
    try {
      const response = await apiClient.get<RoleTemplateResponse>('/role-templates', {
        params: { category }
      });
      
      if (response.data.success) {
        return response.data.data.templates;
      }
      throw new Error('获取角色模板失败');
    } catch (error) {
      console.error('获取角色模板失败:', error);
      throw error;
    }
  }

  /**
   * 获取单个角色模板
   * @param templateId - 模板ID
   */
  async getRoleTemplate(templateId: string): Promise<RoleTemplate> {
    try {
      const response = await apiClient.get<SingleTemplateResponse>(`/role-templates/${templateId}`);
      
      if (response.data.success) {
        return response.data.template;
      }
      throw new Error('获取角色模板失败');
    } catch (error) {
      console.error('获取角色模板失败:', error);
      throw error;
    }
  }

  /**
   * 获取Safe角色模板
   */
  async getSafeRoleTemplates(): Promise<RoleTemplate[]> {
    const templates = await this.getRoleTemplates('safe');
    return Array.isArray(templates) ? templates : [];
  }

  /**
   * 获取系统角色模板
   */
  async getSystemRoleTemplates(): Promise<RoleTemplate[]> {
    const templates = await this.getRoleTemplates('system');
    return Array.isArray(templates) ? templates : [];
  }

  /**
   * 应用角色模板到用户
   * @param safeId - Safe ID
   * @param templateId - 模板ID
   * @param targetUserId - 目标用户ID
   */
  async applyRoleTemplate(safeId: string, templateId: string, targetUserId: string): Promise<void> {
    try {
      const response = await apiClient.post(
        `/safes/${safeId}/apply-template/${templateId}`,
        { target_user_id: targetUserId }
      );
      
      if (!(response.data as any).success) {
        throw new Error((response.data as any).message || '应用角色模板失败');
      }
    } catch (error) {
      console.error('应用角色模板失败:', error);
      throw error;
    }
  }

  /**
   * 验证角色模板
   * @param template - 角色模板
   */
  async validateRoleTemplate(template: Omit<RoleTemplate, 'id'>): Promise<ValidationResponse> {
    try {
      const response = await apiClient.post<ValidationResponse>('/role-templates/validate', template);
      return response.data;
    } catch (error) {
      console.error('验证角色模板失败:', error);
      throw error;
    }
  }

  /**
   * 创建自定义角色模板
   * @param template - 角色模板
   */
  async createCustomRoleTemplate(template: Omit<RoleTemplate, 'id'>): Promise<RoleTemplate> {
    try {
      const response = await apiClient.post<ValidationResponse>('/role-templates/custom', template);
      
      if (response.data.success && response.data.template) {
        return response.data.template;
      }
      throw new Error(response.data.message || '创建自定义角色模板失败');
    } catch (error) {
      console.error('创建自定义角色模板失败:', error);
      throw error;
    }
  }

  /**
   * 获取推荐角色
   * @param safeId - Safe ID
   * @param userId - 用户ID (可选，默认为当前用户)
   */
  async getRecommendedRole(safeId: string, userId?: string): Promise<RoleTemplate> {
    try {
      const params = userId ? { user_id: userId } : {};
      const response = await apiClient.get<RecommendedRoleResponse>(
        `/safes/${safeId}/recommended-role`,
        { params }
      );
      
      if (response.data.success) {
        return response.data.recommended_role;
      }
      throw new Error('获取推荐角色失败');
    } catch (error) {
      console.error('获取推荐角色失败:', error);
      throw error;
    }
  }

  /**
   * 获取角色模板的权限描述
   * @param template - 角色模板
   */
  getPermissionDescriptions(template: RoleTemplate): Record<string, string> {
    const descriptions: Record<string, string> = {
      'safe.view': '查看Safe信息',
      'safe.manage': '管理Safe设置',
      'safe.member.view': '查看成员列表',
      'safe.member.manage': '管理成员权限',
      'safe.policy.view': '查看策略设置',
      'safe.policy.manage': '管理策略设置',
      'safe.audit.view': '查看审计日志',
      'proposal.create': '创建提案',
      'proposal.view': '查看提案',
      'proposal.manage': '管理提案',
      'proposal.sign': '签名提案',
      'proposal.execute': '执行提案',
      'proposal.reject': '拒绝提案',
      'signature.revoke': '撤销签名',
      'system.permission.view': '查看系统权限',
      'system.permission.manage': '管理系统权限',
      'system.policy.validate': '验证策略',
      'system.user.manage': '管理用户',
      'system.safe.manage': '管理Safe',
      'system.audit.view': '查看系统审计',
    };

    const result: Record<string, string> = {};
    template.permissions.forEach(permission => {
      result[permission] = descriptions[permission] || permission;
    });

    return result;
  }

  /**
   * 获取角色模板的限制描述
   * @param template - 角色模板
   */
  getRestrictionsDescription(template: RoleTemplate): string[] {
    if (!template.restrictions) return [];

    const descriptions: string[] = [];
    
    if (template.restrictions.max_transaction_amount) {
      descriptions.push(`最大交易金额: ${template.restrictions.max_transaction_amount}`);
    }
    
    if (template.restrictions.daily_limit) {
      descriptions.push(`每日操作限制: ${template.restrictions.daily_limit}`);
    }
    
    if (template.restrictions.require_approval) {
      descriptions.push('需要额外审批');
    }

    return descriptions;
  }

  /**
   * 检查角色模板是否适合用户
   * @param template - 角色模板
   * @param userRole - 用户当前角色
   */
  isTemplateAppropriate(template: RoleTemplate, userRole?: string): boolean {
    // 基本适用性检查
    if (template.category === 'system' && userRole !== 'admin') {
      return false;
    }

    return true;
  }
}

// 导出单例实例
export const permissionTemplateService = PermissionTemplateService.getInstance();
