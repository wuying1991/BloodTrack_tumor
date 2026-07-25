<template>
  <view class="page">
    <text class="heading">新增化疗周期</text>
    <text class="hint">结束日期可不填，默认按开始日 +21 天</text>

    <view class="card">
      <view class="field">
        <text class="label">方案名称 *</text>
        <input class="input" v-model="regimenName" placeholder="如 AC-T / 紫杉醇方案" />
      </view>
      <view class="field">
        <text class="label">开始日期 *</text>
        <picker mode="date" :value="startDate" @change="onStartDate">
          <view class="picker">{{ formatChineseDate(startDate) }}</view>
        </picker>
      </view>
      <view class="field">
        <text class="label">结束日期（可选）</text>
        <picker mode="date" :value="endDate" :start="startDate" @change="onEndDate">
          <view class="picker">{{ endDate ? formatChineseDate(endDate) : '默认开始后 21 天' }}</view>
        </picker>
      </view>
      <view class="field">
        <text class="label">医生备注</text>
        <textarea class="textarea" v-model="doctorNotes" maxlength="500" placeholder="可选" />
      </view>
    </view>

    <view class="card">
      <view class="med-head">
        <text class="group-title">药物列表</text>
        <text class="link" @click="addMed">+ 添加药物</text>
      </view>
      <view v-for="(med, idx) in medications" :key="idx" class="med-block">
        <view class="med-title-row">
          <text class="med-title">药物 {{ idx + 1 }}</text>
          <text class="danger" @click="removeMed(idx)">删除</text>
        </view>
        <input class="input" v-model="med.name" placeholder="药名" />
        <input class="input" v-model="med.dosage" placeholder="剂量，如 175mg/m²" />
        <input class="input" v-model="med.notes" placeholder="备注（可选）" />
      </view>
      <text v-if="!medications.length" class="empty-med">可先不填药物，之后再补</text>
    </view>

    <text v-if="error" class="error">{{ error }}</text>
    <button class="primary" :loading="submitting" @click="onSubmit">保存</button>
    <button class="ghost" @click="onCancel">取消</button>
  </view>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { onLoad } from '@dcloudio/uni-app';
import * as cycleApi from '@/api/chemoCycle';
import type { ChemoMedication } from '@/types/chemoCycle';
import {
  dateInputToIso,
  formatChineseDate,
  todayDateInput,
} from '@/utils/formatDate';
import { getErrorMessage } from '@/utils/errorMessage';
import { getAccessToken } from '@/utils/storage';

const regimenName = ref('');
const startDate = ref(todayDateInput());
const endDate = ref('');
const doctorNotes = ref('');
const medications = reactive<ChemoMedication[]>([]);
const submitting = ref(false);
const error = ref('');

onLoad(() => {
  if (!getAccessToken()) uni.reLaunch({ url: '/pages/auth/login' });
});

function onStartDate(e: any) {
  startDate.value = String(e?.detail?.value ?? '');
}

function onEndDate(e: any) {
  endDate.value = String(e?.detail?.value ?? '');
}

function addMed() {
  medications.push({ name: '', dosage: '', notes: '' });
}

function removeMed(idx: number) {
  medications.splice(idx, 1);
}

async function onSubmit() {
  error.value = '';
  try {
    const name = regimenName.value.trim();
    if (!name) throw new Error('请填写方案名称');
    if (!startDate.value) throw new Error('请选择开始日期');

    const meds = medications
      .map((m) => ({
        name: m.name?.trim() || undefined,
        dosage: m.dosage?.trim() || undefined,
        notes: m.notes?.trim() || undefined,
      }))
      .filter((m) => m.name || m.dosage || m.notes);

    const payload = {
      regimenName: name,
      startDate: dateInputToIso(startDate.value),
      endDate: endDate.value ? dateInputToIso(endDate.value) : undefined,
      doctorNotes: doctorNotes.value.trim() || undefined,
      medications: meds.length ? meds : undefined,
    };

    submitting.value = true;
    await cycleApi.createChemoCycle(payload);
    uni.showToast({ title: '已保存', icon: 'success' });
    setTimeout(() => {
      uni.navigateBack({
        fail: () => uni.redirectTo({ url: '/pages/records/cycle-list' }),
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
    fail: () => uni.redirectTo({ url: '/pages/records/cycle-list' }),
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
.field { margin-top: 16rpx; }
.label { display: block; font-size: 26rpx; color: #4a5c56; margin-bottom: 10rpx; }
.input {
  height: 84rpx;
  padding: 0 20rpx;
  background: #f0f4f2;
  border-radius: 14rpx;
  font-size: 28rpx;
  margin-bottom: 12rpx;
}
.picker {
  height: 84rpx;
  line-height: 84rpx;
  padding: 0 20rpx;
  background: #f0f4f2;
  border-radius: 14rpx;
  font-size: 28rpx;
}
.textarea {
  width: 100%;
  min-height: 120rpx;
  padding: 16rpx 20rpx;
  background: #f0f4f2;
  border-radius: 14rpx;
  box-sizing: border-box;
}
.med-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}
.group-title { font-size: 28rpx; font-weight: 600; color: #1a2e28; }
.link { font-size: 26rpx; color: #2d8a6e; font-weight: 600; }
.med-block {
  border-top: 1rpx solid #eef2f0;
  padding-top: 16rpx;
  margin-top: 12rpx;
}
.med-title-row {
  display: flex;
  justify-content: space-between;
  margin-bottom: 10rpx;
}
.med-title { font-size: 26rpx; color: #4a5c56; font-weight: 600; }
.danger { color: #c0392b; font-size: 24rpx; }
.empty-med { font-size: 24rpx; color: #9aaba4; }
.error { display: block; color: #c0392b; margin-bottom: 12rpx; }
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
