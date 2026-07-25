import { beforeEach, describe, expect, test, vi } from 'vitest';
import { refreshSession } from '@/api/http';

const storage = new Map<string, string>();
const requestMock = vi.fn();

vi.stubGlobal('uni', {
  getStorageSync: (key: string) => storage.get(key) || '',
  setStorageSync: (key: string, value: string) => storage.set(key, value),
  removeStorageSync: (key: string) => storage.delete(key),
  request: (options: unknown) => requestMock(options),
});

describe('refreshSession', () => {
  beforeEach(() => {
    storage.clear();
    storage.set('bt_refresh_token', 'refresh-token');
    requestMock.mockReset();
  });

  test('shares one refresh request across concurrent callers', async () => {
    let succeed!: (response: unknown) => void;
    requestMock.mockImplementation((options: { success: typeof succeed }) => {
      succeed = options.success;
    });

    const first = refreshSession();
    const second = refreshSession();
    expect(requestMock).toHaveBeenCalledTimes(1);

    succeed({
      statusCode: 200,
      data: {
        success: true,
        data: {
          accessToken: 'new-access',
          refreshToken: 'new-refresh',
        },
      },
    });

    await expect(Promise.all([first, second])).resolves.toEqual([
      'new-access',
      'new-access',
    ]);
    expect(storage.get('bt_access_token')).toBe('new-access');
    expect(storage.get('bt_refresh_token')).toBe('new-refresh');
  });
});
