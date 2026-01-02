import { UserInfo } from '../types/userType';
import { getUser, postUser } from '../models/userModel';
import { signAccessToken, signRefreshToken, storeRefreshTokenForUser } from './authService';

/**
 * 登录服务
 * 验证用户名密码，生成双 Token 并存储 refreshToken
 */
export async function loginService(data: UserInfo): Promise<{ user: UserInfo; accessToken: string; refreshToken: string }> {
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
export async function registerService(data: UserInfo): Promise<UserInfo> {
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