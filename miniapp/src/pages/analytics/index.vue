<template>
  <view class="page">
    <!-- 大类：血常规 / 肝 / 肾 / 电解质 -->
    <scroll-view scroll-x class="panel-scroll" :show-scrollbar="false">
      <view class="panel-row">
        <text
          v-for="p in PANEL_OPTIONS"
          :key="p.value"
          class="panel-tab"
          :class="{ on: panel === p.value }"
          @click="setPanel(p.value)"
        >{{ p.label }}</text>
      </view>
    </scroll-view>

    <view class="chips">
      <text
        v-for="r in RANGE_OPTIONS"
        :key="r.value"
        class="chip"
        :class="{ on: range === r.value }"
        @click="setRange(r.value)"
      >{{ r.label }}</text>
    </view>

    <view v-if="summary && panel === 'blood'" class="summary">
      <view class="s-card">
        <text class="s-num">{{ summary.totalTests }}</text>
        <text class="s-label">血检次数</text>
      </view>
      <view class="s-card">
        <text class="s-num">{{ summary.abnormalRate }}%</text>
        <text class="s-label">异常率</text>
      </view>
      <view class="s-card">
        <text class="s-num">{{ latestLabel }}</text>
        <text class="s-label">最近日期</text>
      </view>
    </view>

    <!-- 中文简称指标 -->
    <view class="metrics">
      <text
        v-for="m in metricDefs"
        :key="m.key"
        class="m-chip"
        :class="{ on: metric === m.key }"
        @click="metric = m.key"
      >
        {{ m.label }}
        <text
          v-if="panel === 'blood' && bloodTrendDir(m.key)"
          class="arrow"
        >{{ trendArrow(bloodTrendDir(m.key)) }}</text>
      </text>
    </view>

    <view class="chart-card">
      <view class="chart-head">
        <view>
          <text class="chart-title">{{ activeDef?.label }} 趋势</text>
          <text v-if="activeDef?.abbr" class="chart-abbr">{{ activeDef.abbr }}</text>
        </view>
        <text class="chart-unit">{{ activeDef?.unit }}</text>
      </view>
      <text v-if="activeDef" class="ref">
        参考范围：{{ activeDef.min }} – {{ activeDef.max }} {{ activeDef.unit }}
      </text>

      <view v-if="loading" class="state">加载中…</view>
      <view v-else-if="error" class="state bad">
        <text>{{ error }}</text>
        <text class="link" @click="load">重试</text>
      </view>
      <view v-else-if="!chartPoints.length" class="state">
        该时间范围暂无数据
        <text class="link" @click="goAdd">去加一笔</text>
      </view>
      <SimpleLineChart
        v-else
        :key="panel + metric + range + chartPoints.length"
        :canvas-id="'trend-' + panel + '-' + metric"
        :points="chartPoints"
        :ref-min="activeDef?.min"
        :ref-max="activeDef?.max"
        :y-min="activeDef?.yMin"
        :y-max="activeDef?.yMax"
        :line-color="lineColor"
        :width="chartWidth"
        :height="200"
      />

      <view v-if="chartPoints.length" class="legend">
        <text class="lg"><text class="dot line" />检测值</text>
        <text class="lg"><text class="dot band" />参考范围</text>
        <text class="lg"><text class="dot abn" />异常点</text>
      </view>
    </view>

    <view v-if="chartPoints.length" class="list-card">
      <text class="list-title">最近记录</text>
      <view v-for="(p, i) in recentPoints" :key="p.label + i" class="row">
        <text class="row-date">{{ p.label }}</text>
        <text class="row-val" :class="{ bad: p.abnormal }">{{ formatVal(p.value) }}</text>
        <text v-if="p.abnormal" class="badge">异常</text>
      </view>
    </view>

    <AppFab />
  </view>
</template>

<script setup lang="ts">
import { computed, getCurrentInstance, ref } from 'vue';
import { onLoad, onReady, onShow, onUnload } from '@dcloudio/uni-app';
import AppFab from '@/components/AppFab.vue';
import SimpleLineChart, { type ChartPoint } from '@/components/SimpleLineChart.vue';
import * as analyticsApi from '@/api/analytics';
import type {
  AnalyticsRange,
  AnalyticsSummary,
  BiochemTrendPoint,
  BloodTrendPoint,
} from '@/api/analytics';
import {
  PANEL_OPTIONS,
  RANGE_OPTIONS,
  defaultMetricForPanel,
  isBloodPanel,
  metricsForPanel,
  trendArrow,
  type TrendMetricDef,
  type TrendPanel,
} from '@/constants/trendMetrics';
import { getErrorMessage } from '@/utils/errorMessage';
import { createRequestEpoch } from '@/utils/requestEpoch';
import { getAccessToken } from '@/utils/storage';

