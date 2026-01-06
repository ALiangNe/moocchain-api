import { dbPool } from '../config/database';
import { UserInfo } from '../types/userType';

/**
 * 查询用户
 * 根据条件动态构建查询语句，支持按 userId、username、password、email 查询
 */
export async function getUser(conditions: Partial<UserInfo>): Promise<UserInfo | null> {
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
    [rows] = await dbPool.query(
      `SELECT userId, username, email, walletAddress, certificateFile, realName, phone, idCard, avatar, gender, role, walletBound, tokenBalance, schoolName, createdAt, updatedAt FROM user ${whereClause}`,
      values
    );
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
export async function postUser(data: Partial<UserInfo>): Promise<UserInfo> {
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
export async function putUser(userId: number, data: Partial<UserInfo>): Promise<UserInfo> {
  // 允许更新的字段
  const allowedFields = ['email', 'realName', 'phone', 'idCard', 'avatar', 'gender', 'schoolName', 'certificateFile'];
  
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
export async function updateUserRole(userId: number, role: number): Promise<UserInfo> {
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

