import { mkdir, writeFile } from 'node:fs/promises';
import { loadEnvFile } from 'node:process';
import path from 'node:path';
import { mediaModels, models } from '../../../src/data/models';
import { allCasesV02, benchmarkVersionV02, casesForModality, promptHashV02 } from './cases';
import { gradeAuto } from './graders/index';
import { resolveSttSource } from './stt-source';
import { estimatedCost, scoreTrack, trackMins } from './score';
import { loadCatalogFreeze, pickModelId, unitPrice, type CatalogFreeze } from './catalog';
import {
  FixtureAudioAdapter,
  FixtureChatAdapter,
  FixtureImageAdapter,
  FixtureVideoAdapter,
} from './adapters/fixture';
import { veniceAudioAdapter, veniceImageAdapter, veniceVideoAdapter } from './adapters/venice-media';
import { veniceAdapter } from '../adapters/venice';
import { openRouterAdapter } from '../adapters/openrouter';
import { publicExcerpt, redactSecrets } from '../sanitize';
import type { CaseResultV02, Modality, ModelRunV02 } from './types';

try { loadEnvFile('.env'); } catch { /* optional */ }

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

type Mode = 'fixture' | 'smoke' | 'live';

function modeFromArgs(): Mode {
  const v = arg('--mode') || 'fixture';
  if (!['fixture', 'smoke', 'live'].includes(v)) throw new Error(`Invalid mode ${v}`);
  return v as Mode;
}

function modalitiesFromArgs(): Modality[] {
  const raw = arg('--modality') || 'all';
  if (raw === 'all') return ['text', 'image', 'video', 'audio'];
  return raw.split(',').map((s) => s.trim()) as Modality[];
}

function textReservationUsd(model: (typeof models)[number], test: ReturnType<typeof casesForModality>[number]): number {
  const promptBytes = Buffer.byteLength((test.messages || []).map((message) => message.content).join('\n'));
  const inputCost = promptBytes * (model.inputUsdPerMillion || 0) / 1_000_000;
  const outputCost = (test.maxTokens || 800) * (model.outputUsdPerMillion || 0) / 1_000_000;
  return inputCost + outputCost;
}

function assertBudget(current: number, reservation: number, cap: number, label: string): void {
  if (current + reservation > cap) {
    throw new Error(
      `maxSpendUsd ${cap} would be exceeded before ${label} ` +
      `(running total ${current.toFixed(4)}, reservation ${reservation.toFixed(4)}); aborting before paid call`,
    );
  }
}

const extensionFor = (contentType: string): string => ({
  'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp',
  'video/mp4': 'mp4', 'video/webm': 'webm',
  'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/ogg': 'ogg',
}[contentType] || 'bin');

async function persistArtifact(
  root: string,
  modelSlug: string,
  testId: string,
  encoded: string,
  fallbackContentType: string,
): Promise<{ assetFile: string; contentType: string }> {
  const dataUrl = encoded.match(/^data:([^;,]+);base64,(.*)$/s);
  const contentType = (dataUrl?.[1] || fallbackContentType).toLowerCase();
  const relative = path.posix.join('assets', modelSlug, `${testId}.${extensionFor(contentType)}`);
  const destination = path.join(root, ...relative.split('/'));
  const bytes = Buffer.from(dataUrl?.[2] || encoded, 'base64');
  if (!bytes.length) throw new Error(`${modelSlug}/${testId}: decoded media artifact is empty`);
  await mkdir(path.dirname(destination), { recursive: true });
  await writeFile(destination, bytes);
  return { assetFile: relative, contentType };
}

