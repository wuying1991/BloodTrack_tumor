export interface MetricRange {
  key: 'wbc' | 'rbc' | 'hgb' | 'plt' | 'neu' | 'lym' | 'crp';
  label: string;
  short: string;
  unit: string;
  min: number;
  max: number;
  /** Shown on the first form screen (not under “更多”). */
  primary: boolean;
  required: boolean;
}

/**
 * 默认展示：白细胞、中性粒、血红蛋白、血小板、红细胞、淋巴细胞
 * 可选添加：C反应蛋白 (CRP)
 */
export const BLOOD_METRICS: MetricRange[] = [
  {
    key: 'wbc',
    label: 'WBC',
    short: '白细胞',
    unit: '×10⁹/L',
    min: 4.0,
    max: 10.0,
    primary: true,
    required: true,
  },
  {
    key: 'neu',
    label: 'NEU',
    short: '中性粒',
    unit: '×10⁹/L',
    min: 1.8,
    max: 6.3,
    primary: true,
    required: false,
  },
  {
    key: 'hgb',
    label: 'HGB',
    short: '血红蛋白',
    unit: 'g/L',
    min: 110,
    max: 165,
    primary: true,
    required: true,
  },
  {
    key: 'plt',
    label: 'PLT',
    short: '血小板',
    unit: '×10⁹/L',
    min: 100,
    max: 300,
    primary: true,
    required: true,
  },
  {
    key: 'rbc',
    label: 'RBC',
    short: '红细胞',
    unit: '×10¹²/L',
    min: 3.5,
    max: 5.8,
    primary: true,
    required: true,
  },
  {
    key: 'lym',
    label: 'LYM',
    short: '淋巴细胞',
    unit: '×10⁹/L',
    min: 1.0,
    max: 4.8,
    primary: true,
    required: false,
  },
  {
    key: 'crp',
    label: 'CRP',
    short: 'C反应蛋白',
    unit: 'mg/L',
    min: 0,
    max: 10,
    primary: false,
    required: false,
  },
];

export type MetricStatus = 'empty' | 'low' | 'normal' | 'high';

export function getMetricStatus(
  key: MetricRange['key'],
  raw: string | number | undefined | null
): MetricStatus {
  if (raw === undefined || raw === null || raw === '') return 'empty';
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (Number.isNaN(n)) return 'empty';
  const range = BLOOD_METRICS.find((m) => m.key === key);
  if (!range) return 'empty';
  if (n < range.min) return 'low';
  if (n > range.max) return 'high';
  return 'normal';
}

export function statusLabel(status: MetricStatus): string {
  switch (status) {
    case 'low':
      return '偏低';
    case 'high':
      return '偏高';
    case 'normal':
      return '正常';
    default:
      return '';
  }
}
