import { UserInfo } from './userType';

// 代币规则信息类型
export interface TokenRuleInfo {
  ruleId?: number;           // 规则ID，自增
  rewardType?: number;       // 奖励类型（0:学习完成，1:资源上传，2:评价参与），唯一
  rewardAmount?: number;     // 奖励数量
  tokenName?: string;        // 代币名称
  isEnabled?: number;        // 是否启用（0:禁用，1:启用）
  updatedBy?: number;        // 更新者ID（管理员ID），外键
  createdAt?: Date;          // 创建时间
  updatedAt?: Date;          // 更新时间
  // 完整的更新者信息对象
  updater?: UserInfo | null; // 更新者完整信息
}

// 代币规则列表查询参数（用于 controller/service/model 透传）
export interface TokenRuleInfoQueryParams extends Partial<TokenRuleInfo> {
  startDate?: string;        // YYYY-MM-DD HH:mm:ss
  endDate?: string;          // YYYY-MM-DD HH:mm:ss
}