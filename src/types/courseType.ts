import { UserInfo } from './userType';

// 课程基础信息类型
export interface CourseInfo {
  courseId?: number;          // 课程ID
  courseName?: string;        // 课程名称
  teacherId?: number;         // 教师ID
  description?: string;       // 课程描述
  coverImage?: string;        // 课程封面图片
  courseStartTime?: Date;     // 开课时间
  courseEndTime?: Date;       // 结课时间
  status?: number;            // 课程状态（0:未发布，1:已发布，2:已结束）
  createdAt?: Date;           // 创建时间
  updatedAt?: Date;           // 更新时间
  // 完整的教师信息对象
  teacher?: UserInfo | null;  // 教师完整信息
}
