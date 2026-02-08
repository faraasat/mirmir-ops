import React, { useState, useEffect } from 'react';
import {
  getPrivacySettings,
  updatePrivacySettings,
  getTrackingConsent,
  setTrackingConsent,
  exportUserData,
  deleteUserData,
  resetPrivacySettings,
  type PrivacySettings,
  type PrivacyDataCategory,
} from '@/lib/security/privacy-manager';

export const PrivacySettingsView: React.FC = () => {
  const [settings, setSettings] = useState<PrivacySettings | null>(null);
  const [consent, setConsent] = useState<{ consented: boolean; consentedAt: number | null } | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<PrivacyDataCategory[] | null>(null);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setLoading(true);
    const [loadedSettings, loadedConsent] = await Promise.all([
      getPrivacySettings(),
      getTrackingConsent(),
    ]);
    setSettings(loadedSettings);
    setConsent(loadedConsent);
    setLoading(false);
  };

  const handleUpdate = async (updates: Partial<PrivacySettings>) => {
    if (!settings) return;
    const updated = await updatePrivacySettings(updates);
    setSettings(updated);
  };

  const handleConsentChange = async (consented: boolean) => {
    await setTrackingConsent(consented);
    setConsent({ consented, consentedAt: Date.now() });
    await loadSettings();
  };

  const handleExport = async (categories: PrivacyDataCategory[]) => {
    setExportLoading(true);
    try {
      const exportData = await exportUserData(categories);
      
      // Create download
      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mirmir-data-export-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    } finally {
      setExportLoading(false);
    }
  };

  const handleDelete = async (categories: PrivacyDataCategory[]) => {
    const result = await deleteUserData(categories);
    setDeleteConfirm(null);
    
    if (result.errors.length > 0) {
      console.error('Delete errors:', result.errors);
    }
    
    // Reload settings after deletion
    await loadSettings();
  };

  const handleReset = async () => {
    if (confirm('Reset all privacy settings to defaults?')) {
      await resetPrivacySettings();
      await loadSettings();
    }
  };

  if (loading || !settings || !consent) {
    return (
      <div className="flex justify-center py-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Consent Banner */}
      {!consent.consented && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
          <h3 className="font-medium text-blue-900 dark:text-blue-100 mb-2">
            Data Collection Consent
          </h3>
          <p className="text-sm text-blue-700 dark:text-blue-300 mb-3">
            We collect analytics and usage data to improve MirmirOps. This data is anonymized
            and never sold to third parties.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => handleConsentChange(true)}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700"
            >
              Accept
            </button>
            <button
              onClick={() => handleConsentChange(false)}
              className="px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-800 rounded-lg"
            >
              Decline
            </button>
          </div>
        </div>
      )}

      {/* Incognito Mode */}
      <SettingSection title="Privacy Mode">
        <ToggleSetting
          label="Incognito Mode"
          description="Disable all data collection and history tracking"
          value={settings.incognitoMode}
          onChange={(v) => handleUpdate({ incognitoMode: v })}
          danger
        />
      </SettingSection>

      {/* Data Collection */}
      <SettingSection title="Data Collection">
        <ToggleSetting
          label="Analytics"
          description="Help us improve by collecting anonymous usage statistics"
          value={settings.collectAnalytics}
          onChange={(v) => handleUpdate({ collectAnalytics: v })}
          disabled={settings.incognitoMode}
        />
        <ToggleSetting
          label="Usage Data"
          description="Track feature usage to personalize your experience"
          value={settings.collectUsageData}
          onChange={(v) => handleUpdate({ collectUsageData: v })}
          disabled={settings.incognitoMode}
        />
        <ToggleSetting
          label="Error Reports"
          description="Automatically send crash reports to help fix bugs"
          value={settings.collectErrorReports}
          onChange={(v) => handleUpdate({ collectErrorReports: v })}
          disabled={settings.incognitoMode}
        />
      </SettingSection>

      {/* Memory Settings */}
      <SettingSection title="Memory & History">
        <ToggleSetting
          label="Remember Form Data"
          description="Save form entries for auto-fill"
          value={settings.rememberFormData}
          onChange={(v) => handleUpdate({ rememberFormData: v })}
          disabled={settings.incognitoMode}
        />
        <ToggleSetting
          label="Remember Search History"
          description="Save your search queries"
          value={settings.rememberSearchHistory}
          onChange={(v) => handleUpdate({ rememberSearchHistory: v })}
          disabled={settings.incognitoMode}
        />
        <ToggleSetting
          label="Remember Browsing History"
          description="Track visited pages"
          value={settings.rememberBrowsingHistory}
          onChange={(v) => handleUpdate({ rememberBrowsingHistory: v })}
          disabled={settings.incognitoMode}
        />
      </SettingSection>

      {/* Data Retention */}
      <SettingSection title="Data Retention">
        <div className="space-y-3">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Keep data for
            </label>
            <select
              value={settings.retentionPeriod}
              onChange={(e) => handleUpdate({ retentionPeriod: e.target.value as PrivacySettings['retentionPeriod'] })}
              className="mt-1 block w-full px-3 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg text-sm"
            >
              <option value="week">1 Week</option>
              <option value="month">1 Month</option>
              <option value="quarter">3 Months</option>
              <option value="year">1 Year</option>
              <option value="forever">Forever</option>
            </select>
          </div>
          <ToggleSetting
            label="Auto-delete old history"
            description="Automatically remove history older than retention period"
            value={settings.autoDeleteHistory}
            onChange={(v) => handleUpdate({ autoDeleteHistory: v })}
          />
        </div>
      </SettingSection>

      {/* LLM Privacy */}
      <SettingSection title="AI Privacy">
        <ToggleSetting
          label="Send page content to LLM"
          description="Allow sending page content to AI models for analysis"
          value={settings.sendPageContentToLLM}
          onChange={(v) => handleUpdate({ sendPageContentToLLM: v })}
        />
        <ToggleSetting
          label="Prefer local models"
          description="Use local AI models when available for better privacy"
          value={settings.localLLMPreferred}
          onChange={(v) => handleUpdate({ localLLMPreferred: v })}
        />
        <ToggleSetting
          label="Anonymize prompts"
          description="Remove personal information before sending to AI"
          value={settings.anonymizePrompts}
          onChange={(v) => handleUpdate({ anonymizePrompts: v })}
        />
      </SettingSection>

      {/* Tracking Protection */}
      <SettingSection title="Tracking Protection">
        <ToggleSetting
          label="Block trackers"
          description="Block known tracking scripts on websites"
          value={settings.blockTrackers}
          onChange={(v) => handleUpdate({ blockTrackers: v })}
        />
        <ToggleSetting
          label="Strip tracking parameters"
          description="Remove tracking parameters from URLs"
          value={settings.stripQueryParams}
          onChange={(v) => handleUpdate({ stripQueryParams: v })}
        />
      </SettingSection>

      {/* Data Export/Delete */}
      <SettingSection title="Your Data">
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => handleExport(['all'])}
              disabled={exportLoading}
              className="px-4 py-2 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-800 disabled:opacity-50"
            >
              {exportLoading ? 'Exporting...' : 'Export All Data'}
            </button>
            <button
              onClick={() => setDeleteConfirm(['all'])}
              className="px-4 py-2 text-sm font-medium text-red-700 dark:text-red-300 bg-red-50 dark:bg-red-900/20 rounded-lg hover:bg-red-100 dark:hover:bg-red-800"
            >
              Delete All Data
            </button>
          </div>
          
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Export your data in JSON format or permanently delete all stored data.
          </p>
        </div>
      </SettingSection>

      {/* Delete specific categories */}
      <SettingSection title="Delete Specific Data">
        <div className="grid grid-cols-2 gap-2">
          {(['browsing_history', 'search_history', 'form_data', 'memory', 'analytics', 'workflows'] as PrivacyDataCategory[]).map((cat) => (
            <button
              key={cat}
              onClick={() => setDeleteConfirm([cat])}
              className="px-3 py-2 text-xs font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              Delete {cat.replace('_', ' ')}
            </button>
          ))}
        </div>
      </SettingSection>

      {/* Reset */}
      <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={handleReset}
          className="text-sm text-red-600 hover:text-red-700 dark:text-red-400"
        >
          Reset privacy settings to defaults
        </button>
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <DeleteConfirmModal
          categories={deleteConfirm}
          onConfirm={() => handleDelete(deleteConfirm)}
          onCancel={() => setDeleteConfirm(null)}
        />
      )}
    </div>
  );
};

