<template>
  <view class="page">
    <view class="header">
      <text class="title">BloodTrack</text>
      <text class="subtitle">手机 / 邮箱 统一登录</text>
    </view>

    <view class="card">
      <view class="tabs">
        <text class="tab" :class="{ active: mode === 'sms' }" @click="mode = 'sms'">验证码登录</text>
        <text class="tab" :class="{ active: mode === 'password' }" @click="mode = 'password'">密码登录</text>
      </view>

      <!-- SMS -->
      <view v-if="mode === 'sms'">
        <view class="field">
          <text class="label">手机号</text>
          <input class="input" type="number" maxlength="11" v-model="phone" placeholder="11 位手机号" :disabled="loading" />
        </view>
        <view class="field">
          <text class="label">验证码</text>
          <view class="code-row">
            <input class="input code-input" type="number" maxlength="6" v-model="smsCode" placeholder="6 位验证码" :disabled="loading" @confirm="onSmsLogin" />
            <button class="code-btn" size="mini" :disabled="loading || cooldown > 0 || sending" :loading="sending" @click="onSendCode">
              {{ cooldown > 0 ? `${cooldown}s` : '获取验证码' }}
            </button>
          </view>
        </view>
        <view v-if="devCode" class="dev-banner">
          <text class="dev-title">本地 Mock 验证码</text>
          <text class="dev-code" @click="smsCode = devCode">{{ devCode }}（点此填入）</text>
        </view>
        <text class="tip">未注册手机会自动创建账号</text>
      </view>

      <!-- Password: email OR phone -->
      <view v-else>
        <view class="field">
          <text class="label">手机号或邮箱</text>
          <input class="input" v-model="account" placeholder="手机号 / 邮箱" :disabled="loading" />
        </view>
        <view class="field">
          <text class="label">密码</text>
          <input class="input" password v-model="password" placeholder="登录密码" :disabled="loading" @confirm="onPasswordLogin" />
        </view>
        <text class="tip">手机号需先设置密码；邮箱注册默认已有密码</text>
      </view>

      <text v-if="error" class="error">{{ error }}</text>

      <button class="primary-btn" :loading="loading" :disabled="loading" @click="mode === 'sms' ? onSmsLogin() : onPasswordLogin()">
        登录
      </button>

      <view class="footer-row">
        <text class="muted">还没有账号？</text>
        <text class="link" @click="goRegister">去注册</text>
      </view>
    </view>

    <view class="hint">
      <text class="hint-text">API：{{ apiBase }}</text>
      <text class="hint-text">代理绕过 127.0.0.1；后端推荐 PORT=5001</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onUnmounted, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useAuthStore } from '@/stores/auth';
import * as authApi from '@/api/auth';
import { getErrorMessage } from '@/utils/errorMessage';
import { API_BASE_URL } from '@/config/env';
import { getAccessToken } from '@/utils/storage';

const auth = useAuthStore();
const mode = ref<'sms' | 'password'>('sms');
const phone = ref('');
const smsCode = ref('');
const account = ref('');
const password = ref('');
const devCode = ref('');
const error = ref('');
const loading = ref(false);
const sending = ref(false);
const cooldown = ref(0);
const apiBase = API_BASE_URL;
let cooldownTimer: ReturnType<typeof setInterval> | null = null;

onShow(() => {
  if (getAccessToken() && auth.user) {
    uni.switchTab({ url: '/pages/home/index' });
  }
});

onUnmounted(() => {
  if (cooldownTimer) clearInterval(cooldownTimer);
});

function startCooldown(seconds: number) {
  cooldown.value = seconds;
  if (cooldownTimer) clearInterval(cooldownTimer);
  cooldownTimer = setInterval(() => {
    cooldown.value -= 1;
    if (cooldown.value <= 0 && cooldownTimer) {
      clearInterval(cooldownTimer);
      cooldownTimer = null;
      cooldown.value = 0;
    }
  }, 1000);
}

function normalizePhone(raw: string) {
  return raw.replace(/\D/g, '');
}

async function onSendCode() {
  error.value = '';
  devCode.value = '';
  const p = normalizePhone(phone.value);
  if (!/^1\d{10}$/.test(p)) {
    error.value = '请输入有效的 11 位手机号';
    return;
  }
  sending.value = true;
  try {
    const res = await authApi.sendSmsCode(p, 'login');
    if (res.devCode) devCode.value = res.devCode;
    startCooldown(res.cooldown || 60);
    uni.showToast({ title: '验证码已发送', icon: 'none' });
  } catch (err) {
    error.value = getErrorMessage(err, '发送失败');
  } finally {
    sending.value = false;
  }
}

