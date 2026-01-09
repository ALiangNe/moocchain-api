import { UserInfo } from './userType';
import { CourseInfo } from './courseType';

// 教育资源信息类型
export interface ResourceInfo {
  resourceId?: number;
  resourceNftId?: string;
  ownerId?: number;
  courseId?: number;
  title?: string;
  description?: string;
  ipfsHash?: string;
  resourceType?: number;
  price?: number;
  accessScope?: number;
  status?: number;
  createdAt?: Date;
  updatedAt?: Date;
  // 上传者信息
  owner?: UserInfo | null;
  // 所属课程信息
  course?: CourseInfo | null;
}
