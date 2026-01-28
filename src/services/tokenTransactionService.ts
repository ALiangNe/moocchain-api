import { TokenTransactionInfo, TokenTransactionInfoQueryParams } from '../types/tokenTransactionType';
import { postTokenTransaction, getTokenTransactionList } from '../models/tokenTransactionModel';
import { getUser, putUser } from '../models/userModel';
import { getTokenRule } from '../models/tokenRuleModel';
import { getResource } from '../models/resourceModel';
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
 * 创建代币消费交易记录服务
 * 用于记录用户购买资源等消费行为
 */
export async function createTokenConsumeTransactionService(
  userId: number,
  consumeType: number,
  relatedId: number,
  transactionHash: string,
  walletAddress: string
): Promise<TokenTransactionInfo> {
  // 检查用户是否存在
  const user = await getUser({ userId });
  if (!user) {
    throw new Error('User not found');
  }

  // 验证钱包地址
  if (!walletAddress) {
    throw new Error('Wallet address is required');
  }

  // 验证交易哈希
  if (!transactionHash) {
    throw new Error('Transaction hash is required');
  }

  // 检查该用户是否已经对该资源进行过该类型的消费（防止重复消费）
  const existingConsume = await getTokenTransactionList(
    {
      userId,
      transactionType: 1, // 消费
      consumeType,
      relatedId,
    },
    1,
    1
  );
  if (existingConsume.records.length > 0) {
    throw new Error('Consume already recorded');
  }

  // 如果是购买资源，检查资源是否存在
  if (consumeType === 0 && relatedId) {
    const resource = await getResource({ resourceId: relatedId });
    if (!resource) {
      throw new Error('Resource not found');
    }

    // 检查资源是否为付费资源
    if (!resource.price || Number(resource.price) <= 0) {
      throw new Error('Resource is not a paid resource');
    }
  }

  // 获取消费金额
  let consumeAmount = 0;
  if (consumeType === 0 && relatedId) {
    const resource = await getResource({ resourceId: relatedId });
    if (!resource || !resource.price) {
      throw new Error('Resource price not found');
    }
    consumeAmount = Number(resource.price);
  }

  // 获取当前余额（从合约获取，转账后的余额）
  let balanceAfter: number;
  try {
    const balanceStr = await getMOOCTokenBalance(walletAddress);
    balanceAfter = parseFloat(balanceStr);
  } catch (error) {
    console.error('Get balance error:', error);
    // 如果获取失败，使用数据库中的余额减去消费金额
    balanceAfter = Number(user.tokenBalance || 0) - consumeAmount;
  }

  // 计算转账前的余额（转账后余额 + 消费金额 = 转账前余额）
  const balanceBefore = balanceAfter + consumeAmount;

  // 创建交易记录
  const transactionData: Partial<TokenTransactionInfo> = {
    userId,
    transactionType: 1, // 消费
    consumeType, // 消费类型（0:购买资源，1:兑换服务，2:获取权益）
    amount: consumeAmount,
    balanceBefore,
    balanceAfter,
    relatedId, // 关联ID（资源ID、证书ID等）
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
  params: TokenTransactionInfoQueryParams,
  page: number = 1,
  pageSize: number = 10
): Promise<{ records: TokenTransactionInfo[]; total: number }> {
  return await getTokenTransactionList(params, page, pageSize);
}
