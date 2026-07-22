<template>
  <view v-if="visible" class="mask" @click="onClose">
    <view class="sheet" @click.stop>
      <view class="handle" />
      <text class="title">加一笔</text>
      <text class="subtitle">选择要记录的类型</text>

      <view class="grid">
        <view class="item" @click="pick('blood')">
          <FeatureIcon name="blood" size="lg" />
          <text class="name">血常规</text>
          <text class="desc">血细胞指标</text>
        </view>
        <view class="item" @click="pick('biochem')">
          <FeatureIcon name="biochem" size="lg" />
          <text class="name">生化</text>
          <text class="desc">肝肾 / 电解质</text>
        </view>
        <view class="item" @click="pick('cycle')">
          <FeatureIcon name="cycle" size="lg" />
          <text class="name">化疗周期</text>
          <text class="desc">疗程与用药</text>
        </view>
        <view class="item" @click="pick('reminder')">
          <FeatureIcon name="remind" size="lg" />
          <text class="name">提醒</text>
          <text class="desc">复查与用药提醒</text>
        </view>
      </view>

      <button class="cancel" @click="onClose">取消</button>
    </view>
  </view>
</template>

<script setup lang="ts">
import FeatureIcon from '@/components/FeatureIcon.vue';

export type QuickAddType = 'blood' | 'biochem' | 'cycle' | 'reminder';

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits<{
  (e: 'update:visible', value: boolean): void;
  (e: 'select', type: QuickAddType): void;
}>();

function onClose() {
  emit('update:visible', false);
}

function pick(type: QuickAddType) {
  emit('select', type);
  emit('update:visible', false);
}

void props;
</script>

<style scoped lang="scss">
.mask {
  position: fixed;
  left: 0;
  right: 0;
  top: 0;
  bottom: 0;
  background: rgba(20, 30, 28, 0.45);
  z-index: 1000;
  display: flex;
  align-items: flex-end;
}
.sheet {
  width: 100%;
  background: #fff;
  border-radius: 28rpx 28rpx 0 0;
  padding: 20rpx 32rpx calc(32rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}
.handle {
  width: 72rpx;
  height: 8rpx;
  border-radius: 8rpx;
  background: #d9e3de;
  margin: 8rpx auto 24rpx;
}
.title {
  display: block;
  font-size: 34rpx;
  font-weight: 700;
  color: #15241f;
}
.subtitle {
  display: block;
  margin-top: 8rpx;
  margin-bottom: 28rpx;
  font-size: 24rpx;
  color: #8b9b95;
}
.grid {
  display: flex;
  flex-wrap: wrap;
  gap: 20rpx;
}
.item {
  width: calc(50% - 10rpx);
  box-sizing: border-box;
  background: #f7faf9;
  border-radius: 24rpx;
  padding: 28rpx 20rpx 24rpx;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  border: 1rpx solid #eef3f1;
}
.item:active {
  background: #eef6f2;
  opacity: 0.95;
}
.name {
  display: block;
  margin-top: 16rpx;
  font-size: 30rpx;
  color: #15241f;
  font-weight: 700;
}
.desc {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #8b9b95;
}
.cancel {
  margin-top: 28rpx;
  height: 88rpx;
  line-height: 88rpx;
  background: #f0f4f2;
  color: #5c6f68;
  border-radius: 18rpx;
  font-size: 28rpx;
  border: none;
  font-weight: 500;
}
.cancel::after {
  border: none;
}
</style>
