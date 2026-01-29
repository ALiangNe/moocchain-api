import bcrypt from 'bcrypt';
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
  if (!data.username || !data.password) {
    throw new Error('Username and password are required');
  }

  let userWithPassword: UserInfo | null;
  try {
    userWithPassword = await getUser({ username: data.username }, { includePassword: true });
  } catch (error) {
    console.error('Login service error:', error);
    throw error;
  }

  if (!userWithPassword || !userWithPassword.userId || !userWithPassword.username || !userWithPassword.password) {
    throw new Error('Invalid username or password');
  }

  const isPasswordValid = await bcrypt.compare(String(data.password), String(userWithPassword.password));
  if (!isPasswordValid) {
    throw new Error('Invalid username or password');
  }

  // 登录成功后，不向后续流程暴露密码字段
  const { password: _password, ...safeUser } = userWithPassword;

  const accessToken = signAccessToken({ userId: safeUser.userId!, username: safeUser.username!, role: safeUser.role });
  const refreshToken = signRefreshToken({ userId: safeUser.userId!, username: safeUser.username!, role: safeUser.role });

  // 存储 refresh token
  storeRefreshTokenForUser(refreshToken, safeUser.userId!, safeUser.username!);

  return {
    user: safeUser,
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

  // 使用 bcrypt 对密码进行哈希存储
  if (!data.password) {
    throw new Error('Password is required');
  }

  const saltRounds = 10;
  let passwordHash: string;
  try {
    passwordHash = await bcrypt.hash(String(data.password), saltRounds);
  } catch (error) {
    console.error('Register service bcrypt hash error:', error);
    throw new Error('Failed to hash password');
  }

  const userToCreate: UserInfo = {
    ...data,
    password: passwordHash,
  };

  try {
    result = await postUser(userToCreate);
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

  let dataToUpdate: Partial<UserInfo> = data;

  // 管理员修改密码：必须先 bcrypt 加密再入库（数据库只存 hash）
  if (data.password !== undefined) {
    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(String(data.password), saltRounds);
    dataToUpdate = { ...data, password: passwordHash };
  }

  let result;
  try {
    result = await putUserByAdmin(userId, dataToUpdate);
  } catch (error) {
    console.error('Admin update user error:', error);
    throw error;
  }
  return result;
}