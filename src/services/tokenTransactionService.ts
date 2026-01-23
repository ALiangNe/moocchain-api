import { TokenTransactionInfo } from '../types/tokenTransactionType';
import { postTokenTransaction, getTokenTransactionList } from '../models/tokenTransactionModel';
import { getUser, putUser } from '../models/userModel';
import { getTokenRule } from '../models/tokenRuleModel';
import { mintMOOCTokenToAddress, getMOOCTokenBalance } from '../utils/moocToken';

/**
 * 创建代币奖励交易记录服务
 * 用于记录用户获得代币奖励的交易
 */
export async function createTokenRewardTransactionService(
  userId: number,
  rewardType: number,
  relatedId?: number,
  walletAddress?: string
): Promise<TokenTransactionInfo> {
  // 检查用户是否存在
  const user = await getUser({ userId });
  if (!user) {
    throw new Error('User not found');
  }

  // 获取代币规则
  const rule = await getTokenRule({ rewardType, isEnabled: 1 });
  if (!rule) {
    throw new Error('Token rule not found or disabled');
  }

  // 检查该用户是否已经领取过该资源的该类型奖励（防止重复领取）
  const existingReward = await getTokenTransactionList(
    {
      userId,
      transactionType: 0, // 奖励
      rewardType,
      relatedId,
    },
    1,
    1
  );
  if (existingReward.records.length > 0) {
    throw new Error('Reward already claimed');
  }

  // 验证钱包地址
  if (!walletAddress) {
    throw new Error('Wallet address is required');
  }

  // 获取当前余额（从合约获取）
  let balanceBefore: number;
  try {
    const balanceStr = await getMOOCTokenBalance(walletAddress);
    balanceBefore = parseFloat(balanceStr);
  } catch (error) {
    console.error('Get balance error:', error);
    // 如果获取失败，使用数据库中的余额
    balanceBefore = Number(user.tokenBalance || 0);
  }

  const rewardAmount = Number(rule.rewardAmount || 0);
  const balanceAfter = balanceBefore + rewardAmount;

  // 使用管理员私钥代为 mint 代币到用户地址
  let transactionHash: string;
  try {
    transactionHash = await mintMOOCTokenToAddress(walletAddress, String(rewardAmount));
  } catch (error) {
    console.error('Mint token error:', error);
    throw new Error(error instanceof Error ? error.message : 'Failed to mint token');
  }

  // 创建交易记录
  const transactionData: Partial<TokenTransactionInfo> = {
    userId,
    transactionType: 0, // 奖励
    rewardType,
    amount: rewardAmount,
    balanceBefore,
    balanceAfter,
    relatedId,
    transactionHash,
  };

  const transaction = await postTokenTransaction(transactionData);

  // 更新用户余额和钱包地址
  const updateData: Partial<{ tokenBalance: number; walletAddress: string }> = { tokenBalance: balanceAfter };
  if (walletAddress) {
    updateData.walletAddress = walletAddress;
  }
  await putUser(userId, updateData);

  return transaction;
}

/**
 * 获取代币交易记录列表服务
 * 支持按条件筛选和分页
 */
export async function getTokenTransactionListService(
  params: Partial<TokenTransactionInfo>,
  page: number = 1,
  pageSize: number = 10
): Promise<{ records: TokenTransactionInfo[]; total: number }> {
  return await getTokenTransactionList(params, page, pageSize);
}
