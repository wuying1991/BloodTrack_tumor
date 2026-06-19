import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import { Share, IShare } from '../models/Share';
import { User, IUser } from '../models/User';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

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
    throw ApiError.notFound('链接不存在 (Share not found)');
  }

  if (share.expiresAt && share.expiresAt.getTime() < Date.now()) {
    throw ApiError.gone('链接已过期 (Share expired)');
  }

  if (checkPin && share.pinHash) {
    const headerPin = req.header('X-Share-Pin');
    if (!headerPin) {
      throw ApiError.unauthorized('请输入访问密码 (PIN required)');
    }
    const ok = await bcrypt.compare(headerPin, share.pinHash);
    if (!ok) {
      throw ApiError.unauthorized('密码错误 (Wrong PIN)');
    }
  }

  const owner = await User.findById(share.user).select('firstName lastName');
  if (!owner) {
    // owner 已被删除（理论上 deleteAccount 会级联清理 share，这里是兜底）
    throw ApiError.notFound('链接不存在 (Share not found)');
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
      ownerName: `${owner.firstName} ${owner.lastName}`,
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
