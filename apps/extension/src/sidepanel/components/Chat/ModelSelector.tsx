import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/app-store';
import { useLLM } from '../../hooks/useLLM';
import type { WebLLMProgress } from '@/lib/llm';
import type { LLMProvider } from '@/shared/types';
import {
  WEBLLM_MODELS,
  OPENAI_MODELS,
  ANTHROPIC_MODELS,
  OLLAMA_MODELS,
  DEFAULT_WEBLLM_MODEL,
  DEFAULT_OPENAI_MODEL,
  DEFAULT_ANTHROPIC_MODEL,
  DEFAULT_OLLAMA_MODEL,
} from '@/shared/constants';

// Convert object models to array format for rendering
function getModelsForProvider(provider: LLMProvider) {
  switch (provider) {
    case 'webllm':
      return Object.entries(WEBLLM_MODELS).map(([id, model]) => ({
        id,
        ...model,
      }));
    case 'openai':
      return Object.entries(OPENAI_MODELS).map(([id, model]) => ({
        id,
        ...model,
      }));
    case 'anthropic':
      return Object.entries(ANTHROPIC_MODELS).map(([id, model]) => ({
        id,
        ...model,
      }));
    case 'ollama':
      return Object.entries(OLLAMA_MODELS).map(([id, model]) => ({
        id,
        ...model,
      }));
    default:
      return [];
  }
}

function getDefaultModel(provider: LLMProvider): string {
  switch (provider) {
    case 'webllm':
      return DEFAULT_WEBLLM_MODEL;
    case 'openai':
      return DEFAULT_OPENAI_MODEL;
    case 'anthropic':
      return DEFAULT_ANTHROPIC_MODEL;
    case 'ollama':
      return DEFAULT_OLLAMA_MODEL;
    default:
      return '';
  }
}

interface ModelSelectorProps {
  onModelReady?: () => void;
  onDismiss?: () => void;
  compact?: boolean;
  provider?: LLMProvider;
}

