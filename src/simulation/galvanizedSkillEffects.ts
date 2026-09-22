import { stellarMemoryMultiplier } from './srsAugments'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { isGalvanized, galvanizedSkillIds } from './galvanization'
import { hasCashScienceSubskill, hasSrsAugment, SRS_AUGMENTS } from './skillSubskills'
import type { StatEffect } from './stat'

/** Authored conditions still resolve normally; only the owning skill's downside disappears. */
export function adjustGalvanizedEffects(
  state: Readonly<CanonicalGameStateV1>, statId: string, effects: readonly StatEffect[],
): readonly StatEffect[] {
  const powerSkills = ['tasteOfPower', 'indulgingInPower', 'addictionToPower'] as const
  const separatePowerPenalties = powerSkills.some((id) => isGalvanized(state, id))
  const result: StatEffect[] = []
  for (const original of effects) {
    let effect = original
    if (effect.id.startsWith('effect.superRadiantScattering.') &&
        (statId === 'Global.MoneyMultiplier' || statId === 'Global.ScienceMultiplier') &&
        hasSrsAugment(state, 'focusedBeam')) {
      const side = Math.sign(state.dyson.workers - state.dyson.researchers)
      const favoured = statId === 'Global.MoneyMultiplier' ? side > 0 : side < 0
      const scale = state.discovery?.unlocked || favoured ? 1 + 0.5 * stellarMemoryMultiplier(state) : side === 0 ? 1 : 0.5
      effect = { ...effect, value: 1 + (effect.value - 1) * scale }
    }
    const id = effect.id.split('.')[1]
    if (separatePowerPenalties && id === 'tasteOfPower' &&
        (statId === 'Global.MoneyMultiplier' || statId === 'Global.ScienceMultiplier')) continue
    if (!isGalvanized(state, id)) { result.push(effect); continue }
    if (id === 'shouldersOfPrecursors') {
      result.push({ ...effect, operation: 'multiply' })
    } else if ((effect.operation === 'multiply' && effect.value < 1) ||
        (effect.operation === 'add' && effect.value < 0)) {
      continue
    } else result.push(effect)
  }
  if (separatePowerPenalties && (statId === 'Global.MoneyMultiplier' || statId === 'Global.ScienceMultiplier')) {
    const penalties = [0.25, 0.15, 0.1]
    const penalty = powerSkills.reduce((total, id, index) => total +
      (state.skills.byId[id]?.owned === true && !isGalvanized(state, id) ? penalties[index] : 0), 0)
    result.push({ id: `galvanization.power-penalty.${statId}`, operation: 'multiply', value: 1 - penalty, order: 60 })
  }
  if (statId === 'Global.PanelLifetime' && hasCashScienceSubskill(state, 'lifetime')) {
    result.push({ id: 'subskill.cashScience.lifetime', operation: 'add', value: 5, order: 0 })
  }
  if ((statId === 'Global.MoneyPerSecond' || statId === 'Global.SciencePerSecond') && hasCashScienceSubskill(state, 'production')) {
    result.push({ id: `subskill.cashScience.production.${statId}`, operation: 'multiply', value: 2, order: 250 })
  }
  if (statId === 'Global.SciencePerSecond' && hasSrsAugment(state, 'researchConversion')) {
    result.push({ id: SRS_AUGMENTS.researchConversion, operation: 'multiply', value: 0.5, order: 300 })
  }
  return result
}

export function galvanizedSkillSet(state: Readonly<CanonicalGameStateV1>): ReadonlySet<string> {
  return new Set(galvanizedSkillIds(state))
}
