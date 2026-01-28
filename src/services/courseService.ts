import { CourseInfo, CourseInfoQueryParams } from '../types/courseType';
import { getCourse, postCourse, putCourse, getCourseList } from '../models/courseModel';
import { getUser } from '../models/userModel';
import { createCourseAudit } from '../models/auditRecordModel';
import { ROLE_TEACHER } from '../middlewares/roleMiddleware';

/**
 * 创建课程服务
 * 教师创建新课程
 */
export async function createCourseService(
  teacherId: number,
  data: Partial<CourseInfo>
): Promise<CourseInfo> {
  // 检查教师是否存在
  const teacher = await getUser({ userId: teacherId });
  if (!teacher) {
    throw new Error('Teacher not found');
  }

  // 检查教师角色
  if (teacher.role !== ROLE_TEACHER) {
    throw new Error('Only teachers can create courses');
  }

  // 验证课程时间
  if (data.courseStartTime && data.courseEndTime) {
    const startTime = new Date(data.courseStartTime);
    const endTime = new Date(data.courseEndTime);

    if (startTime >= endTime) {
      throw new Error('Course end time must be later than start time');
    }
  }

  // 创建课程（状态默认为0-待审核）
  const params: Partial<CourseInfo> = {
    ...data,
    teacherId,
    status: data.status !== undefined ? data.status : 0, // 默认待审核
  };

  const course = await postCourse(params);

  // 创建课程后，自动创建审核记录（待审核状态）
  if (course.courseId) {
    await createCourseAudit(course.courseId, teacherId);
  }

  return course;
}

/**
 * 更新课程服务
 * 教师更新自己的课程信息
 */
export async function updateCourseService(
  teacherId: number,
  courseId: number,
  data: Partial<CourseInfo>
): Promise<CourseInfo> {
  // 检查课程是否存在
  const course = await getCourse({ courseId });
  if (!course) {
    throw new Error('Course not found');
  }

  // 检查是否为课程所有者
  if (course.teacherId !== teacherId) {
    throw new Error('Only the course owner can update the course');
  }

  // 验证课程时间
  const updateStartTime = data.courseStartTime !== undefined ? new Date(data.courseStartTime) : null;
  const updateEndTime = data.courseEndTime !== undefined ? new Date(data.courseEndTime) : null;
  const finalStartTime = updateStartTime || course.courseStartTime;
  const finalEndTime = updateEndTime || course.courseEndTime;

  if (finalStartTime && finalEndTime) {
    const startTime = new Date(finalStartTime);
    const endTime = new Date(finalEndTime);

    if (startTime >= endTime) {
      throw new Error('Course end time must be later than start time');
    }
  }

  // 更新课程
  return await putCourse(courseId, data);
}

/**
 * 获取课程列表服务
 * 支持按条件筛选和分页
 */
export async function getCourseListService(
  params: CourseInfoQueryParams,
  page: number = 1,
  pageSize: number = 10
): Promise<{ records: CourseInfo[]; total: number }> {
  return await getCourseList(params, page, pageSize);
}

/**
 * 获取课程详情服务
 * 根据课程ID获取课程信息
 */
export async function getCourseService(courseId: number): Promise<CourseInfo> {
  const course = await getCourse({ courseId });
  if (!course) {
    throw new Error('Course not found');
  }
  return course;
}
