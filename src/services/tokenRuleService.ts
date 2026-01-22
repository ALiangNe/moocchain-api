import { TokenRuleInfo } from '../types/tokenRuleType';
import { getTokenRule, postTokenRule, putTokenRule, getTokenRuleList } from '../models/tokenRuleModel';
import { getUser } from '../models/userModel';
import { ROLE_ADMIN } from '../middlewares/roleMiddleware';

/**
 * 创建代币规则服务
 * 管理员创建新代币规则
 */
export async function createTokenRuleService(
  adminId: number,
  data: Partial<TokenRuleInfo>
): Promise<TokenRuleInfo> {
  // 检查管理员是否存在
  const admin = await getUser({ userId: adminId });
  if (!admin) {
    throw new Error('Admin not found');
  }

  // 检查管理员角色
  if (admin.role !== ROLE_ADMIN) {
    throw new Error('Only admins can create token rules');
  }

  // 检查 rewardType 是否已存在（唯一约束）
  if (data.rewardType !== undefined) {
    const existingRule = await getTokenRule({ rewardType: data.rewardType });
    if (existingRule) {
      throw new Error('Reward type already exists');
    }
  }

  // 创建代币规则（默认启用）
  const params: Partial<TokenRuleInfo> = {
    ...data,
    updatedBy: adminId,
    isEnabled: data.isEnabled !== undefined ? data.isEnabled : 1, // 默认启用
  };

  return await postTokenRule(params);
}

/**
 * 更新代币规则服务
 * 管理员更新代币规则信息
 */
export async function updateTokenRuleService(
  adminId: number,
  ruleId: number,
  data: Partial<TokenRuleInfo>
): Promise<TokenRuleInfo> {
  // 检查管理员是否存在
  const admin = await getUser({ userId: adminId });
  if (!admin) {
    throw new Error('Admin not found');
  }

  // 检查管理员角色
  if (admin.role !== ROLE_ADMIN) {
    throw new Error('Only admins can update token rules');
  }

  // 检查规则是否存在
  const rule = await getTokenRule({ ruleId });
  if (!rule) {
    throw new Error('Token rule not found');
  }

  // 更新代币规则（必须更新 updatedBy）
  const params: Partial<TokenRuleInfo> = {
    ...data,
    updatedBy: adminId,
  };

  return await putTokenRule(ruleId, params);
}

/**
 * 获取代币规则列表服务
 * 支持按条件筛选和分页
 */
export async function getTokenRuleListService(
  params: Partial<TokenRuleInfo>,
  page: number = 1,
  pageSize: number = 10
): Promise<{ records: TokenRuleInfo[]; total: number }> {
  return await getTokenRuleList(params, page, pageSize);
}

/**
 * 获取代币规则详情服务
 * 根据规则ID获取规则信息
 */
export async function getTokenRuleService(ruleId: number): Promise<TokenRuleInfo> {
  const rule = await getTokenRule({ ruleId });
  if (!rule) {
    throw new Error('Token rule not found');
  }
  return rule;
}
