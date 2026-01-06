import { AuditRecordInfo } from '../types/auditRecordType';
import { createTeacherApplicationModel, approveTeacherApplicationModel, getAuditRecordListModel } from '../models/auditRecordModel';
import { getUser, updateUserRole } from '../models/userModel';
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
  const data = await createTeacherApplicationModel(studentId, params.auditComment);
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
  const { auditRecord, targetUserId } = await approveTeacherApplicationModel(
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
 * 获取审核记录列表
 * 支持按条件筛选和分页
 */
export async function getAuditRecordListService(
  conditions: Partial<AuditRecordInfo>,
  page: number = 1,
  pageSize: number = 10
): Promise<{ records: AuditRecordInfo[]; total: number }> {
  return await getAuditRecordListModel(conditions, page, pageSize);
}

