import { Request, Response } from 'express';
import { registerService, loginService } from '../services/userService';
import { UserInfo } from '../types/userType';
import { ResponseType } from '../types/responseType';
import { StatusCode } from '../constants/statusCode';

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
  
  const response: ResponseType<UserInfo> = {
    code: StatusCode.SUCCESS,
    message: 'Login successful',
    data: result.user,
    token: result.token,
  };
  return res.status(200).json(response);
}

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