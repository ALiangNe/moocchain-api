import { Request, Response } from 'express';
import { refreshAccessToken, deleteRefreshToken } from '../services/authService';
import { getUser } from '../models/userModel';
import { UserInfo } from '../types/userType';
import { ResponseType } from '../types/responseType';
import { StatusCode } from '../constants/statusCode';
import { AuthRequest } from '../middlewares/authMiddleware';

/**
 * 刷新 Access Token
 * 从 HttpOnly Cookie 中读取 refreshToken，验证后生成新的双 Token
 * 新的 refreshToken 会更新到 Cookie 中，accessToken 返回给前端
 */
export async function refreshTokenController(req: Request, res: Response) {
  // 从 Cookie 中读取 refreshToken（HttpOnly Cookie 会自动发送）
  const refreshToken = req.cookies?.refresh_token;

  if (!refreshToken) {
    const response: ResponseType<never> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Refresh token is required',
    };
    return res.status(400).json(response);
  }

  const result = refreshAccessToken(refreshToken);

  if (!result) {
    const response: ResponseType<never> = {
      code: StatusCode.UNAUTHORIZED,
      message: 'Invalid or expired refresh token',
    };
    return res.status(401).json(response);
  }

  // 设置新的 HttpOnly Cookie（包含新的 refreshToken）
  const isDevelopment = process.env.NODE_ENV === 'development';
  res.cookie('refresh_token', result.refreshToken, {
    httpOnly: true,
    secure: !isDevelopment, // 开发环境允许 HTTP，生产环境仅 HTTPS
    sameSite: 'strict',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7天
    path: '/',
  });

  // 响应中只返回 accessToken，不返回 refreshToken（已在 Cookie 中）
  // 前端需要调用 getUser API 获取完整的用户信息
  const response: ResponseType<never> = {
    code: StatusCode.SUCCESS,
    message: 'Token refreshed successfully',
    accessToken: result.accessToken,
    // refreshToken 不再返回，已设置在 HttpOnly Cookie 中
  };
  return res.status(200).json(response);
}

/**
 * 退出登录
 * 清除 HttpOnly Cookie 和后端存储的 refreshToken
 */
export async function logoutController(req: Request, res: Response) {
  const refreshToken = req.cookies?.refresh_token;

  // 如果存在 refreshToken，从后端存储中删除
  if (refreshToken) {
    deleteRefreshToken(refreshToken);
  }

  // 清除 HttpOnly Cookie
  const isDevelopment = process.env.NODE_ENV === 'development';
  res.clearCookie('refresh_token', {
    httpOnly: true,
    secure: !isDevelopment, // 开发环境允许 HTTP，生产环境仅 HTTPS
    sameSite: 'strict',
    path: '/',
  });

  const response: ResponseType<never> = {
    code: StatusCode.SUCCESS,
    message: 'Logout successful',
  };
  return res.status(200).json(response);
}

/**
 * 获取当前用户信息
 * 需要认证，从 token 中获取 userId，然后查询数据库返回完整用户信息
 */
export async function getCurrentUserController(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;

  let user;
  try {
    user = await getUser({ userId });
  } catch (error) {
    console.error('Get current user error:', error);
    const response: ResponseType<UserInfo> = {
      code: StatusCode.INTERNAL_SERVER_ERROR,
      message: 'Failed to get user information',
    };
    return res.status(500).json(response);
  }

  if (!user) {
    const response: ResponseType<UserInfo> = {
      code: StatusCode.NOT_FOUND,
      message: 'User not found',
    };
    return res.status(404).json(response);
  }

  // 不返回密码字段
  const { password, ...userWithoutPassword } = user;

  const response: ResponseType<UserInfo> = {
    code: StatusCode.SUCCESS,
    message: 'Get user information successful',
    data: userWithoutPassword,
  };
  return res.status(200).json(response);
}
