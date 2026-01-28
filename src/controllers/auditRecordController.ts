import { Request, Response } from 'express';
import { createTeacherApplicationService, approveTeacherApplicationService, approveResourceApplicationService, approveCourseApplicationService, getAuditRecordListService, reapplyCourseAuditService, reapplyResourceAuditService } from '../services/auditRecordService';
import { AuditRecordInfo } from '../types/auditRecordType';
import { ResponseType } from '../types/responseType';
import { StatusCode } from '../constants/statusCode';
import { AuthRequest } from '../middlewares/authMiddleware';
import { ROLE_STUDENT } from '../middlewares/roleMiddleware';

/**
 * 创建教师申请
 * 学生提交成为教师的申请
 */
export async function createTeacherApplicationController(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const body = req.body as Partial<AuditRecordInfo>;

  const params: Partial<AuditRecordInfo> & { targetId: number; auditType: number; targetType: number } = {
    ...body,
    targetId: userId,
    auditType: 0, // 用户身份审核
    targetType: 0, // 用户
  };

  let data;
  try {
    data = await createTeacherApplicationService(userId, params);
  } catch (error) {
    console.error('Create teacher application controller error:', error);
    const response: ResponseType<AuditRecordInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: error instanceof Error ? error.message : 'Failed to create teacher application',
    };
    return res.status(400).json(response);
  }

  const response: ResponseType<AuditRecordInfo> = {
    code: StatusCode.SUCCESS,
    message: 'Teacher application created successfully',
    data: data,
  };
  return res.status(201).json(response);
}

/**
 * 审批教师申请
 * 管理员审批学生成为教师的申请
 */
export async function approveTeacherApplicationController(req: AuthRequest, res: Response) {
  const adminId = req.user!.userId;
  const params = req.body as Partial<AuditRecordInfo> & { auditId: number; auditStatus: number };

  // 验证必需字段
  if (!params.auditId || params.auditStatus === undefined) {
    const response: ResponseType<AuditRecordInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'auditId and auditStatus are required',
    };
    return res.status(400).json(response);
  }

  // 验证auditId是数字
  if (typeof params.auditId !== 'number' || params.auditId <= 0) {
    const response: ResponseType<AuditRecordInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'auditId must be a positive number',
    };
    return res.status(400).json(response);
  }

  // 验证审核状态
  if (params.auditStatus !== 1 && params.auditStatus !== 2) {
    const response: ResponseType<AuditRecordInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'auditStatus must be 1 (approved) or 2 (rejected)',
    };
    return res.status(400).json(response);
  }

  let data;
  try {
    data = await approveTeacherApplicationService(adminId, params);
  } catch (error) {
    console.error('Approve teacher application controller error:', error);
    const response: ResponseType<{ auditRecord: AuditRecordInfo; user?: any }> = {
      code: StatusCode.BAD_REQUEST,
      message: error instanceof Error ? error.message : 'Failed to approve teacher application',
    };
    return res.status(400).json(response);
  }

  const response: ResponseType<{ auditRecord: AuditRecordInfo; user?: any }> = {
    code: StatusCode.SUCCESS,
    message: data.auditRecord.auditStatus === 1
      ? 'Teacher application approved successfully'
      : 'Teacher application rejected',
    data: data,
  };
  return res.status(200).json(response);
}

/**
 * 审批资源申请
 * 管理员审批教师上传的资源
 */
export async function approveResourceApplicationController(req: AuthRequest, res: Response) {
  const adminId = req.user!.userId;
  const params = req.body as Partial<AuditRecordInfo> & { auditId: number; auditStatus: number };

  // 验证必需字段
  if (!params.auditId || params.auditStatus === undefined) {
    const response: ResponseType<AuditRecordInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'auditId and auditStatus are required',
    };
    return res.status(400).json(response);
  }

  // 验证auditId是数字
  if (typeof params.auditId !== 'number' || params.auditId <= 0) {
    const response: ResponseType<AuditRecordInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'auditId must be a positive number',
    };
    return res.status(400).json(response);
  }

  // 验证审核状态
  if (params.auditStatus !== 1 && params.auditStatus !== 2) {
    const response: ResponseType<AuditRecordInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'auditStatus must be 1 (approved) or 2 (rejected)',
    };
    return res.status(400).json(response);
  }

  let data;
  try {
    data = await approveResourceApplicationService(adminId, params);
  } catch (error) {
    console.error('Approve resource application controller error:', error);
    const response: ResponseType<{ auditRecord: AuditRecordInfo; resource?: any }> = {
      code: StatusCode.BAD_REQUEST,
      message: error instanceof Error ? error.message : 'Failed to approve resource application',
    };
    return res.status(400).json(response);
  }

  const response: ResponseType<{ auditRecord: AuditRecordInfo; resource?: any }> = {
    code: StatusCode.SUCCESS,
    message: data.auditRecord.auditStatus === 1
      ? 'Resource application approved successfully'
      : 'Resource application rejected',
    data: data,
  };
  return res.status(200).json(response);
}

/**
 * 审批课程申请
 * 管理员审批教师创建的课程
 */
