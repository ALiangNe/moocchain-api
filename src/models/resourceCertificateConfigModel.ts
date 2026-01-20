import { dbPool } from '../config/database';
import { ResourceCertificateConfigInfo } from '../types/resourceCertificateConfigType';

/**
 * 创建资源证书配置
 */
export async function postResourceCertificateConfig(
  data: Partial<ResourceCertificateConfigInfo>
): Promise<ResourceCertificateConfigInfo> {
  const { courseId, templateId, completionRequirement, minLearningTime, isEnabled, overrideFields } = data;

  if (!courseId || !templateId || completionRequirement === undefined) {
    throw new Error('courseId, templateId and completionRequirement are required');
  }

  const now = new Date();

  let result;
  try {
    [result] = await dbPool.query(
      'INSERT INTO resourceCertificateConfig (courseId, templateId, completionRequirement, minLearningTime, isEnabled, overrideFields, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [courseId, templateId, completionRequirement, minLearningTime !== undefined ? minLearningTime : 0, isEnabled !== undefined ? isEnabled : 1, overrideFields || null, now, now]
    );
  } catch (error) {
    console.error('Create resource certificate config failed:', error);
    throw error;
  }

  const insertResult = result as { insertId: number };

  let rows;
  try {
    [rows] = await dbPool.query(
      `SELECT configId, courseId, templateId, completionRequirement, minLearningTime, isEnabled, overrideFields, createdAt, updatedAt
       FROM resourceCertificateConfig
       WHERE configId = ?`,
      [insertResult.insertId]
    );
  } catch (error) {
    console.error('Get resource certificate config failed:', error);
    throw error;
  }

  const configs = rows as ResourceCertificateConfigInfo[];
  return configs[0];
}

/**
 * 更新资源证书配置
 * 仅允许更新模板、完成要求、学习时长、启用状态
 */
export async function putResourceCertificateConfig(
  configId: number,
  data: Partial<ResourceCertificateConfigInfo>
): Promise<ResourceCertificateConfigInfo> {
  const allowedFields = ['templateId', 'completionRequirement', 'minLearningTime', 'isEnabled', 'overrideFields'];

  const updateFields: string[] = [];
  const values: any[] = [];

  allowedFields.forEach(field => {
    if (data[field as keyof ResourceCertificateConfigInfo] !== undefined) {
      updateFields.push(`${field} = ?`);
      values.push(data[field as keyof ResourceCertificateConfigInfo]);
    }
  });

  if (updateFields.length === 0) {
    throw new Error('No valid fields to update');
  }

  const now = new Date();
  updateFields.push('updatedAt = ?');
  values.push(now);

  values.push(configId);

  try {
    await dbPool.query(
      `UPDATE resourceCertificateConfig SET ${updateFields.join(', ')} WHERE configId = ?`,
      values
    );
  } catch (error) {
    console.error('Update resource certificate config failed:', error);
    throw error;
  }

  let rows;
  try {
    [rows] = await dbPool.query(
      `SELECT configId, courseId, templateId, completionRequirement, minLearningTime, isEnabled, overrideFields, createdAt, updatedAt
       FROM resourceCertificateConfig
       WHERE configId = ?`,
      [configId]
    );
  } catch (error) {
    console.error('Get resource certificate config failed:', error);
    throw error;
  }

  const configs = rows as ResourceCertificateConfigInfo[];
  if (configs.length === 0) {
    throw new Error('Resource certificate config not found after update');
  }

  return configs[0];
}

/**
 * 获取资源证书配置列表
 * 支持分页和条件筛选，可选按教师过滤
 */
export async function getResourceCertificateConfigList(
  params: Partial<ResourceCertificateConfigInfo>,
  page: number = 1,
  pageSize: number = 10,
  teacherId?: number
): Promise<{ records: ResourceCertificateConfigInfo[]; total: number }> {
  const { courseId, templateId, isEnabled } = params;

  const whereConditions: string[] = [];
  const values: any[] = [];

  if (courseId) {
    whereConditions.push('rcc.courseId = ?');
    values.push(courseId);
  }
  if (templateId) {
    whereConditions.push('rcc.templateId = ?');
    values.push(templateId);
  }
  if (isEnabled !== undefined) {
    whereConditions.push('rcc.isEnabled = ?');
    values.push(isEnabled);
  }

  // 教师只能看到自己课程的配置
  if (teacherId) {
    whereConditions.push('c.teacherId = ?');
    values.push(teacherId);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
  const offset = (page - 1) * pageSize;

  // 统计总数
  let countRows;
  try {
    [countRows] = await dbPool.query(
      `SELECT COUNT(*) as total
       FROM resourceCertificateConfig rcc
       LEFT JOIN course c ON rcc.courseId = c.courseId
       ${whereClause}`,
      values
    );
  } catch (error) {
    console.error('Get resource certificate config count failed:', error);
    throw error;
  }

  const total = (countRows as { total: number }[])[0]?.total || 0;

  // 查询列表
  let rows;
  try {
    [rows] = await dbPool.query(
      `SELECT rcc.configId, rcc.courseId, rcc.templateId, rcc.completionRequirement, rcc.minLearningTime, rcc.isEnabled, rcc.createdAt, rcc.updatedAt
       FROM resourceCertificateConfig rcc
       LEFT JOIN course c ON rcc.courseId = c.courseId
       ${whereClause}
       ORDER BY rcc.createdAt DESC
       LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );
  } catch (error) {
    console.error('Get resource certificate config list failed:', error);
    throw error;
  }

  const records = rows as ResourceCertificateConfigInfo[];
  return { records, total };
}

/**
 * 查询资源证书配置
 * 支持按 configId、courseId、templateId、isEnabled 查询
 */
export async function getResourceCertificateConfig(
  conditions: Partial<ResourceCertificateConfigInfo>
): Promise<ResourceCertificateConfigInfo | null> {
  const { configId, courseId, templateId, isEnabled } = conditions;

  const whereConditions: string[] = [];
  const values: any[] = [];

  if (configId) {
    whereConditions.push('configId = ?');
    values.push(configId);
  }
  if (courseId) {
    whereConditions.push('courseId = ?');
    values.push(courseId);
  }
  if (templateId) {
    whereConditions.push('templateId = ?');
    values.push(templateId);
  }
  if (isEnabled !== undefined) {
    whereConditions.push('isEnabled = ?');
    values.push(isEnabled);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  let rows;
  try {
    [rows] = await dbPool.query(
      `SELECT configId, courseId, templateId, completionRequirement, minLearningTime, isEnabled, overrideFields, createdAt, updatedAt
       FROM resourceCertificateConfig
       ${whereClause}`,
      values
    );
  } catch (error) {
    console.error('Get resource certificate config failed:', error);
    throw error;
  }

  const configs = rows as ResourceCertificateConfigInfo[];
  return configs.length > 0 ? configs[0] : null;
}