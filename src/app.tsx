import type { RequestConfig, RuntimeConfig } from '@umijs/max';
import { history } from '@umijs/max';
import HeaderActions from './components/HeaderActions';

const loginPath = '/user/login';
const TOKEN_KEY = 'easyar_token';
const ROLES_KEY = 'easyar_roles';
const PERMS_KEY = 'easyar_perms';
const THEME_KEY = 'easyar_theme';

export type InitialState = {
  token?: string;
  roles?: string[];
  permissions?: string[];
  themeMode?: string;
  currentUser?: {
    id?: number;
    name?: string;
    email?: string;
    [key: string]: any;
  };
};

export async function getInitialState(): Promise<InitialState> {
  const token = localStorage.getItem(TOKEN_KEY) || undefined;
  const savedTheme = localStorage.getItem(THEME_KEY) || 'SYSTEM';
  const roles = (() => {
    const raw = localStorage.getItem(ROLES_KEY);
    try {
      return raw ? (JSON.parse(raw) as string[]) : undefined;
    } catch {
      return undefined;
    }
  })();
  const permissions = (() => {
    const raw = localStorage.getItem(PERMS_KEY);
    try {
      return raw ? (JSON.parse(raw) as string[]) : undefined;
    } catch {
      return undefined;
    }
  })();

  if (!token) {
    return {
      token: undefined,
      roles: undefined,
      permissions: undefined,
      themeMode: savedTheme,
      currentUser: undefined,
    };
  }

  try {
    const [meRes, settingsRes] = await Promise.all([
      fetch('http://localhost:8086/api/users/me', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
      fetch('http://localhost:8086/api/settings', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }),
    ]);

    let resolvedTheme = savedTheme;
    if (settingsRes.ok) {
      const settingsJson = await settingsRes.json();
      resolvedTheme = settingsJson?.data?.themeMode || savedTheme;
      if (resolvedTheme) {
        localStorage.setItem(THEME_KEY, resolvedTheme);
      }
    }

    if (!meRes.ok) {
      return {
        token,
        roles,
        permissions,
        themeMode: resolvedTheme,
        currentUser: undefined,
      };
    }

    const meJson = await meRes.json();
    return {
      token,
      roles,
      permissions: meJson?.data?.permissions ?? permissions,
      themeMode: resolvedTheme,
      currentUser: meJson?.data,
    };
  } catch {
    return {
      token,
      roles,
      permissions,
      themeMode: savedTheme,
      currentUser: undefined,
    };
  }
}

export const layout: RuntimeConfig['layout'] = ({ initialState }) => {
  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(ROLES_KEY);
    localStorage.removeItem(PERMS_KEY);
    history.push(loginPath);
  };

  const savedTheme =
    initialState?.themeMode || localStorage.getItem(THEME_KEY) || 'SYSTEM';
  const navTheme = savedTheme === 'DARK' ? 'realDark' : 'light';

  return {
    title: 'EasyAR Admin',
    logo: 'https://img.alicdn.com/tfs/TB1YHEpwUT1gK0jSZFhXXaAtVXa-28-27.svg',
    navTheme,
    menu: {
      locale: true,
    },
    rightContentRender: () => <HeaderActions onLogout={logout} />,
    onPageChange: () => {
      const { location } = history;
      const authed = Boolean(initialState?.token);
      if (!authed && location.pathname !== loginPath) {
        history.push(loginPath);
      }
    },
  };
};

// Global request config: attach token and proxy through /api to backend
export const request: RequestConfig = {
  prefix: '/api',
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
