import type { BiochemKey } from '@/types/biochem';

export type BiochemGroup = 'liver' | 'kidney' | 'electrolyte' | 'other';

export interface BiochemMetric {
  key: BiochemKey;
  short: string;
  label: string;
  unit: string;
  min: number;
  max: number;
  group: BiochemGroup;
}

/** 展示用中文简称（用户优先看到 short） */
export const BIOCHEM_METRICS: BiochemMetric[] = [
  { key: 'alt', short: '谷丙转氨酶', label: 'ALT', unit: 'U/L', min: 7, max: 40, group: 'liver' },
  { key: 'ast', short: '谷草转氨酶', label: 'AST', unit: 'U/L', min: 13, max: 35, group: 'liver' },
  { key: 'tbil', short: '总胆红素', label: 'TBIL', unit: 'μmol/L', min: 3.4, max: 20.5, group: 'liver' },
  { key: 'alb', short: '白蛋白', label: 'ALB', unit: 'g/L', min: 35, max: 50, group: 'liver' },
  { key: 'ahr', short: '谷草/谷丙', label: 'AHR', unit: '', min: 0.5, max: 2.0, group: 'liver' },
  { key: 'dbil', short: '直接胆红素', label: 'DBIL', unit: 'μmol/L', min: 0, max: 6.8, group: 'liver' },
  { key: 'ibil', short: '间接胆红素', label: 'IBIL', unit: 'μmol/L', min: 1.7, max: 13.7, group: 'liver' },
  { key: 'tp', short: '总蛋白', label: 'TP', unit: 'g/L', min: 65, max: 85, group: 'liver' },
  { key: 'glo', short: '球蛋白', label: 'GLO', unit: 'g/L', min: 20, max: 40, group: 'liver' },
  { key: 'ag', short: '白球比', label: 'A/G', unit: '', min: 1.2, max: 2.0, group: 'liver' },
  { key: 'ggt', short: 'γ-谷氨酰转肽酶', label: 'GGT', unit: 'U/L', min: 7, max: 45, group: 'liver' },
  { key: 'alp', short: '碱性磷酸酶', label: 'ALP', unit: 'U/L', min: 40, max: 150, group: 'liver' },
  { key: 'che', short: '胆碱酯酶', label: 'CHE', unit: 'U/L', min: 4000, max: 12000, group: 'liver' },
  { key: 'tba', short: '总胆汁酸', label: 'TBA', unit: 'μmol/L', min: 0, max: 10, group: 'liver' },
  { key: 'pa', short: '前白蛋白', label: 'PA', unit: 'mg/L', min: 200, max: 400, group: 'liver' },
  // 乳酸脱氢酶常归入肝/综合肝酶相关，与参考小程序一致放在肝功能
  { key: 'ldh', short: '乳酸脱氢酶', label: 'LDH', unit: 'U/L', min: 120, max: 250, group: 'liver' },
  { key: 'bun', short: '尿素氮', label: 'BUN', unit: 'mmol/L', min: 2.9, max: 7.5, group: 'kidney' },
  { key: 'cr', short: '肌酐', label: 'Cr', unit: 'μmol/L', min: 44, max: 133, group: 'kidney' },
  { key: 'ua', short: '尿酸', label: 'UA', unit: 'μmol/L', min: 149, max: 416, group: 'kidney' },
  { key: 'egfr', short: '肾小球滤过率', label: 'eGFR', unit: 'mL/min', min: 90, max: 999, group: 'kidney' },
  { key: 'k', short: '血钾', label: 'K', unit: 'mmol/L', min: 3.5, max: 5.5, group: 'electrolyte' },
  { key: 'na', short: '血钠', label: 'Na', unit: 'mmol/L', min: 135, max: 145, group: 'electrolyte' },
  { key: 'cl', short: '血氯', label: 'Cl', unit: 'mmol/L', min: 95, max: 105, group: 'electrolyte' },
  { key: 'ca', short: '血钙', label: 'Ca', unit: 'mmol/L', min: 2.1, max: 2.6, group: 'electrolyte' },
  { key: 'p', short: '血磷', label: 'P', unit: 'mmol/L', min: 0.8, max: 1.6, group: 'electrolyte' },
];

export const GROUP_LABELS: Record<BiochemGroup, string> = {
  liver: '肝功能',
  kidney: '肾功能',
  electrolyte: '电解质',
  other: '其他',
};

/** 录入与趋势只展示三类；other 保留类型兼容，当前无独立指标 */
export const GROUP_ORDER: BiochemGroup[] = [
  'liver',
  'kidney',
  'electrolyte',
];

/** 列表摘要用的关键指标 */
export const LIST_SUMMARY_KEYS: BiochemKey[] = [
  'alt',
  'ast',
  'cr',
  'bun',
  'k',
];

export type MetricStatus = 'empty' | 'low' | 'normal' | 'high';

export function getBiochemStatus(
  key: BiochemKey,
  raw: string | number | undefined | null
): MetricStatus {
  if (raw === undefined || raw === null || raw === '') return 'empty';
  const n = typeof raw === 'number' ? raw : Number(raw);
  if (Number.isNaN(n)) return 'empty';
  const range = BIOCHEM_METRICS.find((m) => m.key === key);
  if (!range) return 'empty';
  if (n < range.min) return 'low';
  if (n > range.max) return 'high';
  return 'normal';
}

export function statusLabel(s: MetricStatus): string {
  if (s === 'low') return '偏低';
  if (s === 'high') return '偏高';
  if (s === 'normal') return '正常';
  return '';
}

export function metricsByGroup(group: BiochemGroup): BiochemMetric[] {
  return BIOCHEM_METRICS.filter((m) => m.group === group);
}
