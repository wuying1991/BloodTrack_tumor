import express from 'express';
import { getTrends, getBiochemTrends, getSummary } from '../controllers/analyticsController';
import { protect } from '../middlewares/authMiddleware';

const router = express.Router();

router.use(protect);

router.get('/trends', getTrends);
router.get('/biochem-trends', getBiochemTrends);
router.get('/summary', getSummary);

export default router;
