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
import apiClient from '../../services/api/apiClient';
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
type BiochemMetric = 'alt' | 'ast' | 'tbil' | 'alb' | 'cr' | 'bun' | 'ua' | 'k' | 'na' | 'ldh';
type Range = '1m' | '3m' | '6m' | '1y' | 'all';

const CHART_COLORS: Record<string, { border: string; bg: string }> = {
  wbc: { border: 'rgb(75, 192, 192)', bg: 'rgba(75, 192, 192, 0.1)' },
  rbc: { border: 'rgb(255, 99, 132)', bg: 'rgba(255, 99, 132, 0.1)' },
  hgb: { border: 'rgb(54, 162, 235)', bg: 'rgba(54, 162, 235, 0.1)' },
  plt: { border: 'rgb(153, 102, 255)', bg: 'rgba(153, 102, 255, 0.1)' },
  alt: { border: 'rgb(255, 159, 64)', bg: 'rgba(255, 159, 64, 0.1)' },
  ast: { border: 'rgb(255, 205, 86)', bg: 'rgba(255, 205, 86, 0.1)' },
  tbil: { border: 'rgb(201, 203, 207)', bg: 'rgba(201, 203, 207, 0.1)' },
  alb: { border: 'rgb(75, 192, 192)', bg: 'rgba(75, 192, 192, 0.1)' },
  cr: { border: 'rgb(255, 99, 132)', bg: 'rgba(255, 99, 132, 0.1)' },
  bun: { border: 'rgb(54, 162, 235)', bg: 'rgba(54, 162, 235, 0.1)' },
  ua: { border: 'rgb(153, 102, 255)', bg: 'rgba(153, 102, 255, 0.1)' },
  k: { border: 'rgb(255, 159, 64)', bg: 'rgba(255, 159, 64, 0.1)' },
  na: { border: 'rgb(255, 205, 86)', bg: 'rgba(255, 205, 86, 0.1)' },
  ldh: { border: 'rgb(201, 203, 207)', bg: 'rgba(201, 203, 207, 0.1)' },
};

// 与 BloodTestForm / contracts 中的参考范围保持一致
const NORMAL_RANGES: Record<string, { min: number; max: number }> = {
  wbc: { min: 4.0, max: 10.0 },
  rbc: { min: 3.5, max: 5.8 },
  hgb: { min: 110, max: 165 },
  plt: { min: 100, max: 300 },
  // 生化指标
  alt: { min: 7, max: 40 },
  ast: { min: 13, max: 35 },
  tbil: { min: 3.4, max: 20.5 },
  alb: { min: 35, max: 50 },
  cr: { min: 44, max: 133 },
  bun: { min: 2.9, max: 7.5 },
  ua: { min: 149, max: 416 },
  k: { min: 3.5, max: 5.5 },
  na: { min: 135, max: 145 },
  ldh: { min: 120, max: 250 },
};

const Y_AXIS: Record<string, { min: number; max: number }> = {
  wbc: { min: 0, max: 15 },
  rbc: { min: 0, max: 8 },
  hgb: { min: 0, max: 200 },
  plt: { min: 0, max: 500 },
  alt: { min: 0, max: 80 },
  ast: { min: 0, max: 80 },
  tbil: { min: 0, max: 40 },
  alb: { min: 0, max: 60 },
  cr: { min: 0, max: 200 },
  bun: { min: 0, max: 15 },
  ua: { min: 0, max: 500 },
  k: { min: 0, max: 8 },
  na: { min: 120, max: 160 },
  ldh: { min: 0, max: 400 },
};

