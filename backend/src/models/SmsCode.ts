import mongoose, { Document, Schema } from 'mongoose';

export type SmsPurpose = 'login' | 'bind';

export interface ISmsCode extends Document {
  phone: string;
  codeHash: string;
  purpose: SmsPurpose;
  attempts: number;
  expiresAt: Date;
  createdAt: Date;
}

const smsCodeSchema = new Schema<ISmsCode>(
  {
    phone: { type: String, required: true, index: true },
    codeHash: { type: String, required: true },
    purpose: { type: String, enum: ['login', 'bind'], required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

smsCodeSchema.index({ phone: 1, purpose: 1 });
// Auto-clean expired codes (TTL)
smsCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export const SmsCode = mongoose.model<ISmsCode>('SmsCode', smsCodeSchema);
