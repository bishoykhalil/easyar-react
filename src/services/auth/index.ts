import { request } from '@umijs/max';

export interface LoginParams {
  email: string;
  password: string;
}

export interface LoginData {
  token: string;
  roles: string[];
}

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

export async function login(params: LoginParams) {
  return request<ApiResponse<LoginData>>('/api/auth/login', {
    method: 'POST',
    data: params,
  });
}
