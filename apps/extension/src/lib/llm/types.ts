// LLM Types for MirmirOps

export type LLMProvider = 'webllm' | 'openai' | 'anthropic' | 'ollama' | 'byok';

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  frequencyPenalty?: number;
  presencePenalty?: number;
}

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMRequestOptions {
  messages: LLMMessage[];
  config?: Partial<LLMConfig>;
  stream?: boolean;
  signal?: AbortSignal;
}

export interface LLMUsage {
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
}

export interface LLMResponse {
  content: string;
  usage?: LLMUsage;
  provider: LLMProvider;
  model: string;
  finishReason?: 'stop' | 'length' | 'content_filter' | 'tool_calls' | null;
}

export interface LLMStreamChunk {
  content: string;
  done: boolean;
  usage?: LLMUsage;
}

export interface LLMProviderInterface {
  readonly provider: LLMProvider;
  isAvailable(): Promise<boolean>;
  complete(options: LLMRequestOptions): Promise<LLMResponse>;
  stream(options: LLMRequestOptions): AsyncGenerator<LLMStreamChunk>;
}

// Provider-specific configurations
export interface OpenAIConfig extends LLMConfig {
  provider: 'openai';
  apiKey: string;
  baseUrl?: string;
  organization?: string;
}

export interface AnthropicConfig extends LLMConfig {
  provider: 'anthropic';
  apiKey: string;
}

export interface OllamaConfig extends LLMConfig {
  provider: 'ollama';
  baseUrl: string; // e.g., http://localhost:11434
}

export interface BYOKConfig extends LLMConfig {
  provider: 'byok';
  apiKey: string;
  baseUrl: string;
  headers?: Record<string, string>;
}

export interface WebLLMConfig extends LLMConfig {
  provider: 'webllm';
  model: string;
}

// Model definitions
export interface ModelInfo {
  id: string;
  name: string;
  provider: LLMProvider;
  contextLength: number;
  description?: string;
}

export const OPENAI_MODELS: ModelInfo[] = [
  { id: 'gpt-4o', name: 'GPT-4o', provider: 'openai', contextLength: 128000, description: 'Most capable model' },
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini', provider: 'openai', contextLength: 128000, description: 'Fast and affordable' },
  { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', provider: 'openai', contextLength: 128000, description: 'High performance' },
  { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', provider: 'openai', contextLength: 16385, description: 'Fast and efficient' },
];

export const ANTHROPIC_MODELS: ModelInfo[] = [
  { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', provider: 'anthropic', contextLength: 200000, description: 'Best balance' },
  { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', provider: 'anthropic', contextLength: 200000, description: 'Most capable' },
  { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', provider: 'anthropic', contextLength: 200000, description: 'Fast and light' },
];

export const WEBLLM_MODELS: ModelInfo[] = [
  { id: 'Qwen2-0.5B-Instruct-q4f16_1-MLC', name: 'Qwen2 0.5B', provider: 'webllm', contextLength: 4096, description: 'Ultra-fast, basic tasks' },
  { id: 'Phi-3-mini-4k-instruct-q4f16_1-MLC', name: 'Phi-3 Mini 4K', provider: 'webllm', contextLength: 4096, description: 'Fast responses' },
  { id: 'Llama-3.1-8B-Instruct-q4f16_1-MLC', name: 'Llama 3.1 8B', provider: 'webllm', contextLength: 8192, description: 'High quality' },
];

export const DEFAULT_MODELS: Record<LLMProvider, string> = {
  webllm: 'Phi-3-mini-4k-instruct-q4f16_1-MLC',
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-sonnet-20241022',
  ollama: 'llama3.1',
  byok: 'gpt-4o-mini',
};
