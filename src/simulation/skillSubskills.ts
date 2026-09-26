import type { RuntimeGameAsset } from '../game-data/types'
import { SKILL_DEFINITION_ASSET_KIND } from '../game-data/runtimeAssetKinds'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { isGalvanized } from './galvanization'

export const CASH_SCIENCE_SUBSKILLS = Object.freeze({
  lifetime: 'subskill.cashScience.lifetime',
  decay: 'subskill.cashScience.decay',
  production: 'subskill.cashScience.production',
} as const)

export const SRS_AUGMENTS = Object.freeze({
  hotStart: 'subskill.srs.hotStart',
  afterglow: 'subskill.srs.afterglow',
  deepExposure: 'subskill.srs.deepExposure',
  focusedBeam: 'subskill.srs.focusedBeam',
  researchConversion: 'subskill.srs.researchConversion',
  researchActivity: 'subskill.srs.researchActivity',
  stellarMemory: 'subskill.srs.stellarMemory',
} as const)

export const MANUAL_LABOUR_AUGMENTS = Object.freeze({
  handAssembly: 'subskill.manualLabour.handAssembly',
  practice: 'subskill.manualLabour.practice',
  workingSmarter: 'subskill.manualLabour.workingSmarter',
  patientHands: 'subskill.manualLabour.patientHands',
} as const)

export interface SkillAugmentDefinition {
  readonly id: string
  readonly parentSkillId: string
  readonly cost: number
  readonly requiredSkillIds: readonly string[]
}

export const SKILL_AUGMENTS: readonly SkillAugmentDefinition[] = Object.freeze(
  [...Object.values(MANUAL_LABOUR_AUGMENTS).map(id => Object.freeze({
    id, parentSkillId: 'manualLabour', cost: 1, requiredSkillIds: Object.freeze(id === MANUAL_LABOUR_AUGMENTS.handAssembly ? ['manualLabour'] : [MANUAL_LABOUR_AUGMENTS.handAssembly]),
  })), ...Object.values(CASH_SCIENCE_SUBSKILLS).map((id) => Object.freeze({
    id,
    parentSkillId: 'startHereTree',
    cost: 1,
    requiredSkillIds: Object.freeze(['startHereTree']),
  })),
  ...Object.entries(SRS_AUGMENTS).map(([key, id]) => Object.freeze({
    id, parentSkillId: 'superRadiantScattering',
    cost: key === 'stellarMemory' ? 5 : key === 'hotStart' || key === 'deepExposure' ? 3
      : key === 'researchActivity' ? 2 : 1,
    requiredSkillIds: Object.freeze(
      key === 'stellarMemory' ? [SRS_AUGMENTS.researchActivity, SRS_AUGMENTS.researchConversion] :
      key === 'afterglow' ? [SRS_AUGMENTS.hotStart] :
      key === 'researchConversion' ? [SRS_AUGMENTS.focusedBeam] :
      key === 'researchActivity' ? [SRS_AUGMENTS.deepExposure, SRS_AUGMENTS.focusedBeam] :
      ['superRadiantScattering']),
  }))],
)

export function skillAugments(parentSkillId: string): readonly SkillAugmentDefinition[] {
  return SKILL_AUGMENTS.filter((augment) => augment.parentSkillId === parentSkillId)
}

export const SUBSKILL_ASSETS: readonly RuntimeGameAsset[] = Object.freeze(
  SKILL_AUGMENTS.map(({ id, cost, requiredSkillIds }) => ({
    id, kind: SKILL_DEFINITION_ASSET_KIND,
    data: {
      cost, refundable: id !== SRS_AUGMENTS.hotStart, isFragment: false,
      requiredSkillIds: [...requiredSkillIds], shadowRequirementIds: [],
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
  const augment = SKILL_AUGMENTS.find((definition) => definition.id === id)
  return augment !== undefined && isGalvanized(state, augment.parentSkillId)
}

export function hasCashScienceSubskill(state: Readonly<CanonicalGameStateV1>, bonus: keyof typeof CASH_SCIENCE_SUBSKILLS): boolean {
  return isGalvanized(state, 'startHereTree') && state.skills.byId[CASH_SCIENCE_SUBSKILLS[bonus]]?.owned === true
}

export function hasSrsAugment(state: Pick<CanonicalGameStateV1, 'skills' | 'challenges'>, bonus: keyof typeof SRS_AUGMENTS): boolean {
  return isGalvanized(state, 'superRadiantScattering') &&
    state.skills.byId.superRadiantScattering?.owned === true &&
    state.skills.byId[SRS_AUGMENTS[bonus]]?.owned === true
}

export function hasManualLabourAugment(state: Pick<CanonicalGameStateV1, 'skills' | 'challenges'>, bonus: keyof typeof MANUAL_LABOUR_AUGMENTS): boolean {
  return isGalvanized(state, 'manualLabour') && state.skills.byId.manualLabour?.owned === true && state.skills.byId[MANUAL_LABOUR_AUGMENTS[bonus]]?.owned === true
}
