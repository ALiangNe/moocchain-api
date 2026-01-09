import { dbPool } from '../config/database';
import { AuditRecordInfo } from '../types/auditRecordType';

/**
 * 创建教师申请审核记录
 * 检查是否已有待审核的申请，如果没有则创建新申请
 */
export async function createTeacherApplicationModel(
  studentId: number,
  auditComment?: string
): Promise<AuditRecordInfo> {
  // 检查是否已有待审核的申请
  let existingRows;
  try {
    [existingRows] = await dbPool.query(
      'SELECT auditId FROM auditRecord WHERE targetId = ? AND targetType = ? AND auditType = ? AND auditStatus = ?',
      [studentId, 1, 1, 0]
    );
  } catch (error) {
    console.error('Check existing audit record failed:', error);
    throw error;
  }

  const existingRecords = existingRows as AuditRecordInfo[];
  if (existingRecords.length > 0) {
    throw new Error('You already have a pending teacher application');
  }

  // 创建审核记录
  let result;
  try {
    [result] = await dbPool.query(
      'INSERT INTO auditRecord (auditType, targetId, targetType, auditorId, auditStatus, auditComment) VALUES (?, ?, ?, ?, ?, ?)',
      [1, studentId, 1, studentId, 0, auditComment || null]
    );
  } catch (error) {
    console.error('Create audit record failed:', error);
    throw error;
  }

  const insertResult = result as { insertId: number };

  // 查询并返回创建的审核记录
  let rows;
  try {
    [rows] = await dbPool.query(
      'SELECT auditId, auditType, targetId, targetType, auditorId, auditStatus, auditComment, auditTime, createdAt FROM auditRecord WHERE auditId = ?',
      [insertResult.insertId]
    );
  } catch (error) {
    console.error('Get audit record failed:', error);
    throw error;
  }

  const records = rows as AuditRecordInfo[];
  return records[0];
}

/**
 * 创建资源审核记录
 * 资源创建后自动创建审核记录（待审核状态）
 */
export async function createResourceAuditModel(
  resourceId: number,
  ownerId: number
): Promise<AuditRecordInfo> {
  // 创建审核记录
  // auditType = 1 (资源内容), targetType = 2 (资源)
  let result;
  try {
    [result] = await dbPool.query(
      'INSERT INTO auditRecord (auditType, targetId, targetType, auditorId, auditStatus) VALUES (?, ?, ?, ?, ?)',
      [1, resourceId, 2, ownerId, 0]
    );
  } catch (error) {
    console.error('Create resource audit record failed:', error);
    throw error;
  }

  const insertResult = result as { insertId: number };

  // 查询并返回创建的审核记录
  let rows;
  try {
    [rows] = await dbPool.query(
      'SELECT auditId, auditType, targetId, targetType, auditorId, auditStatus, auditComment, auditTime, createdAt FROM auditRecord WHERE auditId = ?',
      [insertResult.insertId]
    );
  } catch (error) {
    console.error('Get audit record failed:', error);
    throw error;
  }

  const records = rows as AuditRecordInfo[];
  return records[0];
}

/**
 * 审批教师申请
 * 更新审核记录状态，如果通过则返回更新后的记录和用户信息
 */
export async function approveTeacherApplicationModel(
  auditId: number,
  adminId: number,
  auditStatus: number,
  auditComment?: string
): Promise<{ auditRecord: AuditRecordInfo; targetUserId: number }> {
  // 获取审核记录
  let rows;
  try {
    [rows] = await dbPool.query(
      'SELECT auditId, auditType, targetId, targetType, auditStatus FROM auditRecord WHERE auditId = ?',
      [auditId]
    );
  } catch (error) {
    console.error('Get audit record failed:', error);
    throw error;
  }

  const records = rows as AuditRecordInfo[];
  if (records.length === 0) {
    throw new Error('Audit record not found');
  }

  const auditRecord = records[0];

  // 检查审核记录类型（1 = 资源内容或用户身份，这里支持两种）
  if (auditRecord.auditType !== 1) {
    throw new Error('Invalid audit type');
  }

  // 检查审核状态
  if (auditRecord.auditStatus !== 0) {
    throw new Error('This application has already been processed');
  }

  // 检查审核状态值
  if (auditStatus !== 1 && auditStatus !== 2) {
    throw new Error('Invalid audit status');
  }

  // 更新审核记录
  const updateFields: string[] = [];
  const values: any[] = [];

  updateFields.push('auditStatus = ?');
  values.push(auditStatus);
  
  if (auditComment !== undefined) {
    updateFields.push('auditComment = ?');
    values.push(auditComment);
  }
  
  updateFields.push('auditorId = ?');
  values.push(adminId);
  
  // 设置审核时间
  updateFields.push('auditTime = NOW()');

  values.push(auditId);

  try {
    await dbPool.query(
      `UPDATE auditRecord SET ${updateFields.join(', ')} WHERE auditId = ?`,
      values
    );
  } catch (error) {
    console.error('Update audit record failed:', error);
    throw error;
  }

  // 查询并返回更新后的审核记录
  let updatedRows;
  try {
    [updatedRows] = await dbPool.query(
      'SELECT auditId, auditType, targetId, targetType, auditorId, auditStatus, auditComment, auditTime, createdAt FROM auditRecord WHERE auditId = ?',
      [auditId]
    );
  } catch (error) {
    console.error('Get audit record failed:', error);
    throw error;
  }

  const updatedRecords = updatedRows as AuditRecordInfo[];
  if (updatedRecords.length === 0) {
    throw new Error('Audit record not found after update');
  }

  return {
    auditRecord: updatedRecords[0],
    targetUserId: auditRecord.targetId!,
  };
}

