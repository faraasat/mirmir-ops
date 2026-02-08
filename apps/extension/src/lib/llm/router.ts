// LLM Router - Routes requests to appropriate provider

import type {
  LLMProvider,
  LLMConfig,
  LLMRequestOptions,
  LLMResponse,
  LLMStreamChunk,
  LLMProviderInterface,
} from './types';
import { DEFAULT_MODELS } from './types';
import { OpenAIProvider } from './providers/openai';
import { AnthropicProvider } from './providers/anthropic';
import { OllamaProvider } from './providers/ollama';
import { BYOKProvider } from './providers/byok';

export interface RouterConfig {
  defaultProvider: LLMProvider;
  providers: {
    openai?: { apiKey: string; organization?: string };
    anthropic?: { apiKey: string };
    ollama?: { baseUrl: string };
    byok?: { apiKey: string; baseUrl: string; headers?: Record<string, string> };
    webllm?: { model: string };
  };
  fallbackOrder?: LLMProvider[];
}

export class LLMRouter {
  private config: RouterConfig;
  private providers: Map<LLMProvider, LLMProviderInterface> = new Map();

  constructor(config: RouterConfig) {
    this.config = config;
    this.initializeProviders();
  }

  private initializeProviders(): void {
    // Initialize OpenAI
    if (this.config.providers.openai?.apiKey) {
      this.providers.set(
        'openai',
        new OpenAIProvider({
          apiKey: this.config.providers.openai.apiKey,
          organization: this.config.providers.openai.organization,
        })
      );
    }

    // Initialize Anthropic
    if (this.config.providers.anthropic?.apiKey) {
      this.providers.set(
        'anthropic',
        new AnthropicProvider({
          apiKey: this.config.providers.anthropic.apiKey,
        })
      );
    }

    // Initialize Ollama
    if (this.config.providers.ollama?.baseUrl) {
      this.providers.set(
        'ollama',
        new OllamaProvider({
          baseUrl: this.config.providers.ollama.baseUrl,
        })
      );
    }

    // Initialize BYOK
    if (this.config.providers.byok?.apiKey && this.config.providers.byok?.baseUrl) {
      this.providers.set(
        'byok',
        new BYOKProvider({
          apiKey: this.config.providers.byok.apiKey,
          baseUrl: this.config.providers.byok.baseUrl,
          headers: this.config.providers.byok.headers,
        })
      );
    }
  }

  setWebLLMProvider(provider: LLMProviderInterface): void {
    this.providers.set('webllm', provider);
  }

  updateProviderConfig(provider: LLMProvider, config: Partial<LLMConfig>): void {
    const existingProvider = this.providers.get(provider);
    if (existingProvider && 'updateConfig' in existingProvider) {
      (existingProvider as { updateConfig: (config: Partial<LLMConfig>) => void }).updateConfig(
        config
      );
    }
  }

  async isProviderAvailable(provider: LLMProvider): Promise<boolean> {
    const p = this.providers.get(provider);
    if (!p) return false;
    return p.isAvailable();
  }

  async getAvailableProviders(): Promise<LLMProvider[]> {
    const available: LLMProvider[] = [];
    for (const [provider, p] of this.providers) {
      if (await p.isAvailable()) {
        available.push(provider);
      }
    }
    return available;
  }

  async complete(options: LLMRequestOptions & { provider?: LLMProvider }): Promise<LLMResponse> {
    const provider = options.provider || this.config.defaultProvider;
    const p = this.providers.get(provider);

    if (!p) {
      throw new Error(`Provider ${provider} is not configured`);
    }

    const isAvailable = await p.isAvailable();
    if (!isAvailable) {
      // Try fallback providers
      const fallbackProvider = await this.findAvailableFallback(provider);
      if (fallbackProvider) {
        console.log(`[LLM Router] Falling back from ${provider} to ${fallbackProvider.provider}`);
        return fallbackProvider.complete({
          ...options,
          config: {
            ...options.config,
            model: DEFAULT_MODELS[fallbackProvider.provider],
          },
        });
      }
      throw new Error(`Provider ${provider} is not available and no fallback found`);
    }

    return p.complete(options);
  }

  async *stream(
    options: LLMRequestOptions & { provider?: LLMProvider }
  ): AsyncGenerator<LLMStreamChunk> {
    const provider = options.provider || this.config.defaultProvider;
    const p = this.providers.get(provider);

    if (!p) {
      throw new Error(`Provider ${provider} is not configured`);
    }

    const isAvailable = await p.isAvailable();
    if (!isAvailable) {
      // Try fallback providers
      const fallbackProvider = await this.findAvailableFallback(provider);
      if (fallbackProvider) {
        console.log(`[LLM Router] Falling back from ${provider} to ${fallbackProvider.provider}`);
        yield* fallbackProvider.stream({
          ...options,
          config: {
            ...options.config,
            model: DEFAULT_MODELS[fallbackProvider.provider],
          },
        });
        return;
      }
      throw new Error(`Provider ${provider} is not available and no fallback found`);
    }

    yield* p.stream(options);
  }

  private async findAvailableFallback(
    excludeProvider: LLMProvider
  ): Promise<LLMProviderInterface | null> {
    const fallbackOrder = this.config.fallbackOrder || ['webllm', 'ollama', 'openai', 'anthropic'];

    for (const provider of fallbackOrder) {
      if (provider === excludeProvider) continue;

      const p = this.providers.get(provider);
      if (p && (await p.isAvailable())) {
        return p;
      }
    }

    return null;
  }
}

// Create a singleton instance
let routerInstance: LLMRouter | null = null;

export function createLLMRouter(config: RouterConfig): LLMRouter {
  routerInstance = new LLMRouter(config);
  return routerInstance;
}

export function getLLMRouter(): LLMRouter | null {
  return routerInstance;
}
