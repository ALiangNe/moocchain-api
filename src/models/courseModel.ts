import { dbPool } from '../config/database';
import { CourseInfo } from '../types/courseType';
import { formatDateTimeForMySQL } from '../utils/formatTime';

/**
 * 查询课程
 * 根据条件动态构建查询语句，支持按 courseId、teacherId 查询
 */
export async function getCourse(
  conditions: Partial<CourseInfo>
): Promise<CourseInfo | null> {
  const { courseId, teacherId } = conditions;

  const whereConditions: string[] = [];
  const values: any[] = [];

  if (courseId) {
    whereConditions.push('courseId = ?');
    values.push(courseId);
  }
  if (teacherId) {
    whereConditions.push('teacherId = ?');
    values.push(teacherId);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  let rows;
  try {
    [rows] = await dbPool.query(
      `SELECT 
         c.courseId, c.courseName, c.teacherId, c.description, c.coverImage, c.courseStartTime, c.courseEndTime, c.status, c.createdAt, c.updatedAt,
         u.userId AS teacherUserId, u.username AS teacherUsername, u.realName AS teacherRealName, u.email AS teacherEmail, u.schoolName AS teacherSchoolName, u.avatar AS teacherAvatar
       FROM course c 
       LEFT JOIN user u ON c.teacherId = u.userId
       ${whereClause}`,
      values
    );
  } catch (error) {
    console.error('Get course failed:', error);
    throw error;
  }

  const courses = (rows as any[]).map((row: any): CourseInfo => ({
    courseId: row.courseId,
    courseName: row.courseName,
    teacherId: row.teacherId,
    description: row.description,
    coverImage: row.coverImage,
    courseStartTime: row.courseStartTime,
    courseEndTime: row.courseEndTime,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    // 返回教师的关键信息
    teacher: row.teacherUserId ? {
      userId: row.teacherUserId,
      username: row.teacherUsername,
      email: row.teacherEmail,
      realName: row.teacherRealName,
      avatar: row.teacherAvatar,
      schoolName: row.teacherSchoolName,
    } : null,
  }));

  return courses.length > 0 ? courses[0] : null;
}

/**
 * 获取课程列表
 * 支持分页和条件筛选
 */
export async function getCourseList(
  params: Partial<CourseInfo>,
  page: number = 1,
  pageSize: number = 10
): Promise<{ records: CourseInfo[]; total: number }> {
  const { teacherId, status } = params;

  const whereConditions: string[] = [];
  const values: any[] = [];

  if (teacherId) {
    whereConditions.push('teacherId = ?');
    values.push(teacherId);
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
      `SELECT COUNT(*) as total FROM course ${whereClause}`,
      values
    );
  } catch (error) {
    console.error('Get course count failed:', error);
    throw error;
  }

  const total = (countRows as { total: number }[])[0]?.total || 0;

  // 查询列表
  let rows;
  try {
    [rows] = await dbPool.query(
      `SELECT 
         c.courseId, c.courseName, c.teacherId, c.description, c.coverImage, c.courseStartTime, c.courseEndTime, c.status, c.createdAt, c.updatedAt,
         u.userId AS teacherUserId, u.username AS teacherUsername, u.realName AS teacherRealName, u.email AS teacherEmail, u.schoolName AS teacherSchoolName, u.avatar AS teacherAvatar
       FROM course c
       LEFT JOIN user u ON c.teacherId = u.userId
       ${whereClause}
       ORDER BY c.createdAt DESC 
       LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );
  } catch (error) {
    console.error('Get course list failed:', error);
    throw error;
  }

  const records = (rows as any[]).map((row: any): CourseInfo => ({
    courseId: row.courseId,
    courseName: row.courseName,
    teacherId: row.teacherId,
    description: row.description,
    coverImage: row.coverImage,
    courseStartTime: row.courseStartTime,
    courseEndTime: row.courseEndTime,
    status: row.status,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    // 返回教师的关键信息
    teacher: row.teacherUserId ? {
      userId: row.teacherUserId,
      username: row.teacherUsername,
      email: row.teacherEmail,
      realName: row.teacherRealName,
      avatar: row.teacherAvatar,
      schoolName: row.teacherSchoolName,
    } : null,
  }));

  return { records, total };
}

/**
 * 创建课程
 * 插入新课程到数据库，创建后返回完整课程信息
 */
export async function postCourse(
  data: Partial<CourseInfo>
): Promise<CourseInfo> {
  const { courseName, teacherId, description, coverImage, courseStartTime, courseEndTime, status } = data;

  if (!courseName || !teacherId || !courseStartTime || !courseEndTime) {
    throw new Error('courseName, teacherId, courseStartTime and courseEndTime are required');
  }

  const now = new Date();

  const formattedStartTime = formatDateTimeForMySQL(courseStartTime);
  const formattedEndTime = formatDateTimeForMySQL(courseEndTime);

  let result;
  try {
    [result] = await dbPool.query(
      'INSERT INTO course (courseName, teacherId, description, coverImage, courseStartTime, courseEndTime, status, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [courseName, teacherId, description || null, coverImage || null, formattedStartTime, formattedEndTime, status !== undefined ? status : 1, now, now]
    );
  } catch (error) {
    console.error('Create course failed:', error);
    throw error;
  }

  const insertResult = result as { insertId: number };

  let rows;
  try {
    [rows] = await dbPool.query(
      `SELECT courseId, courseName, teacherId, description, coverImage, courseStartTime, courseEndTime, status, createdAt, updatedAt
       FROM course
       WHERE courseId = ?`,
      [insertResult.insertId]
    );
  } catch (error) {
    console.error('Get course failed:', error);
    throw error;
  }

  const courses = rows as CourseInfo[];
  return courses[0];
}

/**
 * 更新课程信息
 * 根据 courseId 更新课程信息，只允许更新特定字段
 */
export async function putCourse(
  courseId: number,
  data: Partial<CourseInfo>
): Promise<CourseInfo> {
  // 允许更新的字段
  const allowedFields = ['courseName', 'description', 'coverImage', 'courseStartTime', 'courseEndTime', 'status'];

  const updateFields: string[] = [];
  const values: any[] = [];

  // 动态构建 UPDATE 语句
  allowedFields.forEach(field => {
    if (data[field as keyof CourseInfo] !== undefined) {
      updateFields.push(`${field} = ?`);
      // 如果是日期时间字段，转换为 MySQL 格式
      if (field === 'courseStartTime' || field === 'courseEndTime') {
        values.push(formatDateTimeForMySQL(data[field as keyof CourseInfo] as Date | string));
      } else {
        values.push(data[field as keyof CourseInfo]);
      }
    }
  });

  if (updateFields.length === 0) {
    throw new Error('No valid fields to update');
  }

  // 添加 updatedAt 字段
  const now = new Date();
  updateFields.push('updatedAt = ?');
  values.push(now);

  // 添加 courseId 到参数列表
  values.push(courseId);

  // 执行更新
  try {
    await dbPool.query(
      `UPDATE course SET ${updateFields.join(', ')} WHERE courseId = ?`,
      values
    );
  } catch (error) {
    console.error('Update course failed:', error);
    throw error;
  }

  // 查询并返回更新后的课程信息
  let rows;
  try {
    [rows] = await dbPool.query(
      `SELECT courseId, courseName, teacherId, description, coverImage, courseStartTime, courseEndTime, status, createdAt, updatedAt
       FROM course
       WHERE courseId = ?`,
      [courseId]
    );
  } catch (error) {
    console.error('Get course failed:', error);
    throw error;
  }

  const courses = rows as CourseInfo[];
  if (courses.length === 0) {
    throw new Error('Course not found after update');
  }

  return courses[0];
}