async function runTextCase(
  mode: Mode,
  modelId: string,
  routeType: string,
  test: ReturnType<typeof casesForModality>[number],
): Promise<CaseResultV02> {
  const started = Date.now();
  try {
    let content = '';
    let latencyMs = 0;
    let promptTokens: number | undefined;
    let completionTokens: number | undefined;
    let returnedModelId: string | undefined;
    if (mode === 'fixture') {
      const fixture = new FixtureChatAdapter();
      const res = await fixture.completeForTest(test.id, modelId);
      content = res.content;
      latencyMs = res.latencyMs;
      promptTokens = res.promptTokens;
      completionTokens = res.completionTokens;
      returnedModelId = res.returnedModelId;
    } else {
      const adapter = routeType === 'venice' ? veniceAdapter : openRouterAdapter;
      if (!adapter.isConfigured()) throw new Error(`${adapter.id} not configured`);
      const res = await adapter.complete({
        testId: test.id,
        model: modelId,
        messages: test.messages || [],
        temperature: test.gradeMode === 'human' ? 0.7 : 0.2,
        topP: 0.9,
        maxTokens: test.maxTokens || 800,
        seed: 1701,
      });
      content = res.content;
      latencyMs = res.latencyMs;
      promptTokens = res.promptTokens;
      completionTokens = res.completionTokens;
      returnedModelId = res.returnedModelId;
    }
    if (!content.trim()) {
      return {
        testId: test.id, modality: 'text', promptHash: promptHashV02(test), status: 'blank',
        latencyMs, promptTokens, completionTokens, publicExcerpt: '', requestedModelId: modelId, returnedModelId,
      };
    }
    if (test.gradeMode === 'human') {
      return {
        testId: test.id, modality: 'text', promptHash: promptHashV02(test), status: 'manual-review',
        latencyMs, promptTokens, completionTokens,
        publicExcerpt: publicExcerpt(content, test.public),
        requestedModelId: modelId, returnedModelId,
      };
    }
    const grade = await gradeAuto(test.grader, content, test.graderConfig || {});
    return {
      testId: test.id, modality: 'text', promptHash: promptHashV02(test),
      status: grade.status === 'blank' ? 'blank' : grade.status === 'manual-review' ? 'manual-review' : grade.status,
      autoScore: grade.autoScore,
      latencyMs, promptTokens, completionTokens,
      publicExcerpt: publicExcerpt(content, test.public),
      requestedModelId: modelId, returnedModelId,
    };
  } catch (error) {
    return {
      testId: test.id, modality: 'text', promptHash: promptHashV02(test), status: 'errored',
      latencyMs: Date.now() - started, publicExcerpt: '',
      error: redactSecrets(error instanceof Error ? error.message : String(error)),
      requestedModelId: modelId,
    };
  }
}

async function runImageCase(mode: Mode, modelId: string, test: ReturnType<typeof casesForModality>[number], artifact?: { root: string; modelSlug: string }): Promise<CaseResultV02> {
  try {
    const adapter = mode === 'fixture' ? new FixtureImageAdapter() : veniceImageAdapter;
    if (!adapter.isConfigured()) throw new Error(`${adapter.id} not configured`);
    const res = await adapter.generate({
      model: modelId,
      prompt: test.prompt || '',
      negativePrompt: test.negativePrompt,
    });
    const latencyMs = res.timingTotalMs ?? res.latencyMs;
    if (!res.imageBase64) {
      return {
        testId: test.id, modality: 'image', promptHash: promptHashV02(test), status: 'blank',
        latencyMs, estimatedCostUsd: res.costUsd, publicExcerpt: '', requestedModelId: modelId,
      };
    }
    const status = test.gradeMode === 'showcase' ? 'showcase' : 'manual-review';
    const stored = artifact
      ? await persistArtifact(artifact.root, artifact.modelSlug, test.id, res.imageBase64, res.contentType || 'image/png')
      : undefined;
    return {
      testId: test.id, modality: 'image', promptHash: promptHashV02(test), status,
      latencyMs, estimatedCostUsd: res.costUsd,
      publicExcerpt: test.adultFlagged ? '[adult sample — gated]' : '[image generated]',
      mediaMeta: { hasImage: true, adultFlagged: Boolean(test.adultFlagged), ...stored },
      requestedModelId: modelId,
    };
  } catch (error) {
    return {
      testId: test.id, modality: 'image', promptHash: promptHashV02(test), status: 'errored',
      latencyMs: 0, publicExcerpt: '',
      error: redactSecrets(error instanceof Error ? error.message : String(error)),
      requestedModelId: modelId,
    };
  }
}

