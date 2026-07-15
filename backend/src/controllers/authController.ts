import { Request, Response } from 'express';
import { User } from '../models/User';
import { BloodTest } from '../models/BloodTest';
import { ChemoCycle } from '../models/ChemoCycle';
import { Reminder } from '../models/Reminder';
import { Share } from '../models/Share';
import { AuditLog } from '../models/AuditLog';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { recordAuditEvent } from '../utils/auditLogger';
import { AuthRequest } from '../middlewares/authMiddleware';
import { secrets } from '../config/secrets';

// Token configurations
const ACCESS_TOKEN_EXPIRES_IN = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRES_IN = '7d'; // 7 days

/**
 * Generate access token
 */
const generateAccessToken = (id: string): string => {
  return jwt.sign({ id, type: 'access' }, secrets.jwt, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (id: string): string => {
  return jwt.sign({ id, type: 'refresh' }, secrets.jwtRefresh, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
};

/**
 * Generate token pair (access + refresh)
 */
const generateTokenPair = (id: string) => {
  return {
    accessToken: generateAccessToken(id),
    refreshToken: generateRefreshToken(id),
  };
};

// @desc    Register a new user
// @route   POST /api/auth/register
// @access  Public
export const registerUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password, fullName, dateOfBirth, gender } = req.body;

  // Check if user exists
  const userExists = await User.findOne({ email });

  if (userExists) {
    await recordAuditEvent({ user: null, action: 'register', success: false, req, detail: `邮箱已注册: ${email}` });
    throw ApiError.conflict('用户已存在 (User already exists)');
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Create user
  const user = await User.create({
    email,
    passwordHash,
    fullName,
    dateOfBirth,
    gender,
  });

  if (!user) {
    throw ApiError.badRequest('无效的用户数据 (Invalid user data)');
  }

  await recordAuditEvent({ user: user._id, action: 'register', success: true, req });

  // Generate tokens
  const tokens = generateTokenPair(user._id.toString());

  res.status(201).json({
    success: true,
    data: {
      _id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      ...tokens,
    },
  });
});

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;
  const clientIp = req.ip || '';

  const user = await User.findOne({ email });

  if (!user || !(await user.comparePassword(password))) {
    // 记录登录失败
    await recordAuditEvent({
      user: user?._id ?? null,
      action: 'login',
      success: false,
      req,
      detail: user ? '密码错误' : `邮箱不存在: ${email}`,
    });

    // 暴力破解检测：同一 IP 15 分钟内 5 次登录失败
    const recentFails = await AuditLog.countDocuments({
      ip: clientIp,
      action: 'login',
      success: false,
      createdAt: { $gte: new Date(Date.now() - 15 * 60 * 1000) },
    });
    if (recentFails >= 5) {
      await recordAuditEvent({
        user: user?._id ?? null,
        action: 'login',
        success: false,
        req,
        detail: `检测到暴力破解尝试: ${clientIp} 15 分钟内 ${recentFails} 次失败`,
        isAnomaly: true,
        anomalyType: 'brute_force',
      });
    }

    throw ApiError.unauthorized('邮箱或密码错误 (Invalid email or password)');
  }

  // 新 IP 检测
  const isNewIp = !user.knownIps.includes(clientIp);
  if (isNewIp) {
    user.knownIps.push(clientIp);
    await user.save();
  }

  await recordAuditEvent({
    user: user._id,
    action: 'login',
    success: true,
    req,
    detail: isNewIp ? `新 IP 登录: ${clientIp}` : undefined,
    isAnomaly: isNewIp,
    anomalyType: isNewIp ? 'new_ip' : undefined,
  });

  // Generate tokens
  const tokens = generateTokenPair(user._id.toString());

  res.json({
    success: true,
    data: {
      _id: user._id.toString(),
      email: user.email,
      fullName: user.fullName,
      settings: user.settings,
      ...tokens,
    },
  });
});

