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

export interface PublicResultV02 {
  modelSlug: string;
  displayName?: string;
  evidenceState: string;
  humanReviewed: boolean;
  runType: 'live' | 'fixture';
  trackScores: Partial<Record<Modality, TrackScorePublic>>;
  testedAt?: string;
}

export interface PublicResultsV02File {
  schemaVersion: 2;
  generatedAt: string;
  benchmarkVersion: string;
  results: PublicResultV02[];
}

export const publicResultsV02 = raw as PublicResultsV02File;

export function resultsForModality(modality: Modality): PublicResultV02[] {
  return publicResultsV02.results.filter((r) => r.trackScores?.[modality]?.overall !== undefined);
}

export function isPublishedV02(result?: PublicResultV02): boolean {
  return Boolean(result && result.runType === 'live' && result.humanReviewed && result.evidenceState === 'live-reviewed');
}
