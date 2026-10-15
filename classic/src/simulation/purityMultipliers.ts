export function purityBodyMultiplier(points: number): number {
  return 1 + 0.25 * points
}

export function purityMindMultiplier(points: number): number {
  return 1 + 0.5 * points
}

// Preserve 1.42× at one point and reach exactly 256× at 42 points.
export const PURITY_ESSENCE_QUADRATIC_COEFFICIENT = (255 - 0.42 * 42) / (42 * 41)

export function purityEssenceMultiplier(points: number): number {
  return 1 + 0.42 * points + PURITY_ESSENCE_QUADRATIC_COEFFICIENT * points * (points - 1)
}
