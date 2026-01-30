/**
 * EIP-712 签名数据结构
 * rewardType: 0=学习完成奖励, 1=上传资源奖励
 */
export type ClaimRewardSign = {
  userId: number;
  walletAddress: string;
  resourceId: number;
  rewardType: number;
  chainId: number;
  amount: string;
  nonce: string; // uint256 string
  deadline: number; // unix seconds
  createdAtMs: number;
};