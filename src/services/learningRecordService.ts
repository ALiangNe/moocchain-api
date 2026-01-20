import { LearningRecordInfo } from '../types/learningRecordType';
import { getLearningRecord, postLearningRecord, putLearningRecord, getLearningRecordList, getLearningHistoryList } from '../models/learningRecordModel';
import { ResourceInfo } from '../types/resourceType';
import { getResource } from '../models/resourceModel';
import { getUser } from '../models/userModel';

/**
 * 完成学习服务（文档/图片类型）
 * 适用于：resourceType = 0(其他) 或 1(文档) 的资源
 * 学生下载文档/图片资源时，直接标记为学习完成（progress=100, isCompleted=1）
 */
export async function completeLearningRecordService(
  studentId: number,
  resourceId: number
): Promise<LearningRecordInfo> {
  // 检查用户是否存在
  const user = await getUser({ userId: studentId });
  if (!user) {
    throw new Error('User not found');
  }

  // 检查资源是否存在
  const resource = await getResource({ resourceId });
  if (!resource) {
    throw new Error('Resource not found');
  }

  // 检查资源是否已发布
  if (resource.status !== 2) {
    throw new Error('Resource is not published');
  }

  // 检查资源类型是否为文档或图片（resourceType: 0=其他, 1=文档, 2=音频, 3=视频）
  // 文档和图片（resourceType=1或0）可以直接完成，视频和音频（resourceType=2或3）需要通过上报时间完成
  if (resource.resourceType === 2 || resource.resourceType === 3) {
    throw new Error('Video and audio resources cannot be completed directly. Please use report learning time API.');
  }

  // 查询是否已存在学习记录
  const existingRecord = await getLearningRecord({ studentId, resourceId });

  if (existingRecord) {
    // 如果已存在，更新为完成状态
    const updateData: Partial<LearningRecordInfo> = {
      progress: 100,
      isCompleted: 1,
      completedAt: new Date(),
    };

    // 如果之前未完成，更新完成时间
    if (!existingRecord.isCompleted) {
      updateData.completedAt = new Date();
    }

    return await putLearningRecord(existingRecord.recordId!, updateData);
  } else {
    // 如果不存在，创建新的学习记录
    const newRecord: Partial<LearningRecordInfo> = {
      studentId,
      resourceId,
      progress: 100,
      learningTime: 0,
      isCompleted: 1,
      isVisible: 1,
      completedAt: new Date(),
    };

    return await postLearningRecord(newRecord);
  }
}

/**
 * 上报学习时间增量服务（视频/音频类型）
 * 适用于：resourceType = 2(音频) 或 3(视频) 的资源
 * 前端以10-15秒为周期上报学习时间增量，服务端累计学习时长
 * 注意：此接口只累计学习时长，不更新进度。进度需要前端根据资源总时长计算后调用 updateLearningProgress 更新
 */
export async function reportLearningTimeService(
  studentId: number,
  resourceId: number,
  timeIncrement: number
): Promise<LearningRecordInfo> {
  // 检查用户是否存在
  const user = await getUser({ userId: studentId });
  if (!user) {
    throw new Error('User not found');
  }

  // 检查资源是否存在
  const resource = await getResource({ resourceId });
  if (!resource) {
    throw new Error('Resource not found');
  }

  // 检查资源是否已发布
  if (resource.status !== 2) {
    throw new Error('Resource is not published');
  }

  // 检查资源类型是否为视频或音频
  if (resource.resourceType !== 2 && resource.resourceType !== 3) {
    throw new Error('Only video and audio resources can report learning time');
  }

  // 验证时间增量合法性（10-15秒周期，允许一定误差范围：5-20秒）
  if (timeIncrement < 5 || timeIncrement > 20) {
    throw new Error('Invalid time increment. Expected range: 5-20 seconds');
  }

  // 查询是否已存在学习记录
  const existingRecord = await getLearningRecord({ studentId, resourceId });

  let currentLearningTime = 0;
  let currentProgress = 0;
  let recordId: number;

  if (existingRecord) {
    // 如果已存在，累计学习时长
    currentLearningTime = (existingRecord.learningTime || 0) + timeIncrement;
    currentProgress = existingRecord.progress || 0;
    recordId = existingRecord.recordId!;

    // 更新学习记录
    const updateData: Partial<LearningRecordInfo> = {
      learningTime: currentLearningTime,
    };

    // 如果之前已完成，不再更新进度和完成状态
    if (!existingRecord.isCompleted) {
      // 假设资源总时长未知，进度按学习时长估算（这里可以根据实际业务调整）
      // 暂时不自动更新进度，由前端根据实际资源时长计算进度
      // 如果前端提供了进度，可以在后续接口中更新
    }

    return await putLearningRecord(recordId, updateData);
  } else {
    // 如果不存在，创建新的学习记录
    currentLearningTime = timeIncrement;
    const newRecord: Partial<LearningRecordInfo> = {
      studentId,
      resourceId,
      progress: 0,
      learningTime: currentLearningTime,
      isCompleted: 0,
      isVisible: 1,
    };

    const createdRecord = await postLearningRecord(newRecord);
    return createdRecord;
  }
}

