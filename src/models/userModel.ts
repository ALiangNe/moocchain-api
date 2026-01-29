import { dbPool } from '../config/database';
import { UserInfo } from '../types/userType';

/**
 * 查询用户
 * 根据条件动态构建查询语句，支持按 userId、username、password、email 查询
 * 默认不返回密码字段，如果需要密码用于登录校验，可通过 options.includePassword 显式开启
 */
export async function getUser(
  conditions: Partial<UserInfo>,
  options?: { includePassword?: boolean }
): Promise<UserInfo | null> {
  const { userId, username, password, email } = conditions;

  const whereConditions: string[] = [];
  const values: any[] = [];

  if (userId) {
    whereConditions.push('userId = ?');
    values.push(userId);
  }
  if (username) {
    whereConditions.push('username = ?');
    values.push(username);
  }
  if (password) {
    whereConditions.push('password = ?');
    values.push(password);
  }
  if (email) {
    whereConditions.push('email = ?');
    values.push(email);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  let rows;
  try {
    if (options?.includePassword) {
      [rows] = await dbPool.query(
        'SELECT userId, username, password, email, walletAddress, certificateFile, realName, phone, idCard, avatar, gender, role, walletBound, tokenBalance, schoolName, createdAt, updatedAt FROM user ' + whereClause,
        values
      );
    } else {
      [rows] = await dbPool.query(
        'SELECT userId, username, email, walletAddress, certificateFile, realName, phone, idCard, avatar, gender, role, walletBound, tokenBalance, schoolName, createdAt, updatedAt FROM user ' + whereClause,
        values
      );
    }
  } catch (error) {
    console.error('Get user failed:', error);
    throw error;
  }

  const users = rows as UserInfo[];
  return users.length > 0 ? users[0] : null;
}

/**
 * 创建用户
 * 插入新用户到数据库，默认角色为学生(5)，创建后返回完整用户信息
 */
export async function postUser(
  data: Partial<UserInfo>
): Promise<UserInfo> {
  const { username, password, email } = data;

  if (!username || !password || !email) {
    throw new Error('Username, password and email are required');
  }

  const now = new Date();

  let result;
  try {
    [result] = await dbPool.query(
      'INSERT INTO user (username, password, email, role, walletBound, tokenBalance, createdAt, updatedAt) VALUES (?, ?, ?, 5, 0, 0.00, ?, ?)',
      [username, password, email, now, now]
    );
  } catch (error) {
    console.error('Create user failed:', error);
    throw error;
  }

  const insertResult = result as { insertId: number };

  let rows;
  try {
    [rows] = await dbPool.query(
      'SELECT userId, username, email, walletAddress, certificateFile, realName, phone, idCard, avatar, gender, role, walletBound, tokenBalance, schoolName, createdAt, updatedAt FROM user WHERE userId = ?',
      [insertResult.insertId]
    );
  } catch (error) {
    console.error('Get user failed:', error);
    throw error;
  }

  const users = rows as UserInfo[];
  return users[0];
}

/**
 * 更新用户信息
 * 根据 userId 更新用户个人信息，只允许更新特定字段
 */
export async function putUser(
  userId: number,
  data: Partial<UserInfo>
): Promise<UserInfo> {
  // 允许更新的字段
  const allowedFields = ['email', 'realName', 'phone', 'idCard', 'avatar', 'gender', 'schoolName', 'certificateFile', 'tokenBalance', 'walletAddress'];

  const updateFields: string[] = [];
  const values: any[] = [];

  // 动态构建 UPDATE 语句
  allowedFields.forEach(field => {
    if (data[field as keyof UserInfo] !== undefined) {
      updateFields.push(`${field} = ?`);
      values.push(data[field as keyof UserInfo]);
    }
  });

  if (updateFields.length === 0) {
    throw new Error('No valid fields to update');
  }

  // 添加 updatedAt 字段
  const now = new Date();
  updateFields.push('updatedAt = ?');
  values.push(now);

  // 添加 userId 到参数列表
  values.push(userId);

  // 执行更新
  try {
    await dbPool.query(
      `UPDATE user SET ${updateFields.join(', ')} WHERE userId = ?`,
      values
    );
  } catch (error) {
    console.error('Update user failed:', error);
    throw error;
  }

  // 查询并返回更新后的用户信息
  let rows;
  try {
    [rows] = await dbPool.query(
      'SELECT userId, username, email, walletAddress, certificateFile, realName, phone, idCard, avatar, gender, role, walletBound, tokenBalance, schoolName, createdAt, updatedAt FROM user WHERE userId = ?',
      [userId]
    );
  } catch (error) {
    console.error('Get user failed:', error);
    throw error;
  }

  const users = rows as UserInfo[];
  if (users.length === 0) {
    throw new Error('User not found after update');
  }

  return users[0];
}

/**
 * 更新用户角色
 * 根据 userId 更新用户角色
 */
export async function updateUserRole(
  userId: number,
  role: number
): Promise<UserInfo> {
  const now = new Date();

  // 执行更新
  try {
    await dbPool.query(
      'UPDATE user SET role = ?, updatedAt = ? WHERE userId = ?',
      [role, now, userId]
    );
  } catch (error) {
    console.error('Update user role failed:', error);
    throw error;
  }

  // 查询并返回更新后的用户信息
  let rows;
  try {
    [rows] = await dbPool.query(
      'SELECT userId, username, email, walletAddress, certificateFile, realName, phone, idCard, avatar, gender, role, walletBound, tokenBalance, schoolName, createdAt, updatedAt FROM user WHERE userId = ?',
      [userId]
    );
  } catch (error) {
    console.error('Get user failed:', error);
    throw error;
  }

  const users = rows as UserInfo[];
  if (users.length === 0) {
    throw new Error('User not found after update');
  }

  return users[0];
}

/**
 * 获取用户列表
 * 支持分页和条件筛选（管理员用）
 */
export async function getUserList(
  params: Partial<UserInfo>,
  page: number = 1,
  pageSize: number = 10
): Promise<{ records: UserInfo[]; total: number }> {
  const { userId, username, email, realName, role, walletBound, schoolName } = params;

  const whereConditions: string[] = [];
  const values: any[] = [];

  if (userId !== undefined) {
    whereConditions.push('userId = ?');
    values.push(userId);
  }
  if (username) {
    whereConditions.push('username LIKE ?');
    values.push(`%${username}%`);
  }
  if (email) {
    whereConditions.push('email LIKE ?');
    values.push(`%${email}%`);
  }
  if (realName) {
    whereConditions.push('realName LIKE ?');
    values.push(`%${realName}%`);
  }
  if (role !== undefined) {
    whereConditions.push('role = ?');
    values.push(role);
  }
  if (walletBound !== undefined) {
    whereConditions.push('walletBound = ?');
    values.push(walletBound);
  }
  if (schoolName) {
    whereConditions.push('schoolName LIKE ?');
    values.push(`%${schoolName}%`);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
  const offset = (page - 1) * pageSize;

  let countRows;
  try {
    [countRows] = await dbPool.query(`SELECT COUNT(*) as total FROM user ${whereClause}`, values);
  } catch (error) {
    console.error('Get user list count failed:', error);
    throw error;
  }

  const total = (countRows as { total: number }[])[0]?.total || 0;

  let rows;
  try {
    [rows] = await dbPool.query(
      `SELECT userId, username, email, walletAddress, certificateFile, realName, phone, idCard, avatar, gender, role, walletBound, tokenBalance, schoolName, createdAt, updatedAt
       FROM user
       ${whereClause}
       ORDER BY createdAt DESC
       LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );
  } catch (error) {
    console.error('Get user list failed:', error);
    throw error;
  }

  return { records: rows as UserInfo[], total };
}

/**
 * 管理员更新用户信息
 * 允许更新更多字段（包含 role / walletBound / password 等）
 */
export async function putUserByAdmin(
  userId: number,
  data: Partial<UserInfo>
): Promise<UserInfo> {
  const allowedFields = ['email', 'realName', 'phone', 'idCard', 'avatar', 'gender', 'role', 'walletBound', 'tokenBalance', 'schoolName', 'certificateFile', 'walletAddress', 'password'];

  const updateFields: string[] = [];
  const values: any[] = [];

  allowedFields.forEach(field => {
    if (data[field as keyof UserInfo] !== undefined) {
      updateFields.push(`${field} = ?`);
      values.push(data[field as keyof UserInfo]);
    }
  });

  if (updateFields.length === 0) {
    throw new Error('No valid fields to update');
  }

  const now = new Date();
  updateFields.push('updatedAt = ?');
  values.push(now);
  values.push(userId);

  try {
    await dbPool.query(`UPDATE user SET ${updateFields.join(', ')} WHERE userId = ?`, values);
  } catch (error) {
    console.error('Admin update user failed:', error);
    throw error;
  }

  let rows;
  try {
    [rows] = await dbPool.query(
      'SELECT userId, username, email, walletAddress, certificateFile, realName, phone, idCard, avatar, gender, role, walletBound, tokenBalance, schoolName, createdAt, updatedAt FROM user WHERE userId = ?',
      [userId]
    );
  } catch (error) {
    console.error('Get user failed:', error);
    throw error;
  }

  const users = rows as UserInfo[];
  if (users.length === 0) throw new Error('User not found after update');
  return users[0];
}
