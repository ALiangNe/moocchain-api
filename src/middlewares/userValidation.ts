import { Request, Response, NextFunction } from 'express';
import { UserInfo } from '../types/userType';
import { ResponseType } from '../types/responseType';
import { StatusCode } from '../constants/statusCode';

/**
 * 验证注册请求参数
 */
export function validateRegister(req: Request, res: Response, next: NextFunction) {
  const { username, password, email } = req.body as UserInfo;

  if (!username || !password || !email) {
    const response: ResponseType<UserInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Username, password and email are required',
    };
    return res.status(400).json(response);
  }

  next();
}

/**
 * 验证登录请求参数
 */
export function validateLogin(req: Request, res: Response, next: NextFunction) {
  const { username, password } = req.body as UserInfo;

  if (!username || !password) {
    const response: ResponseType<UserInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Username and password are required',
    };
    return res.status(400).json(response);
  }

  next();
}

/**
 * 验证更新用户信息请求参数
 */
export function validateUpdateUser(req: Request, res: Response, next: NextFunction) {
  const data = req.body as Partial<UserInfo>;

  // 检查是否至少有一个可更新的字段
  const updatableFields = ['email', 'realName', 'phone', 'idCard', 'avatar', 'gender', 'schoolName', 'certificateFile'];
  const hasValidField = updatableFields.some(field => data[field as keyof UserInfo] !== undefined);

  if (!hasValidField) {
    const response: ResponseType<UserInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'At least one field to update is required',
    };
    return res.status(400).json(response);
  }

  // 验证邮箱格式
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    const response: ResponseType<UserInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Invalid email format',
    };
    return res.status(400).json(response);
  }

  // 验证手机号格式
  if (data.phone && !/^1[3-9]\d{9}$/.test(data.phone)) {
    const response: ResponseType<UserInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Invalid phone format',
    };
    return res.status(400).json(response);
  }

  // 验证身份证格式
  if (data.idCard && !/^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/.test(data.idCard)) {
    const response: ResponseType<UserInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Invalid ID card format',
    };
    return res.status(400).json(response);
  }

  // 验证性别
  if (data.gender !== undefined && ![0, 1, 2].includes(data.gender)) {
    const response: ResponseType<UserInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Gender must be 0 (unknown), 1 (male), or 2 (female)',
    };
    return res.status(400).json(response);
  }

  next();
}

