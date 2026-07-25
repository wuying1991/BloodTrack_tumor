<template>
  <view class="page">
    <view class="card">
      <text class="card-kicker">账号与安全</text>
      <text class="card-title">登录方式概览</text>
      <text class="hint">此处仅管理手机、邮箱与密码，修改显示名请到「个人资料」</text>
      <view class="info-row">
        <text class="info-label">邮箱</text>
        <text class="info-val">{{ auth.user?.email || '未绑定' }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">手机</text>
        <text class="info-val">{{ auth.user?.phone || '未绑定' }}</text>
      </view>
      <view class="info-row">
        <text class="info-label">密码</text>
        <text class="info-val">{{ auth.user?.hasPassword ? '已设置' : '未设置' }}</text>
      </view>
      <view class="tags">
        <text v-if="methods.emailPassword" class="tag on">邮箱密码</text>
        <text v-if="methods.phonePassword" class="tag on">手机密码</text>
        <text v-if="methods.phoneSms" class="tag on">手机验证码</text>
      </view>
    </view>

    <view v-if="!auth.user?.hasPassword" class="card">
      <text class="card-title">设置登录密码</text>
      <text class="hint">设置后可用手机号 + 密码登录</text>
      <input class="input" password v-model="newPassword" placeholder="新密码（大小写+数字）" />
      <input class="input" password v-model="confirmPassword" placeholder="确认密码" />
      <button class="primary" :loading="busy" @click="onSetPassword">保存密码</button>
    </view>

    <view class="card">
      <text class="card-title">{{ auth.user?.phone ? '手机号管理' : '绑定手机号' }}</text>
      <text v-if="auth.user?.phone" class="hint">当前：{{ auth.user.phone }}</text>
      <input class="input" type="number" maxlength="11" v-model="phoneInput" :placeholder="auth.user?.phone ? '新手机号' : '手机号'" />
      <view class="code-row">
        <input class="input code-input" type="number" maxlength="6" v-model="phoneCode" placeholder="新号验证码" />
        <button class="code-btn" :disabled="cdNew > 0 || sendingNew" :loading="sendingNew" @click="sendNewPhoneCode">
          {{ cdNew > 0 ? `${cdNew}s` : '获取验证码' }}
        </button>
      </view>
      <view
        v-if="isDevelopment && devNew"
        class="dev"
        @click="phoneCode = devNew"
      >Mock：{{ devNew }}</view>
      <view v-if="auth.user?.phone && isPhoneRebind" class="rebind-box">
        <text class="hint">换绑需验证：密码 或 原号验证码</text>
        <input v-if="auth.user?.hasPassword" class="input" password v-model="proofPassword" placeholder="当前密码（可选）" />
        <view class="code-row">
          <input class="input code-input" type="number" maxlength="6" v-model="oldPhoneCode" placeholder="原手机验证码" />
          <button class="code-btn" :disabled="cdOld > 0 || sendingOld" :loading="sendingOld" @click="sendOldPhoneCode">
            {{ cdOld > 0 ? `${cdOld}s` : '原号发码' }}
          </button>
        </view>
        <view
          v-if="isDevelopment && devOld"
          class="dev"
          @click="oldPhoneCode = devOld"
        >Mock：{{ devOld }}</view>
      </view>
      <button class="primary" :loading="busy" @click="onBindPhone">
        {{ auth.user?.phone ? (isPhoneRebind ? '换绑手机号' : '确认') : '绑定手机' }}
      </button>
      <button
        v-if="auth.user?.phone"
        class="danger"
        :disabled="!auth.user?.canUnbindPhone"
        :loading="busy"
        @click="onUnbindPhone"
      >
        {{ auth.user?.canUnbindPhone ? '解绑手机号' : '解绑需先绑邮箱并设密码' }}
      </button>
      <input
        v-if="auth.user?.phone && auth.user?.canUnbindPhone && auth.user?.hasPassword"
        class="input"
        password
        v-model="unbindPhonePassword"
        placeholder="解绑请填密码"
      />
    </view>

    <view class="card">
      <text class="card-title">{{ auth.user?.email ? '邮箱管理' : '绑定邮箱' }}</text>
      <text v-if="auth.user?.email" class="hint">当前：{{ auth.user.email }}</text>
      <text class="hint" v-if="!auth.user?.hasPassword">首次绑定将同时设置密码</text>
      <text class="hint" v-else>绑定/换绑需输入当前密码</text>
      <input class="input" v-model="emailInput" :placeholder="auth.user?.email ? '新邮箱' : '邮箱'" />
      <input
        class="input"
        password
        v-model="emailPassword"
        :placeholder="auth.user?.hasPassword ? '当前密码' : '设置密码'"
      />
      <button class="primary" :loading="busy" @click="onBindEmail">
        {{ auth.user?.email ? '换绑邮箱' : '绑定邮箱' }}
      </button>
      <button
        v-if="auth.user?.email"
        class="danger"
        :disabled="!auth.user?.canUnbindEmail"
        :loading="busy"
        @click="onUnbindEmail"
      >
        {{ auth.user?.canUnbindEmail ? '解绑邮箱' : '解绑需先绑定手机' }}
      </button>
      <input
        v-if="auth.user?.email && auth.user?.canUnbindEmail"
        class="input"
        password
        v-model="unbindEmailPassword"
        placeholder="解绑请填密码"
      />
    </view>

    <view class="card danger-zone">
      <text class="card-title danger-title">危险操作</text>
      <text class="hint">
        删除后，血检、生化、化疗周期、提醒和分享数据均不可恢复。
      </text>
      <template v-if="auth.user?.hasPassword">
        <input
          class="input"
          password
          v-model="deletePassword"
          placeholder="输入当前密码"
        />
        <button
          class="danger delete-account"
          :disabled="deleteBusy"
          :loading="deleteBusy"
          @click="onDeleteAccount"
        >
          永久删除账户
        </button>
      </template>
      <text v-else class="hint">请先在本页设置登录密码，再删除账户。</text>
    </view>

    <text v-if="error" class="error">{{ error }}</text>
    <text v-if="okMsg" class="ok">{{ okMsg }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed, onUnmounted, ref } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useAuthStore } from '@/stores/auth';
