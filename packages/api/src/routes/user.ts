import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { Subscription } from '../models/Subscription';
import { Usage } from '../models/Usage';
import { PLAN_LIMITS } from '@mirmir/shared';

export const userRouter = Router();

// Get current user
userRouter.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: req.user?.toJSON(),
  });
});

// Get subscription
userRouter.get('/subscription', authenticate, async (req: AuthRequest, res: Response) => {
  const subscription = await Subscription.findOne({ userId: req.userId });
  
  if (!subscription) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Subscription not found' },
    });
    return;
  }

  const limits = subscription.customLimits || PLAN_LIMITS[subscription.planType];

  res.json({
    success: true,
    data: {
      subscription: subscription.toJSON(),
      limits,
    },
  });
});

// Get usage for current period
userRouter.get('/usage', authenticate, async (req: AuthRequest, res: Response) => {
  const subscription = await Subscription.findOne({ userId: req.userId });
  
  if (!subscription) {
    res.status(404).json({
      success: false,
      error: { code: 'NOT_FOUND', message: 'Subscription not found' },
    });
    return;
  }

  // Get usage records for current period
  const usageRecords = await Usage.find({
    userId: req.userId,
    date: {
      $gte: subscription.currentPeriodStart,
      $lte: subscription.currentPeriodEnd,
    },
  });

  // Aggregate usage
  const totalUsage = usageRecords.reduce(
    (acc, record) => ({
      cloudLlmRequests: acc.cloudLlmRequests + record.cloudLlmRequests,
      byokRequests: acc.byokRequests + record.byokRequests,
      voiceCommands: acc.voiceCommands + record.voiceCommands,
      shadowTabsUsed: acc.shadowTabsUsed + record.shadowTabsUsed,
      workflowsRun: acc.workflowsRun + record.workflowsRun,
      semanticEntries: acc.semanticEntries + record.semanticEntries,
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

  res.json({
    success: true,
    data: {
      usage: totalUsage,
      limits,
      periodStart: subscription.currentPeriodStart,
      periodEnd: subscription.currentPeriodEnd,
    },
  });
});

// Update user profile
userRouter.patch('/me', authenticate, async (req: AuthRequest, res: Response) => {
  const { name } = req.body;
  
  if (req.user && name !== undefined) {
    req.user.name = name;
    await req.user.save();
  }

  res.json({
    success: true,
    data: req.user?.toJSON(),
  });
});
