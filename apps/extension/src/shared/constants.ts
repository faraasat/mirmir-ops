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

// LLM Models - WebLLM (Local)
export const WEBLLM_MODELS = {
  'Llama-3.2-1B-Instruct-q4f16_1-MLC': {
    name: 'Llama 3.2 1B',
    size: '~700MB',
    description: 'Fast, lightweight model for basic tasks',
    recommended: true,
  },
  'Llama-3.2-3B-Instruct-q4f16_1-MLC': {
    name: 'Llama 3.2 3B',
    size: '~1.8GB',
    description: 'Balanced performance and capability',
  },
  'Phi-3.5-mini-instruct-q4f16_1-MLC': {
    name: 'Phi 3.5 Mini',
    size: '~2.3GB',
    description: 'Great for reasoning and coding',
  },
  'gemma-2-2b-it-q4f16_1-MLC': {
    name: 'Gemma 2 2B',
    size: '~1.5GB',
    description: 'Google\'s efficient small model',
  },
  'Qwen2.5-1.5B-Instruct-q4f16_1-MLC': {
    name: 'Qwen 2.5 1.5B',
    size: '~1GB',
    description: 'Multilingual support',
  },
} as const;

export const DEFAULT_WEBLLM_MODEL = 'Llama-3.2-1B-Instruct-q4f16_1-MLC';

// OpenAI Models
export const OPENAI_MODELS = {
  'gpt-4o': {
    name: 'GPT-4o',
    description: 'Most capable, multimodal',
  },
  'gpt-4o-mini': {
    name: 'GPT-4o Mini',
    description: 'Fast and affordable',
    recommended: true,
  },
  'gpt-4-turbo': {
    name: 'GPT-4 Turbo',
    description: 'High capability, 128k context',
  },
  'gpt-3.5-turbo': {
    name: 'GPT-3.5 Turbo',
    description: 'Fast and cost-effective',
  },
} as const;

export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini';

// Anthropic Models
export const ANTHROPIC_MODELS = {
  'claude-3-5-sonnet-20241022': {
    name: 'Claude 3.5 Sonnet',
    description: 'Best for most tasks',
    recommended: true,
  },
  'claude-3-5-haiku-20241022': {
    name: 'Claude 3.5 Haiku',
    description: 'Fastest, affordable',
  },
  'claude-3-opus-20240229': {
    name: 'Claude 3 Opus',
    description: 'Most powerful',
  },
} as const;

export const DEFAULT_ANTHROPIC_MODEL = 'claude-3-5-sonnet-20241022';

// Ollama Models (common ones, user can add custom)
export const OLLAMA_MODELS = {
  'llama3.2': {
    name: 'Llama 3.2',
    description: 'Latest Llama model',
    recommended: true,
  },
  'llama3.1': {
    name: 'Llama 3.1',
    description: 'Powerful general purpose',
  },
  'mistral': {
    name: 'Mistral',
    description: 'Fast and efficient',
  },
  'codellama': {
    name: 'Code Llama',
    description: 'Optimized for coding',
  },
  'phi3': {
    name: 'Phi-3',
    description: 'Microsoft\'s small but capable',
  },
  'gemma2': {
    name: 'Gemma 2',
    description: 'Google\'s efficient model',
  },
} as const;

export const DEFAULT_OLLAMA_MODEL = 'llama3.2';

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
