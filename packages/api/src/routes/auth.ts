import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { User } from '../models/User';
import { Subscription } from '../models/Subscription';
import { generateTokens, verifyToken, authenticate, AuthRequest } from '../middleware/auth';
import { createError } from '../middleware/error-handler';

export const authRouter = Router();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

// Register
authRouter.post('/register', async (req: Request, res: Response) => {
  try {
    const { email, password, name } = registerSchema.parse(req.body);

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      throw createError('Email already exists', 409, 'EMAIL_EXISTS');
    }

    // Create user
    const user = await User.create({ email, password, name });

    // Create free subscription
    const now = new Date();
    const periodEnd = new Date(now);
    periodEnd.setMonth(periodEnd.getMonth() + 1);

    await Subscription.create({
      userId: user._id,
      planType: 'free',
      status: 'active',
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
    });

    // Generate tokens
    const tokens = generateTokens(user);

    res.status(201).json({
      success: true,
      data: {
        user: user.toJSON(),
        ...tokens,
      },
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

// Login
authRouter.post('/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = loginSchema.parse(req.body);

    // Find user
    const user = await User.findOne({ email });
    if (!user) {
      throw createError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Check password
    const isValid = await user.comparePassword(password);
    if (!isValid) {
      throw createError('Invalid credentials', 401, 'INVALID_CREDENTIALS');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate tokens
    const tokens = generateTokens(user);

    res.json({
      success: true,
      data: {
        user: user.toJSON(),
        ...tokens,
      },
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

// Refresh token
authRouter.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    
    if (!refreshToken) {
      throw createError('Refresh token required', 400, 'TOKEN_MISSING');
    }

    const payload = verifyToken(refreshToken);
    const user = await User.findById(payload.userId);
    
    if (!user) {
      throw createError('User not found', 401, 'USER_NOT_FOUND');
    }

    const tokens = generateTokens(user);

    res.json({
      success: true,
      data: tokens,
    });
  } catch {
    throw createError('Invalid refresh token', 401, 'TOKEN_INVALID');
  }
});

// Get current user
authRouter.get('/me', authenticate, async (req: AuthRequest, res: Response) => {
  res.json({
    success: true,
    data: req.user?.toJSON(),
  });
});
