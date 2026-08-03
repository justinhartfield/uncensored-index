export type SeoRouteKind = 'hub' | 'evidence' | 'policy' | 'utility';
export interface SeoRouteEntry { path: `/${string}`; kind: SeoRouteKind; evidence: string; }

export const indexableSeoRoutes = [
  { path: '/', kind: 'hub', evidence: 'Primary v0.3 suite entry point with public catalog and explicit review state.' },
  { path: '/suite/', kind: 'evidence', evidence: 'Canonical public catalog of all 33 v0.3 test definitions and controls.' },
  { path: '/methodology/', kind: 'policy', evidence: 'Versioned v0.3 execution, provenance, review, and publication protocol.' },
  { path: '/about/', kind: 'policy', evidence: 'Publication purpose, scope, and product boundary.' },
  { path: '/editorial-policy/', kind: 'policy', evidence: 'Evidence hierarchy, ranking rules, and editorial boundary.' },
  { path: '/affiliate-disclosure/', kind: 'policy', evidence: 'Commercial disclosure and score-independence policy.' },
  { path: '/corrections/', kind: 'policy', evidence: 'Documented correction, quarantine, and rerun process.' },
  { path: '/research/benchmark-changelog/', kind: 'policy', evidence: 'Version history through the completed v0.3 live execution.' },
] as const satisfies readonly SeoRouteEntry[];

export const excludedSeoRoutes = [
  { path: '/results/', kind: 'utility', evidence: 'Live run remains unreviewed; coverage ledger is useful but not indexable evidence.' },
  { path: '/models/', kind: 'utility', evidence: 'All model records are review-pending and intentionally noindex.' },
  { path: '/review/', kind: 'utility', evidence: 'Private-review process status; not a public evidence result.' },
  { path: '/manual-review/', kind: 'utility', evidence: 'Archived v0.2 raw review dashboard.' },
  { path: '/showcase/', kind: 'utility', evidence: 'Archived v0.2 answer showcase.' },
  { path: '/showcase/adult/', kind: 'utility', evidence: 'Age-gated archived adult evidence.' },
  { path: '/compare/', kind: 'utility', evidence: 'Archived v0.2 comparison utility.' },
  { path: '/rankings/text/', kind: 'utility', evidence: 'v0.3 text evidence remains review-pending; no ranking exists.' },
  { path: '/rankings/image/', kind: 'utility', evidence: 'v0.3 image evidence remains review-pending; no ranking exists.' },
  { path: '/rankings/video/', kind: 'utility', evidence: 'v0.3 video evidence remains review-pending; no ranking exists.' },
  { path: '/rankings/audio/', kind: 'utility', evidence: 'v0.3 audio evidence remains review-pending; no ranking exists.' },
  { path: '/archive/', kind: 'utility', evidence: 'Retired versions are preserved for audit, not search discovery.' },
  { path: '/archive/v02/', kind: 'utility', evidence: 'Retired v0.2 benchmark and scores.' },
  { path: '/rankings/v01-legacy/', kind: 'utility', evidence: 'Retired v0.1 methodology.' },
  { path: '/research/censorship-index/', kind: 'utility', evidence: 'Dataset shell remains thin until reviewed data exists.' },
  { path: '/research/model-change-log/', kind: 'utility', evidence: 'Longitudinal evidence shell.' },
  { path: '/research/privacy-index/', kind: 'utility', evidence: 'Provider policy dataset shell.' },
  { path: '/research/pricing-history/', kind: 'utility', evidence: 'Longitudinal pricing shell.' },
  { path: '/contact/', kind: 'utility', evidence: 'Contact utility.' },
  { path: '/privacy/', kind: 'utility', evidence: 'Legal copy.' },
  { path: '/terms/', kind: 'utility', evidence: 'Legal copy.' },
  { path: '/404/', kind: 'utility', evidence: 'Error route.' },
  { path: '/rankings/uncensored-ai-models/', kind: 'utility', evidence: 'Legacy result reader.' },
  { path: '/rankings/no-filter-ai/', kind: 'utility', evidence: 'Legacy result reader.' },
  { path: '/rankings/private-local-uncensored-llms/', kind: 'utility', evidence: 'Legacy result reader.' },
  { path: '/rankings/uncensored-roleplay-models/', kind: 'utility', evidence: 'Legacy result reader.' },
  { path: '/rankings/nsfw-ai-chat/', kind: 'utility', evidence: 'Product ranking without reviewed evidence.' },
  { path: '/rankings/uncensored-ai-chat/', kind: 'utility', evidence: 'Product ranking without reviewed evidence.' },
  { path: '/features/best-memory/', kind: 'utility', evidence: 'Feature shell without v0.3 reviewed results.' },
  { path: '/features/cancellation-and-refunds/', kind: 'utility', evidence: 'Product feature shell.' },
  { path: '/features/character-consistency/', kind: 'utility', evidence: 'Feature shell without v0.3 reviewed results.' },
  { path: '/features/fastest-uncensored-models/', kind: 'utility', evidence: 'Feature shell without v0.3 reviewed results.' },
  { path: '/features/lowest-effective-cost/', kind: 'utility', evidence: 'Feature shell without v0.3 reviewed results.' },
  { path: '/features/no-message-limits/', kind: 'utility', evidence: 'Product feature shell.' },
  { path: '/features/private-ai-chat/', kind: 'utility', evidence: 'Product feature shell.' },
] as const satisfies readonly SeoRouteEntry[];

export function sitemapPaths(additionalPaths: readonly string[]): string[] {
  return [...new Set([...indexableSeoRoutes.map((route) => route.path), ...additionalPaths])];
}
