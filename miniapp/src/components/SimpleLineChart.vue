<template>
  <view class="wrap">
    <canvas
      type="2d"
      :id="canvasId"
      class="canvas"
      :style="{ width: width + 'px', height: height + 'px' }"
    />
    <view v-if="!points.length" class="empty">暂无数据点</view>
  </view>
</template>

<script setup lang="ts">
import { getCurrentInstance, nextTick, onMounted, watch } from 'vue';

export interface ChartPoint {
  label: string;
  value: number;
  abnormal?: boolean;
}

const props = withDefaults(
  defineProps<{
    points: ChartPoint[];
    refMin?: number;
    refMax?: number;
    yMin?: number;
    yMax?: number;
    width?: number;
    height?: number;
    lineColor?: string;
    canvasId?: string;
  }>(),
  {
    refMin: undefined,
    refMax: undefined,
    yMin: 0,
    yMax: 100,
    width: 320,
    height: 200,
    lineColor: '#2d8a6e',
    canvasId: 'trend-chart',
  }
);

const instance = getCurrentInstance();

function clampRange(values: number[]): { min: number; max: number } {
  let min = props.yMin;
  let max = props.yMax;
  if (values.length) {
    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    min = Math.min(min, dataMin);
    max = Math.max(max, dataMax);
    if (props.refMin != null) min = Math.min(min, props.refMin);
    if (props.refMax != null) max = Math.max(max, props.refMax);
  }
  if (max <= min) max = min + 1;
  // padding
  const pad = (max - min) * 0.08;
  return { min: min - pad, max: max + pad };
}

function draw() {
  const query = uni.createSelectorQuery().in(instance?.proxy as any);
  // fields typings vary across @dcloudio/types; runtime matches WeChat canvas 2d docs.
  (query.select(`#${props.canvasId}`) as any)
    .fields({ node: true, size: true })
    .exec((res: any[]) => {
      const item = res?.[0];
      if (!item?.node) return;
      const canvas = item.node as HTMLCanvasElement;
      const ctx = canvas.getContext('2d') as CanvasRenderingContext2D | null;
      if (!ctx) return;

      const sys = uni.getSystemInfoSync();
      const dpr = sys.pixelRatio || 2;
      const w = item.width || props.width;
      const h = item.height || props.height;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      ctx.scale(dpr, dpr);

      // clear
      ctx.clearRect(0, 0, w, h);
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, w, h);

      const padL = 40;
      const padR = 12;
      const padT = 16;
      const padB = 28;
      const plotW = w - padL - padR;
      const plotH = h - padT - padB;

      const values = props.points.map((p) => p.value);
      const { min, max } = clampRange(values);
      const n = props.points.length;

      const xAt = (i: number) =>
        n <= 1 ? padL + plotW / 2 : padL + (plotW * i) / (n - 1);
      const yAt = (v: number) => padT + plotH * (1 - (v - min) / (max - min));

      // reference band
      if (props.refMin != null && props.refMax != null) {
        const y1 = yAt(props.refMax);
        const y2 = yAt(props.refMin);
        ctx.fillStyle = 'rgba(45, 138, 110, 0.10)';
        ctx.fillRect(padL, y1, plotW, Math.max(1, y2 - y1));
        ctx.strokeStyle = 'rgba(45, 138, 110, 0.35)';
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.moveTo(padL, y1);
        ctx.lineTo(padL + plotW, y1);
        ctx.moveTo(padL, y2);
        ctx.lineTo(padL + plotW, y2);
        ctx.stroke();
        ctx.setLineDash([]);
      }

      // axes
      ctx.strokeStyle = '#d9e3de';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padL, padT);
      ctx.lineTo(padL, padT + plotH);
      ctx.lineTo(padL + plotW, padT + plotH);
      ctx.stroke();

      // y labels
      ctx.fillStyle = '#8a9a94';
      ctx.font = '10px sans-serif';
      ctx.textAlign = 'right';
      ctx.textBaseline = 'middle';
      const ticks = 4;
      for (let i = 0; i <= ticks; i++) {
        const v = min + ((max - min) * i) / ticks;
        const y = yAt(v);
        ctx.fillText(v.toFixed(v >= 100 ? 0 : 1), padL - 6, y);
        ctx.strokeStyle = '#f0f4f2';
        ctx.beginPath();
        ctx.moveTo(padL, y);
        ctx.lineTo(padL + plotW, y);
        ctx.stroke();
      }

      if (!n) return;

      // line
      ctx.strokeStyle = props.lineColor;
      ctx.lineWidth = 2;
      ctx.lineJoin = 'round';
      ctx.beginPath();
      props.points.forEach((p, i) => {
        const x = xAt(i);
        const y = yAt(p.value);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // points
      props.points.forEach((p, i) => {
        const x = xAt(i);
        const y = yAt(p.value);
        ctx.beginPath();
        ctx.arc(x, y, p.abnormal ? 4.5 : 3.2, 0, Math.PI * 2);
        ctx.fillStyle = p.abnormal ? '#c0392b' : props.lineColor;
        ctx.fill();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      });

      // x labels (first / mid / last)
      ctx.fillStyle = '#8a9a94';
      ctx.font = '10px sans-serif';
      ctx.textBaseline = 'top';
      const labelIdx =
        n === 1
          ? [0]
          : n === 2
            ? [0, 1]
            : [0, Math.floor((n - 1) / 2), n - 1];
      labelIdx.forEach((i, k) => {
        const x = xAt(i);
        ctx.textAlign = k === 0 ? 'left' : k === labelIdx.length - 1 ? 'right' : 'center';
        const label = props.points[i].label.slice(5); // MM-DD if YYYY-MM-DD
        ctx.fillText(label || props.points[i].label, x, padT + plotH + 8);
      });
    });
}

onMounted(() => {
  nextTick(() => setTimeout(draw, 50));
});

watch(
  () => [props.points, props.refMin, props.refMax, props.yMin, props.yMax],
  () => nextTick(() => setTimeout(draw, 30)),
  { deep: true }
);
</script>

<style scoped>
.wrap {
  position: relative;
  width: 100%;
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}
.canvas {
  width: 100%;
  height: 400rpx;
  display: block;
}
.empty {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #8a9a94;
  font-size: 26rpx;
  pointer-events: none;
}
</style>
