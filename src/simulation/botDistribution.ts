/** Normalizes the canonical worker/researcher bot split to Unity's 1% steps. */
export function normalizeCanonicalBotDistribution(
  value: number,
): number | null {
  if (!Number.isFinite(value)) return null
  const clamped = Math.max(0, Math.min(1, value))
  return Math.round(clamped * 100) / 100
}
