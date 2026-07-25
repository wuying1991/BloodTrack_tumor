<template>
  <view class="page">
    <view class="toolbar">
      <view>
        <text class="title">生化检查</text>
        <text class="sub">肝 · 肾 · 电解质 · 共 {{ pagination.total }} 条</text>
      </view>
      <button class="add-btn" size="mini" @click="goAdd">+ 加一笔</button>
    </view>

    <view v-if="error" class="banner error">
      <text>{{ error }}</text>
      <text class="link" @click="reload">重试</text>
    </view>

    <view v-if="loading && items.length === 0" class="empty"><text>加载中…</text></view>
    <view v-else-if="!loading && items.length === 0" class="empty">
      <text class="empty-title">还没有生化记录</text>
      <text class="empty-sub">含肝功能、肾功能、电解质等指标</text>
      <button class="primary" @click="goAdd">添加生化检查</button>
    </view>

    <scroll-view
      v-else
      class="list"
      scroll-y
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onPull"
      @scrolltolower="onMore"
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
          <view v-for="m in summaryOf(item)" :key="m.key" class="metric">
            <text class="m-label">{{ m.short }}</text>
            <text class="m-value" :class="m.status">{{ m.value }}</text>
          </view>
        </view>
        <view class="card-actions">
          <text class="danger" @click="onDelete(item)">删除</text>
        </view>
      </view>
      <view class="footer-tip">
        <text v-if="loadingMore">加载更多…</text>
        <text v-else-if="!hasMore && items.length">没有更多了</text>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow, onUnload } from '@dcloudio/uni-app';
import * as biochemApi from '@/api/biochem';
import type { BiochemTest } from '@/types/biochem';
import {
  LIST_SUMMARY_KEYS,
  getBiochemStatus,
} from '@/constants/biochemRanges';
import { formatDisplayDate } from '@/utils/formatDate';
import { getErrorMessage } from '@/utils/errorMessage';
import { appendUniqueById } from '@/utils/pagination';
import { createRequestEpoch } from '@/utils/requestEpoch';
import { getAccessToken } from '@/utils/storage';

const items = ref<BiochemTest[]>([]);
const pagination = ref({ page: 1, limit: 20, total: 0, pages: 0 });
const loading = ref(false);
const loadingMore = ref(false);
const refreshing = ref(false);
const error = ref('');
const listEpoch = createRequestEpoch();
const hasMore = computed(() => pagination.value.page < pagination.value.pages);

const SUMMARY_SHORTS = ['谷丙', '谷草', '尿素', '肌酐', '血钾'];

function summaryOf(item: BiochemTest) {
  return LIST_SUMMARY_KEYS.map((key, i) => {
    const raw = item[key];
    return {
      key,
      short: SUMMARY_SHORTS[i] || key,
      value: raw === undefined || raw === null ? '—' : String(raw),
      status: getBiochemStatus(key, raw),
    };
  });
}

function fetchPage(page: number) {
  return biochemApi.listBiochemTests(page, pagination.value.limit);
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
    if (listEpoch.isCurrent(generation)) error.value = getErrorMessage(err);
  } finally {
    if (listEpoch.isCurrent(generation)) loading.value = false;
  }
}

async function onPull() {
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
    if (listEpoch.isCurrent(generation)) error.value = getErrorMessage(err);
  } finally {
    if (listEpoch.isCurrent(generation)) refreshing.value = false;
  }
}

async function onMore() {
  if (!hasMore.value || loadingMore.value || loading.value || refreshing.value) {
    return;
  }
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
      uni.showToast({ title: getErrorMessage(err), icon: 'none' });
    }
  } finally {
    if (listEpoch.isCurrent(generation)) loadingMore.value = false;
  }
}

function goAdd() {
  uni.navigateTo({ url: '/pages/records/biochem-form' });
}

function onDelete(item: BiochemTest) {
  uni.showModal({
    title: '删除记录',
    content: `确定删除 ${formatDisplayDate(item.date)} 的生化检查？`,
    confirmColor: '#c0392b',
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await biochemApi.deleteBiochemTest(item._id);
        items.value = items.value.filter((x) => x._id !== item._id);
        pagination.value.total = Math.max(0, pagination.value.total - 1);
        uni.showToast({ title: '已删除', icon: 'success' });
      } catch (err) {
        uni.showToast({ title: getErrorMessage(err), icon: 'none' });
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
  background: #f5f7f6;
  padding: 24rpx 24rpx 80rpx;
  box-sizing: border-box;
}
.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}
.title { display: block; font-size: 36rpx; font-weight: 700; color: #1a2e28; }
.sub { display: block; margin-top: 6rpx; font-size: 22rpx; color: #7a8c85; }
.add-btn {
  background: #2d8a6e !important;
  color: #fff !important;
  border-radius: 999rpx;
  border: none;
  font-size: 26rpx;
}
.banner {
  display: flex;
  justify-content: space-between;
  padding: 20rpx;
  border-radius: 16rpx;
  margin-bottom: 16rpx;
  font-size: 26rpx;
}
.banner.error { background: #fdecea; color: #c0392b; }
.link { color: #2d8a6e; font-weight: 600; }
.empty { margin-top: 120rpx; text-align: center; color: #6b7c76; }
.empty-title { display: block; font-size: 32rpx; font-weight: 600; color: #1a2e28; margin-bottom: 12rpx; }
.empty-sub { display: block; font-size: 24rpx; color: #8b9b95; margin-bottom: 24rpx; }
.primary {
  width: 60%;
  height: 84rpx;
  line-height: 84rpx;
  background: #2d8a6e;
  color: #fff;
  border-radius: 16rpx;
  border: none;
}
.list { height: calc(100vh - 140rpx); }
.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  border-left: 8rpx solid #2d8a6e;
}
.card.abnormal { border-left-color: #c0392b; }
.card-head { display: flex; align-items: center; margin-bottom: 12rpx; }
.date { flex: 1; font-size: 30rpx; font-weight: 600; color: #1a2e28; }
.badge { font-size: 22rpx; padding: 4rpx 14rpx; border-radius: 999rpx; }
.badge.ok { background: #e6f5ee; color: #1f6b54; }
.badge.bad { background: #fdecea; color: #c0392b; }
.metrics { display: flex; flex-wrap: wrap; gap: 12rpx; }
.metric { width: 18%; }
.m-label { display: block; font-size: 20rpx; color: #7a8c85; }
.m-value { display: block; font-size: 28rpx; font-weight: 700; color: #1a2e28; }
.m-value.low { color: #2471a3; }
.m-value.high { color: #c0392b; }
.m-value.normal { color: #1f6b54; }
.card-actions { margin-top: 12rpx; text-align: right; }
.danger { color: #c0392b; font-size: 24rpx; }
.footer-tip { text-align: center; padding: 24rpx; font-size: 22rpx; color: #9aaba4; }
</style>
