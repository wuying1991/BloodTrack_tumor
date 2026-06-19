import express from 'express';
import {
  createShare,
  listShares,
  deleteShare,
} from '../controllers/shareController';
import { protect } from '../middlewares/authMiddleware';
import {
  validateShareCreate,
  validateId,
} from '../middlewares/validationMiddleware';

const router = express.Router();

router.use(protect);

router.route('/')
  .get(listShares)
  .post(validateShareCreate, createShare);

router.delete('/:id', validateId, deleteShare);

export default router;
