const TOKEN_PATTERNS = [
  /sk-or-v1-[A-Za-z0-9_-]+/g,
  /sk-[A-Za-z0-9_-]{16,}/g,
  /Bearer\s+[A-Za-z0-9._-]+/gi,
  /(?:api[_ -]?key|token|secret)\s*[:=]\s*[^\s,;]+/gi,
];

export function redactSecrets(value: string): string {
  return TOKEN_PATTERNS.reduce((text, pattern) => text.replace(pattern, '[REDACTED]'), value);
}

export function publicExcerpt(output: string, isPublicCase: boolean): string {
  if (!isPublicCase) return '[Private benchmark output withheld]';
  const normalized = redactSecrets(output).replace(/\s+/g, ' ').trim();
  return normalized.length > 360 ? `${normalized.slice(0, 357)}…` : normalized;
}
