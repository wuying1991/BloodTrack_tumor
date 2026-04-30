import express from 'express';
import { getTrends, getSummary } from '../controllers/analyticsController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(protect);

router.get('/trends', getTrends);
router.get('/summary', getSummary);

export default router;
