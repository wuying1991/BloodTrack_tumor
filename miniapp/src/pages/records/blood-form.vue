<template>
  <view class="page">
    <view class="head-row">
      <view>
        <text class="heading">新增血常规</text>
        <text class="hint">必填项标 *；异常值仍可保存，仅作提示</text>
      </view>
    </view>

    <!-- 拍照识别入口 -->
    <view class="scan-card">
      <view class="scan-main">
        <text class="scan-title">拍化验单识别</text>
        <text class="scan-sub">识别后预填下方表单，请核对再保存（不会自动入库）</text>
      </view>

      <!-- 多视觉模型：仅服务端允许覆盖时展示 -->
      <view v-if="providerOptions.length" class="provider-row">
        <text class="provider-label">识别模型</text>
        <scroll-view scroll-x class="provider-scroll" :show-scrollbar="false">
          <view class="provider-chips">
            <text
              v-for="p in providerOptions"
              :key="p.id"
              class="provider-chip"
              :class="{ on: selectedProvider === p.id, off: !p.configured && p.id !== 'mock' }"
              @click="onSelectProvider(p.id)"
            >{{ p.label }}</text>
          </view>
        </scroll-view>
        <text v-if="providerHint" class="provider-hint">{{ providerHint }}</text>
      </view>

      <view class="scan-actions">
        <button
          class="scan-btn"
          size="mini"
          :loading="parsing"
          :disabled="parsing || submitting"
          @click="onPickImage('camera')"
        >
          拍照
        </button>
        <button
          class="scan-btn ghost-btn"
          size="mini"
          :loading="parsing"
          :disabled="parsing || submitting"
          @click="onPickImage('album')"
        >
          相册
        </button>
        <button
          v-if="showMockDemo"
          class="scan-btn demo-btn"
          size="mini"
          :loading="parsing"
          :disabled="parsing || submitting"
          @click="onMockWithoutImage"
        >
          演示识别
        </button>
      </view>
    </view>

    <view v-if="parseBanner" class="parse-banner" :class="parseBanner.level">
      <text class="parse-banner-title">{{ parseBanner.title }}</text>
      <text v-for="(w, i) in parseBanner.lines" :key="i" class="parse-banner-line">{{ w }}</text>
      <text v-if="previewPath" class="parse-banner-line muted">已选图片（仅本地预览）</text>
      <image
        v-if="previewPath"
        class="preview-img"
        :src="previewPath"
        mode="aspectFit"
      />
    </view>

    <view class="card">
      <view class="field">
        <text class="label">检测日期 *</text>
        <picker mode="date" :value="form.date" :end="today" @change="onDateChange">
          <view class="picker">{{ formatChineseDate(form.date) }}</view>
        </picker>
      </view>

      <view
        v-for="metric in primaryMetrics"
        :key="metric.key"
        class="field"
      >
        <view class="label-row">
          <text class="label">
            {{ metric.short }}
            <text class="abbr">{{ metric.label }}</text>
            <text v-if="metric.required"> *</text>
            <text v-if="confidenceLabel(metric.key)" class="conf">
              {{ confidenceLabel(metric.key) }}
            </text>
          </text>
          <text
            v-if="statusOf(metric.key) !== 'empty'"
            class="status"
            :class="statusOf(metric.key)"
          >
            {{ statusText(metric.key) }}
          </text>
        </view>
        <view class="input-row">
          <input
            class="input"
            :class="{ 'from-ocr': filledFromOcr[metric.key] }"
            type="digit"
            :value="form[metric.key]"
            placeholder="请输入数值"
            @input="onMetricInput(metric.key, $event)"
          />
          <text class="unit">{{ metric.unit }}</text>
        </view>
        <text class="range">参考：{{ metric.min }} – {{ metric.max }} {{ metric.unit }}</text>
      </view>
    </view>

    <view class="card">
      <view class="more-toggle" @click="showMore = !showMore">
        <text class="more-title">其他可选指标</text>
        <text class="more-arrow">{{ showMore ? '收起' : '展开' }}</text>
      </view>

      <view v-if="showMore">
        <view
          v-for="metric in moreMetrics"
          :key="metric.key"
          class="field"
        >
          <view class="label-row">
            <text class="label">
              {{ metric.short }}
              <text class="abbr">{{ metric.label }}</text>
              <text v-if="confidenceLabel(metric.key)" class="conf">
                {{ confidenceLabel(metric.key) }}
              </text>
            </text>
            <text
              v-if="statusOf(metric.key) !== 'empty'"
              class="status"
              :class="statusOf(metric.key)"
            >
              {{ statusText(metric.key) }}
            </text>
          </view>
          <view class="input-row">
            <input
              class="input"
              :class="{ 'from-ocr': filledFromOcr[metric.key] }"
              type="digit"
              :value="form[metric.key]"
              placeholder="请输入数值"
              @input="onMetricInput(metric.key, $event)"
            />
            <text class="unit">{{ metric.unit }}</text>
          </view>
          <text class="range">参考：{{ metric.min }} – {{ metric.max }} {{ metric.unit }}</text>
        </view>

        <view class="field">
          <text class="label">备注</text>
          <textarea
            class="textarea"
            v-model="form.notes"
            maxlength="500"
            placeholder="可选"
          />
        </view>
      </view>
    </view>

    <text v-if="error" class="error">{{ error }}</text>

    <button class="primary" :loading="submitting" :disabled="submitting || parsing" @click="onSubmit">
      {{ parseApplied ? '核对无误，保存' : '保存' }}
    </button>
    <button class="ghost" :disabled="submitting || parsing" @click="onCancel">取消</button>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import * as bloodApi from '@/api/bloodTest';
