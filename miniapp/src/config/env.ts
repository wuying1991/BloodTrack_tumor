/**
 * Local MVP API base.
 *
 * Prefer 127.0.0.1 over "localhost" when a system proxy is on (e.g. Clash :10808):
 * many proxies mishandle localhost / hijack 5000 (macOS AirPlay also uses 5000).
 *
 * Override in `.env.development`:
 *   VITE_API_BASE_URL=http://127.0.0.1:5001/api
 */
const configuredApiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;

if (
  import.meta.env.PROD &&
  (!configuredApiBase ||
    !configuredApiBase.startsWith('https://') ||
    /https:\/\/(localhost|127\.0\.0\.1|0\.0\.0\.0)(?=[:/]|$)/i.test(configuredApiBase))
) {
  throw new Error('生产环境 API 配置无效');
}

export const API_BASE_URL =
  configuredApiBase || 'http://127.0.0.1:5001/api';

export const IS_DEVELOPMENT = import.meta.env.DEV;

export const REQUEST_TIMEOUT_MS = 15000;

export const STORAGE_KEYS = {
  accessToken: 'bt_access_token',
  refreshToken: 'bt_refresh_token',
  tokenExpiry: 'bt_token_expiry',
} as const;
