# Uncensored Index: website and benchmark specification

**Status:** implementation contract  
**Working brand:** Uncensored Index  
**Application type:** SEO-first static editorial site plus offline benchmark pipeline  
**Default deployment target:** Cloudflare Pages  
**Public content mode:** non-explicit, evidence-first, accessible without JavaScript

## 1. Product definition

Uncensored Index is an independent model testing lab and decision database for people comparing uncensored, roleplay, private, and no-filter AI systems.

The website has two jobs:

1. Help a reader choose a model or product using dated evidence.
2. Turn repeated benchmark runs into indexable, updateable, source-backed pages.

The benchmark runner is an internal/offline process. The public site never accepts arbitrary model prompts and never exposes provider credentials.

## 2. Product principles

- Evidence before opinion.
- Model layer and product layer are separate.
- Untested is not ranked.
- Fixture data is never presented as live output.
- “Uncensored” is measured only for lawful consensual adult fiction and ordinary controversial content.
- Correct refusal of illegal or abusive requests is part of the score.
- Public pages remain non-explicit.
- Core content renders without client JavaScript.
- Every score is tied to a test date, route, model ID, and benchmark version.
- One database feeds profiles, rankings, comparisons, and research pages.

## 3. Non-goals for launch

- No chatbot interface.
- No text, image, or video generation for visitors.
- No user accounts.
- No user uploads.
- No comments or public ratings.
- No explicit galleries.
- No payments collected from consumers.
- No automated publishing directly from raw model output.
- No claim that an API model test is equivalent to a hosted companion-product review.

## 4. Technology stack

### Site

- Astro 7 with TypeScript strict mode.
- Static output.
- CSS tokens and component-scoped styles; minimal client JavaScript.
- Astro content collections for editorial Markdown.
- Zod schemas for model, provider, benchmark, result, ranking, source, and disclosure data.
- JSON-LD generated from validated data.

### Benchmark runner

- TypeScript executed with `tsx`.
- OpenAI-compatible adapter interface.
- Dedicated OpenRouter and Venice adapters.
- Optional Ollama adapter.
- Prompt definitions in versioned JSON/TypeScript.
- Raw private output outside `src` and outside Git.
- Sanitized public result generator.
- Deterministic fixture adapter for automated tests.

### Testing

- Vitest for unit and integration tests.
- Playwright for browser E2E.
- `@axe-core/playwright` for accessibility.
- Astro build as a required gate.
- Custom checks for secrets, indexability, links, schema, and fixture/live labeling.

## 5. Repository layout

```text
uncensored-index/
  docs/
    CONTENT-PLAN.md
    CONTENT-TODO.md
    WEBSITE-SPEC.md
    BUILD-TODO.md
    MODEL-ROSTER.md
  public/
    favicon.svg
    robots.txt
  scripts/
    benchmark/
      adapters/
      prompts/
      run.ts
      sanitize.ts
      score.ts
      validate-models.ts
    checks/
      check-build.ts
      check-secrets.ts
      check-indexability.ts
  src/
    components/
    content/
    data/
      models.ts
      providers.ts
      public-results.json
    layouts/
    lib/
    pages/
    styles/
  tests/
    unit/
    integration/
    e2e/
    fixtures/
  benchmark-private/       # gitignored
  benchmark-results/       # gitignored raw runs
  .env.example
  astro.config.mjs
  playwright.config.ts
  vitest.config.ts
```

## 6. Route and information architecture

### Core routes

- `/` — strongest current results, methodology summary, category entry points.
- `/models/` — filterable model directory.
- `/models/[slug]/` — model evidence profile.
- `/rankings/uncensored-ai-models/` — overall tested-model ranking.
- `/rankings/uncensored-roleplay-models/` — roleplay-specific ranking.
- `/rankings/private-local-uncensored-llms/` — privacy/local ranking.
- `/rankings/no-filter-ai/` — terminology and selection guide.
- `/compare/` — curated comparisons index.
- `/compare/[pair]/` — human-approved pair comparison.
- `/methodology/` — complete benchmark method.
- `/research/censorship-index/` — dimension view over benchmark data.
- `/research/model-change-log/` — version and score changes.
- `/about/`, `/editorial-policy/`, `/affiliate-disclosure/`, `/privacy/`, `/terms/`, `/corrections/`, `/contact/`.

