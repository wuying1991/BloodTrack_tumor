import express from 'express';
import {
  getShareMeta,
  verifySharePin,
  getSharedBloodTests,
  getSharedChemoCycles,
  getSharedAnalytics,
} from '../controllers/publicShareController';

const router = express.Router();

router.get('/:token', getShareMeta);
router.post('/:token/verify', verifySharePin);
router.get('/:token/blood-tests', getSharedBloodTests);
router.get('/:token/chemo-cycles', getSharedChemoCycles);
router.get('/:token/analytics', getSharedAnalytics);

export default router;
