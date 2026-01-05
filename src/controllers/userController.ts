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
