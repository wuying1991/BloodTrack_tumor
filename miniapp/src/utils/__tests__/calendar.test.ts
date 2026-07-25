import { describe, expect, test } from 'vitest';
import { monthIsoRange } from '../calendar';

describe('monthIsoRange', () => {
  test('covers leap-year February in local time', () => {
    const range = monthIsoRange(2028, 1);
    const start = new Date(range.startDate);
    const end = new Date(range.endDate);

    expect(start.getFullYear()).toBe(2028);
    expect(start.getMonth()).toBe(1);
    expect(start.getDate()).toBe(1);
    expect(end.getFullYear()).toBe(2028);
    expect(end.getMonth()).toBe(1);
    expect(end.getDate()).toBe(29);
    expect(end.getHours()).toBe(23);
    expect(end.getMilliseconds()).toBe(999);
  });
});
