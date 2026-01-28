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
  status?: number;            // 课程状态（0:待审核，1:已审核，2:已发布，3:已下架）
  createdAt?: Date;           // 创建时间
  updatedAt?: Date;           // 更新时间
  // 完整的教师信息对象
  teacher?: UserInfo | null;  // 教师完整信息
}

// 课程查询参数类型（用于列表查询）
export interface CourseInfoQueryParams extends Partial<CourseInfo> {
  schoolName?: string;        // 学校名称（用于筛选，通过 JOIN teacher 表）
  schoolNames?: string[];     // 多个学校名称（用于筛选，通过 JOIN teacher 表）
  teacherName?: string;       // 教师姓名（用于模糊查询，通过 JOIN teacher 表）
  startDate?: string;         // 开始日期（用于开课时间范围筛选，基于 courseStartTime）
  endDate?: string;           // 结束日期（用于开课时间范围筛选，基于 courseStartTime）
}
