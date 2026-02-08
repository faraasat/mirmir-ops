// WebLLM Provider for MirmirOps
// Runs LLMs locally in the browser using WebGPU

import type {
  LLMProviderInterface,
  LLMRequestOptions,
  LLMResponse,
  LLMStreamChunk,
  LLMMessage,
  WebLLMConfig,
} from '../types';
import { WEBLLM_MODELS } from '../types';

// Types for WebLLM (will be imported from @mlc-ai/web-llm)
interface WebLLMEngine {
  reload: (model: string) => Promise<void>;
  chat: {
    completions: {
      create: (params: {
        messages: Array<{ role: string; content: string }>;
        temperature?: number;
        max_tokens?: number;
        stream?: boolean;
      }) => Promise<{ choices: Array<{ message: { content: string } }>; usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } }> | AsyncIterable<{ choices: Array<{ delta: { content?: string } }> }>;
    };
  };
  unload: () => Promise<void>;
}

// WebLLM loading state
export type WebLLMStatus = 'idle' | 'loading' | 'ready' | 'error';

export interface WebLLMProgress {
  status: WebLLMStatus;
  progress: number;
  text: string;
  error?: string;
}

export class WebLLMProvider implements LLMProviderInterface {
  readonly provider = 'webllm' as const;
  private config: WebLLMConfig;
  private engine: WebLLMEngine | null = null;
  private currentModel: string | null = null;
  private status: WebLLMStatus = 'idle';
  private progressCallback?: (progress: WebLLMProgress) => void;

  constructor(config: Partial<WebLLMConfig>) {
    this.config = {
      provider: 'webllm',
      model: config.model || 'Phi-3-mini-4k-instruct-q4f16_1-MLC',
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 2048,
    };
  }

  setProgressCallback(callback: (progress: WebLLMProgress) => void): void {
    this.progressCallback = callback;
  }

  private updateProgress(progress: WebLLMProgress): void {
    this.status = progress.status;
    this.progressCallback?.(progress);
  }

  async isAvailable(): Promise<boolean> {
    // Check if WebGPU is available
    if (typeof navigator === 'undefined') return false;
    
    try {
      // Check for WebGPU support
      if (!('gpu' in navigator)) {
        console.log('[WebLLM] WebGPU not supported');
        return false;
      }
      
      const gpu = (navigator as Navigator & { gpu: GPU }).gpu;
      const adapter = await gpu.requestAdapter();
      return adapter !== null;
    } catch {
      return false;
    }
  }

  async checkWebGPUSupport(): Promise<{ supported: boolean; reason?: string }> {
    if (typeof navigator === 'undefined') {
      return { supported: false, reason: 'Not in browser environment' };
    }

    if (!('gpu' in navigator)) {
      return { supported: false, reason: 'WebGPU is not supported in this browser' };
    }

    try {
      const gpu = (navigator as Navigator & { gpu: GPU }).gpu;
      const adapter = await gpu.requestAdapter();
      
      if (!adapter) {
        return { supported: false, reason: 'No WebGPU adapter found' };
      }

      return { supported: true };
    } catch (error) {
      return { 
        supported: false, 
        reason: error instanceof Error ? error.message : 'Unknown error checking WebGPU' 
      };
    }
  }

  getStatus(): WebLLMStatus {
    return this.status;
  }

  getCurrentModel(): string | null {
    return this.currentModel;
  }

  getAvailableModels() {
    return WEBLLM_MODELS;
  }

  updateConfig(config: Partial<WebLLMConfig>): void {
    this.config = { ...this.config, ...config };
  }

  async loadModel(modelId?: string): Promise<void> {
    const model = modelId || this.config.model;
    
    // If same model is already loaded, skip
    if (this.currentModel === model && this.engine) {
      return;
    }

    this.updateProgress({
      status: 'loading',
      progress: 0,
      text: `Loading ${model}...`,
    });

    try {
      // Dynamically import WebLLM
      const { CreateMLCEngine } = await import('@mlc-ai/web-llm');

      // Create engine with progress callback
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      this.engine = await CreateMLCEngine(model, {
        initProgressCallback: (report: { progress: number; text: string }) => {
          this.updateProgress({
            status: 'loading',
            progress: report.progress,
            text: report.text,
          });
        },
      }) as unknown as WebLLMEngine;

      this.currentModel = model;
      this.config.model = model;

      this.updateProgress({
        status: 'ready',
        progress: 1,
        text: `${model} loaded successfully`,
      });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to load model';
      this.updateProgress({
        status: 'error',
        progress: 0,
        text: errorMessage,
        error: errorMessage,
      });
      throw error;
    }
  }

  async unloadModel(): Promise<void> {
    if (this.engine) {
      await this.engine.unload();
      this.engine = null;
      this.currentModel = null;
      this.status = 'idle';
    }
  }

  async complete(options: LLMRequestOptions): Promise<LLMResponse> {
    const { messages, config } = options;
    const mergedConfig = { ...this.config, ...config };

    // Ensure model is loaded
    if (!this.engine || this.currentModel !== mergedConfig.model) {
      await this.loadModel(mergedConfig.model);
    }

    if (!this.engine) {
      throw new Error('WebLLM engine not initialized');
    }

    const response = await this.engine.chat.completions.create({
      messages: this.formatMessages(messages),
      temperature: mergedConfig.temperature,
      max_tokens: mergedConfig.maxTokens,
      stream: false,
    });

    // Handle non-streaming response
    const result = response as { 
      choices: Array<{ message: { content: string } }>; 
      usage?: { prompt_tokens: number; completion_tokens: number; total_tokens: number } 
    };

    return {
      content: result.choices[0]?.message?.content || '',
      usage: result.usage
        ? {
            promptTokens: result.usage.prompt_tokens,
            completionTokens: result.usage.completion_tokens,
            totalTokens: result.usage.total_tokens,
          }
        : undefined,
      provider: 'webllm',
      model: mergedConfig.model,
      finishReason: 'stop',
    };
  }

  async *stream(options: LLMRequestOptions): AsyncGenerator<LLMStreamChunk> {
    const { messages, config } = options;
    const mergedConfig = { ...this.config, ...config };

    // Ensure model is loaded
    if (!this.engine || this.currentModel !== mergedConfig.model) {
      await this.loadModel(mergedConfig.model);
    }

    if (!this.engine) {
      throw new Error('WebLLM engine not initialized');
    }

    const streamResponse = await this.engine.chat.completions.create({
      messages: this.formatMessages(messages),
      temperature: mergedConfig.temperature,
      max_tokens: mergedConfig.maxTokens,
      stream: true,
    });

    // Handle streaming response
    const asyncIterable = streamResponse as AsyncIterable<{ 
      choices: Array<{ delta: { content?: string } }> 
    }>;

    for await (const chunk of asyncIterable) {
      const content = chunk.choices[0]?.delta?.content || '';
      if (content) {
        yield { content, done: false };
      }
    }

    yield { content: '', done: true };
  }

  private formatMessages(messages: LLMMessage[]) {
    return messages.map(msg => ({
      role: msg.role,
      content: msg.content,
    }));
  }
}

// Singleton instance for the extension
let webllmInstance: WebLLMProvider | null = null;

export function getWebLLMProvider(): WebLLMProvider {
  if (!webllmInstance) {
    webllmInstance = new WebLLMProvider({});
  }
  return webllmInstance;
}
