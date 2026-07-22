<template>
  <view class="page">
    <text class="heading">新增提醒</text>
    <text class="hint">应用内提醒列表；订阅消息后续再接</text>

    <view class="card">
      <view class="field">
        <text class="label">标题 *</text>
        <input class="input" v-model="title" placeholder="如：下周复查血常规" maxlength="120" />
      </view>

      <view class="field">
        <text class="label">类型</text>
        <view class="chips">
          <text
            v-for="t in REMINDER_TYPES"
            :key="t.value"
            class="chip"
            :class="{ on: type === t.value }"
            @click="type = t.value"
          >{{ t.label }}</text>
        </view>
      </view>

      <view class="field">
        <text class="label">到期日期 *</text>
        <picker mode="date" :value="dueDate" :start="today" @change="onDate">
          <view class="picker">{{ formatChineseDate(dueDate) }}</view>
        </picker>
      </view>

      <view class="field">
        <text class="label">时间</text>
        <picker mode="time" :value="dueTime" @change="onTime">
          <view class="picker">{{ formatChineseTime(dueTime) }}</view>
        </picker>
      </view>

      <view class="field">
        <text class="label">重复</text>
        <view class="chips">
          <text
            v-for="r in REMINDER_RECURRENCES"
            :key="r.value"
            class="chip"
            :class="{ on: recurrence === r.value }"
            @click="recurrence = r.value"
          >{{ r.label }}</text>
        </view>
      </view>

      <view class="field row-switch">
        <text class="label">启用提醒</text>
        <switch :checked="enabled" color="#2d8a6e" @change="onEnabled" />
      </view>

      <view class="field">
        <text class="label">备注</text>
        <textarea class="textarea" v-model="description" maxlength="1000" placeholder="可选" />
      </view>
    </view>

    <text v-if="error" class="error">{{ error }}</text>
    <button class="primary" :loading="submitting" @click="onSubmit">保存</button>
    <button class="ghost" @click="onCancel">取消</button>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import * as reminderApi from '@/api/reminder';
import type { ReminderRecurrence, ReminderType } from '@/types/reminder';
import {
  REMINDER_RECURRENCES,
  REMINDER_TYPES,
} from '@/constants/reminderOptions';
import {
  formatChineseDate,
  formatChineseTime,
  todayDateInput,
} from '@/utils/formatDate';
import { getErrorMessage } from '@/utils/errorMessage';
import { getAccessToken } from '@/utils/storage';

const today = todayDateInput();
const title = ref('');
const description = ref('');
const type = ref<ReminderType>('blood-test');
const recurrence = ref<ReminderRecurrence>('none');
const dueDate = ref(todayDateInput());
const dueTime = ref('09:00');
const enabled = ref(true);
const submitting = ref(false);
const error = ref('');

onLoad(() => {
  if (!getAccessToken()) uni.reLaunch({ url: '/pages/auth/login' });
});

function onDate(e: any) {
  dueDate.value = String(e?.detail?.value ?? '');
}

function onTime(e: any) {
  dueTime.value = String(e?.detail?.value ?? '09:00');
}

function onEnabled(e: any) {
  enabled.value = !!e?.detail?.value;
}

function buildDueIso(): string {
  const [y, m, d] = dueDate.value.split('-').map(Number);
  const [hh, mm] = dueTime.value.split(':').map(Number);
  const local = new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0);
  return local.toISOString();
}

async function onSubmit() {
  error.value = '';
  try {
    const t = title.value.trim();
    if (!t) throw new Error('请填写标题');
    if (!dueDate.value) throw new Error('请选择到期日期');

    submitting.value = true;
    await reminderApi.createReminder({
      title: t,
      description: description.value.trim() || undefined,
      type: type.value,
      dueDate: buildDueIso(),
      recurrence: recurrence.value,
      enabled: enabled.value,
      notifications: { email: true, push: true },
    });
    uni.showToast({ title: '已保存', icon: 'success' });
    setTimeout(() => {
      uni.navigateBack({
        fail: () => uni.redirectTo({ url: '/pages/records/reminder-list' }),
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
    fail: () => uni.redirectTo({ url: '/pages/records/reminder-list' }),
  });
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  padding: 24rpx 24rpx calc(40rpx + env(safe-area-inset-bottom));
  background: #f5f7f6;
  box-sizing: border-box;
}
.heading { display: block; font-size: 36rpx; font-weight: 700; color: #1a2e28; }
.hint { display: block; margin: 8rpx 0 20rpx; font-size: 22rpx; color: #7a8c85; }
.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 20rpx 24rpx 24rpx;
  margin-bottom: 16rpx;
}
.field { margin-top: 18rpx; }
.label { display: block; font-size: 26rpx; color: #4a5c56; margin-bottom: 10rpx; }
.input {
  height: 84rpx;
  padding: 0 20rpx;
  background: #f0f4f2;
  border-radius: 14rpx;
  font-size: 28rpx;
}
.picker {
  height: 84rpx;
  line-height: 84rpx;
  padding: 0 20rpx;
  background: #f0f4f2;
  border-radius: 14rpx;
  font-size: 28rpx;
}
.chips { display: flex; flex-wrap: wrap; gap: 12rpx; }
.chip {
  padding: 12rpx 20rpx;
  border-radius: 999rpx;
  background: #f0f4f2;
  color: #5a6d66;
  font-size: 24rpx;
}
.chip.on {
  background: #2d8a6e;
  color: #fff;
  font-weight: 600;
}
.row-switch {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.textarea {
  width: 100%;
  min-height: 140rpx;
  padding: 16rpx 20rpx;
  background: #f0f4f2;
  border-radius: 14rpx;
  box-sizing: border-box;
}
.error { display: block; color: #c0392b; margin-bottom: 12rpx; font-size: 26rpx; }
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
