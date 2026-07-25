import { describe, expect, test } from 'vitest';
import { createRequestEpoch } from '../requestEpoch';

describe('createRequestEpoch', () => {
  test('a newer replacement invalidates an older request', () => {
    const epoch = createRequestEpoch();
    const first = epoch.begin();
    const second = epoch.begin();

    expect(epoch.isCurrent(first)).toBe(false);
    expect(epoch.isCurrent(second)).toBe(true);
  });

  test('capture shares the current generation with load-more work', () => {
    const epoch = createRequestEpoch();
    const replacement = epoch.begin();

    expect(epoch.capture()).toBe(replacement);
    expect(epoch.isCurrent(epoch.capture())).toBe(true);
  });

  test('invalidate prevents page-destroyed work from committing', () => {
    const epoch = createRequestEpoch();
    const request = epoch.begin();

    epoch.invalidate();

    expect(epoch.isCurrent(request)).toBe(false);
  });

  test('only the newest out-of-order response is eligible to commit', async () => {
    const epoch = createRequestEpoch();
    const committed: string[] = [];
    let resolveOld!: (value: string) => void;
    let resolveNew!: (value: string) => void;

    const run = async (promise: Promise<string>) => {
      const request = epoch.begin();
      const value = await promise;
      if (epoch.isCurrent(request)) committed.push(value);
    };

    const oldWork = run(
      new Promise((resolve) => {
        resolveOld = resolve;
      })
    );
    const newWork = run(
      new Promise((resolve) => {
        resolveNew = resolve;
      })
    );
    resolveNew('new');
    await newWork;
    resolveOld('old');
    await oldWork;

    expect(committed).toEqual(['new']);
  });
});
