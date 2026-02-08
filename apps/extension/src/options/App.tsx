import { useEffect, useState } from 'react';
import browser from 'webextension-polyfill';
import type { UserSettings, LLMProvider } from '@/shared/types';
import { DEFAULT_SETTINGS } from '@/shared/types';
import { STORAGE_KEYS, WEBLLM_MODELS, APP_VERSION } from '@/shared/constants';

export function OptionsApp() {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const result = await browser.storage.local.get(STORAGE_KEYS.SETTINGS);
    if (result[STORAGE_KEYS.SETTINGS]) {
      setSettings(result[STORAGE_KEYS.SETTINGS]);
    }
  };

  const saveSettings = async () => {
    await browser.storage.local.set({ [STORAGE_KEYS.SETTINGS]: settings });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const updateSetting = <K extends keyof UserSettings>(
    key: K,
    value: UserSettings[K]
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="max-w-2xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="w-12 h-12 rounded-xl bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-xl">M</span>
          </div>
          <div>
            <h1 className="text-2xl font-bold">MirmirOps Settings</h1>
            <p className="text-muted-foreground">Version {APP_VERSION}</p>
          </div>
        </div>

        {/* Settings Form */}
        <div className="space-y-8">
          {/* AI Provider */}
          <section className="card p-6">
            <h2 className="text-lg font-semibold mb-4">AI Provider</h2>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">
                  Default LLM Provider
                </label>
                <select
                  value={settings.defaultLLMProvider}
                  onChange={(e) =>
                    updateSetting('defaultLLMProvider', e.target.value as LLMProvider)
                  }
                  className="input w-full"
                >
                  <option value="webllm">WebLLM (Local, Free)</option>
                  <option value="openai">OpenAI (Cloud)</option>
                  <option value="anthropic">Anthropic (Cloud)</option>
                  <option value="ollama">Ollama (Local Server)</option>
                  <option value="byok">BYOK (Custom Provider)</option>
                </select>
                <p className="text-xs text-muted-foreground mt-1">
                  WebLLM runs entirely in your browser using WebGPU.
                </p>
              </div>

              {settings.defaultLLMProvider === 'webllm' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    WebLLM Model
                  </label>
                  <select
                    value={settings.defaultModel}
                    onChange={(e) => updateSetting('defaultModel', e.target.value)}
                    className="input w-full"
                  >
                    {Object.entries(WEBLLM_MODELS).map(([id, model]) => (
                      <option key={id} value={id}>
                        {model.name} - {model.description} ({model.size})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {settings.defaultLLMProvider === 'openai' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    OpenAI API Key
                  </label>
                  <input
                    type="password"
                    value={settings.apiKeys?.openai || ''}
                    onChange={(e) =>
                      updateSetting('apiKeys', {
                        ...settings.apiKeys,
                        openai: e.target.value,
                      })
                    }
                    placeholder="sk-..."
                    className="input w-full"
                  />
                </div>
              )}

              {settings.defaultLLMProvider === 'anthropic' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Anthropic API Key
                  </label>
                  <input
                    type="password"
                    value={settings.apiKeys?.anthropic || ''}
                    onChange={(e) =>
                      updateSetting('apiKeys', {
                        ...settings.apiKeys,
                        anthropic: e.target.value,
                      })
                    }
                    placeholder="sk-ant-..."
                    className="input w-full"
                  />
                </div>
              )}

              {settings.defaultLLMProvider === 'ollama' && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Ollama Server URL
                  </label>
                  <input
                    type="text"
                    value={settings.apiKeys?.ollama || 'http://localhost:11434'}
                    onChange={(e) =>
                      updateSetting('apiKeys', {
                        ...settings.apiKeys,
                        ollama: e.target.value,
                      })
                    }
                    placeholder="http://localhost:11434"
                    className="input w-full"
                  />
                </div>
              )}
            </div>
          </section>

          {/* Voice Settings */}
          <section className="card p-6">
            <h2 className="text-lg font-semibold mb-4">Voice Input</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium">
                    Enable Voice Commands
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Use your microphone to speak commands
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={settings.voiceEnabled}
                  onClick={() =>
                    updateSetting('voiceEnabled', !settings.voiceEnabled)
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.voiceEnabled ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.voiceEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              {settings.voiceEnabled && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Voice Language
                  </label>
                  <select
                    value={settings.voiceLanguage}
                    onChange={(e) =>
                      updateSetting('voiceLanguage', e.target.value)
                    }
                    className="input w-full"
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
          <section className="card p-6">
            <h2 className="text-lg font-semibold mb-4">Privacy</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium">
                    Save History
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Keep a log of commands and actions
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={settings.historyEnabled}
                  onClick={() =>
                    updateSetting('historyEnabled', !settings.historyEnabled)
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.historyEnabled ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.historyEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium">
                    Analytics
                  </label>
                  <p className="text-xs text-muted-foreground">
                    Send anonymous usage data to improve MirmirOps
                  </p>
                </div>
                <button
                  role="switch"
                  aria-checked={settings.analyticsEnabled}
                  onClick={() =>
                    updateSetting('analyticsEnabled', !settings.analyticsEnabled)
                  }
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    settings.analyticsEnabled ? 'bg-primary' : 'bg-muted'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      settings.analyticsEnabled ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </section>

          {/* Theme */}
          <section className="card p-6">
            <h2 className="text-lg font-semibold mb-4">Appearance</h2>
            <div>
              <label className="block text-sm font-medium mb-2">Theme</label>
              <select
                value={settings.theme}
                onChange={(e) =>
                  updateSetting(
                    'theme',
                    e.target.value as 'light' | 'dark' | 'system'
                  )
                }
                className="input w-full"
              >
                <option value="system">System Default</option>
                <option value="light">Light</option>
                <option value="dark">Dark</option>
              </select>
            </div>
          </section>

          {/* Save Button */}
          <div className="flex justify-end gap-4">
            {saved && (
              <span className="text-green-500 flex items-center gap-2">
                <CheckIcon className="w-5 h-5" />
                Settings saved!
              </span>
            )}
            <button onClick={saveSettings} className="btn-primary">
              Save Settings
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M5 13l4 4L19 7"
      />
    </svg>
  );
}
