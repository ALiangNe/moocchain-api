import { dbPool } from '../config/database';
import { LearningRecordInfo, LearningRecordInfoQueryParams } from '../types/learningRecordType';
import { ResourceInfo } from '../types/resourceType';

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

/**
 * 获取学习历史资源列表
 * 根据学习记录关联资源和课程，查询某个学生学过的资源（去重），附带课程与教师信息
 */
export async function getLearningHistoryList(
  studentId: number,
  page: number = 1,
  pageSize: number = 10,
  params: LearningRecordInfoQueryParams = {}
): Promise<{ records: ResourceInfo[]; total: number }> {
  if (!studentId) {
    throw new Error('studentId is required');
  }

  const offset = (page - 1) * pageSize;

  // 构建 WHERE 条件（用于基础筛选）
  const baseWhereConditions: string[] = ['lr.studentId = ?'];
  const baseValues: any[] = [studentId];

  // 教师姓名筛选（模糊查询）
  if (params.teacherName) {
    baseWhereConditions.push('(u.realName LIKE ? OR u.username LIKE ?)');
    const teacherNamePattern = `%${params.teacherName}%`;
    baseValues.push(teacherNamePattern, teacherNamePattern);
  }

  // 资源类型筛选
  if (params.resourceType !== undefined) {
    baseWhereConditions.push('r.resourceType = ?');
    baseValues.push(params.resourceType);
  }

  const baseWhereClause = baseWhereConditions.length > 0 ? `WHERE ${baseWhereConditions.join(' AND ')}` : '';

  // 构建 HAVING 条件（用于 isCompleted 筛选）
  const havingClause = params.isCompleted !== undefined
    ? (params.isCompleted === 1 ? 'HAVING MAX(lr.isCompleted) = 1' : 'HAVING (MAX(lr.isCompleted) = 0 OR MAX(lr.isCompleted) IS NULL)')
    : '';

  // 查询去重后的资源总数（使用子查询）
  let countRows;
  try {
    [countRows] = await dbPool.query(
      `SELECT COUNT(*) AS total
       FROM (
         SELECT r.resourceId
       FROM learningRecord lr
       JOIN resource r ON lr.resourceId = r.resourceId
         JOIN course c ON r.courseId = c.courseId
         LEFT JOIN user u ON c.teacherId = u.userId
         ${baseWhereClause}
         GROUP BY r.resourceId
         ${havingClause}
       ) AS subquery`,
      baseValues
    );
  } catch (error) {
    console.error('Get learned course count failed:', error);
    throw error;
  }

  const total = (countRows as { total: number }[])[0]?.total || 0;

  if (total === 0) {
    return { records: [], total: 0 };
  }

  // 查询资源列表（按最近学习时间倒序）
  let rows;
  try {
    [rows] = await dbPool.query(
      `SELECT 
         r.resourceId, r.title, r.description, r.ipfsHash, r.resourceType, r.price, r.accessScope, r.status AS resourceStatus,
         c.courseId, c.courseName, c.description AS courseDescription, c.coverImage, c.courseStartTime, c.courseEndTime, c.status AS courseStatus,
         u.userId AS teacherUserId, u.username AS teacherUsername, u.realName AS teacherRealName, u.schoolName AS teacherSchoolName, u.avatar AS teacherAvatar,
         MAX(lr.progress) AS learningProgress,
         MAX(lr.isCompleted) AS maxIsCompleted
       FROM learningRecord lr
       JOIN resource r ON lr.resourceId = r.resourceId
       JOIN course c ON r.courseId = c.courseId
       LEFT JOIN user u ON c.teacherId = u.userId
       ${baseWhereClause}
       GROUP BY r.resourceId
       ${havingClause}
       ORDER BY MAX(lr.updatedAt) DESC
       LIMIT ? OFFSET ?`,
      [...baseValues, pageSize, offset]
    );
  } catch (error) {
    console.error('Get learned course list failed:', error);
    throw error;
  }

  const records = (rows as any[]).map((row: any): ResourceInfo & { learningProgress?: number } => ({
    resourceId: row.resourceId,
    title: row.title,
    description: row.description,
    ipfsHash: row.ipfsHash,
    resourceType: row.resourceType,
    price: row.price,
    accessScope: row.accessScope,
    status: row.resourceStatus,
    learningProgress: row.learningProgress !== null && row.learningProgress !== undefined ? Number(row.learningProgress) : undefined,
    course: {
      courseId: row.courseId,
      courseName: row.courseName,
      description: row.courseDescription,
      coverImage: row.coverImage,
      courseStartTime: row.courseStartTime,
      courseEndTime: row.courseEndTime,
      status: row.courseStatus,
      teacher: row.teacherUserId ? {
        userId: row.teacherUserId,
        username: row.teacherUsername,
        realName: row.teacherRealName,
        avatar: row.teacherAvatar,
        schoolName: row.teacherSchoolName,
      } : null,
    },
  }));

  return { records, total };
}
