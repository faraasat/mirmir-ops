'use client';

import { useQuery } from '@tanstack/react-query';
import { adminApi, type DashboardStats, type RecentActivity } from '@/lib/api';

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: () => adminApi.getDashboardStats(),
    retry: false,
  });

  const { data: activity, isLoading: activityLoading } = useQuery({
    queryKey: ['recent-activity'],
    queryFn: () => adminApi.getRecentActivity(10),
    retry: false,
  });

  // Show fallback data if API is not connected
  const displayStats: DashboardStats = stats || {
    totalUsers: 0,
    proUsers: 0,
    enterpriseUsers: 0,
    mrr: 0,
    growth: {
      totalUsers: '+0%',
      proUsers: '+0%',
      enterpriseUsers: '+0%',
      mrr: '+0%',
    },
  };

  return (
    <>
      <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

      {/* API Connection Status */}
      {statsError && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-center gap-2 text-yellow-700">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="font-medium">API not connected</span>
          </div>
          <p className="mt-1 text-sm text-yellow-600">
            Start the API server to see real data. Run: <code className="bg-yellow-100 px-1 rounded">yarn workspace @mirmir/api dev</code>
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <StatCard 
          title="Total Users" 
          value={displayStats.totalUsers.toLocaleString()} 
          change={displayStats.growth.totalUsers}
          loading={statsLoading}
        />
        <StatCard 
          title="Pro Users" 
          value={displayStats.proUsers.toLocaleString()} 
          change={displayStats.growth.proUsers}
          loading={statsLoading}
        />
        <StatCard 
          title="Enterprise" 
          value={displayStats.enterpriseUsers.toLocaleString()} 
          change={displayStats.growth.enterpriseUsers}
          loading={statsLoading}
        />
        <StatCard 
          title="MRR" 
          value={`$${displayStats.mrr.toLocaleString()}`} 
          change={displayStats.growth.mrr}
          loading={statsLoading}
        />
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="font-semibold mb-4">Recent Activity</h3>
        
        {activityLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/2 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/3" />
                </div>
              </div>
            ))}
          </div>
        ) : activity && activity.length > 0 ? (
          <div className="space-y-3">
            {activity.map((item) => (
              <ActivityItem key={item.id} activity={item} />
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">
            No activity yet. Connect the admin panel to the API to see data.
          </p>
        )}
      </div>
    </>
  );
}

function StatCard({ 
  title, 
  value, 
  change, 
  loading 
}: { 
  title: string; 
  value: string; 
  change: string;
  loading?: boolean;
}) {
  const isPositive = change.startsWith('+') && change !== '+0%';
  const isNegative = change.startsWith('-');

  if (loading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/2 mb-3" />
        <div className="h-8 bg-gray-200 rounded w-2/3 mb-2" />
        <div className="h-3 bg-gray-200 rounded w-1/4" />
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <p className="text-gray-500 text-sm">{title}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      <p className={`text-sm mt-2 ${
        isPositive ? 'text-green-600' : isNegative ? 'text-red-600' : 'text-gray-500'
      }`}>
        {change}
      </p>
    </div>
  );
}

function ActivityItem({ activity }: { activity: RecentActivity }) {
  const getIcon = () => {
    switch (activity.type) {
      case 'signup':
        return (
          <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
          </div>
        );
      case 'upgrade':
        return (
          <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            </svg>
          </div>
        );
      case 'payment':
        return (
          <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
            </svg>
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
            <svg className="w-5 h-5 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        );
    }
  };

  return (
    <div className="flex items-center gap-4 py-2">
      {getIcon()}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-900">{activity.description}</p>
        <p className="text-xs text-gray-500">{activity.userEmail}</p>
      </div>
      <p className="text-xs text-gray-500">
        {new Date(activity.timestamp).toLocaleString()}
      </p>
    </div>
  );
}
