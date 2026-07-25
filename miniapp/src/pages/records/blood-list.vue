<template>
  <view class="page">
    <view class="toolbar">
      <view>
        <text class="title">血常规记录</text>
        <text class="sub">共 {{ pagination.total }} 条</text>
      </view>
      <button class="add-btn" size="mini" @click="goAdd">+ 加一笔</button>
    </view>

    <view v-if="error" class="banner error">
      <text>{{ error }}</text>
      <text class="link" @click="reload">重试</text>
    </view>

    <view v-if="loading && items.length === 0" class="empty">
      <text>加载中…</text>
    </view>

    <view v-else-if="!loading && items.length === 0" class="empty">
      <text class="empty-title">还没有血常规记录</text>
      <text class="empty-sub">点右上角或底部加号，添加第一条</text>
      <button class="primary" @click="goAdd">添加血常规</button>
    </view>

    <scroll-view
      v-else
      class="list"
      scroll-y
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onPullRefresh"
      @scrolltolower="onLoadMore"
    >
      <view
        v-for="item in items"
        :key="item._id"
        class="card"
        :class="{ abnormal: item.isAbnormal }"
      >
        <view class="card-head">
          <text class="date">{{ formatDisplayDate(item.date) }}</text>
          <text v-if="item.isAbnormal" class="badge bad">有异常</text>
          <text v-else class="badge ok">正常</text>
        </view>
        <view class="metrics">
          <view class="metric" v-for="m in summaryMetrics(item)" :key="m.key">
            <text class="m-label">{{ m.short }}</text>
            <text class="m-value" :class="m.status">{{ m.value }}</text>
            <text class="m-unit">{{ m.unit }}</text>
          </view>
        </view>
        <text v-if="item.notes" class="notes">备注：{{ item.notes }}</text>
        <view class="card-actions">
          <text class="danger" @click="onDelete(item)">删除</text>
        </view>
      </view>

      <view class="footer-tip">
        <text v-if="loadingMore">加载更多…</text>
        <text v-else-if="!hasMore && items.length">没有更多了</text>
      </view>
    </scroll-view>

    <!-- FAB -->
    <view class="fab" @click="showSheet = true">
      <text class="fab-plus">+</text>
    </view>

    <QuickAddSheet v-model:visible="showSheet" @select="onQuickSelect" />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow, onUnload } from '@dcloudio/uni-app';
import QuickAddSheet from '@/components/QuickAddSheet.vue';
import * as bloodApi from '@/api/bloodTest';
import type { BloodTest, PaginationMeta } from '@/types/bloodTest';
import {
  BLOOD_METRICS,
  getMetricStatus,
  type MetricRange,
} from '@/constants/bloodRanges';
import { formatDisplayDate } from '@/utils/formatDate';
import { getErrorMessage } from '@/utils/errorMessage';
import { appendUniqueById } from '@/utils/pagination';
import { createRequestEpoch } from '@/utils/requestEpoch';
import { getAccessToken } from '@/utils/storage';

const items = ref<BloodTest[]>([]);
const pagination = ref<PaginationMeta>({
  page: 1,
  limit: 20,
  total: 0,
  pages: 0,
});
const loading = ref(false);
const loadingMore = ref(false);
const refreshing = ref(false);
const error = ref('');
const showSheet = ref(false);
const listEpoch = createRequestEpoch();

const hasMore = computed(
  () => pagination.value.page < pagination.value.pages
);

function summaryMetrics(item: BloodTest) {
  const keys: MetricRange['key'][] = ['wbc', 'neu', 'hgb', 'plt', 'rbc', 'lym'];
  return keys.map((key) => {
    const meta = BLOOD_METRICS.find((m) => m.key === key)!;
    const raw = item[key as keyof BloodTest] as number | undefined;
    const status = getMetricStatus(key, raw);
    return {
      key,
      short: meta.short,
      unit: meta.unit,
      value: raw === undefined || raw === null ? '—' : String(raw),
      status,
    };
  });
}

function fetchPage(page: number) {
  return bloodApi.listBloodTests(page, pagination.value.limit);
}

async function reload() {
  const generation = listEpoch.begin();
  loadingMore.value = false;
  refreshing.value = false;
  error.value = '';
  loading.value = true;
  try {
    const res = await fetchPage(1);
    if (!listEpoch.isCurrent(generation)) return;
    items.value = res.data;
    pagination.value = res.pagination;
  } catch (err) {
    if (listEpoch.isCurrent(generation)) {
      error.value = getErrorMessage(err, '加载失败');
    }
  } finally {
    if (listEpoch.isCurrent(generation)) loading.value = false;
  }
}

async function onPullRefresh() {
  if (loading.value || refreshing.value) return;
  const generation = listEpoch.begin();
  loadingMore.value = false;
  refreshing.value = true;
  error.value = '';
  try {
    const res = await fetchPage(1);
    if (!listEpoch.isCurrent(generation)) return;
    items.value = res.data;
    pagination.value = res.pagination;
  } catch (err) {
    if (listEpoch.isCurrent(generation)) {
      error.value = getErrorMessage(err, '刷新失败');
    }
  } finally {
    if (listEpoch.isCurrent(generation)) refreshing.value = false;
  }
}

