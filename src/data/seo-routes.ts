export type SeoRouteKind = 'hub' | 'ranking' | 'evidence' | 'policy' | 'utility';

export interface SeoRouteEntry {
  path: `/${string}`;
  kind: SeoRouteKind;
  evidence: string;
}

/**
 * Static routes eligible for search discovery today.
 *
 * A route belongs here only when it has durable, user-facing value backed by
 * the published benchmark corpus or a substantive editorial policy. Model
 * profiles are added separately because their eligibility depends on a live,
 * human-reviewed result.
 */
export const indexableSeoRoutes = [
  { path: '/', kind: 'hub', evidence: 'Live reviewed benchmark summary and directory entry point.' },
  { path: '/models/', kind: 'hub', evidence: 'Filterable directory backed by the current model roster and evidence states.' },
  { path: '/showcase/', kind: 'evidence', evidence: 'Question-first comparison of every public-safe reviewed benchmark case.' },
  { path: '/methodology/', kind: 'policy', evidence: 'Versioned scoring, review, and publication methodology.' },
  { path: '/about/', kind: 'policy', evidence: 'Publication purpose, scope, and product boundary.' },
  { path: '/editorial-policy/', kind: 'policy', evidence: 'Evidence hierarchy, ranking rules, and editorial boundary.' },
  { path: '/affiliate-disclosure/', kind: 'policy', evidence: 'Commercial disclosure and score-independence policy.' },
  { path: '/corrections/', kind: 'policy', evidence: 'Documented correction and rerun process.' },
  { path: '/rankings/text/', kind: 'ranking', evidence: 'Live reviewed v0.2 text leaderboard.' },
  { path: '/rankings/image/', kind: 'ranking', evidence: 'Live reviewed v0.2 image leaderboard.' },
  { path: '/rankings/video/', kind: 'ranking', evidence: 'Live reviewed v0.2 video leaderboard.' },
  { path: '/rankings/audio/', kind: 'ranking', evidence: 'Live reviewed v0.2 audio leaderboard.' },
  { path: '/research/benchmark-changelog/', kind: 'policy', evidence: 'Versioned benchmark history from v0.1 through planned v0.3 with changelog.' },
] as const satisfies readonly SeoRouteEntry[];

/**
 * Known static routes intentionally kept out of search. This is an explicit
 * regression boundary: adding a route here documents why it must not leak into
 * the sitemap while it remains gated, provisional, duplicative, or thin.
 */
export const excludedSeoRoutes = [
  { path: '/showcase/adult/', kind: 'utility', evidence: 'Age-gated adult evidence; intentionally noindex.' },
  { path: '/manual-review/', kind: 'utility', evidence: 'Raw audit dashboard; useful to readers but duplicative of canonical evidence pages.' },
  { path: '/review/', kind: 'utility', evidence: 'Alias of the raw audit dashboard.' },
  { path: '/compare/', kind: 'utility', evidence: 'Noindex until a substantive, stable comparison experience is published.' },
  { path: '/rankings/v01-legacy/', kind: 'utility', evidence: 'Historical methodology that is not comparable to v0.2.' },
  { path: '/research/censorship-index/', kind: 'utility', evidence: 'Dataset shell remains thin until reviewed data exists.' },
  { path: '/research/model-change-log/', kind: 'utility', evidence: 'Change-log shell remains thin until longitudinal evidence exists.' },
  { path: '/rankings/uncensored-ai-models/', kind: 'utility', evidence: 'Legacy result reader; exclude until migrated to the reviewed v0.2 corpus.' },
  { path: '/rankings/no-filter-ai/', kind: 'utility', evidence: 'Legacy result reader; exclude until migrated to the reviewed v0.2 corpus.' },
  { path: '/rankings/private-local-uncensored-llms/', kind: 'utility', evidence: 'Legacy result reader; exclude until migrated to the reviewed v0.2 corpus.' },
  { path: '/rankings/uncensored-roleplay-models/', kind: 'utility', evidence: 'Legacy result reader; exclude until migrated to the reviewed v0.2 corpus.' },
  { path: '/contact/', kind: 'utility', evidence: 'Contact utility.' },
  { path: '/privacy/', kind: 'utility', evidence: 'Provisional legal copy.' },
  { path: '/terms/', kind: 'utility', evidence: 'Provisional legal copy.' },
  { path: '/404/', kind: 'utility', evidence: 'Error route.' },
  { path: '/rankings/nsfw-ai-chat/', kind: 'utility', evidence: 'Product-facing ranking; exclude until live product testing exists.' },
  { path: '/rankings/uncensored-ai-chat/', kind: 'utility', evidence: 'Product-facing ranking; exclude until live product testing exists.' },
  { path: '/features/best-memory/', kind: 'utility', evidence: 'Feature comparison shell; exclude until live benchmark data populates scores.' },
  { path: '/features/cancellation-and-refunds/', kind: 'utility', evidence: 'Feature comparison shell; exclude until live product testing exists.' },
  { path: '/features/character-consistency/', kind: 'utility', evidence: 'Feature comparison shell; exclude until live benchmark data populates scores.' },
  { path: '/features/fastest-uncensored-models/', kind: 'utility', evidence: 'Feature comparison shell; exclude until live benchmark data populates scores.' },
  { path: '/features/lowest-effective-cost/', kind: 'utility', evidence: 'Feature comparison shell; exclude until live benchmark data populates scores.' },
  { path: '/features/no-message-limits/', kind: 'utility', evidence: 'Feature comparison shell; exclude until live product testing exists.' },
  { path: '/features/private-ai-chat/', kind: 'utility', evidence: 'Feature comparison shell; exclude until live provider policy review exists.' },
  { path: '/research/privacy-index/', kind: 'utility', evidence: 'Dataset shell remains thin until provider policy review data exists.' },
  { path: '/research/pricing-history/', kind: 'utility', evidence: 'Dataset shell remains thin until longitudinal pricing data exists.' },
] as const satisfies readonly SeoRouteEntry[];

export function sitemapPaths(profilePaths: readonly string[]): string[] {
  return [...new Set([...indexableSeoRoutes.map((route) => route.path), ...profilePaths])];
}
