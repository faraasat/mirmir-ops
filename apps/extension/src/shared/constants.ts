// Constants for MirmirOps

export const APP_NAME = 'MirmirOps';
export const APP_VERSION = '0.1.0';

// Storage keys
export const STORAGE_KEYS = {
  USER: 'mirmir_user',
  SETTINGS: 'mirmir_settings',
  USAGE: 'mirmir_usage',
  PERMISSIONS: 'mirmir_permissions',
  HISTORY: 'mirmir_history',
  WORKFLOWS: 'mirmir_workflows',
  SEMANTIC_INDEX: 'mirmir_semantic_index',
} as const;

// IndexedDB
export const DB_NAME = 'MirmirOpsDB';
export const DB_VERSION = 1;

// LLM Models
export const WEBLLM_MODELS = {
  'Qwen2-0.5B-Instruct-q4f16_1-MLC': {
    name: 'Qwen2 0.5B',
    size: '0.5GB',
    description: 'Ultra-fast, basic tasks',
  },
  'Phi-3-mini-4k-instruct-q4f16_1-MLC': {
    name: 'Phi-3 Mini 4K',
    size: '2.3GB',
    description: 'Fast responses, simple tasks',
  },
  'Llama-3.1-8B-Instruct-q4f16_1-MLC': {
    name: 'Llama 3.1 8B',
    size: '4.5GB',
    description: 'High quality, complex reasoning',
  },
} as const;

export const DEFAULT_WEBLLM_MODEL = 'Phi-3-mini-4k-instruct-q4f16_1-MLC';

// API Endpoints (for backend sync)
declare const __VITE_API_URL__: string | undefined;
export const API_BASE_URL = typeof __VITE_API_URL__ !== 'undefined' ? __VITE_API_URL__ : 'http://localhost:3001';

export const API_ENDPOINTS = {
  AUTH_LOGIN: '/auth/login',
  AUTH_REGISTER: '/auth/register',
  AUTH_REFRESH: '/auth/refresh',
  USER_ME: '/user/me',
  USAGE_SYNC: '/usage/sync',
  USAGE_LIMITS: '/usage/limits',
  LICENSE_VALIDATE: '/license/validate',
} as const;

// Rate limits
export const RATE_LIMITS = {
  VOICE_COMMANDS_PER_MINUTE: 10,
  LLM_REQUESTS_PER_MINUTE: 20,
  ACTIONS_PER_MINUTE: 60,
} as const;

// Timeouts (ms)
export const TIMEOUTS = {
  LLM_REQUEST: 60000,
  ACTION_DEFAULT: 30000,
  USAGE_SYNC_INTERVAL: 300000, // 5 minutes
  PERMISSION_EXPIRY: 3600000, // 1 hour
} as const;

// Permission tiers and their allowed actions
export const PERMISSION_TIER_ACTIONS = {
  passive: ['extract', 'screenshot'],
  'read-only': ['navigate', 'scroll', 'wait', 'copy', 'select', 'hover'],
  'mutable-safe': ['click', 'type', 'fill-form'],
  'mutable-critical': ['submit', 'download', 'paste'],
} as const;

// Voice recognition
export const VOICE_CONFIG = {
  CONTINUOUS: true,
  INTERIM_RESULTS: true,
  MAX_ALTERNATIVES: 3,
  LANGUAGES: ['en-US', 'en-GB', 'es-ES', 'fr-FR', 'de-DE'],
} as const;

// UI Constants
export const UI = {
  SIDEPANEL_WIDTH: 400,
  SIDEPANEL_MIN_HEIGHT: 600,
  TOAST_DURATION: 3000,
  ANIMATION_DURATION: 200,
} as const;