import * as authApi from '@/api/auth';
import { IS_DEVELOPMENT } from '@/config/env';
import { devOnlyValue } from '@/utils/devFeatures';
import { getErrorMessage } from '@/utils/errorMessage';
import { getAccessToken } from '@/utils/storage';

const auth = useAuthStore();
const isDevelopment = IS_DEVELOPMENT;
const methods = computed(
  () =>
    auth.user?.methods || {
      emailPassword: false,
      phonePassword: false,
      phoneSms: false,
    }
);

const phoneInput = ref('');
const phoneCode = ref('');
const oldPhoneCode = ref('');
const proofPassword = ref('');
const unbindPhonePassword = ref('');
const emailInput = ref('');
const emailPassword = ref('');
const unbindEmailPassword = ref('');
const newPassword = ref('');
const confirmPassword = ref('');
const devNew = ref('');
const devOld = ref('');
const deletePassword = ref('');
const error = ref('');
const okMsg = ref('');
const busy = ref(false);
const sendingNew = ref(false);
const sendingOld = ref(false);
const deleteBusy = ref(false);
const cdNew = ref(0);
const cdOld = ref(0);
let tNew: ReturnType<typeof setInterval> | null = null;
let tOld: ReturnType<typeof setInterval> | null = null;

const isPhoneRebind = computed(() => {
  const cur = auth.user?.phone;
  const next = phoneInput.value.replace(/\D/g, '');
  return !!(cur && next && next !== cur);
});

onShow(async () => {
  if (!getAccessToken()) {
    uni.reLaunch({ url: '/pages/auth/login' });
    return;
  }
  try {
    await auth.refreshProfile();
  } catch {
    uni.reLaunch({ url: '/pages/auth/login' });
  }
});

onUnmounted(() => {
  if (tNew) clearInterval(tNew);
  if (tOld) clearInterval(tOld);
});

function startCd(which: 'new' | 'old', s: number) {
  if (which === 'new') {
    cdNew.value = s;
    if (tNew) clearInterval(tNew);
    tNew = setInterval(() => {
      cdNew.value -= 1;
      if (cdNew.value <= 0 && tNew) {
        clearInterval(tNew);
        tNew = null;
        cdNew.value = 0;
      }
    }, 1000);
  } else {
    cdOld.value = s;
    if (tOld) clearInterval(tOld);
    tOld = setInterval(() => {
      cdOld.value -= 1;
      if (cdOld.value <= 0 && tOld) {
        clearInterval(tOld);
        tOld = null;
        cdOld.value = 0;
      }
    }, 1000);
  }
}

