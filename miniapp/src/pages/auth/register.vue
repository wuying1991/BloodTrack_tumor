<template>
  <view class="page">
    <view class="card">
      <text class="card-title">注册账号</text>
      <view class="tabs">
        <text class="tab" :class="{ active: mode === 'phone' }" @click="mode = 'phone'">手机号</text>
        <text class="tab" :class="{ active: mode === 'email' }" @click="mode = 'email'">邮箱</text>
      </view>

      <!-- Phone SMS register (= login auto-create) -->
      <view v-if="mode === 'phone'">
        <view class="field">
          <text class="label">姓名（可选）</text>
          <input class="input" v-model="fullName" placeholder="默认：用户+尾号" :disabled="loading" />
        </view>
        <view class="field">
          <text class="label">手机号</text>
          <input class="input" type="number" maxlength="11" v-model="phone" placeholder="11 位手机号" :disabled="loading" />
        </view>
        <view class="field">
          <text class="label">验证码</text>
          <view class="code-row">
            <input class="input code-input" type="number" maxlength="6" v-model="smsCode" placeholder="6 位验证码" :disabled="loading" />
            <button class="code-btn" size="mini" :disabled="loading || cooldown > 0 || sending" :loading="sending" @click="onSendCode">
              {{ cooldown > 0 ? `${cooldown}s` : '获取验证码' }}
            </button>
          </view>
        </view>
        <view v-if="isDevelopment && devCode" class="dev-banner">
          <text class="dev-code" @click="smsCode = devCode">{{ devCode }}（点此填入）</text>
        </view>
        <text class="hint-line">注册后可在「账号与安全」设置密码、绑定邮箱</text>
      </view>

      <!-- Email register -->
      <view v-else>
        <view class="field">
          <text class="label">姓名</text>
          <input class="input" v-model="fullName" placeholder="您的姓名" :disabled="loading" />
        </view>
        <view class="field">
          <text class="label">邮箱</text>
          <input class="input" v-model="email" placeholder="you@example.com" :disabled="loading" />
        </view>
        <view class="field">
          <text class="label">密码</text>
          <input class="input" password v-model="password" placeholder="大小写+数字，≥6 位" :disabled="loading" />
        </view>
        <view class="field">
          <text class="label">确认密码</text>
          <input class="input" password v-model="confirmPassword" placeholder="再次输入" :disabled="loading" />
        </view>
        <text class="hint-line">注册后可在「账号与安全」绑定手机号</text>
      </view>

      <text v-if="error" class="error">{{ error }}</text>

      <button class="primary-btn" :loading="loading" :disabled="loading" @click="onSubmit">
        注册并登录
      </button>

      <view class="footer-row">
        <text class="muted">已有账号？</text>
        <text class="link" @click="goLogin">去登录</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { onUnmounted, ref } from 'vue';
import { useAuthStore } from '@/stores/auth';
import * as authApi from '@/api/auth';
import { IS_DEVELOPMENT } from '@/config/env';
import { devOnlyValue } from '@/utils/devFeatures';
import { getErrorMessage } from '@/utils/errorMessage';

const auth = useAuthStore();
const isDevelopment = IS_DEVELOPMENT;
const mode = ref<'phone' | 'email'>('phone');
const fullName = ref('');
const phone = ref('');
const smsCode = ref('');
const email = ref('');
const password = ref('');
const confirmPassword = ref('');
const devCode = ref('');
const error = ref('');
const loading = ref(false);
const sending = ref(false);
const cooldown = ref(0);
let cooldownTimer: ReturnType<typeof setInterval> | null = null;

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
    devCode.value = devOnlyValue(res.devCode, isDevelopment);
    startCooldown(res.cooldown || 60);
  } catch (err) {
    error.value = getErrorMessage(err, '发送失败');
  } finally {
    sending.value = false;
  }
}

