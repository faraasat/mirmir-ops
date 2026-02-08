import { useState, useEffect } from 'react';
import { useAppStore } from '../../store/app-store';
import { useLLM } from '../../hooks/useLLM';
import type { WebLLMProgress } from '@/lib/llm';

// Available WebLLM models with their info
const WEBLLM_MODELS = [
  {
    id: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 1B',
    size: '~700MB',
    description: 'Fast, lightweight model for basic tasks',
    recommended: true,
  },
  {
    id: 'Llama-3.2-3B-Instruct-q4f16_1-MLC',
    name: 'Llama 3.2 3B',
    size: '~1.8GB',
    description: 'Balanced performance and capability',
  },
  {
    id: 'Phi-3.5-mini-instruct-q4f16_1-MLC',
    name: 'Phi 3.5 Mini',
    size: '~2.3GB',
    description: 'Great for reasoning and coding',
  },
  {
    id: 'gemma-2-2b-it-q4f16_1-MLC',
    name: 'Gemma 2 2B',
    size: '~1.5GB',
    description: 'Google\'s efficient small model',
  },
  {
    id: 'Qwen2.5-1.5B-Instruct-q4f16_1-MLC',
    name: 'Qwen 2.5 1.5B',
    size: '~1GB',
    description: 'Multilingual support',
  },
];

interface ModelSelectorProps {
  onModelReady?: () => void;
  onDismiss?: () => void;
  compact?: boolean;
}

export function ModelSelector({ onModelReady, onDismiss, compact = false }: ModelSelectorProps) {
  const { settings, updateSettings } = useAppStore();
  const { webllmStatus, loadWebLLM, checkWebGPU } = useLLM({});
  const [selectedModel, setSelectedModel] = useState(settings.defaultModel || WEBLLM_MODELS[0].id);
  const [isLoading, setIsLoading] = useState(false);
  const [webGPUSupported, setWebGPUSupported] = useState<boolean | null>(null);
  const [webGPUReason, setWebGPUReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    checkWebGPU().then(({ supported, reason }) => {
      setWebGPUSupported(supported);
      if (reason) setWebGPUReason(reason);
    });
  }, [checkWebGPU]);

  const handleLoadModel = async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await updateSettings({ defaultModel: selectedModel });
      await loadWebLLM(selectedModel);
      onModelReady?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load model');
    } finally {
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
        return `Loading... ${getProgressPercent(status)}%`;
      case 'downloading':
        return `Downloading... ${getProgressPercent(status)}%`;
      case 'ready':
        return 'Model ready!';
      case 'error':
        return 'Error loading model';
      default:
        return status.text || 'Processing...';
    }
  };

  if (webGPUSupported === false) {
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

  if (compact) {
    return (
      <div className="p-3 bg-card border border-border rounded-xl">
        <div className="flex items-center justify-between gap-2 mb-2">
          <span className="text-xs font-medium">Select AI Model</span>
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
          {WEBLLM_MODELS.map((model) => (
            <option key={model.id} value={model.id}>
              {model.name} ({model.size})
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
          onClick={handleLoadModel}
          disabled={isLoading || webllmStatus?.status === 'ready'}
          className="w-full btn-primary text-xs py-1.5 rounded-lg disabled:opacity-50"
        >
          {isLoading ? 'Loading...' : webllmStatus?.status === 'ready' ? 'Model Ready' : 'Load Model'}
        </button>
      </div>
    );
  }

  return (
    <div className="p-4 bg-card border border-border rounded-xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold">Select AI Model</h3>
        {onDismiss && (
          <button 
            onClick={onDismiss}
            className="text-muted-foreground hover:text-foreground"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground mb-4">
        Choose a local AI model to power your browser assistant. The model will be downloaded and run entirely on your device.
      </p>
      
      <div className="space-y-2 mb-4 max-h-64 overflow-y-auto">
        {WEBLLM_MODELS.map((model) => (
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
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{model.name}</span>
                <span className="text-[10px] text-muted-foreground bg-secondary px-1.5 py-0.5 rounded">
                  {model.size}
                </span>
                {model.recommended && (
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
      
      {/* Progress bar */}
      {webllmStatus && webllmStatus.status !== 'idle' && webllmStatus.status !== 'ready' && (
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
        onClick={handleLoadModel}
        disabled={isLoading || webllmStatus?.status === 'ready'}
        className="w-full btn-primary py-2.5 rounded-lg font-medium disabled:opacity-50"
      >
        {isLoading ? (
          <span className="flex items-center justify-center gap-2">
            <LoadingSpinner className="w-4 h-4" />
            Loading Model...
          </span>
        ) : webllmStatus?.status === 'ready' ? (
          'Model Ready'
        ) : (
          'Download & Load Model'
        )}
      </button>
      
      <p className="text-[10px] text-muted-foreground text-center mt-2">
        First download may take a few minutes depending on your connection
      </p>
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
