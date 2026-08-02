import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { loadEnvFile } from 'node:process';
import path from 'node:path';
import { models } from '../../src/data/models';
import { FixtureAdapter } from './adapters/fixture';
import { openRouterAdapter } from './adapters/openrouter';
import { veniceAdapter } from './adapters/venice';
import { benchmarkVersion, privateLawfulAdultCase, promptHash, publicCases } from './prompts/index';
import { evaluateCase, estimatedCost } from './score';
import { publicExcerpt, redactSecrets } from './sanitize';
import type { ModelAdapter, RunMode, TestCaseDefinition } from './types';

try { loadEnvFile('.env'); } catch { /* .env is optional */ }

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index >= 0 ? process.argv[index + 1] : undefined;
}

function modeFromArgs(): RunMode {
  const value = argument('--mode') || 'fixture';
  if (!['fixture', 'smoke', 'live'].includes(value)) throw new Error(`Invalid mode: ${value}`);
  return value as RunMode;
}

async function privateCase(): Promise<TestCaseDefinition | undefined> {
  const configuredPath = process.env.BENCHMARK_PRIVATE_PROMPTS_PATH || 'benchmark-private/prompts.json';
  try {
    const data = JSON.parse(await readFile(configuredPath, 'utf8')) as { lawfulAdultPrompt?: string };
    if (!data.lawfulAdultPrompt?.trim()) return undefined;
    return privateLawfulAdultCase(data.lawfulAdultPrompt.trim());
  } catch {
    return undefined;
  }
}

function adapterFor(mode: RunMode, routeType: string): ModelAdapter {
  if (mode === 'fixture') return new FixtureAdapter();
  if (routeType === 'openrouter') return openRouterAdapter;
  if (routeType === 'venice') return veniceAdapter;
  throw new Error(`No live adapter for route ${routeType}`);
}

async function main() {
  const mode = modeFromArgs();
  const selectedSlug = argument('--model');
  const selected = selectedSlug ? models.filter((model) => model.slug === selectedSlug) : models;
  if (selected.length === 0) throw new Error(`Unknown model slug: ${selectedSlug}`);

  const adultCase = mode === 'live' ? await privateCase() : privateLawfulAdultCase('Private synthetic fixture prompt');
  if (mode === 'live' && !adultCase) throw new Error('Live mode requires BENCHMARK_PRIVATE_PROMPTS_PATH with lawfulAdultPrompt');
  const cases = mode === 'smoke' ? [publicCases[0]!] : [...publicCases, ...(adultCase ? [adultCase] : [])];
  const runId = `${mode}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const root = path.resolve(mode === 'fixture' ? 'benchmark-results-fixture' : 'benchmark-results', runId);
  await mkdir(root, { recursive: true });
  const manifest: Record<string, unknown> = { schemaVersion: 1, benchmarkVersion, runId, mode, startedAt: new Date().toISOString(), models: [] as unknown[] };

  for (const model of selected) {
    const adapter = adapterFor(mode, model.routeType);
    if (!adapter.isConfigured()) throw new Error(`${adapter.id} is not configured; add a newly rotated key outside chat`);
    const caseResults: unknown[] = [];
    for (const test of cases) {
      const started = new Date().toISOString();
      try {
        const response = await adapter.complete({
          testId: test.id,
          model: model.canonicalId,
          messages: test.messages,
          temperature: test.expectedBehavior === 'manual' ? 0.8 : 0.2,
          topP: 0.9,
          maxTokens: test.maxTokens,
          seed: 1701,
        });
        const evaluation = evaluateCase(test.expectedBehavior, response.content, test.requiredTerms);
        caseResults.push({
          testId: test.id,
          promptHash: promptHash(test),
          category: test.category,
          expectedBehavior: test.expectedBehavior,
          status: evaluation.status,
          refusal: evaluation.refusal,
          startedAt: started,
          latencyMs: response.latencyMs,
          promptTokens: response.promptTokens,
          completionTokens: response.completionTokens,
          estimatedCostUsd: estimatedCost(response.promptTokens, response.completionTokens, model.inputUsdPerMillion, model.outputUsdPerMillion),
          publicExcerpt: publicExcerpt(response.content, test.public),
          privateOutput: test.public ? undefined : response.content,
          requestedModelId: response.requestedModelId,
          returnedModelId: response.returnedModelId,
          providerMetadata: response.providerMetadata,
        });
      } catch (error) {
        caseResults.push({
          testId: test.id,
          promptHash: promptHash(test),
          category: test.category,
          expectedBehavior: test.expectedBehavior,
          status: 'errored',
          startedAt: started,
          latencyMs: 0,
          publicExcerpt: '',
          error: redactSecrets(error instanceof Error ? error.message : String(error)),
        });
      }
    }
    const typedCases = caseResults as Array<Record<string, any>>;
    const scoreFor = (categories: string[]) => {
      const eligible = typedCases.filter((item) => categories.includes(item.category) && ['passed', 'failed'].includes(item.status));
      return eligible.length ? Math.round((eligible.filter((item) => item.status === 'passed').length / eligible.length) * 1000) / 10 : undefined;
    };
    const firstReturnedModelId = typedCases.find((item) => typeof item.returnedModelId === 'string')?.returnedModelId;
    const automatedScores = {
      instruction: scoreFor(['control']),
      lawfulAdultReliability: scoreFor(['lawful-adult']),
      safetyBoundary: scoreFor(['safety']),
      memory: scoreFor(['memory']),
      speedReliability: typedCases.some((item) => item.status !== 'errored')
        ? Math.round((typedCases.filter((item) => item.status !== 'errored').length / typedCases.length) * 1000) / 10
        : 0,
    };
    const successfulCases = typedCases.filter((item) => item.status !== 'errored');
    const latencies = successfulCases.map((item) => Number(item.latencyMs)).filter(Number.isFinite);
    const costs = successfulCases.map((item) => item.estimatedCostUsd).filter((value) => typeof value === 'number') as number[];
    const runMetrics = {
      averageLatencyMs: latencies.length ? Math.round(latencies.reduce((sum, value) => sum + value, 0) / latencies.length) : undefined,
      totalEstimatedCostUsd: costs.length ? costs.reduce((sum, value) => sum + value, 0) : undefined,
      errorCount: typedCases.filter((item) => item.status === 'errored').length,
    };
    const modelRun = {
      schemaVersion: 1,
      benchmarkVersion,
      runId,
      runType: mode === 'fixture' ? 'fixture' : 'live',
      testedAt: new Date().toISOString(),
      modelSlug: model.slug,
      requestedModelId: model.canonicalId,
      returnedModelId: firstReturnedModelId,
      providerId: model.providerId,
      evidenceState: mode === 'fixture' ? 'fixture' : 'live-unreviewed',
      humanReviewed: false,
      publicationStatus: 'private',
      cases: caseResults,
      automatedScores,
      runMetrics,
    };
    await writeFile(path.join(root, `${model.slug}.json`), JSON.stringify(modelRun, null, 2));
    (manifest.models as unknown[]).push({ modelSlug: model.slug, caseCount: caseResults.length });
    console.log(`${model.slug}: ${caseResults.length} cases`);
  }
  (manifest as any).completedAt = new Date().toISOString();
  await writeFile(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`run_dir: ${root}`);
}

main().catch((error) => {
  console.error(redactSecrets(error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
});
