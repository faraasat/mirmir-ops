// Auth Manager - User authentication for extension

import browser from 'webextension-polyfill';

/**
 * User profile from backend
 */
export interface UserProfile {
  id: string;
  email: string;
  name?: string;
  plan: 'free' | 'pro' | 'enterprise';
  planExpiresAt?: number;
  limits: {
    cloudLlmRequests: number;
    voiceCommands: number;
    byokRequests: number;
    savedWorkflows: number;
    shadowTabs: number;
    memory: number;
  };
  customLimits?: Record<string, number>;
  createdAt: number;
  trialEndsAt?: number;
}

/**
 * Auth state
 */
export interface AuthState {
  isAuthenticated: boolean;
  user: UserProfile | null;
  token: string | null;
  refreshToken: string | null;
  tokenExpiresAt: number | null;
}

/**
 * Login credentials
 */
export interface LoginCredentials {
  email: string;
  password: string;
}

/**
 * Signup data
 */
export interface SignupData {
  email: string;
  password: string;
  name?: string;
}

// Storage keys
const AUTH_STATE_KEY = 'auth_state';
const API_URL = 'http://localhost:3001'; // TODO: Make configurable

// Listeners
type AuthListener = (state: AuthState) => void;
const listeners: Set<AuthListener> = new Set();

// Cached state
let cachedState: AuthState | null = null;

/**
 * Initialize auth manager
 */
export async function initializeAuthManager(): Promise<void> {
  await loadAuthState();
  
  // Check if token needs refresh
  if (cachedState?.isAuthenticated && cachedState.tokenExpiresAt) {
    const expiresIn = cachedState.tokenExpiresAt - Date.now();
    if (expiresIn < 5 * 60 * 1000) { // Less than 5 minutes
      try {
        await refreshAuthToken();
      } catch {
        // Token refresh failed, user needs to re-login
        console.warn('[AuthManager] Token refresh failed');
      }
    }
  }
  
  console.log('[AuthManager] Initialized');
}

/**
 * Load auth state from storage
 */
async function loadAuthState(): Promise<AuthState> {
  const result = await browser.storage.local.get(AUTH_STATE_KEY);
  const state: AuthState = result[AUTH_STATE_KEY] || {
    isAuthenticated: false,
    user: null,
    token: null,
    refreshToken: null,
    tokenExpiresAt: null,
  };
  cachedState = state;
  return state;
}

/**
 * Save auth state to storage
 */
async function saveAuthState(state: AuthState): Promise<void> {
  cachedState = state;
  await browser.storage.local.set({ [AUTH_STATE_KEY]: state });
  notifyListeners(state);
}

/**
 * Get current auth state
 */
export async function getAuthState(): Promise<AuthState> {
  if (!cachedState) {
    return await loadAuthState();
  }
  return cachedState;
}

/**
 * Check if user is authenticated
 */
export async function isAuthenticated(): Promise<boolean> {
  const state = await getAuthState();
  return state.isAuthenticated && !!state.token;
}

/**
 * Get current user
 */
export async function getCurrentUser(): Promise<UserProfile | null> {
  const state = await getAuthState();
  return state.user;
}

/**
 * Login with email/password
 */
export async function login(credentials: LoginCredentials): Promise<UserProfile> {
  const response = await fetch(`${API_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(credentials),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Login failed');
  }
  
  const data = await response.json();
  
  await saveAuthState({
    isAuthenticated: true,
    user: data.user,
    token: data.token,
    refreshToken: data.refreshToken,
    tokenExpiresAt: Date.now() + (data.expiresIn || 3600) * 1000,
  });
  
  return data.user;
}

/**
 * Signup with email/password
 */
export async function signup(data: SignupData): Promise<UserProfile> {
  const response = await fetch(`${API_URL}/api/auth/signup`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Signup failed');
  }
  
  const responseData = await response.json();
  
  await saveAuthState({
    isAuthenticated: true,
    user: responseData.user,
    token: responseData.token,
    refreshToken: responseData.refreshToken,
    tokenExpiresAt: Date.now() + (responseData.expiresIn || 3600) * 1000,
  });
  
  return responseData.user;
}

/**
 * Logout
 */
export async function logout(): Promise<void> {
  const state = await getAuthState();
  
  // Call logout endpoint if we have a token
  if (state.token) {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${state.token}`,
        },
      });
    } catch {
      // Ignore logout API errors
    }
  }
  
  await saveAuthState({
    isAuthenticated: false,
    user: null,
    token: null,
    refreshToken: null,
    tokenExpiresAt: null,
  });
}

