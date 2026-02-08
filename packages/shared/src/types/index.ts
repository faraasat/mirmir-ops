// Shared types for MirmirOps

// Plan types
export type PlanType = 'free' | 'pro' | 'enterprise';

export interface PlanLimits {
  cloudLlmRequests: number;
  byokRequests: number;
  voiceCommands: number;
  shadowTabs: number;
  workflowTemplates: number;
  scheduledWorkflows: number;
  historyRetentionDays: number;
  semanticMemoryEntries: number;
}

// User types
export interface User {
  id: string;
  email: string;
  name?: string;
  plan: PlanType;
  createdAt: Date;
  updatedAt: Date;
}

// Subscription types
export type SubscriptionStatus = 'active' | 'cancelled' | 'past_due' | 'trialing';

export interface Subscription {
  id: string;
  userId: string;
  planType: PlanType;
  status: SubscriptionStatus;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  currentPeriodStart: Date;
  currentPeriodEnd: Date;
  trialEnd?: Date;
  cancelledAt?: Date;
  customLimits?: Partial<PlanLimits>;
}

// Usage types
export interface UsageRecord {
  id: string;
  userId: string;
  date: Date;
  cloudLlmRequests: number;
  byokRequests: number;
  voiceCommands: number;
  shadowTabsUsed: number;
  workflowsRun: number;
  semanticEntries: number;
}

// License types
export interface License {
  id: string;
  licenseKey: string;
  enterpriseId: string;
  seatsTotal: number;
  seatsUsed: number;
  validFrom: Date;
  validUntil: Date;
  customConfig?: Record<string, unknown>;
}

// API Response types
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}

// Auth types
export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name?: string;
}
