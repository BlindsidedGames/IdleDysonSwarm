import { getGameAssetsByKind } from '../game-data/catalog'
import { SKILL_DEFINITION_ASSET_KIND } from '../game-data/runtimeAssetKinds'
import type { CanonicalGameStateV1, InfinityChallengeState } from '../game-state/types'

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

/** Blank Slate always ends at the ordinary Infinity boundary. */
export function isBreakInfinityEnabled(state: Readonly<CanonicalGameStateV1>): boolean {
  return state.quantum.unlocks.breakTheLoop && !isBlankSlateActive(state)
}

export function validateInfinityChallenges(value: unknown): string | null {
  if (value === undefined) return null
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return 'Invalid Infinity challenge progress.'
  const c = value as Record<string, unknown>
  if (typeof c.unlocked !== 'boolean' || typeof c.blankSlateCompleted !== 'boolean' ||
      typeof c.hasEarnedGalvanizer !== 'boolean' || (c.active !== null && c.active !== 'blank-slate') ||
      typeof c.galvanizers !== 'bigint' || c.galvanizers < 0n || c.galvanizers > 9_223_372_036_854_775_807n ||
      (c.active !== null && !c.unlocked)) return 'Invalid Infinity challenge progress or galvanizer balance.'
  if (c.galvanizedSkillIds !== undefined) {
    const ids = c.galvanizedSkillIds
    const valid = new Set(getGameAssetsByKind(SKILL_DEFINITION_ASSET_KIND).map((asset) => asset.id))
    if (!Array.isArray(ids) || ids.some((id) => typeof id !== 'string' || !valid.has(id)) ||
        new Set(ids).size !== ids.length || (ids.length > 0 && c.blankSlateCompleted !== true)) {
      return 'Invalid galvanized skill ownership.'
    }
  }
  return null
}
