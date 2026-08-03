import { ModelSchema, type ModelRecord } from '../lib/schemas';

const records = [
  {
    slug: 'aion-3-0', displayName: 'Aion 3.0', canonicalId: 'aion-labs/aion-3.0', creator: 'AionLabs',
    providerId: 'openrouter', routeType: 'openrouter', family: 'Aion', contextTokens: 131072,
    modalities: ['text'], weights: 'closed', privacy: 'unknown', inputUsdPerMillion: 3, outputUsdPerMillion: 6,
    releasedAt: '2026-07-07', status: 'active', tags: ['roleplay', 'storytelling', 'premium'],
    sourceUrls: ['https://openrouter.ai/aion-labs/aion-3.0'],
  },
  {
    slug: 'minimax-m2-her', displayName: 'MiniMax M2-her', canonicalId: 'minimax/minimax-m2-her', creator: 'MiniMax',
    providerId: 'openrouter', routeType: 'openrouter', family: 'MiniMax', contextTokens: 65536,
    modalities: ['text'], weights: 'closed', privacy: 'unknown', inputUsdPerMillion: 0.3, outputUsdPerMillion: 1.2,
    status: 'active', tags: ['roleplay', 'dialogue', 'character'],
    sourceUrls: ['https://openrouter.ai/minimax/minimax-m2-her'],
  },
  {
    slug: 'cydonia-24b-v4-1', displayName: 'Cydonia 24B V4.1', canonicalId: 'thedrummer/cydonia-24b-v4.1', creator: 'TheDrummer',
    providerId: 'openrouter', routeType: 'openrouter', family: 'Mistral Small 3.2', parameterLabel: '24B', contextTokens: 131072,
    modalities: ['text'], weights: 'open', privacy: 'unknown', inputUsdPerMillion: 0.3, outputUsdPerMillion: 0.5,
    status: 'active', tags: ['uncensored', 'creative-writing', 'roleplay'],
    sourceUrls: ['https://openrouter.ai/thedrummer/cydonia-24b-v4.1', 'https://huggingface.co/TheDrummer/Cydonia-24B-v4.1'],
  },
  {
    slug: 'euryale-70b', displayName: 'Llama 3.3 Euryale 70B', canonicalId: 'sao10k/l3.3-euryale-70b', creator: 'Sao10K',
    providerId: 'openrouter', routeType: 'openrouter', family: 'Llama 3.3', parameterLabel: '70B', contextTokens: 131072,
    modalities: ['text'], weights: 'open', privacy: 'unknown', inputUsdPerMillion: 0.65, outputUsdPerMillion: 0.75,
    status: 'active', tags: ['roleplay', 'creative-writing'],
    sourceUrls: ['https://openrouter.ai/sao10k/l3.3-euryale-70b'],
  },
  {
    slug: 'dolphin-mistral-24b-venice', displayName: 'Dolphin Mistral 24B Venice Edition', canonicalId: 'cognitivecomputations/dolphin-mistral-24b-venice-edition', creator: 'Cognitive Computations / Venice',
    providerId: 'openrouter', routeType: 'openrouter', family: 'Mistral Small', parameterLabel: '24B', contextTokens: 128000,
    modalities: ['text'], weights: 'open', privacy: 'unknown', inputUsdPerMillion: 0.2, outputUsdPerMillion: 0.9,
    status: 'active', tags: ['uncensored', 'instruct'],
    sourceUrls: ['https://openrouter.ai/cognitivecomputations/dolphin-mistral-24b-venice-edition', 'https://huggingface.co/cognitivecomputations/Dolphin-Mistral-24B-Venice-Edition'],
  },
  {
    slug: 'hermes-3-405b', displayName: 'Hermes 3 405B', canonicalId: 'nousresearch/hermes-3-llama-3.1-405b', creator: 'Nous Research',
    providerId: 'openrouter', routeType: 'openrouter', family: 'Llama 3.1', parameterLabel: '405B', contextTokens: 131072,
    modalities: ['text'], weights: 'open', privacy: 'unknown', inputUsdPerMillion: 1, outputUsdPerMillion: 1,
    releasedAt: '2024-08-15', status: 'active', tags: ['steerable', 'roleplay', 'generalist'],
    sourceUrls: ['https://openrouter.ai/nousresearch/hermes-3-llama-3.1-405b', 'https://huggingface.co/NousResearch/Hermes-3-Llama-3.1-405B'],
  },
  {
    slug: 'unslopnemo-12b', displayName: 'UnslopNemo 12B', canonicalId: 'thedrummer/unslopnemo-12b', creator: 'TheDrummer',
    providerId: 'openrouter', routeType: 'openrouter', family: 'Mistral Nemo', parameterLabel: '12B', contextTokens: 1024000,
    modalities: ['text'], weights: 'open', privacy: 'unknown', inputUsdPerMillion: 0.4, outputUsdPerMillion: 0.4,
    releasedAt: '2024-11-08', status: 'active', tags: ['roleplay', 'low-cost', 'long-context'],
    sourceUrls: ['https://openrouter.ai/thedrummer/unslopnemo-12b', 'https://huggingface.co/TheDrummer/UnslopNemo-12B-v4.1'],
  },
  {
    slug: 'mythomax-13b', displayName: 'MythoMax 13B', canonicalId: 'gryphe/mythomax-l2-13b', creator: 'Gryphe',
    providerId: 'openrouter', routeType: 'openrouter', family: 'Llama 2', parameterLabel: '13B', contextTokens: 8192,
    modalities: ['text'], weights: 'open', privacy: 'unknown', inputUsdPerMillion: 0.06, outputUsdPerMillion: 0.06,
    releasedAt: '2023-07-02', status: 'active', tags: ['roleplay', 'legacy', 'low-cost'],
    sourceUrls: ['https://openrouter.ai/gryphe/mythomax-l2-13b', 'https://huggingface.co/Gryphe/MythoMax-L2-13b'],
  },
  {
    slug: 'magnum-v4-72b', displayName: 'Magnum V4 72B', canonicalId: 'anthracite-org/magnum-v4-72b', creator: 'Anthracite',
    providerId: 'openrouter', routeType: 'openrouter', family: 'Qwen 2.5', parameterLabel: '72B', contextTokens: 16384,
    modalities: ['text'], weights: 'open', privacy: 'unknown', inputUsdPerMillion: 3, outputUsdPerMillion: 5,
    releasedAt: '2024-10-21', status: 'active', tags: ['roleplay', 'prose'],
    sourceUrls: ['https://openrouter.ai/anthracite-org/magnum-v4-72b', 'https://huggingface.co/anthracite-org/magnum-v4-72b'],
  },
  {
    slug: 'venice-uncensored-1-2', displayName: 'Venice Uncensored 1.2', canonicalId: 'venice-uncensored-1-2', creator: 'Venice / Cognitive Computations',
    providerId: 'venice', routeType: 'venice', family: 'Mistral Small', parameterLabel: '24B', contextTokens: 128000,
    modalities: ['text'], weights: 'open', privacy: 'private', inputUsdPerMillion: 0.2, outputUsdPerMillion: 0.9,
    releasedAt: '2026-03-31', status: 'active', tags: ['uncensored', 'private'],
    sourceUrls: ['https://docs.venice.ai/models/text', 'https://huggingface.co/cognitivecomputations/Dolphin-Mistral-24B-Venice-Edition'],
  },
  {
    slug: 'venice-uncensored-role-play', displayName: 'Venice Role Play Uncensored', canonicalId: 'venice-uncensored-role-play', creator: 'Venice / dphnAI',
    providerId: 'venice', routeType: 'venice', family: 'Mistral Small 3.2', parameterLabel: '24B', contextTokens: 128000,
    modalities: ['text'], weights: 'open', privacy: 'private', inputUsdPerMillion: 0.5, outputUsdPerMillion: 2,
    releasedAt: '2026-02-19', status: 'active', tags: ['uncensored', 'roleplay', 'private'],
    sourceUrls: ['https://docs.venice.ai/models/text', 'https://huggingface.co/dphnAI/24B-3.2-RP-K2-final'],
  },
  {
    slug: 'gemma-4-uncensored', displayName: 'Gemma 4 Uncensored', canonicalId: 'gemma-4-uncensored', creator: 'Community / Venice',
    providerId: 'venice', routeType: 'venice', family: 'Gemma 4', parameterLabel: '26B A4B', contextTokens: 256000,
    modalities: ['text'], weights: 'open', privacy: 'private', inputUsdPerMillion: 0.16, outputUsdPerMillion: 0.5,
    releasedAt: '2026-04-12', status: 'active', tags: ['uncensored', 'private', 'long-context'],
    sourceUrls: ['https://docs.venice.ai/models/text', 'https://huggingface.co/Jiunsong/supergemma4-26b-uncensored-gguf-v2'],
  },
  {
    slug: 'qwen3-6-35b-uncensored-e2ee', displayName: 'Qwen3.6 35B A3B Uncensored E2EE', canonicalId: 'e2ee-qwen3-6-35b-a3b-uncensored-p', creator: 'Community / Venice',
    providerId: 'venice', routeType: 'venice', family: 'Qwen 3.6', parameterLabel: '35B A3B', contextTokens: 128000,
    modalities: ['text'], weights: 'open', privacy: 'e2ee', inputUsdPerMillion: 0.38, outputUsdPerMillion: 1.88,
    releasedAt: '2026-05-23', status: 'active', tags: ['uncensored', 'e2ee', 'private'],
    sourceUrls: ['https://docs.venice.ai/models/text', 'https://www.redpill.ai/models/phala/qwen3.6-35b-a3b-uncensored'],
  },
  {
    slug: 'glm-5-2', displayName: 'GLM 5.2', canonicalId: 'zai-org-glm-5-2', creator: 'Z.ai',
    providerId: 'venice', routeType: 'venice', family: 'GLM 5.2', contextTokens: 1000000,
    modalities: ['text'], weights: 'unknown', privacy: 'private', inputUsdPerMillion: 1.4, outputUsdPerMillion: 4.4,
    status: 'active', tags: ['generalist', 'private'], sourceUrls: ['https://docs.venice.ai/models/text'],
  },
] as const;