// @desc    Refresh access token
// @route   POST /api/auth/refresh-token
// @access  Public
export const refreshToken = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    throw ApiError.badRequest('刷新令牌是必需的 (Refresh token is required)');
  }

  try {
    const decoded = jwt.verify(refreshToken, secrets.jwtRefresh) as { id: string; type: string };

    if (decoded.type !== 'refresh') {
      throw ApiError.unauthorized('无效的刷新令牌 (Invalid refresh token)');
    }

    // Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      throw ApiError.unauthorized('用户不存在 (User not found)');
    }

    // Generate new token pair
    const tokens = generateTokenPair(user._id.toString());

    await recordAuditEvent({ user: user._id, action: 'refresh_token', success: true, req });

    res.json({
      success: true,
      data: tokens,
    });
  } catch (error) {
    await recordAuditEvent({ user: null, action: 'refresh_token', success: false, req });
    if (error instanceof jwt.TokenExpiredError) {
      throw ApiError.unauthorized('刷新令牌已过期，请重新登录 (Refresh token expired, please login again)');
    }
    throw ApiError.unauthorized('无效的刷新令牌 (Invalid refresh token)');
  }
});

// @desc    Logout user / Invalidate tokens
// @route   POST /api/auth/logout
// @access  Private
export const logoutUser = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  await recordAuditEvent({ user: req.user?._id, action: 'logout', success: true, req });
  res.json({
    success: true,
    message: '已成功登出 (Logged out successfully)',
  });
});

// @desc    Forgot password - send reset token
// @route   POST /api/auth/forgot-password
// @access  Public
export const forgotPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email } = req.body;

  const user = await User.findOne({ email });
  if (!user) {
    await recordAuditEvent({ user: null, action: 'forgot_password', success: false, req, detail: `邮箱不存在: ${email}` });
    throw ApiError.notFound('该邮箱未注册 (Email not found)');
  }

  const resetToken = crypto.randomBytes(32).toString('hex');
  const salt = await bcrypt.genSalt(12);
  const hashedToken = await bcrypt.hash(resetToken, salt);

  user.resetPasswordToken = hashedToken;
  user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
  await user.save();

  await recordAuditEvent({ user: user._id, action: 'forgot_password', success: true, req });

  // In production, send email here. For dev, return token in response.
  const isDev = process.env.NODE_ENV !== 'production';

  res.json({
    success: true,
    message: '密码重置链接已发送至您的邮箱 (Reset link sent to your email)',
    ...(isDev && { resetToken }),
  });
});

// @desc    Reset password using token
// @route   POST /api/auth/reset-password
// @access  Public
export const resetPassword = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { token, password } = req.body;

  const candidates = await User.find({
    resetPasswordExpires: { $gt: new Date() },
    resetPasswordToken: { $exists: true },
  });

  let matchedUser: typeof candidates[0] | null = null;
  for (const candidate of candidates) {
    const isValid = await bcrypt.compare(token, candidate.resetPasswordToken!);
    if (isValid) {
      matchedUser = candidate;
      break;
    }
  }

  if (!matchedUser) {
    await recordAuditEvent({ user: null, action: 'reset_password', success: false, req, detail: '无效或过期的重置令牌' });
    throw ApiError.badRequest('无效或已过期的重置令牌 (Invalid or expired reset token)');
  }

  const pwSalt = await bcrypt.genSalt(10);
  matchedUser.passwordHash = await bcrypt.hash(password, pwSalt);
  matchedUser.resetPasswordToken = undefined;
  matchedUser.resetPasswordExpires = undefined;
  await matchedUser.save();

  await recordAuditEvent({ user: matchedUser._id, action: 'reset_password', success: true, req });

  res.json({
    success: true,
    message: '密码已成功重置 (Password has been reset)',
  });
});

// @desc    Get current user profile
// @route   GET /api/auth/profile
// @access  Private
export const getProfile = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findById(req.user?._id).select('-passwordHash -resetPasswordToken -resetPasswordExpires');

  if (!user) {
    throw ApiError.notFound('用户未找到 (User not found)');
  }

  res.json({
    success: true,
    data: {
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      settings: user.settings,
      createdAt: (user as any).createdAt,
      updatedAt: (user as any).updatedAt,
    },
  });
});

// @desc    Update current user profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const fields: Record<string, unknown> = {};
  if (req.body.fullName !== undefined) fields.fullName = req.body.fullName;
  if (req.body.dateOfBirth !== undefined) fields.dateOfBirth = req.body.dateOfBirth;
  if (req.body.gender !== undefined) fields.gender = req.body.gender;

  if (Object.keys(fields).length === 0) {
    throw ApiError.badRequest('至少需要提供一个要更新的字段');
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: fields },
    { new: true, runValidators: true }
  ).select('-passwordHash -resetPasswordToken -resetPasswordExpires');

  if (!user) {
    throw ApiError.notFound('用户未找到 (User not found)');
  }

  res.json({
    success: true,
    data: {
      _id: user._id,
      email: user.email,
      fullName: user.fullName,
      dateOfBirth: user.dateOfBirth,
      gender: user.gender,
      settings: user.settings,
      createdAt: (user as any).createdAt,
      updatedAt: (user as any).updatedAt,
    },
  });
});

