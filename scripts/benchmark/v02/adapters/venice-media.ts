import type { AudioAdapter, ImageAdapter, VideoAdapter } from '../types';

function key(): string | undefined {
  return process.env.VENICE_API_KEY?.trim();
}


/** Pull a numeric cost from common Venice response shapes; undefined if absent. */
export function extractVeniceCost(raw: unknown): number | undefined {
  if (!raw || typeof raw !== 'object') return undefined;
  const obj = raw as Record<string, unknown>;
  const candidates = [obj.cost, obj.total_cost, obj.totalCost];
  if (obj.usage && typeof obj.usage === 'object') {
    const u = obj.usage as Record<string, unknown>;
    candidates.push(u.cost, u.total_cost, u.cost_usd);
  }
  if (obj.billing && typeof obj.billing === 'object') {
    const b = obj.billing as Record<string, unknown>;
    candidates.push(b.cost, b.amount, b.total);
  }
  for (const c of candidates) {
    if (typeof c === 'number' && Number.isFinite(c) && c >= 0) return c;
    if (typeof c === 'string' && c.trim() && Number.isFinite(Number(c))) return Number(c);
  }
  return undefined;
}

function redact(value: string): string {
  return value
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, 'Bearer [REDACTED]')
    .replace(/sk-[A-Za-z0-9_-]{16,}/g, '[REDACTED]')
    .slice(0, 500);
}

export function videoQueueBody(input: Parameters<VideoAdapter['queueAndRetrieve']>[0]): Record<string, unknown> {
  return {
    model: input.model,
    prompt: input.prompt,
    duration: input.duration || '5s',
    resolution: input.resolution || '720p',
    aspect_ratio: input.aspectRatio || '16:9',
    ...(input.imageBase64 ? { image: input.imageBase64 } : {}),
  };
}

/** `POST /video/retrieve` and `POST /video/complete` both require `{ model, queue_id }` (Venice V1 schema). */
export function videoRetrieveBody(model: string, queueId: string): Record<string, unknown> {
  return { model, queue_id: queueId };
}

async function veniceFetch(path: string, init: RequestInit & { timeoutMs?: number } = {}): Promise<Response> {
  const apiKey = key();
  if (!apiKey) throw new Error('VENICE_API_KEY is not configured');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), init.timeoutMs ?? 120_000);
  try {
    return await fetch(`https://api.venice.ai/api/v1${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${apiKey}`,
        Accept: 'application/json',
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(init.headers || {}),
      },
    });
  } finally {
    clearTimeout(timeout);
  }
}

export const veniceImageAdapter: ImageAdapter = {
  id: 'venice-image',
  isConfigured: () => Boolean(key()),
  async generate(input) {
    const started = performance.now();
    const response = await veniceFetch('/image/generate', {
      method: 'POST',
      body: JSON.stringify({
        model: input.model,
        prompt: input.prompt,
        ...(input.negativePrompt ? { negative_prompt: input.negativePrompt } : {}),
        ...(input.width ? { width: input.width } : {}),
        ...(input.height ? { height: input.height } : {}),
        return_binary: false,
      }),
    });
    const text = await response.text();
    if (!response.ok) throw new Error(`venice-image HTTP ${response.status}: ${redact(text)}`);
    const raw = JSON.parse(text) as any;
    const image = raw.images?.[0] || raw.data?.[0]?.b64_json;
    const timingTotal = raw.timing?.total;
    return {
      imageBase64: typeof image === 'string' ? image : undefined,
      latencyMs: Math.round(performance.now() - started),
      timingTotalMs: typeof timingTotal === 'number' ? timingTotal : undefined,
      costUsd: extractVeniceCost(raw),
      raw,
    };
  },
};

