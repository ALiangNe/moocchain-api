import { Request, Response } from 'express';
import { createCertificateTemplateService, updateCertificateTemplateService, getCertificateTemplateListService, getCertificateTemplateService } from '../services/certificateTemplateService';
import { CertificateTemplateInfo, CertificateTemplateInfoQueryParams } from '../types/certificateTemplateType';
import { ResponseType } from '../types/responseType';
import { StatusCode } from '../constants/statusCode';
import { AuthRequest } from '../middlewares/authMiddleware';

/**
 * 创建证书模板
 * 管理员创建新证书模板
 * 核心功能：上传JSON配置（templateContent）
 */
export async function createCertificateTemplateController(req: AuthRequest, res: Response) {
  const adminId = req.user!.userId;
  const params = req.body as Partial<CertificateTemplateInfo>;

  // 验证必需字段
  if (!params.templateName) {
    const response: ResponseType<CertificateTemplateInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'templateName is required',
    };
    return res.status(400).json(response);
  }

  if (!params.templateContent) {
    const response: ResponseType<CertificateTemplateInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'templateContent is required',
    };
    return res.status(400).json(response);
  }

  let data;
  try {
    data = await createCertificateTemplateService(adminId, params);
  } catch (error) {
    console.error('Create certificate template controller error:', error);
    const response: ResponseType<CertificateTemplateInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: error instanceof Error ? error.message : 'Failed to create certificate template',
    };
    return res.status(400).json(response);
  }

  const response: ResponseType<CertificateTemplateInfo> = {
    code: StatusCode.SUCCESS,
    message: 'Certificate template created successfully',
    data: data,
  };
  return res.status(201).json(response);
}

/**
 * 更新证书模板
 * 管理员更新证书模板信息
 * 核心功能：更新JSON配置（templateContent）
 */
export async function updateCertificateTemplateController(req: AuthRequest, res: Response) {
  const adminId = req.user!.userId;
  const templateId = parseInt(req.params.templateId);
  const params = req.body as Partial<CertificateTemplateInfo>;

  // 验证 templateId
  if (!templateId || isNaN(templateId) || templateId <= 0) {
    const response: ResponseType<CertificateTemplateInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Invalid templateId',
    };
    return res.status(400).json(response);
  }

  // 验证 isActive 字段（如果提供了）
  if (params.isActive !== undefined) {
    if (params.isActive !== 0 && params.isActive !== 1) {
      const response: ResponseType<CertificateTemplateInfo> = {
        code: StatusCode.BAD_REQUEST,
        message: 'isActive must be 0 or 1',
      };
      return res.status(400).json(response);
    }
  }

  let data;
  try {
    data = await updateCertificateTemplateService(adminId, templateId, params);
  } catch (error) {
    console.error('Update certificate template controller error:', error);
    const response: ResponseType<CertificateTemplateInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: error instanceof Error ? error.message : 'Failed to update certificate template',
    };
    return res.status(400).json(response);
  }

  const response: ResponseType<CertificateTemplateInfo> = {
    code: StatusCode.SUCCESS,
    message: 'Certificate template updated successfully',
    data: data,
  };
  return res.status(200).json(response);
}

/**
 * 获取证书模板列表
 * 支持条件筛选和分页
 */
export async function getCertificateTemplateListController(req: AuthRequest, res: Response) {
  const { createdBy, isActive, startDate, endDate } = req.query;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 10;

  const params: CertificateTemplateInfoQueryParams = {};

  if (createdBy) {
    const createdByNum = parseInt(createdBy as string);
    if (!isNaN(createdByNum)) {
      params.createdBy = createdByNum;
    }
  }
  if (isActive !== undefined) {
    const isActiveNum = parseInt(isActive as string);
    if (!isNaN(isActiveNum)) {
      params.isActive = isActiveNum;
    }
  }
  if (startDate !== undefined) {
    params.startDate = String(startDate);
  }
  if (endDate !== undefined) {
    params.endDate = String(endDate);
  }

  let data;
  try {
    data = await getCertificateTemplateListService(params, page, pageSize);
  } catch (error) {
    console.error('Get certificate template list controller error:', error);
    const response: ResponseType<{ records: CertificateTemplateInfo[]; total: number }> = {
      code: StatusCode.INTERNAL_SERVER_ERROR,
      message: 'Failed to get certificate template list',
    };
    return res.status(500).json(response);
  }

  const response: ResponseType<{ records: CertificateTemplateInfo[]; total: number }> = {
    code: StatusCode.SUCCESS,
    message: 'Get certificate template list successfully',
    data: data,
  };
  return res.status(200).json(response);
}

/**
 * 获取证书模板详情
 * 根据模板ID获取模板信息
 */
export async function getCertificateTemplateController(req: AuthRequest, res: Response) {
  const templateId = parseInt(req.params.templateId);

  // 验证 templateId
  if (!templateId || isNaN(templateId) || templateId <= 0) {
    const response: ResponseType<CertificateTemplateInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Invalid templateId',
    };
    return res.status(400).json(response);
  }

  let data;
  try {
    data = await getCertificateTemplateService(templateId);
  } catch (error) {
    console.error('Get certificate template controller error:', error);
    const response: ResponseType<CertificateTemplateInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: error instanceof Error ? error.message : 'Failed to get certificate template',
    };
    return res.status(400).json(response);
  }

  const response: ResponseType<CertificateTemplateInfo> = {
    code: StatusCode.SUCCESS,
    message: 'Get certificate template successfully',
    data: data,
  };
  return res.status(200).json(response);
}