export async function approveCourseApplicationController(req: AuthRequest, res: Response) {
  const adminId = req.user!.userId;
  const params = req.body as Partial<AuditRecordInfo> & { auditId: number; auditStatus: number };

  // 验证必需字段
  if (!params.auditId || params.auditStatus === undefined) {
    const response: ResponseType<AuditRecordInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'auditId and auditStatus are required',
    };
    return res.status(400).json(response);
  }

  // 验证auditId是数字
  if (typeof params.auditId !== 'number' || params.auditId <= 0) {
    const response: ResponseType<AuditRecordInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'auditId must be a positive number',
    };
    return res.status(400).json(response);
  }

  // 验证审核状态
  if (params.auditStatus !== 1 && params.auditStatus !== 2) {
    const response: ResponseType<AuditRecordInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'auditStatus must be 1 (approved) or 2 (rejected)',
    };
    return res.status(400).json(response);
  }

  let data;
  try {
    data = await approveCourseApplicationService(adminId, params);
  } catch (error) {
    console.error('Approve course application controller error:', error);
    const response: ResponseType<{ auditRecord: AuditRecordInfo; course?: any }> = {
      code: StatusCode.BAD_REQUEST,
      message: error instanceof Error ? error.message : 'Failed to approve course application',
    };
    return res.status(400).json(response);
  }

  const response: ResponseType<{ auditRecord: AuditRecordInfo; course?: any }> = {
    code: StatusCode.SUCCESS,
    message: data.auditRecord.auditStatus === 1
      ? 'Course application approved successfully'
      : 'Course application rejected',
    data: data,
  };
  return res.status(200).json(response);
}

/**
 * 重新提交资源审核
 * 资源被拒绝后，教师修改信息并重新提交审核
 */
export async function reapplyResourceAuditController(req: AuthRequest, res: Response) {
  const ownerId = req.user!.userId;
  const { resourceId } = req.body as { resourceId?: number };

  if (!resourceId || typeof resourceId !== 'number' || resourceId <= 0) {
    const response: ResponseType<AuditRecordInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'resourceId is required and must be a positive number',
    };
    return res.status(400).json(response);
  }

  let data;
  try {
    data = await reapplyResourceAuditService(ownerId, resourceId);
  } catch (error) {
    console.error('Reapply resource audit controller error:', error);
    const response: ResponseType<AuditRecordInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: error instanceof Error ? error.message : 'Failed to reapply resource audit',
    };
    return res.status(400).json(response);
  }

  const response: ResponseType<AuditRecordInfo> = {
    code: StatusCode.SUCCESS,
    message: 'Resource audit reapplied successfully',
    data,
  };
  return res.status(200).json(response);
}

/**
 * 重新提交课程审核
 * 课程被拒绝后，教师修改信息并重新提交审核
 */
export async function reapplyCourseAuditController(req: AuthRequest, res: Response) {
  const teacherId = req.user!.userId;
  const { courseId } = req.body as { courseId?: number };

  if (!courseId || typeof courseId !== 'number' || courseId <= 0) {
    const response: ResponseType<AuditRecordInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'courseId is required and must be a positive number',
    };
    return res.status(400).json(response);
  }

  let data;
  try {
    data = await reapplyCourseAuditService(teacherId, courseId);
  } catch (error) {
    console.error('Reapply course audit controller error:', error);
    const response: ResponseType<AuditRecordInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: error instanceof Error ? error.message : 'Failed to reapply course audit',
    };
    return res.status(400).json(response);
  }

  const response: ResponseType<AuditRecordInfo> = {
    code: StatusCode.SUCCESS,
    message: 'Course audit reapplied successfully',
    data,
  };
  return res.status(200).json(response);
}

/**
 * 获取审核记录列表
 * 支持条件筛选和分页
 * - 学生：自动筛选自己的申请记录（targetId = userId）
 * - 管理员：可以按条件筛选所有审核记录
 */
export async function getAuditRecordListController(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const userRole = req.user!.role;
  const { targetId, targetType, auditType, auditStatus, auditorId } = req.query;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 10;

  const params: Partial<AuditRecordInfo> = {};

  // 学生只能查看自己的申请记录
  if (userRole === ROLE_STUDENT) {
    params.targetId = userId;
    params.targetType = 0; // 用户
  } else {
    // 管理员可以按条件筛选
    if (targetId !== undefined) {
      params.targetId = parseInt(targetId as string);
    }
    if (targetType !== undefined) {
      params.targetType = parseInt(targetType as string);
    }
    if (auditType !== undefined) {
      params.auditType = parseInt(auditType as string);
    }
    if (auditStatus !== undefined) {
      params.auditStatus = parseInt(auditStatus as string);
    }
    if (auditorId !== undefined) {
      params.auditorId = parseInt(auditorId as string);
    }
  }

  let data;
  try {
    data = await getAuditRecordListService(params, page, pageSize);
  } catch (error) {
    console.error('Get audit record list controller error:', error);
    const response: ResponseType<{ records: AuditRecordInfo[]; total: number }> = {
      code: StatusCode.INTERNAL_SERVER_ERROR,
      message: 'Failed to get audit record list',
    };
    return res.status(500).json(response);
  }

  const response: ResponseType<{ records: AuditRecordInfo[]; total: number }> = {
    code: StatusCode.SUCCESS,
    message: 'Get audit record list successfully',
    data: data,
  };
  return res.status(200).json(response);
}