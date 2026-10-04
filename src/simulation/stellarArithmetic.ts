import { DYSON_FACILITY_IDS } from '../game-state/facilityIds'
import type { CanonicalGameStateV1, CanonicalFacilityId } from '../game-state/types'
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
  galvanizedSkills: ReadonlySet<string> = new Set(),
): number {
  if (galvanizedSkills.has('stellarSacrifices')) return 0
  const stars = resolveStarsSurrounded(
    panelsPerSecond,
    panelLifetimeSeconds,
  )
  // Each fractured galaxy skill removes its own extra Bot cost, not its benefit.
  // Keep the legacy ordinary-Nova combined factor exactly for unfractured inputs.
  const ordinaryNova = ownedSkills.has('supernova') && !galvanizedSkills.has('supernova')
  const ordinaryObliteration = ownedSkills.has('stellarObliteration') && !galvanizedSkills.has('stellarObliteration')
  const stellarMultiplier = ordinaryNova
    ? (ownedSkills.has('stellarObliteration') && galvanizedSkills.has('stellarObliteration') ? 1000 : 1_000_000)
    : ordinaryObliteration ? 1000 : 1

  // Preserve the authored operation order and ordinary-range rounding. Only
  // recompute as one composed multiplication if that order overflows.
  let required = stars * stellarMultiplier
  if (required < 1) required = 1
  if ((ownedSkills.has('stellarDominance') && !galvanizedSkills.has('stellarDominance'))) required *= 100
  if (ownedSkills.has('stellarImprovements')) required /= 1_000
  if (Number.isFinite(required)) return required

  const composedMultiplier =
    stellarMultiplier *
    ((ownedSkills.has('stellarDominance') && !galvanizedSkills.has('stellarDominance')) ? 100 : 1) /
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

/** Generated and manually bought facilities both count as owned. */
export function highestOwnedFacility(facilities: CanonicalGameStateV1['dyson']['facilities']): CanonicalFacilityId | null {
  for (let i = DYSON_FACILITY_IDS.length - 1; i >= 0; i--) {
    const id = DYSON_FACILITY_IDS[i]
    if (facilities[id][0] > 0 || facilities[id][1] > 0) return id
  }
  return null
}
