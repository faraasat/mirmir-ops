import { useState, useEffect, useCallback } from 'react';
import { useAppStore } from '../../store/app-store';
import type { LLMProvider } from '@/shared/types';
import { 
  WEBLLM_MODELS, 
  OPENAI_MODELS, 
  ANTHROPIC_MODELS, 
  OLLAMA_MODELS 
} from '@/shared/constants';
import { PrivacySettingsView } from './PrivacySettings';
import { SecurityView } from './SecurityView';
import { ThemeSettingsView } from './ThemeSettings';
import {
  fetchOpenAIModels,
  fetchAnthropicModels,
  fetchOllamaModels,
  fetchBYOKModels,
  type FetchedModel,
} from '@/lib/llm/model-fetcher';

type SettingsTab = 'general' | 'privacy' | 'security' | 'theme';

export function SettingsView() {
  const { settings, updateSettings, user, usage } = useAppStore();
  const [activeTab, setActiveTab] = useState<SettingsTab>('general');
  
  // Dynamic model fetching state
  const [fetchedModels, setFetchedModels] = useState<FetchedModel[]>([]);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [modelFetchError, setModelFetchError] = useState<string | null>(null);

  // Track previous API key values to detect changes
  const [prevApiKeys, setPrevApiKeys] = useState<{
    openai?: string;
    anthropic?: string;
    ollama?: string;
  }>({});

  // Fetch models when API key or provider changes
  const fetchModelsForProvider = useCallback(async (forceRefresh = false) => {
    setModelFetchError(null);
    
    const provider = settings.defaultLLMProvider;
    
    if (provider === 'webllm') {
      setFetchedModels([]);
      return;
    }

    if (provider === 'openai' && settings.apiKeys?.openai) {
      setIsLoadingModels(true);
      try {
        const models = await fetchOpenAIModels(settings.apiKeys.openai);
        setFetchedModels(models);
        // Auto-select first model if none selected or current model not in list
        if (models.length > 0 && (!settings.defaultModel || !models.find(m => m.id === settings.defaultModel))) {
          updateSettings({ defaultModel: models[0].id });
        }
      } catch (error) {
        setModelFetchError(error instanceof Error ? error.message : 'Failed to fetch models');
        setFetchedModels([]);
      } finally {
        setIsLoadingModels(false);
      }
    } else if (provider === 'anthropic' && settings.apiKeys?.anthropic) {
      setIsLoadingModels(true);
      try {
        const models = await fetchAnthropicModels(settings.apiKeys.anthropic);
        setFetchedModels(models);
        // Auto-select first model if none selected
        if (models.length > 0 && (!settings.defaultModel || !models.find(m => m.id === settings.defaultModel))) {
          updateSettings({ defaultModel: models[0].id });
        }
      } catch (error) {
        setModelFetchError(error instanceof Error ? error.message : 'Failed to validate key');
        setFetchedModels([]);
      } finally {
        setIsLoadingModels(false);
      }
    } else if (provider === 'ollama' && settings.apiKeys?.ollama) {
      // Only auto-fetch on explicit request or when URL changes significantly
      if (forceRefresh) {
        setIsLoadingModels(true);
        try {
          const models = await fetchOllamaModels(settings.apiKeys.ollama);
          setFetchedModels(models);
          // Auto-select first model if none selected
          if (models.length > 0 && (!settings.defaultModel || !models.find(m => m.id === settings.defaultModel))) {
            updateSettings({ defaultModel: models[0].id });
          }
        } catch (error) {
          setModelFetchError(error instanceof Error ? error.message : 'Failed to connect to Ollama');
          setFetchedModels([]);
        } finally {
          setIsLoadingModels(false);
        }
      }
    } else if (provider === 'byok' && settings.apiKeys?.byokEndpoint) {
      if (forceRefresh) {
        setIsLoadingModels(true);
        try {
          const models = await fetchBYOKModels(
            settings.apiKeys.byokEndpoint,
            settings.apiKeys.byok
          );
          setFetchedModels(models);
        } catch {
          // Don't show error for BYOK - it's optional
          setFetchedModels([]);
        } finally {
          setIsLoadingModels(false);
        }
      }
    } else {
      setFetchedModels([]);
    }
  }, [settings.defaultLLMProvider, settings.apiKeys?.openai, settings.apiKeys?.anthropic, settings.apiKeys?.ollama, settings.apiKeys?.byokEndpoint, settings.apiKeys?.byok, settings.defaultModel, updateSettings]);

  // Auto-fetch models when API key is added/changed for OpenAI and Anthropic
  useEffect(() => {
    const provider = settings.defaultLLMProvider;
    
    // Check if API key changed for OpenAI
    if (provider === 'openai' && settings.apiKeys?.openai && settings.apiKeys.openai !== prevApiKeys.openai) {
      setPrevApiKeys(prev => ({ ...prev, openai: settings.apiKeys?.openai }));
      // Only fetch if key looks valid (starts with sk-)
      if (settings.apiKeys.openai.startsWith('sk-')) {
        fetchModelsForProvider(true);
      }
    }
    
    // Check if API key changed for Anthropic
    if (provider === 'anthropic' && settings.apiKeys?.anthropic && settings.apiKeys.anthropic !== prevApiKeys.anthropic) {
      setPrevApiKeys(prev => ({ ...prev, anthropic: settings.apiKeys?.anthropic }));
      // Only fetch if key looks valid (starts with sk-ant-)
      if (settings.apiKeys.anthropic.startsWith('sk-ant-')) {
        fetchModelsForProvider(true);
      }
    }
  }, [settings.defaultLLMProvider, settings.apiKeys?.openai, settings.apiKeys?.anthropic, prevApiKeys, fetchModelsForProvider]);

  // Fetch on provider change
  useEffect(() => {
    // Reset fetched models when provider changes
    setFetchedModels([]);
    setModelFetchError(null);
    
    // Auto-fetch for providers with valid keys
    const provider = settings.defaultLLMProvider;
    if (provider === 'openai' && settings.apiKeys?.openai?.startsWith('sk-')) {
      fetchModelsForProvider(true);
    } else if (provider === 'anthropic' && settings.apiKeys?.anthropic?.startsWith('sk-ant-')) {
      fetchModelsForProvider(true);
    }
  }, [settings.defaultLLMProvider]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Settings Tabs */}
      <div className="flex border-b border-border bg-background shrink-0">
        {(['general', 'privacy', 'security', 'theme'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 px-3 py-2 text-sm font-medium border-b-2 -mb-px capitalize ${
              activeTab === tab
                ? 'border-primary text-primary'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Scrollable content area */}
      <div className="flex-1 overflow-y-auto min-h-0">
        {activeTab === 'privacy' && (
          <div className="p-4">
            <PrivacySettingsView />
          </div>
        )}

        {activeTab === 'security' && (
          <div className="p-4">
            <SecurityView />
          </div>
        )}

        {activeTab === 'theme' && (
          <div className="p-4">
            <ThemeSettingsView />
          </div>
        )}

        {activeTab === 'general' && (
          <>
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

          {/* WebLLM Model Selection */}
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
              <p className="text-xs text-muted-foreground mt-1">
                Model will be downloaded when you start chatting
              </p>
            </div>
          )}

          {/* OpenAI Configuration */}
          {settings.defaultLLMProvider === 'openai' && (
            <>
              <div>
                <label className="text-sm text-muted-foreground">API Key</label>
                <input
                  type="password"
                  value={settings.apiKeys?.openai || ''}
                  onChange={(e) =>
                    updateSettings({
                      apiKeys: {
                        ...settings.apiKeys,
                        openai: e.target.value,
                      },
                    })
                  }
                  placeholder="sk-..."
                  className="input mt-1"
                />
                {settings.apiKeys?.openai && !settings.apiKeys.openai.startsWith('sk-') && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    API key should start with "sk-"
                  </p>
                )}
              </div>
              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm text-muted-foreground">Model</label>
                  {settings.apiKeys?.openai && fetchedModels.length > 0 && (
                    <button
                      onClick={() => fetchModelsForProvider(true)}
                      disabled={isLoadingModels}
                      className="text-xs text-primary hover:text-primary/80"
                    >
                      {isLoadingModels ? 'Refreshing...' : 'Refresh'}
                    </button>
                  )}
                </div>
                {isLoadingModels ? (
                  <div className="input mt-1 flex items-center gap-2 text-muted-foreground">
                    <LoadingSpinner className="w-4 h-4" />
                    <span>Fetching models from OpenAI...</span>
                  </div>
                ) : modelFetchError ? (
                  <div className="mt-1">
                    <p className="text-xs text-destructive mb-2">{modelFetchError}</p>
                    <select
                      value={settings.defaultModel}
                      onChange={(e) => updateSettings({ defaultModel: e.target.value })}
                      className="input"
                    >
                      {Object.entries(OPENAI_MODELS).map(([id, model]) => (
                        <option key={id} value={id}>
                          {model.name} - {model.description}
                        </option>
                      ))}
                    </select>
                  </div>
                ) : fetchedModels.length > 0 ? (
                  <>
                    <select
                      value={settings.defaultModel}
                      onChange={(e) => updateSettings({ defaultModel: e.target.value })}
                      className="input mt-1"
                    >
                      {fetchedModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name}{model.description ? ` - ${model.description}` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      ✓ {fetchedModels.length} models available from your account
                    </p>
                  </>
                ) : (
                  <>
                    <select
                      value={settings.defaultModel}
                      onChange={(e) => updateSettings({ defaultModel: e.target.value })}
                      className="input mt-1"
                    >
                      {Object.entries(OPENAI_MODELS).map(([id, model]) => (
                        <option key={id} value={id}>
                          {model.name} - {model.description}
                        </option>
                      ))}
                    </select>
                    {settings.apiKeys?.openai && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Enter a valid API key to fetch available models
                      </p>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {/* Anthropic Configuration */}
          {settings.defaultLLMProvider === 'anthropic' && (
            <>
              <div>
                <label className="text-sm text-muted-foreground">API Key</label>
                <input
                  type="password"
                  value={settings.apiKeys?.anthropic || ''}
                  onChange={(e) =>
                    updateSettings({
                      apiKeys: {
                        ...settings.apiKeys,
                        anthropic: e.target.value,
                      },
                    })
                  }
                  placeholder="sk-ant-..."
                  className="input mt-1"
                />
                {settings.apiKeys?.anthropic && !settings.apiKeys.anthropic.startsWith('sk-ant-') && (
                  <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                    API key should start with "sk-ant-"
                  </p>
                )}
                {modelFetchError && settings.apiKeys?.anthropic && (
                  <p className="text-xs text-destructive mt-1">{modelFetchError}</p>
                )}
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Model</label>
                {isLoadingModels ? (
                  <div className="input mt-1 flex items-center gap-2 text-muted-foreground">
                    <LoadingSpinner className="w-4 h-4" />
                    <span>Validating API key...</span>
                  </div>
                ) : fetchedModels.length > 0 ? (
                  <>
                    <select
                      value={settings.defaultModel}
                      onChange={(e) => updateSettings({ defaultModel: e.target.value })}
                      className="input mt-1"
                    >
                      {fetchedModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name}{model.description ? ` - ${model.description}` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      ✓ API key validated
                    </p>
                  </>
                ) : (
                  <>
                    <select
                      value={settings.defaultModel}
                      onChange={(e) => updateSettings({ defaultModel: e.target.value })}
                      className="input mt-1"
                    >
                      {Object.entries(ANTHROPIC_MODELS).map(([id, model]) => (
                        <option key={id} value={id}>
                          {model.name} - {model.description}
                        </option>
                      ))}
                    </select>
                    {settings.apiKeys?.anthropic && settings.apiKeys.anthropic.startsWith('sk-ant-') && (
                      <p className="text-xs text-muted-foreground mt-1">
                        Models will be validated when you use the API
                      </p>
                    )}
                  </>
                )}
              </div>
            </>
          )}

          {/* Ollama Configuration */}
          {settings.defaultLLMProvider === 'ollama' && (
            <>
              <div>
                <label className="text-sm text-muted-foreground">Server URL</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="url"
                    value={settings.apiKeys?.ollama || 'http://localhost:11434'}
                    onChange={(e) =>
                      updateSettings({
                        apiKeys: {
                          ...settings.apiKeys,
                          ollama: e.target.value,
                        },
                      })
                    }
                    placeholder="http://localhost:11434"
                    className="input flex-1"
                  />
                  <button
                    onClick={() => fetchModelsForProvider(true)}
                    disabled={isLoadingModels}
                    className="btn-secondary text-xs px-3"
                  >
                    {isLoadingModels ? 'Loading...' : 'Connect'}
                  </button>
                </div>
                {modelFetchError && (
                  <p className="text-xs text-destructive mt-1">{modelFetchError}</p>
                )}
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Model</label>
                {isLoadingModels ? (
                  <div className="input mt-1 flex items-center gap-2 text-muted-foreground">
                    <LoadingSpinner className="w-4 h-4" />
                    <span>Fetching models from Ollama...</span>
                  </div>
                ) : fetchedModels.length > 0 ? (
                  <>
                    <select
                      value={settings.defaultModel}
                      onChange={(e) => updateSettings({ defaultModel: e.target.value })}
                      className="input mt-1"
                    >
                      {fetchedModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name}{model.description ? ` (${model.description})` : ''}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      ✓ Connected - {fetchedModels.length} models available
                    </p>
                  </>
                ) : (
                  <>
                    <select
                      value={settings.defaultModel}
                      onChange={(e) => updateSettings({ defaultModel: e.target.value })}
                      className="input mt-1"
                    >
                      {Object.entries(OLLAMA_MODELS).map(([id, model]) => (
                        <option key={id} value={id}>
                          {model.name} - {model.description}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-muted-foreground mt-1">
                      Click "Connect" to fetch models from your Ollama server
                    </p>
                  </>
                )}
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Custom Model Name (optional)</label>
                <input
                  type="text"
                  value={settings.apiKeys?.ollamaCustomModel || ''}
                  onChange={(e) =>
                    updateSettings({
                      apiKeys: {
                        ...settings.apiKeys,
                        ollamaCustomModel: e.target.value,
                      },
                      defaultModel: e.target.value || settings.defaultModel,
                    })
                  }
                  placeholder="e.g., my-custom-model:latest"
                  className="input mt-1"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Or manually enter a model name if not listed above
                </p>
              </div>
            </>
          )}

          {/* BYOK (Bring Your Own Key) Configuration */}
          {settings.defaultLLMProvider === 'byok' && (
            <>
              <div>
                <label className="text-sm text-muted-foreground">API Endpoint *</label>
                <div className="flex gap-2 mt-1">
                  <input
                    type="url"
                    value={settings.apiKeys?.byokEndpoint || ''}
                    onChange={(e) =>
                      updateSettings({
                        apiKeys: {
                          ...settings.apiKeys,
                          byokEndpoint: e.target.value,
                        },
                      })
                    }
                    placeholder="https://api.your-provider.com/v1"
                    className="input flex-1"
                  />
                  {settings.apiKeys?.byokEndpoint && (
                    <button
                      onClick={() => fetchModelsForProvider(true)}
                      disabled={isLoadingModels}
                      className="btn-secondary text-xs px-3"
                    >
                      {isLoadingModels ? 'Loading...' : 'Fetch'}
                    </button>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  OpenAI-compatible API endpoint (e.g., /v1/chat/completions)
                </p>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">API Key (optional)</label>
                <input
                  type="password"
                  value={settings.apiKeys?.byok || ''}
                  onChange={(e) =>
                    updateSettings({
                      apiKeys: {
                        ...settings.apiKeys,
                        byok: e.target.value,
                      },
                    })
                  }
                  placeholder="Your API key"
                  className="input mt-1"
                />
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Model Name *</label>
                {isLoadingModels ? (
                  <div className="input mt-1 flex items-center gap-2 text-muted-foreground">
                    <LoadingSpinner className="w-4 h-4" />
                    <span>Fetching models...</span>
                  </div>
                ) : fetchedModels.length > 0 ? (
                  <>
                    <select
                      value={settings.apiKeys?.byokModel || settings.defaultModel}
                      onChange={(e) =>
                        updateSettings({
                          apiKeys: {
                            ...settings.apiKeys,
                            byokModel: e.target.value,
                          },
                          defaultModel: e.target.value,
                        })
                      }
                      className="input mt-1"
                    >
                      <option value="">Select a model...</option>
                      {fetchedModels.map((model) => (
                        <option key={model.id} value={model.id}>
                          {model.name}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                      ✓ {fetchedModels.length} models found
                    </p>
                  </>
                ) : (
                  <>
                    <input
                      type="text"
                      value={settings.apiKeys?.byokModel || ''}
                      onChange={(e) =>
                        updateSettings({
                          apiKeys: {
                            ...settings.apiKeys,
                            byokModel: e.target.value,
                          },
                          defaultModel: e.target.value,
                        })
                      }
                      placeholder="e.g., gpt-4, llama-3, mistral"
                      className="input mt-1"
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Enter the model identifier, or click Fetch to list available models
                    </p>
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </section>

      {/* Voice Settings */}
      <section className="p-4 border-b border-border">
        <h3 className="font-semibold mb-3">Voice</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm">Voice Input</span>
              <p className="text-xs text-muted-foreground">Use microphone for commands</p>
            </div>
            <Toggle
              checked={settings.voiceEnabled}
              onChange={(checked) => updateSettings({ voiceEnabled: checked })}
            />
          </div>

          {settings.voiceEnabled && (
            <>
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm">Auto-submit</span>
                  <p className="text-xs text-muted-foreground">Send voice commands automatically</p>
                </div>
                <Toggle
                  checked={settings.voiceAutoSubmit !== false}
                  onChange={(checked) => updateSettings({ voiceAutoSubmit: checked })}
                />
              </div>

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
                  <option value="ja-JP">Japanese</option>
                  <option value="zh-CN">Chinese (Simplified)</option>
                  <option value="ko-KR">Korean</option>
                  <option value="pt-BR">Portuguese (Brazil)</option>
                  <option value="ar-SA">Arabic</option>
                </select>
              </div>
            </>
          )}

          <div className="flex items-center justify-between">
            <div>
              <span className="text-sm">Voice Feedback</span>
              <p className="text-xs text-muted-foreground">Read responses aloud (TTS)</p>
            </div>
            <Toggle
              checked={settings.voiceFeedbackEnabled}
              onChange={(checked) => updateSettings({ voiceFeedbackEnabled: checked })}
            />
          </div>

          {settings.voiceFeedbackEnabled && (
            <>
              <div>
                <label className="text-sm text-muted-foreground">Speaking Rate</label>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-muted-foreground">Slow</span>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={settings.voiceRate ?? 1.0}
                    onChange={(e) => updateSettings({ voiceRate: parseFloat(e.target.value) })}
                    className="flex-1 accent-primary"
                  />
                  <span className="text-xs text-muted-foreground">Fast</span>
                  <span className="text-xs font-mono w-8 text-right">{(settings.voiceRate ?? 1.0).toFixed(1)}</span>
                </div>
              </div>
              <div>
                <label className="text-sm text-muted-foreground">Pitch</label>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-xs text-muted-foreground">Low</span>
                  <input
                    type="range"
                    min="0.5"
                    max="2"
                    step="0.1"
                    value={settings.voicePitch ?? 1.0}
                    onChange={(e) => updateSettings({ voicePitch: parseFloat(e.target.value) })}
                    className="flex-1 accent-primary"
                  />
                  <span className="text-xs text-muted-foreground">High</span>
                  <span className="text-xs font-mono w-8 text-right">{(settings.voicePitch ?? 1.0).toFixed(1)}</span>
                </div>
              </div>
            </>
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
        </>
        )}
      </div>
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

function LoadingSpinner({ className }: { className?: string }) {
  return (
    <svg className={`${className} animate-spin`} fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}
