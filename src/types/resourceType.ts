import { UserInfo } from './userType';
import { CourseInfo } from './courseType';

// 教育资源信息类型
export interface ResourceInfo {
  resourceId?: number;        // 资源ID，自增
  resourceNftId?: string;     // 资源NFT ID（区块链tokenId）
  ownerId?: number;           // 教师用户ID，外键
  courseId?: number;          // 所属课程ID，外键
  title?: string;             // 资源标题
  description?: string;       // 资源描述
  ipfsHash?: string;          // IPFS存储哈希值，唯一
  resourceType?: number;      // 资源类型（0:其他，1:文档，2:音频，3:视频）
  price?: number;             // 资源价格（代币数量，0表示免费）
  accessScope?: number;       // 访问范围（0:公开，1:校内，2:付费）
  status?: number;            // 资源状态（0:待审核，1:已审核，2:已发布，3:已下架）
  createdAt?: Date;           // 创建时间
  updatedAt?: Date;           // 更新时间
  // 上传者信息
  owner?: UserInfo | null;    // 教师完整信息
  // 所属课程信息
  course?: CourseInfo | null; // 课程完整信息
}
