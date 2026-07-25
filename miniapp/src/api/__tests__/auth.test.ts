import { beforeEach, describe, expect, test, vi } from 'vitest';
import { http } from '@/api/http';
import { deleteAccount, logout } from '@/api/auth';

vi.mock('@/api/http', () => ({
  http: {
    post: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('auth API', () => {
  beforeEach(() => {
    vi.mocked(http.post).mockReset().mockResolvedValue({ success: true });
    vi.mocked(http.delete).mockReset().mockResolvedValue({ success: true });
  });

  test('submits the current refresh token without access-token auth', async () => {
    await logout('current-device-refresh-token');

    expect(http.post).toHaveBeenCalledWith(
      '/auth/logout',
      { refreshToken: 'current-device-refresh-token' },
      true
    );
  });

  test('submits the current password to account deletion', async () => {
    await deleteAccount('current-password');

    expect(http.delete).toHaveBeenCalledWith('/auth/account', {
      password: 'current-password',
    });
  });
});
