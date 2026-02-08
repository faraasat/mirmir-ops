import mongoose, { Schema, Document } from 'mongoose';

export interface IUsage extends Document {
  userId: mongoose.Types.ObjectId;
  date: Date;
  cloudLlmRequests: number;
  byokRequests: number;
  voiceCommands: number;
  shadowTabsUsed: number;
  workflowsRun: number;
  semanticEntries: number;
  createdAt: Date;
  updatedAt: Date;
}

const UsageSchema = new Schema<IUsage>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    date: {
      type: Date,
      required: true,
    },
    cloudLlmRequests: {
      type: Number,
      default: 0,
    },
    byokRequests: {
      type: Number,
      default: 0,
    },
    voiceCommands: {
      type: Number,
      default: 0,
    },
    shadowTabsUsed: {
      type: Number,
      default: 0,
    },
    workflowsRun: {
      type: Number,
      default: 0,
    },
    semanticEntries: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index for efficient queries
UsageSchema.index({ userId: 1, date: 1 }, { unique: true });

export const Usage = mongoose.model<IUsage>('Usage', UsageSchema);
