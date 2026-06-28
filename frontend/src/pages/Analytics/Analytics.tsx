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

const RANGES: Array<{ key: Range; label: string }> = [
  { key: '1m', label: '近 1 月' },
  { key: '3m', label: '近 3 月' },
  { key: '6m', label: '近 6 月' },
  { key: '1y', label: '近 1 年' },
  { key: 'all', label: '全部' },
];

const METRICS: Array<{ key: Metric; label: string; unit: string }> = [
  { key: 'wbc', label: '白细胞', unit: '×10⁹/L' },
  { key: 'rbc', label: '红细胞', unit: '×10¹²/L' },
  { key: 'hgb', label: '血红蛋白', unit: 'g/L' },
  { key: 'plt', label: '血小板', unit: '×10⁹/L' },
];

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
        if (!cancelled) setError('加载分析数据失败');
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    fetchData();
    return () => {
      cancelled = true;
    };
  }, [range]);

  // 用 useMemo 避免每次渲染都重算（趋势点多时差距明显）
  const chartData = useMemo(() => {
    const m = activeMetric;
    const range = NORMAL_RANGES[m];
    const labels = trends.map(t => t.date);
    const values = trends.map(t => t[m]);

    const nadirStates = trends.map(t => isDateInNadirWindow(t.date, cycles));

    // 异常点高亮（红色），Nadir 低谷期点高亮（橙色）
    const pointColors = trends.map((t, idx) => {
      const v = t[m];
      const r = NORMAL_RANGES[m];
      if (v < r.min || v > r.max) return '#d0021b';
      if (nadirStates[idx].inNadir) return '#f5a623';
      return CHART_COLORS[m].border;
    });

    const pointRadii = trends.map((t, idx) => {
      const v = t[m];
      const r = NORMAL_RANGES[m];
      if (v < r.min || v > r.max) return 7;
      if (nadirStates[idx].inNadir) return 7;
      return 4;
    });

    const pointStyles = trends.map((t, idx) => {
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
        // 正常上下限参考线 —— 用恒定值的两条 dataset 模拟，无需 annotation 插件
        {
          label: '正常上限',
          data: labels.map(() => range.max),
          borderColor: 'rgba(208, 2, 27, 0.6)',
          borderDash: [6, 4],
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
          order: 2,
        },
        {
          label: '正常下限',
          data: labels.map(() => range.min),
          borderColor: 'rgba(208, 2, 27, 0.6)',
          borderDash: [6, 4],
          borderWidth: 1,
          pointRadius: 0,
          fill: false,
          order: 3,
        },
      ],
    };
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

              const flag = v < r.min ? '（低）' : v > r.max ? '（高）' : '';
              let label = `${ctx.dataset.label}: ${v}${flag}`;
              if (nadirInfo && nadirInfo.inNadir) {
                label += ` [⚠️ Nadir期 Day ${nadirInfo.dayOfCycle}]`;
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
    [activeMetric, cycles, trends]
  );

  const trendIcon = (direction: 'up' | 'down' | 'stable') => {
    if (direction === 'up') return '↑';
    if (direction === 'down') return '↓';
    return '→';
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

      <div className="range-bar">
        <span className="range-label">时间范围：</span>
        {RANGES.map(r => (
          <button
            key={r.key}
            className={`range-chip ${range === r.key ? 'active' : ''}`}
            onClick={() => setRange(r.key)}
          >
            {r.label}
          </button>
        ))}
        <button
          className="export-btn"
          onClick={handleExportPng}
          disabled={trends.length === 0}
          title="将当前图表导出为 PNG"
        >
          📷 导出图表
        </button>
      </div>

      {trends.length === 0 ? (
        <div className="empty-state">
          <p>所选时间范围内暂无数据</p>
          <p className="empty-hint">
            请尝试切换到更长的范围，或先记录血常规数据
          </p>
        </div>
      ) : (
        <div className="chart-section">
          <div className="metric-tabs">
            {METRICS.map(m => (
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
            <Line
              ref={chartRef as never}
              data={chartData}
              options={chartOptions}
            />
          </div>
          <p className="chart-note">
            红色虚线为正常参考范围（
            {NORMAL_RANGES[activeMetric].min}–{NORMAL_RANGES[activeMetric].max}
            ），红色实心点表示该次检测超出正常范围。
          </p>

          <div className="nadir-education-card">
            <h4>💡 化疗科普：什么是骨髓抑制低谷期（Nadir 期）？</h4>
            <p>
              在化疗给药后的第 <strong>7 至 14 天</strong>{' '}
              左右，化疗药物对骨髓造血功能的抑制作用达到顶峰，导致血液中的白细胞、中性粒细胞和血小板数量降至最低谷。这一时期在医学上被称为{' '}
              <strong>Nadir 期（低谷期）</strong>。
            </p>
            <div className="nadir-warning-tips">
              <h5>🚨 此时您需要特别注意：</h5>
              <ul>
                <li>
                  <strong>防感染</strong>
                  ：免疫力极度脆弱。外出必戴口罩，避免前往人群密集场所，不接触有感冒症状的人。
                </li>
                <li>
                  <strong>防出血</strong>
                  ：若血小板偏低，请使用软毛牙刷，避免外伤和磕碰，谨防皮肤淤斑或牙龈出血。
                </li>
                <li>
                  <strong>安全饮食</strong>
                  ：禁食生冷食物、剩饭菜以及未剥皮水果，餐具可用开水煮沸消毒。
                </li>
                <li>
                  <strong>异常发热</strong>：若腋下体温超过{' '}
                  <strong>38.0℃</strong>{' '}
                  或有寒战，请立即前往医院急诊就医，切勿自行服药拖延。
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
