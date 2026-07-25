<script setup lang="ts">
import { onLaunch } from '@dcloudio/uni-app';
import { useAuthStore } from '@/stores/auth';
import { getAccessToken } from '@/utils/storage';

onLaunch(async () => {
  const auth = useAuthStore();
  await auth.bootstrap();

  if (auth.user && getAccessToken()) {
    uni.switchTab({ url: '/pages/home/index' });
  }
});
</script>

<style lang="scss">
page {
  background-color: #f2f5f4;
  color: #15241f;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'PingFang SC',
    'Hiragino Sans GB', 'Microsoft YaHei', sans-serif;
  font-size: 28rpx;
  line-height: 1.5;
  -webkit-font-smoothing: antialiased;
}

/* 全局轻量工具类，统一卡片/按钮手感 */
.bt-card {
  background: #fff;
  border-radius: 28rpx;
  box-shadow: 0 8rpx 28rpx rgba(21, 36, 31, 0.06);
}

.bt-safe-bottom {
  padding-bottom: calc(180rpx + env(safe-area-inset-bottom));
}
</style>
