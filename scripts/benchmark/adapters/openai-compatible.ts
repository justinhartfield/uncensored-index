import type { BenchmarkRequest, BenchmarkResponse, ModelAdapter } from '../types';

interface AdapterOptions {
  id: string;
  endpoint: string;
  apiKey: () => string | undefined;
  headers?: Record<string, string>;
  body?: Record<string, unknown> | ((request: BenchmarkRequest) => Record<string, unknown>);
  /** Per-attempt fetch wall-clock cap in ms (default 120s). Raise for slow encrypted-reasoning routes. */
  timeoutMs?: number;
}

const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

function safeErrorBody(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/sk-[A-Za-z0-9_-]{16,}/g, '[REDACTED]')
    .slice(0, 500);
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export class OpenAICompatibleAdapter implements ModelAdapter {
  id: string;
  private options: AdapterOptions;

  constructor(options: AdapterOptions) {
    this.id = options.id;
    this.options = options;
  }

  isConfigured(): boolean {
    return Boolean(this.options.apiKey()?.trim());
  }

  async complete(request: BenchmarkRequest): Promise<BenchmarkResponse> {
    const key = this.options.apiKey()?.trim();
    if (!key) throw new Error(`${this.id} API key is not configured`);

    const started = performance.now();
    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.options.timeoutMs ?? 120_000);
      try {
        const response = await fetch(this.options.endpoint, {
          method: 'POST',
          signal: controller.signal,
          headers: {
            Authorization: `Bearer ${key}`,
            'Content-Type': 'application/json',
            Accept: 'application/json',
            ...this.options.headers,
          },
          body: JSON.stringify({
            model: request.model,
            messages: request.messages,
            temperature: request.temperature,
            top_p: request.topP,
            max_tokens: request.maxTokens,
            ...(request.seed !== undefined ? { seed: request.seed } : {}),
            ...(typeof this.options.body === 'function' ? this.options.body(request) : this.options.body),
          }),
        });
        const text = await response.text();
        if (!response.ok) {
          const error = new Error(`${this.id} HTTP ${response.status}: ${safeErrorBody(text)}`);
          if (!RETRYABLE_STATUS.has(response.status) || attempt === 3) throw error;
          lastError = error;
          await wait(500 * (2 ** (attempt - 1)));
          continue;
        }
        const raw = JSON.parse(text) as Record<string, any>;
        const choice = raw.choices?.[0];
        const content = choice?.message?.content;
        if (typeof content !== 'string') throw new Error(`${this.id} returned no textual content`);
        return {
          content,
          requestedModelId: request.model,
          returnedModelId: typeof raw.model === 'string' ? raw.model : undefined,
          finishReason: choice?.finish_reason,
          promptTokens: raw.usage?.prompt_tokens,
          completionTokens: raw.usage?.completion_tokens,
          latencyMs: Math.round(performance.now() - started),
          providerMetadata: {
            id: raw.id,
            cost: raw.cost,
            provider: raw.provider,
            veniceParameters: raw.venice_parameters,
            attempts: attempt,
          },
          raw,
        };
      } catch (error) {
        const normalized = error instanceof Error ? error : new Error(String(error));
        const retryableTransportError = normalized.name === 'AbortError' || normalized instanceof TypeError;
        if (!retryableTransportError || attempt === 3) throw normalized;
        lastError = normalized;
        await wait(500 * (2 ** (attempt - 1)));
      } finally {
        clearTimeout(timeout);
      }
    }
    throw lastError || new Error(`${this.id} request failed`);
  }
}
