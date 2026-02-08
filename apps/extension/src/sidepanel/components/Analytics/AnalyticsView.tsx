// Analytics Dashboard View
import { useState, useEffect } from 'react';
import { getAnalyticsSummary, getTodayAnalytics, type DailyAnalytics } from '@/lib/analytics';

interface AnalyticsSummary {
  totalLLMRequests: number;
  totalTokensUsed: number;
  totalCost: number;
  totalVoiceCommands: number;
  totalActions: number;
  totalWorkflows: number;
  totalErrors: number;
  avgLatencyMs: number;
  topActions: [string, number][];
  topDomains: [string, number][];
  topModels: [string, number][];
  dailyTrend: DailyAnalytics[];
}

export function AnalyticsView() {
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);
  const [today, setToday] = useState<DailyAnalytics | null>(null);
  const [period, setPeriod] = useState<7 | 14 | 30>(7);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadAnalytics();
  }, [period]);

  async function loadAnalytics() {
    setIsLoading(true);
    try {
      const [summaryData, todayData] = await Promise.all([
        getAnalyticsSummary(period),
        getTodayAnalytics(),
      ]);
      setSummary(summaryData);
      setToday(todayData);
    } catch (error) {
      console.error('Failed to load analytics:', error);
    } finally {
      setIsLoading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full overflow-y-auto p-4 space-y-6">
      {/* Period Selector */}
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Analytics</h2>
        <div className="flex gap-1">
          {[7, 14, 30].map((days) => (
            <button
              key={days}
              onClick={() => setPeriod(days as 7 | 14 | 30)}
              className={`px-3 py-1 text-xs rounded-md transition-colors ${
                period === days
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted hover:bg-muted/80'
              }`}
            >
              {days}D
            </button>
          ))}
        </div>
      </div>

      {/* Today's Stats */}
      {today && (
        <div className="space-y-2">
          <h3 className="text-sm font-medium text-muted-foreground">Today</h3>
          <div className="grid grid-cols-2 gap-2">
            <StatCard
              label="LLM Requests"
              value={today.llmRequests}
              icon="🤖"
            />
            <StatCard
              label="Voice Commands"
              value={today.voiceCommands}
              icon="🎤"
            />
            <StatCard
              label="Actions"
              value={today.actionsExecuted}
              icon="⚡"
            />
            <StatCard
              label="Errors"
              value={today.errorsCount}
              icon="❌"
              variant={today.errorsCount > 0 ? 'error' : 'default'}
            />
          </div>
        </div>
      )}

      {/* Summary Stats */}
      {summary && (
        <>
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              Last {period} Days
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <StatCard
                label="Total Requests"
                value={summary.totalLLMRequests}
                icon="📊"
              />
              <StatCard
                label="Tokens Used"
                value={formatNumber(summary.totalTokensUsed)}
                icon="🔤"
              />
              <StatCard
                label="Est. Cost"
                value={`$${summary.totalCost.toFixed(4)}`}
                icon="💰"
              />
              <StatCard
                label="Avg Latency"
                value={`${summary.avgLatencyMs.toFixed(0)}ms`}
                icon="⏱️"
              />
            </div>
          </div>

          {/* Token Usage Chart */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-muted-foreground">
              Daily Token Usage
            </h3>
            <div className="h-32 bg-muted/30 rounded-lg p-2">
              <TokenUsageChart data={summary.dailyTrend} />
            </div>
          </div>

          {/* Top Actions */}
          {summary.topActions.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Top Actions
              </h3>
              <div className="space-y-1">
                {summary.topActions.slice(0, 5).map(([action, count]) => (
                  <div
                    key={action}
                    className="flex items-center justify-between px-3 py-1.5 bg-muted/30 rounded-md"
                  >
                    <span className="text-sm">{formatActionName(action)}</span>
                    <span className="text-xs text-muted-foreground">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Top Domains */}
          {summary.topDomains.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Top Domains
              </h3>
              <div className="space-y-1">
                {summary.topDomains.slice(0, 5).map(([domain, count]) => (
                  <div
                    key={domain}
                    className="flex items-center justify-between px-3 py-1.5 bg-muted/30 rounded-md"
                  >
                    <span className="text-sm truncate max-w-[180px]">
                      {domain}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Model Usage */}
          {summary.topModels.length > 0 && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-muted-foreground">
                Models Used
              </h3>
              <div className="space-y-1">
                {summary.topModels.slice(0, 5).map(([model, count]) => (
                  <div
                    key={model}
                    className="flex items-center justify-between px-3 py-1.5 bg-muted/30 rounded-md"
                  >
                    <span className="text-sm truncate max-w-[180px]">
                      {model}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Summary Row */}
          <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-border">
            <div>
              <div className="text-lg font-semibold">
                {summary.totalWorkflows}
              </div>
              <div className="text-xs text-muted-foreground">Workflows</div>
            </div>
            <div>
              <div className="text-lg font-semibold">
                {summary.totalVoiceCommands}
              </div>
              <div className="text-xs text-muted-foreground">Voice Cmds</div>
            </div>
            <div>
              <div className="text-lg font-semibold text-destructive">
                {summary.totalErrors}
              </div>
              <div className="text-xs text-muted-foreground">Errors</div>
            </div>
          </div>
        </>
      )}

      {/* Empty State */}
      {!summary && !today && (
        <div className="flex flex-col items-center justify-center h-48 text-center">
          <span className="text-4xl mb-2">📈</span>
          <p className="text-muted-foreground">No analytics data yet</p>
          <p className="text-xs text-muted-foreground">
            Start using MirmirOps to see your stats
          </p>
        </div>
      )}
    </div>
  );
}

// Stat Card Component
function StatCard({
  label,
  value,
  icon,
  variant = 'default',
}: {
  label: string;
  value: string | number;
  icon: string;
  variant?: 'default' | 'error';
}) {
  return (
    <div
      className={`flex items-center gap-2 p-3 rounded-lg ${
        variant === 'error' && Number(value) > 0
          ? 'bg-destructive/10'
          : 'bg-muted/30'
      }`}
    >
      <span className="text-xl">{icon}</span>
      <div>
        <div className="text-lg font-semibold">{value}</div>
        <div className="text-xs text-muted-foreground">{label}</div>
      </div>
    </div>
  );
}

// Token Usage Chart Component (Simple bar chart)
function TokenUsageChart({ data }: { data: DailyAnalytics[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No data
      </div>
    );
  }

  const maxTokens = Math.max(...data.map((d) => d.llmTokensUsed), 1);

  return (
    <div className="flex items-end justify-between h-full gap-1">
      {data.map((day, index) => {
        const height = (day.llmTokensUsed / maxTokens) * 100;
        return (
          <div
            key={day.date}
            className="flex-1 flex flex-col items-center justify-end"
          >
            <div
              className="w-full bg-primary/60 rounded-t-sm transition-all"
              style={{ height: `${Math.max(height, 2)}%` }}
              title={`${day.date}: ${formatNumber(day.llmTokensUsed)} tokens`}
            />
            {index % 2 === 0 && (
              <span className="text-[9px] text-muted-foreground mt-1">
                {new Date(day.date).getDate()}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

// Helper functions
function formatNumber(num: number): string {
  if (num >= 1_000_000) {
    return `${(num / 1_000_000).toFixed(1)}M`;
  }
  if (num >= 1_000) {
    return `${(num / 1_000).toFixed(1)}K`;
  }
  return num.toString();
}

function formatActionName(action: string): string {
  return action
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}
