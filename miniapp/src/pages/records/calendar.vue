<template>
  <view class="page">
    <view class="month-bar">
      <text class="nav-btn" @click="prevMonth">‹</text>
      <view class="month-center">
        <text class="month-title">{{ monthTitle }}</text>
        <text class="today-link" @click="goToday">今天</text>
      </view>
      <text class="nav-btn" @click="nextMonth">›</text>
    </view>

    <view class="legend">
      <text class="lg"><text class="dot blood" />血常规</text>
      <text class="lg"><text class="dot biochem" />生化</text>
      <text class="lg"><text class="dot cycle" />化疗</text>
      <text class="lg"><text class="dot reminder" />提醒</text>
      <text class="lg"><text class="dot abn" />异常</text>
    </view>

    <view class="filters">
      <text
        v-for="f in filters"
        :key="f.value"
        class="chip"
        :class="{ on: filter === f.value }"
        @click="filter = f.value"
      >{{ f.label }}</text>
    </view>

    <view v-if="error" class="banner error">
      <text>{{ error }}</text>
      <text class="link" @click="loadMonth">重试</text>
    </view>

    <view class="cal-card">
      <view class="week-head">
        <text v-for="w in weekLabels" :key="w" class="wh">{{ w }}</text>
      </view>
      <view class="grid">
        <view
          v-for="cell in cells"
          :key="cell.key + (cell.inMonth ? '' : '-o')"
          class="cell"
          :class="{
            muted: !cell.inMonth,
            today: cell.isToday,
            selected: cell.key === selectedKey,
            abnormal: dayMap[cell.key]?.hasAbnormal,
          }"
          @click="selectDay(cell.key)"
        >
          <text class="day-num">{{ cell.day }}</text>
          <view class="dots">
            <view v-if="showDot(cell.key, 'blood')" class="d blood" />
            <view v-if="showDot(cell.key, 'biochem')" class="d biochem" />
            <view v-if="showDot(cell.key, 'cycle')" class="d cycle" />
            <view v-if="showDot(cell.key, 'reminder')" class="d reminder" />
          </view>
        </view>
      </view>
      <view v-if="loading" class="loading-mask"><text>加载中…</text></view>
    </view>

    <view class="day-panel">
      <view class="day-head">
        <text class="day-title">{{ selectedKey }}</text>
        <text class="add-link" @click="openAdd">+ 加一笔</text>
      </view>

      <view v-if="!dayEvents.length" class="empty-day">
        当天暂无记录
      </view>

      <view
        v-for="ev in dayEvents"
        :key="ev.id"
        class="ev"
        :class="ev.kind"
        @click="openEvent(ev)"
      >
        <view class="ev-left">
          <text class="ev-kind">{{ ev.kindLabel }}</text>
          <text class="ev-title">{{ ev.title }}</text>
          <text v-if="ev.sub" class="ev-sub">{{ ev.sub }}</text>
        </view>
        <text v-if="ev.abnormal" class="ev-badge bad">异常</text>
      </view>
    </view>

    <AppFab />
  </view>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { onShow } from '@dcloudio/uni-app';
import AppFab from '@/components/AppFab.vue';
import * as bloodApi from '@/api/bloodTest';
import * as biochemApi from '@/api/biochem';
import * as cycleApi from '@/api/chemoCycle';
import * as reminderApi from '@/api/reminder';
import type { BloodTest } from '@/types/bloodTest';
import type { BiochemTest } from '@/types/biochem';
import type { ChemoCycle } from '@/types/chemoCycle';
import type { Reminder } from '@/types/reminder';
import {
  buildMonthGrid,
  eachDateKeyInRange,
  isoToLocalDateKey,
  monthIsoRange,
  monthLabel,
  shiftMonth,
  toDateKey,
} from '@/utils/calendar';
import { formatDisplayDateTime } from '@/utils/formatDate';
import { getErrorMessage } from '@/utils/errorMessage';
import { getAccessToken } from '@/utils/storage';
import { typeLabel } from '@/constants/reminderOptions';
import { collectAllPages } from '@/utils/pagination';

type Filter = 'all' | 'blood' | 'biochem' | 'cycle' | 'reminder';
type Kind = 'blood' | 'biochem' | 'cycle' | 'reminder';

interface DayBucket {
  hasBlood: boolean;
  hasBiochem: boolean;
  hasCycle: boolean;
  hasReminder: boolean;
  hasAbnormal: boolean;
  blood: BloodTest[];
  biochem: BiochemTest[];
  cycles: ChemoCycle[];
  reminders: Reminder[];
}

interface DayEvent {
  id: string;
  kind: Kind;
  kindLabel: string;
  title: string;
  sub?: string;
  abnormal?: boolean;
  route?: string;
}

