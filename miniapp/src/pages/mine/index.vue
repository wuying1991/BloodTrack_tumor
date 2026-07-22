<template>
  <view class="page">
    <!-- 仅进入个人资料（改姓名），不与账号安全混用 -->
    <view class="hero" @click="go('/pages/settings/profile')">
      <view class="avatar">{{ initial }}</view>
      <view class="hero-text">
        <text class="name">{{ auth.displayName || '用户' }}</text>
        <text class="sub">{{ auth.user?.email || auth.user?.phone || '未完善登录方式' }}</text>
        <text class="edit-hint">点击修改姓名</text>
      </view>
      <text class="hero-chev">›</text>
    </view>

    <view class="card">
      <text class="card-title">账号</text>
      <view class="menu-item" @click="go('/pages/settings/account')">
        <FeatureIcon name="account" size="sm" />
        <view class="mi-body">
          <text class="mi-label">账号与安全</text>
          <text class="mi-desc">手机号 · 邮箱 · 登录密码</text>
        </view>
        <text class="mi-arrow">›</text>
      </view>
      <view class="menu-item methods">
        <text class="mi-label soft">当前登录方式</text>
        <view class="tags">
          <text v-if="auth.user?.methods?.emailPassword" class="tag">邮箱密码</text>
          <text v-if="auth.user?.methods?.phonePassword" class="tag">手机密码</text>
          <text v-if="auth.user?.methods?.phoneSms" class="tag">手机验证码</text>
          <text v-if="!hasAnyMethod" class="tag muted">—</text>
        </view>
      </view>
    </view>

    <!--
      与首页口径一致，避免「生化」与肝/肾/电解质并列：
      - 血常规 = 独立列表
      - 肝/肾/电解质 = 同属生化检查，只保留一个列表入口
      - 化疗 / 提醒 = 治疗类，与检查分开
      分类录入请用右下角「+」或首页检查入口。
    -->
    <view class="card">
      <text class="card-title">检查记录</text>
      <view class="menu-item" @click="go('/pages/records/blood-list')">
        <FeatureIcon name="blood" size="sm" />
        <view class="mi-body">
          <text class="mi-label">血常规</text>
          <text class="mi-desc">白细胞 · 血红蛋白 · 血小板等</text>
        </view>
        <text class="mi-arrow">›</text>
      </view>
      <view class="menu-item" @click="go('/pages/records/biochem-list')">
        <FeatureIcon name="biochem" size="sm" />
        <view class="mi-body">
          <text class="mi-label">生化检查</text>
          <text class="mi-desc">肝功能 · 肾功能 · 电解质</text>
        </view>
        <text class="mi-arrow">›</text>
      </view>
    </view>

    <view class="card">
      <text class="card-title">治疗与提醒</text>
      <view class="menu-item" @click="go('/pages/records/cycle-list')">
        <FeatureIcon name="cycle" size="sm" />
        <view class="mi-body">
          <text class="mi-label">化疗周期</text>
          <text class="mi-desc">疗程与用药记录</text>
        </view>
        <text class="mi-arrow">›</text>
      </view>
      <view class="menu-item" @click="go('/pages/records/reminder-list')">
        <FeatureIcon name="remind" size="sm" />
        <view class="mi-body">
          <text class="mi-label">提醒管理</text>
          <text class="mi-desc">复查 · 用药 · 待办</text>
        </view>
        <text class="mi-arrow">›</text>
      </view>
    </view>

    <button class="logout" :loading="auth.loading" @click="onLogout">退出登录</button>
    <text class="ver">BloodTrack · 本地可测版</text>

    <AppFab />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import AppFab from '@/components/AppFab.vue';
import FeatureIcon from '@/components/FeatureIcon.vue';
import { useAuthStore } from '@/stores/auth';
import { getAccessToken } from '@/utils/storage';

const auth = useAuthStore();

const initial = computed(() => {
  const n = auth.displayName || '用';
  return n.slice(0, 1);
});

