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
 * @param roles 角色值数组：0=管理员，4=教师，5=学生
 * @example checkRole(0) - 只允许管理员
 * @example checkRole(0, 4) - 允许管理员或教师
 */
export function checkRole(...roles: number[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      const response: ResponseType<any> = {
        code: StatusCode.UNAUTHORIZED,
        message: 'Unauthorized',
      };
      return res.status(401).json(response);
    }

    const userRole = req.user.role;
    if (userRole === undefined || !roles.includes(userRole)) {
      const roleNames: Record<number, string> = {
        0: 'Admin',
        4: 'Teacher',
        5: 'Student',
      };
      const allowedRoles = roles.map((role: number) => {
        const roleName = roleNames[role];
        return roleName || `Role ${role}`;
      }).join(' or ');
      const response: ResponseType<any> = {
        code: StatusCode.FORBIDDEN,
        message: `${allowedRoles} access required`,
      };
      return res.status(403).json(response);
    }

    next();
  };
}
