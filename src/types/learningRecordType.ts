import { UserInfo } from './userType';
import { ResourceInfo } from './resourceType';

// 学习记录类型
export interface LearningRecordInfo {
  recordId?: number;              // 学习记录ID，自增
  studentId?: number;             // 学生用户ID，外键
  resourceId?: number;            // 教育资源ID，外键
  progress?: number;              // 学习进度（0-100，完成百分比）
  learningTime?: number;          // 学习时长（秒）
  review?: string;                // 学习评价内容
  rating?: number;                // 评价分数（1-5星）
  isCompleted?: number;           // 是否完成（0:未完成，1:已完成）
  isVisible?: number;             // 评价是否可见（0:隐藏，1:显示）
  completedAt?: Date;             // 完成时间
  createdAt?: Date;               // 创建时间
  updatedAt?: Date;               // 更新时间
  // 学生信息
  student?: UserInfo | null;      // 学生完整信息
  // 资源信息
  resource?: ResourceInfo | null; // 资源完整信息
}

// 学习记录查询参数类型（用于列表查询）
export interface LearningRecordInfoQueryParams extends Partial<LearningRecordInfo> {
  teacherName?: string;           // 教师姓名（用于模糊查询，通过 JOIN course 和 user 表）
  resourceType?: number;          // 资源类型（用于筛选，通过 JOIN resource 表）
  isCompleted?: number;           // 是否完成（用于筛选）
}
