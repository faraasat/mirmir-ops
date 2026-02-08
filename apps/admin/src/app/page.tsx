export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-white border-r border-gray-200 p-4">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-lg bg-primary-500 flex items-center justify-center">
            <span className="text-white font-bold text-lg">M</span>
          </div>
          <div>
            <h1 className="font-bold text-lg">MirmirOps</h1>
            <p className="text-xs text-gray-500">Admin Panel</p>
          </div>
        </div>

        <nav className="space-y-1">
          <a href="/" className="flex items-center gap-3 px-3 py-2 rounded-lg bg-primary-50 text-primary-700 font-medium">
            <DashboardIcon />
            Dashboard
          </a>
          <a href="/users" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100">
            <UsersIcon />
            Users
          </a>
          <a href="/plans" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100">
            <PlansIcon />
            Plans
          </a>
          <a href="/enterprise" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100">
            <EnterpriseIcon />
            Enterprise
          </a>
          <a href="/analytics" className="flex items-center gap-3 px-3 py-2 rounded-lg text-gray-700 hover:bg-gray-100">
            <AnalyticsIcon />
            Analytics
          </a>
        </nav>
      </aside>

      {/* Main Content */}
      <main className="ml-64 p-8">
        <h2 className="text-2xl font-bold mb-6">Dashboard</h2>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <StatCard title="Total Users" value="0" change="+0%" />
          <StatCard title="Pro Users" value="0" change="+0%" />
          <StatCard title="Enterprise" value="0" change="+0%" />
          <StatCard title="MRR" value="$0" change="+0%" />
        </div>

        {/* Recent Activity */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="font-semibold mb-4">Recent Activity</h3>
          <p className="text-gray-500 text-center py-8">
            No activity yet. Connect the admin panel to the API to see data.
          </p>
        </div>
      </main>
    </div>
  );
}

function StatCard({ title, value, change }: { title: string; value: string; change: string }) {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <p className="text-gray-500 text-sm">{title}</p>
      <p className="text-3xl font-bold mt-1">{value}</p>
      <p className="text-green-600 text-sm mt-2">{change}</p>
    </div>
  );
}

function DashboardIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
    </svg>
  );
}

function PlansIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
    </svg>
  );
}

function EnterpriseIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function AnalyticsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  );
}
