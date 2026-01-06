import { UserInfo } from './userType';

// 审核记录类型
export interface AuditRecordInfo {
  auditId?: number;        // 审核记录ID
  auditType?: number;      // 审核类型
  targetId?: number;       // 目标ID（如用户ID）
  targetType?: number;     // 目标类型
  auditorId?: number;      // 审核人ID
  auditStatus?: number;    // 审核状态
  auditComment?: string;  // 审核意见
  auditTime?: Date;        // 审核时间
  createdAt?: Date;       // 创建时间
  // 完整的用户信息对象
  targetUser?: UserInfo | null;  // 申请人完整信息
  auditor?: UserInfo | null;     // 审批人完整信息
}