export function ModelSelector({ onModelReady, onDismiss, compact = false, provider: propProvider }: ModelSelectorProps) {
  const { settings, updateSettings } = useAppStore();
  const { webllmStatus, loadWebLLM, checkWebGPU } = useLLM({});
  
  const provider = propProvider || settings.defaultLLMProvider;
  const models = getModelsForProvider(provider);
  const defaultModel = getDefaultModel(provider);
  
  const [selectedModel, setSelectedModel] = useState(
    provider === settings.defaultLLMProvider ? (settings.defaultModel || defaultModel) : defaultModel
  );
  const [isLoading, setIsLoading] = useState(false);
  const [webGPUSupported, setWebGPUSupported] = useState<boolean | null>(null);
  const [webGPUReason, setWebGPUReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  
  // BYOK specific state
  const [byokEndpoint, setByokEndpoint] = useState(settings.apiKeys?.byokEndpoint || '');
  const [byokApiKey, setByokApiKey] = useState(settings.apiKeys?.byok || '');
  const [byokModel, setByokModel] = useState(settings.apiKeys?.byokModel || '');
  
  // Ollama specific state
  const [ollamaEndpoint, setOllamaEndpoint] = useState(settings.apiKeys?.ollama || 'http://localhost:11434');
  const [customOllamaModel, setCustomOllamaModel] = useState('');
  
  // API key state for OpenAI/Anthropic - always read from saved settings
  const getApiKeyForProvider = (p: LLMProvider): string => {
    if (!settings.apiKeys) return '';
    if (p === 'openai') return settings.apiKeys.openai || '';
    if (p === 'anthropic') return settings.apiKeys.anthropic || '';
    if (p === 'ollama') return settings.apiKeys.ollama || '';
    if (p === 'byok') return settings.apiKeys.byok || '';
    return '';
  };
  const [apiKey, setApiKey] = useState(getApiKeyForProvider(provider));

  // Update apiKey when provider changes and key already exists in settings
  useEffect(() => {
    const savedKey = getApiKeyForProvider(provider);
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, [provider, settings.apiKeys]);

  useEffect(() => {
    if (provider === 'webllm') {
      checkWebGPU().then(({ supported, reason }) => {
        setWebGPUSupported(supported);
        if (reason) setWebGPUReason(reason);
      });
    }
  }, [checkWebGPU, provider]);

  // Update selected model when provider changes
  useEffect(() => {
    setSelectedModel(getDefaultModel(provider));
  }, [provider]);

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const updates: Record<string, unknown> = {
        defaultModel: selectedModel,
      };
      
      // Handle provider-specific settings
      if (provider === 'webllm') {
        await updateSettings(updates);
        // Don't await here - let the progress callback handle updates
        // The loading state will be tracked by webllmStatus
        loadWebLLM(selectedModel).then(() => {
          onModelReady?.();
        }).catch((err) => {
          setError(err instanceof Error ? err.message : 'Failed to load model');
        });
        setIsLoading(false);
        return; // Early return - progress is tracked by webllmStatus
      } else if (provider === 'openai' || provider === 'anthropic') {
        if (!apiKey.trim()) {
          setError('API key is required');
          setIsLoading(false);
          return;
        }
        updates.apiKeys = {
          ...settings.apiKeys,
          [provider]: apiKey,
        };
        await updateSettings(updates);
      } else if (provider === 'ollama') {
        const finalModel = customOllamaModel.trim() || selectedModel;
        updates.defaultModel = finalModel;
        updates.apiKeys = {
          ...settings.apiKeys,
          ollama: ollamaEndpoint,
        };
        await updateSettings(updates);
      } else if (provider === 'byok') {
        if (!byokEndpoint.trim() || !byokModel.trim()) {
          setError('Endpoint and model name are required');
          setIsLoading(false);
          return;
        }
        updates.defaultModel = byokModel;
        updates.apiKeys = {
          ...settings.apiKeys,
          byok: byokApiKey,
          byokEndpoint: byokEndpoint,
          byokModel: byokModel,
        };
        await updateSettings(updates);
      }
      
      onModelReady?.();
      setIsLoading(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save settings');
      setIsLoading(false);
    }
  };

  const getProgressPercent = (status: WebLLMProgress | null): number => {
    if (!status) return 0;
    return Math.round(status.progress * 100);
  };

  const getStatusText = (status: WebLLMProgress | null): string => {
    if (!status) return 'Ready to load';
    
    switch (status.status) {
      case 'loading':
        // Check the text for more specific messages
        if (status.text?.toLowerCase().includes('download')) {
          return `Downloading... ${getProgressPercent(status)}%`;
        }
        return `Loading... ${getProgressPercent(status)}%`;
      case 'ready':
        return 'Model ready!';
      case 'error':
        return 'Error loading model';
      default:
        return status.text || 'Processing...';
    }
  };

  // WebGPU check for WebLLM
  if (provider === 'webllm' && webGPUSupported === false) {
    return (
      <div className={`${compact ? 'p-3' : 'p-4'} bg-destructive/10 border border-destructive/20 rounded-xl`}>
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-destructive/20 flex items-center justify-center shrink-0">
            <WarningIcon className="w-4 h-4 text-destructive" />
          </div>
          <div>
            <h3 className="font-medium text-sm text-destructive">WebGPU Not Available</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {webGPUReason || 'Your browser does not support WebGPU, which is required for local AI models.'}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Please use Chrome 113+ or Edge 113+ with WebGPU enabled, or switch to a cloud provider in Settings.
            </p>
            {onDismiss && (
              <button 
                onClick={onDismiss}
                className="mt-3 text-xs text-primary hover:underline"
              >
                Switch to cloud provider
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  const getProviderTitle = () => {
    switch (provider) {
      case 'webllm': return 'Local AI Model';
      case 'openai': return 'OpenAI Configuration';
      case 'anthropic': return 'Anthropic Configuration';
      case 'ollama': return 'Ollama Configuration';
      case 'byok': return 'Custom Provider (BYOK)';
      default: return 'AI Configuration';
    }
  };

  const getProviderDescription = () => {
    switch (provider) {
      case 'webllm': return 'Choose a local AI model. It will be downloaded and run entirely on your device.';
      case 'openai': return 'Enter your OpenAI API key and select a model.';
      case 'anthropic': return 'Enter your Anthropic API key and select a model.';
      case 'ollama': return 'Configure your local Ollama server connection.';
      case 'byok': return 'Configure your custom OpenAI-compatible endpoint.';
      default: return '';
    }
  };

  // Render BYOK configuration
  if (provider === 'byok') {
    return (
      <div className={`${compact ? 'p-3' : 'p-4'} bg-card border border-border rounded-xl`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`font-semibold ${compact ? 'text-sm' : ''}`}>{getProviderTitle()}</h3>
          {onDismiss && (
            <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground">
              <CloseIcon className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
            </button>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground mb-3">{getProviderDescription()}</p>
        
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">API Endpoint *</label>
            <input
              type="url"
              value={byokEndpoint}
              onChange={(e) => setByokEndpoint(e.target.value)}
              placeholder="https://api.your-provider.com/v1"
              className="input mt-1 text-sm"
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label className="text-xs text-muted-foreground">API Key (optional)</label>
            <input
              type="password"
              value={byokApiKey}
              onChange={(e) => setByokApiKey(e.target.value)}
              placeholder="sk-..."
              className="input mt-1 text-sm"
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label className="text-xs text-muted-foreground">Model Name *</label>
            <input
              type="text"
              value={byokModel}
              onChange={(e) => setByokModel(e.target.value)}
              placeholder="e.g., gpt-4, llama-3, etc."
              className="input mt-1 text-sm"
              disabled={isLoading}
            />
          </div>
        </div>
        
        {error && <p className="text-xs text-destructive mt-2">{error}</p>}
        
        <button
          onClick={handleSave}
          disabled={isLoading || !byokEndpoint.trim() || !byokModel.trim()}
          className={`w-full btn-primary ${compact ? 'text-xs py-1.5' : 'py-2.5'} rounded-lg font-medium mt-3 disabled:opacity-50`}
        >
          {isLoading ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    );
  }

  // Render Ollama configuration
  if (provider === 'ollama') {
    return (
      <div className={`${compact ? 'p-3' : 'p-4'} bg-card border border-border rounded-xl`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`font-semibold ${compact ? 'text-sm' : ''}`}>{getProviderTitle()}</h3>
          {onDismiss && (
            <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground">
              <CloseIcon className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
            </button>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground mb-3">{getProviderDescription()}</p>
        
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">Ollama Server URL</label>
            <input
              type="url"
              value={ollamaEndpoint}
              onChange={(e) => setOllamaEndpoint(e.target.value)}
              placeholder="http://localhost:11434"
              className="input mt-1 text-sm"
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label className="text-xs text-muted-foreground">Select Model</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="input mt-1 text-sm"
              disabled={isLoading}
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} - {model.description}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="text-xs text-muted-foreground">Or enter custom model name</label>
            <input
              type="text"
              value={customOllamaModel}
              onChange={(e) => setCustomOllamaModel(e.target.value)}
              placeholder="e.g., my-custom-model:latest"
              className="input mt-1 text-sm"
              disabled={isLoading}
            />
            <p className="text-[10px] text-muted-foreground mt-1">Leave empty to use selected model above</p>
          </div>
        </div>
        
        {error && <p className="text-xs text-destructive mt-2">{error}</p>}
        
        <button
          onClick={handleSave}
          disabled={isLoading}
          className={`w-full btn-primary ${compact ? 'text-xs py-1.5' : 'py-2.5'} rounded-lg font-medium mt-3 disabled:opacity-50`}
        >
          {isLoading ? 'Saving...' : 'Save Configuration'}
        </button>
      </div>
    );
  }

  // Render OpenAI/Anthropic configuration
  if (provider === 'openai' || provider === 'anthropic') {
    return (
      <div className={`${compact ? 'p-3' : 'p-4'} bg-card border border-border rounded-xl`}>
        <div className="flex items-center justify-between mb-3">
          <h3 className={`font-semibold ${compact ? 'text-sm' : ''}`}>{getProviderTitle()}</h3>
          {onDismiss && (
            <button onClick={onDismiss} className="text-muted-foreground hover:text-foreground">
              <CloseIcon className={compact ? 'w-4 h-4' : 'w-5 h-5'} />
            </button>
          )}
        </div>
        
        <p className="text-xs text-muted-foreground mb-3">{getProviderDescription()}</p>
        
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground">API Key *</label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={provider === 'openai' ? 'sk-...' : 'sk-ant-...'}
              className="input mt-1 text-sm"
              disabled={isLoading}
            />
          </div>
          
          <div>
            <label className="text-xs text-muted-foreground">Model</label>
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value)}
              className="input mt-1 text-sm"
              disabled={isLoading}
            >
              {models.map((model) => (
                <option key={model.id} value={model.id}>
                  {model.name} - {model.description}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {error && <p className="text-xs text-destructive mt-2">{error}</p>}
        
        <button
          onClick={handleSave}
          disabled={isLoading || !apiKey.trim()}
          className={`w-full btn-primary ${compact ? 'text-xs py-1.5' : 'py-2.5'} rounded-lg font-medium mt-3 disabled:opacity-50`}
        >
          {isLoading ? 'Saving...' : 'Save & Connect'}
        </button>
      </div>
    );
  }

  // Render WebLLM configuration (default)
  if (compact) {
    return (
      <div className="p-3 bg-card border border-border rounded-xl">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-medium">{getProviderTitle()}</span>
          {onDismiss && (
            <button 
              onClick={onDismiss}
              className="text-muted-foreground hover:text-foreground"
            >
              <CloseIcon className="w-4 h-4" />
            </button>
          )}
        </div>
        
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="w-full input text-xs py-1.5 mb-2"
          disabled={isLoading}
        >
          {models.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} {'size' in model ? `(${model.size})` : ''}
            </option>
          ))}
        </select>
        
        {webllmStatus && webllmStatus.status !== 'ready' && (
          <div className="mb-2">
            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300"
                style={{ width: `${getProgressPercent(webllmStatus)}%` }}
              />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{getStatusText(webllmStatus)}</p>
          </div>
        )}
        
        {error && (
          <p className="text-xs text-destructive mb-2">{error}</p>
        )}
        
        <button
          onClick={handleSave}
          disabled={isLoading || webllmStatus?.status === 'loading' || webllmStatus?.status === 'ready'}
          className="w-full btn-primary text-xs py-1.5 rounded-lg disabled:opacity-50"
        >
          {webllmStatus?.status === 'loading' ? 'Loading...' : webllmStatus?.status === 'ready' ? 'Model Ready' : isLoading ? 'Loading...' : 'Load Model'}
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-card border border-border rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">{getProviderTitle()}</h3>
        {onDismiss && (
          <button 
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground mb-4">{getProviderDescription()}</p>
      
      <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
        {models.map((model) => (
          <button
            key={model.id}
            onClick={() => setSelectedModel(model.id)}
            disabled={isLoading}
            className={`w-full flex items-start gap-3 p-3 rounded-lg border text-left transition-all ${
              selectedModel === model.id
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-accent/50'
            } ${isLoading ? 'opacity-50' : ''}`}
          >
            <div className={`w-4 h-4 mt-0.5 rounded-full border-2 flex items-center justify-center shrink-0 ${
              selectedModel === model.id ? 'border-primary' : 'border-muted-foreground'
            }`}>
              {selectedModel === model.id && (
                <div className="w-2 h-2 rounded-full bg-primary" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-medium text-sm">{model.name}</span>
                {'size' in model && (
                  <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                    {model.size}
                  </span>
                )}
                {'recommended' in model && model.recommended && (
                  <span className="text-[10px] bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                    Recommended
                  </span>
                )}
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">{model.description}</p>
            </div>
          </button>
        ))}
      </div>
      
      {/* Progress bar for WebLLM */}
      {provider === 'webllm' && webllmStatus && webllmStatus.status !== 'idle' && webllmStatus.status !== 'ready' && (
        <div className="mb-4">
          <div className="h-2 bg-secondary rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-300"
              style={{ width: `${getProgressPercent(webllmStatus)}%` }}
            />
          </div>
          <div className="flex items-center justify-between mt-1">
            <p className="text-xs text-muted-foreground">{getStatusText(webllmStatus)}</p>
            <p className="text-xs text-muted-foreground">{getProgressPercent(webllmStatus)}%</p>
          </div>
        </div>
      )}
      
      {error && (
        <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
          <p className="text-xs text-destructive">{error}</p>
        </div>
      )}
      
      <button
        onClick={handleSave}
        disabled={isLoading || (provider === 'webllm' && (webllmStatus?.status === 'ready' || webllmStatus?.status === 'loading'))}
        className="w-full btn-primary py-2.5 rounded-lg font-medium disabled:opacity-50"
      >
        {webllmStatus?.status === 'loading' ? (
          <span className="flex items-center justify-center gap-2">
            <LoadingSpinner className="w-4 h-4" />
            Loading Model...
          </span>
        ) : isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <LoadingSpinner className="w-4 h-4" />
            {provider === 'webllm' ? 'Loading Model...' : 'Saving...'}
          </span>
        ) : provider === 'webllm' && webllmStatus?.status === 'ready' ? (
          'Model Ready'
        ) : provider === 'webllm' ? (
          'Download & Load Model'
        ) : (
          'Save Configuration'
        )}
      </button>
      
      {provider === 'webllm' && (
        <p className="text-[10px] text-muted-foreground text-center mt-2">
          First download may take a few minutes depending on your connection
        </p>
      )}
    </div>
  );
}

// Icons
function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  );
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
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

export default ModelSelector;
