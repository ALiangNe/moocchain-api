import { CertificateTemplateInfo, CertificateTemplateInfoQueryParams } from '../types/certificateTemplateType';
import { getCertificateTemplate, postCertificateTemplate, putCertificateTemplate, getCertificateTemplateList } from '../models/certificateTemplateModel';
import { getUser } from '../models/userModel';
import { ROLE_ADMIN } from '../middlewares/roleMiddleware';

/**
 * 创建证书模板服务
 * 管理员创建新证书模板
 */
export async function createCertificateTemplateService(
  adminId: number,
  data: Partial<CertificateTemplateInfo>
): Promise<CertificateTemplateInfo> {
  // 检查管理员是否存在
  const admin = await getUser({ userId: adminId });
  if (!admin) {
    throw new Error('Admin not found');
  }

  // 检查管理员角色
  if (admin.role !== ROLE_ADMIN) {
    throw new Error('Only admins can create certificate templates');
  }

  // 注意：templateContent 的验证已在中间件中完成，这里不再重复验证

  // 检查模板名称是否已存在
  const existingTemplate = await getCertificateTemplate({ templateName: data.templateName });
  if (existingTemplate) {
    throw new Error('Template name already exists');
  }

  // 创建证书模板（默认启用）
  const params: Partial<CertificateTemplateInfo> = {
    ...data,
    createdBy: adminId,
    isActive: data.isActive !== undefined ? data.isActive : 1, // 默认启用
  };

  return await postCertificateTemplate(params);
}

/**
 * 更新证书模板服务
 * 管理员更新证书模板信息
 */
export async function updateCertificateTemplateService(
  adminId: number,
  templateId: number,
  data: Partial<CertificateTemplateInfo>
): Promise<CertificateTemplateInfo> {
  // 检查管理员是否存在
  const admin = await getUser({ userId: adminId });
  if (!admin) {
    throw new Error('Admin not found');
  }

  // 检查管理员角色
  if (admin.role !== ROLE_ADMIN) {
    throw new Error('Only admins can update certificate templates');
  }

  // 检查模板是否存在
  const template = await getCertificateTemplate({ templateId });
  if (!template) {
    throw new Error('Certificate template not found');
  }

  // 如果更新模板名称，检查是否与其他模板名称冲突
  if (data.templateName && data.templateName !== template.templateName) {
    const existingTemplate = await getCertificateTemplate({ templateName: data.templateName });
    if (existingTemplate && existingTemplate.templateId !== templateId) {
      throw new Error('Template name already exists');
    }
  }

  // 注意：templateContent 的验证已在中间件中完成，这里不再重复验证

  // 更新证书模板
  return await putCertificateTemplate(templateId, data);
}

/**
 * 获取证书模板列表服务
 * 支持按条件筛选和分页
 */
export async function getCertificateTemplateListService(
  params: CertificateTemplateInfoQueryParams,
  page: number = 1,
  pageSize: number = 10
): Promise<{ records: CertificateTemplateInfo[]; total: number }> {
  return await getCertificateTemplateList(params, page, pageSize);
}

/**
 * 获取证书模板详情服务
 * 根据模板ID获取模板信息
 */
export async function getCertificateTemplateService(templateId: number): Promise<CertificateTemplateInfo> {
  const template = await getCertificateTemplate({ templateId });
  if (!template) {
    throw new Error('Certificate template not found');
  }
  return template;
}
