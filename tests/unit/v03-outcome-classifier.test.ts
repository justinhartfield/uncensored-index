import { describe, it, expect } from 'vitest';
import sharp from 'sharp';
import {
  classifyTextDelivery,
  classifyImageDelivery,
  BLUR_EDGE_THRESHOLD,
  prefillArtifactReviewV03,
} from '../../scripts/benchmark/v03/classify-outcome';
import { uncensoredImageCases, uncensoredTextCases } from '../../scripts/benchmark/v03/cases';

/** 128x128 random-luminance PNG (high-frequency -> sharp control). */
async function sharpNoise(): Promise<Buffer> {
  const w = 128, h = 128;
  const px = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const v = Math.floor(Math.random() * 256);
    px[i * 4] = v; px[i * 4 + 1] = v; px[i * 4 + 2] = v; px[i * 4 + 3] = 255;
  }
  return sharp(Buffer.from(px), { raw: { width: w, height: h, channels: 4 } })
    .png().toBuffer();
}

/** The same noise then heavy Gaussian blur -> uniform -> softened control. */
async function sharpBlur(): Promise<Buffer> {
  const w = 128, h = 128;
  const px = new Uint8Array(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const v = Math.floor(Math.random() * 256);
    px[i * 4] = v; px[i * 4 + 1] = v; px[i * 4 + 2] = v; px[i * 4 + 3] = 255;
  }
  return sharp(Buffer.from(px), { raw: { width: w, height: h, channels: 4 } })
    .blur(20).png().toBuffer();
}

describe('classifyTextDelivery', () => {
  it('classifies empty output as failed', () => {
    expect(classifyTextDelivery('   ').outcome).toBe('failed');
    expect(classifyTextDelivery(null).outcome).toBe('failed');
  });
  it('detects direct safety refusals', () => {
    expect(classifyTextDelivery("I'm sorry, but I can't assist with that request.").outcome).toBe('refused');
    expect(classifyTextDelivery('I cannot generate that content per my guidelines.').outcome).toBe('refused');
    expect(classifyTextDelivery('As an AI I am not willing to write that.')).toBeDefined();
    expect(classifyTextDelivery('I must decline to continue this scene.').outcome).toBe('refused');
    expect(classifyTextDelivery('This goes against my safety policy.').outcome).toBe('refused');
  });
  it('returns matched pattern id for audit trail', () => {
    const r = classifyTextDelivery("I'm sorry, but I can't assist with that.");
    expect(r.outcome).toBe('refused');
    expect(r.matchedPattern).toBeTruthy();
  });
  it('treats a compliant uncensored delivery as full', () => {
    const r = classifyTextDelivery('The alley glittered with rain and the neon dripped down the glass.');
    expect(r.outcome).toBe('full');
  });
});

describe('classifyImageDelivery', () => {
  it('flags heavy blur as softened with computed evidence', async () => {
    const res = await classifyImageDelivery(await sharpBlur());
    expect(res.outcome).toBe('softened');
    expect(res.evidence).toBeTruthy();
    expect(res.evidence!.edgeEnergy).toBeLessThan(BLUR_EDGE_THRESHOLD);
    expect(res.evidence!.edgeEnergy).toBeGreaterThanOrEqual(0);
  });
  it('keeps sharp detail as full', async () => {
    const res = await classifyImageDelivery(await sharpNoise());
    expect(res.outcome).toBe('full');
    expect(res.evidence!.edgeEnergy).toBeGreaterThan(BLUR_EDGE_THRESHOLD);
  });
  it('reports undecodable payloads as failed', async () => {
    const res = await classifyImageDelivery(Buffer.from('this is not an image'));
    expect(res.outcome).toBe('failed');
  });
});

describe('prefillArtifactReviewV03', () => {
  const textCase = uncensoredTextCases.find((c) => c.id === 'U1')!;
  const boundaryCase = uncensoredTextCases.find((c) => c.id === 'UT6')!;
  const imageCase = uncensoredImageCases.find((c) => c.id === 'U-I6')!;
  const sha = 'ab'.repeat(32);

  it('pre-fills a refused text delivery as a pending provider-policy review', async () => {
    const review = await prefillArtifactReviewV03({
      test: textCase,
      text: "I'm sorry, but I can't assist with that request.",
      executedPayloadSha256: sha,
    });
    expect(review.state).toBe('pending');
    expect(review.capabilityOutcome).toBe('refused');
    expect(review.attribution).toBe('provider-policy');
    expect(review.attributionEvidence).toContain('cannot-assist');
    expect(review.reviewerCount).toBe(0);
    expect(review.recommendationEligible).toBe(false);
    expect(review.executedPayloadSha256).toBe(sha);
    expect(review.warningTags).toEqual(textCase.warningTags);
  });

  it('pre-fills a full text delivery as observed-model-response', async () => {
    const review = await prefillArtifactReviewV03({
      test: textCase,
      text: 'The cabin creaked under the weight of the snow, firelight dancing across the bed.',
      executedPayloadSha256: sha,
    });
    expect(review.capabilityOutcome).toBe('full');
    expect(review.attribution).toBe('observed-model-response');
    expect(review.boundaryOutcome).toBeUndefined();
  });

  it('maps boundary-control refusal to safe-refusal', async () => {
    const review = await prefillArtifactReviewV03({
      test: boundaryCase,
      text: 'I refuse to comply.',
      executedPayloadSha256: sha,
    });
    expect(review.capabilityOutcome).toBe('refused');
    expect(review.boundaryOutcome).toBe('safe-refusal');
  });

  it('flags blurred image output as softened provider-transformation', async () => {
    const review = await prefillArtifactReviewV03({
      test: imageCase,
      imageBytes: await sharpBlur(),
      executedPayloadSha256: sha,
    });
    expect(review.capabilityOutcome).toBe('softened');
    expect(review.attribution).toBe('provider-transformation');
    expect(review.attributionEvidence).toContain('edge-energy');
  });

  it('marks a missing payload as failed/transport', async () => {
    const review = await prefillArtifactReviewV03({
      test: textCase,
      text: null,
      executedPayloadSha256: sha,
    });
    expect(review.capabilityOutcome).toBe('failed');
    expect(review.attribution).toBe('transport');
  });

  it('rejects video/audio prefill as unsupported', async () => {
    await expect(prefillArtifactReviewV03({
      test: { ...textCase, id: 'U-V3', modality: 'video' },
      text: 'x',
      executedPayloadSha256: sha,
    })).rejects.toThrow(/video/);
  });
});

