// Anthropic Provider for MirmirOps

import type {
  LLMProviderInterface,
  LLMRequestOptions,
  LLMResponse,
  LLMStreamChunk,
  LLMMessage,
  AnthropicConfig,
} from '../types';

const ANTHROPIC_API_URL = 'https://api.anthropic.com/v1';

export class AnthropicProvider implements LLMProviderInterface {
  readonly provider = 'anthropic' as const;
  private config: AnthropicConfig;

  constructor(config: Partial<AnthropicConfig>) {
    this.config = {
      provider: 'anthropic',
      model: config.model || 'claude-3-5-sonnet-20241022',
      apiKey: config.apiKey || '',
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 2048,
    };
  }

  async isAvailable(): Promise<boolean> {
    return !!this.config.apiKey;
  }

  updateConfig(config: Partial<AnthropicConfig>): void {
    this.config = { ...this.config, ...config };
  }

  async complete(options: LLMRequestOptions): Promise<LLMResponse> {
    const { messages, config, signal } = options;
    const mergedConfig = { ...this.config, ...config };

    if (!mergedConfig.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    const { systemPrompt, formattedMessages } = this.formatMessages(messages);

    const response = await fetch(`${ANTHROPIC_API_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': mergedConfig.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: mergedConfig.model,
        max_tokens: mergedConfig.maxTokens,
        temperature: mergedConfig.temperature,
        system: systemPrompt,
        messages: formattedMessages,
      }),
      signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Anthropic API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.content[0]?.text || '';

    return {
      content,
      usage: data.usage
        ? {
            promptTokens: data.usage.input_tokens,
            completionTokens: data.usage.output_tokens,
            totalTokens: data.usage.input_tokens + data.usage.output_tokens,
          }
        : undefined,
      provider: 'anthropic',
      model: mergedConfig.model,
      finishReason: data.stop_reason,
    };
  }

  async *stream(options: LLMRequestOptions): AsyncGenerator<LLMStreamChunk> {
    const { messages, config, signal } = options;
    const mergedConfig = { ...this.config, ...config };

    if (!mergedConfig.apiKey) {
      throw new Error('Anthropic API key is required');
    }

    const { systemPrompt, formattedMessages } = this.formatMessages(messages);

    const response = await fetch(`${ANTHROPIC_API_URL}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': mergedConfig.apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: mergedConfig.model,
        max_tokens: mergedConfig.maxTokens,
        temperature: mergedConfig.temperature,
        system: systemPrompt,
        messages: formattedMessages,
        stream: true,
      }),
      signal,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({}));
      throw new Error(error.error?.message || `Anthropic API error: ${response.status}`);
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

            try {
              const parsed = JSON.parse(data);

              if (parsed.type === 'content_block_delta') {
                const delta = parsed.delta?.text || '';
                if (delta) {
                  yield { content: delta, done: false };
                }
              } else if (parsed.type === 'message_stop') {
                yield { content: '', done: true };
                return;
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

  private formatMessages(messages: LLMMessage[]): {
    systemPrompt: string;
    formattedMessages: Array<{ role: 'user' | 'assistant'; content: string }>;
  } {
    let systemPrompt = '';
    const formattedMessages: Array<{ role: 'user' | 'assistant'; content: string }> = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemPrompt += (systemPrompt ? '\n' : '') + msg.content;
      } else {
        formattedMessages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    return { systemPrompt, formattedMessages };
  }
}