const panel = ref<TrendPanel>('blood');
const range = ref<AnalyticsRange>('3m');
const metric = ref('wbc');
const loading = ref(false);
const error = ref('');
const bloodTrends = ref<BloodTrendPoint[]>([]);
const biochemTrends = ref<BiochemTrendPoint[]>([]);
const summary = ref<AnalyticsSummary | null>(null);
const chartWidth = ref(320);
const loadEpoch = createRequestEpoch();

const metricDefs = computed((): TrendMetricDef[] => metricsForPanel(panel.value));
const activeDef = computed(() =>
  metricDefs.value.find((m) => m.key === metric.value)
);
const lineColor = computed(() => {
  if (panel.value === 'blood') return '#2d8a6e';
  if (panel.value === 'liver') return '#8b5cf6';
  if (panel.value === 'kidney') return '#3b82f6';
  return '#f59e0b';
});

const chartPoints = computed((): ChartPoint[] => {
  const rows = isBloodPanel(panel.value)
    ? bloodTrends.value
    : biochemTrends.value;
  return rows
    .map((p) => {
      const v = (p as any)[metric.value];
      if (v == null || v === '' || Number.isNaN(Number(v))) return null;
      const num = Number(v);
      const def = activeDef.value;
      return {
        label: p.date,
        value: num,
        abnormal: def != null ? num < def.min || num > def.max : false,
      } as ChartPoint;
    })
    .filter(Boolean) as ChartPoint[];
});

const recentPoints = computed(() =>
  [...chartPoints.value].slice(-8).reverse()
);
const latestLabel = computed(() => summary.value?.latestValues?.date || '—');

function formatVal(v: number): string {
  return v >= 100 ? v.toFixed(0) : v.toFixed(1);
}

function bloodTrendDir(key: string): 'up' | 'down' | 'stable' | undefined {
  const t = summary.value?.trends as
    | Record<string, 'up' | 'down' | 'stable'>
    | undefined;
  return t?.[key];
}

function setRange(next: AnalyticsRange) {
  if (range.value === next) return;
  range.value = next;
  void load();
}

function setPanel(next: TrendPanel) {
  if (panel.value === next) return;
  panel.value = next;
  metric.value = defaultMetricForPanel(next);
  void load();
}

function goAdd() {
  uni.navigateTo({
    url: isBloodPanel(panel.value)
      ? '/pages/records/blood-form'
      : `/pages/records/biochem-form?group=${panel.value === 'blood' ? 'liver' : panel.value}`,
  });
}

async function load() {
  const request = loadEpoch.begin();
  const requestedPanel = panel.value;
  const requestedRange = range.value;
  error.value = '';
  loading.value = true;
  try {
    if (isBloodPanel(requestedPanel)) {
      const [trends, sum] = await Promise.all([
        analyticsApi.getBloodTrends(requestedRange),
        analyticsApi.getAnalyticsSummary(),
      ]);
      if (!loadEpoch.isCurrent(request)) return;
      bloodTrends.value = trends;
      summary.value = sum;
    } else {
      const trends = await analyticsApi.getBiochemTrends(requestedRange);
      if (!loadEpoch.isCurrent(request)) return;
      biochemTrends.value = trends;
    }
  } catch (err) {
    if (loadEpoch.isCurrent(request)) {
      error.value = getErrorMessage(err, '加载趋势失败');
    }
  } finally {
    if (loadEpoch.isCurrent(request)) loading.value = false;
  }
}

onLoad((query) => {
  applyPanelFromQuery(query?.panel as string);
});

onShow(() => {
  if (!getAccessToken()) {
    uni.reLaunch({ url: '/pages/auth/login' });
    return;
  }
  // switchTab 无法带参：首页通过 storage 指定分类
  try {
    const cached = uni.getStorageSync('bt_trend_panel') as string;
    if (cached) {
      applyPanelFromQuery(cached);
      uni.removeStorageSync('bt_trend_panel');
    }
  } catch {
    /* ignore */
  }
  void load();
});

onUnload(() => loadEpoch.invalidate());

function applyPanelFromQuery(p?: string) {
  if (p && PANEL_OPTIONS.some((x) => x.value === p)) {
    panel.value = p as TrendPanel;
    metric.value = defaultMetricForPanel(panel.value);
  }
}

