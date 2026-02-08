import { useState } from 'react';
import { useAppStore } from '../../store/app-store';
import { ModelSelector } from '../Chat/ModelSelector';
import type { LLMProvider } from '@/shared/types';

const PROVIDERS: { id: LLMProvider; name: string; icon: string; description: string }[] = [
  { id: 'webllm', name: 'WebLLM', icon: '🖥️', description: 'Local AI (Privacy)' },
  { id: 'openai', name: 'OpenAI', icon: '🟢', description: 'GPT-4, GPT-3.5' },
  { id: 'anthropic', name: 'Claude', icon: '🟣', description: 'Claude 3.5, 3' },
  { id: 'ollama', name: 'Ollama', icon: '🦙', description: 'Local Server' },
  { id: 'byok', name: 'Custom', icon: '🔧', description: 'Your own API' },
];

// Helper to get display name for the current model
function getModelDisplayName(provider: LLMProvider, model: string | undefined, webllmStatus: { status: string } | null): string {
  if (provider === 'webllm') {
    if (webllmStatus?.status === 'ready') {
      const shortNames: Record<string, string> = {
        'Phi-3-mini-4k-instruct-q4f16_1-MLC': 'Phi-3 Mini',
        'Llama-3.1-8B-Instruct-q4f16_1-MLC': 'Llama 3.1 8B',
        'Llama-3.2-1B-Instruct-q4f16_1-MLC': 'Llama 3.2 1B',
        'Mistral-7B-Instruct-v0.2-q4f16_1': 'Mistral 7B',
        'gemma-2b-it-q4f16_1-MLC': 'Gemma 2B',
        'TinyLlama-1.1B-Chat-v1.0-q4f16_1-MLC': 'TinyLlama 1.1B',
      };
      return shortNames[model || ''] || model?.split('-').slice(0, 2).join(' ') || 'Local AI';
    }
    return webllmStatus?.status === 'loading' ? 'Loading...' : 'Select model';
  }
  if (provider === 'openai') {
    const shortNames: Record<string, string> = {
      'gpt-4o': 'GPT-4o',
      'gpt-4o-mini': 'GPT-4o Mini',
      'gpt-4-turbo': 'GPT-4 Turbo',
      'gpt-3.5-turbo': 'GPT-3.5',
    };
    return shortNames[model || ''] || model || 'Select model';
  }
  if (provider === 'anthropic') {
    const shortNames: Record<string, string> = {
      'claude-3-5-sonnet-20241022': 'Claude 3.5 Sonnet',
      'claude-3-opus-20240229': 'Claude 3 Opus',
      'claude-3-sonnet-20240229': 'Claude 3 Sonnet',
      'claude-3-haiku-20240307': 'Claude 3 Haiku',
    };
    return shortNames[model || ''] || model || 'Select model';
  }
  if (provider === 'ollama') return model || 'Select model';
  if (provider === 'byok') return model || 'Configure';
  return 'AI';
}

function getProviderInfo(provider: LLMProvider) {
  return PROVIDERS.find(p => p.id === provider) || PROVIDERS[0];
}

