import express from 'express';
import {
  getChemoCycles,
  createChemoCycle,
  getChemoCycleById,
  updateChemoCycle,
  deleteChemoCycle,
} from '../controllers/chemoCycleController';
import { protect } from '../middlewares/authMiddleware';
import { validateChemoCycle, validateChemoCycleUpdate, validatePagination, validateDateRangeQuery, validateId } from '../middlewares/validationMiddleware';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(validatePagination, validateDateRangeQuery, getChemoCycles)
  .post(validateChemoCycle, createChemoCycle);

router.route('/:id')
  .get(validateId, getChemoCycleById)
  .put(validateId, validateChemoCycleUpdate, updateChemoCycle)
  .delete(validateId, deleteChemoCycle);

export default router;
