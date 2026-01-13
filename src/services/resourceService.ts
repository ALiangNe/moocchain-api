import { ResourceInfo } from '../types/resourceType';
import { getResource, postResource, putResource, getResourceList } from '../models/resourceModel';
import { getCourse } from '../models/courseModel';
import { getUser } from '../models/userModel';
import { createResourceAudit } from '../models/auditRecordModel';
import { ROLE_TEACHER } from '../middlewares/roleMiddleware';

/**
 * 创建资源服务
 * 教师在自己创建的课程中创建资源
 */
export async function createResourceService(
  teacherId: number,
  data: Partial<ResourceInfo>
): Promise<ResourceInfo> {
  // 检查教师是否存在
  const teacher = await getUser({ userId: teacherId });
  if (!teacher) {
    throw new Error('Teacher not found');
  }

  // 检查教师角色
  if (teacher.role !== ROLE_TEACHER) {
    throw new Error('Only teachers can create resources');
  }

  // 检查课程是否存在
  if (!data.courseId) {
    throw new Error('courseId is required');
  }

  const course = await getCourse({ courseId: data.courseId });
  if (!course) {
    throw new Error('Course not found');
  }

  // 检查是否为课程所有者
  if (course.teacherId !== teacherId) {
    throw new Error('Only the course owner can create resources in this course');
  }

  // 创建资源（状态默认为0-待审核）
  const params: Partial<ResourceInfo> = {
    ...data,
    ownerId: teacherId,
    status: data.status !== undefined ? data.status : 0, // 默认待审核
  };

  const resource = await postResource(params);

  // 创建资源后，自动创建审核记录（待审核状态）
  if (resource.resourceId) {
    await createResourceAudit(resource.resourceId, teacherId);
  }

  return resource;
}

/**
 * 更新资源服务
 * 教师更新自己创建的资源信息
 */
export async function updateResourceService(
  teacherId: number,
  resourceId: number,
  data: Partial<ResourceInfo>
): Promise<ResourceInfo> {
  // 检查资源是否存在
  const resource = await getResource({ resourceId });
  if (!resource) {
    throw new Error('Resource not found');
  }

  // 检查是否为资源所有者
  if (resource.ownerId !== teacherId) {
    throw new Error('Only the resource owner can update the resource');
  }

  // 更新资源（不允许修改 ownerId 和 courseId）
  const updateData = { ...data };
  delete updateData.ownerId;
  delete updateData.courseId;

  return await putResource(resourceId, updateData);
}

/**
 * 获取资源列表服务
 * 支持按条件筛选和分页
 */
export async function getResourceListService(
  params: Partial<ResourceInfo>,
  page: number = 1,
  pageSize: number = 10
): Promise<{ records: ResourceInfo[]; total: number }> {
  return await getResourceList(params, page, pageSize);
}

/**
 * 获取资源详情服务
 * 根据资源ID获取资源信息
 */
export async function getResourceService(resourceId: number): Promise<ResourceInfo> {
  const resource = await getResource({ resourceId });
  if (!resource) {
    throw new Error('Resource not found');
  }
  return resource;
}
