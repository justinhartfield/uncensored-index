import type { BenchmarkRequest, BenchmarkResponse, ModelAdapter } from '../types';

interface AdapterOptions {
  id: string;
  endpoint: string;
  apiKey: () => string | undefined;
  headers?: Record<string, string>;
  body?: Record<string, unknown> | ((request: BenchmarkRequest) => Record<string, unknown>);
  /** Per-attempt fetch wall-clock cap in ms (default 120s). Raise for slow encrypted-reasoning routes. */
  timeoutMs?: number;
  /** Max total attempts per request (default 3). Raise for shared-pool provider 429s. */
  maxAttempts?: number;
  /** Exponential-backoff base in ms (default 500). */
  retryBaseMs?: number;
  /** Backoff ceiling in ms (default 30_000). */
  retryMaxMs?: number;
  /** Honor the Retry-After response header when present (default true). */
  honorRetryAfter?: boolean;
}

const RETRYABLE_STATUS = new Set([408, 409, 425, 429, 500, 502, 503, 504]);

const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_BASE_MS = 500;
const DEFAULT_RETRY_MAX_MS = 30_000;

/**
 * Jittered exponential backoff: base * 2^(attempt-1), capped at maxMs, then
 * multiplied by a 0.5–1.0 jitter factor so a burst of retries doesn't thundering-herd.
 * Default `random` is Math.random; tests inject a fixed source for determinism.
 */
export function jitteredBackoffMs(
  baseMs: number,
  maxMs: number,
  attempt: number,
  random: () => number = Math.random,
): number {
  const exp = Math.min(maxMs, baseMs * 2 ** (attempt - 1));
  const factor = 0.5 + random() * 0.5;
  return Math.round(exp * factor);
}

/** Parse an HTTP `Retry-After` header value (seconds) into ms; 0 when absent/invalid. */
export function parseRetryAfterMs(value: string | null | undefined): number {
  if (!value) return 0;
  const seconds = Number(value);
  return Number.isFinite(seconds) && seconds >= 0 ? Math.round(seconds * 1000) : 0;
}

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

    const maxAttempts = this.options.maxAttempts ?? DEFAULT_MAX_ATTEMPTS;
    const baseMs = this.options.retryBaseMs ?? DEFAULT_RETRY_BASE_MS;
    const maxMs = this.options.retryMaxMs ?? DEFAULT_RETRY_MAX_MS;
    const honorRetryAfter = this.options.honorRetryAfter ?? true;

    const started = performance.now();
    let lastError: Error | undefined;
    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
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
          if (!RETRYABLE_STATUS.has(response.status) || attempt === maxAttempts) throw error;
          lastError = error;
          const retryAfter = honorRetryAfter ? parseRetryAfterMs(response.headers.get('Retry-After')) : 0;
          // Respect an explicit Retry-After when the provider asks for it, else use
          // jittered exponential backoff. Never below a floor so quick bursts still spread.
          await wait(Math.max(retryAfter, jitteredBackoffMs(baseMs, maxMs, attempt)));
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
        if (!retryableTransportError || attempt === maxAttempts) throw normalized;
        lastError = normalized;
        await wait(jitteredBackoffMs(baseMs, maxMs, attempt));
      } finally {
        clearTimeout(timeout);
      }
    }
    throw lastError || new Error(`${this.id} request failed`);
  }
}
