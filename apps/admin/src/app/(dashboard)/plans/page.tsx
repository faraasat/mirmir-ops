'use client';

import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi, type Plan } from '@/lib/api';

// Default plans if API is not connected
const DEFAULT_PLANS: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    billingCycle: 'monthly',
    features: [
      'WebLLM (Local AI)',
      '50 Cloud LLM requests/month',
      '20 Voice commands/day',
      '100 BYOK requests/month',
      '5 Saved workflows',
      'Basic memory (1000 entries)',
    ],
    limits: {
      cloudLlmRequests: 50,
      voiceCommands: 20,
      byokRequests: 100,
      savedWorkflows: 5,
      shadowTabs: 2,
      memory: 1000,
    },
    isActive: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 19.99,
    billingCycle: 'monthly',
    features: [
      'Everything in Free',
      '500 Cloud LLM requests/month',
      'Unlimited Voice commands',
      '1000 BYOK requests/month',
      '50 Saved workflows',
      'Advanced memory (10000 entries)',
      '10 Shadow tabs',
      'Priority support',
    ],
    limits: {
      cloudLlmRequests: 500,
      voiceCommands: -1,
      byokRequests: 1000,
      savedWorkflows: 50,
      shadowTabs: 10,
      memory: 10000,
    },
    isActive: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99.99,
    billingCycle: 'monthly',
    features: [
      'Everything in Pro',
      'Unlimited Cloud LLM requests',
      'Unlimited everything',
      'Custom limits',
      'Dedicated support',
      'Custom integrations',
      'SSO support',
    ],
    limits: {
      cloudLlmRequests: -1,
      voiceCommands: -1,
      byokRequests: -1,
      savedWorkflows: -1,
      shadowTabs: -1,
      memory: -1,
    },
    isActive: true,
  },
];

