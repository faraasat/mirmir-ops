// Shared constants for MirmirOps

import type { PlanLimits, PlanType } from '../types';

export const APP_NAME = 'MirmirOps';
export const APP_VERSION = '0.1.0';

// Plan limits
export const PLAN_LIMITS: Record<PlanType, PlanLimits> = {
  free: {
    cloudLlmRequests: 50,
    byokRequests: 100,
    voiceCommands: 20,
    shadowTabs: 2,
    workflowTemplates: 3,
    scheduledWorkflows: 0,
    historyRetentionDays: 7,
    semanticMemoryEntries: 1000,
  },
  pro: {
    cloudLlmRequests: 2000,
    byokRequests: -1, // unlimited
    voiceCommands: -1,
    shadowTabs: 6,
    workflowTemplates: -1,
    scheduledWorkflows: 5,
    historyRetentionDays: 90,
    semanticMemoryEntries: 50000,
  },
  enterprise: {
    cloudLlmRequests: -1,
    byokRequests: -1,
    voiceCommands: -1,
    shadowTabs: -1,
    workflowTemplates: -1,
    scheduledWorkflows: -1,
    historyRetentionDays: -1,
    semanticMemoryEntries: -1,
  },
};

// API endpoints
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/auth/login',
    REGISTER: '/auth/register',
    REFRESH: '/auth/refresh',
    LOGOUT: '/auth/logout',
    VERIFY: '/auth/verify',
  },
  USER: {
    ME: '/user/me',
    UPDATE: '/user/me',
    SUBSCRIPTION: '/user/subscription',
    USAGE: '/user/usage',
  },
  SUBSCRIPTION: {
    PLANS: '/subscription/plans',
    CHECKOUT: '/subscription/checkout',
    PORTAL: '/subscription/portal',
    CANCEL: '/subscription/cancel',
  },
  LICENSE: {
    VALIDATE: '/license/validate',
    ACTIVATE: '/license/activate',
  },
  USAGE: {
    SYNC: '/usage/sync',
    LIMITS: '/usage/limits',
  },
} as const;

// HTTP status codes
export const HTTP_STATUS = {
  OK: 200,
  CREATED: 201,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  TOO_MANY_REQUESTS: 429,
  INTERNAL_ERROR: 500,
} as const;

// Error codes
export const ERROR_CODES = {
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  EMAIL_EXISTS: 'EMAIL_EXISTS',
  EMAIL_NOT_VERIFIED: 'EMAIL_NOT_VERIFIED',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  PLAN_LIMIT_EXCEEDED: 'PLAN_LIMIT_EXCEEDED',
  LICENSE_INVALID: 'LICENSE_INVALID',
  LICENSE_EXPIRED: 'LICENSE_EXPIRED',
  SUBSCRIPTION_REQUIRED: 'SUBSCRIPTION_REQUIRED',
} as const;
