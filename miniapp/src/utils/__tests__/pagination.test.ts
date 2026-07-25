import { describe, expect, test, vi } from 'vitest';
import { appendUniqueById, collectAllPages } from '../pagination';
import { createRequestEpoch } from '../requestEpoch';

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

describe('appendUniqueById', () => {
  test('keeps existing order and appends only unseen records', () => {
    expect(
      appendUniqueById(
        [{ _id: 'a', value: 1 }],
        [{ _id: 'a', value: 9 }, { _id: 'b', value: 2 }]
      )
    ).toEqual([
      { _id: 'a', value: 1 },
      { _id: 'b', value: 2 },
    ]);
  });

  test('an old append can be rejected after a replacement load begins', () => {
    const epoch = createRequestEpoch();
    epoch.begin();
    const appendGeneration = epoch.capture();
    epoch.begin();

    expect(epoch.isCurrent(appendGeneration)).toBe(false);
  });
});
