// OpenAI Provider for MirmirOps

import type {
  LLMProviderInterface,
  LLMRequestOptions,
  LLMResponse,
  LLMStreamChunk,
  LLMMessage,
  OpenAIConfig,
} from '../types';

const DEFAULT_BASE_URL = 'https://api.openai.com/v1';

export class OpenAIProvider implements LLMProviderInterface {
  readonly provider = 'openai' as const;
  private config: OpenAIConfig;

  constructor(config: Partial<OpenAIConfig>) {
    this.config = {
      provider: 'openai',
      model: config.model || 'gpt-4o-mini',
      apiKey: config.apiKey || '',
      baseUrl: config.baseUrl || DEFAULT_BASE_URL,
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 2048,
    };
  }

  async isAvailable(): Promise<boolean> {
    return !!this.config.apiKey;
  }

  updateConfig(config: Partial<OpenAIConfig>): void {
    this.config = { ...this.config, ...config };
  }

  async complete(options: LLMRequestOptions): Promise<LLMResponse> {
    const { messages, config, signal } = options;
    const mergedConfig = { ...this.config, ...config };

    if (!mergedConfig.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const response = await fetch(`${mergedConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mergedConfig.apiKey}`,
        ...(mergedConfig.organization && { 'OpenAI-Organization': mergedConfig.organization }),
      },
      body: JSON.stringify({
        model: mergedConfig.model,
        messages: this.formatMessages(messages),
        temperature: mergedConfig.temperature,
        max_tokens: mergedConfig.maxTokens,
        top_p: mergedConfig.topP,
        frequency_penalty: mergedConfig.frequencyPenalty,
        presence_penalty: mergedConfig.presencePenalty,
      }),
      signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const choice = data.choices[0];

    return {
      content: choice.message.content || '',
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens,
            completionTokens: data.usage.completion_tokens,
            totalTokens: data.usage.total_tokens,
          }
        : undefined,
      provider: 'openai',
      model: mergedConfig.model,
      finishReason: choice.finish_reason,
    };
  }

  async *stream(options: LLMRequestOptions): AsyncGenerator<LLMStreamChunk> {
    const { messages, config, signal } = options;
    const mergedConfig = { ...this.config, ...config };

    if (!mergedConfig.apiKey) {
      throw new Error('OpenAI API key is required');
    }

    const response = await fetch(`${mergedConfig.baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mergedConfig.apiKey}`,
      },
      body: JSON.stringify({
        model: mergedConfig.model,
        messages: this.formatMessages(messages),
        temperature: mergedConfig.temperature,
        max_tokens: mergedConfig.maxTokens,
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
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
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              yield { content: '', done: true };
              return;
            }

            try {
              const parsed = JSON.parse(data);
              const delta = parsed.choices[0]?.delta?.content || '';
              if (delta) {
                yield { content: delta, done: false };
              }
            } catch {
              // Skip invalid JSON
            }
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
