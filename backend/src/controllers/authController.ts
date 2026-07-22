import { Request, Response } from 'express';
import { User } from '../models/User';
import { BloodTest } from '../models/BloodTest';
import { BiochemTest } from '../models/BiochemTest';
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
import {
  maskPhone,
  normalizePhone,
  sendLoginCode,
  verifyLoginCode,
} from '../services/sms/smsCodeService';
import {
  assertCanUnbindEmail,
  assertCanUnbindPhone,
  assertPasswordStrength,
  identitySnapshot,
  profilePayload,
  resolvePasswordLoginLookup,
} from '../utils/authIdentity';

// Token configurations
const ACCESS_TOKEN_EXPIRES_IN = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRES_IN = '7d'; // 7 days

const authUserPayload = (user: {
  _id: { toString(): string };
  email?: string;
  phone?: string;
  fullName: string;
  passwordHash?: string;
  settings?: unknown;
}) => {
  const identity = identitySnapshot(user);
  return {
    _id: user._id.toString(),
    email: user.email,
    phone: user.phone,
    fullName: user.fullName,
    settings: user.settings,
    hasPassword: identity.hasPassword,
    methods: identity.methods,
  };
};

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
    await recordAuditEvent({
      user: null, action: 'register', success: false, req,
      detail: `邮箱已注册: ${email}`,
      detailCode: 'EMAIL_ALREADY_REGISTERED', detailParams: { email },
    });
    throw ApiError.conflict('用户已存在 (User already exists)', 'AUTH_USER_EXISTS');
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
    throw ApiError.badRequest('无效的用户数据 (Invalid user data)', undefined, 'AUTH_INVALID_USER_DATA');
  }

  await recordAuditEvent({ user: user._id, action: 'register', success: true, req });

  // Generate tokens
  const tokens = generateTokenPair(user._id.toString());

  res.status(201).json({
    success: true,
    data: {
      ...authUserPayload(user),
      ...tokens,
    },
  });
});

// @desc    Auth user & get token (email OR phone + password)
// @route   POST /api/auth/login
// @access  Public
export const loginUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { password } = req.body;
  const clientIp = req.ip || '';

  if (!password) {
    throw ApiError.badRequest('请输入密码', undefined, 'VALIDATION_PASSWORD_REQUIRED');
  }

  const lookup = resolvePasswordLoginLookup(req.body);
  const user = lookup.email
    ? await User.findOne({ email: lookup.email })
    : await User.findOne({ phone: lookup.phone });

  const identifier = lookup.email || lookup.phone || '';

  if (!user || !user.passwordHash || !(await user.comparePassword(password))) {
    await recordAuditEvent({
      user: user?._id ?? null,
      action: 'login',
      success: false,
      req,
      detail: user
        ? user.passwordHash
          ? '密码错误'
          : '账号尚未设置密码'
        : `账号不存在: ${identifier}`,
      detailCode: user
        ? user.passwordHash
          ? 'PASSWORD_INCORRECT'
          : 'PASSWORD_NOT_SET'
        : 'ACCOUNT_NOT_FOUND',
    });

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
        detailCode: 'BRUTE_FORCE_DETECTED',
        detailParams: { ip: clientIp, count: recentFails },
        isAnomaly: true,
        anomalyType: 'brute_force',
      });
    }

    throw ApiError.unauthorized(
      '账号或密码错误 (Invalid account or password)',
      'AUTH_INVALID_CREDENTIALS'
    );
  }

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
    detail: isNewIp
      ? `新 IP 登录: ${clientIp}`
      : lookup.phone
        ? `手机号密码登录: ${maskPhone(lookup.phone)}`
        : undefined,
    detailCode: isNewIp ? 'NEW_IP_LOGIN' : lookup.phone ? 'PHONE_PASSWORD_LOGIN' : undefined,
    detailParams: isNewIp ? { ip: clientIp } : undefined,
    isAnomaly: isNewIp,
    anomalyType: isNewIp ? 'new_ip' : undefined,
  });

  const tokens = generateTokenPair(user._id.toString());

  res.json({
    success: true,
    data: {
      ...authUserPayload(user),
      ...tokens,
    },
  });
});

