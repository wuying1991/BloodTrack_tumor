import mongoose, { Document, Schema } from 'mongoose';

export interface IMedication {
  name?: string;
  dosage?: string;
  startDate?: Date;
  endDate?: Date;
  notes?: string;
  /** legacy only: old records used schedule; normalize to notes when read */
  schedule?: string;
}

export interface IChemoCycle extends Document {
  user: mongoose.Types.ObjectId;
  regimenName: string;
  startDate: Date;
  endDate: Date;
  medications: IMedication[];
  doctorNotes?: string;
}

const medicationSchema = new Schema<IMedication>(
  {
    name: { type: String, trim: true },
    dosage: { type: String, trim: true },
    startDate: { type: Date },
    endDate: { type: Date },
    notes: { type: String, trim: true, maxlength: 1000 },
    // legacy: M-P7 之前的字段，读出时迁移到 notes，不再由新 UI 写入
    schedule: { type: String, trim: true },
  },
  { _id: false }
);

const chemoCycleSchema = new Schema<IChemoCycle>(
  {
    user: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    regimenName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 120,
      default: '未命名方案',
    },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    medications: { type: [medicationSchema], default: [] },
    doctorNotes: { type: String },
  },
  { timestamps: true }
);

// 常用查询: 用户周期按 startDate 排序 / 边界重算
chemoCycleSchema.index({ user: 1, startDate: 1 });

export const ChemoCycle = mongoose.model<IChemoCycle>('ChemoCycle', chemoCycleSchema);