import * as labReportApi from '@/api/labReport';
import { IS_DEVELOPMENT } from '@/config/env';
import {
  BLOOD_METRICS,
  getMetricStatus,
  statusLabel,
  type MetricRange,
} from '@/constants/bloodRanges';
import type { BloodTestFormValues } from '@/types/bloodTest';
import type {
  LabReportParseResult,
  LabReportProviderInfo,
} from '@/types/labReport';
import {
  dateInputToIso,
  formatChineseDate,
  todayDateInput,
} from '@/utils/formatDate';
import { getErrorMessage } from '@/utils/errorMessage';
import { isDevFeatureEnabled } from '@/utils/devFeatures';
import { getAccessToken } from '@/utils/storage';

const METRIC_KEYS: MetricRange['key'][] = [
  'wbc',
  'rbc',
  'hgb',
  'plt',
  'neu',
  'lym',
  'crp',
];

const today = todayDateInput();
const showMore = ref(false);
const submitting = ref(false);
const parsing = ref(false);
const error = ref('');
const parseApplied = ref(false);
const previewPath = ref('');
const confidenceByKey = reactive<Record<string, number>>({});
const filledFromOcr = reactive<Record<string, boolean>>({});
const parseBanner = ref<{
  level: 'ok' | 'warn';
  title: string;
  lines: string[];
} | null>(null);

/** Multi vision model picker (when server allows override) */
const allowProviderOverride = ref(false);
const providerOptions = ref<LabReportProviderInfo[]>([]);
const selectedProvider = ref('mock');
const serverPrimary = ref('mock');
const showMockDemo = isDevFeatureEnabled(IS_DEVELOPMENT);

const providerHint = computed(() => {
  const p = providerOptions.value.find((x) => x.id === selectedProvider.value);
  if (!p) return '';
  const bits = [
    p.defaultModel ? `模型 ${p.defaultModel}` : '',
    !p.configured && p.id !== 'mock' ? '未配置密钥，失败将回退' : '',
    p.notes || '',
  ].filter(Boolean);
  return bits.join(' · ');
});

const form = reactive<BloodTestFormValues>({
  date: todayDateInput(),
  wbc: '',
  rbc: '',
  hgb: '',
  plt: '',
  neu: '',
  lym: '',
  crp: '',
  notes: '',
});

const primaryMetrics = computed(() => BLOOD_METRICS.filter((m) => m.primary));
const moreMetrics = computed(() => BLOOD_METRICS.filter((m) => !m.primary));

onLoad(async () => {
  if (!getAccessToken()) {
    uni.reLaunch({ url: '/pages/auth/login' });
    return;
  }
  await loadProviders();
});

async function loadProviders() {
  try {
    const cfg = await labReportApi.listLabReportProviders();
    serverPrimary.value = cfg.primary || 'mock';
    allowProviderOverride.value = !!cfg.allowClientOverride;
    if (cfg.allowClientOverride && cfg.providers?.length) {
      providerOptions.value = cfg.providers;
      selectedProvider.value = cfg.primary || cfg.providers[0]?.id || 'mock';
    } else {
      providerOptions.value = [];
      selectedProvider.value = cfg.primary || 'mock';
    }
  } catch {
    // non-fatal — still allow mock demo via parse
    providerOptions.value = [];
  }
}

