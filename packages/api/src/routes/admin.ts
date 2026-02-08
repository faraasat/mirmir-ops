// Admin API Routes
import { Router } from 'express';
import { User } from '../models/User';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const router = Router();
const JWT_SECRET = process.env.JWT_SECRET || 'mirmir-secret-key';

// Admin user schema extension (you'd normally have a separate Admin model)
interface AdminUser {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'super_admin';
}

// In-memory admin users for demo (in production, use a separate Admin model)
const ADMIN_USERS: AdminUser[] = [
  {
    email: 'admin@mirmir.com',
    password: '$2a$10$XJU92MOcA0DwuhUDCxMGFukDKocl5ixexyq9bn9UCx85ER8UZk0F.', // 'admin123'
    name: 'Admin User',
    role: 'super_admin',
  },
];

// Admin login
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    const admin = ADMIN_USERS.find((a) => a.email === email);

    if (!admin) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const isValid = await bcrypt.compare(password, admin.password);

    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { email: admin.email, role: admin.role },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      user: {
        id: admin.email,
        email: admin.email,
        name: admin.name,
        role: admin.role,
      },
      token,
    });
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin middleware - verify admin token
function requireAdmin(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { email: string; role: string };
    
    if (!['admin', 'super_admin'].includes(decoded.role)) {
      return res.status(403).json({ error: 'Admin access required' });
    }

    req.admin = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Invalid token' });
  }
}

// Dashboard stats
router.get('/dashboard/stats', requireAdmin, async (_req, res) => {
  try {
    const [totalUsers, proUsers, enterpriseUsers] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ plan: 'pro' }),
      User.countDocuments({ plan: 'enterprise' }),
    ]);

    // Calculate MRR (simplified)
    const PRO_PRICE = 19;
    const ENTERPRISE_AVG = 99;
    const mrr = proUsers * PRO_PRICE + enterpriseUsers * ENTERPRISE_AVG;

    // Get previous month stats for growth (simplified - would normally use date queries)
    res.json({
      totalUsers,
      proUsers,
      enterpriseUsers,
      mrr,
      growth: {
        totalUsers: '+0%',
        proUsers: '+0%',
        enterpriseUsers: '+0%',
        mrr: '+0%',
      },
    });
  } catch (error) {
    console.error('Dashboard stats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Recent activity
router.get('/dashboard/activity', requireAdmin, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit as string) || 10, 50);

    // Get recent users as activity (simplified)
    const recentUsers = await User.find()
      .sort({ createdAt: -1 })
      .limit(limit)
      .select('email name plan createdAt');

    const activity = recentUsers.map((user) => ({
      id: user._id,
      type: 'signup',
      userId: user._id,
      userEmail: user.email,
      description: `${user.name || user.email} signed up`,
      timestamp: user.createdAt,
    }));

    res.json(activity);
  } catch (error) {
    console.error('Activity fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch activity' });
  }
});

// Get users list
router.get('/users', requireAdmin, async (req, res) => {
  try {
    const {
      page = '1',
      limit = '20',
      search = '',
      plan = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
    } = req.query;

    const pageNum = Math.max(1, parseInt(page as string));
    const limitNum = Math.min(100, Math.max(1, parseInt(limit as string)));
    const skip = (pageNum - 1) * limitNum;

    // Build query
    const query: any = {};

    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { name: { $regex: search, $options: 'i' } },
      ];
    }

    if (plan) {
      query.plan = plan;
    }

    // Execute query
    const [users, total] = await Promise.all([
      User.find(query)
        .sort({ [sortBy as string]: sortOrder === 'asc' ? 1 : -1 })
        .skip(skip)
        .limit(limitNum)
        .select('-password'),
      User.countDocuments(query),
    ]);

    res.json({
      users: users.map((u) => ({
        id: u._id,
        email: u.email,
        name: u.name,
        plan: u.plan,
        createdAt: u.createdAt,
        lastLoginAt: u.lastLogin,
        usage: u.usage || {},
        customLimits: u.customLimits || null,
      })),
      total,
      pages: Math.ceil(total / limitNum),
    });
  } catch (error) {
    console.error('Users fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// Get single user
router.get('/users/:id', requireAdmin, async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      plan: user.plan,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLogin,
      usage: user.usage || {},
      customLimits: user.customLimits || null,
    });
  } catch (error) {
    console.error('User fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Update user plan
router.put('/users/:id/plan', requireAdmin, async (req, res) => {
  try {
    const { plan } = req.body;

    if (!['free', 'pro', 'enterprise'].includes(plan)) {
      return res.status(400).json({ error: 'Invalid plan' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { plan },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id,
      email: user.email,
      name: user.name,
      plan: user.plan,
    });
  } catch (error) {
    console.error('Plan update error:', error);
    res.status(500).json({ error: 'Failed to update plan' });
  }
});

// Set custom limits for user
router.put('/users/:id/limits', requireAdmin, async (req, res) => {
  try {
    const { limits } = req.body;

    if (!limits || typeof limits !== 'object') {
      return res.status(400).json({ error: 'Invalid limits' });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { customLimits: limits },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id,
      email: user.email,
      customLimits: user.customLimits || null,
    });
  } catch (error) {
    console.error('Limits update error:', error);
    res.status(500).json({ error: 'Failed to update limits' });
  }
});

// Delete user
router.delete('/users/:id', requireAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('User delete error:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// Get plans (static for now)
router.get('/plans', requireAdmin, async (_req, res) => {
  res.json([
    {
      id: 'free',
      name: 'Free',
      price: 0,
      billingCycle: 'monthly',
      features: ['WebLLM (unlimited)', 'Limited cloud LLM (50/mo)', 'Basic workflows (3)', 'Voice commands (20/day)'],
      limits: {
        cloudLlmRequests: 50,
        byokRequests: 100,
        voiceCommands: 20,
        shadowTabs: 2,
        workflowTemplates: 3,
        scheduledWorkflows: 0,
      },
      isActive: true,
    },
    {
      id: 'pro',
      name: 'Pro',
      price: 19,
      billingCycle: 'monthly',
      features: ['Everything in Free', 'Cloud LLM (2000/mo)', 'Unlimited BYOK', 'Unlimited workflows', 'Scheduled workflows (5)'],
      limits: {
        cloudLlmRequests: 2000,
        byokRequests: -1,
        voiceCommands: -1,
        shadowTabs: 6,
        workflowTemplates: -1,
        scheduledWorkflows: 5,
      },
      isActive: true,
    },
    {
      id: 'enterprise',
      name: 'Enterprise',
      price: 99,
      billingCycle: 'monthly',
      features: ['Everything in Pro', 'Unlimited everything', 'Custom limits', 'Priority support', 'SSO/SAML'],
      limits: {
        cloudLlmRequests: -1,
        byokRequests: -1,
        voiceCommands: -1,
        shadowTabs: -1,
        workflowTemplates: -1,
        scheduledWorkflows: -1,
      },
      isActive: true,
    },
  ]);
});

// Enterprise customers
router.get('/enterprise/customers', requireAdmin, async (_req, res) => {
  try {
    const enterpriseUsers = await User.find({ plan: 'enterprise' }).select('-password');

    res.json(
      enterpriseUsers.map((u) => ({
        id: u._id,
        email: u.email,
        name: u.name,
        plan: u.plan,
        createdAt: u.createdAt,
        customLimits: u.customLimits || null,
      }))
    );
  } catch (error) {
    console.error('Enterprise fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch enterprise customers' });
  }
});

export { router as adminRouter };
