import { validateDiscovery } from './discovery'
import { activeReworkChallenge, REWORK_CHALLENGES } from './reworkChallenges'
import { getGameAssetsByKind } from '../game-data/catalog'
import { SKILL_DEFINITION_ASSET_KIND } from '../game-data/runtimeAssetKinds'
import type { CanonicalFacilityId, CanonicalGameStateV1, InfinityChallengeState, ChallengeId, QuantumChallengeId } from '../game-state/types'

export const EMPTY_INFINITY_CHALLENGES: Readonly<InfinityChallengeState> = Object.freeze({
  galvanizedSkillIds: Object.freeze([]),
  unlocked: false,
  active: null,
  blankSlateCompleted: false,
  galvanizers: 0n,
  hasEarnedGalvanizer: false,
})

export function infinityChallenges(state: Readonly<CanonicalGameStateV1>): Readonly<InfinityChallengeState> {
  return state.challenges ?? EMPTY_INFINITY_CHALLENGES
}

export function isBlankSlateActive(state: Readonly<CanonicalGameStateV1>): boolean {
  return activeReworkChallenge(state) === 'blank-slate'
}

export function isTrialAndErrorActive(_state: Readonly<CanonicalGameStateV1>): boolean { return false }
export function isInfinityChallengeActive(state: Readonly<CanonicalGameStateV1>): boolean { return activeReworkChallenge(state) !== null }
export function hasCompletedInfinityChallenge(state: Pick<CanonicalGameStateV1, 'challenges'>): boolean { return (state.challenges?.replacement?.completedIds.length ?? 0) > 0 || state.challenges?.blankSlateCompleted === true || state.challenges?.trialAndErrorCompleted === true || state.challenges?.noScienceCompleted === true || (state.challenges?.completedQuantumChallenges?.length ?? 0) > 0 }

/** Retained progression effect; the retired challenge rules no longer constrain it. */
export function isBreakInfinityEnabled(state: Readonly<CanonicalGameStateV1>): boolean {
  return state.quantum.unlocks.breakTheLoop && !['blank-slate', 'built-by-hand'].includes(activeReworkChallenge(state) ?? '')
}

export function validateInfinityChallenges(value: unknown): string | null {
  if (value === undefined) return null
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return 'Invalid Infinity challenge progress.'
  const c = value as Record<string, unknown>
  if (c.replacement !== undefined) {
    const r = c.replacement as Record<string, unknown>
    const valid = (id: unknown) => REWORK_CHALLENGES.some(definition => definition.id === id)
    if (r && validateDiscovery(r.savedDiscovery as CanonicalGameStateV1['discovery'])) return 'Invalid saved challenge Discovery.'
    if (!r || r.version !== 1 || (r.active !== null && !valid(r.active)) ||
      !Array.isArray(r.completedIds) || r.completedIds.some(id => !valid(id)) || new Set(r.completedIds).size !== r.completedIds.length ||
      typeof r.earnedIp !== 'bigint' || r.earnedIp < 0n || r.earnedIp > 9_223_372_036_854_775_807n ||
      !Number.isSafeInteger(r.infinities) || (r.infinities as number) < 0 || !Number.isSafeInteger(r.paidPurchases) || (r.paidPurchases as number) < 0 || (r.paidPurchases as number) > 10 ||
      !Array.isArray(r.paidFacilityIds) || r.paidFacilityIds.some(id => !['assembly_lines','ai_managers','servers','data_centers','planets','matrioshka_brains','birch_planets','galactic_brains'].includes(id)) || new Set(r.paidFacilityIds).size !== r.paidFacilityIds.length ||
      !Array.isArray(r.savedAutoAssignment) || r.savedAutoAssignment.some(id => typeof id !== 'string') || typeof r.savedBreakTarget !== 'bigint' || r.savedBreakTarget < 1n || typeof r.savedBotDistribution !== 'number' || !Number.isFinite(r.savedBotDistribution) || r.savedBotDistribution < 0 || r.savedBotDistribution > 1 ||
      (r.active !== null && c.active !== r.active)) return 'Invalid replacement challenge progress.'
  }
  if ((c.noScienceCompleted !== undefined && typeof c.noScienceCompleted !== 'boolean') || (c.trialAndErrorCompleted !== undefined && typeof c.trialAndErrorCompleted !== 'boolean') || typeof c.unlocked !== 'boolean' || typeof c.blankSlateCompleted !== 'boolean' ||
      typeof c.hasEarnedGalvanizer !== 'boolean' || (c.active !== null && !isChallengeId(c.active)) ||
      typeof c.galvanizers !== 'bigint' || c.galvanizers < 0n || c.galvanizers > 9_223_372_036_854_775_807n ||
      (c.active !== null && !c.unlocked)) return 'Invalid Infinity challenge progress or galvanizer balance.'
  if (c.completedQuantumChallenges !== undefined && (!Array.isArray(c.completedQuantumChallenges) || c.completedQuantumChallenges.some(id => !isQuantumChallenge(id)) || new Set(c.completedQuantumChallenges).size !== c.completedQuantumChallenges.length)) return 'Invalid Quantum challenge completions.'
  if (c.completionSeconds !== undefined) {
    if (c.completionSeconds === null || typeof c.completionSeconds !== 'object' || Array.isArray(c.completionSeconds)) return 'Invalid challenge completion times.'
    for (const [id, seconds] of Object.entries(c.completionSeconds)) {
      if (!isChallengeId(id) || typeof seconds !== 'number' || !Number.isFinite(seconds) || seconds < 0 ||
        !challengeCompleted(c as unknown as InfinityChallengeState, id as ChallengeId)) return 'Invalid challenge completion time.'
    }
  }
  if (c.galvanizedSkillIds !== undefined) {
    const ids = c.galvanizedSkillIds
    const valid = new Set(getGameAssetsByKind(SKILL_DEFINITION_ASSET_KIND).map((asset) => asset.id))
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string' || !valid.has(id)) ||
        new Set(ids).size !== ids.length) {
      return 'Invalid galvanized skill ownership.'
    }
  }
  return null
}