/**
 * 审批资源申请
 * 更新审核记录状态，如果通过则返回更新后的记录和资源ID
 */
export async function approveResourceApplicationModel(
  auditId: number,
  adminId: number,
  auditStatus: number,
  auditComment?: string
): Promise<{ auditRecord: AuditRecordInfo; resourceId: number }> {
  // 获取审核记录
  let rows;
  try {
    [rows] = await dbPool.query(
      'SELECT auditId, auditType, targetId, targetType, auditStatus FROM auditRecord WHERE auditId = ?',
      [auditId]
    );
  } catch (error) {
    console.error('Get audit record failed:', error);
    throw error;
  }

  const records = rows as AuditRecordInfo[];
  if (records.length === 0) {
    throw new Error('Audit record not found');
  }

  const auditRecord = records[0];

  // 检查审核记录类型和目标类型
  if (auditRecord.auditType !== 1 || auditRecord.targetType !== 2) {
    throw new Error('Invalid audit type or target type');
  }

  // 检查审核状态
  if (auditRecord.auditStatus !== 0) {
    throw new Error('This resource has already been processed');
  }

  // 检查审核状态值
  if (auditStatus !== 1 && auditStatus !== 2) {
    throw new Error('Invalid audit status');
  }

  // 更新审核记录
  const updateFields: string[] = [];
  const values: any[] = [];

  updateFields.push('auditStatus = ?');
  values.push(auditStatus);
  
  if (auditComment !== undefined) {
    updateFields.push('auditComment = ?');
    values.push(auditComment);
  }
  
  updateFields.push('auditorId = ?');
  values.push(adminId);
  
  // 设置审核时间
  updateFields.push('auditTime = NOW()');

  values.push(auditId);

  try {
    await dbPool.query(
      `UPDATE auditRecord SET ${updateFields.join(', ')} WHERE auditId = ?`,
      values
    );
  } catch (error) {
    console.error('Update audit record failed:', error);
    throw error;
  }

  // 查询并返回更新后的审核记录
  let updatedRows;
  try {
    [updatedRows] = await dbPool.query(
      'SELECT auditId, auditType, targetId, targetType, auditorId, auditStatus, auditComment, auditTime, createdAt FROM auditRecord WHERE auditId = ?',
      [auditId]
    );
  } catch (error) {
    console.error('Get audit record failed:', error);
    throw error;
  }

  const updatedRecords = updatedRows as AuditRecordInfo[];
  if (updatedRecords.length === 0) {
    throw new Error('Audit record not found after update');
  }

  return {
    auditRecord: updatedRecords[0],
    resourceId: auditRecord.targetId!,
  };
}

/**
 * 获取审核记录列表
 * 支持分页和条件筛选
 */