// @desc    Send SMS verification code (Mock in local/dev)
// @route   POST /api/auth/sms/send
// @access  Public
export const sendSmsCode = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { phone, purpose = 'login' } = req.body;
  const smsPurpose = purpose === 'bind' ? 'bind' : 'login';

  try {
    const result = await sendLoginCode(phone, smsPurpose);
    await recordAuditEvent({
      user: null,
      action: 'sms_send',
      success: true,
      req,
      detail: `发送验证码: ${maskPhone(String(phone || ''))}`,
      detailCode: 'SMS_SENT',
    });
    res.json({
      success: true,
      data: result,
    });
  } catch (err) {
    await recordAuditEvent({
      user: null,
      action: 'sms_send',
      success: false,
      req,
      detail: `发送验证码失败: ${maskPhone(String(phone || ''))}`,
      detailCode: 'SMS_SEND_FAILED',
    });
    throw err;
  }
});

// @desc    Login or register with phone + SMS code
// @route   POST /api/auth/sms/login
// @access  Public
export const loginWithSms = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { phone: phoneRaw, code, fullName } = req.body;
  const clientIp = req.ip || '';

  let phone: string;
  try {
    phone = await verifyLoginCode(phoneRaw, code, 'login');
  } catch (err) {
    await recordAuditEvent({
      user: null,
      action: 'sms_login',
      success: false,
      req,
      detail: `手机验证码登录失败: ${maskPhone(String(phoneRaw || ''))}`,
      detailCode: 'SMS_LOGIN_FAILED',
    });
    throw err;
  }

  let user = await User.findOne({ phone });
  let isNew = false;

  if (!user) {
    isNew = true;
    const name =
      typeof fullName === 'string' && fullName.trim()
        ? fullName.trim().slice(0, 50)
        : `用户${phone.slice(-4)}`;
    user = await User.create({
      phone,
      fullName: name,
    });
    await recordAuditEvent({
      user: user._id,
      action: 'register',
      success: true,
      req,
      detail: `手机号注册: ${maskPhone(phone)}`,
      detailCode: 'PHONE_REGISTER',
    });
  }

  const isNewIp = !user.knownIps.includes(clientIp);
  if (isNewIp) {
    user.knownIps.push(clientIp);
    await user.save();
  }

  await recordAuditEvent({
    user: user._id,
    action: 'sms_login',
    success: true,
    req,
    detail: isNew
      ? `手机号首次登录注册: ${maskPhone(phone)}`
      : isNewIp
        ? `新 IP 手机登录: ${clientIp}`
        : `手机号登录: ${maskPhone(phone)}`,
    detailCode: isNew ? 'PHONE_LOGIN_NEW' : isNewIp ? 'NEW_IP_LOGIN' : 'PHONE_LOGIN',
    isAnomaly: isNewIp,
    anomalyType: isNewIp ? 'new_ip' : undefined,
  });

  const tokens = generateTokenPair(user._id.toString());

  res.status(isNew ? 201 : 200).json({
    success: true,
    data: {
      ...authUserPayload(user),
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
    throw ApiError.badRequest('刷新令牌是必需的 (Refresh token is required)', undefined, 'AUTH_REFRESH_TOKEN_REQUIRED');
  }

  try {
    const decoded = jwt.verify(refreshToken, secrets.jwtRefresh) as { id: string; type: string };

    if (decoded.type !== 'refresh') {
      throw ApiError.unauthorized('无效的刷新令牌 (Invalid refresh token)', 'AUTH_INVALID_REFRESH_TOKEN');
    }

    // Check if user still exists
    const user = await User.findById(decoded.id);
    if (!user) {
      throw ApiError.unauthorized('用户不存在 (User not found)', 'AUTH_USER_NOT_FOUND');
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
      throw ApiError.unauthorized('刷新令牌已过期，请重新登录 (Refresh token expired, please login again)', 'AUTH_REFRESH_TOKEN_EXPIRED');
    }
    throw ApiError.unauthorized('无效的刷新令牌 (Invalid refresh token)', 'AUTH_INVALID_REFRESH_TOKEN');
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
    await recordAuditEvent({
      user: null, action: 'forgot_password', success: false, req,
      detail: `邮箱不存在: ${email}`,
      detailCode: 'EMAIL_NOT_FOUND', detailParams: { email },
    });
    throw ApiError.notFound('该邮箱未注册 (Email not found)', 'AUTH_EMAIL_NOT_REGISTERED');
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
    await recordAuditEvent({
      user: null, action: 'reset_password', success: false, req,
      detail: '无效或过期的重置令牌',
      detailCode: 'RESET_TOKEN_INVALID',
    });
    throw ApiError.badRequest('无效或已过期的重置令牌 (Invalid or expired reset token)', undefined, 'AUTH_INVALID_RESET_TOKEN');
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
  // Need passwordHash presence for hasPassword (not returned to client)
  const user = await User.findById(req.user?._id).select('-resetPasswordToken -resetPasswordExpires');

  if (!user) {
    throw ApiError.notFound('用户未找到 (User not found)', 'AUTH_USER_NOT_FOUND');
  }

  res.json({
    success: true,
    data: profilePayload(user as any),
  });
});

// @desc    Bound login methods (email / phone / password)
// @route   GET /api/auth/identities
// @access  Private
export const getIdentities = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw ApiError.notFound('用户未找到 (User not found)', 'AUTH_USER_NOT_FOUND');
  }
  res.json({
    success: true,
    data: identitySnapshot(user),
  });
});

