import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import './config/env';
import { testDatabaseConnection } from './config/database';
import userRoutes from './routes';

const app = express();
const PORT = process.env.PORT || 6700;

app.use(cors({ origin: 'http://localhost:6600', credentials: true, }));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 静态文件服务：提供上传的头像文件
app.use('/uploads', express.static(path.join(__dirname, '../uploads')));

app.get('/', (req, res) => { res.json({ message: 'Express + TypeScript 服务器运行成功！' }); });
app.use('/api/user', userRoutes);

async function bootstrap() {
  try {
    await testDatabaseConnection();
  } catch (error) {
    console.error('❌ 数据库连接失败', error);
    process.exit(1);
  }

  try {
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
});
  } catch (error) {
    console.error('❌ 服务器启动失败', error);
    process.exit(1);
  }
}

void bootstrap();

