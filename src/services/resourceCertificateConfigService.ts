import { ResourceCertificateConfigInfo } from '../types/resourceCertificateConfigType';
import { getResourceCertificateConfig, getResourceCertificateConfigList, postResourceCertificateConfig, putResourceCertificateConfig } from '../models/resourceCertificateConfigModel';
import { getCourse } from '../models/courseModel';
import { getCertificateTemplate } from '../models/certificateTemplateModel';

/**
 * 创建资源证书配置
 * 教师为自己的课程配置证书
 */
export async function createResourceCertificateConfigService(
  teacherId: number,
  data: Partial<ResourceCertificateConfigInfo>
): Promise<ResourceCertificateConfigInfo> {
  // 校验课程是否存在且属于当前教师
  const course = await getCourse({ courseId: data.courseId });
  if (!course) {
    throw new Error('Course not found');
  }
  if (course.teacherId !== teacherId) {
    throw new Error('Only the course owner can configure certificate');
  }

  // 校验证书模板是否存在且启用
  const template = await getCertificateTemplate({ templateId: data.templateId, isActive: 1 });
  if (!template) {
    throw new Error('Certificate template not found or inactive');
  }

  // 确保课程仅有一条配置
  const existing = await getResourceCertificateConfig({ courseId: data.courseId });
  if (existing) {
    throw new Error('Certificate config already exists for this course');
  }

  return await postResourceCertificateConfig(data);
}

/**
 * 更新资源证书配置
 */
export async function updateResourceCertificateConfigService(
  teacherId: number,
  configId: number,
  data: Partial<ResourceCertificateConfigInfo>
): Promise<ResourceCertificateConfigInfo> {
  const existing = await getResourceCertificateConfig({ configId });
  if (!existing || !existing.courseId) {
    throw new Error('Resource certificate config not found');
  }

  const course = await getCourse({ courseId: existing.courseId });
  if (!course) {
    throw new Error('Course not found');
  }
  if (course.teacherId !== teacherId) {
    throw new Error('Only the course owner can update certificate config');
  }

  if (data.templateId !== undefined) {
    const template = await getCertificateTemplate({ templateId: data.templateId, isActive: 1 });
    if (!template) {
      throw new Error('Certificate template not found or inactive');
    }
  }

  return await putResourceCertificateConfig(configId, data);
}

/**
 * 获取资源证书配置列表
 * 教师仅能查看自己课程的配置
 */
export async function getResourceCertificateConfigListService(
  params: Partial<ResourceCertificateConfigInfo>,
  page: number = 1,
  pageSize: number = 10,
  teacherId?: number
): Promise<{ records: ResourceCertificateConfigInfo[]; total: number }> {
  return await getResourceCertificateConfigList(params, page, pageSize, teacherId);
}

/**
 * 获取资源证书配置详情
 */
export async function getResourceCertificateConfigService(
  configId: number
): Promise<ResourceCertificateConfigInfo | null> {
  return await getResourceCertificateConfig({ configId });
}
