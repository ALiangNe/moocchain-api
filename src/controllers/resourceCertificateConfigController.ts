import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { ROLE_TEACHER } from '../middlewares/roleMiddleware';
import { ResponseType } from '../types/responseType';
import { StatusCode } from '../constants/statusCode';
import { ResourceCertificateConfigInfo } from '../types/resourceCertificateConfigType';
import { createResourceCertificateConfigService, getResourceCertificateConfigListService, getResourceCertificateConfigService, updateResourceCertificateConfigService } from '../services/resourceCertificateConfigService';

/**
 * 创建资源证书配置
 * 教师为课程配置证书模板和要求
 */
export async function createResourceCertificateConfigController(req: AuthRequest, res: Response) {
  const teacherId = req.user!.userId;
  const { courseId, templateId, completionRequirement, minLearningTime, isEnabled, overrideFields } = req.body as {
    courseId?: number; templateId?: number; completionRequirement?: number; minLearningTime?: number; isEnabled?: number; overrideFields?: any;
  };

  // 参数校验
  if (!courseId || typeof courseId !== 'number' || courseId <= 0) {
    const response: ResponseType<ResourceCertificateConfigInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Invalid courseId',
    };
    return res.status(400).json(response);
  }

  if (!templateId || typeof templateId !== 'number' || templateId <= 0) {
    const response: ResponseType<ResourceCertificateConfigInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Invalid templateId',
    };
    return res.status(400).json(response);
  }

  if (completionRequirement === undefined || typeof completionRequirement !== 'number') {
    const response: ResponseType<ResourceCertificateConfigInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'completionRequirement is required',
    };
    return res.status(400).json(response);
  }

  if (completionRequirement < 0 || completionRequirement > 100) {
    const response: ResponseType<ResourceCertificateConfigInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'completionRequirement must be between 0 and 100',
    };
    return res.status(400).json(response);
  }

  if (minLearningTime !== undefined && (typeof minLearningTime !== 'number' || minLearningTime < 0)) {
    const response: ResponseType<ResourceCertificateConfigInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'minLearningTime must be a non-negative number',
    };
    return res.status(400).json(response);
  }

  if (isEnabled !== undefined && isEnabled !== 0 && isEnabled !== 1) {
    const response: ResponseType<ResourceCertificateConfigInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'isEnabled must be 0 or 1',
    };
    return res.status(400).json(response);
  }

  let overrideFieldsStr: string | undefined;
  if (overrideFields !== undefined) {
    let parsed: any = overrideFields;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        const response: ResponseType<ResourceCertificateConfigInfo> = {
          code: StatusCode.BAD_REQUEST,
          message: 'overrideFields must be a valid JSON string',
        };
        return res.status(400).json(response);
      }
    }
    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      const response: ResponseType<ResourceCertificateConfigInfo> = {
        code: StatusCode.BAD_REQUEST,
        message: 'overrideFields must be an object',
      };
      return res.status(400).json(response);
    }
    const allowedKeys = ['courseName', 'issuerName', 'teacherSchool'];
    const invalidKey = Object.keys(parsed).find(k => !allowedKeys.includes(k));
    if (invalidKey) {
      const response: ResponseType<ResourceCertificateConfigInfo> = {
        code: StatusCode.BAD_REQUEST,
        message: `overrideFields key not allowed: ${invalidKey}`,
      };
      return res.status(400).json(response);
    }
    overrideFieldsStr = JSON.stringify(parsed);
  }

  const params: Partial<ResourceCertificateConfigInfo> = {
    courseId,
    templateId,
    completionRequirement,
    minLearningTime,
    isEnabled,
    overrideFields: overrideFieldsStr,
  };

  let data;
  try {
    data = await createResourceCertificateConfigService(teacherId, params);
  } catch (error) {
    console.error('Create resource certificate config controller error:', error);
    const response: ResponseType<ResourceCertificateConfigInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: error instanceof Error ? error.message : 'Failed to create resource certificate config',
    };
    return res.status(400).json(response);
  }

  const response: ResponseType<ResourceCertificateConfigInfo> = {
    code: StatusCode.SUCCESS,
    message: 'Resource certificate config created successfully',
    data,
  };
  return res.status(201).json(response);
}

/**
 * 更新资源证书配置
 * 教师更新自己课程的证书配置
 */
