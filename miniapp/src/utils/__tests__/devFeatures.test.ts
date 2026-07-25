import { describe, expect, test } from 'vitest';
import { devOnlyValue, isDevFeatureEnabled } from '../devFeatures';

describe('development-only features', () => {
  test('production discards a server-returned development code', () => {
    expect(devOnlyValue('123456', false)).toBe('');
  });

  test('development keeps a returned development code', () => {
    expect(devOnlyValue('123456', true)).toBe('123456');
  });

  test('Mock demo is disabled in production', () => {
    expect(isDevFeatureEnabled(false)).toBe(false);
    expect(isDevFeatureEnabled(true)).toBe(true);
  });
});
