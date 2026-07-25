import mongoose, { Document, Schema } from 'mongoose';
import { isBloodTestAbnormal } from '../constants/bloodRanges';

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

// Keep the persisted summary in sync with the canonical ranges used by the API.
bloodTestSchema.pre('save', function (next) {
  this.isAbnormal = isBloodTestAbnormal({
    wbc: this.wbc,
    rbc: this.rbc,
    hgb: this.hgb,
    plt: this.plt,
    neu: this.neu,
    lym: this.lym,
    crp: this.crp,
  });
  next();
});

export const BloodTest = mongoose.model<IBloodTest>('BloodTest', bloodTestSchema);