async function onSubmit() {
  error.value = '';
  loading.value = true;
  try {
    if (mode.value === 'phone') {
      const p = normalizePhone(phone.value);
      const code = smsCode.value.trim();
      if (!/^1\d{10}$/.test(p)) throw new Error('请输入有效的 11 位手机号');
      if (!/^\d{4,8}$/.test(code)) throw new Error('请输入验证码');
      await auth.loginWithSms({
        phone: p,
        code,
        fullName: fullName.value.trim() || undefined,
      });
    } else {
      const name = fullName.value.trim();
      const e = email.value.trim();
      const pw = password.value;
      if (!name) throw new Error('请输入姓名');
      if (!e) throw new Error('请输入邮箱');
      if (!pw) throw new Error('请输入密码');
      if (pw !== confirmPassword.value) throw new Error('两次输入的密码不一致');
      if (pw.length < 6) throw new Error('密码至少 6 个字符');
      if (!/(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/.test(pw)) {
        throw new Error('密码必须包含大小写字母和数字');
      }
      await auth.register({ email: e, password: pw, fullName: name });
    }
    uni.showToast({ title: '注册成功', icon: 'success' });
    uni.switchTab({ url: '/pages/home/index' });
  } catch (err) {
    error.value = getErrorMessage(err, '注册失败');
  } finally {
    loading.value = false;
  }
}

function goLogin() {
  uni.navigateBack({
    fail: () => uni.reLaunch({ url: '/pages/auth/login' }),
  });
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  padding: 40rpx 32rpx 80rpx;
  background: linear-gradient(180deg, #d4f0e4 0%, #f2f5f4 36%, #f2f5f4 100%);
  box-sizing: border-box;
}
.card {
  background: #fff;
  border-radius: 28rpx;
  padding: 40rpx 32rpx;
  box-shadow: 0 16rpx 48rpx rgba(21, 36, 31, 0.08);
}
.card-title {
  display: block;
  font-size: 34rpx;
  font-weight: 600;
  color: #1a2e28;
  margin-bottom: 20rpx;
}
.tabs {
  display: flex;
  gap: 12rpx;
  margin-bottom: 28rpx;
  background: #f0f4f2;
  border-radius: 14rpx;
  padding: 6rpx;
}
.tab {
  flex: 1;
  text-align: center;
  font-size: 28rpx;
  color: #6b7c76;
  padding: 16rpx 0;
  border-radius: 12rpx;
}
.tab.active {
  background: #fff;
  color: #1f6b54;
  font-weight: 600;
}
.field { margin-bottom: 24rpx; }
.label { display: block; font-size: 26rpx; color: #4a5c56; margin-bottom: 12rpx; }
.input {
  height: 88rpx;
  padding: 0 24rpx;
  background: #f0f4f2;
  border-radius: 16rpx;
  font-size: 30rpx;
  color: #1a2e28;
}
.code-row { display: flex; gap: 12rpx; align-items: center; }
.code-input { flex: 1; }
.code-btn {
  background: #e6f2ec !important;
  color: #1f6b54 !important;
  border: none;
  border-radius: 12rpx;
  height: 72rpx;
  line-height: 72rpx;
  font-size: 24rpx;
  padding: 0 18rpx;
}
.dev-banner {
  background: #fff8e6;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  margin-bottom: 16rpx;
}
.dev-code { font-size: 30rpx; font-weight: 700; color: #8a6500; }
.hint-line {
  display: block;
  font-size: 22rpx;
  color: #8a9a94;
  margin-bottom: 16rpx;
}
.error { display: block; color: #c0392b; font-size: 26rpx; margin-bottom: 16rpx; }
.primary-btn {
  height: 92rpx;
  line-height: 92rpx;
  background: #2d8a6e;
  color: #fff;
  border-radius: 16rpx;
  font-size: 32rpx;
  border: none;
}
.footer-row {
  margin-top: 28rpx;
  display: flex;
  justify-content: center;
  gap: 12rpx;
}
.muted { font-size: 26rpx; color: #6b7c76; }
.link { font-size: 26rpx; color: #2d8a6e; font-weight: 600; }
</style>
