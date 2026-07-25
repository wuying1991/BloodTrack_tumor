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
});
