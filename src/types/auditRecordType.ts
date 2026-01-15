import { UserInfo } from './userType';
import { ResourceInfo } from './resourceType';
import { CourseInfo } from './courseType';

// 审核记录类型
export interface AuditRecordInfo {
  auditId?: number;                      // 审核记录ID
  auditType?: number;                    // 审核类型（0:用户身份，1:资源内容，2:课程内容）
  targetId?: number;                     // 目标ID（用户ID、资源ID或课程ID）
  targetType?: number;                   // 目标类型（0:用户，1:资源，2:课程）
  auditorId?: number;                    // 审核人ID
  auditStatus?: number;                  // 审核状态（0:待审核，1:通过，2:拒绝）
  auditComment?: string;                 // 审核意见
  auditTime?: Date;                      // 审核时间
  createdAt?: Date;                      // 创建时间
  // 完整的用户信息对象（targetType = 0时）
  targetUser?: UserInfo | null;          // 申请人完整信息
  // 资源信息对象（targetType = 1时）
  targetResource?: ResourceInfo | null;  // 资源完整信息
  // 课程信息对象（targetType = 2时）
  targetCourse?: CourseInfo | null;      // 课程完整信息
  // 审批人信息对象
  auditor?: UserInfo | null;             // 审批人完整信息
}