export async function getAuditRecordListModel(
  params: Partial<AuditRecordInfo>,
  page: number = 1,
  pageSize: number = 10
): Promise<{ records: AuditRecordInfo[]; total: number }> {
  const { targetId, targetType, auditType, auditStatus, auditorId } = params;

  const whereConditions: string[] = [];
  const values: any[] = [];

  if (targetId) {
    whereConditions.push('ar.targetId = ?');
    values.push(targetId);
  }
  if (targetType) {
    whereConditions.push('ar.targetType = ?');
    values.push(targetType);
  }
  if (auditType) {
    whereConditions.push('ar.auditType = ?');
    values.push(auditType);
  }
  if (auditStatus !== undefined) {
    whereConditions.push('ar.auditStatus = ?');
    values.push(auditStatus);
  }
  if (auditorId) {
    whereConditions.push('ar.auditorId = ?');
    values.push(auditorId);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const offset = (page - 1) * pageSize;

  // 查询总数
  let countRows;
  try {
    [countRows] = await dbPool.query(
      `SELECT COUNT(*) as total FROM auditRecord ar ${whereClause}`,
      values
    );
  } catch (error) {
    console.error('Get audit record count failed:', error);
    throw error;
  }

  const total = (countRows as { total: number }[])[0]?.total || 0;

  // 查询列表
  let rows;
  try {
    [rows] = await dbPool.query(
      `SELECT 
        ar.auditId, ar.auditType, ar.targetId, ar.targetType, ar.auditorId, ar.auditStatus, ar.auditComment, ar.auditTime, ar.createdAt,
        u.userId as targetUserId, u.username as targetUsername, u.email as targetEmail, u.realName as targetRealName, u.phone as targetPhone, u.schoolName as targetSchoolName, u.certificateFile as targetCertificateFile, u.role as targetRole, u.avatar as targetAvatar,
        r.resourceId, r.title as resourceTitle, r.description as resourceDescription, r.resourceType as resourceResourceType, r.price as resourcePrice, r.status as resourceStatus, r.ownerId as resourceOwnerId, r.courseId as resourceCourseId, r.createdAt as resourceCreatedAt, r.ipfsHash as resourceIpfsHash,
        ou.userId as ownerUserId, ou.username as ownerUsername, ou.email as ownerEmail, ou.realName as ownerRealName, ou.schoolName as ownerSchoolName, ou.avatar as ownerAvatar,
        c.courseId as courseCourseId, c.courseName as courseCourseName, c.coverImage as courseCoverImage,
        au.userId as auditorUserId, au.username as auditorUsername, au.email as auditorEmail, au.realName as auditorRealName
      FROM auditRecord ar
      LEFT JOIN user u ON ar.targetId = u.userId AND ar.targetType = 1
      LEFT JOIN resource r ON ar.targetId = r.resourceId AND ar.targetType = 2
      LEFT JOIN user ou ON r.ownerId = ou.userId
      LEFT JOIN course c ON r.courseId = c.courseId
      LEFT JOIN user au ON ar.auditorId = au.userId
      ${whereClause} 
      ORDER BY ar.createdAt DESC 
      LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );
  } catch (error) {
    console.error('Get audit record list failed:', error);
    throw error;
  }

  const records = (rows as any[]).map((row: any): AuditRecordInfo => ({
    auditId: row.auditId,
    auditType: row.auditType,
    targetId: row.targetId,
    targetType: row.targetType,
    auditorId: row.auditorId,
    auditStatus: row.auditStatus,
    auditComment: row.auditComment,
    auditTime: row.auditTime,
    createdAt: row.createdAt,
    // 返回完整的用户对象（targetType = 1时）
    targetUser: row.targetUserId ? {
      userId: row.targetUserId,
      username: row.targetUsername,
      email: row.targetEmail,
      realName: row.targetRealName,
      phone: row.targetPhone,
      schoolName: row.targetSchoolName,
      certificateFile: row.targetCertificateFile,
      role: row.targetRole,
      avatar: row.targetAvatar,
    } : null,
    // 返回资源信息（targetType = 2时）
    targetResource: row.resourceId ? {
      resourceId: row.resourceId,
      title: row.resourceTitle,
      description: row.resourceDescription,
      resourceType: row.resourceResourceType,
      price: row.resourcePrice,
      status: row.resourceStatus,
      ownerId: row.resourceOwnerId,
      courseId: row.resourceCourseId,
      createdAt: row.resourceCreatedAt,
      ipfsHash: row.resourceIpfsHash,
      owner: row.ownerUserId ? {
        userId: row.ownerUserId,
        username: row.ownerUsername,
        email: row.ownerEmail,
        realName: row.ownerRealName,
        schoolName: row.ownerSchoolName,
        avatar: row.ownerAvatar,
      } : null,
      course: row.courseCourseId ? {
        courseId: row.courseCourseId,
        courseName: row.courseCourseName,
        coverImage: row.courseCoverImage,
      } : null,
    } : null,
    auditor: row.auditorUserId ? {
      userId: row.auditorUserId,
      username: row.auditorUsername,
      email: row.auditorEmail,
      realName: row.auditorRealName,
    } : null,
  }));
  
  return { records, total };
}

