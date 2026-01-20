// 资源证书配置表类型
export interface ResourceCertificateConfigInfo {
  configId?: number;              // 配置ID，自增
  courseId?: number;              // 课程ID，唯一
  templateId?: number;            // 证书模板ID
  completionRequirement?: number; // 完成要求（学习进度百分比）
  minLearningTime?: number;       // 最低学习时长（秒）
  isEnabled?: number;             // 是否启用（0:禁用，1:启用）
  overrideFields?: string;        // 教师覆盖的字段（JSON 字符串）
  createdAt?: Date;               // 创建时间
  updatedAt?: Date;               // 更新时间
}
