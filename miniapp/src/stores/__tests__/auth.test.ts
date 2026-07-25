import { beforeEach, describe, expect, test, vi } from 'vitest';
import { createPinia, setActivePinia } from 'pinia';
import * as authApi from '@/api/auth';
import { refreshSession } from '@/api/http';
import { useAuthStore } from '../auth';

vi.mock('@/api/auth', () => ({
  deleteAccount: vi.fn(),
  getProfile: vi.fn(),
}));

vi.mock('@/api/http', () => ({
  refreshSession: vi.fn(),
}));

const storage = new Map<string, string>();

vi.stubGlobal('uni', {
  getStorageSync: (key: string) => storage.get(key) || '',
  setStorageSync: (key: string, value: string) => storage.set(key, value),
  removeStorageSync: (key: string) => storage.delete(key),
});

describe('auth store bootstrap', () => {
  beforeEach(() => {
    storage.clear();
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  test('refreshes before loading profile when only refresh token exists', async () => {
    storage.set('bt_refresh_token', 'refresh-only');
    vi.mocked(refreshSession).mockResolvedValue('new-access');
    vi.mocked(authApi.getProfile).mockResolvedValue({
      _id: 'u1',
      fullName: 'User',
    });

    const auth = useAuthStore();
    await auth.bootstrap();

    expect(refreshSession).toHaveBeenCalledTimes(1);
    expect(auth.user?._id).toBe('u1');
  });

  test('clears the session when refresh recovery is rejected', async () => {
    storage.set('bt_refresh_token', 'expired-refresh');
    vi.mocked(refreshSession).mockResolvedValue(null);

    const auth = useAuthStore();
    await auth.bootstrap();

    expect(auth.user).toBeNull();
    expect(storage.size).toBe(0);
  });

  test('skips network work when no token exists', async () => {
    const auth = useAuthStore();
    await auth.bootstrap();

    expect(refreshSession).not.toHaveBeenCalled();
    expect(authApi.getProfile).not.toHaveBeenCalled();
  });

  test('clearLocalSession removes tokens and user state', () => {
    storage.set('bt_access_token', 'access');
    storage.set('bt_refresh_token', 'refresh');
    const auth = useAuthStore();
    auth.user = { _id: 'u1', fullName: 'User' };

    auth.clearLocalSession();

    expect(auth.user).toBeNull();
    expect(storage.size).toBe(0);
  });

  test('deleteAccount clears the local session only after API success', async () => {
    storage.set('bt_access_token', 'access');
    storage.set('bt_refresh_token', 'refresh');
    vi.mocked(authApi.deleteAccount).mockResolvedValue(undefined);
    const auth = useAuthStore();
    auth.user = { _id: 'u1', fullName: 'User' };

    await auth.deleteAccount('correct-password');

    expect(authApi.deleteAccount).toHaveBeenCalledWith('correct-password');
    expect(auth.user).toBeNull();
    expect(storage.size).toBe(0);
  });

  test('deleteAccount preserves the session when the API rejects', async () => {
    storage.set('bt_access_token', 'access');
    storage.set('bt_refresh_token', 'refresh');
    vi.mocked(authApi.deleteAccount).mockRejectedValue(
      new Error('wrong password')
    );
    const auth = useAuthStore();
    auth.user = { _id: 'u1', fullName: 'User' };

    await expect(auth.deleteAccount('wrong-password')).rejects.toThrow(
      'wrong password'
    );

    expect(auth.user?._id).toBe('u1');
    expect(storage.get('bt_access_token')).toBe('access');
    expect(storage.get('bt_refresh_token')).toBe('refresh');
  });
});
