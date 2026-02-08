// BYOK (Bring Your Own Key) Provider for MirmirOps
// Supports any OpenAI-compatible API endpoint

import type {
  LLMProviderInterface,
  LLMRequestOptions,
  LLMResponse,
  LLMStreamChunk,
  LLMMessage,
  BYOKConfig,
} from '../types';

export class BYOKProvider implements LLMProviderInterface {
  readonly provider = 'byok' as const;
  private config: BYOKConfig;

  constructor(config: Partial<BYOKConfig>) {
    this.config = {
      provider: 'byok',
      model: config.model || 'gpt-4o-mini',
      apiKey: config.apiKey || '',
      baseUrl: config.baseUrl || '',
      headers: config.headers || {},
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 2048,
    };
  }

  async isAvailable(): Promise<boolean> {
    return !!this.config.apiKey && !!this.config.baseUrl;
  }

  updateConfig(config: Partial<BYOKConfig>): void {
    this.config = { ...this.config, ...config };
  }

  async complete(options: LLMRequestOptions): Promise<LLMResponse> {
    const { messages, config, signal } = options;
    const mergedConfig = { ...this.config, ...config };

    if (!mergedConfig.apiKey || !mergedConfig.baseUrl) {
      throw new Error('BYOK requires both API key and base URL');
    }

    // Ensure the URL ends with /chat/completions for OpenAI-compatible APIs
    const url = mergedConfig.baseUrl.endsWith('/chat/completions')
      ? mergedConfig.baseUrl
      : `${mergedConfig.baseUrl.replace(/\/$/, '')}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mergedConfig.apiKey}`,
        ...mergedConfig.headers,
      },
      body: JSON.stringify({
        model: mergedConfig.model,
        messages: this.formatMessages(messages),
        temperature: mergedConfig.temperature,
        max_tokens: mergedConfig.maxTokens,
      }),
      signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `BYOK API error: ${response.status}`);
    }

    const data = await response.json();
    const choice = data.choices?.[0];

    return {
      content: choice?.message?.content || '',
      usage: data.usage
        ? {
            promptTokens: data.usage.prompt_tokens || 0,
            completionTokens: data.usage.completion_tokens || 0,
            totalTokens: data.usage.total_tokens || 0,
          }
        : undefined,
      provider: 'byok',
      model: mergedConfig.model,
      finishReason: choice?.finish_reason || null,
    };
  }

  async *stream(options: LLMRequestOptions): AsyncGenerator<LLMStreamChunk> {
    const { messages, config, signal } = options;
    const mergedConfig = { ...this.config, ...config };

    if (!mergedConfig.apiKey || !mergedConfig.baseUrl) {
      throw new Error('BYOK requires both API key and base URL');
    }

    const url = mergedConfig.baseUrl.endsWith('/chat/completions')
      ? mergedConfig.baseUrl
      : `${mergedConfig.baseUrl.replace(/\/$/, '')}/chat/completions`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${mergedConfig.apiKey}`,
        ...mergedConfig.headers,
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
      throw new Error(error.error?.message || `BYOK API error: ${response.status}`);
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
              const delta = parsed.choices?.[0]?.delta?.content || '';
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
