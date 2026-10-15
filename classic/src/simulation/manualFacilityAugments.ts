import { resolveStellarAggregate } from './canonicalSkillIntervalEffects'
import type { CanonicalFacilityId, CanonicalGameStateV1 } from '../game-state/types'
import { MANUAL_FACILITY_AUGMENTS } from './skillSubskills'
import { isGalvanized } from './galvanization'
import { challengeAllowsFacility, challengeAllowsTinker } from './infinityChallenges'
import { DYSON_FACILITY_DEFINITIONS } from './dysonFacilityCatalog'
import { addContinuous, multiplyContinuous } from './numeric'

export type TinkerFacilityYields = Readonly<Partial<Record<CanonicalFacilityId, number>>>
export const MANUAL_FACILITY_TUNING = Object.freeze({ ownedFraction: 0.02, productionSeconds: 20, minimumBrainCap: 1 })

export function canTinkerAssemblyLines(state: Readonly<CanonicalGameStateV1>): boolean {
  return challengeAllowsTinker(state) && state.challenges?.active !== 'built-by-hand' &&
    state.skills.byId.manualLabour?.owned === true && state.dyson.facilities.ai_managers[1] >= 1
}

export function resolveTinkerFacilityYields(state: Readonly<CanonicalGameStateV1>, assemblyYield: number, additional: TinkerFacilityYields): TinkerFacilityYields {
  if (!challengeAllowsTinker(state)) return {}
  const { assembly_lines: _assembly, ...higher } = additional
  return Object.freeze({ ...higher, ...(canTinkerAssemblyLines(state) ? { assembly_lines: assemblyYield } : {}) })
}

/** Same bounded output rule as the original Assembly Line action. */
export function manualFacilityYield(owned: number, production: number): number {
  return Math.min(multiplyContinuous(owned, MANUAL_FACILITY_TUNING.ownedFraction),
    multiplyContinuous(production, MANUAL_FACILITY_TUNING.productionSeconds))
}

export function deriveAdditionalTinkerYields(
  state: Readonly<CanonicalGameStateV1>,
  rates: Readonly<Partial<Record<CanonicalFacilityId, number>>>,
  stellarSacrifice?: { readonly facilitiesPerSecond: number; readonly botsPerSecond: number },
): TinkerFacilityYields {
  if (!challengeAllowsTinker(state) || !isGalvanized(state, 'manualLabour') || !state.skills.byId.manualLabour?.owned) return {}
  const result: Partial<Record<CanonicalFacilityId, number>> = {}
  const versatile = state.skills.byId.versatileProductionTactics?.owned ? 1.5 : 1
  for (const { id, facilityId } of MANUAL_FACILITY_AUGMENTS) {
    if (!state.skills.byId[id]?.owned || !challengeAllowsFacility(state, facilityId)) continue
    const pair = state.dyson.facilities[facilityId]
    const owned = addContinuous(pair[0], pair[1])
    const unlock = DYSON_FACILITY_DEFINITIONS[facilityId].quantumUnlock
    if (unlock && !state.quantum.unlocks[unlock] && owned === 0) continue
    if (facilityId === 'galactic_brains') {
      // Quote one funded second using the same debit rules as Stellar Sacrifices.
      // Tinker itself creates units freely; previews never perform the debit.
      const funded = stellarSacrifice ? resolveStellarAggregate(state.dyson.bots, 0,
        stellarSacrifice.botsPerSecond, stellarSacrifice.facilitiesPerSecond, 1).facilitiesProduced : 0
      const cap = Math.max(MANUAL_FACILITY_TUNING.minimumBrainCap,
        multiplyContinuous(funded, MANUAL_FACILITY_TUNING.productionSeconds))
      result[facilityId] = Math.min(cap, multiplyContinuous(owned, MANUAL_FACILITY_TUNING.ownedFraction * versatile))
    } else {
      result[facilityId] = multiplyContinuous(manualFacilityYield(owned, rates[facilityId] ?? 0), versatile)
    }
  }
  return result
}

/** Facility grants are generated units, never purchases or price increases. */
export function grantTinkerFacilities(state: CanonicalGameStateV1, yields: TinkerFacilityYields, completions: number): CanonicalGameStateV1 {
  if (!challengeAllowsTinker(state)) return state
  const facilities = { ...state.dyson.facilities }
  let changed = false
  for (const [id, amount] of Object.entries(yields) as [CanonicalFacilityId, number][]) {
    if (amount <= 0 || !challengeAllowsFacility(state, id)) continue
    facilities[id] = [addContinuous(facilities[id][0], multiplyContinuous(amount, completions)), facilities[id][1]]
    changed = true
  }
  return changed ? { ...state, dyson: { ...state.dyson, facilities } } : state
}
