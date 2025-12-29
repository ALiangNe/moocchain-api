import { dbPool } from '../config/database';
import { UserInfo } from '../types/userType';

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

