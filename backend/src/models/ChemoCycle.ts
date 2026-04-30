import mongoose, { Document, Schema } from 'mongoose';

export interface IMedication {
  name: string;
  dosage: string;
  schedule: string;
}

export interface IChemoCycle extends Document {
  user: mongoose.Types.ObjectId;
  startDate: Date;
  endDate: Date;
  medications: IMedication[];
  doctorNotes?: string;
}

const medicationSchema = new Schema<IMedication>(
  {
    name: { type: String, required: true },
    dosage: { type: String, required: true },
    schedule: { type: String, required: true },
  },
  { _id: false }
);

const chemoCycleSchema = new Schema<IChemoCycle>(
  {
    user: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    medications: { type: [medicationSchema], required: true, validate: [(arr: unknown[]) => (arr as IMedication[]).length > 0, '至少需要一种药物'] },
    doctorNotes: { type: String },
  },
  { timestamps: true }
);

export const ChemoCycle = mongoose.model<IChemoCycle>('ChemoCycle', chemoCycleSchema);
