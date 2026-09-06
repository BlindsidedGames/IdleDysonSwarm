import { getGameAssetsByKind } from '../game-data/catalog'
import { SKILL_DEFINITION_ASSET_KIND } from '../game-data/runtimeAssetKinds'
import type { CanonicalGameStateV1, InfinityChallengeState, SkillRuntimeState } from '../game-state/types'

type GalvanizationSource = { readonly challenges?: Readonly<InfinityChallengeState> }

export function galvanizedSkillIds(state: GalvanizationSource): readonly string[] {
  return state.challenges?.galvanizedSkillIds ?? []
}

export function isGalvanized(state: GalvanizationSource, id: string): boolean {
  return galvanizedSkillIds(state).includes(id)
}

/** New run runtime values; permanent ownership never retains a previous run's timers. */
export function permanentSkillRuntime(state: GalvanizationSource): Record<string, SkillRuntimeState> {
  const permanent = new Set(galvanizedSkillIds(state))
  if (permanent.size === 0) return {}
  // Permanent skills may evaluate sibling skills after their reveal gate resets.
  // Keep explicit unowned records so those dynamic effects can still resolve.
  return Object.fromEntries(getGameAssetsByKind(SKILL_DEFINITION_ASSET_KIND).map(({ id }) => [id, {
    owned: permanent.has(id), level: permanent.has(id) ? 1 : 0,
    timerSeconds: 0, secondaryTimerSeconds: 0,
  }]))
}

export function permanentFragmentCount(state: GalvanizationSource): bigint {
  const fragmentIds = new Set(getGameAssetsByKind(SKILL_DEFINITION_ASSET_KIND)
    .filter((asset) => asset.data.isFragment === true || asset.data.isFragment === 1)
    .map((asset) => asset.id))
  return BigInt(galvanizedSkillIds(state).filter((id) => fragmentIds.has(id)).length)
}

/** Permanent bases have no dependencies and cannot exclude any other base. */
export function galvanizationDefinition<T extends {
  readonly required: readonly string[]
  readonly shadowRequired: readonly string[]
  readonly exclusiveWith: readonly string[]
}>(definition: T, id: string, state: GalvanizationSource): T {
  const permanent = isGalvanized(state, id)
  return {
    ...definition,
    required: permanent ? [] : definition.required,
    shadowRequired: permanent ? [] : definition.shadowRequired,
    exclusiveWith: permanent ? [] : definition.exclusiveWith.filter((other) => !isGalvanized(state, other)),
  }
}

export function validateGalvanizedSkills(state: Readonly<CanonicalGameStateV1>): readonly string[] {
  const errors: string[] = []
  for (const id of galvanizedSkillIds(state)) {
    if (state.skills.byId[id]?.owned !== true) errors.push(`Galvanized skill '${id}' must remain active.`)
  }
  return errors
}
