import type { CanonicalGameStateV1 } from '../game-state/types'
import type { BasicDysonFacilityId } from './dysonFacilities'

const TERRA_SKILL_BY_FACILITY: Readonly<
  Partial<Record<BasicDysonFacilityId, string>>
> = Object.freeze({
  assembly_lines: 'terraNullius',
  ai_managers: 'terraInfirma',
  servers: 'terraEculeo',
  data_centers: 'terraFirma',
})

/** Bought counts include Terra transfers, but never automatically produced facilities. */
export function deriveEffectivePurchaseCounts(
  state: Readonly<CanonicalGameStateV1>,
  facilityId: BasicDysonFacilityId,
) {
  const owned = (id: string) => state.skills.byId[id]?.owned === true
  const rawManualCount = state.dyson.facilities[facilityId][1]
  const effectiveManualPlanets = state.dyson.facilities.planets[1] *
    (owned('terraIrradiant') ? 12 : 1)
  const terraSkill = TERRA_SKILL_BY_FACILITY[facilityId]
  const effectiveManualCount = facilityId === 'planets'
    ? effectiveManualPlanets
    : rawManualCount +
      (terraSkill !== undefined && owned(terraSkill)
        ? effectiveManualPlanets
        : 0)
  const transferredPlanetCount =
    facilityId !== 'planets' &&
    terraSkill !== undefined &&
    owned(terraSkill)
      ? effectiveManualPlanets
      : 0
  return {
    rawManualCount,
    effectiveManualCount,
    effectiveManualPlanets,
    transferredPlanetCount,
    terraSkill,
  }
}
