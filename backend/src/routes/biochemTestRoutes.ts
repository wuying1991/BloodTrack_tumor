import express from 'express';
import {
  getBiochemTests,
  createBiochemTest,
  getBiochemTestById,
  updateBiochemTest,
  deleteBiochemTest,
  exportBiochemTests,
} from '../controllers/biochemTestController';
import { protect } from '../middlewares/authMiddleware';
import {
  validateBiochemTest,
  validateBiochemTestUpdate,
  validatePagination,
  validateDateRangeQuery,
  validateId,
} from '../middlewares/validationMiddleware';

const router = express.Router();

router.use(protect);

// /export 必须在 /:id 之前，否则被 validateId 拦截
router.get('/export', exportBiochemTests);

router.route('/')
  .get(validatePagination, validateDateRangeQuery, getBiochemTests)
  .post(validateBiochemTest, createBiochemTest);

router.route('/:id')
  .get(validateId, getBiochemTestById)
  .put(validateId, validateBiochemTestUpdate, updateBiochemTest)
  .delete(validateId, deleteBiochemTest);

export default router;
