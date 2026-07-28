import { getGameAsset } from '../game-data/catalog'
import { operationFromUnity, type StatEffect } from './stat'

const SUPPORTED_STATIC_SKILLS = new Set([
  'assemblyLineTree',
  'workerEfficiencyTree',
  'superchargedPower',
])

interface EffectReference {
  readonly id?: unknown
}

function requireStaticSkill(skillId: string): void {
  if (!SUPPORTED_STATIC_SKILLS.has(skillId)) {
    throw new Error(
      `Skill '${skillId}' has not yet been characterized for simulation`,
    )
  }
}

export function staticSkillEffects(
  ownedSkillIds: readonly string[],
  targetStatId: string,
): StatEffect[] {
  const effects: StatEffect[] = []
  for (const skillId of ownedSkillIds) {
    requireStaticSkill(skillId)
    const skill = getGameAsset('GameData.SkillDefinition', skillId)
    if (skill === undefined) {
      throw new Error(`Unknown skill '${skillId}'`)
    }
    const references = skill.data.effects
    if (!Array.isArray(references)) continue

    for (const reference of references as readonly EffectReference[]) {
      if (typeof reference?.id !== 'string') continue
      const asset = getGameAsset('GameData.EffectDefinition', reference.id)
      if (asset === undefined || asset.data.targetStatId !== targetStatId) {
        continue
      }
      if (asset.data.conditionId !== null) {
        throw new Error(
          `Conditional effect '${reference.id}' is not ported yet`,
        )
      }
      const operation = asset.data.operation
      const value = asset.data.value
      const perLevel = asset.data.perLevel
      const order = asset.data.order
      if (
        typeof operation !== 'number' ||
        typeof value !== 'number' ||
        typeof perLevel !== 'number' ||
        typeof order !== 'number'
      ) {
        throw new Error(`Effect '${reference.id}' has invalid numeric data`)
      }
      effects.push({
        id: reference.id,
        operation: operationFromUnity(operation),
        value: value + perLevel,
        order,
      })
    }
  }
  return effects
}
