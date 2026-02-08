import mongoose, { Schema, Document } from 'mongoose';
import bcrypt from 'bcryptjs';
import type { PlanType } from '@mirmir/shared';

export interface UserUsage {
  cloudLlmRequests: number;
  byokRequests: number;
  voiceCommands: number;
  savedWorkflows: number;
}

export interface IUser extends Document {
  email: string;
  password: string;
  name?: string;
  plan: PlanType;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
  lastLogin?: Date;
  usage?: UserUsage;
  customLimits?: Record<string, number>;
  comparePassword(password: string): Promise<boolean>;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 8,
    },
    name: {
      type: String,
      trim: true,
    },
    plan: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free',
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    lastLogin: {
      type: Date,
    },
    usage: {
      type: {
        cloudLlmRequests: { type: Number, default: 0 },
        byokRequests: { type: Number, default: 0 },
        voiceCommands: { type: Number, default: 0 },
        savedWorkflows: { type: Number, default: 0 },
      },
      default: {},
    },
    customLimits: {
      type: Schema.Types.Mixed,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving
UserSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Compare password method
UserSchema.methods.comparePassword = async function (password: string): Promise<boolean> {
  return bcrypt.compare(password, this.password);
};

// Remove password from JSON output
UserSchema.set('toJSON', {
  transform: (_doc, ret) => {
    const { password: _, ...rest } = ret;
    return rest;
  },
});

export const User = mongoose.model<IUser>('User', UserSchema);
