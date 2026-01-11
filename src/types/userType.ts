// 用户信息类型
export interface UserInfo {
  userId?: number;            // 用户ID，自增
  username?: string;          // 用户名，唯一标识
  password?: string;          // 密码，BCrypt加密存储
  email?: string;             // 邮箱地址，唯一
  walletAddress?: string;     // 区块链钱包地址，唯一
  certificateFile?: string;   // 证明文件路径（身份证明图片）
  realName?: string;          // 真实姓名
  phone?: string;             // 手机号码
  idCard?: string;            // 身份证号码
  avatar?: string;            // 头像图片路径
  gender?: number;            // 性别（0:其他，1:女，2:男）
  role?: number;              // 用户角色（0:管理员，4:教师，5:用户）
  walletBound?: number;       // 钱包绑定状态（0:未绑定，1:已绑定）
  tokenBalance?: number;      // 代币余额
  schoolName?: string;        // 学校名称
  createdAt?: Date;           // 创建时间
  updatedAt?: Date;           // 更新时间
}

