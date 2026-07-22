import express from 'express';
import rateLimit, { ipKeyGenerator } from 'express-rate-limit';
import { protect, AuthRequest } from '../middlewares/authMiddleware';
import {
  listLabReportProviders,
  parseLabReport,
} from '../controllers/labReportController';

const router = express.Router();

const isTest = process.env.NODE_ENV === 'test';
const rateLimitDisabled = process.env.RATE_LIMIT_DISABLED === 'true';
const skipRateLimit = () => isTest || rateLimitDisabled;

function labRateKey(prefix: string, req: express.Request): string {
  const user = (req as AuthRequest).user;
  const id = user?._id != null ? String(user._id) : '';
  if (id) return `${prefix}:user:${id}`;
  // IPv6-safe fallback (protect normally runs first)
  return `${prefix}:ip:${ipKeyGenerator(req.ip ?? '')}`;
}

/**
 * Stricter limit for expensive vision/OCR calls.
 * Keyed by user id when authenticated (set after protect).
 * Dev: 40 / 15min · Prod: 15 / 15min per user
 */
const labReportParseLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max:
    process.env.NODE_ENV === 'development'
      ? 40
      : process.env.NODE_ENV === 'test'
        ? 200
        : 15,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit,
  keyGenerator: (req) => labRateKey('lab-parse', req),
  message: {
    success: false,
    code: 'RATE_LIMIT_LAB_REPORT',
    message: '识别次数过多，请稍后再试',
  },
});

const labReportListLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: process.env.NODE_ENV === 'development' ? 60 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: skipRateLimit,
  keyGenerator: (req) => labRateKey('lab-list', req),
  message: {
    success: false,
    code: 'RATE_LIMIT_LAB_REPORT',
    message: '请求过于频繁',
  },
});

// Auth first so limiters can key by user
router.use(protect);

/** List vision providers + active config (no secrets). */
router.get('/providers', labReportListLimiter, listLabReportProviders);

/** Parse lab report photo → structured metrics (does not persist). */
router.post('/parse', labReportParseLimiter, parseLabReport);

export default router;
