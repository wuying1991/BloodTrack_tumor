import mongoose, { Document, Schema } from 'mongoose';

export interface IBloodTest extends Document {
  user: mongoose.Types.ObjectId;
  date: Date;
  wbc: number; // White Blood Cells
  rbc: number; // Red Blood Cells
  hgb: number; // Hemoglobin
  plt: number; // Platelets
  neu?: number; // Neutrophils
  lym?: number; // Lymphocytes
  crp?: number; // C-reactive protein (mg/L)
  notes?: string;
  isAbnormal: boolean;
  chemoCycleId?: mongoose.Types.ObjectId; // 关联的化疗周期
}

const bloodTestSchema = new Schema<IBloodTest>(
  {
    user: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    date: { type: Date, required: true },
    wbc: { type: Number, required: true },
    rbc: { type: Number, required: true },
    hgb: { type: Number, required: true },
    plt: { type: Number, required: true },
    neu: { type: Number },
    lym: { type: Number },
    crp: { type: Number },
    notes: { type: String },
    isAbnormal: { type: Boolean, default: false },
    chemoCycleId: { type: Schema.Types.ObjectId, ref: 'ChemoCycle' },
  },
  { timestamps: true }
);

// Pre-save hook to calculate if abnormal based on standard ranges
bloodTestSchema.pre('save', function (next) {
  // Typical adult normal ranges (can be refined later)
  // WBC: 4.0 - 10.0 x10^9/L
  // RBC: 3.5 - 5.8 x10^12/L
  // HGB: 110 - 165 g/L
  // PLT: 100 - 300 x10^9/L
  // CRP: 0 - 10 mg/L (if provided)
  const isWbcAbnormal = this.wbc < 4.0 || this.wbc > 10.0;
  const isRbcAbnormal = this.rbc < 3.5 || this.rbc > 5.8;
  const isHgbAbnormal = this.hgb < 110 || this.hgb > 165;
  const isPltAbnormal = this.plt < 100 || this.plt > 300;
  const isCrpAbnormal =
    this.crp !== undefined && this.crp !== null && (this.crp < 0 || this.crp > 10);

  this.isAbnormal =
    isWbcAbnormal ||
    isRbcAbnormal ||
    isHgbAbnormal ||
    isPltAbnormal ||
    isCrpAbnormal;
  next();
});

export const BloodTest = mongoose.model<IBloodTest>('BloodTest', bloodTestSchema);
