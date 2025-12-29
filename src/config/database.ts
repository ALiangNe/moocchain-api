import './env';
import mysql from 'mysql2/promise';

const { DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME } = process.env;

// 创建 MySQL 连接池
export const dbPool = mysql.createPool({
  host: DB_HOST,
  port: Number(DB_PORT),
  user: DB_USER,
  password: DB_PASSWORD,
  database: DB_NAME,
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// 启动时连通性检查
export async function testDatabaseConnection() {
  let connection;
  try {
    connection = await dbPool.getConnection();
    await connection.query('SELECT 1');
    console.log('✅ MySQL 数据库连接成功');
  } catch (error) {
    console.error('❌ MySQL 数据库连通性检查失败', error);
    throw error;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}


