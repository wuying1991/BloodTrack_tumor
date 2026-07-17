import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import {
  Reminder,
  IReminder,
  ReminderRecurrence,
} from '../models/Reminder';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * 把当前的 dueDate 推到下一个周期。
 * - daily: +1 天
 * - weekly: +7 天
 * - monthly: 下一月同一日（用 setMonth 处理跨月/跨年）
 * - none: 不推
 */
function nextDueDate(current: Date, recurrence: ReminderRecurrence): Date {
  const next = new Date(current);
  switch (recurrence) {
    case 'daily':
      next.setDate(next.getDate() + 1);
      break;
    case 'weekly':
      next.setDate(next.getDate() + 7);
      break;
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'none':
    default:
      break;
  }
  return next;
}

// @desc    Get reminders for logged in user (支持 status / type 过滤)
// @route   GET /api/reminders?status=pending|completed&type=...
// @access  Private
export const getReminders = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { status, type } = req.query;
    const filter: Record<string, unknown> = { user: req.user?._id };

    if (status === 'pending') filter.completed = false;
    else if (status === 'completed') filter.completed = true;

    if (typeof type === 'string') filter.type = type;

    const reminders = await Reminder.find(filter).sort('dueDate');

    res.json({
      success: true,
      data: reminders,
    });
  }
);

// @desc    Get upcoming reminders (next N days, default 7)
// @route   GET /api/reminders/upcoming?days=7
// @access  Private
export const getUpcomingReminders = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const days = Math.min(
      Math.max(parseInt((req.query.days as string) || '7', 10) || 7, 1),
      90
    );

    const now = new Date();
    const horizon = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

    // 即将到期 = 启用 + 未完成 + dueDate 在 [now, horizon] 之间
    const reminders = await Reminder.find({
      user: req.user?._id,
      enabled: true,
      completed: false,
      dueDate: { $gte: now, $lte: horizon },
    }).sort('dueDate');

    res.json({
      success: true,
      data: reminders,
    });
  }
);

// @desc    Create a new reminder
// @route   POST /api/reminders
// @access  Private
export const createReminder = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const reminder = await Reminder.create({
      ...req.body,
      user: req.user?._id,
    });

    res.status(201).json({
      success: true,
      data: reminder,
    });
  }
);

// @desc    Get single reminder by ID
// @route   GET /api/reminders/:id
// @access  Private
export const getReminderById = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const reminder = await Reminder.findOne({
      _id: req.params.id,
      user: req.user?._id,
    });

    if (!reminder) {
      throw ApiError.notFound('提醒未找到 (Reminder not found)', 'REMINDER_NOT_FOUND');
    }

    res.json({
      success: true,
      data: reminder,
    });
  }
);

// @desc    Update reminder
// @route   PUT /api/reminders/:id
// @access  Private
export const updateReminder = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    // user 字段不允许通过 body 改写
    const update = { ...req.body };
    delete update.user;

    const updated = await Reminder.findOneAndUpdate(
      { _id: req.params.id, user: req.user?._id },
      update,
      { new: true, runValidators: true }
    );

    if (!updated) {
      throw ApiError.notFound('提醒未找到 (Reminder not found)', 'REMINDER_NOT_FOUND');
    }

    res.json({
      success: true,
      data: updated,
    });
  }
);

// @desc    Mark reminder as completed (递归型自动滚动到下一周期)
// @route   PATCH /api/reminders/:id/complete
// @access  Private
export const completeReminder = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const reminder = (await Reminder.findOne({
      _id: req.params.id,
      user: req.user?._id,
    })) as IReminder | null;

    if (!reminder) {
      throw ApiError.notFound('提醒未找到 (Reminder not found)', 'REMINDER_NOT_FOUND');
    }

    reminder.lastTriggeredAt = reminder.dueDate;

    if (reminder.recurrence === 'none') {
      // 一次性提醒：标记完成
      reminder.completed = true;
    } else {
      // 递归型：滚动到下一周期，保持 completed=false
      reminder.dueDate = nextDueDate(reminder.dueDate, reminder.recurrence);
      reminder.completed = false;
    }

    await reminder.save();

    res.json({
      success: true,
      data: reminder,
    });
  }
);

// @desc    Delete reminder
// @route   DELETE /api/reminders/:id
// @access  Private
export const deleteReminder = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const result = await Reminder.deleteOne({
      _id: req.params.id,
      user: req.user?._id,
    });

    if (result.deletedCount === 0) {
      throw ApiError.notFound('提醒未找到 (Reminder not found)', 'REMINDER_NOT_FOUND');
    }

    res.json({
      success: true,
      message: '提醒已删除 (Reminder removed)',
    });
  }
);
