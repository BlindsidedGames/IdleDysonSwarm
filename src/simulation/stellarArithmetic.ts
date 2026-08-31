import { isFiniteNonNegativeNumber } from '../core/finiteNonNegativeNumber'
import { multiplyContinuous } from './numeric'

const PANELS_PER_STAR = 20_000
const STARS_PER_GALAXY = 100_000_000_000

/**
 * Panel area is a continuous gameplay quantity. Both inputs may be finite
 * while their product exceeds JavaScript's finite range, so every consumer
 * shares the same saturating boundary.
 */
export function resolvePanelArea(
  panelsPerSecond: number,
  panelLifetimeSeconds: number,
): number {
  if (
    !isFiniteNonNegativeNumber(panelsPerSecond) ||
    !isFiniteNonNegativeNumber(panelLifetimeSeconds)
  ) {
    throw new Error(
      'Panel area requires finite non-negative production and lifetime.',
    )
  }
  return multiplyContinuous(panelsPerSecond, panelLifetimeSeconds)
}

export function resolveStarsSurrounded(
  panelsPerSecond: number,
  panelLifetimeSeconds: number,
): number {
  return resolvePanelArea(panelsPerSecond, panelLifetimeSeconds) /
    PANELS_PER_STAR
}

export function resolveGalaxiesEngulfed(
  panelsPerSecond: number,
  panelLifetimeSeconds: number,
): number {
  return resolveStarsSurrounded(
    panelsPerSecond,
    panelLifetimeSeconds,
  ) / STARS_PER_GALAXY
}

export function resolveStellarSacrificesRequiredBots(
  ownedSkills: ReadonlySet<string>,
  panelsPerSecond: number,
  panelLifetimeSeconds: number,
): number {
  const stars = resolveStarsSurrounded(
    panelsPerSecond,
    panelLifetimeSeconds,
  )
  const stellarMultiplier = ownedSkills.has('supernova')
    ? 1_000_000
    : ownedSkills.has('stellarObliteration')
      ? 1_000
      : 1

  // Preserve the authored operation order and ordinary-range rounding. Only
  // recompute as one composed multiplication if that order overflows.
  let required = stars * stellarMultiplier
  if (required < 1) required = 1
  if (ownedSkills.has('stellarDominance')) required *= 100
  if (ownedSkills.has('stellarImprovements')) required /= 1_000
  if (Number.isFinite(required)) return required

  const composedMultiplier =
    stellarMultiplier *
    (ownedSkills.has('stellarDominance') ? 100 : 1) /
    (ownedSkills.has('stellarImprovements') ? 1_000 : 1)
  return multiplyContinuous(stars, composedMultiplier)
}

export function resolveStellarSacrificePlanetsPerSecond(
  ownedSkills: ReadonlySet<string>,
  panelsPerSecond: number,
  panelLifetimeSeconds: number,
): number {
  if (!ownedSkills.has('stellarSacrifices')) return 0

  let galaxies = resolveGalaxiesEngulfed(
    panelsPerSecond,
    panelLifetimeSeconds,
  )
  if (ownedSkills.has('stellarObliteration')) {
    galaxies = multiplyContinuous(galaxies, 1_000)
  }
  if (ownedSkills.has('supernova')) {
    galaxies = multiplyContinuous(galaxies, 1_000)
  }
  return Math.pow(Math.max(0, Math.log10(galaxies)), 2)
}
