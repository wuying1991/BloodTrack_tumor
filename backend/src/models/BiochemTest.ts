import mongoose, { Document, Schema } from 'mongoose';

export interface IBiochemTest extends Document {
  user: mongoose.Types.ObjectId;
  date: Date;
  // 肝功能
  alt?: number;
  ast?: number;
  ahr?: number;
  tbil?: number;
  dbil?: number;
  ibil?: number;
  tp?: number;
  alb?: number;
  glo?: number;
  ag?: number;
  ggt?: number;
  alp?: number;
  che?: number;
  tba?: number;
  pa?: number;
  // 肾功能
  bun?: number;
  cr?: number;
  ua?: number;
  egfr?: number;
  // 电解质
  k?: number;
  na?: number;
  cl?: number;
  ca?: number;
  p?: number;
  // 其他
  ldh?: number;
  notes?: string;
  isAbnormal: boolean;
  chemoCycleId?: mongoose.Types.ObjectId;
}

// 正常参考范围（与 contracts/index.ts 的 BIOCHEM_TEST_NORMAL_RANGES 保持一致）
const NORMAL_RANGES: Record<string, { min: number; max: number }> = {
  alt:   { min: 7,    max: 40 },
  ast:   { min: 13,   max: 35 },
  ahr:   { min: 0.5,  max: 2.0 },
  tbil:  { min: 3.4,  max: 20.5 },
  dbil:  { min: 0,    max: 6.8 },
  ibil:  { min: 1.7,  max: 13.7 },
  tp:    { min: 65,   max: 85 },
  alb:   { min: 35,   max: 50 },
  glo:   { min: 20,   max: 40 },
  ag:    { min: 1.2,  max: 2.0 },
  ggt:   { min: 7,    max: 45 },
  alp:   { min: 40,   max: 150 },
  che:   { min: 4000, max: 12000 },
  tba:   { min: 0,    max: 10 },
  pa:    { min: 200,  max: 400 },
  bun:   { min: 2.9,  max: 7.5 },
  cr:    { min: 44,   max: 133 },
  ua:    { min: 149,  max: 416 },
  egfr:  { min: 90,   max: 999 },
  k:     { min: 3.5,  max: 5.5 },
  na:    { min: 135,  max: 145 },
  cl:    { min: 95,   max: 105 },
  ca:    { min: 2.1,  max: 2.6 },
  p:     { min: 0.8,  max: 1.6 },
  ldh:   { min: 120,  max: 250 },
};

const biochemTestSchema = new Schema<IBiochemTest>(
  {
    user: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    date: { type: Date, required: true },
    alt: { type: Number },
    ast: { type: Number },
    ahr: { type: Number },
    tbil: { type: Number },
    dbil: { type: Number },
    ibil: { type: Number },
    tp: { type: Number },
    alb: { type: Number },
    glo: { type: Number },
    ag: { type: Number },
    ggt: { type: Number },
    alp: { type: Number },
    che: { type: Number },
    tba: { type: Number },
    pa: { type: Number },
    bun: { type: Number },
    cr: { type: Number },
    ua: { type: Number },
    egfr: { type: Number },
    k: { type: Number },
    na: { type: Number },
    cl: { type: Number },
    ca: { type: Number },
    p: { type: Number },
    ldh: { type: Number },
    notes: { type: String },
    isAbnormal: { type: Boolean, default: false },
    chemoCycleId: { type: Schema.Types.ObjectId, ref: 'ChemoCycle' },
  },
  { timestamps: true }
);

// Pre-save hook: 检查所有 25 个字段是否超出正常范围
biochemTestSchema.pre('save', function (next) {
  const doc = this as unknown as Record<string, unknown>;
  this.isAbnormal = Object.keys(NORMAL_RANGES).some(field => {
    const value = doc[field] as number | undefined;
    if (value === undefined || value === null) return false;
    const range = NORMAL_RANGES[field];
    return value < range.min || value > range.max;
  });
  next();
});

biochemTestSchema.index({ user: 1, date: -1 });

export const BiochemTest = mongoose.model<IBiochemTest>('BiochemTest', biochemTestSchema);
