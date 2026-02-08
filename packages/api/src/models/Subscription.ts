import mongoose, { Schema, Document } from 'mongoose';
import type { PlanType, SubscriptionStatus, PlanLimits } from '@mirmir/shared';

export interface ISubscription extends Document {
  userId: mongoose.Types.ObjectId;
  planType: PlanType;
  status: SubscriptionStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd?: Date;
  cancelledAt?: Date;
  customLimits?: Partial<PlanLimits>;
  createdAt: Date;
  updatedAt: Date;
}

const SubscriptionSchema = new Schema<ISubscription>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
    },
    planType: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free',
    },
    status: {
      type: String,
      enum: ['active', 'cancelled', 'past_due', 'trialing'],
      default: 'active',
    },
    stripeCustomerId: String,
    stripeSubscriptionId: String,
    currentPeriodStart: {
      type: Date,
      required: true,
    },
    currentPeriodEnd: {
      type: Date,
      required: true,
    },
    trialEnd: Date,
    cancelledAt: Date,
    customLimits: {
      type: Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

export const Subscription = mongoose.model<ISubscription>('Subscription', SubscriptionSchema);
