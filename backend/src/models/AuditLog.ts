import mongoose, { Document, Schema } from 'mongoose';

export type AuditAction =
  | 'login'
  | 'logout'
  | 'register'
  | 'refresh_token'
  | 'forgot_password'
  | 'reset_password'
  | 'change_password'
  | 'delete_account'
  | 'share_create'
  | 'share_revoke';

export interface IAuditLog extends Document {
  user: mongoose.Types.ObjectId | null;
  action: AuditAction;
  success: boolean;
  ip: string;
  userAgent: string;
  detail?: string;
  isAnomaly: boolean;
  anomalyType?: 'new_ip' | 'brute_force';
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    user: { type: Schema.Types.ObjectId, ref: 'User', default: null, index: true },
    action: { type: String, required: true },
    success: { type: Boolean, required: true, default: false },
    ip: { type: String, required: true, default: '' },
    userAgent: { type: String, default: '' },
    detail: { type: String },
    isAnomaly: { type: Boolean, default: false },
    anomalyType: { type: String, enum: ['new_ip', 'brute_force'] },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

// 用户查看自己的日志（按时间降序）
auditLogSchema.index({ user: 1, createdAt: -1 });

// 暴力破解检测（按 IP + action 查最近失败）
auditLogSchema.index({ ip: 1, action: 1, createdAt: -1 });

// TTL: 90 天后自动删除
auditLogSchema.index({ createdAt: 1 }, { expireAfterSeconds: 90 * 24 * 60 * 60 });

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);
