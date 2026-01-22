import { Request, Response } from 'express';
import { createCertificateService, getCertificateListService, getCertificateService, updateCertificateNftService } from '../services/certificateService';
import { CertificateInfo } from '../types/certificateType';
import { ResponseType } from '../types/responseType';
import { StatusCode } from '../constants/statusCode';
import { AuthRequest } from '../middlewares/authMiddleware';

/**
 * 创建证书（学生领取证书）
 * 学生申请并生成课程证书
 */
export async function createCertificateController(req: AuthRequest, res: Response) {
  const studentId = req.user!.userId;
  const { courseId } = req.body;

  // 验证必需字段
  if (!courseId) {
    const response: ResponseType<CertificateInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'courseId is required',
    };
    return res.status(400).json(response);
  }

  // 验证 courseId
  if (!courseId || isNaN(courseId) || courseId <= 0) {
    const response: ResponseType<CertificateInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Invalid courseId',
    };
    return res.status(400).json(response);
  }

  let data;
  try {
    data = await createCertificateService(studentId, courseId);
  } catch (error) {
    console.error('Create certificate controller error:', error);
    const response: ResponseType<CertificateInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: error instanceof Error ? error.message : 'Failed to create certificate',
    };
    return res.status(400).json(response);
  }

  const response: ResponseType<CertificateInfo> = {
    code: StatusCode.SUCCESS,
    message: 'Certificate created successfully',
    data: data,
  };
  return res.status(200).json(response);
}

/**
 * 获取证书列表
 * 支持按学生ID、教师ID、课程ID筛选和分页
 */
export async function getCertificateListController(req: AuthRequest, res: Response) {
  const { studentId, teacherId, courseId } = req.query;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 10;

  const params: Partial<CertificateInfo> = {};

  if (studentId) {
    const studentIdNum = parseInt(studentId as string);
    if (!isNaN(studentIdNum)) {
      params.studentId = studentIdNum;
    }
  }
  if (teacherId) {
    const teacherIdNum = parseInt(teacherId as string);
    if (!isNaN(teacherIdNum)) {
      params.teacherId = teacherIdNum;
    }
  }
  if (courseId) {
    const courseIdNum = parseInt(courseId as string);
    if (!isNaN(courseIdNum)) {
      params.courseId = courseIdNum;
    }
  }

  let data;
  try {
    data = await getCertificateListService(params, page, pageSize);
  } catch (error) {
    console.error('Get certificate list controller error:', error);
    const response: ResponseType<{ records: CertificateInfo[]; total: number }> = {
      code: StatusCode.INTERNAL_SERVER_ERROR,
      message: 'Failed to get certificate list',
    };
    return res.status(500).json(response);
  }

  const response: ResponseType<{ records: CertificateInfo[]; total: number }> = {
    code: StatusCode.SUCCESS,
    message: 'Get certificate list successfully',
    data: data,
  };
  return res.status(200).json(response);
}

/**
 * 获取证书详情
 * 根据证书ID获取证书信息
 */
export async function getCertificateController(req: AuthRequest, res: Response) {
  const certificateId = parseInt(req.params.certificateId);

  // 验证 certificateId
  if (!certificateId || isNaN(certificateId) || certificateId <= 0) {
    const response: ResponseType<CertificateInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Invalid certificateId',
    };
    return res.status(400).json(response);
  }

  let data;
  try {
    data = await getCertificateService(certificateId);
  } catch (error) {
    console.error('Get certificate controller error:', error);
    const response: ResponseType<CertificateInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: error instanceof Error ? error.message : 'Failed to get certificate',
    };
    return res.status(400).json(response);
  }

  const response: ResponseType<CertificateInfo> = {
    code: StatusCode.SUCCESS,
    message: 'Get certificate successfully',
    data: data,
  };
  return res.status(200).json(response);
}

/**
 * 更新证书的链上信息（NFT TokenId 和交易哈希）
 * 仅证书所属学生可以更新
 */
export async function updateCertificateNftController(req: AuthRequest, res: Response) {
  const studentId = req.user!.userId;
  const certificateId = parseInt(req.params.certificateId);
  const { certificateNftId, transactionHash } = req.body as { certificateNftId?: string; transactionHash?: string };

  // 验证 certificateId
  if (!certificateId || isNaN(certificateId) || certificateId <= 0) {
    const response: ResponseType<CertificateInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Invalid certificateId',
    };
    return res.status(400).json(response);
  }

  // 至少需要一个字段
  if (certificateNftId === undefined && transactionHash === undefined) {
    const response: ResponseType<CertificateInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'certificateNftId or transactionHash is required',
    };
    return res.status(400).json(response);
  }

  let data;
  try {
    data = await updateCertificateNftService(studentId, certificateId, { certificateNftId, transactionHash });
  } catch (error) {
    console.error('Update certificate nft controller error:', error);
    const response: ResponseType<CertificateInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: error instanceof Error ? error.message : 'Failed to update certificate nft info',
    };
    return res.status(400).json(response);
  }

  const response: ResponseType<CertificateInfo> = {
    code: StatusCode.SUCCESS,
    message: 'Update certificate nft info successfully',
    data: data,
  };
  return res.status(200).json(response);
}