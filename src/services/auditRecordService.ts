import { AuditRecordInfo } from '../types/auditRecordType';
import { createTeacherApplication, approveTeacherApplication, approveResourceApplication, approveCourseApplication, getAuditRecordList, createCourseAudit, createResourceAudit } from '../models/auditRecordModel';
import { getUser, updateUserRole } from '../models/userModel';
import { putResource, getResource } from '../models/resourceModel';
import { putCourse, getCourse } from '../models/courseModel';
import { ROLE_STUDENT, ROLE_TEACHER, ROLE_ADMIN } from '../middlewares/roleMiddleware';

/**
 * 创建教师申请审核记录
 * 学生申请成为教师时调用
 */
export async function createTeacherApplicationService(
  studentId: number,
  params: Partial<AuditRecordInfo> & { targetId: number; auditType: number; targetType: number }
): Promise<AuditRecordInfo> {
  // 检查学生是否存在
  const student = await getUser({ userId: studentId });
  if (!student) {
    throw new Error('Student not found');
  }

  // 检查学生角色
  if (student.role !== ROLE_STUDENT) {
    throw new Error('Only students can apply to become teachers');
  }

  // 创建审核记录（model层已包含检查逻辑）
  const data = await createTeacherApplication(studentId, params.auditComment);
  return data;
}

/**
 * 审批教师申请
 * 管理员审批学生成为教师的申请
 */
export async function approveTeacherApplicationService(
  adminId: number,
  params: Partial<AuditRecordInfo> & { auditId: number; auditStatus: number }
): Promise<{ auditRecord: AuditRecordInfo; user?: any }> {
  // 检查管理员是否存在
  const admin = await getUser({ userId: adminId });
  if (!admin) {
    throw new Error('Admin not found');
  }

  // 检查管理员角色
  if (admin.role !== ROLE_ADMIN) {
    throw new Error('Only admins can approve applications');
  }

  // 审批审核记录（model层已包含验证逻辑）
  const { auditRecord, targetUserId } = await approveTeacherApplication(
    params.auditId,
    adminId,
    params.auditStatus,
    params.auditComment
  );

  // 如果审核通过，更新用户角色
  let updatedUser = null;
  if (params.auditStatus === 1) {
    const targetUser = await getUser({ userId: targetUserId });
    if (!targetUser) {
      throw new Error('Target user not found');
    }

    // 更新用户角色为教师
    updatedUser = await updateUserRole(targetUserId, ROLE_TEACHER);
  }

  return {
    auditRecord,
    user: updatedUser,
  };
}

/**
 * 审批资源申请
 * 管理员审批教师上传的资源
 */
export async function approveResourceApplicationService(
  adminId: number,
  params: Partial<AuditRecordInfo> & { auditId: number; auditStatus: number }
): Promise<{ auditRecord: AuditRecordInfo; resource?: any }> {
  // 检查管理员是否存在
  const admin = await getUser({ userId: adminId });
  if (!admin) {
    throw new Error('Admin not found');
  }

  // 检查管理员角色
  if (admin.role !== ROLE_ADMIN) {
    throw new Error('Only admins can approve resources');
  }

  // 审批审核记录（model层已包含验证逻辑）
  const { auditRecord, resourceId } = await approveResourceApplication(
    params.auditId,
    adminId,
    params.auditStatus,
    params.auditComment
  );

  // 如果审核通过，更新资源状态为已审核（status = 1）
  let updatedResource = null;
  if (params.auditStatus === 1) {
    updatedResource = await putResource(resourceId, { status: 1 });
  } else if (params.auditStatus === 2) {
    // 如果审核拒绝，资源状态可以保持为0（待审核）或设置为其他状态
    // 根据业务需求，这里保持原状态
  }

  return {
    auditRecord,
    resource: updatedResource,
  };
}

/**
 * 审批课程申请
 * 管理员审批教师创建的课程
 */
