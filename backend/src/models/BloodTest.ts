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
  notes?: string;
  isAbnormal: boolean;
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
    notes: { type: String },
    isAbnormal: { type: Boolean, default: false }
  },
  { timestamps: true }
);

// Pre-save hook to calculate if abnormal based on standard ranges
bloodTestSchema.pre('save', function (next) {
  // Typical adult normal ranges (can be refined later)
  // WBC: 4.0 - 10.0 x10^9/L
  // RBC: 4.0 - 5.5 x10^12/L (average for both genders)
  // HGB: 120 - 160 g/L
  // PLT: 100 - 300 x10^9/L
  const isWbcAbnormal = this.wbc < 4.0 || this.wbc > 10.0;
  const isRbcAbnormal = this.rbc < 3.5 || this.rbc > 5.8;
  const isHgbAbnormal = this.hgb < 110 || this.hgb > 165;
  const isPltAbnormal = this.plt < 100 || this.plt > 300;

  this.isAbnormal = isWbcAbnormal || isRbcAbnormal || isHgbAbnormal || isPltAbnormal;
  next();
});

export const BloodTest = mongoose.model<IBloodTest>('BloodTest', bloodTestSchema);
