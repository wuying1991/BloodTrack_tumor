import mongoose, { Document, Schema } from 'mongoose';

export type ReminderType =
  | 'blood-test'
  | 'chemo-cycle'
  | 'medication'
  | 'follow-up'
  | 'custom';

export type ReminderRecurrence = 'none' | 'daily' | 'weekly' | 'monthly';

export const REMINDER_TYPES: ReminderType[] = [
  'blood-test',
  'chemo-cycle',
  'medication',
  'follow-up',
  'custom',
];

export const REMINDER_RECURRENCES: ReminderRecurrence[] = [
  'none',
  'daily',
  'weekly',
  'monthly',
];

export interface IReminder extends Document {
  user: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  type: ReminderType;
  dueDate: Date;
  recurrence: ReminderRecurrence;
  enabled: boolean;
  completed: boolean;
  notifications: { email: boolean; push: boolean };
  lastTriggeredAt?: Date;
}

const reminderSchema = new Schema<IReminder>(
  {
    user: { type: Schema.Types.ObjectId, required: true, ref: 'User', index: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, maxlength: 1000 },
    type: { type: String, enum: REMINDER_TYPES, default: 'custom' },
    dueDate: { type: Date, required: true },
    recurrence: { type: String, enum: REMINDER_RECURRENCES, default: 'none' },
    enabled: { type: Boolean, default: true },
    completed: { type: Boolean, default: false },
    notifications: {
      email: { type: Boolean, default: true },
      push: { type: Boolean, default: true },
    },
    lastTriggeredAt: { type: Date },
  },
  { timestamps: true }
);

// 常用查询: 拉某个用户在 dueDate 升序范围内的列表
reminderSchema.index({ user: 1, dueDate: 1 });

export const Reminder = mongoose.model<IReminder>('Reminder', reminderSchema);
