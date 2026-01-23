import { Request, Response } from 'express';
import { registerService, loginService, updateUserService } from '../services/userService';
import { UserInfo } from '../types/userType';
import { ResponseType } from '../types/responseType';
import { StatusCode } from '../constants/statusCode';
import { AuthRequest } from '../middlewares/authMiddleware';

/**
 * 用户登录
 * 验证用户名密码，生成双 Token
 * refreshToken 存储在 HttpOnly Cookie 中，accessToken 返回给前端
 */
export async function loginController(req: Request, res: Response) {
  const { username, password } = req.body as UserInfo;

  // 验证登录请求参数
  if (!username || !password) {
    const response: ResponseType<UserInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Username and password are required',
    };
    return res.status(400).json(response);
  }

  const data = req.body as UserInfo;
  
  let result;
  try {
    result = await loginService(data);
  } catch (error) {
    console.error('Login controller error:', error);
    const response: ResponseType<UserInfo> = {
      code: StatusCode.UNAUTHORIZED,
      message: 'Login failed',
    };
    return res.status(401).json(response);
  }
  
  // 设置 HttpOnly Cookie，包含 refreshToken）
  const isDevelopment = process.env.NODE_ENV === 'development';
  res.cookie('refresh_token', result.refreshToken, {
    httpOnly: true, // JavaScript 无法读取
    secure: !isDevelopment, // 开发环境允许 HTTP，生产环境仅 HTTPS
    sameSite: 'strict', // 防止 CSRF
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
    path: '/', // Cookie 路径
  });

  // 响应中只返回 accessToken，refreshToken 已在 Cookie 中
  const response: ResponseType<UserInfo> = {
    code: StatusCode.SUCCESS,
    message: 'Login successful',
    data: result.user,
    accessToken: result.accessToken,
    // refreshToken 不再返回，已设置在 HttpOnly Cookie 中
  };
  return res.status(200).json(response);
}

/**
 * 用户注册
 * 创建新用户账户，不返回 Token
 */
export async function registerController(req: Request, res: Response) {
  const { username, password, email } = req.body as UserInfo;

  // 验证注册请求参数
  if (!username || !password || !email) {
    const response: ResponseType<UserInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Username, password and email are required',
    };
    return res.status(400).json(response);
  }

  const data = req.body as UserInfo;

  let result;
  try {
    result = await registerService(data);
  } catch (error) {
    console.error('Register controller error:', error);
    const response: ResponseType<UserInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Register failed',
    };
    return res.status(400).json(response);
  }

  const response: ResponseType<UserInfo> = {
    code: StatusCode.SUCCESS,
    message: 'Registration successful',
    data: result,
  };
  return res.status(201).json(response);
}

/**
 * 更新用户信息
 * 根据 token 中的 userId 更新用户个人信息
 */
export async function updateUserController(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  const data = req.body as Partial<UserInfo>;

  // 检查是否至少有一个可更新的字段
  const updatableFields = ['email', 'realName', 'phone', 'idCard', 'avatar', 'gender', 'schoolName', 'certificateFile', 'walletAddress', 'tokenBalance'];
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

  let result;
  try {
    result = await updateUserService(userId, data);
  } catch (error) {
    console.error('Update user controller error:', error);
    const response: ResponseType<UserInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: error instanceof Error ? error.message : 'Update user failed',
    };
    return res.status(400).json(response);
  }

  const response: ResponseType<UserInfo> = {
    code: StatusCode.SUCCESS,
    message: 'User information updated successfully',
    data: result,
  };
  return res.status(200).json(response);
}
