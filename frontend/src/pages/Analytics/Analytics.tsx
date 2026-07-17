import React, { useState, useEffect, useRef, useMemo } from 'react';
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
import chemoCycleService, {
  ChemoCycle,
} from '../../services/chemoCycle/chemoCycleService';
import { useT } from '../../i18n/useT';
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

type Metric = 'wbc' | 'rbc' | 'hgb' | 'plt';
type Range = '1m' | '3m' | '6m' | '1y' | 'all';

const CHART_COLORS: Record<Metric, { border: string; bg: string }> = {
  wbc: { border: 'rgb(75, 192, 192)', bg: 'rgba(75, 192, 192, 0.1)' },
  rbc: { border: 'rgb(255, 99, 132)', bg: 'rgba(255, 99, 132, 0.1)' },
  hgb: { border: 'rgb(54, 162, 235)', bg: 'rgba(54, 162, 235, 0.1)' },
  plt: { border: 'rgb(153, 102, 255)', bg: 'rgba(153, 102, 255, 0.1)' },
};

// 与 BloodTestForm / contracts 中的参考范围保持一致
const NORMAL_RANGES: Record<Metric, { min: number; max: number }> = {
  wbc: { min: 4.0, max: 10.0 },
  rbc: { min: 3.5, max: 5.8 },
  hgb: { min: 110, max: 165 },
  plt: { min: 100, max: 300 },
};

const Y_AXIS: Record<Metric, { min: number; max: number }> = {
  wbc: { min: 0, max: 15 },
  rbc: { min: 0, max: 8 },
  hgb: { min: 0, max: 200 },
  plt: { min: 0, max: 500 },
};

const RANGE_KEYS: Range[] = ['1m', '3m', '6m', '1y', 'all'];
const METRIC_KEYS: Metric[] = ['wbc', 'rbc', 'hgb', 'plt'];

function isDateInNadirWindow(
  dateStr: string,
  cycles: ChemoCycle[]
): { inNadir: boolean; dayOfCycle: number; regimenName: string } {
  const date = new Date(dateStr).getTime();
  const DAY_MS = 24 * 60 * 60 * 1000;
  for (const c of cycles) {
    const start = new Date(c.startDate).getTime();
    const diffDays = Math.floor((date - start) / DAY_MS) + 1; // 1-based day of cycle
    if (diffDays >= 7 && diffDays <= 14) {
      return {
        inNadir: true,
        dayOfCycle: diffDays,
        regimenName: c.regimenName,
      };
    }
  }
  return { inNadir: false, dayOfCycle: -1, regimenName: '' };
}

