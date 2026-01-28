import { dbPool } from '../config/database';
import { TokenTransactionInfo, TokenTransactionInfoQueryParams } from '../types/tokenTransactionType';

/**
 * 创建代币交易记录
 * 插入新代币交易记录到数据库，创建后返回完整交易信息
 */
export async function postTokenTransaction(
  data: Partial<TokenTransactionInfo>
): Promise<TokenTransactionInfo> {
  const { userId, transactionType, rewardType, consumeType, amount, balanceBefore, balanceAfter, relatedId, transactionHash } = data;

  if (userId === undefined) {
    throw new Error('userId is required');
  }
  if (transactionType === undefined) {
    throw new Error('transactionType is required');
  }
  if (amount === undefined) {
    throw new Error('amount is required');
  }
  if (balanceBefore === undefined) {
    throw new Error('balanceBefore is required');
  }
  if (balanceAfter === undefined) {
    throw new Error('balanceAfter is required');
  }

  const now = new Date();

  let result;
  try {
    [result] = await dbPool.query(
      'INSERT INTO tokenTransaction (userId, transactionType, rewardType, consumeType, amount, balanceBefore, balanceAfter, relatedId, transactionHash, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [userId, transactionType, rewardType !== undefined ? rewardType : null, consumeType !== undefined ? consumeType : null, amount, balanceBefore, balanceAfter, relatedId !== undefined ? relatedId : null, transactionHash !== undefined ? transactionHash : null, now]
    );
  } catch (error) {
    console.error('Create token transaction failed:', error);
    throw error;
  }

  const insertResult = result as { insertId: number };

  let rows;
  try {
    [rows] = await dbPool.query(
      `SELECT 
        tt.transactionId, tt.userId, tt.transactionType, tt.rewardType, tt.consumeType, tt.amount, tt.balanceBefore, tt.balanceAfter, tt.relatedId, tt.transactionHash, tt.createdAt,
        u.userId AS userUserId, u.username AS userUsername, u.realName AS userRealName, u.email AS userEmail, u.avatar AS userAvatar
      FROM tokenTransaction tt
      LEFT JOIN user u ON tt.userId = u.userId
      WHERE tt.transactionId = ?`,
      [insertResult.insertId]
    );
  } catch (error) {
    console.error('Get token transaction failed:', error);
    throw error;
  }

  const transactions = (rows as any[]).map((row: any): TokenTransactionInfo => ({
    transactionId: row.transactionId,
    userId: row.userId,
    transactionType: row.transactionType,
    rewardType: row.rewardType,
    consumeType: row.consumeType,
    amount: row.amount,
    balanceBefore: row.balanceBefore,
    balanceAfter: row.balanceAfter,
    relatedId: row.relatedId,
    transactionHash: row.transactionHash,
    createdAt: row.createdAt,
    user: row.userUserId ? {
      userId: row.userUserId,
      username: row.userUsername,
      realName: row.userRealName,
      email: row.userEmail,
      avatar: row.userAvatar,
    } : null,
  }));

  return transactions[0];
}

/**
 * 查询代币交易记录列表
 * 根据条件动态构建查询语句，支持按 userId、transactionType、rewardType、consumeType 查询和分页
 */
export async function getTokenTransactionList(
  conditions: TokenTransactionInfoQueryParams,
  page: number = 1,
  pageSize: number = 10
): Promise<{ records: TokenTransactionInfo[]; total: number }> {
  const { userId, transactionType, rewardType, consumeType, relatedId, startDate, endDate } = conditions;

  const whereConditions: string[] = [];
  const values: any[] = [];

  if (userId) {
    whereConditions.push('tt.userId = ?');
    values.push(userId);
  }
  if (transactionType !== undefined) {
    whereConditions.push('tt.transactionType = ?');
    values.push(transactionType);
  }
  if (rewardType === undefined) {
    // 跳过
  } else if (rewardType === null) {
    // 支持查询 NULL 值
    whereConditions.push('tt.rewardType IS NULL');
  } else {
    whereConditions.push('tt.rewardType = ?');
    values.push(rewardType);
  }
  if (consumeType !== undefined) {
    whereConditions.push('tt.consumeType = ?');
    values.push(consumeType);
  }
  if (relatedId !== undefined) {
    whereConditions.push('tt.relatedId = ?');
    values.push(relatedId);
  }
  if (startDate) {
    whereConditions.push('tt.createdAt >= ?');
    values.push(startDate);
  }
  if (endDate) {
    whereConditions.push('tt.createdAt <= ?');
    values.push(endDate);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // 计算分页
  const offset = (page - 1) * pageSize;

  // 查询总数
  let totalRows;
  try {
    [totalRows] = await dbPool.query(
      `SELECT COUNT(*) as total FROM tokenTransaction tt ${whereClause}`,
      values
    );
  } catch (error) {
    console.error('Get token transaction total failed:', error);
    throw error;
  }

  const total = (totalRows as any[])[0]?.total || 0;

  // 查询列表
  let rows;
  try {
    [rows] = await dbPool.query(
      `SELECT 
        tt.transactionId, tt.userId, tt.transactionType, tt.rewardType, tt.consumeType, tt.amount, tt.balanceBefore, tt.balanceAfter, tt.relatedId, tt.transactionHash, tt.createdAt,
        u.userId AS userUserId, u.username AS userUsername, u.realName AS userRealName, u.email AS userEmail, u.avatar AS userAvatar
      FROM tokenTransaction tt
      LEFT JOIN user u ON tt.userId = u.userId
      ${whereClause}
      ORDER BY tt.createdAt DESC
      LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );
  } catch (error) {
    console.error('Get token transaction list failed:', error);
    throw error;
  }

  const records = (rows as any[]).map((row: any): TokenTransactionInfo => ({
    transactionId: row.transactionId,
    userId: row.userId,
    transactionType: row.transactionType,
    rewardType: row.rewardType,
    consumeType: row.consumeType,
    amount: row.amount,
    balanceBefore: row.balanceBefore,
    balanceAfter: row.balanceAfter,
    relatedId: row.relatedId,
    transactionHash: row.transactionHash,
    createdAt: row.createdAt,
    user: row.userUserId ? {
      userId: row.userUserId,
      username: row.userUsername,
      realName: row.userRealName,
      email: row.userEmail,
      avatar: row.userAvatar,
    } : null,
  }));

  return { records, total };
}
