import { UserInfo } from './userType';
import { CourseInfo } from './courseType';

// 证书基础信息类型
export interface CertificateInfo {
  certificateId?: number;         // 证书ID
  certificateNftId?: string;      // 证书NFT ID（区块链tokenId）
  studentId?: number;             // 学生用户ID
  teacherId?: number;             // 教师用户ID
  courseId?: number;              // 关联的课程ID
  learningRecordId?: number;      // 关联的学习记录ID
  ipfsHash?: string;              // 证书IPFS存储哈希值
  transactionHash?: string;       // 区块链交易哈希
  createdAt?: Date;               // 创建时间
  // 完整的用户信息对象
  student?: UserInfo | null;      // 学生完整信息
  teacher?: UserInfo | null;      // 教师完整信息
  course?: CourseInfo | null;     // 课程完整信息
}

// 证书查询参数类型（用于列表查询）
export interface CertificateInfoQueryParams extends Partial<CertificateInfo> {
  teacherName?: string;           // 教师姓名（用于模糊查询，通过 JOIN teacher 表）
  startDate?: string;             // 开始日期（用于日期范围筛选，基于 createdAt）
  endDate?: string;               // 结束日期（用于日期范围筛选，基于 createdAt）
}