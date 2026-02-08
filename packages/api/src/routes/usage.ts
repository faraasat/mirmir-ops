import { Router, Response } from 'express';
import { z } from 'zod';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Usage } from '../models/Usage';
import { Subscription } from '../models/Subscription';
import { PLAN_LIMITS } from '@mirmir/shared';

export const usageRouter = Router();

const syncUsageSchema = z.object({
  cloudLlmRequests: z.number().optional(),
  byokRequests: z.number().optional(),
  voiceCommands: z.number().optional(),
  shadowTabsUsed: z.number().optional(),
  workflowsRun: z.number().optional(),
  semanticEntries: z.number().optional(),
});

// Sync usage from extension
usageRouter.post('/sync', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const usage = syncUsageSchema.parse(req.body);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Upsert today's usage record
    const updatedUsage = await Usage.findOneAndUpdate(
      { userId: req.userId, date: today },
      {
        $inc: {
          cloudLlmRequests: usage.cloudLlmRequests || 0,
          byokRequests: usage.byokRequests || 0,
          voiceCommands: usage.voiceCommands || 0,
          shadowTabsUsed: usage.shadowTabsUsed || 0,
          workflowsRun: usage.workflowsRun || 0,
          semanticEntries: usage.semanticEntries || 0,
        },
      },
      { upsert: true, new: true }
    );

    res.json({
      success: true,
      data: updatedUsage.toJSON(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      res.status(400).json({
        success: false,
        error: { code: 'VALIDATION_ERROR', message: error.errors[0].message },
      });
      return;
    }
    throw error;
  }
});

// Get current limits and remaining
usageRouter.get('/limits', authenticate, async (req: AuthRequest, res: Response) => {
  const subscription = await Subscription.findOne({ userId: req.userId });
  
  if (!subscription) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Subscription not found' },
    });
    return;
  }

  // Get usage for current period
  const usageRecords = await Usage.find({
    userId: req.userId,
    date: {
      $gte: subscription.currentPeriodStart,
      $lte: subscription.currentPeriodEnd,
    },
  });

  // Aggregate
  const totalUsage = usageRecords.reduce(
    (acc, record) => ({
      cloudLlmRequests: acc.cloudLlmRequests + record.cloudLlmRequests,
      byokRequests: acc.byokRequests + record.byokRequests,
      voiceCommands: acc.voiceCommands + record.voiceCommands,
      shadowTabsUsed: Math.max(acc.shadowTabsUsed, record.shadowTabsUsed),
      workflowsRun: acc.workflowsRun + record.workflowsRun,
      semanticEntries: Math.max(acc.semanticEntries, record.semanticEntries),
    }),
    {
      cloudLlmRequests: 0,
      byokRequests: 0,
      voiceCommands: 0,
      shadowTabsUsed: 0,
      workflowsRun: 0,
      semanticEntries: 0,
    }
  );

  const limits = subscription.customLimits || PLAN_LIMITS[subscription.planType];

  // Calculate remaining
  const remaining = {
    cloudLlmRequests: limits.cloudLlmRequests === -1 ? -1 : Math.max(0, limits.cloudLlmRequests - totalUsage.cloudLlmRequests),
    byokRequests: limits.byokRequests === -1 ? -1 : Math.max(0, limits.byokRequests - totalUsage.byokRequests),
    voiceCommands: limits.voiceCommands === -1 ? -1 : Math.max(0, limits.voiceCommands - totalUsage.voiceCommands),
    shadowTabs: limits.shadowTabs === -1 ? -1 : Math.max(0, limits.shadowTabs - totalUsage.shadowTabsUsed),
    workflowTemplates: limits.workflowTemplates,
    semanticMemoryEntries: limits.semanticMemoryEntries === -1 ? -1 : Math.max(0, limits.semanticMemoryEntries - totalUsage.semanticEntries),
  };

  res.json({
    success: true,
    data: {
      plan: subscription.planType,
      limits,
      usage: totalUsage,
      remaining,
    },
  });
});
