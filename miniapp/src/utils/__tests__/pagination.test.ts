import { describe, expect, test, vi } from 'vitest';
import { collectAllPages } from '../pagination';

describe('collectAllPages', () => {
  test('concatenates every server page', async () => {
    const fetcher = vi.fn(async (page: number) => ({
      success: true,
      data: page === 1 ? ['a'] : ['b'],
      pagination: { page, pages: 2, limit: 100, total: 2 },
    }));

    await expect(collectAllPages(fetcher)).resolves.toEqual(['a', 'b']);
    expect(fetcher).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenNthCalledWith(1, 1);
    expect(fetcher).toHaveBeenNthCalledWith(2, 2);
  });

  test('stops after a single page', async () => {
    const fetcher = vi.fn(async (page: number) => ({
      success: true,
      data: ['only'],
      pagination: { page, pages: 1, limit: 100, total: 1 },
    }));

    await expect(collectAllPages(fetcher)).resolves.toEqual(['only']);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});
