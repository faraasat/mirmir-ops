'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type User } from '@/lib/api';

export default function EnterprisePage() {
  const queryClient = useQueryClient();
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);

  const { data: customers, isLoading, error } = useQuery({
    queryKey: ['enterprise-customers'],
    queryFn: () => adminApi.getEnterpriseCustomers(),
    retry: false,
  });

  const setLimitsMutation = useMutation({
    mutationFn: ({ userId, limits }: { userId: string; limits: Record<string, number> }) =>
      adminApi.setCustomLimits(userId, limits),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['enterprise-customers'] });
      setSelectedCustomer(null);
    },
  });

  const inviteMutation = useMutation({
    mutationFn: ({ email, customLimits }: { email: string; customLimits?: Record<string, number> }) =>
      adminApi.createEnterpriseInvite(email, customLimits),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['enterprise-customers'] });
      setShowInviteModal(false);
      alert(`Invite created! Code: ${data.inviteCode}`);
    },
  });

  const displayCustomers = customers || [];

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold">Enterprise Management</h2>
          <p className="text-gray-500">Manage enterprise customers and custom limits</p>
        </div>
        <button
          onClick={() => setShowInviteModal(true)}
          className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-lg hover:bg-purple-700"
        >
          + Invite Customer
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
          <p className="font-medium">API not connected</p>
          <p className="text-sm">Connect to the API to manage enterprise customers.</p>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <StatCard
          title="Enterprise Customers"
          value={displayCustomers.length.toString()}
          icon={<BuildingIcon />}
          color="purple"
        />
        <StatCard
          title="Total MRR"
          value={`$${(displayCustomers.length * 99.99).toFixed(2)}`}
          icon={<DollarIcon />}
          color="green"
        />
        <StatCard
          title="Custom Limits"
          value={displayCustomers.filter(c => c.customLimits).length.toString()}
          icon={<SettingsIcon />}
          color="blue"
        />
        <StatCard
          title="Active This Month"
          value={displayCustomers.length.toString()}
          icon={<ActivityIcon />}
          color="orange"
        />
      </div>

      {/* Customers Table */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="font-semibold">Enterprise Customers</h3>
        </div>

        {isLoading ? (
          <div className="p-6">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse flex items-center gap-4 py-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : displayCustomers.length > 0 ? (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Usage
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Custom Limits
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Since
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {displayCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                        <span className="text-purple-700 font-medium">
                          {customer.name?.[0]?.toUpperCase() || customer.email[0].toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{customer.name || 'No name'}</p>
                        <p className="text-sm text-gray-500">{customer.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm">
                      <p>LLM: {customer.usage?.cloudLlmRequests || 0}</p>
                      <p>Workflows: {customer.usage?.savedWorkflows || 0}</p>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {customer.customLimits ? (
                      <span className="inline-flex px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded">
                        Custom
                      </span>
                    ) : (
                      <span className="text-gray-500 text-sm">Default</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-500">
                    {new Date(customer.createdAt).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <button
                      onClick={() => setSelectedCustomer(customer)}
                      className="text-purple-600 hover:text-purple-800 font-medium text-sm"
                    >
                      Configure
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <div className="p-12 text-center text-gray-500">
            <BuildingIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <p className="font-medium">No enterprise customers yet</p>
            <p className="text-sm">Invite your first enterprise customer to get started.</p>
          </div>
        )}
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <InviteModal
          onInvite={(email, limits) => inviteMutation.mutate({ email, customLimits: limits })}
          onClose={() => setShowInviteModal(false)}
          loading={inviteMutation.isPending}
        />
      )}

      {/* Configure Limits Modal */}
      {selectedCustomer && (
        <ConfigureLimitsModal
          customer={selectedCustomer}
          onSave={(limits) =>
            setLimitsMutation.mutate({ userId: selectedCustomer.id, limits })
          }
          onClose={() => setSelectedCustomer(null)}
          loading={setLimitsMutation.isPending}
        />
      )}
    </>
  );
}

function StatCard({
  title,
  value,
  icon,
  color,
}: {
  title: string;
  value: string;
  icon: React.ReactNode;
  color: 'purple' | 'green' | 'blue' | 'orange';
}) {
  const colors = {
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    blue: 'bg-blue-50 text-blue-600',
    orange: 'bg-orange-50 text-orange-600',
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}>
          {icon}
        </div>
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-gray-500">{title}</p>
        </div>
      </div>
    </div>
  );
}

function InviteModal({
  onInvite,
  onClose,
  loading,
}: {
  onInvite: (email: string, limits?: Record<string, number>) => void;
  onClose: () => void;
  loading?: boolean;
}) {
  const [email, setEmail] = useState('');
  const [useCustomLimits, setUseCustomLimits] = useState(false);
  const [limits, setLimits] = useState({
    cloudLlmRequests: -1,
    voiceCommands: -1,
    byokRequests: -1,
    savedWorkflows: -1,
    shadowTabs: -1,
    memory: -1,
  });

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-4">Invite Enterprise Customer</h3>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@company.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="customLimits"
              checked={useCustomLimits}
              onChange={(e) => setUseCustomLimits(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300"
            />
            <label htmlFor="customLimits" className="text-sm text-gray-700">
              Set custom limits
            </label>
          </div>

          {useCustomLimits && (
            <div className="grid grid-cols-2 gap-3 p-4 bg-gray-50 rounded-lg">
              {Object.entries(limits).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1 capitalize">
                    {key.replace(/([A-Z])/g, ' $1')}
                  </label>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) =>
                      setLimits({ ...limits, [key]: parseInt(e.target.value, 10) || -1 })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                </div>
              ))}
              <p className="col-span-2 text-xs text-gray-500">-1 = unlimited</p>
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={() => onInvite(email, useCustomLimits ? limits : undefined)}
            disabled={!email || loading}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Send Invite'}
          </button>
        </div>
      </div>
    </div>
  );
}

function ConfigureLimitsModal({
  customer,
  onSave,
  onClose,
  loading,
}: {
  customer: User;
  onSave: (limits: Record<string, number>) => void;
  onClose: () => void;
  loading?: boolean;
}) {
  const [limits, setLimits] = useState(
    customer.customLimits || {
      cloudLlmRequests: -1,
      voiceCommands: -1,
      byokRequests: -1,
      savedWorkflows: -1,
      shadowTabs: -1,
      memory: -1,
    }
  );

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
        <h3 className="text-lg font-semibold mb-2">Configure Limits</h3>
        <p className="text-sm text-gray-500 mb-4">{customer.email}</p>

        <div className="grid grid-cols-2 gap-3">
          {Object.entries(limits).map(([key, value]) => (
            <div key={key}>
              <label className="block text-xs text-gray-500 mb-1 capitalize">
                {key.replace(/([A-Z])/g, ' $1')}
              </label>
              <input
                type="number"
                value={value}
                onChange={(e) =>
                  setLimits({ ...limits, [key]: parseInt(e.target.value, 10) || -1 })
                }
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg"
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-500 mt-2">-1 = unlimited</p>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(limits)}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-purple-600 hover:bg-purple-700 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Limits'}
          </button>
        </div>
      </div>
    </div>
  );
}

// Icons
function BuildingIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
    </svg>
  );
}

function DollarIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function ActivityIcon() {
  return (
    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  );
}
