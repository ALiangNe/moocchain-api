import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserInfo } from '../types/userType';
import { ResponseType } from '../types/responseType';
import { StatusCode } from '../constants/statusCode';

const { JWT_SECRET } = process.env;

export interface AuthRequest extends Request {
  user?: { userId: number; username: string };
}

export function authMiddleware(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : undefined;

  if (!token) {
    const response: ResponseType<UserInfo> = {
      code: StatusCode.UNAUTHORIZED,
      message: 'Unauthorized',
    };
    return res.status(401).json(response);
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET as string) as { userId: number; username: string };
    req.user = decoded;
    return next();
  } catch (error) {
    console.error('JWT verify failed:', error);
    const response: ResponseType<UserInfo> = {
      code: StatusCode.UNAUTHORIZED,
      message: 'Invalid token',
    };
    return res.status(401).json(response);
  }
}


