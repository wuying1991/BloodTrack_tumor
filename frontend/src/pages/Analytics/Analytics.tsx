import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import analyticsService, {
  TrendPoint,
  SummaryData,
} from '../../services/analytics/analyticsService';
import './Analytics.css';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const CHART_COLORS = {
  wbc: { border: 'rgb(75, 192, 192)', bg: 'rgba(75, 192, 192, 0.1)' },
  rbc: { border: 'rgb(255, 99, 132)', bg: 'rgba(255, 99, 132, 0.1)' },
  hgb: { border: 'rgb(54, 162, 235)', bg: 'rgba(54, 162, 235, 0.1)' },
  plt: { border: 'rgb(153, 102, 255)', bg: 'rgba(153, 102, 255, 0.1)' },
};

const Analytics: React.FC = () => {
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeMetric, setActiveMetric] = useState<
    'wbc' | 'rbc' | 'hgb' | 'plt'
  >('wbc');

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        const [trendsRes, summaryRes] = await Promise.all([
          analyticsService.getTrends(),
          analyticsService.getSummary(),
        ]);
        if (trendsRes.success) setTrends(trendsRes.data);
        if (summaryRes.success) setSummary(summaryRes.data);
      } catch {
        setError('加载分析数据失败');
      } finally {
        setIsLoading(false);
      }
    };
    fetchData();
  }, []);

  const makeChartData = (metric: 'wbc' | 'rbc' | 'hgb' | 'plt') => ({
    labels: trends.map(t => t.date),
    datasets: [
      {
        label: metric.toUpperCase(),
        data: trends.map(t => t[metric]),
        borderColor: CHART_COLORS[metric].border,
        backgroundColor: CHART_COLORS[metric].bg,
        tension: 0.3,
        pointRadius: 4,
        fill: true,
      },
    ],
  });

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
    },
    scales: {
      y: {
        beginAtZero: false,
        ...(activeMetric === 'wbc' && { min: 0, max: 15, suggestedMax: 12 }),
        ...(activeMetric === 'rbc' && { min: 0, max: 8, suggestedMax: 6 }),
        ...(activeMetric === 'hgb' && { min: 0, max: 200, suggestedMax: 180 }),
        ...(activeMetric === 'plt' && { min: 0, max: 500, suggestedMax: 350 }),
      },
    },
  };

  const metrics: Array<{
    key: 'wbc' | 'rbc' | 'hgb' | 'plt';
    label: string;
    unit: string;
  }> = [
    { key: 'wbc', label: '白细胞', unit: '×10⁹/L' },
    { key: 'rbc', label: '红细胞', unit: '×10¹²/L' },
    { key: 'hgb', label: '血红蛋白', unit: 'g/L' },
    { key: 'plt', label: '血小板', unit: '×10⁹/L' },
  ];

  const trendIcon = (direction: 'up' | 'down' | 'stable') => {
    if (direction === 'up') return '↑';
    if (direction === 'down') return '↓';
    return '→';
  };

  if (isLoading) {
    return (
      <div className="analytics loading">
        <div className="spinner" />
        <p>加载中...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="analytics error">
        <div className="error-message">{error}</div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <h1>数据分析</h1>

      {summary && (
        <div className="summary-grid">
          <div className="summary-card">
            <span className="summary-value">{summary.totalTests}</span>
            <span className="summary-label">总记录数</span>
          </div>
          <div className="summary-card">
            <span className="summary-value">{summary.abnormalRate}%</span>
            <span className="summary-label">异常率</span>
          </div>
          {summary.latestValues && (
            <>
              <div className="summary-card">
                <span className="summary-value">
                  {summary.latestValues.wbc.toFixed(1)}
                </span>
                <span className="summary-label">
                  最新 WBC {trendIcon(summary.trends.wbc)}
                </span>
              </div>
              <div className="summary-card">
                <span className="summary-value">
                  {summary.latestValues.hgb.toFixed(0)}
                </span>
                <span className="summary-label">
                  最新 HGB {trendIcon(summary.trends.hgb)}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      {trends.length === 0 ? (
        <div className="empty-state">
          <p>暂无数据用于分析</p>
          <p className="empty-hint">记录血常规数据后即可查看趋势图表</p>
        </div>
      ) : (
        <div className="chart-section">
          <div className="metric-tabs">
            {metrics.map(m => (
              <button
                key={m.key}
                className={`metric-tab ${
                  activeMetric === m.key ? 'active' : ''
                }`}
                onClick={() => setActiveMetric(m.key)}
              >
                {m.label} ({m.unit})
              </button>
            ))}
          </div>
          <div className="chart-container">
            <Line data={makeChartData(activeMetric)} options={chartOptions} />
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
