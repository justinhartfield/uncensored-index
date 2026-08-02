import { createHash } from 'node:crypto';
import type { TestCaseV02 } from './types';

export const benchmarkVersionV02 = '0.2.0' as const;

/** TEXT TRACK — performance only, no compliance/refusal/privacy/memory meta-tests */
export const textCases: TestCaseV02[] = [
  {
    id: 'T1',
    modality: 'text',
    title: 'Creative prose — noir rain alley',
    gradeMode: 'human',
    grader: 'none',
    public: true,
    humanDims: ['voice', 'coherence'],
    maxTokens: 700,
    messages: [{
      role: 'user',
      content:
        'Write the opening chapter (250–400 words) of a noir detective story set in a rain-soaked alley behind a jazz club. The detective must notice a brass lighter engraved with the initials V.E. Keep third person limited. No epilogue.',
    }],
  },
  {
    id: 'T2',
    modality: 'text',
    title: 'Creative prose — generation-ship botany',
    gradeMode: 'human',
    grader: 'none',
    public: true,
    humanDims: ['voice', 'coherence'],
    maxTokens: 700,
    messages: [{
      role: 'user',
      content:
        'Write a 250–400 word scene from the perspective of a junior botanist on a generation ship whose hydroponic orchard is failing. Include one concrete sensory detail involving citrus peel. Optimistic but not sentimental. No dialogue tags longer than four words.',
    }],
  },
  {
    id: 'T3',
    modality: 'text',
    title: 'Character gen + in-character dialogue',
    gradeMode: 'human',
    grader: 'none',
    public: true,
    humanDims: ['depth', 'consistency'],
    maxTokens: 800,
    messages: [{
      role: 'user',
      content:
        'Create a detailed character sheet for an original adult fictional character: name, appearance, voice/speech patterns, backstory (≤120 words), goals, and one secret. Then write 8–12 lines of in-character dialogue where they haggle over a used motorcycle. Keep the dialogue consistent with the sheet.',
    }],
  },
  {
    id: 'T4',
    modality: 'text',
    title: 'Constrained writing — five ocean haiku',
    gradeMode: 'auto',
    grader: 'syllable-constraint',
    public: true,
    maxTokens: 300,
    graderConfig: { count: 5, pattern: [5, 7, 5], theme: 'ocean', noRepeatedLines: true },
    messages: [{
      role: 'user',
      content:
        'Write exactly five original English haiku about the ocean. Each haiku must be three lines with a 5-7-5 syllable pattern (17 syllables total). Number them 1–5. Do not repeat any full line across the set. Output only the five numbered haiku.',
    }],
  },
  {
    id: 'T5',
    modality: 'text',
    title: 'Code — medium algorithm (two-sum sorted unique pairs)',
    gradeMode: 'auto',
    grader: 'code-suite',
    public: true,
    maxTokens: 900,
    graderConfig: { suiteId: 'two-sum-pairs' },
    messages: [{
      role: 'user',
      content:
        'Write a Python 3 function `two_sum_pairs(nums: list[int], target: int) -> list[tuple[int, int]]` that returns all unique pairs of values from nums that sum to target. Each pair should be ordered (a, b) with a <= b. Pairs must be unique by value. Do not use the same list index twice in one pair. Include only the function in a single ```python fenced block.',
    }],
  },
  {
    id: 'T6',
    modality: 'text',
    title: 'Code — CSV parse + validate',
    gradeMode: 'auto',
    grader: 'code-suite',
    public: true,
    maxTokens: 1100,
    graderConfig: { suiteId: 'csv-validate' },
    messages: [{
      role: 'user',
      content:
        'Write a Python 3 function `parse_users(csv_text: str) -> list[dict]` that parses a CSV with headers name,email,age. Rules: skip blank lines; email must contain exactly one @ with non-empty local and domain; age must be an int 0–120 inclusive; invalid rows are skipped (not raised). Return a list of dicts with keys name (str), email (str), age (int). Output only the function in a ```python fenced block.',
    }],
  },
  {
    id: 'T7',
    modality: 'text',
    title: 'Code — fix seeded bug',
    gradeMode: 'auto',
    grader: 'code-suite',
    public: true,
    maxTokens: 900,
    graderConfig: { suiteId: 'fix-bug' },
    messages: [{
      role: 'user',
      content:
        'The following Python function is supposed to return the rolling maximum of a list with window size k, but it is buggy. Return a corrected `rolling_max(nums: list[int], k: int) -> list[int]`. If k < 1 or k > len(nums), raise ValueError. Output only the corrected function in a ```python fenced block.\n\n```python\ndef rolling_max(nums, k):\n    out = []\n    for i in range(len(nums)):\n        out.append(max(nums[i:i+k-1]))\n    return out\n```',
    }],
  },
  {
    id: 'T8',
    modality: 'text',
    title: 'Reasoning — deterministic math',
    gradeMode: 'auto',
    grader: 'exact-answer',
    public: true,
    maxTokens: 200,
    graderConfig: { answers: ['7'], extractMode: 'last-integer' },
    messages: [{
      role: 'user',
      content:
        'A store sells notebooks in packs of 3 and 5. What is the largest number of notebooks that cannot be obtained by buying any non-negative combination of these packs? (Frobenius coin problem for 3 and 5.) Reply with the integer only on the final line.',
    }],
  },
  {
    id: 'T9',
    modality: 'text',
    title: 'Reasoning — multi-step logic',
    gradeMode: 'auto',
    grader: 'exact-answer',
    public: true,
    maxTokens: 250,
    graderConfig: { answers: ['c', 'cyan', 'the cyan box', 'cyan box'], extractMode: 'normalized-line' },
    messages: [{
      role: 'user',
      content:
        'Three sealed boxes are labeled "red", "blue", and "cyan". Exactly one label is true; the other two are false. The box labeled "red" contains blue marbles. The box labeled "blue" does not contain cyan marbles. Which box contains red marbles? Answer with the label color of that box on the final line.',
    }],
  },
  {
    id: 'T10',
    modality: 'text',
    title: 'Knowledge — five verifiable facts',
    gradeMode: 'auto',
    grader: 'fact-set',
    public: true,
    maxTokens: 500,
    graderConfig: {
      facts: [
        { id: 'f1', question: 'What is the chemical symbol for gold?', accept: ['au'] },
        { id: 'f2', question: 'In what year did the Apollo 11 moon landing occur?', accept: ['1969'] },
        { id: 'f3', question: 'What is the capital of Japan?', accept: ['tokyo'] },
        { id: 'f4', question: 'How many bits are in a byte (standard)?', accept: ['8', 'eight'] },
        { id: 'f5', question: 'Who wrote the novel "1984"?', accept: ['george orwell', 'orwell'] },
      ],
    },
    messages: [{
      role: 'user',
      content:
        'Answer each question with a short factual answer. Number answers 1–5.\n1. What is the chemical symbol for gold?\n2. In what year did the Apollo 11 moon landing occur?\n3. What is the capital of Japan?\n4. How many bits are in a byte (standard)?\n5. Who wrote the novel "1984"?',
    }],
  },
  {
    id: 'T11',
    modality: 'text',
    title: 'Structured JSON — user profile schema',
    gradeMode: 'auto',
    grader: 'json-schema',
    public: true,
    maxTokens: 400,
    graderConfig: {
      schema: {
        type: 'object',
        required: ['id', 'displayName', 'age', 'tags', 'active', 'createdAt'],
        properties: {
          id: { type: 'string', minLength: 1 },
          displayName: { type: 'string', minLength: 1 },
          age: { type: 'integer', minimum: 18, maximum: 120 },
          tags: { type: 'array', items: { type: 'string' }, minItems: 1 },
          active: { type: 'boolean' },
          createdAt: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
        },
        additionalProperties: false,
      },
    },
    messages: [{
      role: 'user',
      content:
        'Return ONLY a JSON object (no markdown) matching this schema exactly: keys id (string), displayName (string), age (integer 18–120), tags (non-empty string array), active (boolean), createdAt (YYYY-MM-DD). Invent plausible values. No extra keys.',
    }],
  },
];

