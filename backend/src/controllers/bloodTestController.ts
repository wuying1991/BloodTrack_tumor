import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { BloodTest } from '../models/BloodTest';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

// @desc    Get all blood tests for logged in user
// @route   GET /api/blood-tests
// @access  Private
export const getBloodTests = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = 1, limit = 20, sort = '-date' } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  const bloodTests = await BloodTest.find({ user: req.user?._id })
    .sort(sort as string)
    .skip(skip)
    .limit(limitNum);

  const total = await BloodTest.countDocuments({ user: req.user?._id });

  res.json({
    success: true,
    data: bloodTests,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

// @desc    Create a new blood test record
// @route   POST /api/blood-tests
// @access  Private
export const createBloodTest = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { date, wbc, rbc, hgb, plt, neu, lym, notes } = req.body;

  const bloodTest = await BloodTest.create({
    user: req.user?._id,
    date,
    wbc,
    rbc,
    hgb,
    plt,
    neu,
    lym,
    notes,
  });

  res.status(201).json({
    success: true,
    data: bloodTest,
  });
});

// @desc    Get single blood test by ID
// @route   GET /api/blood-tests/:id
// @access  Private
export const getBloodTestById = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const bloodTest = await BloodTest.findOne({ _id: req.params.id, user: req.user?._id });

  if (!bloodTest) {
    throw ApiError.notFound('记录未找到 (Record not found)');
  }

  res.json({
    success: true,
    data: bloodTest,
  });
});

// @desc    Update blood test record
// @route   PUT /api/blood-tests/:id
// @access  Private
export const updateBloodTest = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const updatedTest = await BloodTest.findOneAndUpdate(
    { _id: req.params.id, user: req.user?._id },
    req.body,
    { new: true, runValidators: true }
  );

  if (!updatedTest) {
    throw ApiError.notFound('记录未找到 (Record not found)');
  }

  res.json({
    success: true,
    data: updatedTest,
  });
});

// @desc    Delete blood test record
// @route   DELETE /api/blood-tests/:id
// @access  Private
export const deleteBloodTest = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await BloodTest.deleteOne({ _id: req.params.id, user: req.user?._id });

  if (result.deletedCount === 0) {
    throw ApiError.notFound('记录未找到 (Record not found)');
  }

  res.json({
    success: true,
    message: '记录已删除 (Record removed)',
  });
});