async function onSetPassword() {
  error.value = '';
  okMsg.value = '';
  busy.value = true;
  try {
    const user = await authApi.setPassword(newPassword.value, confirmPassword.value);
    await auth.applyUser(user);
    okMsg.value = '密码已设置';
    newPassword.value = '';
    confirmPassword.value = '';
  } catch (err) {
    error.value = getErrorMessage(err);
  } finally {
    busy.value = false;
  }
}

async function sendNewPhoneCode() {
  error.value = '';
  devNew.value = '';
  const p = phoneInput.value.replace(/\D/g, '');
  if (!/^1\d{10}$/.test(p)) {
    error.value = '请输入有效新手机号';
    return;
  }
  sendingNew.value = true;
  try {
    const res = await authApi.sendSmsCode(p, 'bind');
    devNew.value = devOnlyValue(res.devCode, isDevelopment);
    startCd('new', res.cooldown || 60);
  } catch (err) {
    error.value = getErrorMessage(err);
  } finally {
    sendingNew.value = false;
  }
}

async function sendOldPhoneCode() {
  error.value = '';
  devOld.value = '';
  const p = auth.user?.phone;
  if (!p) return;
  sendingOld.value = true;
  try {
    const res = await authApi.sendSmsCode(p, 'bind');
    devOld.value = devOnlyValue(res.devCode, isDevelopment);
    startCd('old', res.cooldown || 60);
  } catch (err) {
    error.value = getErrorMessage(err);
  } finally {
    sendingOld.value = false;
  }
}

async function onBindPhone() {
  error.value = '';
  okMsg.value = '';
  busy.value = true;
  try {
    const p = phoneInput.value.replace(/\D/g, '');
    const payload: {
      phone: string;
      code: string;
      currentPassword?: string;
      currentPhoneCode?: string;
    } = {
      phone: p,
      code: phoneCode.value.trim(),
    };
    if (isPhoneRebind.value) {
      if (proofPassword.value) payload.currentPassword = proofPassword.value;
      if (oldPhoneCode.value.trim()) payload.currentPhoneCode = oldPhoneCode.value.trim();
    }
    const user = await authApi.bindPhone(payload);
    await auth.applyUser(user);
    okMsg.value = isPhoneRebind.value ? '手机号已更换' : '手机号已绑定';
    phoneInput.value = '';
    phoneCode.value = '';
    oldPhoneCode.value = '';
    proofPassword.value = '';
  } catch (err) {
    error.value = getErrorMessage(err);
  } finally {
    busy.value = false;
  }
}

function onUnbindPhone() {
  if (!auth.user?.canUnbindPhone) return;
  uni.showModal({
    title: '解绑手机号',
    content: '解绑后将无法使用手机验证码/手机密码登录，确定继续？',
    confirmColor: '#d14343',
    success: async (res) => {
      if (!res.confirm) return;
      error.value = '';
      okMsg.value = '';
      busy.value = true;
      try {
        const user = await authApi.unbindPhone({
          password: unbindPhonePassword.value || undefined,
        });
        await auth.applyUser(user);
        okMsg.value = '手机号已解绑';
        unbindPhonePassword.value = '';
      } catch (err) {
        error.value = getErrorMessage(err);
      } finally {
        busy.value = false;
      }
    },
  });
}

async function onBindEmail() {
  error.value = '';
  okMsg.value = '';
  busy.value = true;
  try {
    const payload = auth.user?.hasPassword
      ? {
          email: emailInput.value.trim(),
          currentPassword: emailPassword.value,
        }
      : {
          email: emailInput.value.trim(),
          password: emailPassword.value,
        };
    const user = await authApi.bindEmail(payload);
    await auth.applyUser(user);
    okMsg.value = '邮箱已更新';
    emailInput.value = '';
    emailPassword.value = '';
  } catch (err) {
    error.value = getErrorMessage(err);
  } finally {
    busy.value = false;
  }
}

function onUnbindEmail() {
  if (!auth.user?.canUnbindEmail) return;
  uni.showModal({
    title: '解绑邮箱',
    content: '解绑后将无法使用邮箱登录，确定继续？',
    confirmColor: '#d14343',
    success: async (res) => {
      if (!res.confirm) return;
      error.value = '';
      okMsg.value = '';
      busy.value = true;
      try {
        const user = await authApi.unbindEmail(unbindEmailPassword.value);
        await auth.applyUser(user);
        okMsg.value = '邮箱已解绑';
        unbindEmailPassword.value = '';
      } catch (err) {
        error.value = getErrorMessage(err);
      } finally {
        busy.value = false;
      }
    },
  });
}

