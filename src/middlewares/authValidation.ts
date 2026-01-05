import { Response, NextFunction } from 'express';
import { UserInfo } from '../types/userType';
import { ResponseType } from '../types/responseType';
import { StatusCode } from '../constants/statusCode';
import { AuthRequest } from './authMiddleware';

/**
 * 验证用户ID是否存在
 * 用于需要从 token 中获取 userId 的接口
 */
export function validateUserId(req: AuthRequest, res: Response, next: NextFunction) {
  const userId = req.user?.userId;

  if (!userId) {
    const response: ResponseType<UserInfo> = {
      code: StatusCode.UNAUTHORIZED,
      message: 'User ID not found in token',
    };
    return res.status(401).json(response);
  }

  next();
}

