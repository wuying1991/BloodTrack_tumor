import { describe, expect, test } from 'vitest';
import {
  MAX_LAB_IMAGE_BYTES,
  validateLabImageSize,
} from '../labImage';

describe('validateLabImageSize', () => {
  test('accepts an image at the limit', () => {
    expect(validateLabImageSize(MAX_LAB_IMAGE_BYTES)).toBe(true);
  });

  test('rejects an image over the limit', () => {
    expect(validateLabImageSize(MAX_LAB_IMAGE_BYTES + 1)).toBe(false);
  });

  test('allows unknown size for server-side fallback validation', () => {
    expect(validateLabImageSize(undefined)).toBe(true);
  });
});
