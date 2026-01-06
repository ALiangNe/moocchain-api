import { Response, NextFunction } from 'express';
import { ResponseType } from '../types/responseType';
import { StatusCode } from '../constants/statusCode';
import { AuthRequest } from './authMiddleware';

// 角色常量
export const ROLE_ADMIN = 0;
export const ROLE_TEACHER = 4;
export const ROLE_STUDENT = 5;

/**
 * 检查用户角色
 * @param role 角色值：0=管理员，4=教师，5=学生
 */
export function checkRole(role: number) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      const response: ResponseType<any> = {
        code: StatusCode.UNAUTHORIZED,
        message: 'Unauthorized',
      };
      return res.status(401).json(response);
    }

    if (req.user.role !== role) {
      const roleNames: Record<number, string> = {
        0: 'Admin',
        4: 'Teacher',
        5: 'Student',
      };
      const response: ResponseType<any> = {
        code: StatusCode.FORBIDDEN,
        message: `${roleNames[role] || 'Required'} access required`,
      };
      return res.status(403).json(response);
    }

    next();
  };
}