async function onSmsLogin() {
  error.value = '';
  const p = normalizePhone(phone.value);
  const code = smsCode.value.trim();
  if (!/^1\d{10}$/.test(p)) {
    error.value = '请输入有效的 11 位手机号';
    return;
  }
  if (!/^\d{4,8}$/.test(code)) {
    error.value = '请输入验证码';
    return;
  }
  loading.value = true;
  try {
    await auth.loginWithSms({ phone: p, code });
    uni.showToast({ title: '登录成功', icon: 'success' });
    uni.switchTab({ url: '/pages/home/index' });
  } catch (err) {
    error.value = getErrorMessage(err, '登录失败');
  } finally {
    loading.value = false;
  }
}

async function onPasswordLogin() {
  error.value = '';
  const acc = account.value.trim();
  const pw = password.value;
  if (!acc) {
    error.value = '请输入手机号或邮箱';
    return;
  }
  if (!pw) {
    error.value = '请输入密码';
    return;
  }
  loading.value = true;
  try {
    await auth.login({ account: acc, password: pw });
    uni.showToast({ title: '登录成功', icon: 'success' });
    uni.switchTab({ url: '/pages/home/index' });
  } catch (err) {
    error.value = getErrorMessage(err, '登录失败');
  } finally {
    loading.value = false;
  }
}

function goRegister() {
  uni.navigateTo({ url: '/pages/auth/register' });
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  padding: 0 0 80rpx;
  background: linear-gradient(180deg, #d4f0e4 0%, #f2f5f4 38%, #f2f5f4 100%);
  box-sizing: border-box;
}
.header {
  margin: 0;
  padding: 88rpx 48rpx 40rpx;
}
.title {
  display: block;
  font-size: 52rpx;
  font-weight: 800;
  color: #15241f;
  letter-spacing: 1rpx;
}
.subtitle {
  display: block;
  margin-top: 14rpx;
  font-size: 28rpx;
  color: #5c6f68;
}
.card {
  margin: 0 32rpx;
  background: #fff;
  border-radius: 28rpx;
  padding: 36rpx 32rpx;
  box-shadow: 0 16rpx 48rpx rgba(21, 36, 31, 0.08);
}
.tabs {
  display: flex;
  gap: 8rpx;
  margin-bottom: 32rpx;
  background: #f0f4f2;
  border-radius: 16rpx;
  padding: 6rpx;
}
.tab {
  flex: 1;
  text-align: center;
  font-size: 28rpx;
  color: #5c6f68;
  padding: 18rpx 0;
  border-radius: 12rpx;
}
.tab.active {
  background: #fff;
  color: #1f6b54;
  font-weight: 700;
  box-shadow: 0 2rpx 10rpx rgba(21, 36, 31, 0.06);
}
.field { margin-bottom: 24rpx; }
.label {
  display: block;
  font-size: 26rpx;
  color: #5c6f68;
  margin-bottom: 12rpx;
  font-weight: 500;
}
.input {
  height: 92rpx;
  padding: 0 24rpx;
  background: #f4f7f6;
  border-radius: 16rpx;
  font-size: 30rpx;
  color: #15241f;
}
.code-row { display: flex; gap: 12rpx; align-items: center; }
.code-input { flex: 1; }
.code-btn {
  flex-shrink: 0;
  background: #e8f6ef !important;
  color: #1f6b54 !important;
  border: none;
  border-radius: 14rpx;
  font-size: 24rpx;
  height: 80rpx;
  line-height: 80rpx;
  padding: 0 20rpx;
  font-weight: 600;
}
.code-btn::after { border: none; }
.dev-banner {
  background: #fff8e6;
  border-radius: 14rpx;
  padding: 18rpx 22rpx;
  margin-bottom: 16rpx;
  border: 1rpx solid #f5e6b8;
}
.dev-title { display: block; font-size: 22rpx; color: #a67c00; }
.dev-code {
  display: block;
  margin-top: 6rpx;
  font-size: 34rpx;
  font-weight: 700;
  color: #8a6500;
}
.tip {
  display: block;
  font-size: 22rpx;
  color: #8b9b95;
  margin-bottom: 16rpx;
  line-height: 1.5;
}
.error {
  display: block;
  color: #d14343;
  font-size: 26rpx;
  margin-bottom: 16rpx;
}
.primary-btn {
  height: 96rpx;
  line-height: 96rpx;
  background: linear-gradient(135deg, #2aa87a 0%, #1f8a68 100%);
  color: #fff;
  border-radius: 18rpx;
  font-size: 32rpx;
  border: none;
  font-weight: 700;
  box-shadow: 0 10rpx 24rpx rgba(31, 138, 104, 0.28);
}
.primary-btn::after { border: none; }
.footer-row {
  margin-top: 32rpx;
  display: flex;
  justify-content: center;
  gap: 12rpx;
}
.muted { font-size: 26rpx; color: #5c6f68; }
.link { font-size: 26rpx; color: #1f8a68; font-weight: 600; }
.hint { margin: 36rpx 48rpx 0; }
.hint-text {
  display: block;
  font-size: 22rpx;
  color: #8b9b95;
  line-height: 1.6;
}
</style>
