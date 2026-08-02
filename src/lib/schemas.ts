import { z } from 'zod';

export const EvidenceStateSchema = z.enum([
  'awaiting-live-test',
  'fixture',
  'live-unreviewed',
  'live-reviewed',
  'stale',
  'unavailable',
]);

export const ProviderSchema = z.object({
  id: z.string().min(2),
  name: z.string().min(2),
  routeType: z.enum(['openrouter', 'venice', 'ollama']),
  credentialEnv: z.string().min(3),
  docsUrl: z.url(),
  catalogUrl: z.url().optional(),
});

export const RankingEntrySchema = z.object({
  modelSlug: z.string().regex(/^[a-z0-9-]+$/),
  rank: z.number().int().positive().optional(),
  score: z.number().min(0).max(100).optional(),
  evidenceState: EvidenceStateSchema,
});

export const ModelSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  displayName: z.string().min(2),
  canonicalId: z.string().min(2),
  creator: z.string().min(2),
  providerId: z.string().min(2),
  routeType: z.enum(['openrouter', 'venice', 'ollama']),
  family: z.string().optional(),
  parameterLabel: z.string().optional(),
  contextTokens: z.number().int().positive(),
  modalities: z.array(z.enum(['text', 'image', 'video'])).min(1),
  weights: z.enum(['open', 'closed', 'unknown']),
  privacy: z.enum(['private', 'anonymized', 'e2ee', 'local', 'unknown']),
  inputUsdPerMillion: z.number().nonnegative().optional(),
  outputUsdPerMillion: z.number().nonnegative().optional(),
  releasedAt: z.string().optional(),
  sourceUrls: z.array(z.url()).min(1),
  status: z.enum(['active', 'deprecated', 'unavailable']),
  tags: z.array(z.string()).default([]),
});

export const TestCaseResultSchema = z.object({
  testId: z.string(),
  promptHash: z.string().regex(/^[a-f0-9]{64}$/),
  category: z.string(),
  status: z.enum(['passed', 'failed', 'manual-review', 'skipped', 'errored']),
  expectedBehavior: z.enum(['comply', 'refuse', 'structured', 'manual']),
  refusal: z.boolean().optional(),
  latencyMs: z.number().nonnegative(),
  promptTokens: z.number().int().nonnegative().optional(),
  completionTokens: z.number().int().nonnegative().optional(),
  estimatedCostUsd: z.number().nonnegative().optional(),
  publicExcerpt: z.string(),
  error: z.string().optional(),
});

export const ScoreBreakdownSchema = z.object({
  instruction: z.number().min(0).max(100).optional(),
  lawfulAdultReliability: z.number().min(0).max(100).optional(),
  safetyBoundary: z.number().min(0).max(100).optional(),
  memory: z.number().min(0).max(100).optional(),
  speedReliability: z.number().min(0).max(100).optional(),
});

export const PublicBenchmarkResultSchema = z.object({
  schemaVersion: z.literal(1),
  benchmarkVersion: z.string(),
  runId: z.string(),
  runType: z.enum(['live', 'fixture']),
  testedAt: z.string(),
  modelSlug: z.string(),
  requestedModelId: z.string(),
  returnedModelId: z.string().optional(),
  providerId: z.string(),
  evidenceState: EvidenceStateSchema,
  testCount: z.number().int().nonnegative(),
  cases: z.array(TestCaseResultSchema),
  automatedScores: ScoreBreakdownSchema,
  humanReviewed: z.boolean(),
  overallScore: z.number().min(0).max(100).optional(),
});

export const PublicResultsFileSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string(),
  benchmarkVersion: z.string(),
  results: z.array(PublicBenchmarkResultSchema),
});

export type ModelRecord = z.infer<typeof ModelSchema>;
export type ProviderRecord = z.infer<typeof ProviderSchema>;
export type RankingEntry = z.infer<typeof RankingEntrySchema>;
export type PublicBenchmarkResult = z.infer<typeof PublicBenchmarkResultSchema>;
export type PublicResultsFile = z.infer<typeof PublicResultsFileSchema>;
