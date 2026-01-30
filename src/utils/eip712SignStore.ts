import crypto from 'crypto';
import type { ClaimRewardSign } from '../types/eip712SignType';

/* 
 * - 进程内的临时存储（重启会丢失，多实例不共享）
 * - 生产建议用 Redis/数据库存储 nonce，并做过期清理
 * - 统一存储所有奖励类型的签名数据（通过 rewardType 区分）
 */
const store = new Map<string, ClaimRewardSign>();

/**
 * 构建存储键
 * @param userId 用户ID
 * @param walletAddress 钱包地址
 * @param resourceId 资源ID
 * @param rewardType 奖励类型（0=学习完成奖励, 1=上传资源奖励）
 * @returns 格式化的存储键字符串
 */
function buildKey(userId: number, walletAddress: string, resourceId: number, rewardType: number) {
  return `${userId}:${walletAddress.toLowerCase()}:${resourceId}:${rewardType}`;
}

/**
 * 创建并存储 EIP-712 签名挑战（通用函数，适用于所有奖励类型）
 * @param input 签名数据（不包含 nonce 和 createdAtMs）
 * @returns 包含 nonce 和 createdAtMs 的完整签名数据
 */
export function issueClaimRewardSign(input: Omit<ClaimRewardSign, 'nonce' | 'createdAtMs'>) {
  const nonce = BigInt('0x' + crypto.randomBytes(16).toString('hex')).toString(10);
  const sign: ClaimRewardSign = {
    ...input,
    nonce,
    createdAtMs: Date.now(),
  };
  store.set(buildKey(input.userId, input.walletAddress, input.resourceId, input.rewardType), sign);
  return sign;
}

/**
 * 获取 EIP-712 签名挑战（不删除）（通用函数，适用于所有奖励类型）
 * @param userId 用户ID
 * @param walletAddress 钱包地址
 * @param resourceId 资源ID
 * @param rewardType 奖励类型（0=学习完成奖励, 1=上传资源奖励）
 * @returns 签名数据，如果不存在则返回 undefined
 */
export function getClaimRewardSign(userId: number, walletAddress: string, resourceId: number, rewardType: number) {
  return store.get(buildKey(userId, walletAddress, resourceId, rewardType));
}

/**
 * 消费 EIP-712 签名挑战（获取后删除，防止重复使用）（通用函数，适用于所有奖励类型）
 * @param userId 用户ID
 * @param walletAddress 钱包地址
 * @param resourceId 资源ID
 * @param rewardType 奖励类型（0=学习完成奖励, 1=上传资源奖励）
 * @returns 签名数据，如果不存在则返回 null
 */
export function consumeClaimRewardSign(userId: number, walletAddress: string, resourceId: number, rewardType: number) {
  const key = buildKey(userId, walletAddress, resourceId, rewardType);
  const existing = store.get(key);
  if (!existing) return null;
  store.delete(key);
  return existing;
}
