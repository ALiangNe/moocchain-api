import { Request, Response } from 'express';
import { registerService, loginService, updateUserService, getUserListService, adminUpdateUserService } from '../services/userService';
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

/**
 * 获取用户列表
 */
export async function getUserListController(req: AuthRequest, res: Response) {
  const adminId = req.user!.userId;
  const { userId, username, email, realName, role, walletBound, schoolName } = req.query;
  const page = parseInt(req.query.page as string) || 1;
  const pageSize = parseInt(req.query.pageSize as string) || 10;

  const params: Partial<UserInfo> = {};

  if (userId !== undefined) {
    const userIdNum = parseInt(userId as string);
    if (!isNaN(userIdNum)) params.userId = userIdNum;
  }
  if (username !== undefined) params.username = String(username);
  if (email !== undefined) params.email = String(email);
  if (realName !== undefined) params.realName = String(realName);
  if (schoolName !== undefined) params.schoolName = String(schoolName);
  if (role !== undefined) {
    const roleNum = parseInt(role as string);
    if (!isNaN(roleNum)) params.role = roleNum;
  }
  if (walletBound !== undefined) {
    const walletBoundNum = parseInt(walletBound as string);
    if (!isNaN(walletBoundNum)) params.walletBound = walletBoundNum;
  }

  let data;
  try {
    data = await getUserListService(adminId, params, page, pageSize);
  } catch (error) {
    console.error('Get user list controller error:', error);
    const response: ResponseType<{ records: UserInfo[]; total: number }> = { code: StatusCode.INTERNAL_SERVER_ERROR, message: error instanceof Error ? error.message : 'Failed to get user list' };
    return res.status(500).json(response);
  }

  const response: ResponseType<{ records: UserInfo[]; total: number }> = { code: StatusCode.SUCCESS, message: 'Get user list successfully', data };
  return res.status(200).json(response);
}

/**
 * 管理员更新用户信息
 */
export async function adminUpdateUserController(req: AuthRequest, res: Response) {
  const adminId = req.user!.userId;
  const userId = parseInt(req.params.userId);
  const data = req.body as Partial<UserInfo>;

  if (!userId || isNaN(userId) || userId <= 0) {
    const response: ResponseType<UserInfo> = { code: StatusCode.BAD_REQUEST, message: 'Invalid userId' };
    return res.status(400).json(response);
  }

  const updatableFields = ['email', 'realName', 'phone', 'idCard', 'avatar', 'gender', 'role', 'walletBound', 'tokenBalance', 'schoolName', 'certificateFile', 'walletAddress', 'password'];
  const hasValidField = updatableFields.some(field => data[field as keyof UserInfo] !== undefined);
  if (!hasValidField) {
    const response: ResponseType<UserInfo> = { code: StatusCode.BAD_REQUEST, message: 'At least one field to update is required' };
    return res.status(400).json(response);
  }

  if (data.password !== undefined && (!data.password || String(data.password).length < 6)) {
    const response: ResponseType<UserInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Password must be at least 6 characters',
    };
    return res.status(400).json(response);
  }
  if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
    const response: ResponseType<UserInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Invalid email format',
    };
    return res.status(400).json(response);
  }
  if (data.phone && !/^1[3-9]\d{9}$/.test(data.phone)) {
    const response: ResponseType<UserInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Invalid phone format',
    };
    return res.status(400).json(response);
  }
  if (data.idCard && !/^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/.test(data.idCard)) {
    const response: ResponseType<UserInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Invalid ID card format',
    };
    return res.status(400).json(response);
  }
  if (data.gender !== undefined && ![0, 1, 2].includes(data.gender)) {
    const response: ResponseType<UserInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Gender must be 0 (unknown), 1 (male), or 2 (female)',
    };
    return res.status(400).json(response);
  }
  if (data.role !== undefined && ![0, 4, 5].includes(data.role)) {
    const response: ResponseType<UserInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'Role must be 0 (admin), 4 (teacher), or 5 (student)',
    };
    return res.status(400).json(response);
  }
  if (data.walletBound !== undefined && ![0, 1].includes(data.walletBound)) {
    const response: ResponseType<UserInfo> = {
      code: StatusCode.BAD_REQUEST,
      message: 'walletBound must be 0 or 1',
    };
    return res.status(400).json(response);
  }

  let result;
  try {
    result = await adminUpdateUserService(adminId, userId, data);
  } catch (error) {
    console.error('Admin update user controller error:', error);
    const response: ResponseType<UserInfo> = { code: StatusCode.BAD_REQUEST, message: error instanceof Error ? error.message : 'Update user failed' };
    return res.status(400).json(response);
  }

  const response: ResponseType<UserInfo> = { code: StatusCode.SUCCESS, message: 'User updated successfully', data: result };
  return res.status(200).json(response);
}