// @desc    Bind or rebind phone (new phone SMS purpose=bind)
// @route   POST /api/auth/phone/bind
// @access  Private
// Body: { phone, code, currentPassword?, currentPhoneCode? }
// - First bind: session enough + new phone SMS
// - Rebind (change number): need currentPassword OR SMS on old phone (currentPhoneCode)
export const bindPhone = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { phone: phoneRaw, code, currentPassword, currentPhoneCode } = req.body;
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw ApiError.notFound('用户未找到 (User not found)', 'AUTH_USER_NOT_FOUND');
  }

  let phone: string;
  try {
    phone = await verifyLoginCode(phoneRaw, code, 'bind');
  } catch (err) {
    await recordAuditEvent({
      user: user._id,
      action: 'phone_bind',
      success: false,
      req,
      detail: '绑定手机验证码失败',
      detailCode: 'SMS_VERIFY_FAILED',
    });
    throw err;
  }

  const isRebind = !!(user.phone && user.phone !== phone);
  if (isRebind) {
    const oldPhone = user.phone as string;
    let proved = false;
    if (currentPassword && user.passwordHash) {
      proved = await user.comparePassword(currentPassword);
    }
    if (!proved && currentPhoneCode) {
      try {
        await verifyLoginCode(oldPhone, currentPhoneCode, 'bind');
        proved = true;
      } catch {
        proved = false;
      }
    }
    if (!proved) {
      throw ApiError.unauthorized(
        '换绑手机需验证当前密码，或向原手机号发送并填写验证码',
        'REBIND_PROOF_REQUIRED'
      );
    }
  }

  const occupied = await User.findOne({ phone });
  if (occupied && occupied._id.toString() !== user._id.toString()) {
    await recordAuditEvent({
      user: user._id,
      action: 'phone_bind',
      success: false,
      req,
      detail: `手机号已被占用: ${maskPhone(phone)}`,
      detailCode: 'PHONE_ALREADY_BOUND',
    });
    throw ApiError.conflict(
      '该手机号已绑定其他账号',
      'PHONE_ALREADY_BOUND'
    );
  }

  const previous = user.phone;
  user.phone = phone;
  await user.save();

  await recordAuditEvent({
    user: user._id,
    action: 'phone_bind',
    success: true,
    req,
    detail: isRebind
      ? `换绑手机: ${maskPhone(previous || '')} → ${maskPhone(phone)}`
      : `绑定手机号: ${maskPhone(phone)}`,
    detailCode: isRebind ? 'PHONE_REBOUND' : 'PHONE_BOUND',
  });

  res.json({
    success: true,
    data: profilePayload(user as any),
  });
});

// @desc    Unbind phone (must keep email+password)
// @route   DELETE /api/auth/phone/bind
// @access  Private
// Body: { password? } or { code? }  // code to current phone
export const unbindPhone = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { password, code } = req.body || {};
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw ApiError.notFound('用户未找到 (User not found)', 'AUTH_USER_NOT_FOUND');
  }
  if (!user.phone) {
    throw ApiError.badRequest('当前未绑定手机号', undefined, 'PHONE_NOT_BOUND');
  }

  assertCanUnbindPhone(user);

  let proved = false;
  if (password && user.passwordHash) {
    proved = await user.comparePassword(password);
  }
  if (!proved && code) {
    try {
      await verifyLoginCode(user.phone, code, 'bind');
      proved = true;
    } catch {
      proved = false;
    }
  }
  if (!proved) {
    throw ApiError.unauthorized(
      '请输入密码，或向当前手机号发送并填写验证码以确认解绑',
      'UNBIND_PROOF_REQUIRED'
    );
  }

  const removed = user.phone;
  await User.updateOne({ _id: user._id }, { $unset: { phone: 1 } });
  const updated = await User.findById(user._id);
  if (!updated) {
    throw ApiError.notFound('用户未找到 (User not found)', 'AUTH_USER_NOT_FOUND');
  }

  await recordAuditEvent({
    user: user._id,
    action: 'phone_unbind',
    success: true,
    req,
    detail: `解绑手机号: ${maskPhone(removed)}`,
    detailCode: 'PHONE_UNBOUND',
  });

  res.json({
    success: true,
    message: '手机号已解绑',
    data: profilePayload(updated as any),
  });
});

