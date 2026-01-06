import multer from 'multer';
import path from 'path';
import fs from 'fs';

// 头像上传目录
const avatarDir = path.join(__dirname, '../../uploads/avatars');
if (!fs.existsSync(avatarDir)) {
  fs.mkdirSync(avatarDir, { recursive: true });
}

// 认证材料上传目录
const certificateDir = path.join(__dirname, '../../uploads/certificates');
if (!fs.existsSync(certificateDir)) {
  fs.mkdirSync(certificateDir, { recursive: true });
}

// 头像存储配置
const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, avatarDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${uniqueSuffix}${ext}`);
  },
});

// 头像文件过滤器：只允许图片
const avatarFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片文件（JPEG、PNG、GIF、WebP）'));
  }
};

// 创建头像上传实例
export const uploadAvatar = multer({
  storage: avatarStorage,
  fileFilter: avatarFileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// 认证材料存储配置（支持图片和 PDF）
const certificateStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, certificateDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `certificate-${uniqueSuffix}${ext}`);
  },
});

// 认证材料文件过滤器：允许图片和 PDF
const certificateFileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp', 'application/pdf'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('只允许上传图片或 PDF 文件'));
  }
};

// 创建认证材料上传实例
export const uploadCertificate = multer({
  storage: certificateStorage,
  fileFilter: certificateFileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
});

