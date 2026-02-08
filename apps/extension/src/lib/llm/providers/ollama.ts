// Ollama Provider for MirmirOps

import type {
  LLMProviderInterface,
  LLMRequestOptions,
  LLMResponse,
  LLMStreamChunk,
  LLMMessage,
  OllamaConfig,
} from '../types';

const DEFAULT_OLLAMA_URL = 'http://localhost:11434';

export class OllamaProvider implements LLMProviderInterface {
  readonly provider = 'ollama' as const;
  private config: OllamaConfig;

  constructor(config: Partial<OllamaConfig>) {
    this.config = {
      provider: 'ollama',
      model: config.model || 'llama3.1',
      baseUrl: config.baseUrl || DEFAULT_OLLAMA_URL,
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 2048,
    };
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  updateConfig(config: Partial<OllamaConfig>): void {
    this.config = { ...this.config, ...config };
  }

  async listModels(): Promise<string[]> {
    try {
      const response = await fetch(`${this.config.baseUrl}/api/tags`);
      if (!response.ok) return [];
      const data = await response.json();
      return data.models?.map((m: { name: string }) => m.name) || [];
    } catch {
      return [];
    }
  }

  async complete(options: LLMRequestOptions): Promise<LLMResponse> {
    const { messages, config, signal } = options;
    const mergedConfig = { ...this.config, ...config };

    const response = await fetch(`${mergedConfig.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: mergedConfig.model,
        messages: this.formatMessages(messages),
        options: {
          temperature: mergedConfig.temperature,
          num_predict: mergedConfig.maxTokens,
        },
        stream: false,
      }),
      signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Ollama API error: ${response.status}`);
    }

    const data = await response.json();

    return {
      content: data.message?.content || '',
      usage: data.eval_count
        ? {
            promptTokens: data.prompt_eval_count || 0,
            completionTokens: data.eval_count,
            totalTokens: (data.prompt_eval_count || 0) + data.eval_count,
          }
        : undefined,
      provider: 'ollama',
      model: mergedConfig.model,
      finishReason: data.done ? 'stop' : null,
    };
  }

  async *stream(options: LLMRequestOptions): AsyncGenerator<LLMStreamChunk> {
    const { messages, config, signal } = options;
    const mergedConfig = { ...this.config, ...config };

    const response = await fetch(`${mergedConfig.baseUrl}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: mergedConfig.model,
        messages: this.formatMessages(messages),
        options: {
          temperature: mergedConfig.temperature,
          num_predict: mergedConfig.maxTokens,
        },
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error || `Ollama API error: ${response.status}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('No response body');

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.trim()) continue;

          try {
            const parsed = JSON.parse(line);
            const content = parsed.message?.content || '';

            if (content) {
              yield { content, done: false };
            }

            if (parsed.done) {
              yield {
                content: '',
                done: true,
                usage: parsed.eval_count
                  ? {
                      promptTokens: parsed.prompt_eval_count || 0,
                      completionTokens: parsed.eval_count,
                      totalTokens: (parsed.prompt_eval_count || 0) + parsed.eval_count,
                    }
                  : undefined,
              };
              return;
            }
          } catch {
            // Skip invalid JSON
          }
        }
      }
    } finally {
      reader.releaseLock();
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
