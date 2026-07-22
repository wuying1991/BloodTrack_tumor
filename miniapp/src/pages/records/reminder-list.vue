<template>
  <view class="page">
    <view class="toolbar">
      <view>
        <text class="title">提醒</text>
        <text class="sub">共 {{ items.length }} 条</text>
      </view>
      <button class="add-btn" size="mini" @click="goAdd">+ 加一笔</button>
    </view>

    <view class="filters">
      <text
        v-for="f in statusFilters"
        :key="f.value"
        class="chip"
        :class="{ on: status === f.value }"
        @click="setStatus(f.value)"
      >{{ f.label }}</text>
    </view>

    <view v-if="error" class="banner error">
      <text>{{ error }}</text>
      <text class="link" @click="reload">重试</text>
    </view>

    <view v-if="loading && items.length === 0" class="empty"><text>加载中…</text></view>
    <view v-else-if="!loading && items.length === 0" class="empty">
      <text class="empty-title">暂无提醒</text>
      <button class="primary" @click="goAdd">创建提醒</button>
    </view>

    <scroll-view
      v-else
      class="list"
      scroll-y
      :refresher-enabled="true"
      :refresher-triggered="refreshing"
      @refresherrefresh="onPull"
    >
      <view
        v-for="item in items"
        :key="item._id"
        class="card"
        :class="{ done: item.completed, off: !item.enabled }"
      >
        <view class="card-head">
          <text class="name">{{ item.title }}</text>
          <text class="type-tag">{{ typeLabel(item.type) }}</text>
        </view>
        <text class="due">到期：{{ formatDisplayDateTime(item.dueDate) }}</text>
        <text class="meta-line">
          {{ recurrenceLabel(item.recurrence) }}
          · {{ item.enabled ? '已启用' : '已停用' }}
          · {{ item.completed ? '已完成' : '待办' }}
        </text>
        <text v-if="item.description" class="desc">{{ item.description }}</text>
        <view class="card-actions">
          <text
            v-if="!item.completed"
            class="action-ok"
            @click="onComplete(item)"
          >完成</text>
          <text class="danger" @click="onDelete(item)">删除</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import * as reminderApi from '@/api/reminder';
import type { Reminder, ReminderStatusFilter } from '@/types/reminder';
import {
  recurrenceLabel,
  typeLabel,
} from '@/constants/reminderOptions';
import { formatDisplayDateTime } from '@/utils/formatDate';
import { getErrorMessage } from '@/utils/errorMessage';
import { getAccessToken } from '@/utils/storage';

const items = ref<Reminder[]>([]);
const status = ref<ReminderStatusFilter>('pending');
const loading = ref(false);
const refreshing = ref(false);
const error = ref('');

const statusFilters: Array<{ value: ReminderStatusFilter; label: string }> = [
  { value: 'pending', label: '待办' },
  { value: 'completed', label: '已完成' },
  { value: 'all', label: '全部' },
];

async function reload() {
  error.value = '';
  loading.value = true;
  try {
    const res = await reminderApi.listReminders({ status: status.value });
    items.value = res.data || [];
  } catch (err) {
    error.value = getErrorMessage(err);
  } finally {
    loading.value = false;
  }
}

async function onPull() {
  refreshing.value = true;
  try {
    const res = await reminderApi.listReminders({ status: status.value });
    items.value = res.data || [];
  } catch (err) {
    error.value = getErrorMessage(err);
  } finally {
    refreshing.value = false;
  }
}

function setStatus(v: ReminderStatusFilter) {
  status.value = v;
  reload();
}

function goAdd() {
  uni.navigateTo({ url: '/pages/records/reminder-form' });
}

async function onComplete(item: Reminder) {
  try {
    await reminderApi.completeReminder(item._id);
    uni.showToast({ title: '已完成', icon: 'success' });
    await reload();
  } catch (err) {
    uni.showToast({ title: getErrorMessage(err), icon: 'none' });
  }
}

function onDelete(item: Reminder) {
  uni.showModal({
    title: '删除提醒',
    content: `确定删除「${item.title}」？`,
    confirmColor: '#c0392b',
    success: async (res) => {
      if (!res.confirm) return;
      try {
        await reminderApi.deleteReminder(item._id);
        items.value = items.value.filter((x) => x._id !== item._id);
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
  margin-bottom: 16rpx;
}
.title { display: block; font-size: 36rpx; font-weight: 700; color: #1a2e28; }
.sub { display: block; margin-top: 6rpx; font-size: 22rpx; color: #7a8c85; }
.add-btn {
  background: #2d8a6e !important;
  color: #fff !important;
  border-radius: 999rpx;
  border: none;
}
.filters { display: flex; gap: 12rpx; margin-bottom: 16rpx; flex-wrap: wrap; }
.chip {
  padding: 10rpx 22rpx;
  border-radius: 999rpx;
  background: #e8eeeb;
  color: #5a6d66;
  font-size: 24rpx;
}
.chip.on {
  background: #2d8a6e;
  color: #fff;
  font-weight: 600;
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
.empty-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  margin-bottom: 24rpx;
  color: #1a2e28;
}
.primary {
  width: 60%;
  height: 84rpx;
  line-height: 84rpx;
  background: #2d8a6e;
  color: #fff;
  border-radius: 16rpx;
  border: none;
}
.list { height: calc(100vh - 220rpx); }
.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 16rpx;
  border-left: 8rpx solid #c9a227;
}
.card.done { opacity: 0.72; border-left-color: #9aaba4; }
.card.off { opacity: 0.65; }
.card-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}
.name {
  flex: 1;
  font-size: 30rpx;
  font-weight: 700;
  color: #1a2e28;
}
.type-tag {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
  background: #fff6d9;
  color: #8a6d12;
}
.due { display: block; font-size: 26rpx; color: #4a5c56; }
.meta-line {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #7a8c85;
}
.desc {
  display: block;
  margin-top: 10rpx;
  font-size: 24rpx;
  color: #5a6d66;
}
.card-actions {
  margin-top: 14rpx;
  display: flex;
  justify-content: flex-end;
  gap: 28rpx;
}
.action-ok { color: #1f6b54; font-size: 26rpx; font-weight: 600; }
.danger { color: #c0392b; font-size: 26rpx; }
</style>
