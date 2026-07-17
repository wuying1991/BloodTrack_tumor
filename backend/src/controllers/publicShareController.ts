import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Share, IShare } from '../models/Share';
import { User, IUser } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { BloodTest } from '../models/BloodTest';
import { ChemoCycle } from '../models/ChemoCycle';

/**
 * 公开端 helper: token → share + owner，含 expiresAt 与 PIN 校验。
 * scope 校验由各资源 handler 自己做（因为 verify 端点不需要 scope 校验）。
 *
 * @param checkPin true 时校验 X-Share-Pin header；false 仅做 token 与过期校验
 */
export async function loadShareWithPin(
  req: Request,
  checkPin: boolean = true
): Promise<{ share: IShare; owner: IUser }> {
  const { token } = req.params;
  const share = await Share.findOne({ token });
  if (!share) {
    throw ApiError.notFound('链接不存在 (Share not found)', 'SHARE_NOT_FOUND');
  }

  if (share.expiresAt && share.expiresAt.getTime() < Date.now()) {
    throw ApiError.gone('链接已过期 (Share expired)', 'SHARE_EXPIRED');
  }

  if (checkPin && share.pinHash) {
    const headerPin = req.header('X-Share-Pin');
    if (!headerPin) {
      throw ApiError.unauthorized('请输入访问密码 (PIN required)', 'SHARE_PIN_REQUIRED');
    }
    const ok = await bcrypt.compare(headerPin, share.pinHash);
    if (!ok) {
      throw ApiError.unauthorized('密码错误 (Wrong PIN)', 'SHARE_WRONG_PIN');
    }
  }

  const owner = await User.findById(share.user).select('fullName');
  if (!owner) {
    // owner 已被删除（理论上 deleteAccount 会级联清理 share，这里是兜底）
    throw ApiError.notFound('链接不存在 (Share not found)', 'SHARE_NOT_FOUND');
  }

  return { share, owner };
}

// @desc    Get share metadata (no PIN required)
// @route   GET /api/public/shares/:token
// @access  Public
export const getShareMeta = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { share, owner } = await loadShareWithPin(req, false);

  res.json({
    success: true,
    data: {
      ownerName: owner.fullName,
      scope: share.scope,
      expiresAt: share.expiresAt,
      requiresPin: !!share.pinHash,
    },
  });
});

// @desc    Verify PIN (no-op for shares without PIN)
// @route   POST /api/public/shares/:token/verify
// @access  Public
export const verifySharePin = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { share } = await loadShareWithPin(req, false);

  if (!share.pinHash) {
    res.json({ success: true, message: '无需密码' });
    return;
  }

  const { pin } = req.body as { pin?: string };
  if (!pin) {
    throw ApiError.unauthorized('请输入访问密码 (PIN required)');
  }
  const ok = await bcrypt.compare(pin, share.pinHash);
  if (!ok) {
    throw ApiError.unauthorized('密码错误 (Wrong PIN)');
  }

  res.json({ success: true, message: 'PIN 验证成功' });
});

type RangeKey = '1m' | '3m' | '6m' | '1y' | 'all';
const RANGE_DAYS: Record<Exclude<RangeKey, 'all'>, number> = {
  '1m': 30,
  '3m': 90,
  '6m': 180,
  '1y': 365,
};
function buildDateFilter(range: unknown): { date?: { $gte: Date } } {
  const r = (typeof range === 'string' ? range : 'all') as RangeKey;
  if (r === 'all' || !(r in RANGE_DAYS)) return {};
  const days = RANGE_DAYS[r as Exclude<RangeKey, 'all'>];
  return { date: { $gte: new Date(Date.now() - days * 24 * 60 * 60 * 1000) } };
}

// @desc    Get blood tests via share token
// @route   GET /api/public/shares/:token/blood-tests
// @access  Public (token + optional PIN via X-Share-Pin header)
export const getSharedBloodTests = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { share } = await loadShareWithPin(req);
  if (!share.scope.bloodTests) {
    throw ApiError.forbidden('该资源未在此分享中开启 (Resource not in scope)', 'SHARE_RESOURCE_NOT_IN_SCOPE');
  }
  const tests = await BloodTest.find({ user: share.user }).sort('-date').lean();
  res.json({ success: true, data: tests });
});

// @desc    Get chemo cycles via share token
// @route   GET /api/public/shares/:token/chemo-cycles
// @access  Public
export const getSharedChemoCycles = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { share } = await loadShareWithPin(req);
  if (!share.scope.chemoCycles) {
    throw ApiError.forbidden('该资源未在此分享中开启 (Resource not in scope)', 'SHARE_RESOURCE_NOT_IN_SCOPE');
  }
  const cycles = await ChemoCycle.find({ user: share.user }).sort('-startDate').lean();
  res.json({ success: true, data: cycles });
});

// @desc    Get analytics (trends + summary) via share token
// @route   GET /api/public/shares/:token/analytics?range=1m|3m|6m|1y|all
// @access  Public
export const getSharedAnalytics = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { share } = await loadShareWithPin(req);
  if (!share.scope.analytics) {
    throw ApiError.forbidden('该资源未在此分享中开启 (Resource not in scope)', 'SHARE_RESOURCE_NOT_IN_SCOPE');
  }

  const dateFilter = buildDateFilter(req.query.range);
  const tests = await BloodTest.find({ user: share.user, ...dateFilter })
    .sort('date')
    .select('date wbc rbc hgb plt neu lym isAbnormal')
    .lean();

  const trends = tests.map((t: any) => ({
    date: t.date.toISOString().split('T')[0],
    wbc: t.wbc, rbc: t.rbc, hgb: t.hgb, plt: t.plt,
    neu: t.neu, lym: t.lym,
    isAbnormal: t.isAbnormal,
  }));

  // 简版 summary（不含趋势箭头计算 — 受邀者不需要那么细）
  const totalTests = await BloodTest.countDocuments({ user: share.user });
  const abnormalCount = await BloodTest.countDocuments({ user: share.user, isAbnormal: true });

  res.json({
    success: true,
    data: {
      trends,
      summary: {
        totalTests,
        abnormalRate: totalTests > 0 ? Math.round((abnormalCount / totalTests) * 100) : 0,
      },
    },
  });
});
