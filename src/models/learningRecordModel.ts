import { dbPool } from '../config/database';
import { LearningRecordInfo } from '../types/learningRecordType';

/**
 * 查询学习记录
 * 根据条件动态构建查询语句，支持按 recordId、studentId、resourceId 查询
 */
export async function getLearningRecord(
  conditions: Partial<LearningRecordInfo>
): Promise<LearningRecordInfo | null> {
  const { recordId, studentId, resourceId } = conditions;

  const whereConditions: string[] = [];
  const values: any[] = [];

  if (recordId) {
    whereConditions.push('lr.recordId = ?');
    values.push(recordId);
  }
  if (studentId) {
    whereConditions.push('lr.studentId = ?');
    values.push(studentId);
  }
  if (resourceId) {
    whereConditions.push('lr.resourceId = ?');
    values.push(resourceId);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  let rows;
  try {
    [rows] = await dbPool.query(
      `SELECT 
         lr.recordId, lr.studentId, lr.resourceId, lr.progress, lr.learningTime, lr.review, lr.rating, lr.isCompleted, lr.isVisible, lr.completedAt, lr.createdAt, lr.updatedAt,
         u.userId AS studentUserId, u.username AS studentUsername, u.realName AS studentRealName, u.avatar AS studentAvatar,
         r.resourceId AS resourceResourceId, r.title AS resourceTitle, r.resourceType AS resourceResourceType
       FROM learningRecord lr
       LEFT JOIN user u ON lr.studentId = u.userId
       LEFT JOIN resource r ON lr.resourceId = r.resourceId
       ${whereClause}
       LIMIT 1`,
      values
    );
  } catch (error) {
    console.error('Get learning record failed:', error);
    throw error;
  }

  const records = (rows as any[]).map((row: any): LearningRecordInfo => ({
    recordId: row.recordId,
    studentId: row.studentId,
    resourceId: row.resourceId,
    progress: row.progress,
    learningTime: row.learningTime,
    review: row.review,
    rating: row.rating,
    isCompleted: row.isCompleted,
    isVisible: row.isVisible,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    student: row.studentUserId ? {
      userId: row.studentUserId,
      username: row.studentUsername,
      realName: row.studentRealName,
      avatar: row.studentAvatar,
    } : null,
    resource: row.resourceResourceId ? {
      resourceId: row.resourceResourceId,
      title: row.resourceTitle,
      resourceType: row.resourceResourceType,
    } : null,
  }));

  return records.length > 0 ? records[0] : null;
}

/**
 * 获取学习记录列表
 * 支持分页和条件筛选
 */
export async function getLearningRecordList(
  params: Partial<LearningRecordInfo>,
  page: number = 1,
  pageSize: number = 10
): Promise<{ records: LearningRecordInfo[]; total: number }> {
  const { studentId, resourceId } = params;

  const whereConditions: string[] = [];
  const values: any[] = [];

  if (studentId) {
    whereConditions.push('lr.studentId = ?');
    values.push(studentId);
  }
  if (resourceId) {
    whereConditions.push('lr.resourceId = ?');
    values.push(resourceId);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const offset = (page - 1) * pageSize;

  // 查询总数
  let countRows;
  try {
    [countRows] = await dbPool.query(
      `SELECT COUNT(*) as total FROM learningRecord lr ${whereClause}`,
      values
    );
  } catch (error) {
    console.error('Get learning record count failed:', error);
    throw error;
  }

  const total = (countRows as { total: number }[])[0]?.total || 0;

  // 查询列表
  let rows;
  try {
    [rows] = await dbPool.query(
      `SELECT 
         lr.recordId, lr.studentId, lr.resourceId, lr.progress, lr.learningTime, lr.review, lr.rating, lr.isCompleted, lr.isVisible, lr.completedAt, lr.createdAt, lr.updatedAt,
         u.userId AS studentUserId, u.username AS studentUsername, u.realName AS studentRealName, u.avatar AS studentAvatar,
         r.resourceId AS resourceResourceId, r.title AS resourceTitle, r.resourceType AS resourceResourceType
       FROM learningRecord lr
       LEFT JOIN user u ON lr.studentId = u.userId
       LEFT JOIN resource r ON lr.resourceId = r.resourceId
       ${whereClause}
       ORDER BY lr.createdAt DESC
       LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );
  } catch (error) {
    console.error('Get learning record list failed:', error);
    throw error;
  }

  const records = (rows as any[]).map((row: any): LearningRecordInfo => ({
    recordId: row.recordId,
    studentId: row.studentId,
    resourceId: row.resourceId,
    progress: row.progress,
    learningTime: row.learningTime,
    review: row.review,
    rating: row.rating,
    isCompleted: row.isCompleted,
    isVisible: row.isVisible,
    completedAt: row.completedAt,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    student: row.studentUserId ? {
      userId: row.studentUserId,
      username: row.studentUsername,
      realName: row.studentRealName,
      avatar: row.studentAvatar,
    } : null,
    resource: row.resourceResourceId ? {
      resourceId: row.resourceResourceId,
      title: row.resourceTitle,
      resourceType: row.resourceResourceType,
    } : null,
  }));

  return { records, total };
}

/**
 * 创建学习记录
 * 插入新学习记录到数据库，创建后返回完整学习记录信息
 */
export async function postLearningRecord(
  data: Partial<LearningRecordInfo>
): Promise<LearningRecordInfo> {
  const { studentId, resourceId, progress, learningTime, review, rating, isCompleted, isVisible, completedAt } = data;

  if (!studentId || !resourceId) {
    throw new Error('studentId and resourceId are required');
  }

  const now = new Date();

  let result;
  try {
    [result] = await dbPool.query(
      'INSERT INTO learningRecord (studentId, resourceId, progress, learningTime, review, rating, isCompleted, isVisible, completedAt, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        studentId,
        resourceId,
        progress !== undefined ? progress : 0,
        learningTime !== undefined ? learningTime : 0,
        review || null,
        rating || null,
        isCompleted !== undefined ? isCompleted : 0,
        isVisible !== undefined ? isVisible : 1,
        completedAt || null,
        now,
        now,
      ]
    );
  } catch (error) {
    console.error('Create learning record failed:', error);
    throw error;
  }

  const insertResult = result as { insertId: number };

  let rows;
  try {
    [rows] = await dbPool.query(
      'SELECT recordId, studentId, resourceId, progress, learningTime, review, rating, isCompleted, isVisible, completedAt, createdAt, updatedAt FROM learningRecord WHERE recordId = ?',
      [insertResult.insertId]
    );
  } catch (error) {
    console.error('Get learning record failed:', error);
    throw error;
  }

  const records = rows as LearningRecordInfo[];
  return records[0];
}

/**
 * 更新学习记录信息
 * 根据 recordId 更新学习记录信息，只允许更新特定字段
 */
export async function putLearningRecord(
  recordId: number,
  data: Partial<LearningRecordInfo>
): Promise<LearningRecordInfo> {
  // 允许更新的字段
  const allowedFields = ['progress', 'learningTime', 'review', 'rating', 'isCompleted', 'isVisible', 'completedAt'];

  const updateFields: string[] = [];
  const values: any[] = [];

  // 动态构建 UPDATE 语句
  allowedFields.forEach(field => {
    if (data[field as keyof LearningRecordInfo] !== undefined) {
      updateFields.push(`${field} = ?`);
      values.push(data[field as keyof LearningRecordInfo]);
    }
  });

  if (updateFields.length === 0) {
    throw new Error('No valid fields to update');
  }

  // 添加 updatedAt 字段
  const now = new Date();
  updateFields.push('updatedAt = ?');
  values.push(now);

  // 添加 recordId 到参数列表
  values.push(recordId);

  // 执行更新
  try {
    await dbPool.query(
      `UPDATE learningRecord SET ${updateFields.join(', ')} WHERE recordId = ?`,
      values
    );
  } catch (error) {
    console.error('Update learning record failed:', error);
    throw error;
  }

  // 查询并返回更新后的学习记录信息
  let rows;
  try {
    [rows] = await dbPool.query(
      'SELECT recordId, studentId, resourceId, progress, learningTime, review, rating, isCompleted, isVisible, completedAt, createdAt, updatedAt FROM learningRecord WHERE recordId = ?',
      [recordId]
    );
  } catch (error) {
    console.error('Get learning record failed:', error);
    throw error;
  }

  const records = rows as LearningRecordInfo[];
  if (records.length === 0) {
    throw new Error('Learning record not found after update');
  }

  return records[0];
}