const weekLabels = ['一', '二', '三', '四', '五', '六', '日'];
const filters: Array<{ value: Filter; label: string }> = [
  { value: 'all', label: '全部' },
  { value: 'blood', label: '检查' },
  { value: 'cycle', label: '治疗' },
  { value: 'reminder', label: '提醒' },
];

const now = new Date();
const year = ref(now.getFullYear());
const monthIndex = ref(now.getMonth());
const selectedKey = ref(toDateKey(now));
const filter = ref<Filter>('all');
const loading = ref(false);
const error = ref('');
const dayMap = ref<Record<string, DayBucket>>({});
let loadSequence = 0;

const monthTitle = computed(() => monthLabel(year.value, monthIndex.value));
const cells = computed(() => buildMonthGrid(year.value, monthIndex.value));

const dayEvents = computed((): DayEvent[] => {
  const bucket = dayMap.value[selectedKey.value];
  if (!bucket) return [];
  const events: DayEvent[] = [];

  if (filter.value === 'all' || filter.value === 'blood') {
    for (const b of bucket.blood) {
      events.push({
        id: `blood-${b._id}`,
        kind: 'blood',
        kindLabel: '血常规',
        title: `WBC ${b.wbc} · HGB ${b.hgb} · PLT ${b.plt}`,
        abnormal: b.isAbnormal,
        route: '/pages/records/blood-list',
      });
    }
    for (const b of bucket.biochem) {
      events.push({
        id: `biochem-${b._id}`,
        kind: 'biochem',
        kindLabel: '生化',
        title: summarizeBiochem(b),
        abnormal: b.isAbnormal,
        route: '/pages/records/biochem-list',
      });
    }
  }

  if (filter.value === 'all' || filter.value === 'cycle') {
    for (const c of bucket.cycles) {
      events.push({
        id: `cycle-${c._id}`,
        kind: 'cycle',
        kindLabel: '化疗',
        title: c.regimenName,
        sub: `${isoToLocalDateKey(c.startDate)} ~ ${isoToLocalDateKey(c.endDate)}`,
        route: '/pages/records/cycle-list',
      });
    }
  }

  if (filter.value === 'all' || filter.value === 'reminder') {
    for (const r of bucket.reminders) {
      events.push({
        id: `reminder-${r._id}`,
        kind: 'reminder',
        kindLabel: '提醒',
        title: r.title,
        sub: `${typeLabel(r.type)} · ${formatDisplayDateTime(r.dueDate)}`,
        route: '/pages/records/reminder-list',
      });
    }
  }

  return events;
});

function summarizeBiochem(b: BiochemTest): string {
  const parts: string[] = [];
  if (b.alt != null) parts.push(`ALT ${b.alt}`);
  if (b.ast != null) parts.push(`AST ${b.ast}`);
  if (b.cr != null) parts.push(`Cr ${b.cr}`);
  if (b.k != null) parts.push(`K ${b.k}`);
  return parts.length ? parts.join(' · ') : '生化检查记录';
}

function emptyBucket(): DayBucket {
  return {
    hasBlood: false,
    hasBiochem: false,
    hasCycle: false,
    hasReminder: false,
    hasAbnormal: false,
    blood: [],
    biochem: [],
    cycles: [],
    reminders: [],
  };
}

function ensure(map: Record<string, DayBucket>, key: string): DayBucket {
  if (!map[key]) map[key] = emptyBucket();
  return map[key];
}

function showDot(key: string, kind: Kind): boolean {
  const b = dayMap.value[key];
  if (!b) return false;
  if (filter.value === 'blood' && (kind === 'blood' || kind === 'biochem')) {
    return kind === 'blood' ? b.hasBlood : b.hasBiochem;
  }
  if (filter.value === 'cycle' && kind === 'cycle') return b.hasCycle;
  if (filter.value === 'reminder' && kind === 'reminder') return b.hasReminder;
  if (filter.value === 'all') {
    if (kind === 'blood') return b.hasBlood;
    if (kind === 'biochem') return b.hasBiochem;
    if (kind === 'cycle') return b.hasCycle;
    if (kind === 'reminder') return b.hasReminder;
  }
  // "检查" filter: blood + biochem
  if (filter.value === 'blood') {
    return kind === 'blood' ? b.hasBlood : kind === 'biochem' ? b.hasBiochem : false;
  }
  return false;
}

function selectDay(key: string) {
  selectedKey.value = key;
}

function prevMonth() {
  const next = shiftMonth(year.value, monthIndex.value, -1);
  year.value = next.year;
  monthIndex.value = next.monthIndex;
}

