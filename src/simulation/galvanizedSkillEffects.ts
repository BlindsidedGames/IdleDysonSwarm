import type { CanonicalGameStateV1 } from '../game-state/types'
import { isGalvanized, galvanizedSkillIds } from './galvanization'
import { hasCashScienceSubskill } from './skillSubskills'
import type { StatEffect } from './stat'

/** Authored conditions still resolve normally; only the owning skill's downside disappears. */
export function adjustGalvanizedEffects(
  state: Readonly<CanonicalGameStateV1>, statId: string, effects: readonly StatEffect[],
): readonly StatEffect[] {
  const powerSkills = ['tasteOfPower', 'indulgingInPower', 'addictionToPower'] as const
  const separatePowerPenalties = powerSkills.some((id) => isGalvanized(state, id))
  const result: StatEffect[] = []
  for (const effect of effects) {
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
  return result
}

export function galvanizedSkillSet(state: Readonly<CanonicalGameStateV1>): ReadonlySet<string> {
  return new Set(galvanizedSkillIds(state))
}
