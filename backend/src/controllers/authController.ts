import { Request, Response } from 'express';
import { User } from '../models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { AuthRequest } from '../middlewares/authMiddleware';

// Token configurations
const ACCESS_TOKEN_EXPIRES_IN = '15m'; // 15 minutes
const REFRESH_TOKEN_EXPIRES_IN = '7d'; // 7 days

/**
 * Generate access token
 */
const generateAccessToken = (id: string): string => {
  const secret = process.env.JWT_SECRET || 'fallback_secret_key';
  return jwt.sign({ id, type: 'access' }, secret, { expiresIn: ACCESS_TOKEN_EXPIRES_IN });
};

/**
 * Generate refresh token
 */
const generateRefreshToken = (id: string): string => {
  const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'fallback_refresh_secret';
  return jwt.sign({ id, type: 'refresh' }, secret, { expiresIn: REFRESH_TOKEN_EXPIRES_IN });
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
  const { email, password, firstName, lastName, dateOfBirth, gender } = req.body;

  // Check if user exists
  const userExists = await User.findOne({ email });

  if (userExists) {
    throw ApiError.conflict('用户已存在 (User already exists)');
  }

  // Hash password
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash(password, salt);

  // Create user
  const user = await User.create({
    email,
    passwordHash,
    firstName,
    lastName,
    dateOfBirth,
    gender,
  });

  if (!user) {
    throw ApiError.badRequest('无效的用户数据 (Invalid user data)');
  }

  // Generate tokens
  const tokens = generateTokenPair(user._id.toString());

  res.status(201).json({
    success: true,
    data: {
      _id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      ...tokens,
    },
  });
});

// @desc    Auth user & get token
// @route   POST /api/auth/login
// @access  Public
export const loginUser = asyncHandler(async (req: Request, res: Response): Promise<void> => {
  const { email, password } = req.body;

  const user = await User.findOne({ email });

  if (!user || !(await user.comparePassword(password))) {
    throw ApiError.unauthorized('邮箱或密码错误 (Invalid email or password)');
  }

  // Generate tokens
  const tokens = generateTokenPair(user._id.toString());

  res.json({
    success: true,
    data: {
      _id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
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
    const secret = process.env.JWT_REFRESH_SECRET || process.env.JWT_SECRET || 'fallback_refresh_secret';
    const decoded = jwt.verify(refreshToken, secret) as { id: string; type: string };

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

    res.json({
      success: true,
      data: tokens,
    });
  } catch (error) {
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
  // In a more advanced implementation, you might want to blacklist the tokens
  // For now, we just return success and let the client remove the tokens
  res.json({
    success: true,
    message: '已成功登出 (Logged out successfully)',
  });
});
