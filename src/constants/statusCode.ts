// 状态码常量定义
export enum StatusCode {
  // 成功
  SUCCESS = 0,

  // 客户端错误
  BAD_REQUEST = 400,        // 请求参数错误
  UNAUTHORIZED = 401,       // 未授权/认证失败
  FORBIDDEN = 403,          // 禁止访问
  NOT_FOUND = 404,          // 资源不存在
  CONFLICT = 409,           // 资源冲突（如用户名已存在）

  // 服务器错误
  INTERNAL_SERVER_ERROR = 500,  // 服务器内部错误
  SERVICE_UNAVAILABLE = 503,    // 服务不可用
}

