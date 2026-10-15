/** Keeps visual progress finite and within the normalized unit interval. */
export function clampProgress(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.min(1, Math.max(0, value))
}
