/** Applies the raw JavaScript [0, 1] clamp without sanitizing NaN. */
export function clampUnitInterval(value: number): number {
  return Math.min(1, Math.max(0, value))
}
