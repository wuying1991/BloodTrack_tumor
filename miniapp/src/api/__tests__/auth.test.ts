import { beforeEach, describe, expect, test, vi } from 'vitest';
import { http } from '@/api/http';
import { logout } from '@/api/auth';

vi.mock('@/api/http', () => ({
  http: {
    post: vi.fn(),
  },
}));

describe('auth API logout', () => {
  beforeEach(() => {
    vi.mocked(http.post).mockReset().mockResolvedValue({ success: true });
  });

  test('submits the current refresh token without access-token auth', async () => {
    await logout('current-device-refresh-token');

    expect(http.post).toHaveBeenCalledWith(
      '/auth/logout',
      { refreshToken: 'current-device-refresh-token' },
      true
    );
  });
});
