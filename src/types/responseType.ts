// API响应类型
export interface ResponseType<T> {
  code: number;              // 响应状态码（0:成功，非0:失败）
  message: string;           // 响应消息
  data?: T;                  // 响应数据（泛型）
  accessToken?: string;      // 访问令牌（JWT）
  refreshToken?: string;     // 刷新令牌（JWT）
}