function nextMonth() {
  const next = shiftMonth(year.value, monthIndex.value, 1);
  year.value = next.year;
  monthIndex.value = next.monthIndex;
}

function goToday() {
  const t = new Date();
  year.value = t.getFullYear();
  monthIndex.value = t.getMonth();
  selectedKey.value = toDateKey(t);
}

async function loadMonth() {
  const requestId = ++loadSequence;
  const y = year.value;
  const m = monthIndex.value;
  const dateRange = monthIsoRange(y, m);
  error.value = '';
  loading.value = true;
  try {
    const [bloodTests, biochemTests, cycles, reminderRes] = await Promise.all([
      collectAllPages((page) => bloodApi.listBloodTests(page, 100, dateRange)),
      collectAllPages((page) => biochemApi.listBiochemTests(page, 100, dateRange)),
      collectAllPages((page) => cycleApi.listChemoCycles(page, 100, dateRange)),
      reminderApi.listReminders({ status: 'all', ...dateRange }),
    ]);
    if (requestId !== loadSequence) return;

    const map: Record<string, DayBucket> = {};
    const monthStart = new Date(y, m, 1);
    const monthEnd = new Date(y, m + 1, 0, 23, 59, 59, 999);

    for (const b of bloodTests) {
      const key = isoToLocalDateKey(b.date);
      if (!key) continue;
      const d = new Date(b.date);
      if (d < monthStart || d > monthEnd) continue;
      const bucket = ensure(map, key);
      bucket.blood.push(b);
      bucket.hasBlood = true;
      if (b.isAbnormal) bucket.hasAbnormal = true;
    }

    for (const b of biochemTests) {
      const key = isoToLocalDateKey(b.date);
      if (!key) continue;
      const d = new Date(b.date);
      if (d < monthStart || d > monthEnd) continue;
      const bucket = ensure(map, key);
      bucket.biochem.push(b);
      bucket.hasBiochem = true;
      if (b.isAbnormal) bucket.hasAbnormal = true;
    }

    for (const c of cycles) {
      const keys = eachDateKeyInRange(c.startDate, c.endDate);
      for (const key of keys) {
        const [ky, km] = key.split('-').map(Number);
        if (ky !== y || km !== m + 1) continue;
        const bucket = ensure(map, key);
        if (!bucket.cycles.find((x) => x._id === c._id)) {
          bucket.cycles.push(c);
        }
        bucket.hasCycle = true;
      }
    }

    for (const r of reminderRes.data || []) {
      const key = isoToLocalDateKey(r.dueDate);
      if (!key) continue;
      const d = new Date(r.dueDate);
      if (d < monthStart || d > monthEnd) continue;
      const bucket = ensure(map, key);
      bucket.reminders.push(r);
      bucket.hasReminder = true;
    }

    dayMap.value = map;

    // Keep selection in this month if possible
    const still = selectedKey.value;
    const [sy, sm] = still.split('-').map(Number);
    if (sy !== y || sm !== m + 1) {
      selectedKey.value = toDateKey(new Date(y, m, 1));
    }
  } catch (err) {
    if (requestId !== loadSequence) return;
    error.value = getErrorMessage(err, '加载月历失败');
    dayMap.value = {};
  } finally {
    if (requestId === loadSequence) loading.value = false;
  }
}

function openAdd() {
  uni.showActionSheet({
    itemList: ['血常规', '生化', '化疗周期', '提醒'],
    success: (res) => {
      const urls = [
        '/pages/records/blood-form',
        '/pages/records/biochem-form',
        '/pages/records/cycle-form',
        '/pages/records/reminder-form',
      ];
      uni.navigateTo({ url: urls[res.tapIndex] });
    },
  });
}

function openEvent(ev: DayEvent) {
  if (ev.route) uni.navigateTo({ url: ev.route });
}

watch([year, monthIndex], () => {
  loadMonth();
});

onShow(() => {
  if (!getAccessToken()) {
    uni.reLaunch({ url: '/pages/auth/login' });
    return;
  }
  loadMonth();
});
</script>

