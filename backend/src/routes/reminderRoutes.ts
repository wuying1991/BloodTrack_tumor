import express from 'express';
import {
  getReminders,
  getUpcomingReminders,
  createReminder,
  getReminderById,
  updateReminder,
  completeReminder,
  deleteReminder,
} from '../controllers/reminderController';
import { protect } from '../middlewares/authMiddleware';
import {
  validateReminderCreate,
  validateReminderUpdate,
  validateDateRangeQuery,
  validateId,
} from '../middlewares/validationMiddleware';

const router = express.Router();

router.use(protect);

// 必须在 /:id 之前，否则被 validateId 拦截
router.get('/upcoming', getUpcomingReminders);

router.route('/')
  .get(validateDateRangeQuery, getReminders)
  .post(validateReminderCreate, createReminder);

router.patch('/:id/complete', validateId, completeReminder);

router.route('/:id')
  .get(validateId, getReminderById)
  .put(validateId, validateReminderUpdate, updateReminder)
  .delete(validateId, deleteReminder);

export default router;
