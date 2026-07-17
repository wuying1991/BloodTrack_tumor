import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';

export interface IUser extends Document {
  email: string;
  passwordHash: string;
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
    email: { type: String, required: true, unique: true, trim: true, lowercase: true },
    passwordHash: { type: String, required: true },
    fullName: { type: String, required: true, trim: true },
    dateOfBirth: { type: Date },
    gender: { type: String },
    resetPasswordToken: { type: String },
    resetPasswordExpires: { type: Date },
    knownIps: { type: [String], default: [] },
    settings: {
      notifications: {
        email: { type: Boolean, default: true },
        push: { type: Boolean, default: true }
      },
      dataSharing: {
        enabled: { type: Boolean, default: false },
        sharedWith: [{ type: String }]
      },
      language: { type: String, enum: ['zh-CN', 'en-US'], default: 'zh-CN' }
    }
  },
  { timestamps: true }
);

userSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return bcrypt.compare(candidatePassword, this.passwordHash);
};

export const User = mongoose.model<IUser>('User', userSchema);
