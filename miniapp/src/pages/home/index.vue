<template>
  <view class="page">
    <view class="hero">
      <view class="hero-top">
        <view>
          <text class="hello">你好，{{ auth.displayName || '用户' }}</text>
          <text class="date-line">{{ todayText }}</text>
        </view>
        <view class="hero-badge" @click="goMine">我的</view>
      </view>
      <view class="stat-row">
        <view class="stat" @click="goBlood">
          <text class="stat-num">{{ summary?.totalTests ?? recent.length }}</text>
          <text class="stat-label">血检次数</text>
        </view>
        <view class="stat" @click="goBlood">
          <text class="stat-num warn">{{ summary?.abnormalRate ?? '—' }}{{ summary ? '%' : '' }}</text>
          <text class="stat-label">异常率</text>
        </view>
        <view class="stat" @click="goReminders">
          <text class="stat-num">{{ upcoming.length }}</text>
          <text class="stat-label">近期待办</text>
        </view>
      </view>
    </view>

    <!-- 检查类：拆分血常规与肝/肾/电解质（对齐参考小程序） -->
    <view class="section-label">检查指标</view>
    <view class="quick">
      <view class="q-item" @click="goBlood">
        <FeatureIcon name="blood" size="md" />
        <text class="q-name">血常规</text>
      </view>
      <view class="q-item" @click="goTrend('liver')">
        <FeatureIcon name="liver" size="md" />
        <text class="q-name">肝功能</text>
      </view>
      <view class="q-item" @click="goTrend('kidney')">
        <FeatureIcon name="kidney" size="md" />
        <text class="q-name">肾功能</text>
      </view>
      <view class="q-item" @click="goTrend('electrolyte')">
        <FeatureIcon name="electrolyte" size="md" />
        <text class="q-name">电解质</text>
      </view>
    </view>

    <!-- 与上方「检查指标」分工：这里只放治疗/提醒/导航，不再挂「生化记录」避免口径重复 -->
    <view class="section-label">治疗与提醒</view>
    <view class="quick">
      <view class="q-item" @click="goCycle">
        <FeatureIcon name="cycle" size="md" />
        <text class="q-name">化疗周期</text>
      </view>
      <view class="q-item" @click="goReminders">
        <FeatureIcon name="remind" size="md" />
        <text class="q-name">提醒</text>
      </view>
      <view class="q-item" @click="goCalendar">
        <FeatureIcon name="calendar" size="md" />
        <text class="q-name">记录日历</text>
      </view>
      <view class="q-item" @click="goTrend('blood')">
        <FeatureIcon name="trend" size="md" />
        <text class="q-name">趋势分析</text>
      </view>
    </view>

    <view class="card">
      <view class="card-head">
        <text class="card-title">近期提醒</text>
        <text class="more" @click="goReminders">全部</text>
      </view>
      <view v-if="reminderLoading" class="tip">加载中…</view>
      <view v-else-if="!upcoming.length" class="empty">
        <text class="empty-t">近 7 天暂无待办</text>
        <text class="empty-a" @click="openAddReminder">去创建</text>
      </view>
      <view
        v-for="r in upcoming"
        :key="r._id"
        class="item"
        @click="goReminders"
      >
        <view class="item-dot remind" />
        <view class="item-main">
          <text class="item-title">{{ r.title }}</text>
          <text class="item-sub">{{ formatDisplayDateTime(r.dueDate) }}</text>
        </view>
        <text class="chev">›</text>
      </view>
    </view>

    <view class="card">
      <view class="card-head">
        <text class="card-title">最近血常规</text>
        <text class="more" @click="goBlood">全部</text>
      </view>
      <view v-if="loading" class="tip">加载中…</view>
      <view v-else-if="loadError" class="tip bad">
        {{ loadError }}
        <text class="more" @click="loadRecent"> 重试</text>
      </view>
      <view v-else-if="!recent.length" class="empty">
        <text class="empty-t">还没有记录</text>
        <text class="empty-a" @click="openAddBlood">添加第一条</text>
      </view>
      <view
        v-for="item in recent"
        :key="item._id"
        class="item"
        @click="goBlood"
      >
        <view class="item-dot" :class="item.isAbnormal ? 'bad' : 'ok'" />
        <view class="item-main">
          <text class="item-title">{{ formatDisplayDate(item.date) }}</text>
          <text class="item-sub">
            白细胞 {{ item.wbc }} · 血红蛋白 {{ item.hgb }} · 血小板 {{ item.plt }}
          </text>
        </view>
        <text class="status" :class="item.isAbnormal ? 'bad' : 'ok'">
          {{ item.isAbnormal ? '异常' : '正常' }}
        </text>
      </view>
    </view>

    <view class="hint-bar">
      底部可切换「日历 / 趋势 / 我的」· 右下角 + 快速新增
    </view>

    <AppFab />
  </view>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import AppFab from '@/components/AppFab.vue';
