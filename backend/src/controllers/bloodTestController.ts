import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { BloodTest } from '../models/BloodTest';
import { ChemoCycle } from '../models/ChemoCycle';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

/**
 * 解析请求中的 chemoCycleId：
 * - 显式传入: 校验该周期归属当前用户
 * - 未传入但有 date: 自动查找日期落入哪个周期 [startDate, endDate]
 * - 显式传 null: 解除关联
 * 返回 ObjectId | null | undefined （undefined 表示不修改）
 */
async function resolveChemoCycleId(
  userId: unknown,
  body: { chemoCycleId?: string | null; date?: string }
): Promise<unknown> {
  if (body.chemoCycleId === null) {
    return null; // 显式解除
  }
  if (body.chemoCycleId) {
    const cycle = await ChemoCycle.findOne({ _id: body.chemoCycleId, user: userId });
    if (!cycle) {
      throw ApiError.badRequest('指定的化疗周期不存在或无权访问');
    }
    return cycle._id;
  }
  if (body.date) {
    const d = new Date(body.date);
    const cycle = await ChemoCycle.findOne({
      user: userId,
      startDate: { $lte: d },
      endDate: { $gte: d },
    }).sort({ startDate: -1 });
    return cycle ? cycle._id : null;
  }
  return undefined;
}

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

  const cycleId = await resolveChemoCycleId(req.user?._id, req.body);

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
    chemoCycleId: cycleId === undefined ? undefined : cycleId,
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
  const update: Record<string, unknown> = { ...req.body };

  // 如果显式或隐式涉及 cycle 关系（chemoCycleId 字段在 body 中，或日期变了），重算
  const hasCycleField = 'chemoCycleId' in req.body;
  const hasDateField = 'date' in req.body;
  if (hasCycleField || hasDateField) {
    const cycleId = await resolveChemoCycleId(req.user?._id, req.body);
    if (cycleId === undefined) {
      delete update.chemoCycleId;
    } else {
      update.chemoCycleId = cycleId;
    }
  }

  const updatedTest = await BloodTest.findOneAndUpdate(
    { _id: req.params.id, user: req.user?._id },
    update,
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
