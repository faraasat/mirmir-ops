import { useAppStore } from '../../store/app-store';
import type { LLMProvider } from '@/shared/types';
import { WEBLLM_MODELS } from '@/shared/constants';

export function SettingsView() {
  const { settings, updateSettings, user, usage } = useAppStore();

  return (
    <div className="flex-1 overflow-y-auto">
      {/* Account Section */}
      <section className="p-4 border-b border-border">
        <h3 className="font-semibold mb-3">Account</h3>
        {user ? (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Email</span>
              <span>{user.email}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Plan</span>
              <span className="badge badge-primary capitalize">{user.plan}</span>
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-muted-foreground mb-3">
              Sign in to unlock Pro features
            </p>
            <button className="btn-primary text-sm">Sign In</button>
          </div>
        )}
      </section>

      {/* Usage Section */}
      {usage && (
        <section className="p-4 border-b border-border">
          <h3 className="font-semibold mb-3">Usage This Period</h3>
          <div className="space-y-3">
            <UsageBar
              label="Cloud LLM Requests"
              used={usage.cloudLlmRequests}
              limit={50}
            />
            <UsageBar
              label="Voice Commands (Today)"
              used={usage.voiceCommands}
              limit={20}
            />
            <UsageBar
              label="BYOK Requests"
              used={usage.byokRequests}
              limit={100}
            />
          </div>
        </section>
      )}

      {/* AI Settings */}
      <section className="p-4 border-b border-border">
        <h3 className="font-semibold mb-3">AI Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="text-sm text-muted-foreground">Default Provider</label>
            <select
              value={settings.defaultLLMProvider}
              onChange={(e) =>
                updateSettings({ defaultLLMProvider: e.target.value as LLMProvider })
              }
              className="input mt-1"
            >
              <option value="webllm">WebLLM (Local)</option>
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="ollama">Ollama</option>
              <option value="byok">BYOK (Custom)</option>
            </select>
          </div>

          {settings.defaultLLMProvider === 'webllm' && (
            <div>
              <label className="text-sm text-muted-foreground">Local Model</label>
              <select
                value={settings.defaultModel}
                onChange={(e) => updateSettings({ defaultModel: e.target.value })}
                className="input mt-1"
              >
                {Object.entries(WEBLLM_MODELS).map(([id, model]) => (
                  <option key={id} value={id}>
                    {model.name} ({model.size})
                  </option>
                ))}
              </select>
            </div>
          )}

          {(settings.defaultLLMProvider === 'openai' ||
            settings.defaultLLMProvider === 'anthropic') && (
            <div>
              <label className="text-sm text-muted-foreground">API Key</label>
              <input
                type="password"
                value={settings.apiKeys?.[settings.defaultLLMProvider] || ''}
                onChange={(e) =>
                  updateSettings({
                    apiKeys: {
                      ...settings.apiKeys,
                      [settings.defaultLLMProvider]: e.target.value,
                    },
                  })
                }
                placeholder="Enter your API key"
                className="input mt-1"
              />
            </div>
          )}
        </div>
      </section>

      {/* Voice Settings */}
      <section className="p-4 border-b border-border">
        <h3 className="font-semibold mb-3">Voice</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm">Enable Voice Input</span>
            <Toggle
              checked={settings.voiceEnabled}
              onChange={(checked) => updateSettings({ voiceEnabled: checked })}
            />
          </div>

          {settings.voiceEnabled && (
            <div>
              <label className="text-sm text-muted-foreground">Language</label>
              <select
                value={settings.voiceLanguage}
                onChange={(e) => updateSettings({ voiceLanguage: e.target.value })}
                className="input mt-1"
              >
                <option value="en-US">English (US)</option>
                <option value="en-GB">English (UK)</option>
                <option value="es-ES">Spanish</option>
                <option value="fr-FR">French</option>
                <option value="de-DE">German</option>
              </select>
            </div>
          )}
        </div>
      </section>

      {/* Privacy Settings */}
      <section className="p-4 border-b border-border">
        <h3 className="font-semibold mb-3">Privacy</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm">History</span>
              <p className="text-xs text-muted-foreground">Save command history</p>
            </div>
            <Toggle
              checked={settings.historyEnabled}
              onChange={(checked) => updateSettings({ historyEnabled: checked })}
            />
          </div>

          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm">Analytics</span>
              <p className="text-xs text-muted-foreground">Help improve MirmirOps</p>
            </div>
            <Toggle
              checked={settings.analyticsEnabled}
              onChange={(checked) => updateSettings({ analyticsEnabled: checked })}
            />
          </div>
        </div>
      </section>

      {/* Appearance */}
      <section className="p-4">
        <h3 className="font-semibold mb-3">Appearance</h3>
        <div>
          <label className="text-sm text-muted-foreground">Theme</label>
          <select
            value={settings.theme}
            onChange={(e) =>
              updateSettings({ theme: e.target.value as 'light' | 'dark' | 'system' })
            }
            className="input mt-1"
          >
            <option value="system">System</option>
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </div>
      </section>
    </div>
  );
}

function UsageBar({ label, used, limit }: { label: string; used: number; limit: number }) {
  const percentage = limit === -1 ? 0 : Math.min(100, (used / limit) * 100);
  const isUnlimited = limit === -1;

  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span className="text-muted-foreground">{label}</span>
        <span>
          {used} / {isUnlimited ? '∞' : limit}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${
            percentage > 80 ? 'bg-red-500' : percentage > 50 ? 'bg-yellow-500' : 'bg-primary'
          }`}
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
        checked ? 'bg-primary' : 'bg-muted'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
          checked ? 'translate-x-6' : 'translate-x-1'
        }`}
      />
    </button>
  );
}
