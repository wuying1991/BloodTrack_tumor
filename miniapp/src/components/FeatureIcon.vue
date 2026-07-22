<template>
  <view class="fi" :class="[`fi-${name}`, `fi-${size}`, { 'fi-plain': plain }]">
    <image
      class="fi-img"
      :src="src"
      mode="aspectFit"
      :lazy-load="false"
    />
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue';

export type FeatureIconName =
  | 'blood'
  | 'liver'
  | 'kidney'
  | 'electrolyte'
  | 'cycle'
  | 'remind'
  | 'calendar'
  | 'trend'
  | 'biochem'
  | 'account';

const props = withDefaults(
  defineProps<{
    name: FeatureIconName;
    /** sm: 列表旁小图标; md: 首页入口; lg: 加一笔大卡 */
    size?: 'sm' | 'md' | 'lg';
    /** 不要彩色底，只显示图形 */
    plain?: boolean;
  }>(),
  {
    size: 'md',
    plain: false,
  }
);

const src = computed(() => `/static/icons/${props.name}.png`);
</script>

<style scoped lang="scss">
.fi {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  border-radius: 20rpx;
  box-sizing: border-box;
}

.fi-sm {
  width: 56rpx;
  height: 56rpx;
  border-radius: 16rpx;
  padding: 6rpx;
}

.fi-md {
  width: 72rpx;
  height: 72rpx;
  border-radius: 22rpx;
  padding: 8rpx;
}

.fi-lg {
  width: 88rpx;
  height: 88rpx;
  border-radius: 24rpx;
  padding: 10rpx;
}

.fi-plain {
  background: transparent !important;
  padding: 0;
  box-shadow: none !important;
}

.fi-img {
  width: 100%;
  height: 100%;
}

/* soft pastel tiles — consistent brand language */
.fi-blood {
  background: linear-gradient(160deg, #fee2e2 0%, #fecaca 100%);
  box-shadow: 0 6rpx 14rpx rgba(239, 68, 68, 0.12);
}
.fi-liver {
  background: linear-gradient(160deg, #ede9fe 0%, #ddd6fe 100%);
  box-shadow: 0 6rpx 14rpx rgba(139, 92, 246, 0.12);
}
.fi-kidney {
  background: linear-gradient(160deg, #e0f2fe 0%, #bae6fd 100%);
  box-shadow: 0 6rpx 14rpx rgba(14, 165, 233, 0.12);
}
.fi-electrolyte {
  background: linear-gradient(160deg, #fef3c7 0%, #fde68a 100%);
  box-shadow: 0 6rpx 14rpx rgba(245, 158, 11, 0.12);
}
.fi-cycle {
  background: linear-gradient(160deg, #d1fae5 0%, #a7f3d0 100%);
  box-shadow: 0 6rpx 14rpx rgba(16, 185, 129, 0.12);
}
.fi-remind {
  background: linear-gradient(160deg, #fef9c3 0%, #fde047 100%);
  box-shadow: 0 6rpx 14rpx rgba(234, 179, 8, 0.14);
}
.fi-calendar {
  background: linear-gradient(160deg, #f1f5f9 0%, #e2e8f0 100%);
  box-shadow: 0 6rpx 14rpx rgba(100, 116, 139, 0.1);
}
.fi-trend {
  background: linear-gradient(160deg, #ccfbf1 0%, #99f6e4 100%);
  box-shadow: 0 6rpx 14rpx rgba(13, 148, 136, 0.12);
}
.fi-biochem {
  background: linear-gradient(160deg, #e0e7ff 0%, #c7d2fe 100%);
  box-shadow: 0 6rpx 14rpx rgba(99, 102, 241, 0.12);
}
.fi-account {
  background: linear-gradient(160deg, #f1f5f9 0%, #cbd5e1 100%);
  box-shadow: 0 6rpx 14rpx rgba(100, 116, 139, 0.1);
}
</style>
