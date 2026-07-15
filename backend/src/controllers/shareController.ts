import { Response } from 'express';
import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { AuthRequest } from '../middlewares/authMiddleware';
import { Share, IShare } from '../models/Share';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { recordAuditEvent } from '../utils/auditLogger';

const MAX_ACTIVE_SHARES = 50;

const EXPIRES_IN_MS: Record<string, number> = {
  '1d': 24 * 60 * 60 * 1000,
  '7d': 7 * 24 * 60 * 60 * 1000,
  '30d': 30 * 24 * 60 * 60 * 1000,
  '90d': 90 * 24 * 60 * 60 * 1000,
};

function expiresInToDate(expiresIn: string): Date | null {
  if (expiresIn === 'never') return null;
  const ms = EXPIRES_IN_MS[expiresIn];
  if (!ms) throw ApiError.badRequest('无效的有效期 (Invalid expiresIn)');
  return new Date(Date.now() + ms);
}

function buildShareUrl(token: string): string {
  const base = process.env.FRONTEND_URL || 'http://localhost:3000';
  return `${base.replace(/\/$/, '')}/share/${token}`;
}

function publicView(s: IShare) {
  return {
    _id: s._id,
    scope: s.scope,
    expiresAt: s.expiresAt,
    hasPin: !!s.pinHash,
    createdAt: s.createdAt,
  };
}

// @desc    Create a new share link
// @route   POST /api/shares
// @access  Private
export const createShare = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const userId = req.user?._id;

    // 业务前置 1: 总开关
    if (!req.user?.settings?.dataSharing?.enabled) {
      throw ApiError.forbidden('请先在设置→数据中开启数据共享 (Enable data sharing first)');
    }

    // 业务前置 2: 软上限
    const count = await Share.countDocuments({ user: userId });
    if (count >= MAX_ACTIVE_SHARES) {
      throw ApiError.conflict(
        `每个用户最多 ${MAX_ACTIVE_SHARES} 条活跃分享链接 (Max ${MAX_ACTIVE_SHARES} active shares per user)`
      );
    }

    const { scope, expiresIn, pin } = req.body as {
      scope: { bloodTests: boolean; chemoCycles: boolean; analytics: boolean };
      expiresIn: string;
      pin?: string;
    };

    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = expiresInToDate(expiresIn);
    const pinHash = pin ? await bcrypt.hash(pin, 10) : null;

    const share = await Share.create({
      user: userId,
      token,
      pinHash,
      scope,
      expiresAt,
    });

    res.status(201).json({
      success: true,
      data: {
        ...publicView(share),
        token,
        shareUrl: buildShareUrl(token),
      },
    });

    await recordAuditEvent({ user: req.user?._id, action: 'share_create', success: true, req });
  }
);

// @desc    List current user's active shares
// @route   GET /api/shares
// @access  Private
export const listShares = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const shares = await Share.find({ user: req.user?._id }).sort('-createdAt');
    res.json({
      success: true,
      data: shares.map(publicView),
    });
  }
);

// @desc    Delete (revoke) a share
// @route   DELETE /api/shares/:id
// @access  Private
export const deleteShare = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const result = await Share.findOneAndDelete({
      _id: req.params.id,
      user: req.user?._id,
    });

    if (!result) {
      throw ApiError.notFound('分享未找到 (Share not found)');
    }

    res.json({
      success: true,
      message: '分享已撤销 (Share revoked)',
    });

    await recordAuditEvent({ user: req.user?._id, action: 'share_revoke', success: true, req });
  }
);
