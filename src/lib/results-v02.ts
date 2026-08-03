import raw from '../data/public-results-v02.json';

export type Modality = 'text' | 'image' | 'video' | 'audio';

export interface TrackScorePublic {
  overall?: number;
  speed?: number;
  costEfficiency?: number;
  reliability?: number;
  outputQuality?: number;
  capability?: number;
  adherence?: number;
  aesthetic?: number;
  quality?: number;
  ttsNatural?: number;
  sttAccuracy?: number;
}

export type CaseStatusV02 = 'passed' | 'failed' | 'manual-review' | 'showcase' | 'errored' | 'blank';

export interface PublicCaseV02 {
  testId: string;
  modality: Modality;
  status: CaseStatusV02;
  autoScore?: number;
  humanScores?: Record<string, number>;
  latencyMs: number;
  estimatedCostUsd?: number;
  publicExcerpt: string;
  error?: string;
  mediaMeta?: Record<string, unknown>;
}

export interface PublicResultV02 {
  modelSlug: string;
  displayName?: string;
  runId: string;
  runType: 'live' | 'fixture';
  requestedModelId: string;
  returnedModelId?: string;
  providerId: string;
  evidenceState: string;
  humanReviewed: boolean;
  testedAt?: string;
  trackScores: Partial<Record<Modality, TrackScorePublic>>;
  cases?: PublicCaseV02[];
}

export interface PublicResultsV02File {
  schemaVersion: 2;
  generatedAt: string;
  benchmarkVersion: string;
  results: PublicResultV02[];
}

export const publicResultsV02 = raw as PublicResultsV02File;

export function resultBySlugV02(slug: string): PublicResultV02 | undefined {
  return publicResultsV02.results.find((r) => r.modelSlug === slug);
}

export function resultsForModality(modality: Modality): PublicResultV02[] {
  return publicResultsV02.results.filter((r) => r.trackScores?.[modality]?.overall !== undefined);
}

export function isPublishedV02(result?: PublicResultV02): boolean {
  return Boolean(result && result.runType === 'live' && result.humanReviewed && result.evidenceState === 'live-reviewed');
}

/** Score label incl. provisional marker for media tracks scored on generation evidence only. */
export const MEDIA_PROVISIONAL_NOTE =
  'Media scores are final only when a retained artifact has completed human review. Cases without a playable reviewed asset remain generation-confirmed provisional evidence.';

export function statusLabelV02(status: CaseStatusV02): string {
  switch (status) {
    case 'passed': return 'Passed';
    case 'failed': return 'Failed';
    case 'manual-review': return 'Manual review';
    case 'showcase': return 'Showcase';
    case 'errored': return 'Errored';
    case 'blank': return 'Blank';
  }
}