function confirmAccountDeletion(): Promise<boolean> {
  return new Promise((resolve) => {
    uni.showModal({
      title: '永久删除账户',
      content: '所有健康记录、提醒和分享数据将永久删除且无法恢复。确定继续吗？',
      confirmText: '永久删除',
      confirmColor: '#c0392b',
      success: (res) => resolve(res.confirm),
      fail: () => resolve(false),
    });
  });
}

async function onDeleteAccount() {
  error.value = '';
  okMsg.value = '';
  const password = deletePassword.value;
  if (!password) {
    error.value = '请输入当前密码';
    return;
  }
  if (!(await confirmAccountDeletion())) return;

  deleteBusy.value = true;
  try {
    await auth.deleteAccount(password);
    uni.showToast({ title: '账户已删除', icon: 'success' });
    uni.reLaunch({ url: '/pages/auth/login' });
  } catch (err) {
    error.value = getErrorMessage(err, '删除账户失败');
  } finally {
    deleteBusy.value = false;
  }
}
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  padding: 24rpx 24rpx calc(48rpx + env(safe-area-inset-bottom));
  background: #f2f5f4;
  box-sizing: border-box;
}
.card {
  background: #fff;
  border-radius: 28rpx;
  padding: 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 8rpx 28rpx rgba(21, 36, 31, 0.05);
}
.card-kicker {
  display: block;
  font-size: 22rpx;
  color: #1f8a68;
  font-weight: 600;
  margin-bottom: 8rpx;
}
.card-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #15241f;
  margin-bottom: 8rpx;
}
.hint {
  display: block;
  font-size: 22rpx;
  color: #8b9b95;
  margin-bottom: 14rpx;
  line-height: 1.5;
}
.info-row {
  display: flex;
  justify-content: space-between;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #eef3f1;
}
.info-label {
  font-size: 26rpx;
  color: #8b9b95;
}
.info-val {
  font-size: 26rpx;
  color: #15241f;
  font-weight: 500;
  max-width: 60%;
  text-align: right;
  word-break: break-all;
}
.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 10rpx;
  margin-top: 16rpx;
}
.tag {
  font-size: 20rpx;
  padding: 6rpx 14rpx;
  border-radius: 999rpx;
  background: #f0f4f2;
  color: #8b9b95;
}
.tag.on {
  background: #e8f6ef;
  color: #1f6b54;
}
.input {
  height: 88rpx;
  padding: 0 24rpx;
  background: #f4f7f6;
  border-radius: 16rpx;
  font-size: 28rpx;
  margin-bottom: 16rpx;
  color: #15241f;
}
.code-row {
  display: flex;
  gap: 12rpx;
  margin-bottom: 16rpx;
}
.code-input {
  flex: 1;
  margin-bottom: 0;
}
.code-btn {
  min-width: 180rpx;
  height: 88rpx;
  line-height: 88rpx;
  background: #e8f6ef !important;
  color: #1f6b54 !important;
  border: none;
  border-radius: 16rpx;
  font-size: 24rpx;
  padding: 0 20rpx;
}
.rebind-box {
  background: #f8faf9;
  border-radius: 16rpx;
  padding: 16rpx;
  margin-bottom: 12rpx;
}
.dev {
  font-size: 24rpx;
  color: #a67c00;
  margin-bottom: 12rpx;
}
.primary {
  height: 88rpx;
  line-height: 88rpx;
  background: linear-gradient(135deg, #2aa87a 0%, #1f8a68 100%);
  color: #fff;
  border-radius: 16rpx;
  font-size: 30rpx;
  border: none;
  margin-bottom: 12rpx;
  font-weight: 600;
}
.primary::after {
  border: none;
}
.danger {
  height: 80rpx;
  line-height: 80rpx;
  background: #fff;
  color: #d14343;
  border-radius: 16rpx;
  font-size: 26rpx;
  border: 1rpx solid #f3cfcf;
  margin-bottom: 12rpx;
}
.danger[disabled] {
  color: #a8b5b0;
  border-color: #e5ebe8;
}
.danger-zone {
  border: 1rpx solid #f1c7c2;
}
.danger-title {
  color: #a93226;
}
.delete-account {
  margin-top: 16rpx;
}
.error {
  display: block;
  color: #d14343;
  font-size: 26rpx;
  margin: 8rpx 0;
}
.ok {
  display: block;
  color: #1f6b54;
  font-size: 26rpx;
  margin: 8rpx 0;
}
</style>
