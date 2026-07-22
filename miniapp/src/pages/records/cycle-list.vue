<template>
  <view class="page">
    <view class="toolbar">
      <view>
        <text class="title">化疗周期</text>
        <text class="sub">共 {{ pagination.total }} 条</text>
      </view>
      <button class="add-btn" size="mini" @click="goAdd">+ 加一笔</button>
    </view>

    <view v-if="error" class="banner error">
      <text>{{ error }}</text>
      <text class="link" @click="reload">重试</text>
    </view>

    <view v-if="loading && items.length === 0" class="empty"><text>加载中…</text></view>
    <view v-else-if="!loading && items.length === 0" class="empty">
      <text class="empty-title">还没有化疗周期</text>
      <button class="primary" @click="goAdd">添加周期</button>
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
      <view v-for="item in items" :key="item._id" class="card">
        <text class="name">{{ item.regimenName }}</text>
        <text class="range">
          {{ formatDisplayDate(item.startDate) }} ~ {{ formatDisplayDate(item.endDate) }}
        </text>
        <text v-if="item.medications?.length" class="meds">
          药物：{{ item.medications.map((m) => m.name || '未命名').join('、') }}
        </text>
        <text v-if="item.doctorNotes" class="notes">备注：{{ item.doctorNotes }}</text>
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
import { onShow } from '@dcloudio/uni-app';
import * as cycleApi from '@/api/chemoCycle';
import type { ChemoCycle } from '@/types/chemoCycle';
import { formatDisplayDate } from '@/utils/formatDate';
import { getErrorMessage } from '@/utils/errorMessage';
import { getAccessToken } from '@/utils/storage';

const items = ref<ChemoCycle[]>([]);
const pagination = ref({ page: 1, limit: 20, total: 0, pages: 0 });
const loading = ref(false);
const loadingMore = ref(false);
const refreshing = ref(false);
const error = ref('');
const hasMore = computed(() => pagination.value.page < pagination.value.pages);

async function fetchPage(page: number, append: boolean) {
  const res = await cycleApi.listChemoCycles(page, pagination.value.limit);
  pagination.value = res.pagination;
  items.value = append ? [...items.value, ...res.data] : res.data;
}

async function reload() {
  error.value = '';
  loading.value = true;
  try {
    await fetchPage(1, false);
  } catch (err) {
    error.value = getErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

async function onPull() {
  refreshing.value = true;
  try {
    await fetchPage(1, false);
  } catch (err) {
    error.value = getErrorMessage(err);
  } finally {
    refreshing.value = false;
  }
}

async function onMore() {
  if (!hasMore.value || loadingMore.value) return;
  loadingMore.value = true;
  try {
    await fetchPage(pagination.value.page + 1, true);
  } catch (err) {
    uni.showToast({ title: getErrorMessage(err), icon: 'none' });
  } finally {
    loadingMore.value = false;
  }
}

function goAdd() {
  uni.navigateTo({ url: '/pages/records/cycle-form' });
}

function onDelete(item: ChemoCycle) {
  uni.showModal({
    title: '删除周期',
    content: `确定删除方案「${item.regimenName}」？`,
    confirmColor: '#c0392b',
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await cycleApi.deleteChemoCycle(item._id);
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
  reload();
});
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
.empty { margin-top: 120rpx; text-align: center; }
.empty-title { display: block; font-size: 32rpx; font-weight: 600; margin-bottom: 24rpx; color: #1a2e28; }
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
  border-left: 8rpx solid #3d7ea6;
}
.name { display: block; font-size: 32rpx; font-weight: 700; color: #1a2e28; }
.range { display: block; margin-top: 8rpx; font-size: 26rpx; color: #5a6d66; }
.meds { display: block; margin-top: 10rpx; font-size: 24rpx; color: #4a5c56; }
.notes { display: block; margin-top: 8rpx; font-size: 24rpx; color: #7a8c85; }
.card-actions { margin-top: 12rpx; text-align: right; }
.danger { color: #c0392b; font-size: 24rpx; }
.footer-tip { text-align: center; padding: 24rpx; font-size: 22rpx; color: #9aaba4; }
</style>