export async function updateResourceCertificateConfigController(req: AuthRequest, res: Response) {
  const teacherId = req.user!.userId;
  const configId = parseInt(req.params.configId);
  const { templateId, completionRequirement, minLearningTime, isEnabled, overrideFields } = req.body as {
    templateId?: number; completionRequirement?: number; minLearningTime?: number; isEnabled?: number; overrideFields?: any;
  };

  if (!configId || isNaN(configId) || configId <= 0) {
    const response: ResponseType<ResourceCertificateConfigInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Invalid configId',
    };
    return res.status(400).json(response);
  }

  if (templateId !== undefined && (typeof templateId !== 'number' || templateId <= 0)) {
    const response: ResponseType<ResourceCertificateConfigInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Invalid templateId',
    };
    return res.status(400).json(response);
  }

  if (completionRequirement !== undefined && (typeof completionRequirement !== 'number' || completionRequirement < 0 || completionRequirement > 100)) {
    const response: ResponseType<ResourceCertificateConfigInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'completionRequirement must be between 0 and 100',
    };
    return res.status(400).json(response);
  }

  if (minLearningTime !== undefined && (typeof minLearningTime !== 'number' || minLearningTime < 0)) {
    const response: ResponseType<ResourceCertificateConfigInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'minLearningTime must be a non-negative number',
    };
    return res.status(400).json(response);
  }

  if (isEnabled !== undefined && isEnabled !== 0 && isEnabled !== 1) {
    const response: ResponseType<ResourceCertificateConfigInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'isEnabled must be 0 or 1',
    };
    return res.status(400).json(response);
  }

  let overrideFieldsStr: string | undefined;
  if (overrideFields !== undefined) {
    let parsed: any = overrideFields;
    if (typeof parsed === 'string') {
      try {
        parsed = JSON.parse(parsed);
      } catch {
        const response: ResponseType<ResourceCertificateConfigInfo> = {
          code: StatusCode.BAD_REQUEST,
          message: 'overrideFields must be a valid JSON string',
        };
        return res.status(400).json(response);
      }
    }
    if (typeof parsed !== 'object' || Array.isArray(parsed)) {
      const response: ResponseType<ResourceCertificateConfigInfo> = {
        code: StatusCode.BAD_REQUEST,
        message: 'overrideFields must be an object',
      };
      return res.status(400).json(response);
    }
    const allowedKeys = ['courseName', 'issuerName', 'teacherSchool'];
    const invalidKey = Object.keys(parsed).find(k => !allowedKeys.includes(k));
    if (invalidKey) {
      const response: ResponseType<ResourceCertificateConfigInfo> = {
        code: StatusCode.BAD_REQUEST,
        message: `overrideFields key not allowed: ${invalidKey}`,
      };
      return res.status(400).json(response);
    }
    overrideFieldsStr = JSON.stringify(parsed);
  }

  const params: Partial<ResourceCertificateConfigInfo> = {
    templateId,
    completionRequirement,
    minLearningTime,
    isEnabled,
    overrideFields: overrideFieldsStr,
  };

  let data;
  try {
    data = await updateResourceCertificateConfigService(teacherId, configId, params);
  } catch (error) {
    console.error('Update resource certificate config controller error:', error);
    const response: ResponseType<ResourceCertificateConfigInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: error instanceof Error ? error.message : 'Failed to update resource certificate config',
    };
    return res.status(400).json(response);
  }

  const response: ResponseType<ResourceCertificateConfigInfo> = {
    code: StatusCode.SUCCESS,
    message: 'Resource certificate config updated successfully',
    data,
  };
  return res.status(200).json(response);
}

/**
 * 获取资源证书配置列表
 * 教师仅查看自己课程，管理员可查看全部
 */
export async function getResourceCertificateConfigListController(req: AuthRequest, res: Response) {
  const userRole = req.user!.role;
  const teacherId = userRole === ROLE_TEACHER ? req.user!.userId : undefined;

  const { courseId, templateId, isEnabled } = req.query;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 10;

  const params: Partial<ResourceCertificateConfigInfo> = {};
  if (courseId) {
    const idNum = parseInt(courseId as string);
    if (!isNaN(idNum)) params.courseId = idNum;
  }
  if (templateId) {
    const idNum = parseInt(templateId as string);
    if (!isNaN(idNum)) params.templateId = idNum;
  }
  if (isEnabled !== undefined) {
    const val = parseInt(isEnabled as string);
    if (!isNaN(val)) params.isEnabled = val;
  }

  let data;
  try {
    data = await getResourceCertificateConfigListService(params, page, pageSize, teacherId);
  } catch (error) {
    console.error('Get resource certificate config list controller error:', error);
    const response: ResponseType<{ records: ResourceCertificateConfigInfo[]; total: number }> = {
      code: StatusCode.INTERNAL_SERVER_ERROR,
      message: 'Failed to get resource certificate config list',
    };
    return res.status(500).json(response);
  }

  const response: ResponseType<{ records: ResourceCertificateConfigInfo[]; total: number }> = {
    code: StatusCode.SUCCESS,
    message: 'Get resource certificate config list successfully',
    data,
  };
  return res.status(200).json(response);
}

/**
 * 获取资源证书配置详情
 */
export async function getResourceCertificateConfigController(req: AuthRequest, res: Response) {
  const configId = parseInt(req.params.configId);

  if (!configId || isNaN(configId) || configId <= 0) {
    const response: ResponseType<ResourceCertificateConfigInfo> = { code: StatusCode.BAD_REQUEST, message: 'Invalid configId' };
    return res.status(400).json(response);
  }

  let data;
  try {
    data = await getResourceCertificateConfigService(configId);
  } catch (error) {
    console.error('Get resource certificate config controller error:', error);
    const response: ResponseType<ResourceCertificateConfigInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: error instanceof Error ? error.message : 'Failed to get resource certificate config',
    };
    return res.status(400).json(response);
  }

  if (!data) {
    const response: ResponseType<ResourceCertificateConfigInfo> = { code: StatusCode.NOT_FOUND, message: 'Resource certificate config not found' };
    return res.status(404).json(response);
  }

  const response: ResponseType<ResourceCertificateConfigInfo> = {
    code: StatusCode.SUCCESS,
    message: 'Get resource certificate config successfully',
    data,
  };
  return res.status(200).json(response);
}
