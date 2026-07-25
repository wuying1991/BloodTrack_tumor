import {
  API_BASE_URL,
  IS_DEVELOPMENT,
  REQUEST_TIMEOUT_MS,
} from '@/config/env';
import { ApiError, type ApiFailureBody } from '@/types/api';
import {
  clearTokens,
  getAccessToken,
  getRefreshToken,
  setTokens,
} from '@/utils/storage';

type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH'

export interface RequestOptions {
  url: string;
  method?: HttpMethod;
  data?: unknown;
  /** Skip Authorization header (login / register / refresh). */
  skipAuth?: boolean;
  /** Internal: avoid infinite refresh loops. */
  _retry?: boolean;
}

interface UniRequestSuccess {
  statusCode: number;
  data: unknown;
  header?: Record<string, string>;
}

let refreshPromise: Promise<string | null> | null = null;

function buildUrl(path: string): string {
  if (path.startsWith('http://') || path.startsWith('https://')) {
    return path;
  }
  const base = API_BASE_URL.replace(/\/$/, '');
  const p = path.startsWith('/') ? path : `/${path}`;
  return `${base}${p}`;
}

function parseFailure(statusCode: number, data: unknown): ApiError {
  const body = (data || {}) as ApiFailureBody;
  const message =
    body.message ||
    (statusCode === 401
      ? '未授权，请重新登录'
      : statusCode >= 500
        ? '服务器错误，请稍后重试'
        : '请求失败');
  return new ApiError(statusCode, message, {
    code: body.code,
    errors: body.errors,
    errorCodes: body.errorCodes,
  });
}

function rawRequest(options: RequestOptions): Promise<UniRequestSuccess> {
  const { url, method = 'GET', data, skipAuth } = options;
  const header: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (!skipAuth) {
    const token = getAccessToken();
    if (token) {
      header.Authorization = `Bearer ${token}`;
    }
  }

  return new Promise((resolve, reject) => {
    uni.request({
      url: buildUrl(url),
      // Uni typings omit PATCH on some versions; runtime WeChat supports it.
      method: method as UniApp.RequestOptions['method'],
      data: data as UniApp.RequestOptions['data'],
      header,
      timeout: REQUEST_TIMEOUT_MS,
      success: (res) => {
        resolve({
          statusCode: res.statusCode,
          data: res.data,
          header: res.header as Record<string, string> | undefined,
        });
      },
      fail: (err) => {
        const msg = err.errMsg || '';
        const hint = IS_DEVELOPMENT
          ? msg.includes('fail') || msg.includes('timeout')
            ? '网络异常：请确认后端已启动，且代理已绕过 127.0.0.1（见 miniapp/README）'
            : msg || '网络异常，请检查后端是否已启动'
          : '网络连接失败，请稍后重试';
        reject(new ApiError(0, hint));
      },
    });
  });
}

async function performRefresh(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    return null;
  }

  try {
    const res = await rawRequest({
      url: '/auth/refresh-token',
      method: 'POST',
      data: { refreshToken },
      skipAuth: true,
    });

    if (res.statusCode < 200 || res.statusCode >= 300) {
      clearTokens();
      return null;
    }

    const body = res.data as {
      success?: boolean;
      data?: { accessToken: string; refreshToken: string };
    };

    if (!body?.success || !body.data?.accessToken || !body.data?.refreshToken) {
      clearTokens();
      return null;
    }

    setTokens(body.data.accessToken, body.data.refreshToken);
    return body.data.accessToken;
  } catch {
    clearTokens();
    return null;
  }
}

export function refreshSession(): Promise<string | null> {
  if (!refreshPromise) {
    refreshPromise = performRefresh().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function redirectToLogin(): void {
  const pages = getCurrentPages();
  const current = pages[pages.length - 1] as { route?: string } | undefined;
  const route = current?.route || '';
  if (route.includes('pages/auth/login') || route.includes('pages/auth/register')) {
    return;
  }
  uni.reLaunch({ url: '/pages/auth/login' });
}

/**
 * Promise-based uni.request wrapper with single-flight token refresh.
 */
export async function request<T>(options: RequestOptions): Promise<T> {
  const res = await rawRequest(options);
  const { statusCode, data } = res;

  if (statusCode >= 200 && statusCode < 300) {
    return data as T;
  }

  // 401 on authenticated calls → try one refresh, then retry once.
  if (
    statusCode === 401 &&
    !options.skipAuth &&
    !options._retry
  ) {
    const refreshToken = getRefreshToken();
    // Login failures also return 401 without a session — surface the error.
    if (!refreshToken) {
      throw parseFailure(statusCode, data);
    }

    const newToken = await refreshSession();
    if (!newToken) {
      redirectToLogin();
      throw new ApiError(401, '登录已过期，请重新登录', {
        code: 'AUTH_SESSION_EXPIRED',
      });
    }
    return request<T>({ ...options, _retry: true });
  }

  throw parseFailure(statusCode, data);
}

export const http = {
  get: <T>(url: string, data?: unknown) =>
    request<T>({ url, method: 'GET', data }),
  post: <T>(url: string, data?: unknown, skipAuth = false) =>
    request<T>({ url, method: 'POST', data, skipAuth }),
  put: <T>(url: string, data?: unknown) =>
    request<T>({ url, method: 'PUT', data }),
  patch: <T>(url: string, data?: unknown) =>
    request<T>({ url, method: 'PATCH', data }),
  delete: <T>(url: string, data?: unknown) =>
    request<T>({ url, method: 'DELETE', data }),
};
