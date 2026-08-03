export interface MediaEvidenceMeta {
  reviewed?: unknown;
  assetSrc?: unknown;
  contentType?: unknown;
  adultFlagged?: unknown;
}

export function reviewedMediaSource(meta?: MediaEvidenceMeta, allowAdult = false): string | undefined {
  if (!meta || meta.reviewed !== true || typeof meta.assetSrc !== 'string') return undefined;
  if (!meta.assetSrc.startsWith('/benchmark-media/')) return undefined;
  if (meta.adultFlagged === true && !allowAdult) return undefined;
  return meta.assetSrc;
}
