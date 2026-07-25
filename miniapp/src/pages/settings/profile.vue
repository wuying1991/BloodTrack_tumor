<template>
  <view class="page">
    <view class="card">
      <text class="kicker">个人资料</text>
      <text class="title">修改姓名</text>
      <text class="hint">显示在首页问候语与「我的」页，支持中文、英文或昵称</text>

      <view class="preview">
        <view class="avatar">{{ nameInitial }}</view>
        <view class="preview-text">
          <text class="preview-label">当前显示</text>
          <text class="preview-val">{{ fullNameInput.trim() || '未设置' }}</text>
        </view>
      </view>

      <text class="field-label">姓名 / 用户名</text>
      <input
        class="input"
        v-model="fullNameInput"
        maxlength="50"
        placeholder="请输入姓名或昵称"
        :disabled="busy"
      />

      <text v-if="error" class="error">{{ error }}</text>
      <text v-if="okMsg" class="ok">{{ okMsg }}</text>

      <button class="primary" :loading="busy" :disabled="!nameDirty || busy" @click="onSave">
        {{ nameDirty ? '保存' : '已是最新' }}
      </button>
    </view>

    <view class="link-card" @click="goAccount">
      <view>
        <text class="link-title">账号与安全</text>
        <text class="link-sub">手机号、邮箱、登录密码管理</text>
      </view>
      <text class="link-chev">›</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import { useAuthStore } from '@/stores/auth';
import { getErrorMessage } from '@/utils/errorMessage';
import { getAccessToken } from '@/utils/storage';

const auth = useAuthStore();
const fullNameInput = ref('');
const savedFullName = ref('');
const busy = ref(false);
const error = ref('');
const okMsg = ref('');

const nameDirty = computed(
  () => fullNameInput.value.trim() !== (savedFullName.value || '').trim()
);

const nameInitial = computed(() => {
  const n = fullNameInput.value.trim() || auth.displayName || '用';
  return n.slice(0, 1);
});

watch(
  () => auth.user?.fullName,
  (v) => {
    if (v != null) {
      fullNameInput.value = v;
      savedFullName.value = v;
    }
  },
  { immediate: true }
);

onShow(async () => {
  if (!getAccessToken()) {
    uni.reLaunch({ url: '/pages/auth/login' });
    return;
  }
  try {
    await auth.refreshProfile();
    const name = auth.user?.fullName || '';
    fullNameInput.value = name;
    savedFullName.value = name;
  } catch {
    uni.reLaunch({ url: '/pages/auth/login' });
  }
});

async function onSave() {
  error.value = '';
  okMsg.value = '';
  const name = fullNameInput.value.trim();
  if (!name) {
    error.value = '请输入姓名';
    return;
  }
  if (name.length > 50) {
    error.value = '姓名不能超过 50 个字';
    return;
  }
  busy.value = true;
  try {
    await auth.updateProfile({ fullName: name });
    savedFullName.value = name;
    okMsg.value = '姓名已更新';
    uni.showToast({ title: '已保存', icon: 'success' });
  } catch (err) {
    error.value = getErrorMessage(err);
  } finally {
    busy.value = false;
  }
}

function goAccount() {
  uni.navigateTo({ url: '/pages/settings/account' });
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
  background: linear-gradient(165deg, #eefaf4 0%, #ffffff 48%);
  border-radius: 28rpx;
  padding: 32rpx 28rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 8rpx 28rpx rgba(21, 36, 31, 0.05);
  border: 1rpx solid rgba(31, 138, 104, 0.08);
}
.kicker {
  display: block;
  font-size: 22rpx;
  color: #1f8a68;
  font-weight: 600;
  margin-bottom: 8rpx;
}
.title {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #15241f;
  margin-bottom: 8rpx;
}
.hint {
  display: block;
  font-size: 24rpx;
  color: #8b9b95;
  line-height: 1.5;
  margin-bottom: 24rpx;
}
.preview {
  display: flex;
  align-items: center;
  gap: 18rpx;
  margin-bottom: 28rpx;
  padding: 18rpx;
  background: rgba(255, 255, 255, 0.9);
  border-radius: 18rpx;
}
.avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  background: linear-gradient(145deg, #2aa87a, #1f8a68);
  color: #fff;
  font-size: 32rpx;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}
.preview-text {
  flex: 1;
  min-width: 0;
}
.preview-label {
  display: block;
  font-size: 20rpx;
  color: #8b9b95;
}
.preview-val {
  display: block;
  margin-top: 4rpx;
  font-size: 32rpx;
  font-weight: 700;
  color: #15241f;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.field-label {
  display: block;
  font-size: 26rpx;
  color: #5c6f68;
  font-weight: 500;
  margin-bottom: 12rpx;
}
.input {
  height: 92rpx;
  padding: 0 24rpx;
  background: #f4f7f6;
  border-radius: 16rpx;
  font-size: 30rpx;
  color: #15241f;
  margin-bottom: 16rpx;
}
.error {
  display: block;
  color: #d14343;
  font-size: 26rpx;
  margin-bottom: 12rpx;
}
.ok {
  display: block;
  color: #1f6b54;
  font-size: 26rpx;
  margin-bottom: 12rpx;
}
.primary {
  height: 96rpx;
  line-height: 96rpx;
  background: linear-gradient(135deg, #2aa87a 0%, #1f8a68 100%);
  color: #fff;
  border-radius: 18rpx;
  font-size: 32rpx;
  border: none;
  font-weight: 700;
  box-shadow: 0 10rpx 24rpx rgba(31, 138, 104, 0.25);
}
.primary::after {
  border: none;
}
.primary[disabled] {
  opacity: 0.55;
}
.link-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #fff;
  border-radius: 24rpx;
  padding: 28rpx;
  box-shadow: 0 8rpx 28rpx rgba(21, 36, 31, 0.05);
}
.link-card:active {
  background: #f7faf9;
}
.link-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #15241f;
}
.link-sub {
  display: block;
  margin-top: 6rpx;
  font-size: 22rpx;
  color: #8b9b95;
}
.link-chev {
  font-size: 36rpx;
  color: #c5d0cb;
}
</style>
