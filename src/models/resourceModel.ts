import { dbPool } from '../config/database';
import { ResourceInfo } from '../types/resourceType';

/**
 * 查询资源
 * 根据条件动态构建查询语句，支持按 resourceId、courseId、ownerId 查询
 */
export async function getResource(
  conditions: Partial<ResourceInfo>
): Promise<ResourceInfo | null> {
  const { resourceId, courseId, ownerId } = conditions;

  const whereConditions: string[] = [];
  const values: any[] = [];

  if (resourceId) {
    whereConditions.push('resourceId = ?');
    values.push(resourceId);
  }
  if (courseId) {
    whereConditions.push('courseId = ?');
    values.push(courseId);
  }
  if (ownerId) {
    whereConditions.push('ownerId = ?');
    values.push(ownerId);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  let rows;
  try {
    [rows] = await dbPool.query(
      `SELECT 
         r.resourceId, r.resourceNftId, r.ownerId, r.courseId, r.title, r.description, r.ipfsHash, r.resourceType, r.price, r.accessScope, r.status, r.createdAt, r.updatedAt,
         u.userId AS ownerUserId, u.username AS ownerUsername, u.realName AS ownerRealName, u.schoolName AS ownerSchoolName
       FROM resource r 
       LEFT JOIN user u ON r.ownerId = u.userId
       ${whereClause}`,
      values
    );
  } catch (error) {
    console.error('Get resource failed:', error);
    throw error;
  }

  const resources = (rows as any[]).map((row: any): ResourceInfo => ({
    resourceId: row.resourceId,
    resourceNftId: row.resourceNftId,
    ownerId: row.ownerId,
    courseId: row.courseId,
    title: row.title,
    description: row.description,
    ipfsHash: row.ipfsHash,
    resourceType: row.resourceType,
    price: row.price,
    accessScope: row.accessScope,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    owner: row.ownerUserId ? {
      userId: row.ownerUserId,
      username: row.ownerUsername,
      realName: row.ownerRealName,
      schoolName: row.ownerSchoolName,
    } : null,
  }));

  return resources.length > 0 ? resources[0] : null;
}

/**
 * 获取资源列表
 * 支持分页和条件筛选
 */
export async function getResourceList(
  params: Partial<ResourceInfo>,
  page: number = 1,
  pageSize: number = 10
): Promise<{ records: ResourceInfo[]; total: number }> {
  const { courseId, ownerId, resourceType, status } = params;

  const whereConditions: string[] = [];
  const values: any[] = [];

  if (courseId) {
    whereConditions.push('courseId = ?');
    values.push(courseId);
  }
  if (ownerId) {
    whereConditions.push('ownerId = ?');
    values.push(ownerId);
  }
  if (resourceType !== undefined) {
    whereConditions.push('resourceType = ?');
    values.push(resourceType);
  }
  if (status !== undefined) {
    whereConditions.push('status = ?');
    values.push(status);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const offset = (page - 1) * pageSize;

  // 查询总数
  let countRows;
  try {
    [countRows] = await dbPool.query(
      `SELECT COUNT(*) as total FROM resource ${whereClause}`,
      values
    );
  } catch (error) {
    console.error('Get resource count failed:', error);
    throw error;
  }

  const total = (countRows as { total: number }[])[0]?.total || 0;

  // 查询列表
  let rows;
  try {
    [rows] = await dbPool.query(
      `SELECT resourceId, resourceNftId, ownerId, courseId, title, description, ipfsHash, resourceType, price, accessScope, status, createdAt, updatedAt 
       FROM resource 
       ${whereClause} 
       ORDER BY createdAt DESC 
       LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );
  } catch (error) {
    console.error('Get resource list failed:', error);
    throw error;
  }

  const records = rows as ResourceInfo[];

  return { records, total };
}

/**
 * 创建资源
 * 插入新资源到数据库，创建后返回完整资源信息
 * 注意：暂时不处理 ipfsHash 和 resourceNftId（区块链相关功能后续实现）
 */
export async function postResource(
  data: Partial<ResourceInfo>
): Promise<ResourceInfo> {
  const { ownerId, courseId, title, description, ipfsHash, resourceType, price, accessScope, status } = data;

  if (!ownerId || !courseId || !title) {
    throw new Error('ownerId, courseId and title are required');
  }

  // 文件路径存储在 ipfsHash 字段中（临时方案，后续对接 IPFS 时需要修改）
  // 如果提供了 ipfsHash（文件路径），使用它；否则生成临时值
  const filePath = ipfsHash || 'temp_' + Date.now();

  const now = new Date();

  let result;
  try {
    [result] = await dbPool.query(
      'INSERT INTO resource (resourceNftId, ownerId, courseId, title, description, ipfsHash, resourceType, price, accessScope, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [null, ownerId, courseId, title, description || null, filePath, resourceType || 0, price || 0.00, accessScope || 0, status || 0, now, now]
    );
  } catch (error) {
    console.error('Create resource failed:', error);
    throw error;
  }

  const insertResult = result as { insertId: number };

  let rows;
  try {
    [rows] = await dbPool.query(
      'SELECT resourceId, resourceNftId, ownerId, courseId, title, description, ipfsHash, resourceType, price, accessScope, status, createdAt, updatedAt FROM resource WHERE resourceId = ?',
      [insertResult.insertId]
    );
  } catch (error) {
    console.error('Get resource failed:', error);
    throw error;
  }

  const resources = rows as ResourceInfo[];
  return resources[0];
}

/**
 * 更新资源信息
 * 根据 resourceId 更新资源信息，只允许更新特定字段
 */
export async function putResource(
  resourceId: number,
  data: Partial<ResourceInfo>
): Promise<ResourceInfo> {
  // 允许更新的字段
  const allowedFields = ['resourceNftId', 'title', 'description', 'resourceType', 'price', 'accessScope', 'status'];

  const updateFields: string[] = [];
  const values: any[] = [];

  // 动态构建 UPDATE 语句
  allowedFields.forEach(field => {
    if (data[field as keyof ResourceInfo] !== undefined) {
      updateFields.push(`${field} = ?`);
      values.push(data[field as keyof ResourceInfo]);
    }
  });

  if (updateFields.length === 0) {
    throw new Error('No valid fields to update');
  }

  // 添加 updatedAt 字段
  const now = new Date();
  updateFields.push('updatedAt = ?');
  values.push(now);

  // 添加 resourceId 到参数列表
  values.push(resourceId);

  // 执行更新
  try {
    await dbPool.query(
      `UPDATE resource SET ${updateFields.join(', ')} WHERE resourceId = ?`,
      values
    );
  } catch (error) {
    console.error('Update resource failed:', error);
    throw error;
  }

  // 查询并返回更新后的资源信息
  let rows;
  try {
    [rows] = await dbPool.query(
      'SELECT resourceId, resourceNftId, ownerId, courseId, title, description, ipfsHash, resourceType, price, accessScope, status, createdAt, updatedAt FROM resource WHERE resourceId = ?',
      [resourceId]
    );
  } catch (error) {
    console.error('Get resource failed:', error);
    throw error;
  }

  const resources = rows as ResourceInfo[];
  if (resources.length === 0) {
    throw new Error('Resource not found after update');
  }

  return resources[0];
}
