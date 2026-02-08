// Dynamic model fetching from various LLM providers

export interface FetchedModel {
  id: string;
  name: string;
  description?: string;
  context_length?: number;
  owned_by?: string;
}

/**
 * Fetch available models from OpenAI
 */
export async function fetchOpenAIModels(apiKey: string): Promise<FetchedModel[]> {
  try {
    const response = await fetch('https://api.openai.com/v1/models', {
      headers: {
        'Authorization': `Bearer ${apiKey}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data = await response.json();
    
    // Filter to only show chat/completion models
    const chatModels = (data.data as Array<{ id: string; owned_by: string }>)
      .filter(model => 
        model.id.includes('gpt') || 
        model.id.includes('o1') ||
        model.id.includes('chatgpt')
      )
      .filter(model => 
        !model.id.includes('instruct') &&
        !model.id.includes('vision') &&
        !model.id.includes('realtime') &&
        !model.id.includes('audio')
      )
      .sort((a, b) => {
        // Sort by model family and version
        const order = ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5', 'o1'];
        const aIndex = order.findIndex(o => a.id.startsWith(o));
        const bIndex = order.findIndex(o => b.id.startsWith(o));
        return (aIndex === -1 ? 999 : aIndex) - (bIndex === -1 ? 999 : bIndex);
      })
      .map(model => ({
        id: model.id,
        name: formatOpenAIModelName(model.id),
        description: getOpenAIModelDescription(model.id),
        owned_by: model.owned_by,
      }));

    return chatModels;
  } catch (error) {
    console.error('[ModelFetcher] Failed to fetch OpenAI models:', error);
    throw error;
  }
}

function formatOpenAIModelName(id: string): string {
  const names: Record<string, string> = {
    'gpt-4o': 'GPT-4o',
    'gpt-4o-mini': 'GPT-4o Mini',
    'gpt-4o-2024-11-20': 'GPT-4o (Nov 2024)',
    'gpt-4o-2024-08-06': 'GPT-4o (Aug 2024)',
    'gpt-4o-2024-05-13': 'GPT-4o (May 2024)',
    'gpt-4o-mini-2024-07-18': 'GPT-4o Mini (Jul 2024)',
    'gpt-4-turbo': 'GPT-4 Turbo',
    'gpt-4-turbo-preview': 'GPT-4 Turbo Preview',
    'gpt-4-turbo-2024-04-09': 'GPT-4 Turbo (Apr 2024)',
    'gpt-4': 'GPT-4',
    'gpt-4-0613': 'GPT-4 (Jun 2023)',
    'gpt-3.5-turbo': 'GPT-3.5 Turbo',
    'gpt-3.5-turbo-0125': 'GPT-3.5 Turbo (Jan 2025)',
    'gpt-3.5-turbo-1106': 'GPT-3.5 Turbo (Nov 2023)',
    'o1-preview': 'O1 Preview',
    'o1-mini': 'O1 Mini',
  };
  return names[id] || id;
}

function getOpenAIModelDescription(id: string): string {
  if (id.includes('gpt-4o-mini')) return 'Fast and affordable';
  if (id.includes('gpt-4o')) return 'Most capable, multimodal';
  if (id.includes('gpt-4-turbo')) return 'High capability with vision';
  if (id.includes('gpt-4')) return 'High capability';
  if (id.includes('gpt-3.5')) return 'Fast and cost-effective';
  if (id.includes('o1')) return 'Advanced reasoning';
  return '';
}

/**
 * Fetch available models from Anthropic
 * Note: Anthropic doesn't have a models endpoint, so we return known models
 */
export async function fetchAnthropicModels(apiKey: string): Promise<FetchedModel[]> {
  // Verify API key is valid by making a simple request
  try {
    // Anthropic doesn't have a models list endpoint, but we can validate the key
    // by checking if it has the right format
    if (!apiKey.startsWith('sk-ant-')) {
      throw new Error('Invalid Anthropic API key format');
    }

    // Return known Claude models
    return [
      { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Latest, most capable' },
      { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Fast and efficient' },
      { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most powerful' },
      { id: 'claude-3-sonnet-20240229', name: 'Claude 3 Sonnet', description: 'Balanced performance' },
      { id: 'claude-3-haiku-20240307', name: 'Claude 3 Haiku', description: 'Fastest, most compact' },
    ];
  } catch (error) {
    console.error('[ModelFetcher] Failed to validate Anthropic key:', error);
    throw error;
  }
}

/**
 * Fetch available models from Ollama server
 */
export async function fetchOllamaModels(baseUrl: string): Promise<FetchedModel[]> {
  try {
    const url = baseUrl.endsWith('/') ? baseUrl : baseUrl + '/';
    const response = await fetch(`${url}api/tags`);

    if (!response.ok) {
      throw new Error(`Failed to fetch Ollama models: ${response.status}`);
    }

    const data = await response.json();
    
    return (data.models as Array<{ name: string; size: number; modified_at: string }>).map(model => ({
      id: model.name,
      name: model.name.split(':')[0],
      description: `Size: ${formatBytes(model.size)}`,
    }));
  } catch (error) {
    console.error('[ModelFetcher] Failed to fetch Ollama models:', error);
    throw error;
  }
}

/**
 * Fetch models from a BYOK (OpenAI-compatible) endpoint
 */
export async function fetchBYOKModels(endpoint: string, apiKey?: string): Promise<FetchedModel[]> {
  try {
    const url = endpoint.endsWith('/') ? endpoint : endpoint + '/';
    const modelsUrl = url.includes('/v1') ? `${url}models` : `${url}v1/models`;
    
    const headers: Record<string, string> = {};
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`;
    }

    const response = await fetch(modelsUrl, { headers });

    if (!response.ok) {
      // Many custom endpoints don't have a models endpoint
      // Return empty and let user specify manually
      console.log('[ModelFetcher] BYOK endpoint does not support model listing');
      return [];
    }

    const data = await response.json();
    
    if (data.data && Array.isArray(data.data)) {
      return data.data.map((model: { id: string; owned_by?: string }) => ({
        id: model.id,
        name: model.id,
        owned_by: model.owned_by,
      }));
    }

    return [];
  } catch (error) {
    console.error('[ModelFetcher] Failed to fetch BYOK models:', error);
    // Don't throw - BYOK might not support model listing
    return [];
  }
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}
