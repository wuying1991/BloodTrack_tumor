import type { ReminderRecurrence, ReminderType } from '@/types/reminder';

export const REMINDER_TYPES: Array<{ value: ReminderType; label: string }> = [
  { value: 'blood-test', label: '血检' },
  { value: 'chemo-cycle', label: '化疗' },
  { value: 'medication', label: '用药' },
  { value: 'follow-up', label: '复诊' },
  { value: 'custom', label: '自定义' },
];

export const REMINDER_RECURRENCES: Array<{
  value: ReminderRecurrence;
  label: string;
}> = [
  { value: 'none', label: '单次' },
  { value: 'daily', label: '每日' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
];

export function typeLabel(type: ReminderType): string {
  return REMINDER_TYPES.find((t) => t.value === type)?.label || type;
}

export function recurrenceLabel(r: ReminderRecurrence): string {
  return REMINDER_RECURRENCES.find((x) => x.value === r)?.label || r;
}
