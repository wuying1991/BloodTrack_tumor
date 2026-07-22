import {
  BIOCHEM_METRICS,
  type BiochemGroup,
} from '@/constants/biochemRanges';

export type TrendPanel = 'blood' | 'liver' | 'kidney' | 'electrolyte';

export interface TrendMetricDef {
  key: string;
  /** 用户可见中文简称 */
  label: string;
  /** 专业缩写，辅助展示 */
  abbr?: string;
  unit: string;
  min: number;
  max: number;
  yMin: number;
  yMax: number;
  panel: TrendPanel;
}

function yExtent(min: number, max: number): { yMin: number; yMax: number } {
  const span = Math.max(max - min, 1);
  const yMin = Math.max(0, min - span * 0.15);
  const yMax = max + span * 0.35;
  return { yMin, yMax };
}

export const BLOOD_TREND_METRICS: TrendMetricDef[] = [
  { key: 'wbc', label: '白细胞', abbr: 'WBC', unit: '×10⁹/L', min: 4, max: 10, yMin: 0, yMax: 15, panel: 'blood' },
  { key: 'neu', label: '中性粒', abbr: 'NEU', unit: '×10⁹/L', min: 1.8, max: 6.3, yMin: 0, yMax: 10, panel: 'blood' },
  { key: 'hgb', label: '血红蛋白', abbr: 'HGB', unit: 'g/L', min: 110, max: 165, yMin: 0, yMax: 200, panel: 'blood' },
  { key: 'plt', label: '血小板', abbr: 'PLT', unit: '×10⁹/L', min: 100, max: 300, yMin: 0, yMax: 500, panel: 'blood' },
  { key: 'rbc', label: '红细胞', abbr: 'RBC', unit: '×10¹²/L', min: 3.5, max: 5.8, yMin: 0, yMax: 8, panel: 'blood' },
  { key: 'lym', label: '淋巴细胞', abbr: 'LYM', unit: '×10⁹/L', min: 1, max: 4.8, yMin: 0, yMax: 8, panel: 'blood' },
  { key: 'crp', label: 'C反应蛋白', abbr: 'CRP', unit: 'mg/L', min: 0, max: 10, yMin: 0, yMax: 50, panel: 'blood' },
];

/** 生化分组 → 趋势面板（与录入/列表同源，保证指标齐全） */
const GROUP_TO_PANEL: Record<Exclude<BiochemGroup, 'other'>, TrendPanel> = {
  liver: 'liver',
  kidney: 'kidney',
  electrolyte: 'electrolyte',
};

function biochemToTrend(
  group: Exclude<BiochemGroup, 'other'>
): TrendMetricDef[] {
  const panel = GROUP_TO_PANEL[group];
  return BIOCHEM_METRICS.filter((m) => m.group === group).map((m) => {
    const { yMin, yMax } = yExtent(m.min, m.max);
    return {
      key: m.key,
      label: m.short,
      abbr: m.label,
      unit: m.unit,
      min: m.min,
      max: m.max,
      yMin,
      yMax,
      panel,
    };
  });
}

export const LIVER_TREND_METRICS = biochemToTrend('liver');
export const KIDNEY_TREND_METRICS = biochemToTrend('kidney');
export const ELECTROLYTE_TREND_METRICS = biochemToTrend('electrolyte');

export const BIOCHEM_TREND_METRICS: TrendMetricDef[] = [
  ...LIVER_TREND_METRICS,
  ...KIDNEY_TREND_METRICS,
  ...ELECTROLYTE_TREND_METRICS,
];

export const PANEL_OPTIONS: Array<{ value: TrendPanel; label: string }> = [
  { value: 'blood', label: '血常规' },
  { value: 'liver', label: '肝功能' },
  { value: 'kidney', label: '肾功能' },
  { value: 'electrolyte', label: '电解质' },
];

export const RANGE_OPTIONS: Array<{
  value: '1m' | '3m' | '6m' | '1y' | 'all';
  label: string;
}> = [
  { value: '1m', label: '30天' },
  { value: '3m', label: '3月' },
  { value: '6m', label: '6月' },
  { value: '1y', label: '1年' },
  { value: 'all', label: '全部' },
];

export function metricsForPanel(panel: TrendPanel): TrendMetricDef[] {
  switch (panel) {
    case 'blood':
      return BLOOD_TREND_METRICS;
    case 'liver':
      return LIVER_TREND_METRICS;
    case 'kidney':
      return KIDNEY_TREND_METRICS;
    case 'electrolyte':
      return ELECTROLYTE_TREND_METRICS;
  }
}

export function defaultMetricForPanel(panel: TrendPanel): string {
  return metricsForPanel(panel)[0]?.key || 'wbc';
}

export function isBloodPanel(panel: TrendPanel): boolean {
  return panel === 'blood';
}

export function trendArrow(t?: 'up' | 'down' | 'stable'): string {
  if (t === 'up') return '↑';
  if (t === 'down') return '↓';
  return '→';
}

export const BLOOD_SHORT_LABEL: Record<string, string> = {
  wbc: '白细胞',
  rbc: '红细胞',
  hgb: '血红蛋白',
  plt: '血小板',
  neu: '中性粒',
  lym: '淋巴细胞',
};
