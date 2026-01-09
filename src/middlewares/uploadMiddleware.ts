import multer from 'multer';
import path from 'path';
import fs from 'fs';

// 文件类型常量
const FILE_TYPES = {
  // 图片类型
  IMAGE: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp'],
  
  // 文档类型
  DOCUMENT: [
    'application/pdf', // PDF
    'application/msword', // Word .doc
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // Word .docx
    'application/vnd.ms-excel', // Excel .xls
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // Excel .xlsx
  ],
  
  // 音频类型
  AUDIO: [
    'audio/mpeg', // MP3
    'audio/wav',
    'audio/ogg',
    'audio/mp4',
    'audio/x-m4a',
    'audio/aac',
  ],
  
  // 视频类型
  VIDEO: [
    'video/mp4',
    'video/mpeg',
    'video/quicktime', // MOV
    'video/x-msvideo', // AVI
    'video/webm',
    'video/x-matroska', // MKV
  ],
} as const;

// 上传配置接口
interface UploadConfig {
  uploadDir: string;
  filePrefix: string;
  allowedMimes: string[];
  maxFileSize: number; // 字节
  errorMessage?: string;
}

/**
 * 创建上传中间件
 * @param config 上传配置
 * @returns multer 中间件实例
 */
function createUploadMiddleware(config: UploadConfig) {
  const { uploadDir, filePrefix, allowedMimes, maxFileSize, errorMessage } = config;

  // 确保上传目录存在
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  // 存储配置
  const storage = multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
      const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
      const ext = path.extname(file.originalname);
      cb(null, `${filePrefix}-${uniqueSuffix}${ext}`);
    },
  });

  // 文件过滤器
  const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(errorMessage || '文件类型不允许'));
    }
  };

  // 创建 multer 实例
  return multer({
    storage,
    fileFilter,
    limits: {
      fileSize: maxFileSize,
    },
  });
}

// 上传目录基础路径
const uploadsBaseDir = path.join(__dirname, '../../uploads');

// 头像上传：只允许图片，5MB
export const uploadAvatar = createUploadMiddleware({
  uploadDir: path.join(uploadsBaseDir, 'avatars'),
  filePrefix: 'avatar',
  allowedMimes: [...FILE_TYPES.IMAGE],
  maxFileSize: 5 * 1024 * 1024, // 5MB
  errorMessage: '只允许上传图片文件（JPEG、PNG、GIF、WebP）',
});

// 认证材料上传：允许图片和 PDF，10MB
export const uploadCertificate = createUploadMiddleware({
  uploadDir: path.join(uploadsBaseDir, 'certificates'),
  filePrefix: 'certificate',
  allowedMimes: [...FILE_TYPES.IMAGE, 'application/pdf'],
  maxFileSize: 10 * 1024 * 1024, // 10MB
  errorMessage: '只允许上传图片或 PDF 文件',
});

// 教育资源上传：支持文档、音频、视频，500MB
export const uploadResource = createUploadMiddleware({
  uploadDir: path.join(uploadsBaseDir, 'resources'),
  filePrefix: 'resource',
  allowedMimes: [...FILE_TYPES.DOCUMENT, ...FILE_TYPES.AUDIO, ...FILE_TYPES.VIDEO],
  maxFileSize: 500 * 1024 * 1024, // 500MB，支持大文件（视频可能较大）
  errorMessage: '只允许上传文档（PDF、Word、Excel）、音频或视频文件',
});

// 课程封面上传：只允许图片，5MB
export const uploadCourseCover = createUploadMiddleware({
  uploadDir: path.join(uploadsBaseDir, 'courses'),
  filePrefix: 'course',
  allowedMimes: [...FILE_TYPES.IMAGE],
  maxFileSize: 5 * 1024 * 1024, // 5MB
  errorMessage: '只允许上传图片文件（JPEG、PNG、GIF、WebP）',
});
