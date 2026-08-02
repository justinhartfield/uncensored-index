import type { BenchmarkRequest, BenchmarkResponse, ModelAdapter } from '../types';

export class OllamaAdapter implements ModelAdapter {
  id = 'ollama';
  private baseUrl = (process.env.OLLAMA_BASE_URL || 'http://127.0.0.1:11434').replace(/\/$/, '');
  isConfigured(): boolean { return Boolean(process.env.OLLAMA_BASE_URL); }

  async complete(request: BenchmarkRequest): Promise<BenchmarkResponse> {
    const started = performance.now();
    const response = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: request.model, messages: request.messages, stream: false, options: { temperature: request.temperature, top_p: request.topP, seed: request.seed } }),
    });
    if (!response.ok) throw new Error(`ollama HTTP ${response.status}`);
    const raw = await response.json() as Record<string, any>;
    return {
      content: raw.message?.content || '',
      requestedModelId: request.model,
      returnedModelId: raw.model,
      finishReason: raw.done_reason,
      promptTokens: raw.prompt_eval_count,
      completionTokens: raw.eval_count,
      latencyMs: Math.round(performance.now() - started),
      providerMetadata: { totalDuration: raw.total_duration },
      raw,
    };
  }
}
