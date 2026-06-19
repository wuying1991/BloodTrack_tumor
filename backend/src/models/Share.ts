import mongoose, { Document, Schema } from 'mongoose';

export interface IShare extends Document {
  user: mongoose.Types.ObjectId;
  token: string;
  pinHash: string | null;
  scope: {
    bloodTests: boolean;
    chemoCycles: boolean;
    analytics: boolean;
  };
  expiresAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const shareSchema = new Schema<IShare>(
  {
    user: { type: Schema.Types.ObjectId, required: true, ref: 'User' },
    token: { type: String, required: true, unique: true },
    pinHash: { type: String, default: null },
    scope: {
      bloodTests:  { type: Boolean, required: true, default: false },
      chemoCycles: { type: Boolean, required: true, default: false },
      analytics:   { type: Boolean, required: true, default: false },
    },
    expiresAt: { type: Date, default: null },
  },
  { timestamps: true }
);

// 拉某个用户的分享列表 (按 createdAt desc)
shareSchema.index({ user: 1, createdAt: -1 });

// 至少有一项 scope 为 true 才能创建
shareSchema.pre('validate', function (next) {
  const s = (this as IShare).scope;
  if (!s || (!s.bloodTests && !s.chemoCycles && !s.analytics)) {
    return next(new Error('至少需要选择一项分享内容 (At least one scope must be enabled)'));
  }
  next();
});

export const Share = mongoose.model<IShare>('Share', shareSchema);