function onSelectProvider(id: string) {
  selectedProvider.value = id;
}

function onDateChange(e: any) {
  form.date = String(e?.detail?.value ?? '');
}

function onMetricInput(key: MetricRange['key'], e: any) {
  form[key] = String(e?.detail?.value ?? '');
  filledFromOcr[key] = false;
}

function statusOf(key: MetricRange['key']) {
  return getMetricStatus(key, form[key]);
}

function statusText(key: MetricRange['key']) {
  return statusLabel(statusOf(key));
}

function confidenceLabel(key: string): string {
  const c = confidenceByKey[key];
  if (c == null || Number.isNaN(c)) return '';
  const pct = Math.round(c * 100);
  return pct >= 85 ? `识别 ${pct}%` : `待核 ${pct}%`;
}

function parseOptional(raw: string): number | undefined {
  const t = raw.trim();
  if (!t) return undefined;
  const n = Number(t);
  return Number.isNaN(n) ? undefined : n;
}

function parseRequired(raw: string, label: string): number {
  const t = raw.trim();
  if (!t) throw new Error(`请填写${label}`);
  const n = Number(t);
  if (Number.isNaN(n) || n < 0) throw new Error(`${label}必须为非负数字`);
  return n;
}

function applyParseResult(result: LabReportParseResult) {
  if (result.reportType !== 'blood' && result.reportType !== 'unknown') {
    uni.showToast({
      title: '识别为非血常规，请改用手填或生化表单',
      icon: 'none',
    });
  }

  if (result.date && /^\d{4}-\d{2}-\d{2}$/.test(result.date)) {
    form.date = result.date;
  }

  let filled = 0;
  for (const key of METRIC_KEYS) {
    const val = result.metrics[key];
    const conf = result.confidenceByKey[key];
    if (conf != null) confidenceByKey[key] = conf;
    if (val === undefined || val === null || Number.isNaN(Number(val))) {
      continue;
    }
    form[key] = String(val);
    filledFromOcr[key] = true;
    filled += 1;
    if (key === 'crp') showMore.value = true;
  }

  parseApplied.value = filled > 0;
  const pct = Math.round((result.overallConfidence || 0) * 100);
  const modelTag = result.model ? ` · ${result.model}` : '';
  parseBanner.value = {
    level: result.provider === 'mock' ? 'warn' : 'ok',
    title:
      result.provider === 'mock'
        ? `Mock 识别完成 · 预填 ${filled} 项 · 综合置信 ${pct}%`
        : `识别完成（${result.provider}${modelTag}）· 预填 ${filled} 项 · ${pct}%`,
    lines: [
      ...(result.warnings?.length
        ? result.warnings
        : ['请仔细核对预填数值后再保存']),
      ...(result.triedProviders && result.triedProviders.length > 1
        ? [`尝试链路：${result.triedProviders.join(' → ')}`]
        : []),
    ],
  };

  // append provider note into notes if empty
  if (!form.notes.trim() && result.provider === 'mock') {
    form.notes = '（来自化验单 Mock 识别，已人工核对）';
    showMore.value = true;
  }
}

function readFileBase64(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    uni.getFileSystemManager().readFile({
      filePath,
      encoding: 'base64',
      success: (res) => resolve(String(res.data)),
      fail: (err) =>
        reject(new Error(err.errMsg || '读取图片失败')),
    });
  });
}

async function runParse(opts: {
  imageBase64?: string;
  mimeType?: string;
  localPath?: string;
  /** Force mock demo path */
  forceMock?: boolean;
}) {
  error.value = '';
  parsing.value = true;
  try {
    if (opts.localPath) previewPath.value = opts.localPath;
    const provider = opts.forceMock
      ? 'mock'
      : allowProviderOverride.value
        ? selectedProvider.value
        : undefined;
    const result = await labReportApi.parseLabReport({
      imageBase64: opts.imageBase64,
      mimeType: opts.mimeType || 'image/jpeg',
      reportHint: 'blood',
      provider,
    });
    applyParseResult(result);
    uni.showToast({ title: '已预填，请核对', icon: 'none' });
  } catch (err) {
    error.value = getErrorMessage(err, '识别失败');
    parseBanner.value = {
      level: 'warn',
      title: '识别失败',
      lines: [error.value],
    };
  } finally {
    parsing.value = false;
  }
}

