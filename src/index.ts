import express from 'express';

const app = express();
const PORT = process.env.PORT || 6700;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 基础路由
app.get('/', (req, res) => {
  res.json({ message: 'Express + TypeScript 服务器运行成功！' });
});

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`🚀 服务器运行在 http://localhost:${PORT}`);
});

