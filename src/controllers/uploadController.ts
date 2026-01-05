import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { ResponseType } from '../types/responseType';
import { StatusCode } from '../constants/statusCode';
import { updateUserService } from '../services/userService';
import path from 'path';

/**
 * 上传头像
 * 接收图片文件，保存到服务器，并更新用户的 avatar 字段
 */
export async function uploadAvatarController(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;
  
  if (!req.file) {
    const response: ResponseType<never> = {
      code: StatusCode.BAD_REQUEST,
      message: '请选择要上传的图片文件',
    };
    return res.status(400).json(response);
  }

  try {
    // 构建头像 URL（相对于服务器的路径）
    // 例如：/uploads/avatars/avatar-1234567890-123456789.jpg
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
    
    // 更新用户的 avatar 字段
    const result = await updateUserService(userId, { avatar: avatarUrl });
    
    const response: ResponseType<typeof result> = {
      code: StatusCode.SUCCESS,
      message: '头像上传成功',
      data: result,
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error('Upload avatar error:', error);
    const response: ResponseType<never> = {
      code: StatusCode.INTERNAL_SERVER_ERROR,
      message: error instanceof Error ? error.message : '头像上传失败',
    };
    return res.status(500).json(response);
  }
}

