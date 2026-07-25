import mongoose, { Document, Schema } from 'mongoose';

export interface IRefreshSession extends Document {
  user: mongoose.Types.ObjectId;
  jti: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt?: Date;
  replacedByJti?: string;
}

const refreshSessionSchema = new Schema<IRefreshSession>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    jti: { type: String, required: true, unique: true },
    tokenHash: { type: String, required: true, unique: true },
    expiresAt: { type: Date, required: true, index: { expires: 0 } },
    revokedAt: { type: Date },
    replacedByJti: { type: String },
  },
  { timestamps: true }
);

refreshSessionSchema.index({ user: 1, revokedAt: 1 });

export const RefreshSession = mongoose.model<IRefreshSession>(
  'RefreshSession',
  refreshSessionSchema
);
