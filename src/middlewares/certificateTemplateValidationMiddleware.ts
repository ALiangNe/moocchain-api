import { Request, Response, NextFunction } from 'express';
import { ResponseType } from '../types/responseType';
import { StatusCode } from '../constants/statusCode';
import { validateCertificateTemplate } from '../utils/certificateTemplateValidator';
import { AuthRequest } from './authMiddleware';

/**
 * 证书模板JSON配置验证中间件
 * 验证请求体中的 templateContent 字段是否符合证书模板结构规范
 * 用于创建和更新证书模板的路由
 */
export function validateCertificateTemplateMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const { templateContent } = req.body;

  // 如果是更新操作，templateContent 是可选的
  const isUpdate = req.method === 'PUT' || req.method === 'PATCH';
  
  // 更新操作时，如果没有提供 templateContent，跳过验证
  if (isUpdate && !templateContent) {
    return next();
  }

  // 创建操作或更新操作提供了 templateContent 时，必须验证
  if (!templateContent) {
    const response: ResponseType<never> = {
      code: StatusCode.BAD_REQUEST,
      message: 'templateContent is required',
    };
    return res.status(400).json(response);
  }

  // 验证模板内容
  try {
    validateCertificateTemplate(templateContent);
    return next();
  } catch (error) {
    const response: ResponseType<never> = {
      code: StatusCode.BAD_REQUEST,
      message: error instanceof Error ? error.message : 'templateContent validation failed',
    };
    return res.status(400).json(response);
  }
}