// Setting Section Component
const SettingSection: React.FC<{ title: string; children: React.ReactNode }> = ({
  title,
  children,
}) => (
  <div>
    <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-3">{title}</h3>
    <div className="space-y-3">{children}</div>
  </div>
);

// Toggle Setting Component
const ToggleSetting: React.FC<{
  label: string;
  description: string;
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
  danger?: boolean;
}> = ({ label, description, value, onChange, disabled, danger }) => (
  <div className={`flex items-center justify-between ${disabled ? 'opacity-50' : ''}`}>
    <div className="flex-1 min-w-0 mr-4">
      <p className={`text-sm font-medium ${danger ? 'text-red-600 dark:text-red-400' : 'text-gray-700 dark:text-gray-300'}`}>
        {label}
      </p>
      <p className="text-xs text-gray-500 dark:text-gray-400">{description}</p>
    </div>
    <button
      onClick={() => !disabled && onChange(!value)}
      disabled={disabled}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        value
          ? danger
            ? 'bg-red-600'
            : 'bg-blue-600'
          : 'bg-gray-200 dark:bg-gray-700'
      } ${disabled ? 'cursor-not-allowed' : ''}`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          value ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  </div>
);

// Delete Confirmation Modal
const DeleteConfirmModal: React.FC<{
  categories: PrivacyDataCategory[];
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ categories, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 max-w-md mx-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
        Delete Data?
      </h3>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">
        This will permanently delete your{' '}
        {categories.includes('all')
          ? 'all data'
          : categories.map(c => c.replace('_', ' ')).join(', ')}
        . This action cannot be undone.
      </p>
      <div className="flex justify-end gap-2">
        <button
          onClick={onCancel}
          className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
        >
          Cancel
        </button>
        <button
          onClick={onConfirm}
          className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700"
        >
          Delete
        </button>
      </div>
    </div>
  </div>
);

export default PrivacySettingsView;