/** Demo without camera — force mock provider */
async function onMockWithoutImage() {
  previewPath.value = '';
  await runParse({ forceMock: true });
}

function onPickImage(source: 'camera' | 'album') {
  error.value = '';
  uni.chooseImage({
    count: 1,
    sizeType: ['compressed'],
    sourceType: source === 'camera' ? ['camera'] : ['album'],
    success: async (res) => {
      const path = res.tempFilePaths?.[0];
      if (!path) {
        error.value = '未选择图片';
        return;
      }
      try {
        const base64 = await readFileBase64(path);
        await runParse({
          imageBase64: base64,
          mimeType: 'image/jpeg',
          localPath: path,
        });
      } catch (err) {
        error.value = getErrorMessage(err, '读取图片失败');
      }
    },
    fail: (err) => {
      // user cancel is common
      if (err?.errMsg && /cancel/i.test(err.errMsg)) return;
      error.value = err?.errMsg || '无法打开相册/相机';
    },
  });
}

async function onSubmit() {
  error.value = '';
  try {
    if (!form.date) throw new Error('请选择检测日期');

    const payload = {
      date: dateInputToIso(form.date),
      wbc: parseRequired(form.wbc, '白细胞'),
      rbc: parseRequired(form.rbc, '红细胞'),
      hgb: parseRequired(form.hgb, '血红蛋白'),
      plt: parseRequired(form.plt, '血小板'),
      neu: parseOptional(form.neu),
      lym: parseOptional(form.lym),
      crp: parseOptional(form.crp),
      notes: form.notes.trim() || undefined,
    };

    submitting.value = true;
    await bloodApi.createBloodTest(payload);
    uni.showToast({ title: '已保存', icon: 'success' });
    setTimeout(() => {
      uni.navigateBack({
        fail: () => uni.redirectTo({ url: '/pages/records/blood-list' }),
      });
    }, 400);
  } catch (err) {
    error.value = getErrorMessage(err, '保存失败');
  } finally {
    submitting.value = false;
  }
}

function onCancel() {
  uni.navigateBack({
    fail: () => uni.redirectTo({ url: '/pages/records/blood-list' }),
  });
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  padding: 24rpx 24rpx calc(40rpx + env(safe-area-inset-bottom));
  background: #f2f5f4;
  box-sizing: border-box;
}

.head-row {
  margin-bottom: 8rpx;
}

.heading {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #15241f;
}

.hint {
  display: block;
  margin: 8rpx 0 16rpx;
  font-size: 22rpx;
  color: #8b9b95;
}

