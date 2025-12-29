// API响应类型
export interface ResponseType<T> {
  code: number;
  message: string;
  data?: T;
  token?: string;
}