export function ModelSelectorBar() {
  const { settings, updateSettings, webllmStatus } = useAppStore();
  const [showModelSelector, setShowModelSelector] = useState(false);
  const [showProviderSelector, setShowProviderSelector] = useState(false);

  const provider = settings.defaultLLMProvider;
  const providerInfo = getProviderInfo(provider);
  const modelDisplayName = getModelDisplayName(provider, settings.defaultModel, webllmStatus);

  // Check if configuration is needed - only show "Setup" if keys are truly missing
  const needsConfiguration = (() => {
    if (provider === 'webllm') {
      return !webllmStatus || (webllmStatus.status !== 'ready' && webllmStatus.status !== 'loading');
    }
    if (provider === 'openai') return !settings.apiKeys?.openai;
    if (provider === 'anthropic') return !settings.apiKeys?.anthropic;
    if (provider === 'ollama') return !settings.apiKeys?.ollama;
    if (provider === 'byok') return !settings.apiKeys?.byokEndpoint || !settings.apiKeys?.byokModel;
    return false;
  })();

  // Check if provider is configured (key exists) but model might need selection
  const isConfigured = (() => {
    if (provider === 'webllm') return webllmStatus?.status === 'ready';
    if (provider === 'openai') return !!settings.apiKeys?.openai;
    if (provider === 'anthropic') return !!settings.apiKeys?.anthropic;
    if (provider === 'ollama') return !!settings.apiKeys?.ollama;
    if (provider === 'byok') return !!settings.apiKeys?.byokEndpoint && !!settings.apiKeys?.byokModel;
    return false;
  })();

  const isLoading = webllmStatus?.status === 'loading';

  const handleProviderChange = (newProvider: LLMProvider) => {
    updateSettings({ defaultLLMProvider: newProvider });
    setShowProviderSelector(false);
    // Show model selector for the new provider
    setShowModelSelector(true);
  };

  // Show provider selector
  if (showProviderSelector) {
    return (
      <div className="shrink-0 border-b border-border bg-card p-2">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground">Select Provider</span>
          <button
            onClick={() => setShowProviderSelector(false)}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          {PROVIDERS.map((p) => (
            <button
              key={p.id}
              onClick={() => handleProviderChange(p.id)}
              className={`flex items-center gap-2 p-2 rounded-lg text-left transition-colors ${
                provider === p.id
                  ? 'bg-primary/10 border border-primary/30'
                  : 'bg-muted/50 hover:bg-muted border border-transparent'
              }`}
            >
              <span className="text-lg">{p.icon}</span>
              <div className="min-w-0">
                <div className="text-xs font-medium truncate">{p.name}</div>
                <div className="text-[10px] text-muted-foreground truncate">{p.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // Show model selector
  if (showModelSelector) {
    return (
      <div className="shrink-0 border-b border-border bg-card p-2">
        <ModelSelector
          compact
          provider={provider}
          onModelReady={() => setShowModelSelector(false)}
          onDismiss={() => setShowModelSelector(false)}
        />
      </div>
    );
  }

  // Collapsed view - show current provider and model
  return (
    <div className="shrink-0 border-b border-border bg-muted/30 flex">
      {/* Provider button */}
      <button
        onClick={() => setShowProviderSelector(true)}
        className="px-2.5 py-1.5 flex items-center gap-1.5 hover:bg-muted/50 transition-colors border-r border-border"
        title="Change provider"
      >
        <span className="text-sm">{providerInfo.icon}</span>
        <span className="text-xs font-medium text-muted-foreground">{providerInfo.name}</span>
        <ChevronIcon className="w-3 h-3 text-muted-foreground" />
      </button>

      {/* Model button */}
      <button
        onClick={() => setShowModelSelector(true)}
        className="flex-1 px-2.5 py-1.5 flex items-center justify-between gap-2 hover:bg-muted/50 transition-colors min-w-0"
      >
        <span className="text-xs text-foreground truncate">{modelDisplayName}</span>
        
        <div className="flex items-center gap-2 shrink-0">
          {isLoading && (
            <span className="text-[10px] text-primary animate-pulse">
              {Math.round((webllmStatus?.progress || 0) * 100)}%
            </span>
          )}
          {needsConfiguration && !isLoading && (
            <span className="text-[10px] px-1.5 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 rounded">
              Setup
            </span>
          )}
          {isConfigured && provider === 'webllm' && (
            <span className="flex items-center gap-1 text-[10px] text-green-600 dark:text-green-400">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500" />
              Local
            </span>
          )}
          {isConfigured && provider !== 'webllm' && (
            <span className="flex items-center gap-1 text-[10px] text-blue-600 dark:text-blue-400">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
              Cloud
            </span>
          )}
          <ChevronIcon className="w-3 h-3 text-muted-foreground" />
        </div>
      </button>
    </div>
  );
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
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
