/**
 * 解析过期时间字符串为秒数
 * 支持格式: 数字 + 单位 (s/m/h/d)，例如: "15m" = 15分钟, "7d" = 7天
 */
export function parseExpiresIn(expiresIn: string): number {
  const match = expiresIn.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60; // 默认7天
  
  const value = parseInt(match[1], 10);
  const unit = match[2];
  
  switch (unit) {
    case 's': return value;
    case 'm': return value * 60;
    case 'h': return value * 60 * 60;
    case 'd': return value * 24 * 60 * 60;
    default: return 7 * 24 * 60 * 60;
  }
}

/**
 * 将日期时间转换为 MySQL 格式 (YYYY-MM-DD HH:MM:SS)
 * @param date 日期对象或日期字符串
 * @returns MySQL 格式的日期时间字符串
 */
export function formatDateTimeForMySQL(date: Date | string): string {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const seconds = String(d.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
