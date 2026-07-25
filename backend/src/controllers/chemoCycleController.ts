import { Response } from 'express';
import { AuthRequest } from '../middlewares/authMiddleware';
import { ChemoCycle, IChemoCycle, IMedication } from '../models/ChemoCycle';
import { ApiError } from '../utils/ApiError';
import { asyncHandler } from '../utils/asyncHandler';
import { buildOverlapFilter } from '../utils/dateRange';

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_CYCLE_DAYS = 21;

function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS);
}

function normalizeMedication(
  medication: Partial<IMedication>,
  cycleStart: Date,
  cycleEnd: Date
) {
  return {
    name: medication.name || undefined,
    dosage: medication.dosage || undefined,
    startDate: medication.startDate || cycleStart,
    endDate: medication.endDate || cycleEnd,
    notes: medication.notes || medication.schedule || undefined,
  };
}

function normalizeCycle(cycle: IChemoCycle | Record<string, any>) {
  const obj = typeof (cycle as IChemoCycle).toObject === 'function'
    ? (cycle as IChemoCycle).toObject()
    : cycle;
  const start = new Date(obj.startDate);
  const end = new Date(obj.endDate || addDays(start, DEFAULT_CYCLE_DAYS));

  return {
    ...obj,
    regimenName: obj.regimenName || '未命名方案',
    endDate: end,
    medications: (obj.medications || []).map((m: Partial<IMedication>) =>
      normalizeMedication(m, start, end)
    ),
  };
}

function hasMedicationContent(m: Partial<IMedication>): boolean {
  return ['name', 'dosage', 'startDate', 'endDate', 'notes'].some(key => {
    const value = (m as Record<string, unknown>)[key];
    return typeof value === 'string'
      ? value.trim().length > 0
      : value !== undefined && value !== null;
  });
}

function sanitizeMedications(
  medications: Partial<IMedication>[] | undefined,
  cycleStart: Date,
  cycleEnd: Date
) {
  if (!Array.isArray(medications)) return [];
  return medications
    .filter(hasMedicationContent)
    .map(m => normalizeMedication(m, cycleStart, cycleEnd));
}

async function reconcileCycleBoundaries(userId: unknown): Promise<void> {
  const cycles = await ChemoCycle.find({ user: userId }).sort('startDate');

  for (let i = 0; i < cycles.length; i++) {
    const cycle = cycles[i];
    const next = cycles[i + 1];
    if (next) {
      const expectedEnd = addDays(next.startDate, -1);
      if (cycle.endDate.getTime() !== expectedEnd.getTime()) {
        cycle.endDate = expectedEnd;
        await cycle.save();
      }
    } else if (!cycle.endDate) {
      cycle.endDate = addDays(cycle.startDate, DEFAULT_CYCLE_DAYS);
      await cycle.save();
    }
  }
}

// @desc    Get all chemo cycles for logged in user
// @route   GET /api/chemo-cycles
// @access  Private
export const getChemoCycles = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const { page = 1, limit = 20 } = req.query;

  const pageNum = parseInt(page as string, 10);
  const limitNum = parseInt(limit as string, 10);
  const skip = (pageNum - 1) * limitNum;
  const filter = {
    user: req.user?._id,
    ...buildOverlapFilter(
      req.query.startDate as string | undefined,
      req.query.endDate as string | undefined
    ),
  };

  const cycles = await ChemoCycle.find(filter)
    .sort('-startDate')
    .skip(skip)
    .limit(limitNum);

  const total = await ChemoCycle.countDocuments(filter);

  res.json({
    success: true,
    data: cycles.map(normalizeCycle),
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
  const { regimenName, startDate, endDate, medications, doctorNotes } = req.body;
  const cycleStart = new Date(startDate);
  const cycleEnd = endDate
    ? new Date(endDate)
    : addDays(cycleStart, DEFAULT_CYCLE_DAYS);

  const cycle = await ChemoCycle.create({
    user: req.user?._id,
    regimenName,
    startDate: cycleStart,
    endDate: cycleEnd,
    medications: sanitizeMedications(medications, cycleStart, cycleEnd),
    doctorNotes,
  });

  await reconcileCycleBoundaries(req.user?._id);
  const refreshed = await ChemoCycle.findById(cycle._id);

  res.status(201).json({
    success: true,
    data: normalizeCycle(refreshed || cycle),
  });
});

// @desc    Get single chemo cycle by ID
// @route   GET /api/chemo-cycles/:id
// @access  Private
export const getChemoCycleById = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const cycle = await ChemoCycle.findOne({ _id: req.params.id, user: req.user?._id });

  if (!cycle) {
    throw ApiError.notFound('化疗周期未找到 (Chemo cycle not found)', 'CHEMO_CYCLE_NOT_FOUND');
  }

  res.json({
    success: true,
    data: normalizeCycle(cycle),
  });
});

// @desc    Update chemo cycle
// @route   PUT /api/chemo-cycles/:id
// @access  Private
export const updateChemoCycle = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const existing = await ChemoCycle.findOne({ _id: req.params.id, user: req.user?._id });

  if (!existing) {
    throw ApiError.notFound('化疗周期未找到 (Chemo cycle not found)', 'CHEMO_CYCLE_NOT_FOUND');
  }

  const update: Record<string, unknown> = { ...req.body };
  const cycleStart = new Date((req.body.startDate || existing.startDate) as string | Date);
  const cycleEnd = req.body.endDate
    ? new Date(req.body.endDate)
    : existing.endDate || addDays(cycleStart, DEFAULT_CYCLE_DAYS);

  if ('medications' in req.body) {
    update.medications = sanitizeMedications(req.body.medications, cycleStart, cycleEnd);
  }

  const updated = await ChemoCycle.findOneAndUpdate(
    { _id: req.params.id, user: req.user?._id },
    update,
    { new: true, runValidators: true }
  );

  if (!updated) {
    throw ApiError.notFound('化疗周期未找到 (Chemo cycle not found)', 'CHEMO_CYCLE_NOT_FOUND');
  }

  await reconcileCycleBoundaries(req.user?._id);
  const refreshed = await ChemoCycle.findById(updated._id);

  res.json({
    success: true,
    data: normalizeCycle(refreshed || updated),
  });
});

// @desc    Delete chemo cycle
// @route   DELETE /api/chemo-cycles/:id
// @access  Private
export const deleteChemoCycle = asyncHandler(async (req: AuthRequest, res: Response): Promise<void> => {
  const result = await ChemoCycle.deleteOne({ _id: req.params.id, user: req.user?._id });

  if (result.deletedCount === 0) {
    throw ApiError.notFound('化疗周期未找到 (Chemo cycle not found)', 'CHEMO_CYCLE_NOT_FOUND');
  }

  await reconcileCycleBoundaries(req.user?._id);

  res.json({
    success: true,
    message: '化疗周期已删除 (Chemo cycle removed)',
  });
});
