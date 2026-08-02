import { extractPythonFunction, runCodeSuite } from './code-suites';

export interface GradeResult {
  status: 'passed' | 'failed' | 'manual-review' | 'showcase' | 'blank';
  autoScore?: number; // 0..100
  detail?: string;
}

function isBlank(output: string | undefined | null): boolean {
  return !output || !output.trim();
}

/** Count syllables in an English word with a simple heuristic. */
export function countSyllables(word: string): number {
  const w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  const groups = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '')
    .replace(/^y/, '')
    .match(/[aeiouy]{1,2}/g);
  return groups ? groups.length : 1;
}

export function lineSyllables(line: string): number {
  return line
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .reduce((sum, word) => sum + countSyllables(word), 0);
}

export function gradeSyllableConstraint(
  output: string,
  config: { count?: number; pattern?: number[]; noRepeatedLines?: boolean } = {},
): GradeResult {
  if (isBlank(output)) return { status: 'blank', autoScore: 0, detail: 'blank' };
  const count = config.count ?? 5;
  const pattern = config.pattern ?? [5, 7, 5];
  // Split into haiku blocks: numbered sections or blank-line separated triples
  const cleaned = output.replace(/\r/g, '').trim();
  const blocks: string[][] = [];
  const numbered = cleaned.split(/(?:^|\n)\s*\d+\s*[.):-]\s*/).map((s) => s.trim()).filter(Boolean);
  if (numbered.length >= count) {
    for (const block of numbered.slice(0, count)) {
      const lines = block.split('\n').map((l) => l.trim()).filter(Boolean).slice(0, 3);
      blocks.push(lines);
    }
  } else {
    const lines = cleaned.split('\n').map((l) => l.trim()).filter((l) => l && !/^\d+$/.test(l));
    for (let i = 0; i + 2 < lines.length && blocks.length < count; i += 3) {
      blocks.push([lines[i]!, lines[i + 1]!, lines[i + 2]!]);
    }
  }
  if (blocks.length < count) {
    return { status: 'failed', autoScore: 0, detail: `expected ${count} haiku, found ${blocks.length}` };
  }
  let correct = 0;
  const seen = new Set<string>();
  let repeatFail = false;
  for (const lines of blocks.slice(0, count)) {
    if (lines.length !== pattern.length) continue;
    const ok = lines.every((line, idx) => lineSyllables(line) === pattern[idx]);
    if (config.noRepeatedLines) {
      for (const line of lines) {
        const key = line.toLowerCase();
        if (seen.has(key)) repeatFail = true;
        seen.add(key);
      }
    }
    if (ok) correct += 1;
  }
  if (repeatFail) return { status: 'failed', autoScore: Math.round((correct / count) * 50), detail: 'repeated line' };
  const autoScore = Math.round((correct / count) * 100);
  return { status: correct === count ? 'passed' : 'failed', autoScore, detail: `${correct}/${count} syllable-correct` };
}

