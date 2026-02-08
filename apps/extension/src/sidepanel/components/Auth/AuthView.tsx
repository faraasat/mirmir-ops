import React, { useState, useEffect } from 'react';
import {
  login,
  signup,
  logout,
  getAuthState,
  subscribeToAuth,
  requestPasswordReset,
  type AuthState,
  type UserProfile,
} from '@/lib/auth';

type AuthMode = 'login' | 'signup' | 'forgot';

export const AuthView: React.FC = () => {
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [mode, setMode] = useState<AuthMode>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');

  useEffect(() => {
    // Load initial state
    getAuthState().then(setAuthState);

    // Subscribe to changes
    const unsubscribe = subscribeToAuth(setAuthState);
    return unsubscribe;
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await login({ email, password });
      // State will update via subscription
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signup({ email, password, name: name || undefined });
      // State will update via subscription
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Signup failed');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      await requestPasswordReset(email);
      setSuccess('Password reset email sent. Check your inbox.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send reset email');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    setLoading(true);
    try {
      await logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Show profile if authenticated
  if (authState?.isAuthenticated && authState.user) {
    return <ProfileView user={authState.user} onLogout={handleLogout} loading={loading} />;
  }

  // Show auth forms
  return (
    <div className="p-4">
      <div className="text-center mb-6">
        <div className="w-16 h-16 mx-auto bg-primary rounded-xl flex items-center justify-center mb-4">
          <span className="text-white text-2xl font-bold">M</span>
        </div>
        <h2 className="text-xl font-bold">
          {mode === 'login' && 'Welcome Back'}
          {mode === 'signup' && 'Create Account'}
          {mode === 'forgot' && 'Reset Password'}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {mode === 'login' && 'Sign in to access all features'}
          {mode === 'signup' && 'Sign up to unlock Pro features'}
          {mode === 'forgot' && 'Enter your email to reset password'}
        </p>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
          {error}
        </div>
      )}

      {success && (
        <div className="mb-4 p-3 bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm rounded-lg">
          {success}
        </div>
      )}

      {/* Login Form */}
      {mode === 'login' && (
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input w-full"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input w-full"
              placeholder="••••••••"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Signing in...' : 'Sign In'}
          </button>
          <div className="flex justify-between text-sm">
            <button
              type="button"
              onClick={() => setMode('forgot')}
              className="text-primary hover:underline"
            >
              Forgot password?
            </button>
            <button
              type="button"
              onClick={() => setMode('signup')}
              className="text-primary hover:underline"
            >
              Create account
            </button>
          </div>
        </form>
      )}

      {/* Signup Form */}
      {mode === 'signup' && (
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Name (optional)</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input w-full"
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input w-full"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              className="input w-full"
              placeholder="••••••••"
            />
            <p className="text-xs text-muted-foreground mt-1">Minimum 8 characters</p>
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{' '}
            <button
              type="button"
              onClick={() => setMode('login')}
              className="text-primary hover:underline"
            >
              Sign in
            </button>
          </p>
        </form>
      )}

      {/* Forgot Password Form */}
      {mode === 'forgot' && (
        <form onSubmit={handleForgotPassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input w-full"
              placeholder="you@example.com"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full"
          >
            {loading ? 'Sending...' : 'Send Reset Link'}
          </button>
          <p className="text-center text-sm">
            <button
              type="button"
              onClick={() => setMode('login')}
              className="text-primary hover:underline"
            >
              Back to sign in
            </button>
          </p>
        </form>
      )}

      {/* Continue without account */}
      <div className="mt-6 pt-6 border-t border-border">
        <p className="text-sm text-muted-foreground text-center">
          Continue using free features without an account. Sign in later to sync your data.
        </p>
      </div>
    </div>
  );
};

// Profile View Component
const ProfileView: React.FC<{
  user: UserProfile;
  onLogout: () => void;
  loading: boolean;
}> = ({ user, onLogout, loading }) => {
  const planColors = {
    free: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    pro: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    enterprise: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  };

  return (
    <div className="p-4">
      <div className="flex items-center gap-4 mb-6">
        <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
          <span className="text-primary text-2xl font-bold">
            {user.name?.[0]?.toUpperCase() || user.email[0].toUpperCase()}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-lg truncate">{user.name || 'User'}</h3>
          <p className="text-sm text-muted-foreground truncate">{user.email}</p>
          <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs font-medium ${planColors[user.plan]}`}>
            {user.plan.charAt(0).toUpperCase() + user.plan.slice(1)}
          </span>
        </div>
      </div>

      {/* Plan Info */}
      <div className="bg-card border border-border rounded-lg p-4 mb-4">
        <h4 className="font-medium mb-3">Your Plan</h4>
        <PlanLimitsDisplay limits={user.limits} customLimits={user.customLimits} />
      </div>

      {/* Trial Banner */}
      {user.trialEndsAt && user.trialEndsAt > Date.now() && (
        <div className="bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-lg p-3 mb-4">
          <p className="text-sm font-medium">Pro Trial Active</p>
          <p className="text-xs">
            {Math.ceil((user.trialEndsAt - Date.now()) / (24 * 60 * 60 * 1000))} days remaining
          </p>
        </div>
      )}

      {/* Upgrade Button */}
      {user.plan === 'free' && (
        <button className="w-full py-2 px-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-medium rounded-lg mb-4 hover:opacity-90 transition-opacity">
          Upgrade to Pro
        </button>
      )}

      {/* Account Actions */}
      <div className="space-y-2">
        <button className="w-full py-2 px-4 text-left text-sm text-muted-foreground hover:bg-muted rounded-lg transition-colors">
          Manage subscription
        </button>
        <button className="w-full py-2 px-4 text-left text-sm text-muted-foreground hover:bg-muted rounded-lg transition-colors">
          Account settings
        </button>
        <button
          onClick={onLogout}
          disabled={loading}
          className="w-full py-2 px-4 text-left text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
        >
          {loading ? 'Signing out...' : 'Sign out'}
        </button>
      </div>
    </div>
  );
};

// Plan Limits Display Component
const PlanLimitsDisplay: React.FC<{
  limits: UserProfile['limits'];
  customLimits?: Record<string, number>;
}> = ({ limits, customLimits }) => {
  const effectiveLimits = { ...limits, ...customLimits };

  const limitItems = [
    { key: 'cloudLlmRequests', label: 'Cloud LLM Requests', unit: '/month' },
    { key: 'voiceCommands', label: 'Voice Commands', unit: '/day' },
    { key: 'byokRequests', label: 'BYOK Requests', unit: '/month' },
    { key: 'savedWorkflows', label: 'Saved Workflows', unit: '' },
    { key: 'shadowTabs', label: 'Shadow Tabs', unit: '' },
    { key: 'memory', label: 'Memory Entries', unit: '' },
  ];

  return (
    <div className="grid grid-cols-2 gap-2 text-sm">
      {limitItems.map(({ key, label, unit }) => {
        const value = effectiveLimits[key as keyof typeof effectiveLimits];
        const isUnlimited = value === -1;
        const isCustom = customLimits && key in customLimits;

        return (
          <div key={key} className="flex justify-between">
            <span className="text-muted-foreground">{label}</span>
            <span className={isCustom ? 'text-purple-600 dark:text-purple-400' : ''}>
              {isUnlimited ? '∞' : value.toLocaleString()}
              {!isUnlimited && unit}
            </span>
          </div>
        );
      })}
    </div>
  );
};

export default AuthView;