const mediaRecords = [
  {
    slug: 'venice-sd35', displayName: 'Venice SD 3.5', canonicalId: 'venice-sd35', creator: 'Stability AI / Venice',
    providerId: 'venice', routeType: 'venice', family: 'Stable Diffusion 3.5', contextTokens: 77,
    modalities: ['image'], weights: 'open', privacy: 'private', status: 'active',
    tags: ['image', 'private'], sourceUrls: ['https://docs.venice.ai/models/image'],
  },
  {
    slug: 'flux-2-pro', displayName: 'FLUX.2 Pro', canonicalId: 'flux-2-pro', creator: 'Black Forest Labs / Venice',
    providerId: 'venice', routeType: 'venice', family: 'FLUX.2', contextTokens: 77,
    modalities: ['image'], weights: 'unknown', privacy: 'private', status: 'active',
    tags: ['image', 'private'], sourceUrls: ['https://docs.venice.ai/models/image'],
  },
  {
    slug: 'qwen-image-2', displayName: 'Qwen Image 2', canonicalId: 'qwen-image-2', creator: 'Alibaba / Venice',
    providerId: 'venice', routeType: 'venice', family: 'Qwen Image', contextTokens: 77,
    modalities: ['image'], weights: 'unknown', privacy: 'private', status: 'active',
    tags: ['image', 'private'], sourceUrls: ['https://docs.venice.ai/models/image'],
  },
  {
    slug: 'wan-2-7-text-to-video', displayName: 'Wan 2.7 Text to Video', canonicalId: 'wan-2-7-text-to-video', creator: 'Alibaba / Venice',
    providerId: 'venice', routeType: 'venice', family: 'Wan', contextTokens: 77,
    modalities: ['video'], weights: 'open', privacy: 'private', status: 'active',
    tags: ['video', 'private'], sourceUrls: ['https://docs.venice.ai/models/video'],
  },
  {
    slug: 'venice-audio-suite', displayName: 'Venice Audio Suite', canonicalId: 'tts-kokoro + openai/whisper-large-v3', creator: 'Venice',
    providerId: 'venice', routeType: 'venice', family: 'Kokoro / Whisper', contextTokens: 8192,
    modalities: ['audio'], weights: 'open', privacy: 'private', status: 'active',
    tags: ['audio', 'tts', 'stt', 'private'], sourceUrls: ['https://docs.venice.ai/models/audio'],
  },
] as const;

export const models: ModelRecord[] = records.map((record) => ModelSchema.parse(record));
export const mediaModels: ModelRecord[] = mediaRecords.map((record) => ModelSchema.parse(record));
export const modelBySlug = new Map(models.map((model) => [model.slug, model]));
