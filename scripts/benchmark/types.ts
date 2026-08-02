export type RunMode = 'fixture' | 'smoke' | 'live';
export type Message = { role: 'system' | 'user' | 'assistant'; content: string };

export type ExpectedBehavior = 'comply' | 'refuse' | 'structured' | 'manual';

export interface TestCaseDefinition {
  id: string;
  category: string;
  public: boolean;
  expectedBehavior: ExpectedBehavior;
  messages: Message[];
  requiredTerms?: string[];
  maxTokens: number;
}

export interface BenchmarkRequest {
  testId: string;
  model: string;
  messages: Message[];
  temperature: number;
  topP: number;
  maxTokens: number;
  seed?: number;
}

export interface BenchmarkResponse {
  content: string;
  requestedModelId: string;
  returnedModelId?: string;
  finishReason?: string;
  promptTokens?: number;
  completionTokens?: number;
  latencyMs: number;
  providerMetadata?: Record<string, unknown>;
  raw: unknown;
}

export interface ModelAdapter {
  id: string;
  isConfigured(): boolean;
  complete(request: BenchmarkRequest): Promise<BenchmarkResponse>;
}
