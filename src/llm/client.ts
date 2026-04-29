import OpenAI from 'openai';
import type { Provider } from '../config/schema';

export interface LLMMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface LLMResponse {
  content: string;
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export interface StreamCallbacks {
  onToken?: (token: string) => void;
  onComplete?: (response: LLMResponse) => void;
  onError?: (error: Error) => void;
}

export class LLMClient {
  private clients: Map<string, OpenAI> = new Map();
  private providers: Map<string, Provider> = new Map();

  constructor(providers: Provider[]) {
    for (const provider of providers) {
      this.providers.set(provider.name, provider);
      this.clients.set(provider.name, new OpenAI({
        apiKey: provider.api_key,
        baseURL: provider.base_url,
      }));
    }
  }

  getClient(providerName: string): OpenAI {
    const client = this.clients.get(providerName);
    if (!client) {
      throw new Error(`提供商 "${providerName}" 未配置。请在 ~/.openagents/config.yaml 中添加配置。`);
    }
    return client;
  }

  getProvider(providerName: string): Provider {
    const provider = this.providers.get(providerName);
    if (!provider) {
      throw new Error(`提供商 "${providerName}" 未配置。`);
    }
    return provider;
  }

  async chat(
    providerName: string,
    model: string,
    messages: LLMMessage[],
    options?: {
      temperature?: number;
      max_tokens?: number;
    }
  ): Promise<LLMResponse> {
    const client = this.getClient(providerName);

    const response = await client.chat.completions.create({
      model,
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.max_tokens,
    });

    const choice = response.choices[0];
    return {
      content: choice.message?.content || '',
      usage: response.usage ? {
        prompt_tokens: response.usage.prompt_tokens,
        completion_tokens: response.usage.completion_tokens,
        total_tokens: response.usage.total_tokens,
      } : undefined,
    };
  }

  async streamChat(
    providerName: string,
    model: string,
    messages: LLMMessage[],
    callbacks: StreamCallbacks,
    options?: {
      temperature?: number;
      max_tokens?: number;
    }
  ): Promise<void> {
    const client = this.getClient(providerName);

    try {
      const stream = await client.chat.completions.create({
        model,
        messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.max_tokens,
        stream: true,
      });

      let fullContent = '';
      let usage: LLMResponse['usage'];

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta;
        if (delta?.content) {
          fullContent += delta.content;
          callbacks.onToken?.(delta.content);
        }
        if (chunk.usage) {
          usage = {
            prompt_tokens: chunk.usage.prompt_tokens,
            completion_tokens: chunk.usage.completion_tokens,
            total_tokens: chunk.usage.total_tokens,
          };
        }
      }

      callbacks.onComplete?.({
        content: fullContent,
        usage,
      });
    } catch (error) {
      callbacks.onError?.(error as Error);
    }
  }

  listProviders(): string[] {
    return Array.from(this.providers.keys());
  }

  listModels(providerName: string): string[] {
    const provider = this.providers.get(providerName);
    if (!provider) return [];
    return [provider.default_model || 'default'];
  }
}
