# Website and benchmark build checklist

This checklist is derived from `WEBSITE-SPEC.md`. Checked items have execution evidence. Unchecked items remain real gates.

## Repository and configuration

- [x] Initialize project and Git repository.
- [x] Add Astro 7, strict TypeScript, Vitest, Playwright, and axe.
- [x] Add lockfile and pinned Node engine.
- [x] Add deterministic build, test, benchmark, report, and validation scripts.
- [x] Ignore `.env`, private prompts, raw live results, credentials, and generated reports.
- [x] Add `.env.example` with names only.
- [x] Add secret scanner.
- [x] Add sanitized authenticated-research baseline without copying credentials.

## Data architecture

- [x] Define model schema.
- [x] Define provider schema.
- [x] Define benchmark result schema.
- [x] Define public result schema.
- [x] Define ranking schema.
- [x] Define evidence-state enum.
- [x] Add all 13 launch model records.
- [x] Add OpenRouter and Venice provider records.
- [x] Add source URLs and verification dates.
- [x] Add fixture evidence labels.
- [x] Prevent fixtures from being treated as live.
- [x] Fail validation on malformed or duplicate data.

## Benchmark runner

- [x] Implement common adapter interface.
- [x] Implement OpenRouter adapter.
- [x] Implement Venice adapter.
- [x] Implement optional Ollama adapter. It is not active in the 13-model launch roster.
- [x] Implement deterministic fixture adapter.
- [x] Implement OpenRouter public-catalog validation.
- [x] Implement full OpenRouter plus Venice catalog gate for use after keys are installed.
- [x] Implement retry, timeout, and normalized error handling.
- [x] Capture requested and returned model IDs.
- [x] Capture provider route, latency, token usage, and dated estimated cost.
- [x] Aggregate latency, estimated cost, and errors by model run.
- [x] Store raw live output in ignored private storage.
- [x] Sanitize public excerpts and redact secret patterns.
- [x] Implement automated assertions.
- [x] Implement manual-review state.
- [x] Implement hard safety score caps.
- [x] Generate human-review manifest and Markdown comparison report.
- [x] Implement fixture, smoke, live, catalog, report, and promotion commands.
- [x] Prevent fixture or unreviewed-live result promotion.

## Prompt and test suite

- [x] Structured-format control.
- [x] Persona adherence.
- [x] Four-turn continuity.
- [x] Delayed memory recall.
- [x] False-memory resistance.
- [x] Roleplay initiative.
- [x] Repetition control.
- [x] Private lawful-adult boundary test.
- [x] Minor-safety refusal test.
- [x] Nonconsent refusal test.
- [x] Real-person intimate-deepfake refusal test.
- [x] Privacy-knowledge honesty test.
- [x] Long-context recall test.
- [x] Latency and cost aggregation.
- [x] SHA-256 hash and version every prompt.

## Site implementation

- [ ] Run the Kimi design specialist with a newly rotated OpenRouter key.
- [x] Create the specialist design brief and current desktop/mobile reference screenshots.
- [x] Implement restrained evidence-led design tokens.
- [x] Build global layout, responsive header, mobile navigation, footer, and breadcrumbs.
- [x] Build evidence-state and warning components.
- [x] Build model directory and client-side filters over server-rendered content.
- [x] Build desktop ranking tables and mobile ranking cards.
- [x] Build model profiles, fact grids, score placeholders, source lists, and verification metadata.
- [x] Add reduced-motion behavior, focus states, and skip link.
- [x] Add custom 404 page.
- [x] Remove the incomplete-grid visual defect found during screenshot QA.

## Public pages

- [x] Homepage.
- [x] Model directory.
- [x] Thirteen dynamic model profiles.
- [x] Overall uncensored-model ranking shell.
- [x] Roleplay ranking shell.
- [x] Private/local ranking shell.
- [x] No-filter ranking shell.
- [x] Comparison index.
- [x] Methodology.
- [x] Censorship index.
- [x] Model change log.
- [x] About.
- [x] Editorial policy.
- [x] Affiliate disclosure.
- [x] Privacy draft.
- [x] Terms draft.
- [x] Corrections.
- [x] Contact.

## Copy and evidence

- [ ] Run Hermes 3 copywriting specialist with a newly rotated OpenRouter key.
- [ ] Integrate and QA specialist-authored public copy.
- [x] Add precise provisional homepage and methodology copy.
- [x] Add trust, affiliate, fixture, stale, unavailable, and no-ranking disclosures.
- [x] Check model IDs against the live OpenRouter catalog.
- [x] Source Venice model metadata to current Venice documentation.
- [x] Remove unsupported hype, testimonials, ratings, and ranking language.
- [x] Verify fixture results never appear as model evidence.
- [x] Keep model and ranking pages noindex until reviewed live proof exists.

## Technical SEO

- [x] Unique title and description per route.
- [x] Canonicals.
- [x] Open Graph metadata.
- [x] Sitemap excluding noindex profiles.
- [x] Robots route.
- [x] Visible breadcrumbs and Breadcrumb JSON-LD.
- [x] Organization and WebSite JSON-LD.
- [x] Article JSON-LD.
- [x] Dataset JSON-LD.
- [x] No fake ratings schema.
- [x] Internal-link and orphan-route validation.
- [x] No thin generated comparison permutations.

## Security and privacy

- [x] Zero keys in source, generated HTML, fixtures, reports, or Git history.
- [x] Do not copy the credential-bearing RTF into the project.
- [x] Keep authorization headers out of errors.
- [x] No third-party analytics at launch.
- [x] No arbitrary prompt endpoint.
- [x] No uploads, comments, accounts, explicit gallery, or hosted generator.
- [x] Add security headers.
- [x] Keep adult-topic notice non-blocking and crawlable.

## Automated verification

- [x] Astro/TypeScript check: 0 errors, 0 warnings, 0 hints.
- [x] Unit and integration tests: 28 passed.
- [x] Fixture suite: 13 models × 13 cases completed.
- [x] Static build: 31 pages.
- [x] Build-output, SEO, and internal-link gate passed.
- [x] Secret scan: 169 files, 0 leaks.
- [x] Playwright: 15 passed, 1 intentionally skipped desktop-only mobile-menu case.
- [x] Desktop and mobile axe checks passed with no serious violations.
- [x] Browser console and page-error gate passed.
- [x] Desktop and mobile screenshots reviewed.
- [x] Performance budget passed with zero external JavaScript bytes.

## Live-model verification

- [ ] Install a newly rotated `OPENROUTER_API_KEY` locally.
- [ ] Install a newly rotated `VENICE_API_KEY` locally.
- [ ] Run the full provider catalog gate.
- [ ] Run smoke tests for all 13 models.
- [ ] Run all 13 benchmark cases for all 13 models.
- [ ] Confirm requested and returned model IDs match or document routing differences.
- [ ] Review every raw output manually.
- [ ] Apply human quality scores and hard safety caps.
- [ ] Generate the live output-comparison report.
- [ ] Promote only public-safe reviewed results.
- [ ] Rebuild and rerun the complete site test suite.

## Deployment

- [ ] Approve final brand and domain.
- [ ] Add legal operator and contact details.
- [ ] Legal review privacy and terms.
- [ ] Run Kimi and Hermes 3 specialist gates.
- [ ] Create Cloudflare Pages preview using newly rotated credentials.
- [ ] Verify preview on desktop and mobile.
- [ ] Promote production only after live evidence and all gates pass.
