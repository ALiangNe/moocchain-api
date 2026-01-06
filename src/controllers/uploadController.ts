import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { ResponseType } from '../types/responseType';
import { StatusCode } from '../constants/statusCode';
import { updateUserService } from '../services/userService';

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
    const avatarUrl = `/uploads/avatars/${req.file.filename}`;
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

/**
 * 上传认证材料
 * 接收文件（图片或 PDF），保存到服务器，并更新用户的 certificateFile 字段
 */
export async function uploadCertificateController(req: AuthRequest, res: Response) {
  const userId = req.user!.userId;

  if (!req.file) {
    const response: ResponseType<never> = {
      code: StatusCode.BAD_REQUEST,
      message: '请选择要上传的认证材料文件',
    };
    return res.status(400).json(response);
  }

  try {
    const certificateUrl = `/uploads/certificates/${req.file.filename}`;
    const result = await updateUserService(userId, { certificateFile: certificateUrl });

    const response: ResponseType<typeof result> = {
      code: StatusCode.SUCCESS,
      message: '认证材料上传成功',
      data: result,
    };
    return res.status(200).json(response);
  } catch (error) {
    console.error('Upload certificate error:', error);
    const response: ResponseType<never> = {
      code: StatusCode.INTERNAL_SERVER_ERROR,
      message: error instanceof Error ? error.message : '认证材料上传失败',
    };
    return res.status(500).json(response);
  }
}

