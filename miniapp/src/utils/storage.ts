import { STORAGE_KEYS } from '@/config/env';

export function getAccessToken(): string {
  return uni.getStorageSync(STORAGE_KEYS.accessToken) || '';
}

export function getRefreshToken(): string {
  return uni.getStorageSync(STORAGE_KEYS.refreshToken) || '';
}

export function getTokenExpiry(): number {
  const raw = uni.getStorageSync(STORAGE_KEYS.tokenExpiry);
  return raw ? Number(raw) : 0;
}

export function setTokens(accessToken: string, refreshToken: string): void {
  uni.setStorageSync(STORAGE_KEYS.accessToken, accessToken);
  uni.setStorageSync(STORAGE_KEYS.refreshToken, refreshToken);
  // Access token TTL matches backend (15m); store a client-side hint for proactive refresh.
  uni.setStorageSync(STORAGE_KEYS.tokenExpiry, String(Date.now() + 15 * 60 * 1000));
}

export function clearTokens(): void {
  uni.removeStorageSync(STORAGE_KEYS.accessToken);
  uni.removeStorageSync(STORAGE_KEYS.refreshToken);
  uni.removeStorageSync(STORAGE_KEYS.tokenExpiry);
}
