import { http } from '@/api/http';
import type { ApiSuccess } from '@/types/api';
import type {
  Reminder,
  ReminderCreatePayload,
  ReminderListResult,
  ReminderStatusFilter,
  ReminderType,
} from '@/types/reminder';

export async function listReminders(params?: {
  status?: ReminderStatusFilter;
  type?: ReminderType;
  startDate?: string;
  endDate?: string;
}): Promise<ReminderListResult> {
  const query: Record<string, string> = {};
  if (params?.status && params.status !== 'all') {
    query.status = params.status;
  }
  if (params?.type) query.type = params.type;
  if (params?.startDate) query.startDate = params.startDate;
  if (params?.endDate) query.endDate = params.endDate;
  return http.get<ReminderListResult>('/reminders', query);
}

export async function listUpcomingReminders(
  days = 7
): Promise<ReminderListResult> {
  return http.get<ReminderListResult>('/reminders/upcoming', { days });
}

export async function createReminder(
  payload: ReminderCreatePayload
): Promise<Reminder> {
  const res = await http.post<ApiSuccess<Reminder>>('/reminders', payload);
  return res.data;
}

export async function completeReminder(id: string): Promise<Reminder> {
  const res = await http.patch<ApiSuccess<Reminder>>(
    `/reminders/${id}/complete`
  );
  return res.data;
}

export async function deleteReminder(id: string): Promise<void> {
  await http.delete(`/reminders/${id}`);
}
