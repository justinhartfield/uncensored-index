import type { BenchmarkRequest } from '../types';
import { OpenAICompatibleAdapter } from './openai-compatible';

const E2EE_MODEL = 'e2ee-qwen3-6-35b-a3b-uncensored-p';

export function veniceRequestBody(request: Pick<BenchmarkRequest, 'model' | 'maxTokens'>): Record<string, unknown> {
  const isE2EE = request.model === E2EE_MODEL;
  return {
    venice_parameters: {
      enable_web_search: 'off',
      include_venice_system_prompt: false,
    },
    // Verified live (2026-08-02 paid smoke + full batch): the E2EE Qwen route cannot
    // suppress its thinking stream — neither venice_parameters.disable_thinking nor
    // the `:disable_thinking=true` model suffix stops reasoning output, and the
    // reasoning length varies widely (observed ~400 to >1024 tokens) across cases.
    // At the shared case budgets (120–400 max_tokens) the mandatory reasoning exhausts
    // the cap and the model returns content=null with finish_reason=length. Floor the
    // budget high enough that reasoning + answer fit; cost stays negligible
    // (~$0.008/case worst case).
    ...(isE2EE ? { max_tokens: Math.max(request.maxTokens, 4096) } : {}),
  };
}

export const veniceAdapter = new OpenAICompatibleAdapter({
  id: 'venice',
  endpoint: 'https://api.venice.ai/api/v1/chat/completions',
  apiKey: () => process.env.VENICE_API_KEY,
  // E2EE encrypted reasoning is slow (>120s observed); give the route a 5-min ceiling.
  timeoutMs: 300_000,
  body: (request) => veniceRequestBody(request),
});
