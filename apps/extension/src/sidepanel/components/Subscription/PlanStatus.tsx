import React, { useState, useEffect } from 'react';
import {
  getAuthState,
  subscribeToAuth,
  getEffectiveLimits,
  getTrialDaysRemaining,
  type AuthState,
} from '@/lib/auth';

interface UsageData {
  cloudLlmRequests: number;
  voiceCommands: number;
  byokRequests: number;
  savedWorkflows: number;
  shadowTabs: number;
  memory: number;
}

interface PlanStatusProps {
  usage?: Partial<UsageData>;
  compact?: boolean;
}

export const PlanStatus: React.FC<PlanStatusProps> = ({ usage = {}, compact = false }) => {
  const [authState, setAuthState] = useState<AuthState | null>(null);
  const [limits, setLimits] = useState<Record<string, number>>({});
  const [trialDays, setTrialDays] = useState<number | null>(null);

  useEffect(() => {
    // Load initial state
    const loadState = async () => {
      const state = await getAuthState();
      setAuthState(state);
      
      const effectiveLimits = await getEffectiveLimits();
      setLimits(effectiveLimits);
      
      const trial = await getTrialDaysRemaining();
      setTrialDays(trial);
    };
    
    loadState();

    // Subscribe to changes
    const unsubscribe = subscribeToAuth(async (state) => {
      setAuthState(state);
      const effectiveLimits = await getEffectiveLimits();
      setLimits(effectiveLimits);
    });
    
    return unsubscribe;
  }, []);

  const plan = authState?.user?.plan || 'free';

  const planColors = {
    free: 'border-gray-200 dark:border-gray-700',
    pro: 'border-blue-500',
    enterprise: 'border-purple-500',
  };

  const planBadgeColors = {
    free: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    pro: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    enterprise: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300',
  };

  if (compact) {
    return (
      <div className={`flex items-center gap-2 px-3 py-2 border rounded-lg ${planColors[plan]}`}>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${planBadgeColors[plan]}`}>
          {plan.charAt(0).toUpperCase() + plan.slice(1)}
        </span>
        {trialDays !== null && trialDays > 0 && (
          <span className="text-xs text-blue-600 dark:text-blue-400">
            {trialDays}d trial
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`border-2 rounded-xl p-4 ${planColors[plan]}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className={`inline-block px-3 py-1 rounded-full text-sm font-medium ${planBadgeColors[plan]}`}>
            {plan.charAt(0).toUpperCase() + plan.slice(1)} Plan
          </span>
          {trialDays !== null && trialDays > 0 && (
            <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">
              Trial: {trialDays} days left
            </span>
          )}
        </div>
        {plan === 'free' && (
          <button className="text-sm text-primary font-medium hover:underline">
            Upgrade
          </button>
        )}
      </div>

      {/* Usage Bars */}
      <div className="space-y-3">
        <UsageBar
          label="Cloud LLM"
          used={usage.cloudLlmRequests || 0}
          limit={limits.cloudLlmRequests || 50}
          unit="/month"
        />
        <UsageBar
          label="Voice"
          used={usage.voiceCommands || 0}
          limit={limits.voiceCommands || 20}
          unit="/day"
        />
        <UsageBar
          label="BYOK"
          used={usage.byokRequests || 0}
          limit={limits.byokRequests || 100}
          unit="/month"
        />
      </div>

      {/* Warning if approaching limit */}
      {Object.entries(usage).some(([key, value]) => {
        const limit = limits[key];
        return limit !== -1 && value && value / limit > 0.8;
      }) && (
        <div className="mt-4 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
          <p className="text-sm text-yellow-700 dark:text-yellow-300">
            You're approaching your usage limits.{' '}
            {plan === 'free' && (
              <button className="font-medium underline">Upgrade to Pro</button>
            )}
          </p>
        </div>
      )}
    </div>
  );
};

// Usage Bar Component
const UsageBar: React.FC<{
  label: string;
  used: number;
  limit: number;
  unit?: string;
}> = ({ label, used, limit, unit = '' }) => {
  const isUnlimited = limit === -1;
  const percentage = isUnlimited ? 0 : Math.min(100, (used / limit) * 100);
  const isNearLimit = !isUnlimited && percentage > 80;
  const isAtLimit = !isUnlimited && percentage >= 100;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span className={isAtLimit ? 'text-red-600 dark:text-red-400' : ''}>
          {used.toLocaleString()} / {isUnlimited ? '∞' : limit.toLocaleString()}{unit}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            isAtLimit
              ? 'bg-red-500'
              : isNearLimit
              ? 'bg-yellow-500'
              : 'bg-primary'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
};

// Limit Reached Banner Component
export const LimitReachedBanner: React.FC<{
  category: string;
  onUpgrade?: () => void;
  onDismiss?: () => void;
}> = ({ category, onUpgrade, onDismiss }) => {
  const categoryLabels: Record<string, string> = {
    cloudLlmRequests: 'Cloud LLM requests',
    voiceCommands: 'Voice commands',
    byokRequests: 'BYOK requests',
    savedWorkflows: 'Saved workflows',
    shadowTabs: 'Shadow tabs',
    memory: 'Memory entries',
  };

  return (
    <div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
      <div className="flex items-start gap-3">
        <div className="flex-shrink-0">
          <svg className="w-5 h-5 text-red-600 dark:text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        </div>
        <div className="flex-1">
          <h4 className="font-medium text-red-800 dark:text-red-200">
            {categoryLabels[category] || category} limit reached
          </h4>
          <p className="text-sm text-red-600 dark:text-red-300 mt-1">
            Upgrade your plan to continue using this feature.
          </p>
          <div className="flex gap-2 mt-3">
            {onUpgrade && (
              <button
                onClick={onUpgrade}
                className="px-3 py-1.5 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
              >
                Upgrade Now
              </button>
            )}
            {onDismiss && (
              <button
                onClick={onDismiss}
                className="px-3 py-1.5 text-sm font-medium text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/30 rounded-lg"
              >
                Dismiss
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// Usage Hook
export function useUsageLimits() {
  const [limits, setLimits] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const effectiveLimits = await getEffectiveLimits();
      setLimits(effectiveLimits);
      setLoading(false);
    };
    
    load();

    const unsubscribe = subscribeToAuth(async () => {
      const effectiveLimits = await getEffectiveLimits();
      setLimits(effectiveLimits);
    });
    
    return unsubscribe;
  }, []);

  const checkLimit = (category: string, currentUsage: number): boolean => {
    const limit = limits[category];
    if (limit === undefined || limit === -1) return true; // No limit or unlimited
    return currentUsage < limit;
  };

  const getUsagePercentage = (category: string, currentUsage: number): number => {
    const limit = limits[category];
    if (limit === undefined || limit === -1) return 0;
    return Math.min(100, (currentUsage / limit) * 100);
  };

  return { limits, loading, checkLimit, getUsagePercentage };
}

export default PlanStatus;