const RANGE_KEYS: Range[] = ['1m', '3m', '6m', '1y', 'all'];
const METRIC_KEYS: Metric[] = ['wbc', 'rbc', 'hgb', 'plt'];
const BIOCHEM_METRIC_KEYS: BiochemMetric[] = ['alt', 'ast', 'tbil', 'alb', 'cr', 'bun', 'ua', 'k', 'na', 'ldh'];

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
  const [biochemTrends, setBiochemTrends] = useState<Record<string, unknown>[]>([]);
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [cycles, setCycles] = useState<ChemoCycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeMetric, setActiveMetric] = useState<string>('wbc');
  const [range, setRange] = useState<Range>('3m');
  const [panel, setPanel] = useState<'blood' | 'biochem'>('blood');
  const chartRef = useRef<ChartJS<'line'> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setIsLoading(true);
      setError('');
      try {
        const urls = [
          analyticsService.getTrends(range),
          analyticsService.getSummary(),
          chemoCycleService.getChemoCycles(1, 100).catch(() => null),
        ] as const;
        const [trendsRes, summaryRes, cyclesRes] = await Promise.all(urls);
        if (cancelled) return;
        if (trendsRes.success) setTrends(trendsRes.data);
        if (summaryRes.success) setSummary(summaryRes.data);
        if (cyclesRes && cyclesRes.success) setCycles(cyclesRes.data);

        // 同时拉取生化趋势（不阻塞主数据）
        apiClient.get<{ success: boolean; data: Record<string, unknown>[] }>(
          `/analytics/biochem-trends?range=${range}`
        ).then(res => {
          if (!cancelled && res.success) setBiochemTrends(res.data || []);
        }).catch(() => {});
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
    const isBiochem = panel === 'biochem';
    const dataSource = isBiochem ? biochemTrends : trends;
    const labels = dataSource.map((tp: any) => tp.date);
    const values = dataSource.map((tp: any) => (tp[m] !== undefined && tp[m] !== null) ? tp[m] : null);

    const pointColors = dataSource.map((tp: any) => {
      const v = tp[m];
      if (v === undefined || v === null) return 'rgba(200,200,200,0.3)';
      const r = NORMAL_RANGES[m];
      if (r && (v < r.min || v > r.max)) return '#d0021b';
      return (CHART_COLORS[m] || { border: 'rgb(75,192,192)' }).border;
    });

    const pointRadii = dataSource.map((tp: any) => {
      const v = tp[m];
      if (v === undefined || v === null) return 0;
      const r = NORMAL_RANGES[m];
      if (r && (v < r.min || v > r.max)) return 7;
      return 4;
    });

    return {
      labels,
      datasets: [
        {
          label: m.toUpperCase(),
          data: values,
          borderColor: (CHART_COLORS[m] || { border: 'rgb(75,192,192)' }).border,
          backgroundColor: (CHART_COLORS[m] || { bg: 'rgba(75,192,192,0.1)' }).bg,
          tension: 0.3,
          pointRadius: pointRadii,
          pointStyle: 'circle',
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
  }, [trends, biochemTrends, activeMetric, cycles, panel]);

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
    [activeMetric, cycles, trends, panel]
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

      <div className="metric-tabs" style={{ marginBottom: '0.5rem' }}>
        <button
          className={`metric-tab ${panel === 'blood' ? 'active' : ''}`}
          onClick={() => setPanel('blood')}
        >
          {t('panelBlood')}
        </button>
        <button
          className={`metric-tab ${panel === 'biochem' ? 'active' : ''}`}
          onClick={() => setPanel('biochem')}
        >
          {t('panelBiochem')}
        </button>
      </div>

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

      {panel === 'blood' && trends.length === 0 ? (
        <div className="empty-state">
          <p>{t('empty')}</p>
          <p className="empty-hint">{t('emptyHint')}</p>
        </div>
      ) : panel === 'biochem' && biochemTrends.length === 0 ? (
        <div className="empty-state">
          <p>{t('empty')}</p>
          <p className="empty-hint">{t('emptyHintBiochem')}</p>
        </div>
      ) : (
        <div className="chart-section">
          <div className="metric-tabs">
            {(panel === 'blood' ? METRIC_KEYS : BIOCHEM_METRIC_KEYS).map(m => (
              <button
                key={m}
                className={`metric-tab ${activeMetric === m ? 'active' : ''}`}
                onClick={() => setActiveMetric(m)}
              >
                {m.toUpperCase()}
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
              min: NORMAL_RANGES[activeMetric]?.min ?? 0,
              max: NORMAL_RANGES[activeMetric]?.max ?? 0,
            })}
          </p>

          {panel === 'blood' && (
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
        )}
        </div>
      )}
    </div>
  );
};

export default Analytics;
