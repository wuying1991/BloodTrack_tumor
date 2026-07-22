import { http } from '@/api/http';

export type AnalyticsRange = '1m' | '3m' | '6m' | '1y' | 'all';

export interface BloodTrendPoint {
  date: string;
  wbc: number;
  rbc: number;
  hgb: number;
  plt: number;
  neu?: number;
  lym?: number;
  crp?: number;
  isAbnormal: boolean;
}

export interface BiochemTrendPoint {
  date: string;
  alt?: number;
  ast?: number;
  ahr?: number;
  tbil?: number;
  dbil?: number;
  ibil?: number;
  tp?: number;
  alb?: number;
  glo?: number;
  ag?: number;
  ggt?: number;
  alp?: number;
  che?: number;
  tba?: number;
  pa?: number;
  bun?: number;
  cr?: number;
  ua?: number;
  egfr?: number;
  k?: number;
  na?: number;
  cl?: number;
  ca?: number;
  p?: number;
  ldh?: number;
  isAbnormal?: boolean;
}

export interface AnalyticsSummary {
  totalTests: number;
  abnormalRate: number;
  latestValues: {
    date: string;
    wbc: number;
    rbc: number;
    hgb: number;
    plt: number;
    neu?: number;
    lym?: number;
  } | null;
  trends: {
    wbc: 'up' | 'down' | 'stable';
    rbc: 'up' | 'down' | 'stable';
    hgb: 'up' | 'down' | 'stable';
    plt: 'up' | 'down' | 'stable';
  };
}

export async function getBloodTrends(
  range: AnalyticsRange = '3m'
): Promise<BloodTrendPoint[]> {
  const res = await http.get<{ success: boolean; data: BloodTrendPoint[] }>(
    '/analytics/trends',
    { range }
  );
  return res.data || [];
}

export async function getBiochemTrends(
  range: AnalyticsRange = '3m'
): Promise<BiochemTrendPoint[]> {
  const res = await http.get<{ success: boolean; data: BiochemTrendPoint[] }>(
    '/analytics/biochem-trends',
    { range }
  );
  return res.data || [];
}

export async function getAnalyticsSummary(): Promise<AnalyticsSummary> {
  const res = await http.get<{ success: boolean; data: AnalyticsSummary }>(
    '/analytics/summary'
  );
  return res.data;
}
