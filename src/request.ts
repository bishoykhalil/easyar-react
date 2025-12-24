import { history, RequestConfig } from '@umijs/max';

const TOKEN_KEY = 'easyar_token';
const loginPath = '/user/login';

export const request: RequestConfig = {
  // `prefix` is honored by umi-request; baseURL may be ignored in some setups.
  prefix: 'http://localhost:8086',
  timeout: 20000,
  requestInterceptors: [
    (url, options) => {
      const token = localStorage.getItem(TOKEN_KEY);
      const headers = {
        ...options.headers,
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };
      return {
        url,
        options: {
          ...options,
          headers,
        },
      };
    },
  ],
  responseInterceptors: [
    async (response) => {
      if (response.status === 401 || response.status === 403) {
        history.push(loginPath);
      }
      return response;
    },
  ],
};
