import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { ChemoCycle } from '../models/ChemoCycle';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

// @desc    Get all chemo cycles for logged in user
// @route   GET /api/chemo-cycles
// @access  Private
export const getChemoCycles = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = 1, limit = 20 } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  const cycles = await ChemoCycle.find({ user: req.user?._id })
    .sort('-startDate')
    .skip(skip)
    .limit(limitNum);

  const total = await ChemoCycle.countDocuments({ user: req.user?._id });

  res.json({
    success: true,
    data: cycles,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

// @desc    Create a new chemo cycle
// @route   POST /api/chemo-cycles
// @access  Private
export const createChemoCycle = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { startDate, endDate, medications, doctorNotes } = req.body;

  const cycle = await ChemoCycle.create({
    user: req.user?._id,
    startDate,
    endDate,
    medications,
    doctorNotes,
  });

  res.status(201).json({
    success: true,
    data: cycle,
  });
});

// @desc    Get single chemo cycle by ID
// @route   GET /api/chemo-cycles/:id
// @access  Private
export const getChemoCycleById = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const cycle = await ChemoCycle.findOne({ _id: req.params.id, user: req.user?._id });

  if (!cycle) {
    throw ApiError.notFound('化疗周期未找到 (Chemo cycle not found)');
  }

  res.json({
    success: true,
    data: cycle,
  });
});

// @desc    Update chemo cycle
// @route   PUT /api/chemo-cycles/:id
// @access  Private
export const updateChemoCycle = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const updated = await ChemoCycle.findOneAndUpdate(
    { _id: req.params.id, user: req.user?._id },
    req.body,
    { new: true, runValidators: true }
  );

  if (!updated) {
    throw ApiError.notFound('化疗周期未找到 (Chemo cycle not found)');
  }

  res.json({
    success: true,
    data: updated,
  });
});

// @desc    Delete chemo cycle
// @route   DELETE /api/chemo-cycles/:id
// @access  Private
export const deleteChemoCycle = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await ChemoCycle.deleteOne({ _id: req.params.id, user: req.user?._id });

  if (result.deletedCount === 0) {
    throw ApiError.notFound('化疗周期未找到 (Chemo cycle not found)');
  }

  res.json({
    success: true,
    message: '化疗周期已删除 (Chemo cycle removed)',
  });
});
