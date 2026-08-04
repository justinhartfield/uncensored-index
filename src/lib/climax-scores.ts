import { v03PublishedModelResults, type PublicModelResultV03 } from '../data/v03-public-results';
import { modelBySlug } from '../data/models';
import type { Modality } from '../../scripts/benchmark/v02/types';

export interface ClimaxScoreBreakdown {
  instructionFollowing: number;
  outputQuality: number;
  speedScore: number;
  costScore: number;
  total: number;
}

export interface ClimaxRankingEntry {
  rank: number;
  modelSlug: string;
  displayName: string;
  score: number;
  breakdown: ClimaxScoreBreakdown;
  result: PublicModelResultV03;
  latency: number;
  costPerExec: number;
}

export interface ClimaxModelScore {
  rank: number;
  modelSlug: string;
  displayName: string;
  textScore: number | null;
  imageScore: number | null;
  videoScore: number | null;
  audioScore: number | null;
  combinedScore: number;
  avgLatency: number;
  totalCost: number;
}

function normalize(value: number, min: number, max: number): number {
  if (max === min) return 50;
  return 100 - ((value - min) / (max - min)) * 100;
}

export function computeClimaxScoreBreakdown(
  result: PublicModelResultV03,
  modalityResults: PublicModelResultV03[],
): ClimaxScoreBreakdown {
  const instructionFollowing = result.lawful.total > 0
    ? (result.lawful.full / result.lawful.total) * 100
    : 0;

  const totalTests = result.lawful.total + result.lawful.softened + result.lawful.refused + result.lawful.failed;
  const outputQuality = totalTests > 0
    ? ((result.lawful.full * 100 + result.lawful.softened * 50 + result.lawful.refused * 0 + result.lawful.failed * 0) / totalTests)
    : 0;

  const latencies = modalityResults.map((r) => r.avgLatencyMs);
  const minLatency = Math.min(...latencies);
  const maxLatency = Math.max(...latencies);
  const speedScore = modalityResults.length > 1
    ? normalize(result.avgLatencyMs, minLatency, maxLatency)
    : 50;

  const costs = modalityResults.map((r) => r.executions > 0 ? r.estimatedCostUsd / r.executions : 0);
  const minCost = Math.min(...costs);
  const maxCost = Math.max(...costs);
  const costScore = modalityResults.length > 1
    ? normalize(result.executions > 0 ? result.estimatedCostUsd / result.executions : 0, minCost, maxCost)
    : 50;

  const total = instructionFollowing * 0.50 + outputQuality * 0.30 + speedScore * 0.10 + costScore * 0.10;

  return {
    instructionFollowing: Math.round(instructionFollowing * 10) / 10,
    outputQuality: Math.round(outputQuality * 10) / 10,
    speedScore: Math.round(speedScore * 10) / 10,
    costScore: Math.round(costScore * 10) / 10,
    total: Math.round(total * 10) / 10,
  };
}

export function getClimaxRankings(modality: Modality): ClimaxRankingEntry[] {
  const modalityResults = v03PublishedModelResults.filter((r) => r.modality === modality);

  const entries = modalityResults.map((result) => {
    const model = modelBySlug.get(result.modelSlug);
    const breakdown = computeClimaxScoreBreakdown(result, modalityResults);
    const costPerExec = result.executions > 0 ? result.estimatedCostUsd / result.executions : 0;

    return {
      rank: 0,
      modelSlug: result.modelSlug,
      displayName: model?.displayName ?? result.modelSlug,
      score: breakdown.total,
      breakdown,
      result,
      latency: result.avgLatencyMs,
      costPerExec,
    };
  });

  entries.sort((a, b) => b.score - a.score);
  entries.forEach((entry, index) => { entry.rank = index + 1; });

  return entries;
}

export function getCombinedRankings(): ClimaxModelScore[] {
  const modalities: Modality[] = ['text', 'image', 'video', 'audio'];
  const modelScores = new Map<string, ClimaxModelScore>();

  for (const modality of modalities) {
    const rankings = getClimaxRankings(modality);
    for (const entry of rankings) {
      if (!modelScores.has(entry.modelSlug)) {
        const model = modelBySlug.get(entry.modelSlug);
        modelScores.set(entry.modelSlug, {
          rank: 0,
          modelSlug: entry.modelSlug,
          displayName: model?.displayName ?? entry.modelSlug,
          textScore: null,
          imageScore: null,
          videoScore: null,
          audioScore: null,
          combinedScore: 0,
          avgLatency: 0,
          totalCost: 0,
        });
      }

      const score = modelScores.get(entry.modelSlug)!;
      const key = `${modality}Score` as keyof ClimaxModelScore;
      (score[key] as number | null) = entry.score;

      if (modality === 'text') {
        score.avgLatency = entry.latency;
        score.totalCost = entry.result.estimatedCostUsd;
      }
    }
  }

  const results = Array.from(modelScores.values()).map((score) => {
    const scores = [score.textScore, score.imageScore, score.videoScore, score.audioScore].filter((s): s is number => s !== null);
    score.combinedScore = scores.length > 0 ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10) / 10 : 0;
    return score;
  });

  results.sort((a, b) => b.combinedScore - a.combinedScore);

  return results.map((entry, index) => ({ ...entry, rank: index + 1 }));
}
