<template>
  <view>
    <view class="fab" @click="show = true">
      <text class="plus">+</text>
    </view>
    <QuickAddSheet v-model:visible="show" @select="onSelect" />
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import QuickAddSheet, { type QuickAddType } from '@/components/QuickAddSheet.vue';

const show = ref(false);

function onSelect(type: QuickAddType) {
  const map: Record<QuickAddType, string> = {
    blood: '/pages/records/blood-form',
    biochem: '/pages/records/biochem-form',
    cycle: '/pages/records/cycle-form',
    reminder: '/pages/records/reminder-form',
  };
  uni.navigateTo({ url: map[type] });
}
</script>

<style scoped lang="scss">
.fab {
  position: fixed;
  right: 36rpx;
  bottom: calc(140rpx + env(safe-area-inset-bottom));
  width: 108rpx;
  height: 108rpx;
  border-radius: 50%;
  background: linear-gradient(145deg, #34a37e, #2d8a6e);
  box-shadow: 0 12rpx 28rpx rgba(45, 138, 110, 0.38);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 50;
}
.plus {
  color: #fff;
  font-size: 56rpx;
  line-height: 1;
  font-weight: 300;
  margin-top: -4rpx;
}
</style>
