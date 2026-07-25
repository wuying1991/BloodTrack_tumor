import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email?: string;
  phone?: string;
  passwordHash?: string;
  fullName: string;
  dateOfBirth: Date;
  gender: string;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  knownIps: string[];
  settings: {
    notifications: { email: boolean; push: boolean };
    dataSharing: { enabled: boolean; sharedWith: string[] };
    language?: 'zh-CN' | 'en-US';
  };
  comparePassword(candidatePassword: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    // Sparse unique: email-only or phone-only accounts are allowed.
    email: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      lowercase: true,
    },
    phone: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    // Optional for phone OTP-only accounts.
    passwordHash: { type: String, required: false },
    fullName: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date },
    gender: { type: String },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    knownIps: { type: [String], default: [] },
    settings: {
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true },
      },
      dataSharing: {
        enabled: { type: Boolean, default: false },
        sharedWith: [{ type: String }],
      },
      language: { type: String, enum: ['zh-CN', 'en-US'], default: 'zh-CN' },
    },
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = async function (
  candidatePassword: string
): Promise<boolean> {
  if (!this.passwordHash) return false;
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

// Application-level: at least one of email or phone must exist (enforced in controllers).
export const User = mongoose.model<IUser>('User', userSchema);