// @desc    Bind or rebind email; first bind without password also sets password
// @route   POST /api/auth/email/bind
// @access  Private
export const bindEmail = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { email: emailRaw, password, currentPassword } = req.body;
  const email = String(emailRaw || '').trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw ApiError.badRequest('请输入有效邮箱', undefined, 'VALIDATION_EMAIL_FORMAT');
  }

  const user = await User.findById(req.user?._id);
  if (!user) {
    throw ApiError.notFound('用户未找到 (User not found)', 'AUTH_USER_NOT_FOUND');
  }

  const isRebind = !!(user.email && user.email !== email);

  const occupied = await User.findOne({ email });
  if (occupied && occupied._id.toString() !== user._id.toString()) {
    await recordAuditEvent({
      user: user._id,
      action: 'email_bind',
      success: false,
      req,
      detail: `邮箱已被占用: ${email}`,
      detailCode: 'EMAIL_ALREADY_BOUND',
    });
    throw ApiError.conflict('该邮箱已绑定其他账号', 'EMAIL_ALREADY_BOUND');
  }

  if (user.passwordHash) {
    // Bind or rebind: prove with current password
    const proof = currentPassword || password;
    if (!proof || !(await user.comparePassword(proof))) {
      throw ApiError.unauthorized(
        isRebind ? '换绑邮箱请输入当前密码' : '请输入当前密码以绑定邮箱',
        'AUTH_PASSWORD_INCORRECT'
      );
    }
    user.email = email;
  } else {
    // Phone-only: first-time bind sets password + email (rebind N/A without email)
    if (!password) {
      throw ApiError.badRequest(
        '请设置登录密码',
        undefined,
        'VALIDATION_PASSWORD_REQUIRED'
      );
    }
    assertPasswordStrength(password);
    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(password, salt);
    user.email = email;
  }

  await user.save();

  await recordAuditEvent({
    user: user._id,
    action: 'email_bind',
    success: true,
    req,
    detail: isRebind ? `换绑邮箱: ${email}` : `绑定邮箱: ${email}`,
    detailCode: isRebind ? 'EMAIL_REBOUND' : 'EMAIL_BOUND',
  });

  res.json({
    success: true,
    data: profilePayload(user as any),
  });
});

// @desc    Unbind email (must keep phone)
// @route   DELETE /api/auth/email/bind
// @access  Private
// Body: { password }
export const unbindEmail = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { password } = req.body || {};
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw ApiError.notFound('用户未找到 (User not found)', 'AUTH_USER_NOT_FOUND');
  }
  if (!user.email) {
    throw ApiError.badRequest('当前未绑定邮箱', undefined, 'EMAIL_NOT_BOUND');
  }

  assertCanUnbindEmail(user);

  if (!password || !user.passwordHash || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('请输入密码以确认解绑邮箱', 'AUTH_PASSWORD_INCORRECT');
  }

  const removed = user.email;
  await User.updateOne({ _id: user._id }, { $unset: { email: 1 } });
  const updated = await User.findById(user._id);
  if (!updated) {
    throw ApiError.notFound('用户未找到 (User not found)', 'AUTH_USER_NOT_FOUND');
  }

  await recordAuditEvent({
    user: user._id,
    action: 'email_unbind',
    success: true,
    req,
    detail: `解绑邮箱: ${removed}`,
    detailCode: 'EMAIL_UNBOUND',
  });

  res.json({
    success: true,
    message: '邮箱已解绑',
    data: profilePayload(updated as any),
  });
});

