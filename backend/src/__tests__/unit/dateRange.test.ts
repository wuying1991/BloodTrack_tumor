import { buildDateFilter, buildOverlapFilter } from '../../utils/dateRange';

describe('date range filters', () => {
  test('buildDateFilter creates an inclusive range', () => {
    expect(
      buildDateFilter('2026-07-01T00:00:00.000Z', '2026-07-31T23:59:59.999Z')
    ).toEqual({
      $gte: new Date('2026-07-01T00:00:00.000Z'),
      $lte: new Date('2026-07-31T23:59:59.999Z'),
    });
  });

  test('buildDateFilter returns undefined without boundaries', () => {
    expect(buildDateFilter()).toBeUndefined();
  });

  test('buildOverlapFilter finds cycles intersecting the range', () => {
    expect(
      buildOverlapFilter('2026-07-01T00:00:00.000Z', '2026-07-31T23:59:59.999Z')
    ).toEqual({
      startDate: { $lte: new Date('2026-07-31T23:59:59.999Z') },
      endDate: { $gte: new Date('2026-07-01T00:00:00.000Z') },
    });
  });
});
