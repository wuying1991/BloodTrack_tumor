import express from 'express';
import { 
  getBloodTests, 
  createBloodTest, 
  getBloodTestById, 
  updateBloodTest, 
  deleteBloodTest 
} from '../controllers/bloodTestController';
import { protect } from '../middlewares/authMiddleware';
import { validateBloodTest, validateBloodTestUpdate, validatePagination, validateId } from '../middlewares/validationMiddleware';

const router = express.Router();

// Apply auth middleware to all blood test routes
router.use(protect);

router.route('/')
  .get(validatePagination, getBloodTests)
  .post(validateBloodTest, createBloodTest);

router.route('/:id')
  .get(validateId, getBloodTestById)
  .put(validateId, validateBloodTestUpdate, updateBloodTest)
  .delete(validateId, deleteBloodTest);

export default router;
