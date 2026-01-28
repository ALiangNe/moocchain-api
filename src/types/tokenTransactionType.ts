import { UserInfo } from './userType';

// 代币交易记录信息类型
export interface TokenTransactionInfo {
  transactionId?: number;        // 交易记录ID，自增
  userId?: number;               // 用户ID，外键
  transactionType?: number;     // 交易类型（0:奖励，1:消费，2:转账）
  rewardType?: number;          // 奖励类型（0:学习完成，1:资源上传，2:评价参与）
  consumeType?: number;         // 消费类型（0:购买资源，1:兑换服务，2:获取权益）
  amount?: number;              // 交易数量
  balanceBefore?: number;       // 交易前余额
  balanceAfter?: number;        // 交易后余额
  relatedId?: number;           // 关联ID（资源ID、证书ID等）
  transactionHash?: string;     // 区块链交易哈希
  createdAt?: Date;             // 创建时间
  // 用户信息
  user?: UserInfo | null;       // 用户完整信息
}

// 代币交易记录查询参数类型
export interface TokenTransactionInfoQueryParams extends Partial<TokenTransactionInfo> {
  startDate?: string;          // 开始日期（用于日期范围筛选）
  endDate?: string;            // 结束日期（用于日期范围筛选）
}