// @desc    Update user settings (notifications & data sharing)
// @route   PUT /api/auth/settings
// @access  Private
export const updateSettings = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { notifications, dataSharing } = req.body;

  const updateFields: Record<string, unknown> = {};
  if (notifications) {
    if (notifications.email !== undefined) updateFields['settings.notifications.email'] = notifications.email;
    if (notifications.push !== undefined) updateFields['settings.notifications.push'] = notifications.push;
  }
  if (dataSharing) {
    if (dataSharing.enabled !== undefined) updateFields['settings.dataSharing.enabled'] = dataSharing.enabled;
    if (dataSharing.sharedWith !== undefined) updateFields['settings.dataSharing.sharedWith'] = dataSharing.sharedWith;
  }

  if (Object.keys(updateFields).length === 0) {
    throw ApiError.badRequest('至少需要提供一个设置项');
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: updateFields },
    { new: true }
  ).select('-passwordHash -resetPasswordToken -resetPasswordExpires');

  if (!user) {
    throw ApiError.notFound('用户未找到 (User not found)');
  }

  res.json({
    success: true,
    data: user.settings,
  });
});

// @desc    Change current user's password
// @route   PUT /api/auth/change-password
// @access  Private
export const changePassword = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { currentPassword, newPassword } = req.body;

  const user = await User.findById(req.user?._id);
  if (!user) {
    throw ApiError.notFound('用户未找到 (User not found)');
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    await recordAuditEvent({ user: user._id, action: 'change_password', success: false, req, detail: '当前密码不正确' });
    throw ApiError.unauthorized('当前密码不正确 (Current password is incorrect)');
  }

  // 防止新旧密码相同
  const isSame = await user.comparePassword(newPassword);
  if (isSame) {
    await recordAuditEvent({ user: user._id, action: 'change_password', success: false, req, detail: '新密码与当前密码相同' });
    throw ApiError.badRequest('新密码不能与当前密码相同 (New password must differ from current)');
  }

  const salt = await bcrypt.genSalt(10);
  user.passwordHash = await bcrypt.hash(newPassword, salt);
  // 修改密码后使所有 reset token 失效（如有）
  user.resetPasswordToken = undefined;
  user.resetPasswordExpires = undefined;
  await user.save();

  await recordAuditEvent({ user: user._id, action: 'change_password', success: true, req });

  res.json({
    success: true,
    message: '密码已成功修改 (Password changed successfully)',
  });
});

// @desc    Delete current user's account and all related data (GDPR)
// @route   DELETE /api/auth/account
// @access  Private
export const deleteAccount = asyncHandler(
  async (req: AuthRequest, res: Response): Promise<void> => {
    const { password } = req.body;
    const userId = req.user?._id;

    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('用户未找到 (User not found)');
    }

    // 二次密码验证 - 防止误删 / token 被盗后远程销户
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw ApiError.unauthorized('密码不正确 (Password is incorrect)');
    }

    // 删除前记录审计日志（删除后 user 不存在了）
    await recordAuditEvent({ user: userId, action: 'delete_account', success: true, req });

    // 级联删除该用户的所有数据 (Mongoose 不支持事务时尽力而为：先数据后用户)
    const [bloodTestsRes, chemoCyclesRes, remindersRes, sharesRes] = await Promise.all([
      BloodTest.deleteMany({ user: userId }),
      ChemoCycle.deleteMany({ user: userId }),
      Reminder.deleteMany({ user: userId }),
      Share.deleteMany({ user: userId }),
    ]);

    await user.deleteOne();

    res.json({
      success: true,
      message: '账户已删除 (Account deleted)',
      data: {
        bloodTests: bloodTestsRes.deletedCount,
        chemoCycles: chemoCyclesRes.deletedCount,
        reminders: remindersRes.deletedCount,
        shares: sharesRes.deletedCount,
      },
    });
  }
);

// @desc    Get current user's audit logs (security log)
// @route   GET /api/auth/audit-logs
// @access  Private
export const getAuditLogs = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const logs = await AuditLog.find({ user: req.user?._id })
    .sort('-createdAt')
    .limit(50)
    .select('-user -__v');

  res.json({
    success: true,
    data: logs,
  });
});