onReady(() => {
  const inst = getCurrentInstance();
  uni
    .createSelectorQuery()
    .in(inst?.proxy as any)
    .select('.chart-card')
    .boundingClientRect((rect: any) => {
      if (rect?.width) chartWidth.value = Math.floor(rect.width - 24);
    })
    .exec();
});
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #f2f5f4;
  padding: 20rpx 20rpx calc(180rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}
.panel-scroll {
  width: 100%;
  white-space: nowrap;
  margin-bottom: 16rpx;
}
.panel-row {
  display: inline-flex;
  gap: 12rpx;
  padding: 4rpx 0;
}
.panel-tab {
  display: inline-block;
  padding: 16rpx 28rpx;
  border-radius: 999rpx;
  background: #e8eeeb;
  color: #5a6d66;
  font-size: 28rpx;
  font-weight: 500;
}
.panel-tab.on {
  background: linear-gradient(135deg, #2aa87a, #1f8a68);
  color: #fff;
  font-weight: 700;
  box-shadow: 0 6rpx 16rpx rgba(31, 138, 104, 0.25);
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 16rpx;
}
.chip {
  padding: 10rpx 20rpx;
  border-radius: 999rpx;
  background: #fff;
  color: #5a6d66;
  font-size: 24rpx;
  border: 1rpx solid #e5ebe8;
}
.chip.on {
  background: #e6f5ee;
  color: #1f6b54;
  border-color: #b7e0cc;
  font-weight: 600;
}
.summary {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
}
.s-card {
  flex: 1;
  background: #fff;
  border-radius: 16rpx;
  padding: 18rpx 12rpx;
  text-align: center;
}
.s-num {
  display: block;
  font-size: 28rpx;
  font-weight: 700;
  color: #1a2e28;
}
.s-label {
  display: block;
  margin-top: 6rpx;
  font-size: 20rpx;
  color: #8a9a94;
}
.metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-bottom: 16rpx;
}
.m-chip {
  padding: 14rpx 22rpx;
  border-radius: 14rpx;
  background: #fff;
  color: #4a5c56;
  font-size: 26rpx;
  border: 1rpx solid #e5ebe8;
}
.m-chip.on {
  background: #e6f5ee;
  color: #1f6b54;
  border-color: #b7e0cc;
  font-weight: 700;
}
.arrow {
  margin-left: 4rpx;
}
.chart-card {
  background: #fff;
  border-radius: 28rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 8rpx 28rpx rgba(21, 36, 31, 0.05);
}
.chart-head {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  margin-bottom: 6rpx;
}
.chart-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1a2e28;
}
.chart-abbr {
  margin-left: 10rpx;
  font-size: 22rpx;
  color: #9aaba4;
}
.chart-unit {
  font-size: 22rpx;
  color: #8a9a94;
}
.ref {
  display: block;
  font-size: 22rpx;
  color: #7a8c85;
  margin-bottom: 12rpx;
}
.state {
  padding: 60rpx 0;
  text-align: center;
  color: #8a9a94;
  font-size: 26rpx;
}
.state.bad {
  color: #c0392b;
}
.link {
  display: inline-block;
  margin-left: 12rpx;
  color: #2d8a6e;
  font-weight: 600;
}
.legend {
  display: flex;
  gap: 20rpx;
  margin-top: 12rpx;
  flex-wrap: wrap;
}
.lg {
  font-size: 20rpx;
  color: #6b7c76;
  display: flex;
  align-items: center;
  gap: 6rpx;
}
.dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  display: inline-block;
}
.dot.line {
  background: #2d8a6e;
}
.dot.band {
  background: rgba(45, 138, 110, 0.35);
  border-radius: 2rpx;
}
.dot.abn {
  background: #c0392b;
}
.list-card {
  background: #fff;
  border-radius: 28rpx;
  padding: 20rpx 24rpx;
  box-shadow: 0 8rpx 28rpx rgba(21, 36, 31, 0.05);
}
.list-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #1a2e28;
  margin-bottom: 8rpx;
}
.row {
  display: flex;
  align-items: center;
  padding: 14rpx 0;
  border-top: 1rpx solid #eef2f0;
}
.row-date {
  flex: 1;
  font-size: 26rpx;
  color: #5a6d66;
}
.row-val {
  font-size: 28rpx;
  font-weight: 700;
  color: #1a2e28;
  margin-right: 12rpx;
}
.row-val.bad {
  color: #c0392b;
}
.badge {
  font-size: 20rpx;
  padding: 2rpx 10rpx;
  border-radius: 999rpx;
  background: #fdecea;
  color: #c0392b;
}
</style>
