export const SMOOTH_PRESENTATION_MAXIMUM_LEAD_SECONDS = 0.125

export function projectPresentationValue(
  value: number,
  rate: number,
  elapsedSeconds: number,
  minimum = 0,
  maximum = Number.MAX_VALUE,
): number {
  if (!Number.isFinite(value)) return value
  if (!Number.isFinite(rate) || rate === 0) {
    return Math.min(maximum, Math.max(minimum, value))
  }

  const boundedElapsed = Math.min(
    SMOOTH_PRESENTATION_MAXIMUM_LEAD_SECONDS,
    Math.max(0, Number.isFinite(elapsedSeconds) ? elapsedSeconds : 0),
  )
  const projected = value + rate * boundedElapsed
  if (!Number.isFinite(projected)) {
    return rate > 0 ? maximum : minimum
  }
  return Math.min(maximum, Math.max(minimum, projected))
}
