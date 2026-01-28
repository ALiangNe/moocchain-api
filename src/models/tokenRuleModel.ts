import { dbPool } from '../config/database';
import { TokenRuleInfo } from '../types/tokenRuleType';

/**
 * 创建代币规则
 * 插入新代币规则到数据库，创建后返回完整规则信息
 */
export async function postTokenRule(
  data: Partial<TokenRuleInfo>
): Promise<TokenRuleInfo> {
  const { rewardType, rewardAmount, tokenName, isEnabled, updatedBy } = data;

  if (rewardType === undefined) {
    throw new Error('rewardType is required');
  }
  if (rewardAmount === undefined) {
    throw new Error('rewardAmount is required');
  }
  if (!tokenName) {
    throw new Error('tokenName is required');
  }
  if (updatedBy === undefined) {
    throw new Error('updatedBy is required');
  }

  const now = new Date();

  let result;
  try {
    [result] = await dbPool.query(
      'INSERT INTO tokenRule (rewardType, rewardAmount, tokenName, isEnabled, updatedBy, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [rewardType, rewardAmount, tokenName, isEnabled !== undefined ? isEnabled : 1, updatedBy, now, now]
    );
  } catch (error) {
    console.error('Create token rule failed:', error);
    throw error;
  }

  const insertResult = result as { insertId: number };

  let rows;
  try {
    [rows] = await dbPool.query(
      `SELECT 
        tr.ruleId, tr.rewardType, tr.rewardAmount, tr.tokenName, tr.isEnabled, tr.updatedBy, tr.createdAt, tr.updatedAt,
        u.userId AS updaterUserId, u.username AS updaterUsername, u.realName AS updaterRealName, u.email AS updaterEmail, u.avatar AS updaterAvatar
      FROM tokenRule tr
      LEFT JOIN user u ON tr.updatedBy = u.userId
      WHERE tr.ruleId = ?`,
      [insertResult.insertId]
    );
  } catch (error) {
    console.error('Get token rule failed:', error);
    throw error;
  }

  const rules = (rows as any[]).map((row: any): TokenRuleInfo => ({
    ruleId: row.ruleId,
    rewardType: row.rewardType,
    rewardAmount: row.rewardAmount,
    tokenName: row.tokenName,
    isEnabled: row.isEnabled,
    updatedBy: row.updatedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    // 返回更新者的关键信息
    updater: row.updaterUserId ? {
      userId: row.updaterUserId,
      username: row.updaterUsername,
      email: row.updaterEmail,
      realName: row.updaterRealName,
      avatar: row.updaterAvatar,
    } : null,
  }));

  return rules[0];
}

/**
 * 更新代币规则信息
 * 根据 ruleId 更新代币规则信息，只允许更新特定字段
 */
export async function putTokenRule(
  ruleId: number,
  data: Partial<TokenRuleInfo>
): Promise<TokenRuleInfo> {
  // 允许更新的字段
  const allowedFields = ['rewardAmount', 'tokenName', 'isEnabled', 'updatedBy'];

  const updateFields: string[] = [];
  const values: any[] = [];

  // 动态构建 UPDATE 语句
  allowedFields.forEach(field => {
    if (data[field as keyof TokenRuleInfo] !== undefined) {
      updateFields.push(`${field} = ?`);
      values.push(data[field as keyof TokenRuleInfo]);
    }
  });

  if (updateFields.length === 0) {
    throw new Error('No valid fields to update');
  }

  // 添加 updatedAt 字段
  const now = new Date();
  updateFields.push('updatedAt = ?');
  values.push(now);

  // 添加 ruleId 到参数列表
  values.push(ruleId);

  // 执行更新
  try {
    await dbPool.query(
      `UPDATE tokenRule SET ${updateFields.join(', ')} WHERE ruleId = ?`,
      values
    );
  } catch (error) {
    console.error('Update token rule failed:', error);
    throw error;
  }

  // 查询并返回更新后的规则信息
  let rows;
  try {
    [rows] = await dbPool.query(
      `SELECT 
        tr.ruleId, tr.rewardType, tr.rewardAmount, tr.tokenName, tr.isEnabled, tr.updatedBy, tr.createdAt, tr.updatedAt,
        u.userId AS updaterUserId, u.username AS updaterUsername, u.realName AS updaterRealName, u.email AS updaterEmail, u.avatar AS updaterAvatar
      FROM tokenRule tr
      LEFT JOIN user u ON tr.updatedBy = u.userId
      WHERE tr.ruleId = ?`,
      [ruleId]
    );
  } catch (error) {
    console.error('Get token rule failed:', error);
    throw error;
  }

  const rules = (rows as any[]).map((row: any): TokenRuleInfo => ({
    ruleId: row.ruleId,
    rewardType: row.rewardType,
    rewardAmount: row.rewardAmount,
    tokenName: row.tokenName,
    isEnabled: row.isEnabled,
    updatedBy: row.updatedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    // 返回更新者的关键信息
    updater: row.updaterUserId ? {
      userId: row.updaterUserId,
      username: row.updaterUsername,
      email: row.updaterEmail,
      realName: row.updaterRealName,
      avatar: row.updaterAvatar,
    } : null,
  }));

  if (rules.length === 0) {
    throw new Error('Token rule not found after update');
  }

  return rules[0];
}