/**
 * 更新学习进度服务（视频/音频类型）
 * 适用于：resourceType = 2(音频) 或 3(视频) 的资源
 * 前端根据实际资源时长计算进度后，调用此接口更新进度
 * 
 * 注意：
 * 1. 后端无法获取资源时长，需要前端通过视频/音频元素的duration属性获取总时长
 * 2. 前端计算进度公式：progress = (learningTime / totalDuration) * 100
 * 3. 进度达到100%时，会自动标记为完成（isCompleted=1）
 */
export async function updateLearningProgressService(
  studentId: number,
  resourceId: number,
  progress: number
): Promise<LearningRecordInfo> {
  // 检查用户是否存在
  const user = await getUser({ userId: studentId });
  if (!user) {
    throw new Error('User not found');
  }

  // 验证进度范围
  if (progress < 0 || progress > 100) {
    throw new Error('Progress must be between 0 and 100');
  }

  // 查询是否已存在学习记录
  const existingRecord = await getLearningRecord({ studentId, resourceId });
  if (!existingRecord) {
    throw new Error('Learning record not found. Please report learning time first.');
  }

  // 检查是否为资源所有者
  if (existingRecord.studentId !== studentId) {
    throw new Error('Only the record owner can update progress');
  }

  // 更新进度
  const updateData: Partial<LearningRecordInfo> = {
    progress,
  };

  // 如果进度达到100%，标记为完成
  if (progress >= 100 && !existingRecord.isCompleted) {
    updateData.isCompleted = 1;
    updateData.completedAt = new Date();
  }

  return await putLearningRecord(existingRecord.recordId!, updateData);
}

/**
 * 提交评价服务
 * 学生对资源进行评价和评分
 */
export async function submitReviewService(
  studentId: number,
  resourceId: number,
  review: string,
  rating: number
): Promise<LearningRecordInfo> {
  // 检查用户是否存在
  const user = await getUser({ userId: studentId });
  if (!user) {
    throw new Error('User not found');
  }

  // 验证评分范围
  if (rating < 1 || rating > 5) {
    throw new Error('Rating must be between 1 and 5');
  }

  // 查询是否已存在学习记录
  const existingRecord = await getLearningRecord({ studentId, resourceId });
  if (!existingRecord) {
    throw new Error('Learning record not found. Please complete learning first.');
  }

  // 检查是否为记录所有者
  if (existingRecord.studentId !== studentId) {
    throw new Error('Only the record owner can submit review');
  }

  // 更新评价和评分
  const updateData: Partial<LearningRecordInfo> = {
    review,
    rating,
    isVisible: 1, // 评价默认可见
  };

  return await putLearningRecord(existingRecord.recordId!, updateData);
}

/**
 * 获取学习记录列表服务
 * 支持按条件筛选和分页
 */
export async function getLearningRecordListService(
  params: Partial<LearningRecordInfo>,
  page: number = 1,
  pageSize: number = 10
): Promise<{ records: LearningRecordInfo[]; total: number }> {
  return await getLearningRecordList(params, page, pageSize);
}

/**
 * 获取学习历史课程列表服务
 * 返回当前学生学过的课程（去重）
 */
export async function getLearningHistoryListService(
  studentId: number,
  page: number = 1,
  pageSize: number = 10
): Promise<{ records: ResourceInfo[]; total: number }> {
  return await getLearningHistoryList(studentId, page, pageSize);
}

/**
 * 获取学习记录详情服务
 * 根据 recordId 获取学习记录信息
 */
export async function getLearningRecordService(
  recordId: number
): Promise<LearningRecordInfo> {
  const record = await getLearningRecord({ recordId });
  if (!record) {
    throw new Error('Learning record not found');
  }

  return record;
}
