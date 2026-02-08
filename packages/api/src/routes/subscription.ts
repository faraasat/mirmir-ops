import { Router, Response } from 'express';
import { authenticate, AuthRequest } from '../middleware/auth';
import { PLAN_LIMITS } from '@mirmir/shared';

export const subscriptionRouter = Router();

// Get available plans
subscriptionRouter.get('/plans', (_req, res: Response) => {
  const plans = Object.entries(PLAN_LIMITS).map(([type, limits]) => ({
    type,
    limits,
    price: type === 'free' ? 0 : type === 'pro' ? 9.99 : null, // Enterprise is custom
  }));

  res.json({
    success: true,
    data: plans,
  });
});

// Create checkout session (Stripe integration placeholder)
subscriptionRouter.post('/checkout', authenticate, async (req: AuthRequest, res: Response) => {
  const { planType } = req.body;

  if (planType !== 'pro') {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_PLAN', message: 'Invalid plan type for checkout' },
    });
    return;
  }

  // TODO: Integrate with Stripe
  // const session = await stripe.checkout.sessions.create({...})

  res.json({
    success: true,
    data: {
      message: 'Stripe checkout integration pending',
      // checkoutUrl: session.url,
    },
  });
});

// Get billing portal URL (Stripe integration placeholder)
subscriptionRouter.post('/portal', authenticate, async (_req: AuthRequest, res: Response) => {
  // TODO: Integrate with Stripe
  // const portalSession = await stripe.billingPortal.sessions.create({...})

  res.json({
    success: true,
    data: {
      message: 'Stripe portal integration pending',
      // portalUrl: portalSession.url,
    },
  });
});

// Cancel subscription (placeholder)
subscriptionRouter.post('/cancel', authenticate, async (_req: AuthRequest, res: Response) => {
  // TODO: Integrate with Stripe for actual cancellation

  res.json({
    success: true,
    data: {
      message: 'Subscription cancellation pending Stripe integration',
    },
  });
});