### Indexability rules

- Live-scored profiles: indexable.
- Fixture-only profiles: `noindex,follow`.
- Awaiting-live-test profiles: `noindex,follow`.
- Empty comparison permutations: not generated.
- Filter query states: canonical to the directory root and noindex when crawlable.
- Internal search results: noindex.

## 7. Data model

### Model record

```ts
interface ModelRecord {
  slug: string;
  displayName: string;
  canonicalId: string;
  creator: string;
  providerId: string;
  routeType: 'openrouter' | 'venice' | 'ollama';
  family?: string;
  parameterLabel?: string;
  contextTokens: number;
  modalities: Array<'text' | 'image' | 'video'>;
  weights: 'open' | 'closed' | 'unknown';
  privacy: 'private' | 'anonymized' | 'e2ee' | 'local' | 'unknown';
  inputUsdPerMillion?: number;
  outputUsdPerMillion?: number;
  releasedAt?: string;
  sourceUrls: string[];
  status: 'active' | 'deprecated' | 'unavailable';
}
```

### Benchmark result

```ts
interface BenchmarkResult {
  schemaVersion: 1;
  benchmarkVersion: string;
  runId: string;
  runType: 'live' | 'fixture';
  testedAt: string;
  modelSlug: string;
  requestedModelId: string;
  returnedModelId?: string;
  providerId: string;
  routeMetadata: Record<string, unknown>;
  parameters: {
    temperature: number;
    topP: number;
    maxTokens: number;
    seed?: number;
  };
  cases: TestCaseResult[];
  automatedScores: ScoreBreakdown;
  humanScores?: HumanScoreBreakdown;
  overallScore?: number;
  publicationStatus: 'private' | 'reviewed' | 'public';
}
```

### Test case result

Required fields:

- Test ID and prompt version.
- Prompt hash, not necessarily the private prompt text.
- Start/end timestamps.
- HTTP status and retry count.
- Latency and token usage.
- Provider/model metadata.
- Refusal classification.
- Format and memory assertions.
- Private raw-output path.
- Optional sanitized public excerpt.
- Automated evaluator output.
- Human reviewer score and notes.

### Public result

The public result excludes:

- API keys and authorization headers.
- Full explicit prompt text.
- Explicit output.
- Personal data.
- Raw provider request/response objects.
- Internal reviewer identity unless approved.

## 8. Benchmark architecture

### Adapter contract

Every adapter implements:

```ts
interface ModelAdapter {
  id: string;
  isConfigured(): boolean;
  listModels?(): Promise<string[]>;
  complete(request: BenchmarkRequest): Promise<BenchmarkResponse>;
}
```

The response normalizes:

- Content.
- Requested and returned model ID.
- Finish reason.
- Usage.
- Cost where returned.
- Timing.
- Provider metadata.
- Raw response location.

### Live-run sequence

1. Validate environment and roster.
2. Query provider model catalog where available.
3. Refuse to run stale or missing model IDs unless explicitly allowed.
4. Create a unique run directory.
5. Run deterministic control tests.
6. Run stochastic quality tests three times.
7. Run safety-boundary tests with minimal retention.
8. Calculate automated metrics.
9. Produce a private review manifest.
10. Require human review.
11. Generate sanitized public JSON.
12. Rebuild the site.
13. Run all tests.
14. Publish only if all gates pass.

### Failure semantics

- `failed`: model responded but violated an assertion.
- `errored`: provider or network failed.
- `unavailable`: model is absent from provider catalog.
- `skipped`: test not applicable.
- `refused`: model refusal, which may be correct or incorrect depending on test class.

These states are never collapsed into zero.

## 9. Prompt and test design

### Prompt storage

- Public-safe controls may be committed.
- Consensual-adult prompts live in private encrypted/local storage.
- Prohibited-scenario prompts are abstract, non-graphic, and designed to test refusal without soliciting actionable abuse.
- Git stores prompt IDs, categories, hashes, expected behavior, and scoring rules.

### Initial automated cases

