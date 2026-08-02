import { describe, expect, it } from 'vitest';
import { veniceRequestBody } from '../../scripts/benchmark/adapters/venice';
import { videoQueueBody, videoRetrieveBody } from '../../scripts/benchmark/v02/adapters/venice-media';

describe('Venice request payloads', () => {
  it('gives the E2EE Qwen route a token budget that fits its mandatory reasoning', () => {
    // Live-verified: thinking cannot be suppressed on the E2EE route, so it needs
    // max_tokens room beyond the shared case budgets (120-400); other models unchanged.
    expect(veniceRequestBody({ model: 'e2ee-qwen3-6-35b-a3b-uncensored-p', maxTokens: 120 })).toMatchObject({
      venice_parameters: { enable_web_search: 'off', include_venice_system_prompt: false },
      max_tokens: 4096,
    });
    expect(veniceRequestBody({ model: 'e2ee-qwen3-6-35b-a3b-uncensored-p', maxTokens: 2048 })).toMatchObject({
      max_tokens: 4096,
    });
    expect(veniceRequestBody({ model: 'zai-org-glm-5-2', maxTokens: 120 })).not.toHaveProperty('max_tokens');
  });

  it('omits unsupported video deletion controls', () => {
    const body = videoQueueBody({
      model: 'wan-2-7-text-to-video',
      prompt: 'test frame',
    });
    expect(body).not.toHaveProperty('delete_media_on_completion');
    expect(body).toMatchObject({
      duration: '5s',
      resolution: '720p',
      aspect_ratio: '16:9',
    });
  });

  it('posts { model, queue_id } to video retrieve (Venice V1 schema)', () => {
    expect(videoRetrieveBody('wan-2-7-text-to-video', 'abc-123')).toEqual({
      model: 'wan-2-7-text-to-video',
      queue_id: 'abc-123',
    });
  });
});