async function onLoadMore() {
  if (
    !hasMore.value ||
    loadingMore.value ||
    loading.value ||
    refreshing.value
  ) return;
  const generation = listEpoch.capture();
  const targetPage = pagination.value.page + 1;
  loadingMore.value = true;
  try {
    const res = await fetchPage(targetPage);
    if (
      !listEpoch.isCurrent(generation) ||
      pagination.value.page + 1 !== targetPage
    ) return;
    items.value = appendUniqueById(items.value, res.data);
    pagination.value = res.pagination;
  } catch (err) {
    if (listEpoch.isCurrent(generation)) {
      uni.showToast({
        title: getErrorMessage(err, '加载更多失败'),
        icon: 'none',
      });
    }
  } finally {
    if (listEpoch.isCurrent(generation)) loadingMore.value = false;
  }
}

function goAdd() {
  uni.navigateTo({ url: '/pages/records/blood-form' });
}

function onQuickSelect(type: string) {
  if (type === 'blood') goAdd();
  else if (type === 'biochem') uni.navigateTo({ url: '/pages/records/biochem-form' });
  else if (type === 'cycle') uni.navigateTo({ url: '/pages/records/cycle-form' });
  else if (type === 'reminder') uni.navigateTo({ url: '/pages/records/reminder-form' });
}

function onDelete(item: BloodTest) {
  uni.showModal({
    title: '删除记录',
    content: `确定删除 ${formatDisplayDate(item.date)} 的血常规？删除后不可恢复。`,
    confirmColor: '#c0392b',
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await bloodApi.deleteBloodTest(item._id);
        items.value = items.value.filter((x) => x._id !== item._id);
        pagination.value.total = Math.max(0, pagination.value.total - 1);
        uni.showToast({ title: '已删除', icon: 'success' });
      } catch (err) {
        uni.showToast({
          title: getErrorMessage(err, '删除失败'),
          icon: 'none',
        });
      }
    },
  });
}

onShow(() => {
  if (!getAccessToken()) {
    uni.reLaunch({ url: '/pages/auth/login' });
    return;
  }
  void reload();
});

onUnload(() => listEpoch.invalidate());
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #f2f5f4;
  padding: 24rpx 24rpx 160rpx;
  box-sizing: border-box;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.title {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #1a2e28;
}

.sub {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #7a8c85;
}

.add-btn {
  background: linear-gradient(135deg, #2aa87a, #1f8a68) !important;
  color: #fff !important;
  border-radius: 999rpx;
  padding: 0 28rpx;
  font-size: 26rpx;
  border: none;
  font-weight: 600;
  box-shadow: 0 6rpx 16rpx rgba(31, 138, 104, 0.25);
}

.banner {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 24rpx;
  border-radius: 16rpx;
  margin-bottom: 16rpx;
  font-size: 26rpx;
}

.banner.error {
  background: #fdecea;
  color: #c0392b;
}

.link {
  color: #2d8a6e;
  font-weight: 600;
}

.empty {
  margin-top: 120rpx;
  text-align: center;
  color: #6b7c76;
}

.empty-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #1a2e28;
  margin-bottom: 12rpx;
}

.empty-sub {
  display: block;
  font-size: 26rpx;
  margin-bottom: 28rpx;
}

.primary {
  width: 60%;
  height: 84rpx;
  line-height: 84rpx;
  background: #2d8a6e;
  color: #fff;
  border-radius: 16rpx;
  font-size: 28rpx;
  border: none;
}

.list {
  height: calc(100vh - 160rpx);
}

.card {
  background: #fff;
  border-radius: 24rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 8rpx 28rpx rgba(21, 36, 31, 0.05);
  border-left: 8rpx solid #1f8a68;
}

.card.abnormal {
  border-left-color: #d14343;
}

.card-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 16rpx;
}

.date {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a2e28;
  flex: 1;
}

.badge {
  font-size: 22rpx;
  padding: 4rpx 14rpx;
  border-radius: 999rpx;
}

.badge.ok {
  background: #e6f5ee;
  color: #1f6b54;
}

.badge.bad {
  background: #fdecea;
  color: #c0392b;
}

.metrics {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx 8rpx;
}

.metric {
  width: 25%;
  box-sizing: border-box;
  padding-right: 8rpx;
}

.m-label {
  display: block;
  font-size: 20rpx;
  color: #7a8c85;
}

.m-value {
  display: block;
  font-size: 30rpx;
  font-weight: 700;
  color: #1a2e28;
  margin-top: 4rpx;
}

.m-value.low {
  color: #2471a3;
}

.m-value.high {
  color: #c0392b;
}

.m-value.normal {
  color: #1f6b54;
}

.m-unit {
  display: block;
  font-size: 18rpx;
  color: #9aaba4;
}

.notes {
  display: block;
  margin-top: 14rpx;
  font-size: 24rpx;
  color: #5a6d66;
}

.card-actions {
  margin-top: 16rpx;
  display: flex;
  justify-content: flex-end;
}

.danger {
  font-size: 24rpx;
  color: #c0392b;
  padding: 8rpx 12rpx;
}

.footer-tip {
  text-align: center;
  padding: 24rpx 0 80rpx;
  font-size: 22rpx;
  color: #9aaba4;
}

.fab {
  position: fixed;
  right: 40rpx;
  bottom: calc(48rpx + env(safe-area-inset-bottom));
  width: 108rpx;
  height: 108rpx;
  border-radius: 50%;
  background: linear-gradient(145deg, #34a37e, #1f8a68);
  box-shadow: 0 12rpx 28rpx rgba(31, 138, 104, 0.38);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 20;
}

.fab-plus {
  color: #fff;
  font-size: 56rpx;
  line-height: 1;
  font-weight: 300;
}
</style>