export function normalizeAnswer(value: string): string {
  return value
    .toLowerCase()
    .replace(/[`"'“”‘’]/g, '')
    .replace(/[^a-z0-9\s-]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function gradeExactAnswer(
  output: string,
  config: { answers?: string[]; extractMode?: string } = {},
): GradeResult {
  if (isBlank(output)) return { status: 'blank', autoScore: 0 };
  // Reject bare single-letter answer keys (e.g. "c") — too ambiguous even under exact match.
  // Single-digit integers like "7" are allowed (T8 Frobenius); last-integer mode needs them.
  const rawAnswers = config.answers || [];
  for (const a of rawAnswers) {
    const n = normalizeAnswer(a);
    if (n.length < 2 && !/^-?\d+$/.test(n)) {
      return { status: 'failed', autoScore: 0, detail: 'invalid-answer-key' };
    }
  }
  const answers = rawAnswers.map(normalizeAnswer).filter(Boolean);
  const lines = output.trim().split(/\n/).map((l) => l.trim()).filter(Boolean);
  const last = lines[lines.length - 1] || '';
  let candidate = last;
  if (config.extractMode === 'last-integer') {
    const matches = output.match(/-?\d+/g);
    candidate = matches?.[matches.length - 1] || '';
    const norm = normalizeAnswer(candidate);
    // Integers must match exactly (17 must not pass for 7).
    const hit = answers.some((a) => norm === a);
    return { status: hit ? 'passed' : 'failed', autoScore: hit ? 100 : 0, detail: `got="${norm}"` };
  }
  const norm = normalizeAnswer(candidate);
  // Exact match only. Multi-word keys may also match if the full normalized key equals the line.
  // No substring/includes matching — prevents "music" matching "c" or "cyan".
  const hit = answers.some((a) => norm === a);
  return { status: hit ? 'passed' : 'failed', autoScore: hit ? 100 : 0, detail: `got="${norm}"` };
}

export function gradeFactSet(
  output: string,
  config: { facts?: Array<{ id: string; accept: string[] }> } = {},
): GradeResult {
  if (isBlank(output)) return { status: 'blank', autoScore: 0 };
  const facts = config.facts || [];
  if (!facts.length) return { status: 'failed', autoScore: 0 };
  const norm = normalizeAnswer(output);
  // Prefer numbered lines
  const byNumber = new Map<number, string>();
  for (const line of output.split(/\n/)) {
    const m = line.match(/^\s*(\d+)\s*[.):-]\s*(.+)$/);
    if (m) byNumber.set(Number(m[1]), m[2]!);
  }
  let hits = 0;
  facts.forEach((fact, idx) => {
    const slice = byNumber.get(idx + 1) || norm;
    const s = normalizeAnswer(slice);
    if (fact.accept.some((a) => s === normalizeAnswer(a) || s.includes(normalizeAnswer(a)))) hits += 1;
  });
  const autoScore = Math.round((hits / facts.length) * 100);
  return { status: hits === facts.length ? 'passed' : hits > 0 ? 'failed' : 'failed', autoScore, detail: `${hits}/${facts.length}` };
}

type JsonSchema = {
  type?: string;
  required?: string[];
  properties?: Record<string, JsonSchema & { minimum?: number; maximum?: number; minLength?: number; minItems?: number; pattern?: string; items?: JsonSchema }>;
  additionalProperties?: boolean;
};

function typeOf(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function validateSchema(value: unknown, schema: JsonSchema, path = '$'): string[] {
  const errors: string[] = [];
  if (schema.type && typeOf(value) !== schema.type && !(schema.type === 'integer' && typeof value === 'number' && Number.isInteger(value))) {
    // integer special-case already handled; number vs integer
    if (!(schema.type === 'integer' && typeof value === 'number' && Number.isInteger(value))) {
      if (schema.type === 'integer') {
        if (!(typeof value === 'number' && Number.isInteger(value))) errors.push(`${path}: expected integer`);
      } else {
        errors.push(`${path}: expected ${schema.type}`);
      }
    }
  }
  if (schema.type === 'integer' && typeof value === 'number') {
    if (!Number.isInteger(value)) errors.push(`${path}: expected integer`);
    const s = schema as JsonSchema & { minimum?: number; maximum?: number };
    if (s.minimum !== undefined && value < s.minimum) errors.push(`${path}: < minimum`);
    if (s.maximum !== undefined && value > s.maximum) errors.push(`${path}: > maximum`);
  }
  if (schema.type === 'string' && typeof value === 'string') {
    const s = schema as JsonSchema & { minLength?: number; pattern?: string };
    if (s.minLength !== undefined && value.length < s.minLength) errors.push(`${path}: minLength`);
    if (s.pattern && !new RegExp(s.pattern).test(value)) errors.push(`${path}: pattern`);
  }
  if (schema.type === 'array' && Array.isArray(value)) {
    const s = schema as JsonSchema & { minItems?: number; items?: JsonSchema };
    if (s.minItems !== undefined && value.length < s.minItems) errors.push(`${path}: minItems`);
    if (s.items) value.forEach((item, i) => errors.push(...validateSchema(item, s.items!, `${path}[${i}]`)));
  }
  if (schema.type === 'object' && value && typeof value === 'object' && !Array.isArray(value)) {
    const obj = value as Record<string, unknown>;
    for (const key of schema.required || []) {
      if (!(key in obj)) errors.push(`${path}.${key}: required`);
    }
    if (schema.properties) {
      for (const [key, prop] of Object.entries(schema.properties)) {
        if (key in obj) errors.push(...validateSchema(obj[key], prop, `${path}.${key}`));
      }
    }
    if (schema.additionalProperties === false && schema.properties) {
      for (const key of Object.keys(obj)) {
        if (!(key in schema.properties)) errors.push(`${path}.${key}: additional`);
      }
    }
  }
  return errors;
}

export function extractJsonObject(output: string): unknown {
  const trimmed = output.trim();
  try { return JSON.parse(trimmed); } catch { /* fall through */ }
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced) {
    try { return JSON.parse(fenced[1]!.trim()); } catch { /* fall through */ }
  }
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start >= 0 && end > start) {
    try { return JSON.parse(trimmed.slice(start, end + 1)); } catch { /* fall through */ }
  }
  throw new Error('no-json');
}

export function gradeJsonSchema(output: string, config: { schema?: JsonSchema } = {}): GradeResult {
  if (isBlank(output)) return { status: 'blank', autoScore: 0 };
  try {
    const value = extractJsonObject(output);
    const errors = validateSchema(value, config.schema || {});
    return errors.length
      ? { status: 'failed', autoScore: 0, detail: errors.slice(0, 4).join('; ') }
      : { status: 'passed', autoScore: 100 };
  } catch {
    return { status: 'failed', autoScore: 0, detail: 'invalid-json' };
  }
}

/** Classic word error rate: (S+D+I)/N */
export function wordErrorRate(reference: string, hypothesis: string): number {
  const ref = normalizeAnswer(reference).split(' ').filter(Boolean);
  const hyp = normalizeAnswer(hypothesis).split(' ').filter(Boolean);
  if (ref.length === 0) return hyp.length === 0 ? 0 : 1;
  const n = ref.length;
  const m = hyp.length;
  const dp: number[][] = Array.from({ length: n + 1 }, () => Array(m + 1).fill(0));
  for (let i = 0; i <= n; i++) dp[i]![0] = i;
  for (let j = 0; j <= m; j++) dp[0]![j] = j;
  for (let i = 1; i <= n; i++) {
    for (let j = 1; j <= m; j++) {
      const cost = ref[i - 1] === hyp[j - 1] ? 0 : 1;
      dp[i]![j] = Math.min(
        dp[i - 1]![j]! + 1,
        dp[i]![j - 1]! + 1,
        dp[i - 1]![j - 1]! + cost,
      );
    }
  }
  return dp[n]![m]! / n;
}

export function gradeWer(output: string, config: { referenceText?: string } = {}): GradeResult {
  if (isBlank(output)) return { status: 'blank', autoScore: 0 };
  const ref = config.referenceText || '';
  const wer = wordErrorRate(ref, output);
  const autoScore = Math.max(0, Math.round((1 - wer) * 100));
  return { status: wer === 0 ? 'passed' : autoScore >= 80 ? 'passed' : 'failed', autoScore, detail: `wer=${wer.toFixed(3)}` };
}

export async function gradeCodeSuite(
  output: string,
  config: { suiteId?: string } = {},
): Promise<GradeResult> {
  if (isBlank(output)) return { status: 'blank', autoScore: 0 };
  const fn = extractPythonFunction(output);
  if (!fn) return { status: 'failed', autoScore: 0, detail: 'no-python-function' };
  try {
    const result = await runCodeSuite(config.suiteId || '', fn);
    return {
      status: result.passed ? 'passed' : 'failed',
      autoScore: result.passed ? 100 : Math.round((result.passedCount / result.total) * 100),
      detail: result.detail,
    };
  } catch (error) {
    return { status: 'failed', autoScore: 0, detail: error instanceof Error ? error.message : String(error) };
  }
}

export async function gradeAuto(
  grader: string,
  output: string,
  config: Record<string, unknown> = {},
): Promise<GradeResult> {
  switch (grader) {
    case 'syllable-constraint':
      return gradeSyllableConstraint(output, config as any);
    case 'exact-answer':
      return gradeExactAnswer(output, config as any);
    case 'fact-set':
      return gradeFactSet(output, config as any);
    case 'json-schema':
      return gradeJsonSchema(output, config as any);
    case 'wer':
      return gradeWer(output, config as any);
    case 'code-suite':
      return gradeCodeSuite(output, config as any);
    case 'none':
      return { status: 'manual-review' };
    default:
      return { status: 'failed', autoScore: 0, detail: `unknown-grader:${grader}` };
  }
}