const Analytics: React.FC = () => {
  const t = useT('analytics');
  const [trends, setTrends] = useState<TrendPoint[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [cycles, setCycles] = useState<ChemoCycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeMetric, setActiveMetric] = useState<Metric>('wbc');
  const [range, setRange] = useState<Range>('3m');
  const chartRef = useRef<ChartJS<'line'> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setIsLoading(true);
      setError('');
      try {
        const [trendsRes, summaryRes, cyclesRes] = await Promise.all([
          analyticsService.getTrends(range),
          analyticsService.getSummary(),
          chemoCycleService.getChemoCycles(1, 100).catch(() => null),
        ]);
        if (cancelled) return;
        if (trendsRes.success) setTrends(trendsRes.data);
        if (summaryRes.success) setSummary(summaryRes.data);
        if (cyclesRes && cyclesRes.success) setCycles(cyclesRes.data);
      } catch {
        if (!cancelled) setError(t('loadFailed'));
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [range]);

  // 用 useMemo 避免每次渲染都重算（趋势点多时差距明显）
  const chartData = useMemo(() => {
    const m = activeMetric;
    const rangeNormal = NORMAL_RANGES[m];
    const labels = trends.map(tp => tp.date);
    const values = trends.map(tp => tp[m]);

    const nadirStates = trends.map(tp => isDateInNadirWindow(tp.date, cycles));

    // 异常点高亮（红色），Nadir 低谷期点高亮（橙色）
    const pointColors = trends.map((tp, idx) => {
      const v = tp[m];
      const r = NORMAL_RANGES[m];
      if (v < r.min || v > r.max) return '#d0021b';
      if (nadirStates[idx].inNadir) return '#f5a623';
      return CHART_COLORS[m].border;
    });

    const pointRadii = trends.map((tp, idx) => {
      const v = tp[m];
      const r = NORMAL_RANGES[m];
      if (v < r.min || v > r.max) return 7;
      if (nadirStates[idx].inNadir) return 7;
      return 4;
    });

    const pointStyles = trends.map((tp, idx) => {
      return nadirStates[idx].inNadir ? 'rectRot' : 'circle';
    });

    return {
      labels,
      datasets: [
        {
          label: m.toUpperCase(),
          data: values,
          borderColor: CHART_COLORS[m].border,
          backgroundColor: CHART_COLORS[m].bg,
          tension: 0.3,
          pointRadius: pointRadii,
          pointStyle: pointStyles,
          pointBackgroundColor: pointColors,
          pointBorderColor: pointColors,
          fill: true,
          order: 1,
        },
        // 正常上下限参考线 -- 用恒定值的两条 dataset 模拟，无需 annotation 插件
        {
          label: t('normalUpper'),
          data: labels.map(() => rangeNormal.max),
          borderColor: 'rgba(208, 2, 27, 0.6)',
          borderDash: [6, 4],
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
          order: 2,
        },
        {
          label: t('normalLower'),
          data: labels.map(() => rangeNormal.min),
          borderColor: 'rgba(208, 2, 27, 0.6)',
          borderDash: [6, 4],
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
          order: 3,
        },
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trends, activeMetric, cycles]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: true, position: 'bottom' as const },
        tooltip: {
          callbacks: {
            label: (ctx: {
              dataset: { label?: string };
              parsed: { y: number };
              dataIndex: number;
            }) => {
              const r = NORMAL_RANGES[activeMetric];
              const v = ctx.parsed.y;
              const idx = ctx.dataIndex;
              const date = trends[idx]?.date;
              const nadirInfo = date ? isDateInNadirWindow(date, cycles) : null;

              const flag =
                v < r.min ? t('tooltipLow') : v > r.max ? t('tooltipHigh') : '';
              let label = `${ctx.dataset.label}: ${v}${flag}`;
              if (nadirInfo && nadirInfo.inNadir) {
                label += t('nadirTooltip', { day: nadirInfo.dayOfCycle });
              }
              return label;
            },
          },
        },
      },
      scales: {
        y: {
          beginAtZero: false,
          min: Y_AXIS[activeMetric].min,
          max: Y_AXIS[activeMetric].max,
        },
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activeMetric, cycles, trends]
  );

  const trendIcon = (direction: 'up' | 'down' | 'stable') => {
    if (direction === 'up') return '↑';
    if (direction === 'down') return '↓';
    return '->';
  };

  const handleExportPng = () => {
    const chart = chartRef.current;
    if (!chart) return;
    const url = chart.toBase64Image('image/png', 1);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${activeMetric}-trend-${
      new Date().toISOString().split('T')[0]
    }.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (isLoading) {
    return (
      <div className="analytics loading">
        <div className="spinner" />
        <p>{t('loading')}</p>
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
      <h1>{t('title')}</h1>

      {summary && (
        <div className="summary-grid">
          <div className="summary-card">
            <span className="summary-value">{summary.totalTests}</span>
            <span className="summary-label">{t('statTotal')}</span>
          </div>
          <div className="summary-card">
            <span className="summary-value">{summary.abnormalRate}%</span>
            <span className="summary-label">{t('statAbnormalRate')}</span>
          </div>
          {summary.latestValues && (
            <>
              <div className="summary-card">
                <span className="summary-value">
                  {summary.latestValues.wbc.toFixed(1)}
                </span>
                <span className="summary-label">
                  {t('latestWbc')} {trendIcon(summary.trends.wbc)}
                </span>
              </div>
              <div className="summary-card">
                <span className="summary-value">
                  {summary.latestValues.hgb.toFixed(0)}
                </span>
                <span className="summary-label">
                  {t('latestHgb')} {trendIcon(summary.trends.hgb)}
                </span>
              </div>
            </>
          )}
        </div>
      )}

      <div className="range-bar">
        <span className="range-label">{t('rangeLabel')}</span>
        {RANGE_KEYS.map(r => (
          <button
            key={r}
            className={`range-chip ${range === r ? 'active' : ''}`}
            onClick={() => setRange(r)}
          >
            {t(`range.${r}`)}
          </button>
        ))}
        <button
          className="export-btn"
          onClick={handleExportPng}
          disabled={trends.length === 0}
          title={t('exportTitle')}
        >
          {t('exportChart')}
        </button>
      </div>

      {trends.length === 0 ? (
        <div className="empty-state">
          <p>{t('empty')}</p>
          <p className="empty-hint">{t('emptyHint')}</p>
        </div>
      ) : (
        <div className="chart-section">
          <div className="metric-tabs">
            {METRIC_KEYS.map(m => (
              <button
                key={m}
                className={`metric-tab ${activeMetric === m ? 'active' : ''}`}
                onClick={() => setActiveMetric(m)}
              >
                {t(`metric.${m}`)} ({t(`metricUnit.${m}`)})
              </button>
            ))}
          </div>
          <div className="chart-container">
            <Line
              ref={chartRef as never}
              data={chartData}
              options={chartOptions}
            />
          </div>
          <p className="chart-note">
            {t('chartNote', {
              min: NORMAL_RANGES[activeMetric].min,
              max: NORMAL_RANGES[activeMetric].max,
            })}
          </p>

          <div className="nadir-education-card">
            <h4>{t('nadirTitle')}</h4>
            <p>
              {t('nadirDesc1')}
              <strong>{t('nadirDays')}</strong>
              {t('nadirDesc2')}
              <strong>{t('nadirPeriod')}</strong>
              {t('nadirDesc3')}
            </p>
            <div className="nadir-warning-tips">
              <h5>{t('nadirTipsTitle')}</h5>
              <ul>
                <li>
                  <strong>{t('tipInfectionLabel')}</strong>
                  {t('tipInfectionBody')}
                </li>
                <li>
                  <strong>{t('tipBleedingLabel')}</strong>
                  {t('tipBleedingBody')}
                </li>
                <li>
                  <strong>{t('tipDietLabel')}</strong>
                  {t('tipDietBody')}
                </li>
                <li>
                  <strong>{t('tipFeverLabel')}</strong>
                  {t('tipFeverBody1')}
                  <strong>{t('tipFeverTemp')}</strong>
                  {t('tipFeverBody2')}
                </li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Analytics;
