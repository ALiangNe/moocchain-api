import { UserInfo } from './userType';

// 证书模板信息类型
export interface CertificateTemplateInfo {
  templateId?: number;          // 模板ID，自增
  templateName?: string;        // 模板名称
  templateContent?: string;     // 模板内容（JSON格式字符串，必填）
  createdBy?: number;           // 创建者ID（管理员ID），外键
  isActive?: number;            // 是否启用（0:禁用，1:启用）
  createdAt?: Date;             // 创建时间
  updatedAt?: Date;             // 更新时间
  // 完整的创建者信息对象
  creator?: UserInfo | null;    // 创建者完整信息
}

// 证书模板列表查询参数（用于 controller/service/model 透传）
export interface CertificateTemplateInfoQueryParams extends Partial<CertificateTemplateInfo> {
  startDate?: string;           // YYYY-MM-DD HH:mm:ss
  endDate?: string;             // YYYY-MM-DD HH:mm:ss
}