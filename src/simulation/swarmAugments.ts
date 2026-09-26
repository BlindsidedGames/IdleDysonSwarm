import type { CanonicalGameStateV1, CanonicalFacilityId, SwarmGrantState } from '../game-state/types'
import { DYSON_FACILITY_IDS, DYSON_FACILITY_DEFINITIONS, isBasicFacility } from './dysonFacilityCatalog'
import { hasSwarmAugment } from './skillSubskills'
import { challengeAllowsFacilityPurchase } from './infinityChallenges'
import { addContinuous, clampContinuous } from './numeric'

export const SWARM_TUNING = Object.freeze({ headStart: 30, botnetBase: 20, economyBase: 5, stellarBase: 12.5, compoundPower: 0.825, costReductionPerFragment: 0.005,
  replication: { workers: { divisor: 10, power: 0.75 }, panels: { divisor: 100, power: 0.5 } },
})
const EMPTY_GRANTS: SwarmGrantState = Object.freeze({ headStart: {}, retained: {}, restored: {} })

export function swarmGrants(state: Pick<CanonicalGameStateV1, 'skills'>): SwarmGrantState {
  return state.skills.swarmGrants ?? EMPTY_GRANTS
}

/** Sanitize only the small, bounded grant ledger at the save boundary. */
export function readSwarmGrants(value: unknown): SwarmGrantState | undefined {
  if (!value || typeof value !== 'object') return undefined
  const source = value as Record<string, unknown>
  const counts = (key: string) => Object.fromEntries(DYSON_FACILITY_IDS.flatMap(id => {
    const count = (source[key] as Record<string, unknown> | undefined)?.[id]
    return typeof count === 'number' && Number.isFinite(count) && count > 0 ? [[id, Math.floor(Math.min(count, key === 'headStart' ? SWARM_TUNING.headStart : Number.MAX_SAFE_INTEGER))]] : []
  }))
  return { headStart: counts('headStart'), retained: counts('retained'), restored: counts('restored') }
}

export function paidFacilityPurchases(state: CanonicalGameStateV1, id: CanonicalFacilityId): number {
  return Math.max(0, state.dyson.facilities[id][1] - (swarmGrants(state).headStart[id] ?? 0) -
    (isBasicFacility(id) && state.infinity.retainedFacilities[id] ? 10 : 0))
}

/** Called at assignment and unlock boundaries, never from a presentation derivation. */
export function initializeSwarmGrants(state: CanonicalGameStateV1): CanonicalGameStateV1 {
  const headStart = hasSwarmAugment(state, 'headStart')
  const steady = hasSwarmAugment(state, 'steadySupply')
  if (!headStart && !steady) return state
  const before = swarmGrants(state)
  const grants = { headStart: { ...before.headStart }, retained: before.retained, restored: { ...before.restored } }
  const facilities = { ...state.dyson.facilities }
  let changed = false
  for (const id of DYSON_FACILITY_IDS) {
    const unlock = DYSON_FACILITY_DEFINITIONS[id].quantumUnlock
    if (!challengeAllowsFacilityPurchase(state, id) || (unlock && !state.quantum.unlocks[unlock])) continue
    const free = headStart ? Math.max(0, SWARM_TUNING.headStart - (grants.headStart[id] ?? 0)) : 0
    const retained = steady ? Math.max(0, (grants.retained[id] ?? 0) - (grants.restored[id] ?? 0)) : 0
    if (free + retained <= 0) continue
    facilities[id] = [facilities[id][0], addContinuous(facilities[id][1], free + retained)]
    grants.headStart[id] = (grants.headStart[id] ?? 0) + free
    grants.restored[id] = (grants.restored[id] ?? 0) + retained
    changed = true
  }
  return changed ? { ...state, skills: { ...state.skills, swarmGrants: grants }, dyson: { ...state.dyson, facilities } } : state
}

export function swarmGrantsAfterInfinity(state: CanonicalGameStateV1, restartOnly: boolean): SwarmGrantState | undefined {
  if (restartOnly || !hasSwarmAugment(state, 'steadySupply')) return undefined
  return { headStart: {}, restored: {}, retained: Object.fromEntries(DYSON_FACILITY_IDS.map(id => [id, paidFacilityPurchases(state, id)])) }
}

export function totalPurchasedFacilities(state: CanonicalGameStateV1): number {
  return DYSON_FACILITY_IDS.reduce((sum, id) => addContinuous(sum, state.dyson.facilities[id][1]), 0)
}

export function economyOfScaleMultiplier(state: CanonicalGameStateV1): number {
  if (!hasSwarmAugment(state, 'economyOfScale')) return 1
  const total = DYSON_FACILITY_IDS.reduce((sum, id) => addContinuous(sum, addContinuous(...state.dyson.facilities[id])), 0)
  return Math.max(1, Math.log(Math.max(1, total)) / Math.log(SWARM_TUNING.economyBase))
}

export function botnetMultiplier(state: CanonicalGameStateV1): number {
  return hasSwarmAugment(state, 'botnet') ? 1 + Math.log(Math.max(1, state.dyson.bots)) / Math.log(SWARM_TUNING.botnetBase) : 1
}

export function purchaseScalingRate(state: CanonicalGameStateV1): number {
  return state.skills.byId.ultimateSwarm?.owned ? 0.05 : state.skills.byId.megaSwarm?.owned ? 0.03 : state.skills.byId.superSwarm?.owned ? 0.02 : 0.01
}

export function purchaseScalingThreshold(state: CanonicalGameStateV1): number {
  return state.skills.byId.productionScaling?.owned ? Math.max(0, 90 - 5 * Math.max(0, Number(state.skills.fragments) - 1)) : 100
}

export function purchaseScalingMultiplier(state: CanonicalGameStateV1, count: number): number {
  const threshold = purchaseScalingThreshold(state)
  const rate = purchaseScalingRate(state)
  return hasSwarmAugment(state, 'compoundFragments')
    ? clampContinuous(Math.exp(Math.log1p(rate) * Math.floor(Math.pow(Math.max(0, count) / Math.max(1, threshold), SWARM_TUNING.compoundPower))))
    : clampContinuous(1 + Math.max(0, count - threshold) * rate)
}

export function stellarSwarmMultiplier(state: CanonicalGameStateV1, purchaseMultiplier: number): number {
  return hasSwarmAugment(state, 'stellarSwarm')
    ? clampContinuous(Math.exp(Math.log(Math.max(1, purchaseMultiplier)) * Math.log(Math.max(1, state.dyson.bots)) / Math.log(SWARM_TUNING.stellarBase))) : 1
}

/** Shared by simulation production facts, active play, Stored Time and UI rates. */
export function selfReplicationMultiplier(state: CanonicalGameStateV1, count: number, target: keyof typeof SWARM_TUNING.replication): number {
  if (!hasSwarmAugment(state, 'selfReplicatingWorkers')) return 1
  const { divisor, power } = SWARM_TUNING.replication[target]
  return clampContinuous(Math.pow(1 + Math.max(0, count) / divisor * purchaseScalingRate(state), power))
}
