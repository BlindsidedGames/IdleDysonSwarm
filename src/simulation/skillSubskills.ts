import type { RuntimeGameAsset } from '../game-data/types'
import { SKILL_DEFINITION_ASSET_KIND } from '../game-data/runtimeAssetKinds'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { isGalvanized } from './galvanization'

export const CASH_SCIENCE_SUBSKILLS = Object.freeze({
  lifetime: 'subskill.cashScience.lifetime',
  decay: 'subskill.cashScience.decay',
  production: 'subskill.cashScience.production',
} as const)

export const SUBSKILL_ASSETS: readonly RuntimeGameAsset[] = Object.freeze(
  Object.values(CASH_SCIENCE_SUBSKILLS).map((id) => ({
    id, kind: SKILL_DEFINITION_ASSET_KIND,
    data: {
      cost: 1, refundable: true, isFragment: false,
      requiredSkillIds: ['startHereTree'], shadowRequirementIds: [],
      exclusiveWithIds: [], unrefundableWithIds: [], effects: [],
      firstRunBlocked: false, purityLine: false, terraLine: false,
      powerLine: false, paragadeLine: false, stellarLine: false,
    },
  })),
)

export function isSubskill(id: string): boolean {
  return SUBSKILL_ASSETS.some((asset) => asset.id === id)
}

export function isSubskillUnlocked(state: Readonly<CanonicalGameStateV1>, id: string): boolean {
  return isSubskill(id) && isGalvanized(state, 'startHereTree')
}

export function hasCashScienceSubskill(state: Readonly<CanonicalGameStateV1>, bonus: keyof typeof CASH_SCIENCE_SUBSKILLS): boolean {
  return isGalvanized(state, 'startHereTree') && state.skills.byId[CASH_SCIENCE_SUBSKILLS[bonus]]?.owned === true
}
