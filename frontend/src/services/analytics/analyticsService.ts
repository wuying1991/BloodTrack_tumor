import apiClient from '../api/apiClient';

export interface TrendPoint {
  date: string;
  wbc: number;
  rbc: number;
  hgb: number;
  plt: number;
  neu?: number;
  lym?: number;
  isAbnormal: boolean;
}

export interface SummaryData {
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

class AnalyticsService {
  async getTrends(
    range: '1m' | '3m' | '6m' | '1y' | 'all' = 'all'
  ): Promise<{ success: boolean; data: TrendPoint[] }> {
    return apiClient.get(`/analytics/trends?range=${range}`);
  }

  async getSummary(): Promise<{ success: boolean; data: SummaryData }> {
    return apiClient.get('/analytics/summary');
  }
}

const analyticsService = new AnalyticsService();
export default analyticsService;