export function isNoScienceActive(state: Readonly<CanonicalGameStateV1>): boolean {
  return activeReworkChallenge(state) === 'no-science'
}
export function isResearchDisabledByChallenge(state: Readonly<CanonicalGameStateV1>): boolean {
  return isTrialAndErrorActive(state) || isNoScienceActive(state)
}


export const QUANTUM_CHALLENGE_IDS = ['no-science', 'short-circuit', 'grounded', 'built-by-hand', 'hands-off', 'commitment-issues', 'supply-shortage'] as const satisfies readonly QuantumChallengeId[]
export function isQuantumChallenge(id: unknown): id is QuantumChallengeId {
  return QUANTUM_CHALLENGE_IDS.some(candidate => candidate === id)
}
export function isChallengeId(id: unknown): id is ChallengeId {
  return id === 'blank-slate' || id === 'trial-and-error' || id === 'lean-build' || isQuantumChallenge(id)
}
export function isQuantumChallengeActive(_state: Pick<CanonicalGameStateV1, 'challenges'>): boolean {
  return false
}
export function challengeCompleted(progress: Readonly<InfinityChallengeState>, id: ChallengeId): boolean {
  if (id === 'blank-slate') return progress.blankSlateCompleted
  if (id === 'trial-and-error') return progress.trialAndErrorCompleted === true
  if (id === 'lean-build') return false
  return (id === 'no-science' && progress.noScienceCompleted === true) || progress.completedQuantumChallenges?.includes(id) === true
}
export function effectiveDivisions(state: Pick<CanonicalGameStateV1, 'challenges' | 'quantum'>): bigint {
  return activeReworkChallenge(state) ? 0n : state.quantum.divisionsPurchased
}
export function quantumDoubleIpEnabled(state: Pick<CanonicalGameStateV1, 'challenges' | 'quantum'>): boolean {
  return !activeReworkChallenge(state) && state.quantum.unlocks.doubleInfinityPoints
}
export function challengeAllowsFacility(state: Pick<CanonicalGameStateV1, 'challenges'>, id: CanonicalFacilityId): boolean {
  const active = activeReworkChallenge(state)
  return active !== 'built-by-hand' && (active !== 'grounded' || ['assembly_lines','ai_managers','servers','data_centers'].includes(id))
}
/** Hands Off supplies generation instead of purchases or Tinker. */
export function challengeAllowsTinker(state: Pick<CanonicalGameStateV1, 'challenges'>): boolean {
  return activeReworkChallenge(state) !== 'hands-off'
}
export function challengeAllowsFacilityPurchase(state: Pick<CanonicalGameStateV1, 'challenges'>, id: CanonicalFacilityId): boolean {
  return activeReworkChallenge(state) !== 'hands-off' && challengeAllowsFacility(state, id)
}
/** Remove forbidden retained facilities when creating a challenge run. */
export function challengeFacilities(state: Pick<CanonicalGameStateV1, 'challenges'>, facilities: CanonicalGameStateV1['dyson']['facilities']): CanonicalGameStateV1['dyson']['facilities'] {
  const active = activeReworkChallenge(state)
  if (active !== 'built-by-hand' && active !== 'grounded') return facilities
  return Object.fromEntries(Object.entries(facilities).map(([id,pair]) => [id, challengeAllowsFacility(state, id as CanonicalFacilityId) ? pair : [0,0]])) as CanonicalGameStateV1['dyson']['facilities']
}
