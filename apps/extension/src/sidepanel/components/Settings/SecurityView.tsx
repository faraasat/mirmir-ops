import React, { useState, useEffect } from 'react';
import {
  performSecurityCheck,
  getCSPViolations,
  clearCSPViolations,
  type SecurityCheckResult,
  type CSPViolation,
} from '@/lib/security/csp-manager';
import {
  listSecureItems,
  deleteSecure,
  getSecureStorageStats,
  clearSecureStorage,
} from '@/lib/security/secure-storage';
import { exportMasterKey, importMasterKey } from '@/lib/security/crypto-manager';

export const SecurityView: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'check' | 'vault' | 'violations'>('check');
  const [securityCheck, setSecurityCheck] = useState<SecurityCheckResult | null>(null);
  const [violations, setViolations] = useState<CSPViolation[]>([]);
  const [vaultItems, setVaultItems] = useState<Array<{ id: string; category: string; label: string; createdAt: number }>>([]);
  const [vaultStats, setVaultStats] = useState<{ totalItems: number } | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadData();
  }, [activeTab]);

  const loadData = async () => {
    setLoading(true);
    
    if (activeTab === 'check') {
      const result = performSecurityCheck();
      setSecurityCheck(result);
    } else if (activeTab === 'vault') {
      const [items, stats] = await Promise.all([
        listSecureItems(),
        getSecureStorageStats(),
      ]);
      setVaultItems(items);
      setVaultStats(stats);
    } else if (activeTab === 'violations') {
      setViolations(getCSPViolations());
    }
    
    setLoading(false);
  };

  const handleDeleteVaultItem = async (id: string) => {
    if (confirm('Delete this secure item?')) {
      await deleteSecure(id);
      await loadData();
    }
  };

  const handleClearVault = async () => {
    if (confirm('Delete ALL secure items? This cannot be undone.')) {
      await clearSecureStorage();
      await loadData();
    }
  };

  const handleClearViolations = () => {
    clearCSPViolations();
    setViolations([]);
  };

  const handleExportKey = async () => {
    try {
      const key = await exportMasterKey();
      const blob = new Blob([key], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `mirmir-encryption-key-${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to export key:', error);
      alert('Failed to export encryption key');
    }
  };

  const handleImportKey = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      
      const text = await file.text();
      try {
        await importMasterKey(text.trim());
        alert('Encryption key imported successfully');
        await loadData();
      } catch (error) {
        console.error('Failed to import key:', error);
        alert('Failed to import encryption key');
      }
    };
    input.click();
  };

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex border-b border-gray-200 dark:border-gray-700">
        {(['check', 'vault', 'violations'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-sm font-medium border-b-2 -mb-px ${
              activeTab === tab
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === 'check' && 'Security Check'}
            {tab === 'vault' && 'Secure Vault'}
            {tab === 'violations' && 'CSP Violations'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </div>
      ) : (
        <>
          {/* Security Check Tab */}
          {activeTab === 'check' && securityCheck && (
            <div className="space-y-4">
              {/* Score */}
              <div className={`p-4 rounded-lg ${
                securityCheck.score >= 80
                  ? 'bg-green-50 dark:bg-green-900/20'
                  : securityCheck.score >= 60
                  ? 'bg-yellow-50 dark:bg-yellow-900/20'
                  : 'bg-red-50 dark:bg-red-900/20'
              }`}>
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Security Score</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {securityCheck.passed ? 'All critical checks passed' : 'Some checks failed'}
                    </p>
                  </div>
                  <div className={`text-3xl font-bold ${
                    securityCheck.score >= 80
                      ? 'text-green-600'
                      : securityCheck.score >= 60
                      ? 'text-yellow-600'
                      : 'text-red-600'
                  }`}>
                    {securityCheck.score}%
                  </div>
                </div>
              </div>

              {/* Individual Checks */}
              <div className="space-y-2">
                {securityCheck.checks.map((check, index) => (
                  <div
                    key={index}
                    className={`p-3 rounded-lg border ${
                      check.passed
                        ? 'border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/10'
                        : 'border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {check.passed ? (
                          <CheckIcon className="w-5 h-5 text-green-600" />
                        ) : (
                          <XIcon className="w-5 h-5 text-red-600" />
                        )}
                        <span className="font-medium">{check.name}</span>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded ${
                        check.severity === 'critical'
                          ? 'bg-red-200 text-red-800'
                          : check.severity === 'high'
                          ? 'bg-orange-200 text-orange-800'
                          : check.severity === 'medium'
                          ? 'bg-yellow-200 text-yellow-800'
                          : 'bg-gray-200 text-gray-800'
                      }`}>
                        {check.severity}
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                      {check.message}
                    </p>
                  </div>
                ))}
              </div>

              <button
                onClick={loadData}
                className="w-full py-2 text-sm font-medium text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg"
              >
                Re-run Security Check
              </button>
            </div>
          )}

          {/* Secure Vault Tab */}
          {activeTab === 'vault' && (
            <div className="space-y-4">
              {/* Stats */}
              <div className="p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Secure Storage</h3>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      {vaultStats?.totalItems || 0} encrypted items
                    </p>
                  </div>
                  <VaultIcon className="w-8 h-8 text-gray-400" />
                </div>
              </div>

              {/* Items */}
              {vaultItems.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No secure items stored
                </div>
              ) : (
                <div className="space-y-2">
                  {vaultItems.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 border border-gray-200 dark:border-gray-700 rounded-lg"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">{item.label}</p>
                          <p className="text-xs text-gray-500">
                            {item.category} • {new Date(item.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleDeleteVaultItem(item.id)}
                          className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div className="space-y-2 pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex gap-2">
                  <button
                    onClick={handleExportKey}
                    className="flex-1 py-2 text-sm font-medium text-blue-600 bg-blue-50 dark:bg-blue-900/20 rounded-lg hover:bg-blue-100"
                  >
                    Export Key
                  </button>
                  <button
                    onClick={handleImportKey}
                    className="flex-1 py-2 text-sm font-medium text-gray-600 bg-gray-50 dark:bg-gray-800 rounded-lg hover:bg-gray-100"
                  >
                    Import Key
                  </button>
                </div>
                {vaultItems.length > 0 && (
                  <button
                    onClick={handleClearVault}
                    className="w-full py-2 text-sm font-medium text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg"
                  >
                    Clear All Secure Items
                  </button>
                )}
              </div>
            </div>
          )}

          {/* CSP Violations Tab */}
          {activeTab === 'violations' && (
            <div className="space-y-4">
              {violations.length === 0 ? (
                <div className="text-center py-8">
                  <ShieldIcon className="w-12 h-12 mx-auto text-green-500 mb-2" />
                  <p className="text-gray-600 dark:text-gray-400">No CSP violations detected</p>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-600">
                      {violations.length} violation(s) recorded
                    </p>
                    <button
                      onClick={handleClearViolations}
                      className="text-sm text-red-600 hover:underline"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="space-y-2 max-h-96 overflow-y-auto">
                    {violations.map((violation) => (
                      <div
                        key={violation.id}
                        className="p-3 border border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/10 rounded-lg"
                      >
                        <p className="font-mono text-sm text-red-800 dark:text-red-200">
                          {violation.violatedDirective}
                        </p>
                        <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                          Blocked: {violation.blockedUri}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(violation.timestamp).toLocaleString()}
                        </p>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

// Icons
const CheckIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const XIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

const VaultIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
  </svg>
);

const TrashIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const ShieldIcon: React.FC<{ className?: string }> = ({ className }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
  </svg>
);

export default SecurityView;
