import apiClient from '../api/apiClient';

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

export interface ReminderCreateData {
  title: string;
  description?: string;
  type?: ReminderType;
  dueDate: string;
  recurrence?: ReminderRecurrence;
  enabled?: boolean;
  notifications?: { email?: boolean; push?: boolean };
}

export type ReminderUpdateData = Partial<ReminderCreateData> & {
  completed?: boolean;
};

export interface GetRemindersResponse {
  success: boolean;
  data: Reminder[];
}

export interface ReminderItemResponse {
  success: boolean;
  data: Reminder;
}

export interface DeleteReminderResponse {
  success: boolean;
  message: string;
}

export interface ListFilter {
  status?: 'pending' | 'completed';
  type?: ReminderType;
}

class ReminderService {
  async getReminders(filter: ListFilter = {}): Promise<GetRemindersResponse> {
    const params = new URLSearchParams();
    if (filter.status) params.append('status', filter.status);
    if (filter.type) params.append('type', filter.type);
    const qs = params.toString();
    return apiClient.get<GetRemindersResponse>(
      `/reminders${qs ? `?${qs}` : ''}`
    );
  }

  async getUpcoming(days = 7): Promise<GetRemindersResponse> {
    return apiClient.get<GetRemindersResponse>(
      `/reminders/upcoming?days=${days}`
    );
  }

  async getReminderById(id: string): Promise<ReminderItemResponse> {
    return apiClient.get<ReminderItemResponse>(`/reminders/${id}`);
  }

  async createReminder(
    data: ReminderCreateData
  ): Promise<ReminderItemResponse> {
    return apiClient.post<ReminderItemResponse>('/reminders', data);
  }

  async updateReminder(
    id: string,
    data: ReminderUpdateData
  ): Promise<ReminderItemResponse> {
    return apiClient.put<ReminderItemResponse>(`/reminders/${id}`, data);
  }

  async completeReminder(id: string): Promise<ReminderItemResponse> {
    return apiClient.patch<ReminderItemResponse>(`/reminders/${id}/complete`);
  }

  async deleteReminder(id: string): Promise<DeleteReminderResponse> {
    return apiClient.delete<DeleteReminderResponse>(`/reminders/${id}`);
  }
}

const reminderService = new ReminderService();
export default reminderService;
