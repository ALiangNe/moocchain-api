import { Request, Response } from 'express';
import { refreshAccessToken } from '../services/authService';
import { ResponseType } from '../types/responseType';
import { StatusCode } from '../constants/statusCode';
import { deleteRefreshToken } from '../services/authService';

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
