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
  return state.challenges?.active === 'blank-slate'
}

export function isTrialAndErrorActive(state: Readonly<CanonicalGameStateV1>): boolean { return state.challenges?.active === 'trial-and-error' }
export function isInfinityChallengeActive(state: Readonly<CanonicalGameStateV1>): boolean { return state.challenges?.active === 'blank-slate' || state.challenges?.active === 'trial-and-error' }
export function hasCompletedInfinityChallenge(state: Readonly<CanonicalGameStateV1>): boolean { return state.challenges?.blankSlateCompleted === true || state.challenges?.trialAndErrorCompleted === true || state.challenges?.noScienceCompleted === true || (state.challenges?.completedQuantumChallenges?.length ?? 0) > 0 }

/** An Infinity challenge always ends at the ordinary Infinity boundary. */
export function isBreakInfinityEnabled(state: Readonly<CanonicalGameStateV1>): boolean {
  return state.quantum.unlocks.breakTheLoop && !isInfinityChallengeActive(state)
}

export function validateInfinityChallenges(value: unknown): string | null {
  if (value === undefined) return null
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return 'Invalid Infinity challenge progress.'
  const c = value as Record<string, unknown>
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
        new Set(ids).size !== ids.length || (ids.length > 0 && c.blankSlateCompleted !== true && c.trialAndErrorCompleted !== true && c.noScienceCompleted !== true && !(Array.isArray(c.completedQuantumChallenges) && c.completedQuantumChallenges.length > 0))) {
      return 'Invalid galvanized skill ownership.'
    }
  }
  return null
}

export function isNoScienceActive(state: Readonly<CanonicalGameStateV1>): boolean {
  return state.challenges?.active === 'no-science'
}
export function isResearchDisabledByChallenge(state: Readonly<CanonicalGameStateV1>): boolean {
  return isTrialAndErrorActive(state) || isNoScienceActive(state)
}


export const QUANTUM_CHALLENGE_IDS = ['no-science', 'short-circuit', 'grounded', 'built-by-hand', 'hands-off', 'commitment-issues', 'supply-shortage'] as const satisfies readonly QuantumChallengeId[]
export function isQuantumChallenge(id: unknown): id is QuantumChallengeId {
  return QUANTUM_CHALLENGE_IDS.some(candidate => candidate === id)
}
export function isChallengeId(id: unknown): id is ChallengeId {
  return id === 'blank-slate' || id === 'trial-and-error' || isQuantumChallenge(id)
}
export function isQuantumChallengeActive(state: Pick<CanonicalGameStateV1, 'challenges'>): boolean {
  return isQuantumChallenge(state.challenges?.active)
}
export function challengeCompleted(progress: Readonly<InfinityChallengeState>, id: ChallengeId): boolean {
  if (id === 'blank-slate') return progress.blankSlateCompleted
  if (id === 'trial-and-error') return progress.trialAndErrorCompleted === true
  return (id === 'no-science' && progress.noScienceCompleted === true) || progress.completedQuantumChallenges?.includes(id) === true
}
export function effectiveDivisions(state: Pick<CanonicalGameStateV1, 'challenges' | 'quantum'>): bigint {
  return isQuantumChallengeActive(state) ? 0n : state.quantum.divisionsPurchased
}
export function quantumDoubleIpEnabled(state: Pick<CanonicalGameStateV1, 'challenges' | 'quantum'>): boolean {
  return !isQuantumChallengeActive(state) && state.quantum.unlocks.doubleInfinityPoints
}
export function challengeAllowsFacility(state: Pick<CanonicalGameStateV1, 'challenges'>, id: CanonicalFacilityId): boolean {
  if (state.challenges?.active === 'built-by-hand') return false
  return state.challenges?.active !== 'grounded' || ['assembly_lines', 'ai_managers', 'servers', 'data_centers'].includes(id)
}
export function challengeAllowsFacilityPurchase(state: Pick<CanonicalGameStateV1, 'challenges'>, id: CanonicalFacilityId): boolean {
  return state.challenges?.active !== 'hands-off' && challengeAllowsFacility(state, id)
}
/** Used at reset and derivation boundaries; forbidden facilities never contribute effects. */
export function challengeFacilities(state: Pick<CanonicalGameStateV1, 'challenges'>, facilities: CanonicalGameStateV1['dyson']['facilities']): CanonicalGameStateV1['dyson']['facilities'] {
  if (state.challenges?.active !== 'built-by-hand' && state.challenges?.active !== 'grounded') return facilities
  return Object.fromEntries(Object.entries(facilities).map(([id, pair]) => [id, challengeAllowsFacility(state, id as CanonicalFacilityId) ? pair : [0, 0]])) as CanonicalGameStateV1['dyson']['facilities']
}
