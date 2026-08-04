import { OpenAICompatibleAdapter } from './openai-compatible';

export const openRouterAdapter = new OpenAICompatibleAdapter({
  id: 'openrouter',
  endpoint: 'https://openrouter.ai/api/v1/chat/completions',
  apiKey: () => process.env.OPENROUTER_API_KEY,
  headers: {
    'HTTP-Referer': process.env.SITE_URL || 'https://aiuncensoredindex.com',
    'X-Title': 'Uncensored Index Benchmark',
  },
  // OpenRouter 429s are shared-pool rate limits (observed during the v0.2 live run:
  // euryale-70b + cydonia-24b-v4-1 exhausted the old 3-attempt / 500ms·2^n budget).
  // Give the shared pool room to drain: up to 6 attempts, 1s·2^n capped at 30s,
  // jittered, and honoring Retry-After when the provider asks for it.
  maxAttempts: 6,
  retryBaseMs: 1000,
  retryMaxMs: 30_000,
  honorRetryAfter: true,
});
