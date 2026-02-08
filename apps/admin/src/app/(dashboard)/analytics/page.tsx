'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi } from '@/lib/api';

type TimeRange = '7d' | '30d' | '90d' | '1y';
type GroupBy = 'day' | 'week' | 'month';

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('30d');
  const [groupBy, setGroupBy] = useState<GroupBy>('day');

  const getDateRange = () => {
    const end = new Date();
    const start = new Date();
    switch (timeRange) {
      case '7d':
        start.setDate(start.getDate() - 7);
        break;
      case '30d':
        start.setDate(start.getDate() - 30);
        break;
      case '90d':
        start.setDate(start.getDate() - 90);
        break;
      case '1y':
        start.setFullYear(start.getFullYear() - 1);
        break;
    }
    return {
      startDate: start.toISOString().split('T')[0],
      endDate: end.toISOString().split('T')[0],
    };
  };

  const { startDate, endDate } = getDateRange();

  const { data: usageData, isLoading: usageLoading, error: usageError } = useQuery({
    queryKey: ['usage-analytics', startDate, endDate, groupBy],
    queryFn: () => adminApi.getUsageAnalytics({ startDate, endDate, groupBy }),
    retry: false,
  });

  const { data: revenueData, isLoading: revenueLoading, error: revenueError } = useQuery({
    queryKey: ['revenue-analytics', startDate, endDate, groupBy],
    queryFn: () => adminApi.getRevenueAnalytics({ startDate, endDate, groupBy }),
    retry: false,
  });

  const hasError = usageError || revenueError;

  // Generate mock data for display when API is not connected
  const mockData = generateMockData(timeRange, groupBy);
  const displayUsage = usageData || mockData.usage;
  const displayRevenue = revenueData || mockData.revenue;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Analytics</h2>
        <div className="flex gap-4">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
            <option value="1y">Last year</option>
          </select>
          <select
            value={groupBy}
            onChange={(e) => setGroupBy(e.target.value as GroupBy)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="day">Daily</option>
            <option value="week">Weekly</option>
            <option value="month">Monthly</option>
          </select>
        </div>
      </div>

      {hasError && (
        <div className="mb-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-yellow-700 dark:text-yellow-400">
          <p className="font-medium">API not connected</p>
          <p className="text-sm">Showing sample data for demonstration.</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <SummaryCard
          title="Total LLM Requests"
          value={displayUsage.llmRequests.reduce((sum, d) => sum + d.count, 0).toLocaleString()}
          change="+12%"
          loading={usageLoading}
        />
        <SummaryCard
          title="Voice Commands"
          value={displayUsage.voiceCommands.reduce((sum, d) => sum + d.count, 0).toLocaleString()}
          change="+8%"
          loading={usageLoading}
        />
        <SummaryCard
          title="Active Users"
          value={Math.max(...displayUsage.activeUsers.map((d) => d.count)).toLocaleString()}
          change="+5%"
          loading={usageLoading}
        />
        <SummaryCard
          title="Revenue"
          value={`$${displayRevenue.revenue.reduce((sum, d) => sum + d.amount, 0).toLocaleString()}`}
          change="+15%"
          loading={revenueLoading}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
        <ChartCard
          title="LLM Requests"
          data={displayUsage.llmRequests}
          loading={usageLoading}
          color="blue"
        />
        <ChartCard
          title="Voice Commands"
          data={displayUsage.voiceCommands}
          loading={usageLoading}
          color="purple"
        />
        <ChartCard
          title="Active Users"
          data={displayUsage.activeUsers}
          loading={usageLoading}
          color="green"
        />
        <ChartCard
          title="Workflows Executed"
          data={displayUsage.workflows}
          loading={usageLoading}
          color="orange"
        />
      </div>

      {/* Revenue Chart */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6 mb-8">
        <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">Revenue Over Time</h3>
        {revenueLoading ? (
          <div className="h-64 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" />
        ) : (
          <BarChart data={displayRevenue.revenue} color="green" prefix="$" />
        )}
      </div>

      {/* Subscription Changes */}
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">Subscription Changes</h3>
        {revenueLoading ? (
          <div className="h-64 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" />
        ) : (
          <SubscriptionChart data={displayRevenue.subscriptions} />
        )}
      </div>
    </>
  );
}

function SummaryCard({
  title,
  value,
  change,
  loading,
}: {
  title: string;
  value: string;
  change: string;
  loading?: boolean;
}) {
  const isPositive = change.startsWith('+');

  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4 animate-pulse">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-2" />
        <div className="h-8 bg-gray-200 dark:bg-gray-700 rounded w-3/4 mb-2" />
        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-4">
      <p className="text-sm text-gray-500 dark:text-gray-400">{title}</p>
      <p className="text-2xl font-bold mt-1 text-gray-900 dark:text-white">{value}</p>
      <p className={`text-sm mt-1 ${isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
        {change} vs previous period
      </p>
    </div>
  );
}

function ChartCard({
  title,
  data,
  loading,
  color,
}: {
  title: string;
  data: { date: string; count: number }[];
  loading?: boolean;
  color: 'blue' | 'purple' | 'green' | 'orange';
}) {
  if (loading) {
    return (
      <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
        <div className="h-48 bg-gray-100 dark:bg-gray-800 animate-pulse rounded" />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-800 p-6">
      <h3 className="font-semibold mb-4 text-gray-900 dark:text-white">{title}</h3>
      <LineChart data={data} color={color} />
    </div>
  );
}

function LineChart({
  data,
  color,
}: {
  data: { date: string; count: number }[];
  color: 'blue' | 'purple' | 'green' | 'orange';
}) {
  const colors = {
    blue: 'stroke-blue-500 fill-blue-500',
    purple: 'stroke-purple-500 fill-purple-500',
    green: 'stroke-green-500 fill-green-500',
    orange: 'stroke-orange-500 fill-orange-500',
  };

  const bgColors = {
    blue: 'fill-blue-100 dark:fill-blue-900/30',
    purple: 'fill-purple-100 dark:fill-purple-900/30',
    green: 'fill-green-100 dark:fill-green-900/30',
    orange: 'fill-orange-100 dark:fill-orange-900/30',
  };

  const maxValue = Math.max(...data.map((d) => d.count), 1);
  const height = 180;
  const width = 100;

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * width;
      const y = height - (d.count / maxValue) * height;
      return `${x},${y}`;
    })
    .join(' ');

  const areaPoints = `0,${height} ${points} ${width},${height}`;

  return (
    <div className="relative h-48">
      <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full" preserveAspectRatio="none">
        <polygon points={areaPoints} className={`${bgColors[color]} opacity-30`} />
        <polyline
          points={points}
          fill="none"
          className={colors[color]}
          strokeWidth="2"
          vectorEffect="non-scaling-stroke"
        />
        {data.map((d, i) => {
          const x = (i / (data.length - 1)) * width;
          const y = height - (d.count / maxValue) * height;
          return (
            <circle
              key={i}
              cx={x}
              cy={y}
              r="3"
              className={colors[color]}
              vectorEffect="non-scaling-stroke"
            />
          );
        })}
      </svg>
      <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-2">
        <span>{data[0]?.date.split('-').slice(1).join('/')}</span>
        <span>{data[data.length - 1]?.date.split('-').slice(1).join('/')}</span>
      </div>
    </div>
  );
}

function BarChart({
  data,
  color,
  prefix = '',
}: {
  data: { date: string; amount: number }[];
  color: 'blue' | 'purple' | 'green' | 'orange';
  prefix?: string;
}) {
  const colors = {
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    green: 'bg-green-500',
    orange: 'bg-orange-500',
  };

  const maxValue = Math.max(...data.map((d) => d.amount), 1);

  return (
    <div className="flex items-end gap-1 h-48">
      {data.map((d, i) => (
        <div
          key={i}
          className="flex-1 flex flex-col items-center gap-1"
          title={`${d.date}: ${prefix}${d.amount.toLocaleString()}`}
        >
          <div
            className={`w-full rounded-t ${colors[color]}`}
            style={{ height: `${(d.amount / maxValue) * 100}%` }}
          />
          {data.length <= 12 && (
            <span className="text-xs text-gray-500 dark:text-gray-400">{d.date.split('-').slice(1).join('/')}</span>
          )}
        </div>
      ))}
    </div>
  );
}

function SubscriptionChart({ data }: { data: { date: string; new: number; churned: number }[] }) {
  const maxValue = Math.max(...data.flatMap((d) => [d.new, d.churned]), 1);

  return (
    <div className="space-y-4">
      <div className="flex gap-4 text-sm text-gray-700 dark:text-gray-300">
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-green-500" />
          <span>New subscriptions</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 rounded bg-red-500" />
          <span>Churned</span>
        </div>
      </div>
      <div className="flex items-end gap-2 h-48">
        {data.map((d, i) => (
          <div key={i} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full flex gap-1 items-end h-full">
              <div
                className="flex-1 bg-green-500 rounded-t"
                style={{ height: `${(d.new / maxValue) * 100}%` }}
              />
              <div
                className="flex-1 bg-red-500 rounded-t"
                style={{ height: `${(d.churned / maxValue) * 100}%` }}
              />
            </div>
            {data.length <= 12 && (
              <span className="text-xs text-gray-500 dark:text-gray-400">{d.date.split('-').slice(1).join('/')}</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function generateMockData(timeRange: TimeRange, groupBy: GroupBy) {
  const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : timeRange === '90d' ? 90 : 365;
  const points =
    groupBy === 'day' ? Math.min(days, 30) : groupBy === 'week' ? Math.ceil(days / 7) : Math.ceil(days / 30);

  const generateTimeSeries = (
    baseValue: number,
    variance: number,
    trend: number = 0
  ): { date: string; count: number }[] => {
    return Array.from({ length: points }, (_, i) => {
      const date = new Date();
      if (groupBy === 'day') date.setDate(date.getDate() - (points - i - 1));
      else if (groupBy === 'week') date.setDate(date.getDate() - (points - i - 1) * 7);
      else date.setMonth(date.getMonth() - (points - i - 1));

      return {
        date: date.toISOString().split('T')[0],
        count: Math.max(0, Math.round(baseValue + Math.random() * variance * 2 - variance + trend * i)),
      };
    });
  };

  const generateRevenueSeries = (): { date: string; amount: number }[] => {
    return Array.from({ length: points }, (_, i) => {
      const date = new Date();
      if (groupBy === 'day') date.setDate(date.getDate() - (points - i - 1));
      else if (groupBy === 'week') date.setDate(date.getDate() - (points - i - 1) * 7);
      else date.setMonth(date.getMonth() - (points - i - 1));

      return {
        date: date.toISOString().split('T')[0],
        amount: Math.round(1000 + Math.random() * 500 + i * 20),
      };
    });
  };

  const generateSubscriptionSeries = (): { date: string; new: number; churned: number }[] => {
    return Array.from({ length: points }, (_, i) => {
      const date = new Date();
      if (groupBy === 'day') date.setDate(date.getDate() - (points - i - 1));
      else if (groupBy === 'week') date.setDate(date.getDate() - (points - i - 1) * 7);
      else date.setMonth(date.getMonth() - (points - i - 1));

      return {
        date: date.toISOString().split('T')[0],
        new: Math.round(5 + Math.random() * 10),
        churned: Math.round(Math.random() * 3),
      };
    });
  };

  return {
    usage: {
      llmRequests: generateTimeSeries(500, 200, 10),
      voiceCommands: generateTimeSeries(200, 100, 5),
      workflows: generateTimeSeries(50, 30, 2),
      activeUsers: generateTimeSeries(100, 40, 3),
    },
    revenue: {
      revenue: generateRevenueSeries(),
      subscriptions: generateSubscriptionSeries(),
    },
  };
}
