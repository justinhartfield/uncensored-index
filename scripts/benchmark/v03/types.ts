import type { GradeMode, Message, Modality } from '../v02/types';

export type CapabilityOutcome = 'full' | 'softened' | 'refused' | 'failed';
export type BoundaryOutcome = 'safe-refusal' | 'partial-leakage' | 'prohibited-compliance' | 'technical-failure' | 'not-applicable';
export type CaseFamilyV03 = 'lawful-capability' | 'boundary-control';
export type ReviewPolicyV03 = 'eligible-after-artifact-review' | 'audit-only';
export type WarningTagV03 = 'sexual-explicit' | 'nudity' | 'graphic-violence' | 'profanity' | 'drug-reference';
export type AttributionV03 = 'observed-model-response' | 'provider-policy' | 'provider-transformation' | 'transport' | 'unknown';

export interface TestCaseV03 {
  id: string;
  modality: Modality;
  title: string;
  family: CaseFamilyV03;
  reviewPolicy: ReviewPolicyV03;
  adultFlagged: boolean;
  warningTags: WarningTagV03[];
  gradeMode: GradeMode;
  humanDims: string[];
  messages?: Message[];
  prompt?: string;
  negativePrompt?: string;
  maxTokens?: number;
  media?: { duration?: string; resolution?: string; aspectRatio?: string; voice?: string };
  expectedOutcome?: 'generate' | 'refuse';
  applicability?: 'all' | 'voice-cloning-only';
  constraintChecks: string[];
}

export interface ArtifactReviewV03 {
  state: 'pending' | 'approved' | 'quarantined';
  capabilityOutcome?: CapabilityOutcome;
  boundaryOutcome?: BoundaryOutcome;
  attribution: AttributionV03;
  attributionEvidence: string;
  reviewerCount: number;
  sourceSha256?: string;
  executedPayloadSha256: string;
  recommendationEligible: boolean;
  warningTags: WarningTagV03[];
}

export type RunTypeV03 = 'fixture' | 'live';
export type EvidenceStateV03 = 'fixture' | 'live-unreviewed' | 'live-reviewed';

export interface CaseExecutionV03 {
  testId: string;
  title: string;
  modality: Modality;
  family: CaseFamilyV03;
  reviewPolicy: ReviewPolicyV03;
  catalogDefinitionSha256: string;
  executedPayloadSha256: string;
  status: 'fixture' | 'delivered' | 'refused' | 'errored';
  requestedModelId: string;
  returnedModelId?: string;
  latencyMs: number;
  estimatedCostUsd?: number;
  promptTokens?: number;
  completionTokens?: number;
  publicExcerpt: string;
  error?: string;
  artifact?: {
    privatePath: string;
    contentType: string;
    sourceSha256: string;
    bytes: number;
  };
  artifactReview: ArtifactReviewV03;
}

export interface ModelRunV03 {
  schemaVersion: 3;
  benchmarkVersion: '0.3.0';
  runId: string;
  runType: RunTypeV03;
  testedAt: string;
  modelSlug: string;
  requestedModelId: string;
  returnedModelId?: string;
  providerId: string;
  evidenceState: EvidenceStateV03;
  humanReviewed: boolean;
  publicationStatus: 'private' | 'public';
  cases: CaseExecutionV03[];
}

export interface RunManifestV03 {
  schemaVersion: 3;
  benchmarkVersion: '0.3.0';
  runId: string;
  runType: RunTypeV03;
  catalogCaseCount: number;
  caseIds: string[];
  models: Array<{ modelSlug: string; caseCount: number }>;
  plannedCallCount?: number;
  projectedSpendUsd?: number;
  estimatedSpendUsd?: number;
  maxSpendUsd?: number;
  catalogFrozenAt?: string;
  publicationEligible: boolean;
  completedAt: string;
}
