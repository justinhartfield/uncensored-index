import { OpenAICompatibleAdapter } from './openai-compatible';

export const openRouterAdapter = new OpenAICompatibleAdapter({
  id: 'openrouter',
  endpoint: 'https://openrouter.ai/api/v1/chat/completions',
  apiKey: () => process.env.OPENROUTER_API_KEY,
  headers: {
    'HTTP-Referer': process.env.SITE_URL || 'https://example.invalid',
    'X-Title': 'Uncensored Index Benchmark',
  },
});
