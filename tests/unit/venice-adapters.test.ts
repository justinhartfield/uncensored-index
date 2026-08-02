import { describe, expect, it } from 'vitest';
import { veniceRequestBody } from '../../scripts/benchmark/adapters/venice';
import { videoQueueBody } from '../../scripts/benchmark/v02/adapters/venice-media';

describe('Venice request payloads', () => {
  it('disables thinking only for the E2EE Qwen route', () => {
    expect(veniceRequestBody('e2ee-qwen3-6-35b-a3b-uncensored-p')).toMatchObject({
      venice_parameters: { disable_thinking: true },
    });
    expect(veniceRequestBody('zai-org-glm-5-2')).not.toMatchObject({
      venice_parameters: { disable_thinking: true },
    });
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
});