export async function approveCourseApplicationService(
  adminId: number,
  params: Partial<AuditRecordInfo> & { auditId: number; auditStatus: number }
): Promise<{ auditRecord: AuditRecordInfo; course?: any }> {
  // 检查管理员是否存在
  const admin = await getUser({ userId: adminId });
  if (!admin) {
    throw new Error('Admin not found');
  }

  // 检查管理员角色
  if (admin.role !== ROLE_ADMIN) {
    throw new Error('Only admins can approve courses');
  }

  // 审批审核记录（model层已包含验证逻辑）
  const { auditRecord, courseId } = await approveCourseApplication(
    params.auditId,
    adminId,
    params.auditStatus,
    params.auditComment
  );

  // 如果审核通过，更新课程状态为已审核（status = 1）
  let updatedCourse = null;
  if (params.auditStatus === 1) {
    updatedCourse = await putCourse(courseId, { status: 1 });
  } else if (params.auditStatus === 2) {
    // 如果审核拒绝，课程状态可以保持为0（待审核）或设置为其他状态
    // 根据业务需求，这里保持原状态
  }

  return {
    auditRecord,
    course: updatedCourse,
  };
}

/**
 * 重新提交课程审核
 * 仅允许课程创建者在课程状态为待审核（0）且最近一次课程审核被拒绝（2）时重新提交
 */
export async function reapplyCourseAuditService(
  teacherId: number,
  courseId: number
): Promise<AuditRecordInfo> {
  // 检查课程是否存在
  const course = await getCourse({ courseId });
  if (!course) {
    throw new Error('Course not found');
  }

  // 检查是否为课程创建者
  if (course.teacherId !== teacherId) {
    throw new Error('Only the course owner can reapply for course audit');
  }

  // 只有待审核状态（0）的课程才能重新提交审核
  if (course.status !== 0) {
    throw new Error('Only courses in pending status can reapply for audit');
  }

  // 查询最近一条课程审核记录
  const { records } = await getAuditRecordList({ targetId: courseId, targetType: 2, auditType: 2 }, 1, 1);
  const latestRecord = records[0];

  // 必须存在审核记录且最近一次为拒绝（2），才能重新提交
  if (!latestRecord || latestRecord.auditStatus !== 2) {
    throw new Error('Only rejected course applications can be reapplied');
  }

  // 创建新的课程审核记录（待审核）
  const newAudit = await createCourseAudit(courseId, teacherId);
  return newAudit;
}

/**
 * 重新提交资源审核
 * 仅允许资源创建者在资源状态为待审核（0）且最近一次资源审核被拒绝（2）时重新提交
 */
export async function reapplyResourceAuditService(
  ownerId: number,
  resourceId: number
): Promise<AuditRecordInfo> {
  // 检查资源是否存在
  const resource = await getResource({ resourceId });
  if (!resource) {
    throw new Error('Resource not found');
  }

  // 检查是否为资源创建者
  if (resource.ownerId !== ownerId) {
    throw new Error('Only the resource owner can reapply for resource audit');
  }

  // 只有待审核状态（0）的资源才能重新提交审核
  if (resource.status !== 0) {
    throw new Error('Only resources in pending status can reapply for audit');
  }

  // 查询最近一条资源审核记录
  const { records } = await getAuditRecordList({ targetId: resourceId, targetType: 1, auditType: 1 }, 1, 1);
  const latestRecord = records[0];

  // 必须存在审核记录且最近一次为拒绝（2），才能重新提交
  if (!latestRecord || latestRecord.auditStatus !== 2) {
    throw new Error('Only rejected resource applications can be reapplied');
  }

  // 创建新的资源审核记录（待审核）
  const newAudit = await createResourceAudit(resourceId, ownerId);
  return newAudit;
}

/**
 * 获取审核记录列表
 * 支持按条件筛选和分页
 */
export async function getAuditRecordListService(
  conditions: Partial<AuditRecordInfo>,
  page: number = 1,
  pageSize: number = 10
): Promise<{ records: AuditRecordInfo[]; total: number }> {
  return await getAuditRecordList(conditions, page, pageSize);
}