// @desc    Set password for accounts that have none (e.g. phone SMS only)
// @route   POST /api/auth/password/set
// @access  Private
export const setPassword = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { password, confirmPassword } = req.body;
  const user = await User.findById(req.user?._id);
  if (!user) {
    throw ApiError.notFound('用户未找到 (User not found)', 'AUTH_USER_NOT_FOUND');
  }

  if (user.passwordHash) {
    throw ApiError.badRequest(
      '已设置密码，请使用修改密码',
      undefined,
      'PASSWORD_ALREADY_SET'
    );
  }

  if (password !== confirmPassword) {
    throw ApiError.badRequest(
      '两次输入的密码不一致',
      undefined,
      'PASSWORD_CONFIRM_MISMATCH'
    );
  }
  assertPasswordStrength(password);

  const salt = await bcrypt.genSalt(10);
  user.passwordHash = await bcrypt.hash(password, salt);
  await user.save();

  await recordAuditEvent({
    user: user._id,
    action: 'set_password',
    success: true,
    req,
    detail: '设置登录密码',
    detailCode: 'PASSWORD_SET',
  });

  res.json({
    success: true,
    message: '密码已设置，可用手机号或邮箱（若已绑定）+ 密码登录',
    data: profilePayload(user as any),
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
    throw ApiError.badRequest('至少需要提供一个要更新的字段', undefined, 'AUTH_NO_UPDATE_FIELDS');
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: fields },
    { new: true, runValidators: true }
  ).select('-passwordHash -resetPasswordToken -resetPasswordExpires');

  if (!user) {
    throw ApiError.notFound('用户未找到 (User not found)', 'AUTH_USER_NOT_FOUND');
  }

  // Re-fetch with passwordHash for hasPassword
  const full = await User.findById(user._id);
  res.json({
    success: true,
    data: profilePayload((full || user) as any),
  });
});

// @desc    Update user settings (notifications & data sharing)
// @route   PUT /api/auth/settings
// @access  Private
export const updateSettings = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { notifications, dataSharing, language } = req.body;

  const updateFields: Record<string, unknown> = {};
  if (notifications) {
    if (notifications.email !== undefined) updateFields['settings.notifications.email'] = notifications.email;
    if (notifications.push !== undefined) updateFields['settings.notifications.push'] = notifications.push;
  }
  if (dataSharing) {
    if (dataSharing.enabled !== undefined) updateFields['settings.dataSharing.enabled'] = dataSharing.enabled;
    if (dataSharing.sharedWith !== undefined) updateFields['settings.dataSharing.sharedWith'] = dataSharing.sharedWith;
  }
  if (language !== undefined) updateFields['settings.language'] = language;

  if (Object.keys(updateFields).length === 0) {
    throw ApiError.badRequest('至少需要提供一个设置项', undefined, 'AUTH_NO_UPDATE_FIELDS');
  }

  const user = await User.findByIdAndUpdate(
    req.user?._id,
    { $set: updateFields },
    { new: true }
  ).select('-passwordHash -resetPasswordToken -resetPasswordExpires');

  if (!user) {
    throw ApiError.notFound('用户未找到 (User not found)', 'AUTH_USER_NOT_FOUND');
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
    throw ApiError.notFound('用户未找到 (User not found)', 'AUTH_USER_NOT_FOUND');
  }

  const isMatch = await user.comparePassword(currentPassword);
  if (!isMatch) {
    await recordAuditEvent({
      user: user._id, action: 'change_password', success: false, req,
      detail: '当前密码不正确', detailCode: 'PASSWORD_INCORRECT',
    });
    throw ApiError.unauthorized('当前密码不正确 (Current password is incorrect)', 'AUTH_PASSWORD_INCORRECT');
  }

  // 防止新旧密码相同
  const isSame = await user.comparePassword(newPassword);
  if (isSame) {
    await recordAuditEvent({
      user: user._id, action: 'change_password', success: false, req,
      detail: '新密码与当前密码相同', detailCode: 'PASSWORD_SAME_AS_CURRENT',
    });
    throw ApiError.badRequest('新密码不能与当前密码相同 (New password must differ from current)', undefined, 'AUTH_PASSWORD_SAME_AS_CURRENT');
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
      throw ApiError.notFound('用户未找到 (User not found)', 'AUTH_USER_NOT_FOUND');
    }

    // 二次密码验证 - 防止误删 / token 被盗后远程销户
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      throw ApiError.unauthorized('密码不正确 (Password is incorrect)', 'AUTH_PASSWORD_INCORRECT');
    }

    // 删除前记录审计日志（删除后 user 不存在了）
    await recordAuditEvent({ user: userId, action: 'delete_account', success: true, req });

    // 级联删除该用户的所有数据 (Mongoose 不支持事务时尽力而为：先数据后用户)
    const [bloodTestsRes, chemoCyclesRes, remindersRes, sharesRes, biochemTestsRes] = await Promise.all([
      BloodTest.deleteMany({ user: userId }),
      ChemoCycle.deleteMany({ user: userId }),
      Reminder.deleteMany({ user: userId }),
      Share.deleteMany({ user: userId }),
      BiochemTest.deleteMany({ user: userId }),
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
        biochemTests: biochemTestsRes.deletedCount,
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
