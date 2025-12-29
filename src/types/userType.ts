// 用户信息类型
export interface UserInfo {
  userId?: number;
  username?: string;
  password?: string;
  email?: string;
  walletAddress?: string;
  certificateFile?: string;
  realName?: string;
  phone?: string;
  idCard?: string;
  avatar?: string;
  gender?: number;
  role?: number;
  walletBound?: number;
  tokenBalance?: number;
  schoolName?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

