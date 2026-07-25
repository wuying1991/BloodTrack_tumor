export const BLOOD_NORMAL_RANGES = {
  wbc: { min: 4, max: 10 },
  rbc: { min: 3.5, max: 5.8 },
  hgb: { min: 110, max: 165 },
  plt: { min: 100, max: 300 },
  neu: { min: 1.8, max: 6.3 },
  lym: { min: 1, max: 4.8 },
  crp: { min: 0, max: 10 },
} as const;

export type BloodMetricValues = Partial<
  Record<keyof typeof BLOOD_NORMAL_RANGES, number>
>;

export function isBloodTestAbnormal(values: BloodMetricValues): boolean {
  return Object.entries(BLOOD_NORMAL_RANGES).some(([key, range]) => {
    const value = values[key as keyof BloodMetricValues];
    return value != null && (value < range.min || value > range.max);
  });
}
