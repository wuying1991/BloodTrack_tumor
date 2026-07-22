export type ReminderType =
  | 'blood-test'
  | 'chemo-cycle'
  | 'medication'
  | 'follow-up'
  | 'custom';

export type ReminderRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export interface Reminder {
  _id: string;
  user: string;
  title: string;
  description?: string;
  type: ReminderType;
  dueDate: string;
  recurrence: ReminderRecurrence;
  enabled: boolean;
  completed: boolean;
  notifications: { email: boolean; push: boolean };
  lastTriggeredAt?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReminderCreatePayload {
  title: string;
  description?: string;
  type?: ReminderType;
  dueDate: string;
  recurrence?: ReminderRecurrence;
  enabled?: boolean;
  notifications?: { email?: boolean; push?: boolean };
}

export interface ReminderListResult {
  success: boolean;
  data: Reminder[];
}

export type ReminderStatusFilter = 'all' | 'pending' | 'completed';