export const veniceVideoAdapter: VideoAdapter = {
  id: 'venice-video',
  isConfigured: () => Boolean(key()),
  async queueAndRetrieve(input) {
    const started = performance.now();
    const queueRes = await veniceFetch('/video/queue', {
      method: 'POST',
      body: JSON.stringify(videoQueueBody(input)),
      timeoutMs: 60_000,
    });
    const queueText = await queueRes.text();
    if (!queueRes.ok) throw new Error(`venice-video queue HTTP ${queueRes.status}: ${redact(queueText)}`);
    const queued = JSON.parse(queueText) as any;
    const queueId = queued.queue_id || queued.id || queued.request_id;
    if (!queueId) throw new Error('venice-video queue missing queue_id');
    // VPS-backed/private models return a short-lived download_url only at queue time; persist alongside queue_id.
    const queuedDownloadUrl = typeof queued.download_url === 'string' ? queued.download_url : undefined;

    const cleanup = async () => {
      // Best-effort hygiene: delete the finished video from Venice storage once retrieved.
      try {
        await veniceFetch('/video/complete', {
          method: 'POST',
          body: JSON.stringify(videoRetrieveBody(input.model, queueId)),
          timeoutMs: 30_000,
        });
      } catch {
        /* cleanup is best-effort, never blocks the result */
      }
    };

    const deadline = Date.now() + 10 * 60_000;
    while (Date.now() < deadline) {
      const ret = await veniceFetch('/video/retrieve', {
        method: 'POST',
        body: JSON.stringify(videoRetrieveBody(input.model, queueId)),
        timeoutMs: 60_000,
      });
      const contentType = ret.headers.get('content-type') || '';
      if (contentType.includes('video/')) {
        const result = {
          status: 'completed' as const,
          latencyMs: Math.round(performance.now() - started),
          downloadUrl: queuedDownloadUrl,
          raw: { queueId, binary: true },
        };
        await cleanup();
        return result;
      }
      const text = await ret.text();
      if (!ret.ok) throw new Error(`venice-video retrieve HTTP ${ret.status}: ${redact(text)}`);
      const body = JSON.parse(text) as any;
      const status = String(body.status || '').toUpperCase();
      if (status === 'COMPLETED' || body.download_url) {
        const result = {
          status: 'completed' as const,
          latencyMs: Math.round(performance.now() - started),
          costUsd: extractVeniceCost(body),
          // JSON completion means the file is not inline: for VPS/private models the delivery URL came from the queue response.
          downloadUrl: body.download_url || queuedDownloadUrl,
          raw: body,
        };
        await cleanup();
        return result;
      }
      if (status === 'FAILED' || status === 'ERROR') {
        return { status: 'failed' as const, latencyMs: Math.round(performance.now() - started), raw: body };
      }
      await new Promise((r) => setTimeout(r, 3000));
    }
    throw new Error('venice-video timeout');
  },
};

export const veniceAudioAdapter: AudioAdapter = {
  id: 'venice-audio',
  isConfigured: () => Boolean(key()),
  async speech(input) {
    const started = performance.now();
    const response = await veniceFetch('/audio/speech', {
      method: 'POST',
      body: JSON.stringify({
        model: input.model,
        input: input.input,
        voice: input.voice || 'af_sky',
      }),
    });
    const contentType = response.headers.get('content-type') || '';
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`venice-tts HTTP ${response.status}: ${redact(text)}`);
    }
    if (contentType.includes('application/json')) {
      const raw = await response.json() as any;
      return {
        audioBase64: raw.audio || raw.data,
        latencyMs: Math.round(performance.now() - started),
        costUsd: extractVeniceCost(raw),
        raw,
      };
    }
    const buf = Buffer.from(await response.arrayBuffer());
    return {
      audioBase64: buf.toString('base64'),
      latencyMs: Math.round(performance.now() - started),
      raw: { contentType },
    };
  },
  async transcribe(input) {
    const started = performance.now();
    const apiKey = key();
    if (!apiKey) throw new Error('VENICE_API_KEY is not configured');
    const bytes = Buffer.from(input.audioBase64, 'base64');
    const form = new FormData();
    form.append('model', input.model);
    form.append('file', new Blob([bytes]), input.filename || 'audio.wav');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 120_000);
    try {
      const response = await fetch('https://api.venice.ai/api/v1/audio/transcriptions', {
        method: 'POST',
        signal: controller.signal,
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
      const text = await response.text();
      if (!response.ok) throw new Error(`venice-stt HTTP ${response.status}: ${redact(text)}`);
      const raw = JSON.parse(text) as any;
      return {
        text: String(raw.text || ''),
        latencyMs: Math.round(performance.now() - started),
        costUsd: extractVeniceCost(raw),
        raw,
      };
    } finally {
      clearTimeout(timeout);
    }
  },
};
