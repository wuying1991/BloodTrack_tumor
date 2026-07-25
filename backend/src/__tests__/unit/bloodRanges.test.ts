import { isBloodTestAbnormal } from '../../constants/bloodRanges';

const normal = {
  wbc: 5,
  rbc: 4.5,
  hgb: 130,
  plt: 180,
  neu: 3,
  lym: 2,
  crp: 2,
};

describe('isBloodTestAbnormal', () => {
  test.each([
    ['NEU low', { neu: 1.7 }],
    ['NEU high', { neu: 6.4 }],
    ['LYM low', { lym: 0.9 }],
    ['LYM high', { lym: 4.9 }],
  ])('%s marks the record abnormal', (_label, override) => {
    expect(isBloodTestAbnormal({ ...normal, ...override })).toBe(true);
  });

  test('optional NEU/LYM are ignored when absent', () => {
    const { neu: _neu, lym: _lym, ...withoutOptional } = normal;
    expect(isBloodTestAbnormal(withoutOptional)).toBe(false);
  });

  test('inclusive boundaries remain normal', () => {
    expect(isBloodTestAbnormal({ ...normal, neu: 1.8, lym: 4.8 })).toBe(false);
  });
});