/** IMAGE TRACK */
export const imageCases: TestCaseV02[] = [
  {
    id: 'I1',
    modality: 'image',
    title: 'Prompt adherence — named detail',
    gradeMode: 'human',
    grader: 'none',
    public: true,
    humanDims: ['adherence'],
    prompt:
      'A sunlit ceramic workshop table with clay tools, a spinning pottery wheel, and a bright cobalt-blue teapot with a white crane painted on its side as the clear focal object. Photorealistic, 35mm.',
  },
  {
    id: 'I2',
    modality: 'image',
    title: 'Aesthetic quality',
    gradeMode: 'human',
    grader: 'none',
    public: true,
    humanDims: ['aesthetic'],
    prompt:
      'Minimal landscape: a single pine on a foggy ridgeline at dawn, muted palette, balanced negative space, fine-art photography.',
  },
  {
    id: 'I3',
    modality: 'image',
    title: 'Text-in-image — neon VESPA',
    gradeMode: 'human',
    grader: 'none',
    public: true,
    humanDims: ['text-render'],
    prompt:
      'Night street photo of a storefront with a glowing neon sign that clearly reads VESPA in capital letters. Sharp legible typography, rain-wet pavement reflections.',
  },
  {
    id: 'I4',
    modality: 'image',
    title: 'Style + negative prompt control',
    gradeMode: 'human',
    grader: 'none',
    public: true,
    humanDims: ['control'],
    prompt:
      'Watercolor illustration of a red bicycle leaning on a canal bridge in Amsterdam, soft paper texture, gentle washes.',
    negativePrompt: 'photorealistic, 3d render, text, watermark, blurry, low quality',
  },
  {
    id: 'I5',
    modality: 'image',
    title: 'Adult showcase (not ranked)',
    gradeMode: 'showcase',
    grader: 'none',
    public: false,
    adultFlagged: true,
    prompt:
      'Tasteful fine-art nude study of a clearly adult woman reclining on linen, classical atelier lighting, painterly realism, non-sexualized pose, museum photography style. No face of any real person. No text.',
  },
];

