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

