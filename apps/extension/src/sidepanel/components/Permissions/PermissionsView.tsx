// Permissions Management View
import { useState, useEffect } from 'react';
import {
  getDomainRules,
  getStoredPermissions,
  getAuditLog,
  addDomainRule,
  removeDomainRule,
  revokePermission,
  clearAuditLog,
  type DomainRule,
  type PermissionAuditEntry,
} from '@/lib/permissions';
import type { Permission, PermissionTier } from '@/shared/types';

type TabType = 'rules' | 'permissions' | 'audit';

export function PermissionsView() {
  const [activeTab, setActiveTab] = useState<TabType>('rules');
  const [rules, setRules] = useState<DomainRule[]>([]);
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [auditLog, setAuditLog] = useState<PermissionAuditEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showAddRule, setShowAddRule] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setIsLoading(true);
    try {
      const [rulesData, permsData, auditData] = await Promise.all([
        getDomainRules(),
        getStoredPermissions(),
        getAuditLog(50),
      ]);
      setRules(rulesData);
      setPermissions(permsData);
      setAuditLog(auditData);
    } catch (error) {
      console.error('Failed to load permissions data:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleDeleteRule(ruleId: string) {
    await removeDomainRule(ruleId);
    setRules(rules.filter(r => r.id !== ruleId));
  }

  async function handleRevokePermission(action: string, domain: string) {
    await revokePermission(action, domain);
    setPermissions(permissions.filter(p => !(p.action === action && p.domain === domain)));
  }

  async function handleClearAudit() {
    if (confirm('Clear all audit log entries?')) {
      await clearAuditLog();
      setAuditLog([]);
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
    <div className="flex flex-col h-full overflow-hidden">
      {/* Tabs - horizontally scrollable */}
      <div className="shrink-0 border-b border-border bg-background">
        <div className="overflow-x-auto scrollbar-hide px-4">
          <div className="flex space-x-1 py-2 min-w-max">
            {(['rules', 'permissions', 'audit'] as TabType[]).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeTab === tab
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                }`}
              >
                {tab === 'rules' && <RulesIcon className="w-4 h-4 shrink-0" />}
                {tab === 'permissions' && <LockIcon className="w-4 h-4 shrink-0" />}
                {tab === 'audit' && <AuditIcon className="w-4 h-4 shrink-0" />}
                <span>
                  {tab === 'rules' && 'Rules'}
                  {tab === 'permissions' && 'Permissions'}
                  {tab === 'audit' && 'Audit Log'}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {activeTab === 'rules' && (
          <RulesTab
            rules={rules}
            onDelete={handleDeleteRule}
            onAdd={() => setShowAddRule(true)}
          />
        )}

        {activeTab === 'permissions' && (
          <PermissionsTab
            permissions={permissions}
            onRevoke={handleRevokePermission}
          />
        )}

        {activeTab === 'audit' && (
          <AuditTab
            entries={auditLog}
            onClear={handleClearAudit}
          />
        )}
      </div>

      {/* Add Rule Modal */}
      {showAddRule && (
        <AddRuleModal
          onClose={() => setShowAddRule(false)}
          onSave={async (rule) => {
            const newRule = await addDomainRule(rule);
            setRules([...rules, newRule]);
            setShowAddRule(false);
          }}
        />
      )}
    </div>
  );
}

// Rules Tab
function RulesTab({
  rules,
  onDelete,
  onAdd,
}: {
  rules: DomainRule[];
  onDelete: (id: string) => void;
  onAdd: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Domain rules define default permissions for websites.
        </p>
        <button
          onClick={onAdd}
          className="px-3 py-1.5 text-sm bg-primary text-primary-foreground rounded-md hover:bg-primary/90 whitespace-nowrap shrink-0"
        >
          + Add Rule
        </button>
      </div>

      {rules.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <span className="text-3xl mb-2 block">📋</span>
          <p>No domain rules configured</p>
          <p className="text-xs">Add rules to auto-grant permissions for trusted sites</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map(rule => (
            <div
              key={rule.id}
              className="p-3 bg-muted/30 rounded-lg space-y-2"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <span className="font-medium text-sm truncate max-w-[180px]">{rule.domain}</span>
                  <TierBadge tier={rule.tier} />
                </div>
                <button
                  onClick={() => onDelete(rule.id)}
                  className="text-destructive hover:text-destructive/80 text-xs shrink-0"
                >
                  Remove
                </button>
              </div>
              <div className="text-xs text-muted-foreground break-words">
                Actions: {rule.actions.join(', ')}
                {rule.autoGrant && ' • Auto-grant'}
                {rule.expiresAt && ` • Expires ${new Date(rule.expiresAt).toLocaleDateString()}`}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Permissions Tab
function PermissionsTab({
  permissions,
  onRevoke,
}: {
  permissions: Permission[];
  onRevoke: (action: string, domain: string) => void;
}) {
  const validPermissions = permissions.filter(
    p => !p.expiresAt || p.expiresAt > Date.now()
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Active permissions granted to actions on specific domains.
      </p>

      {validPermissions.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <span className="text-3xl mb-2 block">🔓</span>
          <p>No active permissions</p>
          <p className="text-xs">Permissions will appear here when granted</p>
        </div>
      ) : (
        <div className="space-y-2">
          {validPermissions.map((perm, index) => (
            <div
              key={`${perm.action}-${perm.domain}-${index}`}
              className="p-3 bg-muted/30 rounded-lg"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-sm">{formatAction(perm.action)}</span>
                    <TierBadge tier={perm.tier} />
                  </div>
                  <div className="text-xs text-muted-foreground truncate">
                    {perm.domain}
                    {perm.expiresAt && ` • Expires ${new Date(perm.expiresAt).toLocaleString()}`}
                  </div>
                </div>
                <button
                  onClick={() => onRevoke(perm.action, perm.domain)}
                  className="text-destructive hover:text-destructive/80 text-xs shrink-0"
                >
                  Revoke
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Audit Tab
function AuditTab({
  entries,
  onClear,
}: {
  entries: PermissionAuditEntry[];
  onClear: () => void;
}) {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm text-muted-foreground">
          Recent permission checks and grants.
        </p>
        {entries.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-destructive hover:text-destructive/80 shrink-0"
          >
            Clear Log
          </button>
        )}
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-8 text-muted-foreground">
          <span className="text-3xl mb-2 block">📜</span>
          <p>No audit entries</p>
          <p className="text-xs">Permission events will be logged here</p>
        </div>
      ) : (
        <div className="space-y-1">
          {entries.map(entry => (
            <div
              key={entry.id}
              className="p-2 bg-muted/20 rounded text-xs sm:text-sm flex items-center gap-2"
            >
              <span className="shrink-0">{entry.granted ? '✅' : '❌'}</span>
              <span className="flex-1 min-w-0 truncate">
                <span className="font-medium">{formatAction(entry.action)}</span>
                <span className="text-muted-foreground"> on </span>
                <span className="text-muted-foreground truncate">{entry.domain}</span>
              </span>
              <span className="text-[10px] sm:text-xs text-muted-foreground shrink-0">
                {formatTime(entry.timestamp)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Add Rule Modal
function AddRuleModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (rule: Omit<DomainRule, 'id' | 'createdAt'>) => void;
}) {
  const [domain, setDomain] = useState('');
  const [tier, setTier] = useState<PermissionTier>('read-only');
  const [actions, setActions] = useState('*');
  const [autoGrant, setAutoGrant] = useState(true);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    
    if (!domain) return;

    onSave({
      domain,
      tier,
      actions: actions.split(',').map(a => a.trim()),
      autoGrant,
    });
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <div className="bg-background rounded-t-xl sm:rounded-lg shadow-xl w-full sm:max-w-md max-h-[90vh] overflow-y-auto">
        <div className="px-4 py-3 border-b border-border sticky top-0 bg-background flex items-center justify-between">
          <h3 className="font-semibold">Add Domain Rule</h3>
          <button onClick={onClose} className="p-1 hover:bg-muted rounded">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Domain</label>
            <input
              type="text"
              value={domain}
              onChange={(e) => setDomain(e.target.value)}
              placeholder="example.com or *.example.com"
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Permission Tier</label>
            <select
              value={tier}
              onChange={(e) => setTier(e.target.value as PermissionTier)}
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
            >
              <option value="passive">Passive (observe only)</option>
              <option value="read-only">Read-only (navigate & read)</option>
              <option value="mutable-safe">Safe mutations (forms, clicks)</option>
              <option value="mutable-critical">Critical (submit, download)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Allowed Actions</label>
            <input
              type="text"
              value={actions}
              onChange={(e) => setActions(e.target.value)}
              placeholder="* for all, or: click, type, extract"
              className="w-full px-3 py-2 text-sm border border-border rounded-md bg-background"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Comma-separated list of actions, or * for all
            </p>
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={autoGrant}
              onChange={(e) => setAutoGrant(e.target.checked)}
              className="rounded border-border w-4 h-4"
            />
            <span className="text-sm">Auto-grant without prompting</span>
          </label>

          <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full sm:w-auto px-4 py-2 text-sm rounded-lg bg-muted hover:bg-muted/80"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="w-full sm:w-auto px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:bg-primary/90"
            >
              Add Rule
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Helper components
function TierBadge({ tier }: { tier: PermissionTier }) {
  const colors: Record<PermissionTier, string> = {
    'passive': 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200',
    'read-only': 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
    'mutable-safe': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
    'mutable-critical': 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
  };

  return (
    <span className={`px-2 py-0.5 rounded text-xs font-medium ${colors[tier]}`}>
      {tier}
    </span>
  );
}

// Helper functions
function formatAction(action: string): string {
  return action
    .replace(/_/g, ' ')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

function formatTime(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp;
  
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(timestamp).toLocaleDateString();
}

// Tab icons
function RulesIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
    </svg>
  );
}

function LockIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
    </svg>
  );
}

function AuditIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}