<style scoped lang="scss">
.page {
  min-height: 100vh;
  background: #f5f7f6;
  padding: 20rpx 20rpx calc(180rpx + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.month-bar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8rpx 8rpx 16rpx;
}

.nav-btn {
  width: 72rpx;
  height: 72rpx;
  line-height: 72rpx;
  text-align: center;
  font-size: 44rpx;
  color: #1f6b54;
  font-weight: 300;
}

.month-center {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.month-title {
  font-size: 34rpx;
  font-weight: 700;
  color: #1a2e28;
}

.today-link {
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #2d8a6e;
  font-weight: 600;
}

.legend {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx 18rpx;
  padding: 0 8rpx 12rpx;
}

.lg {
  font-size: 20rpx;
  color: #6b7c76;
  display: flex;
  align-items: center;
  gap: 6rpx;
}

.dot,
.d {
  width: 12rpx;
  height: 12rpx;
  border-radius: 50%;
  display: inline-block;
}

.dot.blood,
.d.blood {
  background: #3b82f6;
}
.dot.biochem,
.d.biochem {
  background: #8b5cf6;
}
.dot.cycle,
.d.cycle {
  background: #22a06b;
}
.dot.reminder,
.d.reminder {
  background: #f59e0b;
}
.dot.abn {
  background: #c0392b;
}

.filters {
  display: flex;
  gap: 12rpx;
  padding: 0 4rpx 16rpx;
  flex-wrap: wrap;
}

.chip {
  padding: 10rpx 22rpx;
  border-radius: 999rpx;
  background: #e8eeeb;
  color: #5a6d66;
  font-size: 24rpx;
}

.chip.on {
  background: #2d8a6e;
  color: #fff;
  font-weight: 600;
}

.banner {
  display: flex;
  justify-content: space-between;
  padding: 16rpx 20rpx;
  border-radius: 14rpx;
  margin-bottom: 12rpx;
  font-size: 26rpx;
}

.banner.error {
  background: #fdecea;
  color: #c0392b;
}

.link {
  color: #2d8a6e;
  font-weight: 600;
}

.cal-card {
  position: relative;
  background: #fff;
  border-radius: 20rpx;
  padding: 16rpx 12rpx 20rpx;
  margin-bottom: 16rpx;
  box-shadow: 0 6rpx 24rpx rgba(26, 46, 40, 0.05);
}

.week-head {
  display: flex;
  margin-bottom: 8rpx;
}

.wh {
  width: 14.28%;
  text-align: center;
  font-size: 22rpx;
  color: #8a9a94;
  font-weight: 600;
}

.grid {
  display: flex;
  flex-wrap: wrap;
}

.cell {
  width: 14.28%;
  height: 96rpx;
  box-sizing: border-box;
  padding: 6rpx 2rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  border-radius: 12rpx;
}

.cell.muted .day-num {
  color: #c5d0cb;
}

.cell.today .day-num {
  background: #e6f5ee;
  color: #1f6b54;
  font-weight: 700;
}

.cell.selected {
  background: #f0f7f3;
}

.cell.selected .day-num {
  background: #2d8a6e;
  color: #fff;
  font-weight: 700;
}

.cell.abnormal .day-num {
  color: #c0392b;
}

.cell.selected.abnormal .day-num {
  background: #c0392b;
  color: #fff;
}

.day-num {
  width: 48rpx;
  height: 48rpx;
  line-height: 48rpx;
  text-align: center;
  border-radius: 50%;
  font-size: 26rpx;
  color: #1a2e28;
}

.dots {
  display: flex;
  gap: 4rpx;
  margin-top: 4rpx;
  min-height: 12rpx;
}

.loading-mask {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.65);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 26rpx;
  color: #6b7c76;
  border-radius: 20rpx;
}

.day-panel {
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  box-shadow: 0 6rpx 24rpx rgba(26, 46, 40, 0.05);
}

.day-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12rpx;
}

.day-title {
  font-size: 30rpx;
  font-weight: 700;
  color: #1a2e28;
}

.add-link {
  font-size: 26rpx;
  color: #2d8a6e;
  font-weight: 600;
}

.empty-day {
  padding: 28rpx 0;
  text-align: center;
  color: #8a9a94;
  font-size: 26rpx;
}

.ev {
  display: flex;
  align-items: center;
  padding: 18rpx 0;
  border-top: 1rpx solid #eef2f0;
  border-left: 6rpx solid #ccc;
  padding-left: 16rpx;
  margin-bottom: 4rpx;
}

.ev.blood {
  border-left-color: #3b82f6;
}
.ev.biochem {
  border-left-color: #8b5cf6;
}
.ev.cycle {
  border-left-color: #22a06b;
}
.ev.reminder {
  border-left-color: #f59e0b;
}

.ev-left {
  flex: 1;
  min-width: 0;
}

.ev-kind {
  display: block;
  font-size: 20rpx;
  color: #8a9a94;
  margin-bottom: 4rpx;
}

.ev-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #1a2e28;
}

.ev-sub {
  display: block;
  margin-top: 4rpx;
  font-size: 22rpx;
  color: #6b7c76;
}

.ev-badge {
  font-size: 20rpx;
  padding: 4rpx 12rpx;
  border-radius: 999rpx;
}

.ev-badge.bad {
  background: #fdecea;
  color: #c0392b;
}
</style>