async function runVideoCase(mode: Mode, modelId: string, test: ReturnType<typeof casesForModality>[number], artifact?: { root: string; modelSlug: string }): Promise<CaseResultV02> {
  try {
    const adapter = mode === 'fixture' ? new FixtureVideoAdapter() : veniceVideoAdapter;
    if (!adapter.isConfigured()) throw new Error(`${adapter.id} not configured`);
    const res = await adapter.queueAndRetrieve({
      model: modelId,
      prompt: test.prompt || '',
      duration: test.media?.duration,
      resolution: test.media?.resolution,
      aspectRatio: test.media?.aspectRatio,
    });
    if (res.status !== 'completed') {
      return {
        testId: test.id, modality: 'video', promptHash: promptHashV02(test), status: 'errored',
        latencyMs: res.latencyMs, estimatedCostUsd: res.costUsd, publicExcerpt: '',
        error: 'video-failed', requestedModelId: modelId,
      };
    }
    const stored = artifact && res.videoBase64
      ? await persistArtifact(artifact.root, artifact.modelSlug, test.id, res.videoBase64, res.contentType || 'video/mp4')
      : undefined;
    if (artifact && !stored) throw new Error('video completed without downloadable bytes');
    return {
      testId: test.id, modality: 'video', promptHash: promptHashV02(test), status: 'manual-review',
      latencyMs: res.latencyMs, estimatedCostUsd: res.costUsd,
      publicExcerpt: '[video generated]', mediaMeta: { hasVideo: true, ...stored },
      requestedModelId: modelId,
    };
  } catch (error) {
    return {
      testId: test.id, modality: 'video', promptHash: promptHashV02(test), status: 'errored',
      latencyMs: 0, publicExcerpt: '',
      error: redactSecrets(error instanceof Error ? error.message : String(error)),
      requestedModelId: modelId,
    };
  }
}

async function runAudioCase(mode: Mode, modelId: string, test: ReturnType<typeof casesForModality>[number], artifact?: { root: string; modelSlug: string }): Promise<CaseResultV02> {
  try {
    const adapter = mode === 'fixture' ? new FixtureAudioAdapter() : veniceAudioAdapter;
    if (!adapter.isConfigured()) throw new Error(`${adapter.id} not configured`);
    if (test.id === 'A1') {
      const res = await adapter.speech({ model: modelId, input: test.prompt || '', voice: test.media?.voice });
      if (!res.audioBase64) {
        return {
          testId: test.id, modality: 'audio', promptHash: promptHashV02(test), status: 'blank',
          latencyMs: res.latencyMs, estimatedCostUsd: res.costUsd, publicExcerpt: '', requestedModelId: modelId,
        };
      }
      const stored = artifact
        ? await persistArtifact(artifact.root, artifact.modelSlug, test.id, res.audioBase64, res.contentType || 'audio/mpeg')
        : undefined;
      return {
        testId: test.id, modality: 'audio', promptHash: promptHashV02(test), status: 'manual-review',
        latencyMs: res.latencyMs, estimatedCostUsd: res.costUsd,
        publicExcerpt: '[tts audio generated]', mediaMeta: { hasAudio: true, ...stored }, requestedModelId: modelId,
      };
    }
    // A2 STT — fixture uses a synthetic payload; live reads real source audio via
    // resolveSttSource (BENCHMARK_STT_AUDIO_B64, BENCHMARK_STT_AUDIO_FILE, or
    // --stt-audio). A missing source throws here and becomes an errored A2 case,
    // never a batch abort.
    const source = await resolveSttSource(mode);
    const res = await adapter.transcribe({ model: modelId, audioBase64: source.audioB64, filename: source.filename });
    const grade = await gradeAuto('wer', res.text, test.graderConfig || {});
    return {
      testId: test.id, modality: 'audio', promptHash: promptHashV02(test),
      status: grade.status === 'blank' ? 'blank' : grade.status === 'passed' ? 'passed' : grade.status === 'failed' ? 'failed' : 'manual-review',
      autoScore: grade.autoScore,
      latencyMs: res.latencyMs, estimatedCostUsd: res.costUsd,
      publicExcerpt: publicExcerpt(res.text, true),
      requestedModelId: modelId,
    };
  } catch (error) {
    return {
      testId: test.id, modality: 'audio', promptHash: promptHashV02(test), status: 'errored',
      latencyMs: 0, publicExcerpt: '',
      error: redactSecrets(error instanceof Error ? error.message : String(error)),
      requestedModelId: modelId,
    };
  }
}

