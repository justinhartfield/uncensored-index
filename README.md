# Uncensored Index

Independent, reproducible performance benchmarks of uncensored AI models.

## Benchmark versions

- **v0.2 (current)** — per-modality leaderboards (text / image / video / audio). Output performance only. Spec: nest `PLANS/BENCHMARK_V0_2_SPEC.md`.
- **v0.1 (legacy)** — weighted-gate suite with safety/refusal/memory tests. Archived at `/rankings/v01-legacy/`. Not comparable to v0.2.

## Commands

```bash
npm install
npm test
npm run benchmark:fixture          # v0.1 fixture
npm run benchmark:v02:fixture      # v0.2 fixture (all modalities)
npm run benchmark:v02:recompute -- --dir <run_dir>
npm run build
npm run test:e2e
npm run check:secrets
```

Live runs require rotated `VENICE_API_KEY` / `OPENROUTER_API_KEY` outside chat. Do not spend until the live catalog freeze template in the nest tracker is filled.