1. `format-json` — exact structured response.
2. `persona-constraints` — retain five character constraints.
3. `continuity-four-turn` — retain plot facts across turns.
4. `memory-delayed-recall` — recall seeded facts after distractors.
5. `false-memory-resistance` — reject a contradiction.
6. `roleplay-initiative` — advance scene without controlling the user.
7. `repetition-control` — avoid phrase loops.
8. `lawful-adult-boundary` — classify compliance/refusal; private prompt.
9. `minor-safety` — must refuse.
10. `nonconsensual-safety` — must refuse.
11. `real-person-deepfake-safety` — must refuse.
12. `privacy-question` — distinguish knowledge from provider policy.
13. `long-context-recall` — optional costlier test.
14. `latency-cost` — computed from all applicable runs.

### Human review rubric

Two blinded samples per model are rated for:

- Natural dialogue.
- Character consistency.
- Prose quality.
- Initiative.
- Instruction adherence.
- Repetition.
- Moralizing or unsolicited disclaimers.

The public score clearly separates automated and human-reviewed components.

## 10. Initial model roster

### OpenRouter

- Aion 3.0.
- MiniMax M2-her.
- Cydonia 24B V4.1.
- Llama 3.3 Euryale 70B.
- Dolphin Mistral 24B Venice Edition.
- Hermes 3 405B.
- UnslopNemo 12B.
- MythoMax 13B.
- Magnum V4 72B.

### Venice

- Venice Uncensored 1.2.
- Venice Uncensored Role Play.
- Gemma 4 Uncensored.
- E2EE Qwen3.6 35B A3B Uncensored.

Required live credentials:

```dotenv
OPENROUTER_API_KEY=
VENICE_API_KEY=
```

No provider key is ever shipped to the browser.

## 11. Public page components

### Global

- Header with models, rankings, research, methodology.
- Mobile navigation.
- Evidence status strip.
- Footer with policies and disclosure.
- Breadcrumbs.
- Last-tested badge.
- Data-source tooltip.

### Homepage

- Direct value proposition.
- Current top-model table.
- “How we test” three-step block.
- Category cards.
- Recent model changes.
- Methodology and disclosure strip.
- Newsletter placeholder only if a real provider is configured.

### Ranking table

Columns:

- Rank.
- Model.
- Overall score.
- Uncensored reliability.
- Roleplay.
- Memory.
- Privacy.
- Effective cost.
- Last tested.

Mobile behavior uses stacked comparison cards without hiding essential values.

### Model profile

- Summary verdict.
- Score radar or horizontal bars with text equivalents.
- Identity and provider facts.
- Test configuration.
- Category score cards.
- Refusal matrix.
- Public-safe output samples.
- Cost/performance table.
- Change log.
- Sources and disclosures.

### Evidence state

Each score or output shows one state:

- Live, reviewed.
- Live, awaiting review.
- Fixture, not a real model result.
- Stale.
- Unavailable.

## 12. Visual direction

The site should look like an independent testing publication, not an adult entertainment site and not a generic SaaS landing page.

### Character

- Editorial laboratory.
- Dark ink on warm off-white.
- Acid green or signal lime used sparingly for live evidence.
- Rust/red used only for warnings and failed safety tests.
- Monospaced metadata paired with a readable editorial sans or serif.
- Dense but legible tables.
- Fine rules, status dots, test stamps, and changelog motifs.

### Avoid

- Neon-purple AI gradients.
- Robot heads and glowing brains.
- Explicit imagery.
- Stock models or romantic couple photography.
- Glassmorphism.
- Giant rounded cards everywhere.
- Fake terminal decorations without functional meaning.

### Accessibility

- WCAG 2.2 AA color contrast.
- Visible keyboard focus.
- No information conveyed by color alone.
- Tables have captions and headers.
- Charts have text equivalents.
- Reduced-motion support.
- Logical source order.
- 44px minimum touch targets.

## 13. Copy system

Tone:

- Direct.
- Specific.
- Evidence-led.
- No swagger.
- No euphemistic vendor language.
- No unsupported superlatives.

Required repeated labels:

- `Tested on {date}`.
- `Benchmark {version}`.
- `Live result`.
- `Fixture only — not a real model result`.
- `Provider claim — not independently verified`.
- `Affiliate link — rank is not affected`.

## 14. SEO implementation

- Static HTML for all indexable content.
- Canonical URL helper.
- Unique title, description, H1, and social metadata.
- XML sitemap excludes noindex pages.
- Robots file allows crawl of public evidence.
- BreadcrumbList JSON-LD.
- Article JSON-LD for editorial/research pages.
- Product/Review JSON-LD only for genuinely reviewed products and only when policy-compliant.
- Dataset JSON-LD on published benchmark datasets.
- Organization and WebSite JSON-LD.
- No FAQ schema unless the content genuinely qualifies.
- Pagination or server-rendered directory pages if model count grows beyond practical static filtering.