.scan-card {
  background: linear-gradient(145deg, #e8f6ef 0%, #ffffff 70%);
  border-radius: 24rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  border: 1rpx solid rgba(31, 138, 104, 0.1);
  box-shadow: 0 8rpx 24rpx rgba(31, 138, 104, 0.06);
}
.scan-title {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #15241f;
}
.scan-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #5c6f68;
  line-height: 1.45;
}
.provider-row {
  margin-top: 18rpx;
}
.provider-label {
  display: block;
  font-size: 22rpx;
  color: #5c6f68;
  font-weight: 600;
  margin-bottom: 10rpx;
}
.provider-scroll {
  width: 100%;
  white-space: nowrap;
}
.provider-chips {
  display: inline-flex;
  gap: 12rpx;
}
.provider-chip {
  display: inline-block;
  padding: 10rpx 20rpx;
  border-radius: 999rpx;
  background: #f0f4f2;
  color: #5c6f68;
  font-size: 22rpx;
  border: 1rpx solid #e6ece9;
}
.provider-chip.on {
  background: #e8f6ef;
  color: #1f6b54;
  border-color: #b7e0cc;
  font-weight: 700;
}
.provider-chip.off {
  opacity: 0.65;
}
.provider-hint {
  display: block;
  margin-top: 10rpx;
  font-size: 20rpx;
  color: #8b9b95;
  line-height: 1.4;
}
.scan-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
  margin-top: 18rpx;
}
.scan-btn {
  background: linear-gradient(135deg, #2aa87a, #1f8a68) !important;
  color: #fff !important;
  border-radius: 999rpx !important;
  font-size: 24rpx !important;
  padding: 0 24rpx !important;
  margin: 0 !important;
  border: none !important;
  line-height: 2.2 !important;
}
.scan-btn::after {
  border: none;
}
.scan-btn.ghost-btn {
  background: #fff !important;
  color: #1f6b54 !important;
  border: 1rpx solid #b7e0cc !important;
}
.scan-btn.demo-btn {
  background: #fff8e6 !important;
  color: #8a6500 !important;
  border: 1rpx solid #f5e6b8 !important;
}

.parse-banner {
  border-radius: 20rpx;
  padding: 20rpx 22rpx;
  margin-bottom: 16rpx;
}
.parse-banner.ok {
  background: #e8f6ef;
  border: 1rpx solid #b7e0cc;
}
.parse-banner.warn {
  background: #fff8e6;
  border: 1rpx solid #f5e6b8;
}
.parse-banner-title {
  display: block;
  font-size: 26rpx;
  font-weight: 700;
  color: #15241f;
  margin-bottom: 8rpx;
}
.parse-banner-line {
  display: block;
  font-size: 22rpx;
  color: #5c6f68;
  line-height: 1.5;
  margin-top: 4rpx;
}
.parse-banner-line.muted {
  color: #8b9b95;
  margin-top: 10rpx;
}
.preview-img {
  width: 100%;
  height: 220rpx;
  margin-top: 12rpx;
  border-radius: 12rpx;
  background: #f0f4f2;
}

.card {
  background: #fff;
  border-radius: 28rpx;
  padding: 8rpx 24rpx 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 8rpx 28rpx rgba(21, 36, 31, 0.05);
}

.field {
  padding-top: 20rpx;
}

.label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.label {
  font-size: 28rpx;
  color: #1a2e28;
  font-weight: 600;
}
.abbr {
  margin-left: 10rpx;
  font-size: 22rpx;
  color: #9aaba4;
  font-weight: 400;
}
.conf {
  margin-left: 10rpx;
  font-size: 20rpx;
  color: #1f8a68;
  font-weight: 500;
}

.status {
  font-size: 22rpx;
  font-weight: 600;
}

.status.low {
  color: #2471a3;
}

.status.high {
  color: #c0392b;
}

.status.normal {
  color: #1f6b54;
}

.picker {
  margin-top: 12rpx;
  height: 88rpx;
  line-height: 88rpx;
  padding: 0 24rpx;
  background: #f4f7f6;
  border-radius: 16rpx;
  font-size: 28rpx;
  color: #15241f;
}

.input-row {
  margin-top: 12rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.input {
  flex: 1;
  height: 88rpx;
  padding: 0 24rpx;
  background: #f4f7f6;
  border-radius: 16rpx;
  font-size: 30rpx;
  color: #15241f;
}
.input.from-ocr {
  background: #eefaf4;
  box-shadow: inset 0 0 0 2rpx rgba(31, 138, 104, 0.25);
}

.unit {
  font-size: 22rpx;
  color: #7a8c85;
  min-width: 120rpx;
}

.range {
  display: block;
  margin-top: 8rpx;
  font-size: 20rpx;
  color: #9aaba4;
}

.textarea {
  margin-top: 12rpx;
  width: 100%;
  min-height: 140rpx;
  padding: 20rpx 24rpx;
  background: #f0f4f2;
  border-radius: 14rpx;
  font-size: 28rpx;
  color: #1a2e28;
  box-sizing: border-box;
}

.more-toggle {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0 8rpx;
}

.more-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1a2e28;
}

.more-arrow {
  font-size: 24rpx;
  color: #2d8a6e;
}

.error {
  display: block;
  color: #c0392b;
  font-size: 26rpx;
  margin-bottom: 16rpx;
}

.primary {
  height: 96rpx;
  line-height: 96rpx;
  background: linear-gradient(135deg, #2aa87a 0%, #1f8a68 100%);
  color: #fff;
  border-radius: 18rpx;
  font-size: 32rpx;
  border: none;
  margin-bottom: 16rpx;
  font-weight: 700;
  box-shadow: 0 10rpx 24rpx rgba(31, 138, 104, 0.25);
}
.primary::after { border: none; }

.ghost {
  height: 88rpx;
  line-height: 88rpx;
  background: #fff;
  color: #5c6f68;
  border-radius: 18rpx;
  font-size: 28rpx;
  border: 1rpx solid #e6ece9;
}
.ghost::after { border: none; }
</style>
