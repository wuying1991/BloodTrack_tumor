import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { BloodTest } from '../models/BloodTest';
import { asyncHandler } from '../utils/asyncHandler';

// @desc    Get trend data for blood test values over time
// @route   GET /api/analytics/trends
// @access  Private
export const getTrends = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tests = await BloodTest.find({ user: req.user?._id })
    .sort('date')
    .select('date wbc rbc hgb plt neu lym isAbnormal')
    .lean();

  const trends = tests.map(t => ({
    date: (t as any).date.toISOString().split('T')[0],
    wbc: t.wbc,
    rbc: t.rbc,
    hgb: t.hgb,
    plt: t.plt,
    neu: t.neu,
    lym: t.lym,
    isAbnormal: t.isAbnormal,
  }));

  res.json({ success: true, data: trends });
});

// @desc    Get analytics summary for dashboard
// @route   GET /api/analytics/summary
// @access  Private
export const getSummary = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const totalTests = await BloodTest.countDocuments({ user: req.user?._id });

  if (totalTests === 0) {
    res.json({
      success: true,
      data: {
        totalTests: 0,
        abnormalRate: 0,
        latestValues: null,
        trends: { wbc: 'stable', rbc: 'stable', hgb: 'stable', plt: 'stable' },
      },
    });
    return;
  }

  const abnormalCount = await BloodTest.countDocuments({
    user: req.user?._id,
    isAbnormal: true,
  });

  const latest = await BloodTest.findOne({ user: req.user?._id })
    .sort('-date')
    .select('date wbc rbc hgb plt neu lym isAbnormal')
    .lean();

  const recent = await BloodTest.find({ user: req.user?._id })
    .sort('-date')
    .limit(5)
    .select('date wbc rbc hgb plt')
    .lean();

  const getTrend = (field: 'wbc' | 'rbc' | 'hgb' | 'plt'): 'up' | 'down' | 'stable' => {
    if (recent.length < 2) return 'stable';
    const latest = recent[0][field];
    const previous = recent[recent.length - 1][field];
    if (latest > previous * 1.05) return 'up';
    if (latest < previous * 0.95) return 'down';
    return 'stable';
  };

  res.json({
    success: true,
    data: {
      totalTests,
      abnormalRate: Math.round((abnormalCount / totalTests) * 100),
      latestValues: latest
        ? {
            date: (latest as any).date.toISOString().split('T')[0],
            wbc: latest.wbc,
            rbc: latest.rbc,
            hgb: latest.hgb,
            plt: latest.plt,
            neu: latest.neu,
            lym: latest.lym,
          }
        : null,
      trends: {
        wbc: getTrend('wbc'),
        rbc: getTrend('rbc'),
        hgb: getTrend('hgb'),
        plt: getTrend('plt'),
      },
    },
  });
});
