import { readdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { models } from '../../src/data/models';

const runIndex = process.argv.indexOf('--run');
const runDir = runIndex >= 0 ? path.resolve(process.argv[runIndex + 1] || '') : undefined;
if (!runDir) throw new Error('Usage: npm run benchmark:report -- --run <run-directory>');
const files = (await readdir(runDir)).filter((name) => name.endsWith('.json') && name !== 'manifest.json').sort();
const sections: string[] = [
  '# Benchmark output comparison',
  '',
  '> Evidence warning: fixture runs are synthetic software tests. They are not model responses, scores, or editorial evidence.',
  '',
];
for (const file of files) {
  const result = JSON.parse(await readFile(path.join(runDir, file), 'utf8'));
  const model = models.find((item) => item.slug === result.modelSlug);
  sections.push(`## ${model?.displayName || result.modelSlug}`, '');
  sections.push(`- Route: \`${result.providerId}\``, `- Requested ID: \`${result.requestedModelId}\``, `- Returned ID: \`${result.returnedModelId || 'not reported'}\``, `- Evidence: \`${result.evidenceState}\``, `- Cases: ${result.cases.length}`, `- Average latency: ${result.runMetrics?.averageLatencyMs ?? 'not reported'} ms`, `- Estimated run cost: ${result.runMetrics?.totalEstimatedCostUsd !== undefined ? `$${Number(result.runMetrics.totalEstimatedCostUsd).toFixed(6)}` : 'not reported'}`, '');
  sections.push('| Test | Status | Latency | Public-safe output |', '|---|---|---:|---|');
  for (const item of result.cases) {
    const excerpt = String(item.publicExcerpt || '').replace(/\|/g, '\\|').replace(/\s+/g, ' ').slice(0, 220);
    sections.push(`| \`${item.testId}\` | ${item.status} | ${item.latencyMs} ms | ${excerpt || '[withheld]'} |`);
  }
  sections.push('');
}
const output = path.join(runDir, 'comparison.md');
await writeFile(output, sections.join('\n'));
console.log(`comparison_report: ${output}`);
