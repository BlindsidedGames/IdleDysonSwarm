export function interpolatePublishedFacilityProgress(
  publishedNormalized: number,
  productionPerSecond: number,
  elapsedMs: number,
): number {
  const start = clampProgress(publishedNormalized)
  if (
    start === 1 ||
    !Number.isFinite(productionPerSecond) ||
    productionPerSecond <= 0
  ) {
    return start
  }
  const boundedElapsedMs = Math.max(0, elapsedMs)
  const advanced =
    start + productionPerSecond * (boundedElapsedMs / 1_000)
  return advanced >= 1
    ? advanced - Math.floor(advanced)
    : advanced
}

export function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}