const hasAnyMethod = computed(() => {
  const m = auth.user?.methods;
  return !!(m?.emailPassword || m?.phonePassword || m?.phoneSms);
});

onShow(async () => {
  if (!getAccessToken()) {
    uni.reLaunch({ url: '/pages/auth/login' });
    return;
  }
  try {
    await auth.refreshProfile();
  } catch {
    if (!auth.user) {
      uni.reLaunch({ url: '/pages/auth/login' });
    }
  }
});

function go(url: string) {
  uni.navigateTo({ url });
}

async function onLogout() {
  uni.showModal({
    title: '退出登录',
    content: '确定退出当前账号？',
    success: async (res) => {
      if (!res.confirm) return;
      await auth.logout();
      uni.reLaunch({ url: '/pages/auth/login' });
    },
  });
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
  display: flex;
  align-items: center;
  gap: 24rpx;
  background: linear-gradient(145deg, #d4f0e4 0%, #ffffff 62%);
  border-radius: 28rpx;
  padding: 36rpx 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 10rpx 32rpx rgba(31, 138, 104, 0.1);
}
.hero:active {
  opacity: 0.92;
}
.avatar {
  width: 104rpx;
  height: 104rpx;
  border-radius: 50%;
  background: linear-gradient(145deg, #2aa87a, #1f8a68);
  color: #fff;
  font-size: 42rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 20rpx rgba(31, 138, 104, 0.28);
  flex-shrink: 0;
}
.hero-text {
  flex: 1;
  min-width: 0;
}
.name {
  display: block;
  font-size: 38rpx;
  font-weight: 700;
  color: #15241f;
}
.sub {
  display: block;
  margin-top: 8rpx;
  font-size: 24rpx;
  color: #5c6f68;
  word-break: break-all;
}
.edit-hint {
  display: block;
  margin-top: 10rpx;
  font-size: 22rpx;
  color: #1f8a68;
  font-weight: 500;
}
.hero-chev {
  font-size: 40rpx;
  color: #b7c9c0;
  flex-shrink: 0;
}
.card {
  background: #fff;
  border-radius: 28rpx;
  padding: 8rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 8rpx 28rpx rgba(21, 36, 31, 0.05);
}
.card-title {
  display: block;
  padding: 20rpx 24rpx 8rpx;
  font-size: 24rpx;
  font-weight: 600;
  color: #8b9b95;
  letter-spacing: 1rpx;
}
.menu-item {
  display: flex;
  align-items: center;
  padding: 24rpx 20rpx;
  margin: 0 8rpx;
  border-radius: 16rpx;
}
.menu-item:active {
  background: #f4faf7;
}
.menu-item :deep(.fi) {
  margin-right: 18rpx;
}
.mi-body {
  flex: 1;
  min-width: 0;
}
.mi-label {
  flex: 1;
  font-size: 30rpx;
  color: #15241f;
  font-weight: 500;
}
.mi-body .mi-label {
  display: block;
  flex: none;
}
.mi-desc {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #8b9b95;
}
.mi-label.soft {
  flex: none;
  margin-right: 16rpx;
  color: #5c6f68;
  font-size: 28rpx;
}
.mi-arrow {
  font-size: 36rpx;
  color: #c5d0cb;
  line-height: 1;
}
.methods {
  align-items: flex-start;
}
.tags {
  flex: 1;
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  justify-content: flex-end;
}
.tag {
  font-size: 20rpx;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: #e8f6ef;
  color: #1f6b54;
}
.tag.muted {
  background: #f0f4f2;
  color: #9aaba4;
}
.logout {
  margin-top: 12rpx;
  height: 92rpx;
  line-height: 92rpx;
  background: #fff;
  color: #d14343;
  border-radius: 20rpx;
  font-size: 30rpx;
  border: 1rpx solid #f3cfcf;
  font-weight: 500;
}
.logout::after {
  border: none;
}
.ver {
  display: block;
  text-align: center;
  margin-top: 28rpx;
  font-size: 22rpx;
  color: #b0bdb7;
}
</style>
