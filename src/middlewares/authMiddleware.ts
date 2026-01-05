import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserInfo } from '../types/userType';
import { ResponseType } from '../types/responseType';
import { StatusCode } from '../constants/statusCode';

const JWT_ACCESS_SECRET = (process.env.JWT_ACCESS_SECRET) as string;

/**
 * 扩展 Request 接口，添加 user 属性
 * 用于在认证中间件中附加用户信息
 */
export interface AuthRequest extends Request {
  user?: { userId: number; username: string; role?: number };
}

/**
 * JWT 认证中间件
 * 从请求头中提取 Access Token，验证后附加用户信息到 req.user
 * 验证失败则返回 401 未授权错误
 */
export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  if (!token) {
    const response: ResponseType<UserInfo> = {
      code: StatusCode.UNAUTHORIZED,
      message: 'Unauthorized',
    };
    return res.status(401).json(response);
  }

  // 验证 access token，decoded 是解码后的数据
  let decoded: { userId: number; username: string; role?: number };
  try {
    decoded = jwt.verify(token, JWT_ACCESS_SECRET as string) as { userId: number; username: string; role?: number };
  } catch (error) {
    console.error('JWT verify failed:', error);
    const response: ResponseType<UserInfo> = {
      code: StatusCode.UNAUTHORIZED,
      message: 'Invalid token',
    };
    return res.status(401).json(response);
  }

  // 验证 userId 是否存在
  if (!decoded.userId) {
    const response: ResponseType<UserInfo> = {
      code: StatusCode.UNAUTHORIZED,
      message: 'User ID not found in token',
    };
    return res.status(401).json(response);
  }

  req.user = decoded;
  return next();
}