import FeatureIcon from '@/components/FeatureIcon.vue';
import { useAuthStore } from '@/stores/auth';
import * as bloodApi from '@/api/bloodTest';
import * as reminderApi from '@/api/reminder';
import * as analyticsApi from '@/api/analytics';
import type { AnalyticsSummary } from '@/api/analytics';
import type { BloodTest } from '@/types/bloodTest';
import type { Reminder } from '@/types/reminder';
import { formatDisplayDate, formatDisplayDateTime } from '@/utils/formatDate';
import { getErrorMessage } from '@/utils/errorMessage';
import { getAccessToken } from '@/utils/storage';

const auth = useAuthStore();
const recent = ref<BloodTest[]>([]);
const upcoming = ref<Reminder[]>([]);
const summary = ref<AnalyticsSummary | null>(null);
const loading = ref(false);
const reminderLoading = ref(false);
const loadError = ref('');

const todayText = computed(() => {
  const d = new Date();
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日`;
});

onShow(async () => {
  if (!getAccessToken()) {
    uni.reLaunch({ url: '/pages/auth/login' });
    return;
  }
  if (!auth.user) {
    try {
      await auth.refreshProfile();
    } catch {
      uni.reLaunch({ url: '/pages/auth/login' });
      return;
    }
  }
  await Promise.all([loadRecent(), loadUpcoming(), loadSummary()]);
});

async function loadRecent() {
  loading.value = true;
  loadError.value = '';
  try {
    const res = await bloodApi.listBloodTests(1, 5);
    recent.value = res.data;
  } catch (err) {
    loadError.value = getErrorMessage(err, '加载失败');
  } finally {
    loading.value = false;
  }
}

async function loadUpcoming() {
  reminderLoading.value = true;
  try {
    const res = await reminderApi.listUpcomingReminders(7);
    upcoming.value = (res.data || []).slice(0, 5);
  } catch {
    upcoming.value = [];
  } finally {
    reminderLoading.value = false;
  }
}

async function loadSummary() {
  try {
    summary.value = await analyticsApi.getAnalyticsSummary();
  } catch {
    summary.value = null;
  }
}

function goBlood() {
  uni.navigateTo({ url: '/pages/records/blood-list' });
}
function goCycle() {
  uni.navigateTo({ url: '/pages/records/cycle-list' });
}
function goReminders() {
  uni.navigateTo({ url: '/pages/records/reminder-list' });
}
function goCalendar() {
  uni.switchTab({ url: '/pages/records/calendar' });
}
function goTrend(panel: 'liver' | 'kidney' | 'electrolyte' | 'blood') {
  // tab 页不能带 query，先缓存再进趋势
  try {
    uni.setStorageSync('bt_trend_panel', panel);
  } catch {
    /* ignore */
  }
  uni.switchTab({ url: '/pages/analytics/index' });
}
function goMine() {
  uni.switchTab({ url: '/pages/mine/index' });
}
function openAddBlood() {
  uni.navigateTo({ url: '/pages/records/blood-form' });
}
function openAddReminder() {
  uni.navigateTo({ url: '/pages/records/reminder-form' });
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  padding: 24rpx 24rpx calc(180rpx + env(safe-area-inset-bottom));
  background: #f2f5f4;
  box-sizing: border-box;
}
.hero {
  background: linear-gradient(155deg, #ccefdc 0%, #eefaf4 42%, #ffffff 100%);
  border-radius: 28rpx;
  padding: 32rpx 28rpx 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 12rpx 36rpx rgba(31, 138, 104, 0.1);
  border: 1rpx solid rgba(31, 138, 104, 0.06);
}
.hero-top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 28rpx;
}
.hello {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #15241f;
  letter-spacing: 0.5rpx;
}
.date-line {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #5c6f68;
}
.hero-badge {
  padding: 12rpx 24rpx;
  border-radius: 999rpx;
  background: rgba(255, 255, 255, 0.9);
  color: #1f6b54;
  font-size: 24rpx;
  font-weight: 600;
  box-shadow: 0 4rpx 12rpx rgba(31, 138, 104, 0.08);
}
.hero-badge:active {
  opacity: 0.85;
}
.stat-row {
  display: flex;
  gap: 12rpx;
}
.stat {
  flex: 1;
  background: rgba(255, 255, 255, 0.92);
  border-radius: 20rpx;
  padding: 20rpx 8rpx;
  text-align: center;
  box-shadow: 0 4rpx 12rpx rgba(21, 36, 31, 0.04);
}
.stat:active {
  opacity: 0.9;
}
.stat-num {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #15241f;
}
.stat-num.warn {
  color: #d14343;
}
.stat-label {
  display: block;
  margin-top: 6rpx;
  font-size: 20rpx;
  color: #8b9b95;
}
.section-label {
  font-size: 24rpx;
  color: #8b9b95;
  font-weight: 600;
  margin: 4rpx 8rpx 12rpx;
  letter-spacing: 1rpx;
}
.quick {
  display: flex;
  gap: 12rpx;
  margin-bottom: 20rpx;
}
.q-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #fff;
  border-radius: 22rpx;
  padding: 20rpx 6rpx 16rpx;
  text-align: center;
  box-shadow: 0 8rpx 22rpx rgba(21, 36, 31, 0.05);
}
.q-item:active {
  transform: scale(0.97);
  opacity: 0.9;
}
.q-name {
  margin-top: 12rpx;
  font-size: 22rpx;
  color: #15241f;
  font-weight: 600;
}
.card {
  background: #fff;
  border-radius: 28rpx;
  padding: 8rpx 20rpx 12rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 8rpx 28rpx rgba(21, 36, 31, 0.05);
}
.card-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 8rpx 10rpx;
}
.card-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #15241f;
}
.more {
  font-size: 24rpx;
  color: #1f8a68;
  font-weight: 600;
}
.tip {
  padding: 20rpx 8rpx;
  font-size: 26rpx;
  color: #8b9b95;
}
.tip.bad { color: #d14343; }
.empty {
  padding: 32rpx 8rpx 36rpx;
  text-align: center;
}
.empty-t {
  display: block;
  font-size: 26rpx;
  color: #8b9b95;
  margin-bottom: 12rpx;
}
.empty-a {
  font-size: 26rpx;
  color: #1f8a68;
  font-weight: 600;
}
.item {
  display: flex;
  align-items: center;
  padding: 22rpx 8rpx;
  border-top: 1rpx solid #eef3f1;
}
.item:active {
  background: #f7faf9;
}
.item-dot {
  width: 14rpx;
  height: 14rpx;
  border-radius: 50%;
  margin-right: 16rpx;
  background: #c5d0cb;
  flex-shrink: 0;
}
.item-dot.ok { background: #1f8a68; }
.item-dot.bad { background: #d14343; }
.item-dot.remind { background: #f59e0b; }
.item-main { flex: 1; min-width: 0; }
.item-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #15241f;
}
.item-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #8b9b95;
}
.chev {
  font-size: 34rpx;
  color: #c5d0cb;
  margin-left: 8rpx;
}
.status {
  font-size: 20rpx;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  font-weight: 500;
}
.status.ok {
  background: #e8f6ef;
  color: #1f6b54;
}
.status.bad {
  background: #fdeceb;
  color: #d14343;
}
.hint-bar {
  text-align: center;
  font-size: 22rpx;
  color: #b0bdb7;
  padding: 8rpx 12rpx 24rpx;
  line-height: 1.5;
}
</style>
