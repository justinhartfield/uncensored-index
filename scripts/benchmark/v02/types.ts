export type Modality = 'text' | 'image' | 'video' | 'audio';
export type GradeMode = 'auto' | 'human' | 'showcase';
export type AutoGrader =
  | 'none'
  | 'code-suite'
  | 'exact-answer'
  | 'fact-set'
  | 'json-schema'
  | 'syllable-constraint'
  | 'wer';

export type Message = { role: 'system' | 'user' | 'assistant'; content: string };

export interface TestCaseV02 {
  id: string;
  modality: Modality;
  title: string;
  gradeMode: GradeMode;
  grader: AutoGrader;
  public: boolean;
  adultFlagged?: boolean;
  /** Human rubric dimensions when gradeMode is human */
  humanDims?: string[];
  maxTokens?: number;
  messages?: Message[];
  /** Image/video/audio generation prompt */
  prompt?: string;
  negativePrompt?: string;
  /** Grader config payload */
  graderConfig?: Record<string, unknown>;
  /** Media params */
  media?: {
    duration?: string;
    resolution?: string;
    aspectRatio?: string;
    width?: number;
    height?: number;
    voice?: string;
    referenceAudioId?: string;
  };
}

export interface CaseResultV02 {
  testId: string;
  modality: Modality;
  promptHash: string;
  status: 'passed' | 'failed' | 'manual-review' | 'showcase' | 'errored' | 'blank';
  autoScore?: number; // 0..100 when auto
  humanScores?: Record<string, number>; // 1-5 dims
  latencyMs: number;
  promptTokens?: number;
  completionTokens?: number;
  estimatedCostUsd?: number;
  publicExcerpt: string;
  error?: string;
  mediaMeta?: Record<string, unknown>;
  requestedModelId: string;
  returnedModelId?: string;
}

export interface TrackScores {
  outputQuality?: number;
  capability?: number;
  adherence?: number;
  aesthetic?: number;
  quality?: number;
  ttsNatural?: number;
  sttAccuracy?: number;
  speed: number;
  costEfficiency: number;
  reliability: number;
  overall: number;
}

export interface ModelRunV02 {
  schemaVersion: 2;
  benchmarkVersion: '0.2.0';
  runId: string;
  runType: 'live' | 'fixture';
  testedAt: string;
  modelSlug: string;
  requestedModelId: string;
  returnedModelId?: string;
  providerId: string;
  modalitiesRun: Modality[];
  evidenceState: 'fixture' | 'live-unreviewed' | 'live-reviewed' | 'awaiting-live-test' | 'stale' | 'unavailable';
  humanReviewed: boolean;
  publicationStatus: 'private' | 'public';
  cases: CaseResultV02[];
  trackScores: Partial<Record<Modality, TrackScores>>;
  runMetrics: {
    averageLatencyMs?: number;
    totalEstimatedCostUsd?: number;
    errorCount: number;
    blankCount: number;
  };
}

export interface ChatAdapter {
  id: string;
  isConfigured(): boolean;
  complete(input: {
    model: string;
    messages: Message[];
    temperature: number;
    maxTokens: number;
    seed?: number;
    responseFormat?: unknown;
  }): Promise<{
    content: string;
    requestedModelId: string;
    returnedModelId?: string;
    promptTokens?: number;
    completionTokens?: number;
    latencyMs: number;
    raw: unknown;
  }>;
}

export interface ImageAdapter {
  id: string;
  isConfigured(): boolean;
  generate(input: {
    model: string;
    prompt: string;
    negativePrompt?: string;
    width?: number;
    height?: number;
  }): Promise<{
    imageBase64?: string;
    latencyMs: number;
    timingTotalMs?: number;
    costUsd?: number;
    raw: unknown;
  }>;
}

export interface VideoAdapter {
  id: string;
  isConfigured(): boolean;
  queueAndRetrieve(input: {
    model: string;
    prompt: string;
    duration?: string;
    resolution?: string;
    aspectRatio?: string;
    imageBase64?: string;
  }): Promise<{
    status: 'completed' | 'failed';
    latencyMs: number;
    costUsd?: number;
    downloadUrl?: string;
    raw: unknown;
  }>;
}

export interface AudioAdapter {
  id: string;
  isConfigured(): boolean;
  speech(input: { model: string; input: string; voice?: string }): Promise<{
    audioBase64?: string;
    latencyMs: number;
    costUsd?: number;
    raw: unknown;
  }>;
  transcribe(input: { model: string; audioBase64: string; filename?: string }): Promise<{
    text: string;
    latencyMs: number;
    costUsd?: number;
    raw: unknown;
  }>;
}