/**
 * Refresh auth token
 */
export async function refreshAuthToken(): Promise<void> {
  const state = await getAuthState();
  
  if (!state.refreshToken) {
    throw new Error('No refresh token available');
  }
  
  const response = await fetch(`${API_URL}/api/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken: state.refreshToken }),
  });
  
  if (!response.ok) {
    // Refresh failed, clear auth state
    await logout();
    throw new Error('Token refresh failed');
  }
  
  const data = await response.json();
  
  await saveAuthState({
    ...state,
    token: data.token,
    refreshToken: data.refreshToken || state.refreshToken,
    tokenExpiresAt: Date.now() + (data.expiresIn || 3600) * 1000,
  });
}

/**
 * Fetch user profile from server
 */
export async function fetchUserProfile(): Promise<UserProfile> {
  const state = await getAuthState();
  
  if (!state.token) {
    throw new Error('Not authenticated');
  }
  
  const response = await fetch(`${API_URL}/api/auth/profile`, {
    headers: {
      'Authorization': `Bearer ${state.token}`,
    },
  });
  
  if (!response.ok) {
    if (response.status === 401) {
      // Try to refresh token
      await refreshAuthToken();
      return fetchUserProfile();
    }
    throw new Error('Failed to fetch profile');
  }
  
  const user = await response.json();
  
  await saveAuthState({
    ...state,
    user,
  });
  
  return user;
}

/**
 * Sync usage with server
 */
export async function syncUsage(usage: Record<string, number>): Promise<void> {
  const state = await getAuthState();
  
  if (!state.token) return;
  
  try {
    await fetch(`${API_URL}/api/auth/usage`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${state.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ usage }),
    });
  } catch (error) {
    console.error('[AuthManager] Failed to sync usage:', error);
  }
}

/**
 * Request password reset
 */
export async function requestPasswordReset(email: string): Promise<void> {
  const response = await fetch(`${API_URL}/api/auth/forgot-password`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || 'Failed to request password reset');
  }
}

/**
 * Get API token for authenticated requests
 */
export async function getApiToken(): Promise<string | null> {
  const state = await getAuthState();
  
  if (!state.isAuthenticated || !state.token) {
    return null;
  }
  
  // Check if token is expiring soon
  if (state.tokenExpiresAt && state.tokenExpiresAt - Date.now() < 5 * 60 * 1000) {
    try {
      await refreshAuthToken();
      const newState = await getAuthState();
      return newState.token;
    } catch {
      return null;
    }
  }
  
  return state.token;
}

/**
 * Subscribe to auth state changes
 */
export function subscribeToAuth(listener: AuthListener): () => void {
  listeners.add(listener);
  
  // Send current state immediately
  if (cachedState) {
    listener(cachedState);
  }
  
  return () => {
    listeners.delete(listener);
  };
}

/**
 * Notify all listeners of state change
 */
function notifyListeners(state: AuthState): void {
  listeners.forEach(listener => {
    try {
      listener(state);
    } catch (error) {
      console.error('[AuthManager] Listener error:', error);
    }
  });
}

/**
 * Get effective limits for current user
 */
export async function getEffectiveLimits(): Promise<Record<string, number>> {
  const state = await getAuthState();
  
  if (!state.user) {
    // Default free tier limits
    return {
      cloudLlmRequests: 50,
      voiceCommands: 20,
      byokRequests: 100,
      savedWorkflows: 5,
      shadowTabs: 2,
      memory: 1000,
    };
  }
  
  // Custom limits override plan limits
  if (state.user.customLimits) {
    return {
      ...state.user.limits,
      ...state.user.customLimits,
    };
  }
  
  return state.user.limits;
}

/**
 * Check if user has active trial
 */
export async function hasActiveTrial(): Promise<boolean> {
  const state = await getAuthState();
  
  if (!state.user?.trialEndsAt) return false;
  
  return state.user.trialEndsAt > Date.now();
}

/**
 * Get trial days remaining
 */
export async function getTrialDaysRemaining(): Promise<number | null> {
  const state = await getAuthState();
  
  if (!state.user?.trialEndsAt) return null;
  
  const remaining = state.user.trialEndsAt - Date.now();
  if (remaining <= 0) return 0;
  
  return Math.ceil(remaining / (24 * 60 * 60 * 1000));
}
