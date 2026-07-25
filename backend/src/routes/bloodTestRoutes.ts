import express from 'express';
import {
  getBloodTests,
  createBloodTest,
  getBloodTestById,
  updateBloodTest,
  deleteBloodTest,
  exportBloodTests,
} from '../controllers/bloodTestController';
import { protect } from '../middlewares/authMiddleware';
import { validateBloodTest, validateBloodTestUpdate, validatePagination, validateDateRangeQuery, validateId } from '../middlewares/validationMiddleware';

const router = express.Router();

// Apply auth middleware to all blood test routes
router.use(protect);

router.route('/')
  .get(validatePagination, validateDateRangeQuery, getBloodTests)
  .post(validateBloodTest, createBloodTest);

// 必须在 /:id 之前，否则会被 mongoId 校验拦截
router.get('/export', exportBloodTests);

router.route('/:id')
  .get(validateId, getBloodTestById)
  .put(validateId, validateBloodTestUpdate, updateBloodTest)
  .delete(validateId, deleteBloodTest);

export default router;