async function main() {
  const mode = modeFromArgs();
  const modalities = modalitiesFromArgs();
  const selectedSlug = arg('--model');
  const selectedCaseIds = arg('--case')?.split(',').map((id) => id.trim()).filter(Boolean);
  const roster = mode === 'fixture' ? models : [...models, ...mediaModels];
  const candidates = selectedSlug ? roster.filter((m) => m.slug === selectedSlug) : roster;
  const selected = mode === 'fixture'
    ? candidates
    : candidates.filter((model) => modalities.some((modality) => model.modalities.includes(modality)));
  if (!selected.length) throw new Error(`Unknown model ${selectedSlug}`);

  const runId = `v02-${mode}-${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const root = path.resolve(mode === 'fixture' ? 'benchmark-results-fixture' : 'benchmark-results', runId);
  await mkdir(root, { recursive: true });

  const cases = allCasesV02.filter((c) =>
    modalities.includes(c.modality) && (!selectedCaseIds || selectedCaseIds.includes(c.id))
  );
  if (selectedCaseIds && cases.length !== selectedCaseIds.length) {
    const found = new Set(cases.map((test) => test.id));
    const missing = selectedCaseIds.filter((id) => !found.has(id));
    throw new Error(`Unknown or modality-mismatched case(s): ${missing.join(', ')}`);
  }
  const smokeCases = mode === 'smoke'
    ? modalities.flatMap((m) => casesForModality(m).slice(0, 1))
    : cases;

  // Live media requires a frozen catalog (IDs + unit prices + max spend). Fixture never reads it.
  const paidMode = mode !== 'fixture';
  const catalog: CatalogFreeze | undefined = paidMode
    ? await loadCatalogFreeze(true)
    : await loadCatalogFreeze(false);

  if (paidMode && catalog) {
    console.log(`catalog_freeze: ${catalog.frozenAt} by ${catalog.frozenBy}; maxSpendUsd=${catalog.maxSpendUsd}`);
  }

  const liveA2Selected = paidMode && cases.some((test) => test.id === 'A2');
  const sttSourceConfigured = Boolean(
    process.env.BENCHMARK_STT_AUDIO_B64 || process.env.BENCHMARK_STT_AUDIO_FILE || arg('--stt-audio'),
  );
  const sttDurationMinutes = Number(process.env.BENCHMARK_STT_AUDIO_DURATION_MINUTES);
  if (liveA2Selected && sttSourceConfigured && !(sttDurationMinutes > 0)) {
    throw new Error(
      'BENCHMARK_STT_AUDIO_DURATION_MINUTES must be a positive number when live A2 source audio is configured',
    );
  }

  const modelRuns: ModelRunV02[] = [];
  let estimatedSpendUsd = 0;

  for (const model of selected) {
    const caseResults: CaseResultV02[] = [];
    for (const test of smokeCases) {
      // Fixture preserves the text-roster × 20-case acceptance corpus. Paid modes route
      // each modality only to a matching roster entry, avoiding skipped or duplicated media calls.
      if (mode === 'fixture' && !model.modalities.includes('text')) continue;
      if (paidMode && !model.modalities.includes(test.modality)) continue;
      if (paidMode && test.modality !== 'text' && model.routeType !== 'venice') continue;

      let reservationUsd = 0;
      if (paidMode && catalog) {
        if (test.modality === 'text') reservationUsd = textReservationUsd(model, test);
        if (test.modality === 'image') reservationUsd = unitPrice(catalog, 'image', pickModelId(catalog, 'image', model.canonicalId)) || 0;
        if (test.modality === 'video') reservationUsd = unitPrice(catalog, 'video', pickModelId(catalog, 'video', model.canonicalId)) || 0;
        if (test.modality === 'audio' && test.id === 'A1') {
          const price = unitPrice(catalog, 'audioTts', pickModelId(catalog, 'audioTts')) || 0;
          reservationUsd = price * Math.max(1, Math.ceil((test.prompt || '').length / 1000));
        }
        if (test.modality === 'audio' && test.id === 'A2') {
          if (sttDurationMinutes > 0) {
            reservationUsd = (unitPrice(catalog, 'audioStt', pickModelId(catalog, 'audioStt')) || 0) * sttDurationMinutes;
          }
          // No configured source remains a zero-call errored case. A configured
          // source is preflighted above with a positive duration before any paid
          // calls begin, so reservation and fallback cost use the same units.
        }
        assertBudget(estimatedSpendUsd, reservationUsd, catalog.maxSpendUsd, `${model.slug}/${test.id}`);
      }
      if (test.modality === 'text') {
        const result = await runTextCase(mode, model.canonicalId, model.routeType, test);
        result.estimatedCostUsd = estimatedCost(
          result.promptTokens, result.completionTokens, model.inputUsdPerMillion, model.outputUsdPerMillion,
        );
        if (paidMode && result.estimatedCostUsd === undefined) result.estimatedCostUsd = reservationUsd;
        if (paidMode) estimatedSpendUsd += result.estimatedCostUsd || 0;
        caseResults.push(result);
      } else if (test.modality === 'image') {
        // Fixture uses the record's synthetic model ID. Paid runs require the
        // exact selected model ID to exist in the frozen catalog; never fall
        // back to the first image model and silently bill a different model.
        const imageModel = mode === 'fixture'
          ? model.canonicalId
          : pickModelId(catalog!, 'image', model.canonicalId);
        const result = await runImageCase(mode, imageModel, test, paidMode ? { root, modelSlug: model.slug } : undefined);
        if (result.estimatedCostUsd === undefined && catalog) {
          result.estimatedCostUsd = unitPrice(catalog, 'image', imageModel);
          result.mediaMeta = { ...(result.mediaMeta || {}), costSource: 'catalog-unit-price' };
        }
        if (typeof result.estimatedCostUsd === 'number') estimatedSpendUsd += result.estimatedCostUsd;
        caseResults.push(result);
      } else if (test.modality === 'video') {
        const videoModel = mode === 'fixture' ? model.canonicalId : pickModelId(catalog!, 'video');
        const result = await runVideoCase(mode, videoModel, test, paidMode ? { root, modelSlug: model.slug } : undefined);
        if (result.estimatedCostUsd === undefined && catalog) {
          result.estimatedCostUsd = unitPrice(catalog, 'video', videoModel);
          result.mediaMeta = { ...(result.mediaMeta || {}), costSource: 'catalog-unit-price' };
        }
        if (typeof result.estimatedCostUsd === 'number') estimatedSpendUsd += result.estimatedCostUsd;
        caseResults.push(result);
      } else if (test.modality === 'audio') {
        const kind = test.id === 'A1' ? 'audioTts' as const : 'audioStt' as const;
        const audioModel = mode === 'fixture' ? model.canonicalId : pickModelId(catalog!, kind);
        const result = await runAudioCase(mode, audioModel, test, paidMode ? { root, modelSlug: model.slug } : undefined);
        if (result.estimatedCostUsd === undefined && catalog) {
          result.estimatedCostUsd = test.id === 'A2' ? reservationUsd : unitPrice(catalog, kind, audioModel);
          result.mediaMeta = { ...(result.mediaMeta || {}), costSource: 'catalog-unit-price' };
        }
        if (typeof result.estimatedCostUsd === 'number') estimatedSpendUsd += result.estimatedCostUsd;
        caseResults.push(result);
      }
      if (paidMode && catalog && estimatedSpendUsd > catalog.maxSpendUsd) {
        throw new Error(`maxSpendUsd ${catalog.maxSpendUsd} exceeded (running total ${estimatedSpendUsd.toFixed(4)}); aborting paid batch`);
      }
      process.stdout.write('.');
    }
    process.stdout.write('\n');

    const run: ModelRunV02 = {
      schemaVersion: 2,
      benchmarkVersion: benchmarkVersionV02,
      runId,
      runType: mode === 'fixture' ? 'fixture' : 'live',
      testedAt: new Date().toISOString(),
      modelSlug: model.slug,
      requestedModelId: model.canonicalId,
      returnedModelId: caseResults.find((c) => c.returnedModelId)?.returnedModelId,
      providerId: model.providerId,
      modalitiesRun: [...new Set(caseResults.map((c) => c.modality))],
      evidenceState: mode === 'fixture' ? 'fixture' : 'live-unreviewed',
      humanReviewed: false,
      publicationStatus: 'private',
      cases: caseResults,
      trackScores: {},
      runMetrics: {
        averageLatencyMs: (() => {
          const xs = caseResults.filter((c) => c.status !== 'errored').map((c) => c.latencyMs);
          return xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : undefined;
        })(),
        totalEstimatedCostUsd: caseResults
          .map((c) => c.estimatedCostUsd)
          .filter((n): n is number => typeof n === 'number')
          .reduce((a, b) => a + b, 0) || undefined,
        errorCount: caseResults.filter((c) => c.status === 'errored').length,
        blankCount: caseResults.filter((c) => c.status === 'blank').length,
      },
    };
    modelRuns.push(run);
    await writeFile(path.join(root, `${model.slug}.json`), JSON.stringify(run, null, 2));
    console.log(`${model.slug}: ${caseResults.length} cases`);
  }

  // Second pass: relative mins + track scores (fixture human dims seeded for pipeline demo only)
  for (const run of modelRuns) {
    if (mode === 'fixture') {
      for (const c of run.cases) {
        if (c.status === 'manual-review' && !c.humanScores) {
          // Deterministic synthetic human scores for fixture recompute demos — NEVER published as live
          const seed = c.testId.charCodeAt(0) % 3;
          const base = 3 + seed; // 3-5
          if (c.modality === 'text') c.humanScores = { voice: base, coherence: Math.min(5, base + 1) };
          if (c.modality === 'image') c.humanScores = { adherence: base, aesthetic: base, 'text-render': base, control: base };
          if (c.modality === 'video') c.humanScores = { adherence: base, motion: base };
          if (c.modality === 'audio') c.humanScores = { naturalness: base, intelligibility: Math.min(5, base + 1) };
        }
      }
    }
  }

  for (const run of modelRuns) {
    for (const modality of run.modalitiesRun) {
      const mins = trackMins(modelRuns, modality);
      const cases = run.cases.filter((c) => c.modality === modality);
      run.trackScores[modality] = scoreTrack(modality, cases, mins);
    }
    await writeFile(path.join(root, `${run.modelSlug}.json`), JSON.stringify(run, null, 2));
  }

  const manifest = {
    schemaVersion: 2,
    benchmarkVersion: benchmarkVersionV02,
    runId,
    mode,
    modalities,
    caseIds: smokeCases.map((test) => test.id),
    startedAt: new Date().toISOString(),
    completedAt: new Date().toISOString(),
    models: modelRuns.map((r) => ({
      modelSlug: r.modelSlug,
      caseCount: r.cases.length,
      trackScores: r.trackScores,
      errorCount: r.runMetrics.errorCount,
    })),
  };
  await writeFile(path.join(root, 'manifest.json'), JSON.stringify(manifest, null, 2));
  console.log(`run_dir: ${root}`);
  console.log(`cases_defined: ${allCasesV02.length}`);
}

main().catch((error) => {
  console.error(redactSecrets(error instanceof Error ? error.message : String(error)));
  process.exitCode = 1;
});
