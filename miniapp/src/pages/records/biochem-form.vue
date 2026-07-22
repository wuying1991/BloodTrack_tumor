<template>
  <view class="page">
    <text class="heading">新增生化检查</text>
    <text class="hint">按分类填写，至少一项即可保存</text>

    <view class="card">
      <view class="field">
        <text class="label">检测日期 *</text>
        <picker mode="date" :value="date" :end="today" @change="onDate">
          <view class="picker">{{ formatChineseDate(date) }}</view>
        </picker>
      </view>
    </view>

    <!-- 分类 Tab -->
    <scroll-view scroll-x class="group-scroll" :show-scrollbar="false">
      <view class="group-row">
        <text
          v-for="g in GROUP_ORDER"
          :key="g"
          class="group-tab"
          :class="{ on: activeGroup === g }"
          @click="activeGroup = g"
        >{{ GROUP_LABELS[g] }}</text>
      </view>
    </scroll-view>

    <view class="card">
      <text class="group-title">{{ GROUP_LABELS[activeGroup] }}</text>
      <view v-for="m in currentMetrics" :key="m.key" class="field">
        <view class="label-row">
          <view>
            <text class="label">{{ m.short }}</text>
            <text class="abbr">{{ m.label }}</text>
          </view>
          <text
            v-if="statusOf(m.key) !== 'empty'"
            class="status"
            :class="statusOf(m.key)"
          >{{ statusText(m.key) }}</text>
        </view>
        <view class="input-row">
          <input
            class="input"
            type="digit"
            :value="values[m.key]"
            placeholder="请输入数值"
            @input="onInput(m.key, $event)"
          />
          <text class="unit">{{ m.unit }}</text>
        </view>
        <text class="range">参考：{{ m.min }} – {{ m.max }} {{ m.unit }}</text>
      </view>
    </view>

    <view class="card">
      <text class="label">备注</text>
      <textarea class="textarea" v-model="notes" maxlength="500" placeholder="可选" />
    </view>

    <view class="filled-tip" v-if="filledCount">
      已填 {{ filledCount }} 项
    </view>

    <text v-if="error" class="error">{{ error }}</text>
    <button class="primary" :loading="submitting" @click="onSubmit">保存</button>
    <button class="ghost" @click="onCancel">取消</button>
  </view>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import * as biochemApi from '@/api/biochem';
import {
  BIOCHEM_METRICS,
  GROUP_LABELS,
  GROUP_ORDER,
  getBiochemStatus,
  metricsByGroup,
  statusLabel,
  type BiochemGroup,
} from '@/constants/biochemRanges';
import type { BiochemKey } from '@/types/biochem';
import {
  dateInputToIso,
  formatChineseDate,
  todayDateInput,
} from '@/utils/formatDate';
import { getErrorMessage } from '@/utils/errorMessage';
import { getAccessToken } from '@/utils/storage';

const today = todayDateInput();
const date = ref(todayDateInput());
const notes = ref('');
const values = reactive<Record<string, string>>({});
const activeGroup = ref<BiochemGroup>('liver');
const submitting = ref(false);
const error = ref('');

const currentMetrics = computed(() => metricsByGroup(activeGroup.value));
const filledCount = computed(() =>
  BIOCHEM_METRICS.filter((m) => (values[m.key] || '').trim() !== '').length
);

onLoad((query) => {
  if (!getAccessToken()) uni.reLaunch({ url: '/pages/auth/login' });
  const g = query?.group as BiochemGroup;
  if (g && GROUP_ORDER.includes(g)) activeGroup.value = g;
});

function onDate(e: any) {
  date.value = String(e?.detail?.value ?? '');
}

function onInput(key: BiochemKey, e: any) {
  values[key] = String(e?.detail?.value ?? '');
}

function statusOf(key: BiochemKey) {
  return getBiochemStatus(key, values[key]);
}

function statusText(key: BiochemKey) {
  return statusLabel(statusOf(key));
}

async function onSubmit() {
  error.value = '';
  try {
    if (!date.value) throw new Error('请选择日期');
    const payload: Record<string, unknown> = {
      date: dateInputToIso(date.value),
    };
    let filled = 0;
    for (const m of BIOCHEM_METRICS) {
      const raw = (values[m.key] || '').trim();
      if (!raw) continue;
      const n = Number(raw);
      if (Number.isNaN(n) || n < 0) throw new Error(`${m.short} 必须为非负数字`);
      payload[m.key] = n;
      filled += 1;
    }
    if (filled === 0) throw new Error('请至少填写一项指标');
    if (notes.value.trim()) payload.notes = notes.value.trim();

    submitting.value = true;
    await biochemApi.createBiochemTest(payload as any);
    uni.showToast({ title: '已保存', icon: 'success' });
    setTimeout(() => {
      uni.navigateBack({
        fail: () => uni.redirectTo({ url: '/pages/records/biochem-list' }),
      });
    }, 400);
  } catch (err) {
    error.value = getErrorMessage(err);
  } finally {
    submitting.value = false;
  }
}

function onCancel() {
  uni.navigateBack({
    fail: () => uni.redirectTo({ url: '/pages/records/biochem-list' }),
  });
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  padding: 24rpx 24rpx calc(40rpx + env(safe-area-inset-bottom));
  background: #f3f6f5;
  box-sizing: border-box;
}
.heading {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #1a2e28;
}
.hint {
  display: block;
  margin: 8rpx 0 20rpx;
  font-size: 22rpx;
  color: #7a8c85;
}
.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 20rpx 24rpx 24rpx;
  margin-bottom: 16rpx;
}
.group-scroll {
  width: 100%;
  white-space: nowrap;
  margin-bottom: 16rpx;
}
.group-row {
  display: inline-flex;
  gap: 12rpx;
}
.group-tab {
  display: inline-block;
  padding: 14rpx 28rpx;
  border-radius: 999rpx;
  background: #e8eeeb;
  color: #5a6d66;
  font-size: 26rpx;
}
.group-tab.on {
  background: #2d8a6e;
  color: #fff;
  font-weight: 700;
}
.group-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1a2e28;
}
.field {
  padding-top: 18rpx;
}
.label-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
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
  height: 84rpx;
  line-height: 84rpx;
  padding: 0 24rpx;
  background: #f0f4f2;
  border-radius: 14rpx;
  font-size: 28rpx;
}
.input-row {
  margin-top: 10rpx;
  display: flex;
  align-items: center;
  gap: 12rpx;
}
.input {
  flex: 1;
  height: 80rpx;
  padding: 0 20rpx;
  background: #f0f4f2;
  border-radius: 14rpx;
  font-size: 28rpx;
}
.unit {
  font-size: 22rpx;
  color: #7a8c85;
  min-width: 100rpx;
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
  min-height: 120rpx;
  padding: 16rpx 20rpx;
  background: #f0f4f2;
  border-radius: 14rpx;
  box-sizing: border-box;
}
.filled-tip {
  text-align: center;
  font-size: 24rpx;
  color: #2d8a6e;
  margin-bottom: 12rpx;
}
.error {
  display: block;
  color: #c0392b;
  margin-bottom: 12rpx;
  font-size: 26rpx;
}
.primary {
  height: 92rpx;
  line-height: 92rpx;
  background: #2d8a6e;
  color: #fff;
  border-radius: 16rpx;
  border: none;
  margin-bottom: 12rpx;
}
.ghost {
  height: 84rpx;
  line-height: 84rpx;
  background: #fff;
  color: #4a5c56;
  border-radius: 16rpx;
  border: 1rpx solid #d9e3de;
}
</style>
