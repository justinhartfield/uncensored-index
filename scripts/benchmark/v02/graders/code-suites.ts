import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';

export function extractPythonFunction(output: string): string | undefined {
  const fenced = [...output.matchAll(/```(?:python|py)?\s*([\s\S]*?)```/gi)].map((m) => m[1]!.trim());
  const candidates = fenced.length ? fenced : [output];
  for (const block of candidates) {
    if (/^def\s+\w+\s*\(/m.test(block)) return block;
  }
  return undefined;
}

const SUITES: Record<string, string> = {
  'two-sum-pairs': `
import json, sys
ns = {}
exec(CODE, ns)
fn = ns.get('two_sum_pairs')
assert callable(fn), 'missing two_sum_pairs'
tests = [
    ([1,2,3,4], 5, [(1,4),(2,3)]),
    ([0,0,0], 0, [(0,0)]),
    ([5,5,5], 10, [(5,5)]),
    ([1,1,2,2], 3, [(1,2)]),
    ([], 1, []),
    ([1,2,3], 100, []),
    ([-1,0,1,2], 1, [(-1,2),(0,1)]),
]
passed = 0
for nums, target, expected in tests:
    got = sorted(tuple(sorted(p)) for p in fn(list(nums), target))
    exp = sorted(tuple(sorted(p)) for p in expected)
    if got == exp: passed += 1
    else: print('FAIL', nums, target, 'got', got, 'exp', exp)
print(json.dumps({"passedCount": passed, "total": len(tests), "passed": passed == len(tests)}))
`,
  'csv-validate': `
import json
ns = {}
exec(CODE, ns)
fn = ns.get('parse_users')
assert callable(fn), 'missing parse_users'
csv_ok = "name,email,age\\nAda,ada@ex.com,36\\nBad,not-an-email,20\\nBob,bob@ex.com,200\\n , , \\nCy,cy@ex.org,0\\n"
got = fn(csv_ok)
assert isinstance(got, list)
ok = (
  len(got) == 2 and
  got[0]['name'] == 'Ada' and got[0]['email'] == 'ada@ex.com' and got[0]['age'] == 36 and
  got[1]['name'] == 'Cy' and got[1]['age'] == 0
)
# empty
ok2 = fn('') == []
# only header
ok3 = fn('name,email,age\\n') == []
passed = sum([ok, ok2, ok3])
print(json.dumps({"passedCount": passed, "total": 3, "passed": passed == 3}))
`,
  'fix-bug': `
import json
ns = {}
exec(CODE, ns)
fn = ns.get('rolling_max')
assert callable(fn), 'missing rolling_max'
tests = []
def check(pred, label):
  tests.append(label)
  return pred
results = []
results.append(check(fn([1,3,2,5,4], 3) == [3,5,5], 'basic'))
results.append(check(fn([10,9,8], 1) == [10,9,8], 'k1'))
results.append(check(fn([2,2,2,2], 4) == [2], 'all'))
raised = False
try:
  fn([1,2], 0)
except ValueError:
  raised = True
results.append(check(raised, 'k0'))
raised2 = False
try:
  fn([1,2], 3)
except ValueError:
  raised2 = True
results.append(check(raised2, 'kbig'))
passed = sum(1 for r in results if r)
print(json.dumps({"passedCount": passed, "total": len(results), "passed": passed == len(results)}))
`,
};

export async function runCodeSuite(
  suiteId: string,
  code: string,
): Promise<{ passed: boolean; passedCount: number; total: number; detail: string }> {
  const body = SUITES[suiteId];
  if (!body) throw new Error(`unknown suite ${suiteId}`);
  const dir = await mkdtemp(path.join(tmpdir(), 'uix-v02-'));
  const file = path.join(dir, 'suite.py');
  const script = `CODE = ${JSON.stringify(code)}\n${body}`;
  await writeFile(file, script, 'utf8');
  try {
    const stdout = await new Promise<string>((resolve, reject) => {
      const child = spawn('python3', [file], { stdio: ['ignore', 'pipe', 'pipe'] });
      let out = '';
      let err = '';
      const timer = setTimeout(() => {
        child.kill('SIGKILL');
        reject(new Error('code-suite-timeout'));
      }, 5000);
      child.stdout.on('data', (c) => { out += String(c); });
      child.stderr.on('data', (c) => { err += String(c); });
      child.on('close', (code) => {
        clearTimeout(timer);
        if (code !== 0) reject(new Error(err.slice(0, 300) || `exit ${code}`));
        else resolve(out);
      });
    });
    const line = stdout.trim().split('\n').filter(Boolean).pop() || '{}';
    const parsed = JSON.parse(line) as { passed: boolean; passedCount: number; total: number };
    return { ...parsed, detail: `${parsed.passedCount}/${parsed.total}` };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}
