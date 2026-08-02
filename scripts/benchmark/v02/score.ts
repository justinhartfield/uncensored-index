import type { CaseResultV02, Modality, TrackScores } from './types';

export function estimatedCost(
  promptTokens: number | undefined,
  completionTokens: number | undefined,
  inputPerMillion: number | undefined,
  outputPerMillion: number | undefined,
): number | undefined {
  if (
    promptTokens === undefined ||
    completionTokens === undefined ||
    inputPerMillion === undefined ||
    outputPerMillion === undefined
  ) return undefined;
  return (promptTokens * inputPerMillion + completionTokens * outputPerMillion) / 1_000_000;
}

export function percentile(values: number[], p: number): number | undefined {
  if (!values.length) return undefined;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
  return sorted[idx];
}

/** min/value capped at 100 — best-in-track = 100 */
export function relativeToMin(value: number | undefined, minValue: number | undefined): number {
  if (value === undefined || minValue === undefined || value <= 0 || minValue <= 0) return 0;
  return Math.min(100, (100 * minValue) / value);
}

function mean(nums: number[]): number | undefined {
  if (!nums.length) return undefined;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function humanMean(cases: CaseResultV02[]): number | undefined {
  const vals: number[] = [];
  for (const c of cases) {
    if (!c.humanScores) continue;
    const dimVals = Object.values(c.humanScores).filter((n) => Number.isFinite(n) && n > 0);
    if (dimVals.length) vals.push(mean(dimVals)!);
  }
  return mean(vals);
}

export function scoreTextTrack(
  cases: CaseResultV02[],
  mins: { p50Latency?: number; cost?: number },
): TrackScores {
  const humanCases = cases.filter((c) => ['T1', 'T2', 'T3'].includes(c.testId) && c.status !== 'blank' && c.status !== 'errored');
  const autoCases = cases.filter((c) => ['T4', 'T5', 'T6', 'T7', 'T8', 'T9', 'T10', 'T11'].includes(c.testId));
  const hq = humanMean(humanCases);
  const outputQuality = hq === undefined ? 0 : Math.min(100, hq * 20);
  const autoEligible = autoCases.filter((c) => c.status !== 'errored' && c.status !== 'blank');
  // Partial credit for fact-set etc via autoScore
  let capability = 0;
  if (autoEligible.length) {
    const scores = autoEligible.map((c) => (c.autoScore !== undefined ? c.autoScore : c.status === 'passed' ? 100 : 0));
    capability = mean(scores) ?? 0;
  }
  const latencies = cases.filter((c) => c.status !== 'errored').map((c) => c.latencyMs).filter((n) => n > 0);
  const p50 = percentile(latencies, 50);
  const costs = cases.map((c) => c.estimatedCostUsd).filter((n): n is number => typeof n === 'number' && n > 0);
  const cost = costs.length ? costs.reduce((a, b) => a + b, 0) : undefined;
  const speed = relativeToMin(p50, mins.p50Latency ?? p50);
  const costEfficiency = relativeToMin(cost, mins.cost ?? cost);
  const reliability = cases.length
    ? (100 * cases.filter((c) => c.status !== 'errored' && c.status !== 'blank').length) / cases.length
    : 0;
  const overall =
    0.35 * outputQuality +
    0.25 * capability +
    0.15 * speed +
    0.15 * costEfficiency +
    0.10 * reliability;
  return {
    outputQuality: round1(outputQuality),
    capability: round1(capability),
    speed: round1(speed),
    costEfficiency: round1(costEfficiency),
    reliability: round1(reliability),
    overall: round1(overall),
  };
}

export function scoreImageTrack(
  cases: CaseResultV02[],
  mins: { p50Latency?: number; cost?: number },
): TrackScores {
  // I5 is showcase — excluded from rank
  const ranked = cases.filter((c) => c.testId !== 'I5');
  const adherenceCases = ranked.filter((c) => ['I1', 'I3', 'I4'].includes(c.testId));
  const aestheticCases = ranked.filter((c) => c.testId === 'I2');
  const adh = humanMean(adherenceCases);
  const aes = humanMean(aestheticCases);
  const adherence = adh === undefined ? 0 : Math.min(100, adh * 20);
  const aesthetic = aes === undefined ? 0 : Math.min(100, aes * 20);
  const latencies = ranked.filter((c) => c.status !== 'errored').map((c) => c.latencyMs).filter((n) => n > 0);
  const p50 = percentile(latencies, 50);
  const costs = ranked.map((c) => c.estimatedCostUsd).filter((n): n is number => typeof n === 'number' && n > 0);
  const cost = costs.length ? mean(costs) : undefined;
  const speed = relativeToMin(p50, mins.p50Latency ?? p50);
  const costEfficiency = relativeToMin(cost, mins.cost ?? cost);
  const reliability = ranked.length
    ? (100 * ranked.filter((c) => c.status !== 'errored' && c.status !== 'blank').length) / ranked.length
    : 0;
  const overall =
    0.40 * adherence +
    0.25 * aesthetic +
    0.15 * speed +
    0.10 * costEfficiency +
    0.10 * reliability;
  return {
    adherence: round1(adherence),
    aesthetic: round1(aesthetic),
    speed: round1(speed),
    costEfficiency: round1(costEfficiency),
    reliability: round1(reliability),
    overall: round1(overall),
  };
}

export function scoreVideoTrack(
  cases: CaseResultV02[],
  mins: { p50Latency?: number; cost?: number },
): TrackScores {
  const q = humanMean(cases.filter((c) => c.status !== 'errored' && c.status !== 'blank'));
  const quality = q === undefined ? 0 : Math.min(100, q * 20);
  const latencies = cases.filter((c) => c.status !== 'errored').map((c) => c.latencyMs).filter((n) => n > 0);
  const p50 = percentile(latencies, 50);
  const costs = cases.map((c) => c.estimatedCostUsd).filter((n): n is number => typeof n === 'number' && n > 0);
  const cost = costs.length ? mean(costs) : undefined;
  const speed = relativeToMin(p50, mins.p50Latency ?? p50);
  const costEfficiency = relativeToMin(cost, mins.cost ?? cost);
  const reliability = cases.length
    ? (100 * cases.filter((c) => c.status !== 'errored' && c.status !== 'blank').length) / cases.length
    : 0;
  const overall = 0.50 * quality + 0.25 * speed + 0.15 * costEfficiency + 0.10 * reliability;
  return {
    quality: round1(quality),
    speed: round1(speed),
    costEfficiency: round1(costEfficiency),
    reliability: round1(reliability),
    overall: round1(overall),
  };
}

export function scoreAudioTrack(
  cases: CaseResultV02[],
  mins: { p50Latency?: number; cost?: number },
): TrackScores {
  const tts = cases.filter((c) => c.testId === 'A1');
  const stt = cases.filter((c) => c.testId === 'A2');
  const ttsH = humanMean(tts);
  const ttsNatural = ttsH === undefined ? 0 : Math.min(100, ttsH * 20);
  const sttScores = stt.map((c) => c.autoScore).filter((n): n is number => typeof n === 'number');
  const sttAccuracy = mean(sttScores) ?? 0;
  const latencies = cases.filter((c) => c.status !== 'errored').map((c) => c.latencyMs).filter((n) => n > 0);
  const p50 = percentile(latencies, 50);
  const costs = cases.map((c) => c.estimatedCostUsd).filter((n): n is number => typeof n === 'number' && n > 0);
  const cost = costs.length ? mean(costs) : undefined;
  const speed = relativeToMin(p50, mins.p50Latency ?? p50);
  const costEfficiency = relativeToMin(cost, mins.cost ?? cost);
  const reliability = cases.length
    ? (100 * cases.filter((c) => c.status !== 'errored' && c.status !== 'blank').length) / cases.length
    : 0;
  const overall =
    0.30 * ttsNatural +
    0.30 * sttAccuracy +
    0.20 * speed +
    0.10 * costEfficiency +
    0.10 * reliability;
  return {
    ttsNatural: round1(ttsNatural),
    sttAccuracy: round1(sttAccuracy),
    speed: round1(speed),
    costEfficiency: round1(costEfficiency),
    reliability: round1(reliability),
    overall: round1(overall),
  };
}

export function scoreTrack(
  modality: Modality,
  cases: CaseResultV02[],
  mins: { p50Latency?: number; cost?: number },
): TrackScores {
  switch (modality) {
    case 'text': return scoreTextTrack(cases, mins);
    case 'image': return scoreImageTrack(cases, mins);
    case 'video': return scoreVideoTrack(cases, mins);
    case 'audio': return scoreAudioTrack(cases, mins);
  }
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Collect per-track minima across a set of model runs for relative normalization. */
export function trackMins(
  runs: Array<{ cases: CaseResultV02[] }>,
  modality: Modality,
): { p50Latency?: number; cost?: number } {
  const p50s: number[] = [];
  const costs: number[] = [];
  for (const run of runs) {
    const cases = run.cases.filter((c) => c.modality === modality && !(modality === 'image' && c.testId === 'I5'));
    const latencies = cases.filter((c) => c.status !== 'errored' && c.latencyMs > 0).map((c) => c.latencyMs);
    const p50 = percentile(latencies, 50);
    if (p50 !== undefined) p50s.push(p50);
    const c = cases.map((x) => x.estimatedCostUsd).filter((n): n is number => typeof n === 'number' && n > 0);
    if (c.length) costs.push(c.reduce((a, b) => a + b, 0));
  }
  return {
    p50Latency: p50s.length ? Math.min(...p50s) : undefined,
    cost: costs.length ? Math.min(...costs) : undefined,
  };
}