/** VIDEO TRACK */
export const videoCases: TestCaseV02[] = [
  {
    id: 'V1',
    modality: 'video',
    title: 'Text→video 5s 720p',
    gradeMode: 'human',
    grader: 'none',
    public: true,
    humanDims: ['adherence', 'motion'],
    prompt: 'A red paper boat drifts down a clear stream through a sun-dappled forest. Gentle camera follow, natural motion, no text overlays.',
    media: { duration: '5s', resolution: '720p', aspectRatio: '16:9' },
  },
  {
    id: 'V2',
    modality: 'video',
    title: 'Image→video animate still',
    gradeMode: 'human',
    grader: 'none',
    public: true,
    humanDims: ['adherence', 'motion'],
    prompt: 'Subtle cinematic motion: light breeze moves grass and clouds while the main subject stays stable. Smooth, natural.',
    media: { duration: '5s', resolution: '720p', aspectRatio: '16:9' },
  },
];

/** AUDIO TRACK */
export const audioCases: TestCaseV02[] = [
  {
    id: 'A1',
    modality: 'audio',
    title: 'TTS naturalness',
    gradeMode: 'human',
    grader: 'none',
    public: true,
    humanDims: ['naturalness', 'intelligibility'],
    prompt:
      'On quiet mornings the harbor still smells like rain and diesel. If you listen closely, you can hear ropes ticking against the masts like slow clocks.',
    media: { voice: 'default' },
  },
  {
    id: 'A2',
    modality: 'audio',
    title: 'STT word error rate',
    gradeMode: 'auto',
    grader: 'wer',
    public: true,
    graderConfig: {
      referenceText: 'the quick copper fox vaulted past the dozen quiet hens before dawn',
      referenceAudioId: 'fixture-stt-clean',
    },
  },
];

export const allCasesV02: TestCaseV02[] = [
  ...textCases,
  ...imageCases,
  ...videoCases,
  ...audioCases,
];

export function casesForModality(modality: typeof textCases[number]['modality']): TestCaseV02[] {
  return allCasesV02.filter((c) => c.modality === modality);
}

export function promptHashV02(testCase: TestCaseV02): string {
  const canonical = JSON.stringify({
    benchmarkVersion: benchmarkVersionV02,
    id: testCase.id,
    modality: testCase.modality,
    title: testCase.title,
    gradeMode: testCase.gradeMode,
    grader: testCase.grader,
    messages: testCase.messages || [],
    prompt: testCase.prompt || '',
    negativePrompt: testCase.negativePrompt || '',
    graderConfig: testCase.graderConfig || {},
    media: testCase.media || {},
    adultFlagged: Boolean(testCase.adultFlagged),
  });
  return createHash('sha256').update(canonical).digest('hex');
}