export default function PlansPage() {
  const queryClient = useQueryClient();
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [showLimitsEditor, setShowLimitsEditor] = useState(false);

  const { data: plans, isLoading, error } = useQuery({
    queryKey: ['plans'],
    queryFn: () => adminApi.getPlans(),
    retry: false,
  });

  const updatePlanMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Plan> }) =>
      adminApi.updatePlan(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['plans'] });
      setEditingPlan(null);
    },
  });

  const displayPlans = plans || DEFAULT_PLANS;

  return (
    <>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold">Subscription Plans</h2>
        <button
          onClick={() => setShowLimitsEditor(!showLimitsEditor)}
          className="px-4 py-2 text-sm font-medium text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50"
        >
          {showLimitsEditor ? 'Hide Limits' : 'Show Limits'}
        </button>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
          <p className="font-medium">API not connected</p>
          <p className="text-sm">Showing default plan configuration.</p>
        </div>
      )}

      {/* Plans Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {isLoading
          ? [...Array(3)].map((_, i) => (
              <div key={i} className="bg-white rounded-lg border border-gray-200 p-6 animate-pulse">
                <div className="h-6 bg-gray-200 rounded w-1/2 mb-4" />
                <div className="h-10 bg-gray-200 rounded w-3/4 mb-6" />
                <div className="space-y-2">
                  {[...Array(5)].map((_, j) => (
                    <div key={j} className="h-4 bg-gray-200 rounded" />
                  ))}
                </div>
              </div>
            ))
          : displayPlans.map((plan) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                showLimits={showLimitsEditor}
                onEdit={() => setEditingPlan(plan)}
              />
            ))}
      </div>

      {/* Limit Comparison Table */}
      {showLimitsEditor && (
        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="font-semibold">Limits Comparison</h3>
          </div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Feature
                </th>
                {displayPlans.map((plan) => (
                  <th
                    key={plan.id}
                    className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase"
                  >
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {[
                { key: 'cloudLlmRequests', label: 'Cloud LLM Requests' },
                { key: 'voiceCommands', label: 'Voice Commands/day' },
                { key: 'byokRequests', label: 'BYOK Requests' },
                { key: 'savedWorkflows', label: 'Saved Workflows' },
                { key: 'shadowTabs', label: 'Shadow Tabs' },
                { key: 'memory', label: 'Memory Entries' },
              ].map((item) => (
                <tr key={item.key}>
                  <td className="px-6 py-4 text-sm text-gray-900">{item.label}</td>
                  {displayPlans.map((plan) => (
                    <td key={plan.id} className="px-6 py-4 text-sm text-center">
                      {plan.limits[item.key] === -1 ? (
                        <span className="text-green-600 font-medium">Unlimited</span>
                      ) : (
                        <span>{plan.limits[item.key].toLocaleString()}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {editingPlan && (
        <PlanEditModal
          plan={editingPlan}
          onSave={(data) =>
            updatePlanMutation.mutate({ id: editingPlan.id, data })
          }
          onClose={() => setEditingPlan(null)}
          loading={updatePlanMutation.isPending}
        />
      )}
    </>
  );
}

function PlanCard({
  plan,
  showLimits,
  onEdit,
}: {
  plan: Plan;
  showLimits: boolean;
  onEdit: () => void;
}) {
  const isPro = plan.id === 'pro';
  const isEnterprise = plan.id === 'enterprise';

  return (
    <div
      className={`bg-white rounded-lg border-2 p-6 ${
        isPro
          ? 'border-primary-500 ring-2 ring-primary-100'
          : isEnterprise
          ? 'border-purple-500'
          : 'border-gray-200'
      }`}
    >
      {isPro && (
        <span className="inline-block px-3 py-1 text-xs font-medium text-white bg-primary-500 rounded-full mb-4">
          Most Popular
        </span>
      )}

      <h3 className="text-xl font-bold">{plan.name}</h3>
      <div className="mt-2 mb-6">
        <span className="text-3xl font-bold">
          ${plan.price.toFixed(2)}
        </span>
        <span className="text-gray-500">/{plan.billingCycle}</span>
      </div>

      <ul className="space-y-3 mb-6">
        {plan.features.map((feature, i) => (
          <li key={i} className="flex items-start gap-2 text-sm">
            <svg
              className={`w-5 h-5 flex-shrink-0 ${
                isPro ? 'text-primary-500' : isEnterprise ? 'text-purple-500' : 'text-green-500'
              }`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {showLimits && (
        <div className="pt-4 border-t border-gray-200 mb-4">
          <p className="text-xs font-medium text-gray-500 mb-2">LIMITS</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            {Object.entries(plan.limits).map(([key, value]) => (
              <div key={key} className="flex justify-between">
                <span className="text-gray-500 capitalize">{key.replace(/([A-Z])/g, ' $1')}</span>
                <span className="font-medium">{value === -1 ? '∞' : value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <button
        onClick={onEdit}
        className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
          isPro
            ? 'bg-primary-600 text-white hover:bg-primary-700'
            : isEnterprise
            ? 'bg-purple-600 text-white hover:bg-purple-700'
            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
        }`}
      >
        Edit Plan
      </button>
    </div>
  );
}

function PlanEditModal({
  plan,
  onSave,
  onClose,
  loading,
}: {
  plan: Plan;
  onSave: (data: Partial<Plan>) => void;
  onClose: () => void;
  loading?: boolean;
}) {
  const [formData, setFormData] = useState({
    price: plan.price,
    limits: { ...plan.limits },
    features: [...plan.features],
    isActive: plan.isActive,
  });
  const [newFeature, setNewFeature] = useState('');

  const handleLimitChange = (key: string, value: string) => {
    const numValue = value === '' ? 0 : parseInt(value, 10);
    setFormData({
      ...formData,
      limits: { ...formData.limits, [key]: numValue },
    });
  };

  const addFeature = () => {
    if (newFeature.trim()) {
      setFormData({
        ...formData,
        features: [...formData.features, newFeature.trim()],
      });
      setNewFeature('');
    }
  };

  const removeFeature = (index: number) => {
    setFormData({
      ...formData,
      features: formData.features.filter((_, i) => i !== index),
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 overflow-y-auto py-8">
      <div className="bg-white rounded-xl p-6 w-full max-w-2xl mx-4">
        <h3 className="text-lg font-semibold mb-4">Edit {plan.name} Plan</h3>

        <div className="space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Price */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price (USD)
            </label>
            <input
              type="number"
              step="0.01"
              value={formData.price}
              onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {/* Active Toggle */}
          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              id="isActive"
              checked={formData.isActive}
              onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300"
            />
            <label htmlFor="isActive" className="text-sm font-medium text-gray-700">
              Plan is active (visible to users)
            </label>
          </div>

          {/* Limits */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Limits (-1 for unlimited)
            </label>
            <div className="grid grid-cols-2 gap-4">
              {Object.entries(formData.limits).map(([key, value]) => (
                <div key={key}>
                  <label className="block text-xs text-gray-500 mb-1 capitalize">
                    {key.replace(/([A-Z])/g, ' $1')}
                  </label>
                  <input
                    type="number"
                    value={value}
                    onChange={(e) => handleLimitChange(key, e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Features */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Features</label>
            <div className="space-y-2 mb-3">
              {formData.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2">
                  <input
                    type="text"
                    value={feature}
                    onChange={(e) => {
                      const newFeatures = [...formData.features];
                      newFeatures[index] = e.target.value;
                      setFormData({ ...formData, features: newFeatures });
                    }}
                    className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg"
                  />
                  <button
                    onClick={() => removeFeature(index)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newFeature}
                onChange={(e) => setNewFeature(e.target.value)}
                placeholder="Add new feature..."
                className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg"
                onKeyDown={(e) => e.key === 'Enter' && addFeature()}
              />
              <button
                onClick={addFeature}
                className="px-4 py-2 text-sm font-medium text-primary-600 border border-primary-600 rounded-lg hover:bg-primary-50"
              >
                Add
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg"
          >
            Cancel
          </button>
          <button
            onClick={() => onSave(formData)}
            disabled={loading}
            className="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