/**
 * 获取代币规则列表
 * 支持分页和条件筛选
 */
export async function getTokenRuleList(
  params: Partial<TokenRuleInfo> & { startDate?: string; endDate?: string },
  page: number = 1,
  pageSize: number = 10
): Promise<{ records: TokenRuleInfo[]; total: number }> {
  const { rewardType, isEnabled, startDate, endDate } = params;

  const whereConditions: string[] = [];
  const values: any[] = [];

  if (rewardType !== undefined) {
    whereConditions.push('tr.rewardType = ?');
    values.push(rewardType);
  }
  if (isEnabled !== undefined) {
    whereConditions.push('tr.isEnabled = ?');
    values.push(isEnabled);
  }
  if (startDate) {
    whereConditions.push('tr.createdAt >= ?');
    values.push(startDate);
  }
  if (endDate) {
    whereConditions.push('tr.createdAt <= ?');
    values.push(endDate);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  const offset = (page - 1) * pageSize;

  // 查询总数
  let countRows;
  try {
    [countRows] = await dbPool.query(
      `SELECT COUNT(*) as total FROM tokenRule tr ${whereClause}`,
      values
    );
  } catch (error) {
    console.error('Get token rule count failed:', error);
    throw error;
  }

  const total = (countRows as { total: number }[])[0]?.total || 0;

  // 查询列表
  let rows;
  try {
    [rows] = await dbPool.query(
      `SELECT 
        tr.ruleId, tr.rewardType, tr.rewardAmount, tr.tokenName, tr.isEnabled, tr.updatedBy, tr.createdAt, tr.updatedAt,
        u.userId AS updaterUserId, u.username AS updaterUsername, u.realName AS updaterRealName, u.email AS updaterEmail, u.avatar AS updaterAvatar
      FROM tokenRule tr
      LEFT JOIN user u ON tr.updatedBy = u.userId
      ${whereClause}
      ORDER BY tr.createdAt DESC 
      LIMIT ? OFFSET ?`,
      [...values, pageSize, offset]
    );
  } catch (error) {
    console.error('Get token rule list failed:', error);
    throw error;
  }

  const records = (rows as any[]).map((row: any): TokenRuleInfo => ({
    ruleId: row.ruleId,
    rewardType: row.rewardType,
    rewardAmount: row.rewardAmount,
    tokenName: row.tokenName,
    isEnabled: row.isEnabled,
    updatedBy: row.updatedBy,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    // 返回更新者的关键信息
    updater: row.updaterUserId ? {
      userId: row.updaterUserId,
      username: row.updaterUsername,
      email: row.updaterEmail,
      realName: row.updaterRealName,
      avatar: row.updaterAvatar,
    } : null,
  }));

  return { records, total };
}

/**
 * 查询代币规则
 * 根据条件动态构建查询语句，支持按 ruleId、rewardType、isEnabled 查询
 */
export async function getTokenRule(
    conditions: Partial<TokenRuleInfo>
  ): Promise<TokenRuleInfo | null> {
    const { ruleId, rewardType, isEnabled } = conditions;
  
    const whereConditions: string[] = [];
    const values: any[] = [];
  
    if (ruleId) {
      whereConditions.push('tr.ruleId = ?');
      values.push(ruleId);
    }
    if (rewardType !== undefined) {
      whereConditions.push('tr.rewardType = ?');
      values.push(rewardType);
    }
    if (isEnabled !== undefined) {
      whereConditions.push('tr.isEnabled = ?');
      values.push(isEnabled);
    }
  
    const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';
  
    let rows;
    try {
      [rows] = await dbPool.query(
        `SELECT 
          tr.ruleId, tr.rewardType, tr.rewardAmount, tr.tokenName, tr.isEnabled, tr.updatedBy, tr.createdAt, tr.updatedAt,
          u.userId AS updaterUserId, u.username AS updaterUsername, u.realName AS updaterRealName, u.email AS updaterEmail, u.avatar AS updaterAvatar
        FROM tokenRule tr 
        LEFT JOIN user u ON tr.updatedBy = u.userId
        ${whereClause}`,
        values
      );
    } catch (error) {
      console.error('Get token rule failed:', error);
      throw error;
    }
  
    const rules = (rows as any[]).map((row: any): TokenRuleInfo => ({
      ruleId: row.ruleId,
      rewardType: row.rewardType,
      rewardAmount: row.rewardAmount,
      tokenName: row.tokenName,
      isEnabled: row.isEnabled,
      updatedBy: row.updatedBy,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      // 返回更新者的关键信息
      updater: row.updaterUserId ? {
        userId: row.updaterUserId,
        username: row.updaterUsername,
        email: row.updaterEmail,
        realName: row.updaterRealName,
        avatar: row.updaterAvatar,
      } : null,
    }));
  
    return rules.length > 0 ? rules[0] : null;
  }
  