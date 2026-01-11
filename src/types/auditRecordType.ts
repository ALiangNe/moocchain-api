import { UserInfo } from './userType';
import { ResourceInfo } from './resourceType';

// 审核记录类型
export interface AuditRecordInfo {
  auditId?: number;                      // 审核记录ID
  auditType?: number;                    // 审核类型（0:用户身份，1:资源内容）
  targetId?: number;                     // 目标ID（用户ID或资源ID）
  targetType?: number;                   // 目标类型（1:用户，2:资源）
  auditorId?: number;                    // 审核人ID
  auditStatus?: number;                  // 审核状态（0:待审核，1:通过，2:拒绝）
  auditComment?: string;                 // 审核意见
  auditTime?: Date;                      // 审核时间
  createdAt?: Date;                      // 创建时间
  // 完整的用户信息对象（targetType = 1时）
  targetUser?: UserInfo | null;          // 申请人完整信息
  // 资源信息对象（targetType = 2时）
  targetResource?: ResourceInfo | null;  // 资源完整信息
  auditor?: UserInfo | null;             // 审批人完整信息
}
