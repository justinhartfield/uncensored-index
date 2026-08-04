export type SeoRouteKind = 'hub' | 'evidence' | 'policy' | 'utility';
export interface SeoRouteEntry { path: `/${string}`; kind: SeoRouteKind; evidence: string; }

export const indexableSeoRoutes = [
  { path: '/', kind: 'hub', evidence: 'CLIMAX Benchmark leaderboard with live reviewed results from the v0.3 run.' },
  { path: '/climax-benchmark/', kind: 'hub', evidence: 'Complete CLIMAX leaderboard across all modalities with per-dimension scores.' },
  { path: '/suite/', kind: 'evidence', evidence: 'Canonical public catalog of all 33 v0.3 test definitions and boundary controls.' },
  { path: '/methodology/', kind: 'policy', evidence: 'Versioned v0.3 execution, classification, review, and publication protocol.' },
  { path: '/rankings/text/', kind: 'evidence', evidence: 'Text model evidence from the reviewed v0.3 live run — 13 routes, 9 cases each.' },
  { path: '/rankings/image/', kind: 'evidence', evidence: 'Image model evidence from the reviewed v0.3 live run — 3 routes, 11 cases each.' },
  { path: '/rankings/video/', kind: 'evidence', evidence: 'Video model evidence from the reviewed v0.3 live run — 1 route, 8 cases.' },
  { path: '/rankings/audio/', kind: 'evidence', evidence: 'Audio model evidence from the reviewed v0.3 live run — 1 route, 5 cases.' },
  { path: '/about/', kind: 'policy', evidence: 'Publication purpose: the CLIMAX Benchmark and its evidence-first editorial commitment.' },
  { path: '/editorial-policy/', kind: 'policy', evidence: 'Evidence hierarchy, ranking rules, and editorial boundary.' },
  { path: '/affiliate-disclosure/', kind: 'policy', evidence: 'Commercial disclosure and score-independence policy.' },
  { path: '/corrections/', kind: 'policy', evidence: 'Documented correction, quarantine, and rerun process.' },
  { path: '/research/benchmark-changelog/', kind: 'policy', evidence: 'Version history through the completed v0.3 live execution.' },
] as const satisfies readonly SeoRouteEntry[];

export const excludedSeoRoutes = [
  { path: '/results/', kind: 'utility', evidence: 'Live run ledger — coverage, spend, and failure data; useful but not canonical.' },
  { path: '/models/', kind: 'utility', evidence: 'Route directory with filters; canonical entry points are the leaderboard and suite.' },
  { path: '/review/', kind: 'utility', evidence: 'Review dashboard; useful to readers but duplicative of canonical evidence pages.' },
  { path: '/manual-review/', kind: 'utility', evidence: 'Archived v0.2 raw review dashboard.' },
  { path: '/showcase/', kind: 'utility', evidence: 'Question-first comparison of public-safe benchmark cases.' },
  { path: '/showcase/adult/', kind: 'utility', evidence: 'Age-gated adult evidence; intentionally noindex.' },
  { path: '/compare/', kind: 'utility', evidence: 'Raw side-by-side case evidence with no filtering.' },
  { path: '/archive/', kind: 'utility', evidence: 'Retired versions preserved for audit, not search discovery.' },
  { path: '/archive/v02/', kind: 'utility', evidence: 'Retired v0.2 benchmark and scores.' },
  { path: '/rankings/v01-legacy/', kind: 'utility', evidence: 'Retired v0.1 methodology.' },
  { path: '/contact/', kind: 'utility', evidence: 'Contact utility.' },
  { path: '/privacy/', kind: 'utility', evidence: 'Legal copy.' },
  { path: '/terms/', kind: 'utility', evidence: 'Legal copy.' },
  { path: '/404/', kind: 'utility', evidence: 'Error route.' },
] as const satisfies readonly SeoRouteEntry[];

export function sitemapPaths(additionalPaths: readonly string[]): string[] {
  return [...new Set([...indexableSeoRoutes.map((route) => route.path), ...additionalPaths])];
}
