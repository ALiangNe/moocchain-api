import { UserInfo } from '../types/userType';
import { getUser, postUser, putUser, getUserList, putUserByAdmin } from '../models/userModel';
import { signAccessToken, signRefreshToken, storeRefreshTokenForUser } from './authService';
import { ROLE_ADMIN } from '../middlewares/roleMiddleware';

/**
 * 登录服务
 * 验证用户名密码，生成双 Token 并存储 refreshToken
 */
export async function loginService(
  data: UserInfo
): Promise<{ user: UserInfo; accessToken: string; refreshToken: string }> {
  let result;
  try {
    result = await getUser({ username: data.username, password: data.password });
  } catch (error) {
    console.error('Login service error:', error);
    throw error;
  }

  if (!result || !result.userId || !result.username) {
    throw new Error('Invalid username or password');
  }

  const accessToken = signAccessToken({ userId: result.userId, username: result.username, role: result.role });
  const refreshToken = signRefreshToken({ userId: result.userId, username: result.username, role: result.role });

  // 存储 refresh token
  storeRefreshTokenForUser(refreshToken, result.userId, result.username);

  return {
    user: result,
    accessToken,
    refreshToken,
  };
}

/**
 * 注册服务
 * 检查用户名是否已存在，创建新用户账户
 */
export async function registerService(
  data: UserInfo
): Promise<UserInfo> {
  const { username } = data;

  let result;
  try {
    result = await getUser({ username });
  } catch (error) {
    console.error('Register service error:', error);
    throw error;
  }

  if (result) {
    throw new Error('Username already exists');
  }

  try {
    result = await postUser(data);
  } catch (error) {
    console.error('Register service error:', error);
    throw error;
  }

  return result;
}

/**
 * 更新用户信息服务
 * 更新用户个人信息，不允许修改敏感字段（username, password, role等）
 */
export async function updateUserService(
  userId: number,
  data: Partial<UserInfo>
): Promise<UserInfo> {
  // 检查用户是否存在
  let existingUser;
  try {
    existingUser = await getUser({ userId });
  } catch (error) {
    console.error('Update user service error:', error);
    throw error;
  }

  if (!existingUser) {
    throw new Error('User not found');
  }

  // 如果更新邮箱，检查邮箱是否已被其他用户使用
  if (data.email && data.email !== existingUser.email) {
    let emailUser;
    try {
      emailUser = await getUser({ email: data.email });
    } catch (error) {
      console.error('Update user service error:', error);
      throw error;
    }

    if (emailUser && emailUser.userId !== userId) {
      throw new Error('Email already in use');
    }
  }

  // 更新用户信息
  let result;
  try {
    result = await putUser(userId, data);
  } catch (error) {
    console.error('Update user service error:', error);
    throw error;
  }

  return result;
}

/**
 * 获取用户列表服务（管理员）
 */
export async function getUserListService(
  adminId: number,
  params: Partial<UserInfo>,
  page: number = 1,
  pageSize: number = 10
): Promise<{ records: UserInfo[]; total: number }> {
  const admin = await getUser({ userId: adminId });
  if (!admin) throw new Error('Admin not found');
  if (admin.role !== ROLE_ADMIN) throw new Error('Only admins can access user list');
  return await getUserList(params, page, pageSize);
}

/**
 * 管理员更新用户信息服务
 */
export async function adminUpdateUserService(
  adminId: number,
  userId: number,
  data: Partial<UserInfo>
): Promise<UserInfo> {
  const admin = await getUser({ userId: adminId });
  if (!admin) throw new Error('Admin not found');
  if (admin.role !== ROLE_ADMIN) throw new Error('Only admins can update users');

  const existingUser = await getUser({ userId });
  if (!existingUser) throw new Error('User not found');

  if (data.email && data.email !== existingUser.email) {
    const emailUser = await getUser({ email: data.email });
    if (emailUser && emailUser.userId !== userId) throw new Error('Email already in use');
  }

  return await putUserByAdmin(userId, data);
}