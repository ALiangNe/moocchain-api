import jwt, { SignOptions } from 'jsonwebtoken';
import type { StringValue } from 'ms';
import { getUser, postUser } from '../models/userModel';
import { UserInfo } from '../types/userType';

const JWT_SECRET = (process.env.JWT_SECRET ) as string;
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN ) as StringValue;

function signToken(payload: object): string {
  const options: SignOptions = { expiresIn: JWT_EXPIRES_IN };
  return jwt.sign(payload, JWT_SECRET, options);
}

export async function loginService(data: UserInfo): Promise<{ user: UserInfo; token: string }> {
  let result;
  try {
    result = await getUser({ username: data.username, password: data.password });
  } catch (error) {
    console.error('Login service error:', error);
    throw error;
  }
  
  if (!result) {
    throw new Error('Invalid username or password');
  }
  
  const token = signToken({ userId: result.userId, username: result.username });
  
  return {
    user: result,
    token,
  };
}

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