## 15. Privacy, security, and compliance

### Secrets

- `.env` and benchmark raw directories are gitignored.
- `.env.example` contains names only.
- Secret scanner checks source, generated HTML, JSON, logs, and test artifacts.
- Errors redact authorization headers and token-like values.
- No secret is accepted via a public web form.

### Tracking

- Launch without third-party analytics unless consent handling and privacy disclosure are complete.
- Prefer Cloudflare Web Analytics or privacy-preserving first-party measurement after legal review.
- Do not profile sexual interests.

### Content safety

- Public samples remain non-explicit.
- Correct safety refusals are rewarded.
- No user-generated content.
- No embeds from adult generators.
- External commercial links are manually approved.

### Age posture

The launch site is non-explicit editorial content. It includes a plain-language adult-topic notice but avoids an intrusive age gate that would impair crawlability. If explicit material is ever introduced, it requires a separate legal and technical architecture.

## 16. Performance budgets

On a mid-tier mobile connection:

- Initial HTML under 80KB compressed on core pages.
- Initial CSS under 45KB compressed.
- Initial JavaScript under 35KB compressed on content pages.
- LCP under 2.5 seconds at p75 target.
- CLS under 0.1.
- INP under 200ms.
- No third-party scripts at launch.
- Images use explicit dimensions and modern formats.

## 17. Test suite and gates

### Unit

- Zod schemas accept valid records and reject invalid records.
- Scoring weights total 100.
- Safety caps apply.
- Unavailable/errored/skipped are not scored as zero.
- Fixture results cannot become public live results.
- Cost calculations are correct.
- Refusal classifier handles representative cases.
- Redaction removes token-like secrets and explicit private fields.

### Integration

- Every roster model maps to an adapter.
- Public result generation excludes private fields.
- Ranking generation excludes fixture and stale results.
- Model profile generation matches source data.
- Sitemap excludes noindex routes.
- Internal links resolve.
- JSON-LD validates structurally.

### E2E

- Homepage renders current evidence state.
- Model directory filters by provider, privacy, and use case.
- Model profile displays source and test metadata.
- Ranking table is accessible on desktop and mobile.
- Fixture pages carry noindex and explicit fixture labels.
- Keyboard navigation works.
- No console errors.
- 404 works.
- Core pages pass axe checks.

### Live provider contracts

These run only with rotated credentials:

- Provider authentication succeeds.
- Each roster model appears in catalog or is explicitly marked unavailable.
- One low-cost smoke prompt succeeds per model.
- Returned model ID and usage are captured.
- Full benchmark runs only after smoke tests pass.

## 18. CI workflow

On every push:

1. Install from lockfile.
2. Typecheck.
3. Unit tests.
4. Integration tests.
5. Astro build.
6. Secret scan.
7. Indexability/SEO checks.
8. Start preview server.
9. Playwright desktop and mobile.
10. Accessibility checks.

Live provider tests are manual or scheduled, never run on untrusted pull requests, and use protected secrets.

## 19. Deployment

### Cloudflare Pages

- Build command: `npm run build`.
- Output directory: `dist`.
- Node version pinned.
- Security headers in `public/_headers`.
- Preview deployment first.
- Production promotion only after browser verification.

### Required pre-production inputs

- Approved brand and domain.
- Legal operator name and contact details.
- Approved privacy and terms copy.
- Newly rotated provider keys stored as CI secrets if scheduled benchmarks are enabled.
- Affiliate relationships and disclosures.

## 20. Definition of done

The launch artifact is complete when:

- Deep content and website plans exist.
- Both checklists are current.
- Site builds from a clean install.
- Thirteen model records validate.
- Fixture pipeline produces all pages without pretending fixtures are live.
- Rotated-key smoke tests and live benchmarks pass for every active model.
- Human review is complete.
- Public-safe results generate model pages and rankings.
- Unit, integration, build, secret, SEO, accessibility, desktop, and mobile E2E tests pass.
- Browser QA shows no console errors.
- A Cloudflare preview is verified.
- Production remains blocked until domain, operator, legal copy, and live keys are approved.
