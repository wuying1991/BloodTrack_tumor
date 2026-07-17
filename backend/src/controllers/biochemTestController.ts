import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { BiochemTest } from '../models/BiochemTest';
import { ChemoCycle } from '../models/ChemoCycle';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';

// 自动按 date 关联化疗周期（复用 bloodTestController 的逻辑）
async function autoAssociateCycle(
  userId: string,
  date: Date,
  explicitCycleId?: string | null
): Promise<string | null | undefined> {
  if (explicitCycleId !== undefined) return explicitCycleId;
  const cycles = await ChemoCycle.find({ user: userId }).sort('startDate');
  for (const cycle of cycles) {
    if (date >= cycle.startDate && date <= cycle.endDate) {
      return cycle._id.toString();
    }
  }
  return null;
}

// @desc    Get all biochem tests for logged in user
// @route   GET /api/biochem-tests
// @access  Private
export const getBiochemTests = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = 1, limit = 20 } = req.query;
  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;

  const tests = await BiochemTest.find({ user: req.user?._id })
    .sort('-date')
    .skip(skip)
    .limit(limitNum);

  const total = await BiochemTest.countDocuments({ user: req.user?._id });

  res.json({
    success: true,
    data: tests,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      pages: Math.ceil(total / limitNum),
    },
  });
});

// @desc    Create a new biochem test
// @route   POST /api/biochem-tests
// @access  Private
export const createBiochemTest = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { date, chemoCycleId, ...rest } = req.body;

  const cycleId = await autoAssociateCycle(
    String(req.user?._id ?? ''),
    new Date(date),
    chemoCycleId
  );

  const test = await BiochemTest.create({
    user: req.user?._id,
    date: new Date(date),
    chemoCycleId: cycleId,
    ...rest,
  });

  res.status(201).json({
    success: true,
    data: test,
  });
});

// @desc    Get single biochem test by ID
// @route   GET /api/biochem-tests/:id
// @access  Private
export const getBiochemTestById = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const test = await BiochemTest.findOne({ _id: req.params.id, user: req.user?._id });

  if (!test) {
    throw ApiError.notFound('生化检查未找到 (Biochem test not found)');
  }

  res.json({
    success: true,
    data: test,
  });
});

// @desc    Update biochem test
// @route   PUT /api/biochem-tests/:id
// @access  Private
export const updateBiochemTest = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const update = { ...req.body };
  delete update.user;

  if (update.date) {
    update.date = new Date(update.date);
  }

  if (update.chemoCycleId !== undefined && update.chemoCycleId !== null) {
    // 如果显式传了 chemoCycleId，直接用
  } else if (update.date && !update.chemoCycleId) {
    update.chemoCycleId = await autoAssociateCycle(
      String(req.user?._id ?? ''),
      new Date(update.date)
    );
  }

  const updated = await BiochemTest.findOneAndUpdate(
    { _id: req.params.id, user: req.user?._id },
    update,
    { new: true, runValidators: true }
  );

  if (!updated) {
    throw ApiError.notFound('生化检查未找到 (Biochem test not found)');
  }

  res.json({
    success: true,
    data: updated,
  });
});

// @desc    Delete biochem test
// @route   DELETE /api/biochem-tests/:id
// @access  Private
export const deleteBiochemTest = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await BiochemTest.deleteOne({ _id: req.params.id, user: req.user?._id });

  if (result.deletedCount === 0) {
    throw ApiError.notFound('生化检查未找到 (Biochem test not found)');
  }

  res.json({
    success: true,
    message: '生化检查已删除 (Biochem test removed)',
  });
});

// @desc    Export biochem tests as CSV
// @route   GET /api/biochem-tests/export?format=csv
// @access  Private
export const exportBiochemTests = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const tests = await BiochemTest.find({ user: req.user?._id })
    .sort('-date')
    .populate('chemoCycleId', 'startDate endDate')
    .lean();

  const headers = [
    '日期', 'ALT', 'AST', 'AST/ALT', 'TBIL', 'DBIL', 'IBIL',
    'TP', 'ALB', 'GLO', 'A/G', 'GGT', 'ALP', 'CHE', 'TBA', 'PA',
    'BUN', 'Cr', 'UA', 'eGFR',
    'K', 'Na', 'Cl', 'Ca', 'P', 'LDH',
    '是否异常', '备注', '周期开始', '周期结束',
  ];

  const escapeCsv = (val: unknown): string => {
    if (val === null || val === undefined) return '';
    const str = String(val);
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('=')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const rows = tests.map((t: any) => [
    t.date ? new Date(t.date).toISOString().split('T')[0] : '',
    t.alt ?? '', t.ast ?? '', t.ahr ?? '', t.tbil ?? '', t.dbil ?? '', t.ibil ?? '',
    t.tp ?? '', t.alb ?? '', t.glo ?? '', t.ag ?? '', t.ggt ?? '', t.alp ?? '',
    t.che ?? '', t.tba ?? '', t.pa ?? '',
    t.bun ?? '', t.cr ?? '', t.ua ?? '', t.egfr ?? '',
    t.k ?? '', t.na ?? '', t.cl ?? '', t.ca ?? '', t.p ?? '', t.ldh ?? '',
    t.isAbnormal ? '是' : '否',
    t.notes ?? '',
    t.chemoCycleId?.startDate ? new Date(t.chemoCycleId.startDate).toISOString().split('T')[0] : '',
    t.chemoCycleId?.endDate ? new Date(t.chemoCycleId.endDate).toISOString().split('T')[0] : '',
  ].map(escapeCsv).join(','));

  const csv = '﻿' + headers.join(',') + '\r\n' + rows.join('\r\n');

  res.setHeader('Content-Type', 'text/csv; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename=biochem-tests.csv');
  res.send(csv);
});
