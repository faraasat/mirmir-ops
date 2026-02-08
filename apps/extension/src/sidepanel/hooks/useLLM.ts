// React hook for LLM interactions

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  LLMRouter,
  createLLMRouter,
  getLLMRouter,
  getWebLLMProvider,
  type LLMProvider,
  type LLMMessage,
  type LLMResponse,
  type WebLLMProgress,
} from '@/lib/llm';
import { useAppStore } from '../store/app-store';

export interface UseLLMOptions {
  onStream?: (content: string) => void;
  onComplete?: (content: string) => void; // Called when streaming finishes with full content
  onError?: (error: Error) => void;
}

export interface UseLLMReturn {
  isLoading: boolean;
  isStreaming: boolean;
  webllmStatus: WebLLMProgress | null;
  error: string | null;
  complete: (messages: LLMMessage[], provider?: LLMProvider) => Promise<LLMResponse | null>;
  stream: (messages: LLMMessage[], provider?: LLMProvider) => Promise<string>;
  cancel: () => void;
  loadWebLLM: (modelId?: string) => Promise<void>;
  checkWebGPU: () => Promise<{ supported: boolean; reason?: string }>;
}

export function useLLM(options: UseLLMOptions = {}): UseLLMReturn {
  const { settings, webllmStatus, setWebLLMStatus } = useAppStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const routerRef = useRef<LLMRouter | null>(null);

  // Initialize router on mount and reconnect progress callback
  useEffect(() => {
    let router = getLLMRouter();
    
    if (!router) {
      router = createLLMRouter({
        defaultProvider: settings.defaultLLMProvider,
        providers: {
          openai: settings.apiKeys?.openai ? { apiKey: settings.apiKeys.openai } : undefined,
          anthropic: settings.apiKeys?.anthropic ? { apiKey: settings.apiKeys.anthropic } : undefined,
          ollama: settings.apiKeys?.ollama ? { baseUrl: settings.apiKeys.ollama } : undefined,
          byok: settings.apiKeys?.byok
            ? { apiKey: settings.apiKeys.byok, baseUrl: settings.apiKeys.byok }
            : undefined,
        },
        fallbackOrder: ['webllm', 'ollama', 'openai', 'anthropic'],
      });
    }

    // Set up WebLLM provider with global store callback
    // This ensures progress updates are stored globally and persist across tab switches
    const webllm = getWebLLMProvider();
    webllm.setProgressCallback((progress: WebLLMProgress) => {
      setWebLLMStatus(progress);
    });
    router.setWebLLMProvider(webllm);

    routerRef.current = router;

    return () => {
      // Cleanup - only abort pending requests, don't disconnect progress callback
      abortControllerRef.current?.abort();
    };
  }, [settings, setWebLLMStatus]);

  const complete = useCallback(
    async (messages: LLMMessage[], provider?: LLMProvider): Promise<LLMResponse | null> => {
      if (!routerRef.current) {
        setError('LLM router not initialized');
        return null;
      }

      setIsLoading(true);
      setError(null);
      abortControllerRef.current = new AbortController();

      try {
        const response = await routerRef.current.complete({
          messages,
          provider: provider || settings.defaultLLMProvider,
          signal: abortControllerRef.current.signal,
        });

        // Call onComplete with the content string
        if (response) {
          options.onComplete?.(response.content);
        }
        return response;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'LLM request failed';
        setError(errorMessage);
        options.onError?.(err instanceof Error ? err : new Error(errorMessage));
        return null;
      } finally {
        setIsLoading(false);
        abortControllerRef.current = null;
      }
    },
    [settings.defaultLLMProvider, options]
  );

  const stream = useCallback(
    async (messages: LLMMessage[], provider?: LLMProvider): Promise<string> => {
      if (!routerRef.current) {
        setError('LLM router not initialized');
        return '';
      }

      setIsLoading(true);
      setIsStreaming(true);
      setError(null);
      abortControllerRef.current = new AbortController();

      let fullContent = '';

      try {
        const streamGenerator = routerRef.current.stream({
          messages,
          provider: provider || settings.defaultLLMProvider,
          signal: abortControllerRef.current.signal,
        });

        for await (const chunk of streamGenerator) {
          if (chunk.content) {
            fullContent += chunk.content;
            options.onStream?.(fullContent);
          }
        }

        // Call onComplete with final content
        options.onComplete?.(fullContent);
        
        return fullContent;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'LLM stream failed';
        setError(errorMessage);
        options.onError?.(err instanceof Error ? err : new Error(errorMessage));
        return fullContent;
      } finally {
        setIsLoading(false);
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [settings.defaultLLMProvider, options]
  );

  const cancel = useCallback(() => {
    abortControllerRef.current?.abort();
    setIsLoading(false);
    setIsStreaming(false);
  }, []);

  const loadWebLLM = useCallback(async (modelId?: string) => {
    const webllm = getWebLLMProvider();
    await webllm.loadModel(modelId);
  }, []);

  const checkWebGPU = useCallback(async () => {
    const webllm = getWebLLMProvider();
    return webllm.checkWebGPUSupport();
  }, []);

  return {
    isLoading,
    isStreaming,
    webllmStatus,
    error,
    complete,
    stream,
    cancel,
    loadWebLLM,
    checkWebGPU,
  };
}
