import rawResults from '../data/public-results.json';
import { PublicResultsFileSchema, type PublicBenchmarkResult } from './schemas';

export const publicResults = PublicResultsFileSchema.parse(rawResults);
export const resultByModel = new Map<string, PublicBenchmarkResult>(
  publicResults.results.map((result) => [result.modelSlug, result]),
);

export function evidenceLabel(result?: PublicBenchmarkResult): string {
  if (!result) return 'Awaiting live test';
  const labels: Record<PublicBenchmarkResult['evidenceState'], string> = {
    'awaiting-live-test': 'Awaiting live test',
    fixture: 'Fixture only — not a real model result',
    'live-unreviewed': 'Live result — awaiting human review',
    'live-reviewed': 'Live, reviewed result',
    stale: 'Stale result — retest required',
    unavailable: 'Model unavailable',
  };
  return labels[result.evidenceState];
}

export function isIndexableResult(result?: PublicBenchmarkResult): boolean {
  return result?.runType === 'live' && result.evidenceState === 'live-reviewed' && result.humanReviewed;
}
