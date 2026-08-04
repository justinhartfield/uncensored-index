import { allCasesV03 } from '../../scripts/benchmark/v03/cases';
import type { Modality } from '../../scripts/benchmark/v02/types';

export const v03Modalities: Modality[] = ['text', 'image', 'video', 'audio'];

export const modalityMeta: Record<Modality, { label: string; code: string; description: string; routeCount: number }> = {
  text: { label: 'Text', code: 'TX', description: 'Fiction, horror, profanity, viewpoint fidelity, and private boundary controls.', routeCount: 13 },
  image: { label: 'Image', code: 'IM', description: 'Adult figure work, intimacy, body horror, satire, and delivery integrity.', routeCount: 3 },
  video: { label: 'Video', code: 'VD', description: 'Motion, identity continuity, anatomy, requested intensity, and delivery.', routeCount: 1 },
  audio: { label: 'Audio', code: 'AU', description: 'TTS fidelity and prosody, sensitive-vocabulary STT, and voice-clone safety.', routeCount: 1 },
};

const slugify = (id: string) => id.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

export const v03SuiteCases = allCasesV03.map((test, index) => ({
  id: test.id,
  slug: slugify(test.id),
  order: index + 1,
  modality: test.modality,
  title: test.title.replace(/^Uncensored — /, ''),
  family: test.family,
  reviewPolicy: test.reviewPolicy,
  adultFlagged: test.adultFlagged,
  warningTags: test.warningTags,
  gradeMode: test.gradeMode,
  humanDims: test.humanDims,
  constraintChecks: test.constraintChecks,
  expectedOutcome: test.expectedOutcome,
  applicability: test.applicability,
  publicPrompt: test.family === 'boundary-control'
    ? undefined
    : test.messages?.map((message) => message.content).join('\n') || test.prompt,
  media: test.media,
  executionCount: modalityMeta[test.modality].routeCount,
  technicalFailures: test.id === 'UT6' || test.id === 'UV4' ? 1 : 0,
}));

export type V03SuiteCase = (typeof v03SuiteCases)[number];
export const v03CaseBySlug = new Map(v03SuiteCases.map((test) => [test.slug, test]));
export const v03CasesByModality = new Map(v03Modalities.map((modality) => [
  modality,
  v03SuiteCases.filter((test) => test.modality === modality),
]));

export const v03Run = {
  runId: 'v03-live-2026-08-03T14-30-26-901Z',
  state: 'live-reviewed',
  testedAt: '2026-08-03',
  completedAt: '2026-08-03T15:23:56.836Z',
  catalogCases: 33,
  modelRecords: 18,
  caseExecutions: 163,
  providerCalls: 162,
  artifacts: 160,
  delivered: 152,
  refused: 9,
  technicalFailures: 2,
  pendingReviews: 0,
  estimatedSpendUsd: 5.4923,
  projectedSpendUsd: 5.5342,
  maxSpendUsd: 30,
  excludedModels: ['qwen3-6-35b-uncensored-e2ee'],
  technicalFailureCases: [
    { modelSlug: 'cydonia-24b-v4-1', testId: 'UT6', label: 'Upstream shared-pool rate limit' },
    { modelSlug: 'wan-2-7-text-to-video', testId: 'UV4', label: 'Provider retrieval error' },
  ],
  capabilityPrefill: { full: 128, softened: 24, refused: 9, failed: 2 },
  boundaryPrefill: { safeRefusal: 5, partialLeakage: 3, prohibitedCompliance: 20, technicalFailure: 2, notApplicable: 1 },
} as const;

export const v03RunModelSlugs = new Set([
  'aion-3-0', 'minimax-m2-her', 'cydonia-24b-v4-1', 'euryale-70b',
  'dolphin-mistral-24b-venice', 'hermes-3-405b', 'unslopnemo-12b',
  'mythomax-13b', 'magnum-v4-72b', 'venice-uncensored-1-2',
  'venice-uncensored-role-play', 'gemma-4-uncensored', 'glm-5-2',
  'venice-sd35', 'flux-2-pro', 'qwen-image-2', 'wan-2-7-text-to-video',
  'venice-audio-suite',
]);

export interface ClimaxRunRecord {
  id: string;
  version: string;
  state: string;
  testedAt: string;
  completedAt: string;
  catalogCases: number;
  modelRecords: number;
  caseExecutions: number;
  maxSpendUsd: number;
  estimatedSpendUsd: number;
  technicalFailures: number;
}

export const v03Runs: readonly ClimaxRunRecord[] = [
  {
    id: v03Run.runId,
    version: '0.3.0',
    state: v03Run.state,
    testedAt: v03Run.testedAt,
    completedAt: v03Run.completedAt,
    catalogCases: v03Run.catalogCases,
    modelRecords: v03Run.modelRecords,
    caseExecutions: v03Run.caseExecutions,
    maxSpendUsd: v03Run.maxSpendUsd,
    estimatedSpendUsd: v03Run.estimatedSpendUsd,
    technicalFailures: v03Run.technicalFailureCases.length,
  },
] as const;
