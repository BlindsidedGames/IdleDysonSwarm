import { getGameAsset } from '../game-data/catalog'
import type {
  RuntimeAssetReference,
  RuntimeAssetValue,
} from '../game-data/types'
import { operationFromUnity, type StatEffect } from './stat'

export interface SkillEffectFacilityContext {
  readonly id: string
  readonly tags: readonly string[]
}

export interface SkillEffectMaterializationContext {
  readonly ownedSkillIds: ReadonlySet<string>
  readonly targetStatId: string
  readonly facility?: Readonly<SkillEffectFacilityContext>
  /**
   * Called only for conditional effects that have passed ownership, target-stat
   * and facility filtering. Missing evaluators fail closed.
   */
  readonly isConditionMet?: (
    effectId: string,
    condition: Readonly<SkillEffectConditionReference>,
  ) => boolean
  /**
   * Returns Unity's dynamic value for a recognized effect, or undefined to use
   * the exported authored value plus its single perLevel increment.
   */
  readonly resolveDynamicValue?: (effectId: string) => number | undefined
}

export interface SkillEffectConditionReference {
  readonly assetId: string | null
  readonly legacyId: string | null
}

interface EffectData {
  readonly id: string
  readonly targetStatId: string
  readonly operation: number
  readonly value: number
  readonly perLevel: number
  readonly order: number
  readonly conditionId: string | null
  readonly conditionAssetId: string | null
  readonly targetFacilityIds: readonly string[]
  readonly targetFacilityTags: readonly string[]
}

/**
 * Mirrors SkillEffectProvider.BuildEffects over the exported Unity catalog.
 * Stable source ordering is retained so equal-order effects resolve exactly as
 * they do in the SkillDatabase and each SkillDefinition's effect list.
 */
export function materializeSkillEffects(
  context: Readonly<SkillEffectMaterializationContext>,
): readonly StatEffect[] {
  if (context.targetStatId.length === 0) return Object.freeze([])

  const database = getGameAsset('GameData.SkillDatabase', 'SkillDatabase')
  if (database === undefined) {
    throw new Error("Exported game data is missing SkillDatabase.")
  }
  const skillReferences = requireReferences(
    database.data.skills,
    'SkillDatabase.skills',
  )
  const effects: StatEffect[] = []

  for (const skillReference of skillReferences) {
    if (
      skillReference.id === null ||
      !context.ownedSkillIds.has(skillReference.id)
    ) {
      continue
    }
    const skill = getGameAsset(
      'GameData.SkillDefinition',
      skillReference.id,
    )
    if (skill === undefined) {
      throw new Error(
        `Exported SkillDatabase references missing skill '${skillReference.id}'.`,
      )
    }
    const effectReferences = requireReferences(
      skill.data.effects,
      `skills.${skillReference.id}.effects`,
    )
    for (const effectReference of effectReferences) {
      if (effectReference.id === null) continue
      const asset = getGameAsset(
        'GameData.EffectDefinition',
        effectReference.id,
      )
      if (asset === undefined) {
        throw new Error(
          `Skill '${skillReference.id}' references missing effect '${effectReference.id}'.`,
        )
      }
      const effect = requireEffectData(asset.data, effectReference.id)
      if (effect.targetStatId !== context.targetStatId) continue
      if (!matchesFacility(effect, context.facility)) continue
      if (
        (effect.conditionAssetId !== null ||
          effect.conditionId !== null) &&
        !conditionMet(effect, context)
      ) {
        continue
      }

      const dynamicValue = context.resolveDynamicValue?.(effect.id)
      const resolvedValue =
        dynamicValue === undefined
          ? effect.value + effect.perLevel
          : dynamicValue
      if (!Number.isFinite(resolvedValue)) {
        throw new Error(
          `Effect '${effect.id}' resolved to a non-finite value.`,
        )
      }
      const operation = operationFromUnity(effect.operation)
      if (shouldSkipEffect(operation, resolvedValue)) continue
      effects.push(
        Object.freeze({
          id: effect.id,
          operation,
          value: resolvedValue,
          order: effect.order,
        }),
      )
    }
  }
  return Object.freeze(effects)
}

function conditionMet(
  effect: EffectData,
  context: Readonly<SkillEffectMaterializationContext>,
): boolean {
  if (context.isConditionMet === undefined) {
    throw new Error(
      `Conditional effect '${effect.id}' requires a condition evaluator.`,
    )
  }
  return context.isConditionMet(effect.id, {
    assetId: effect.conditionAssetId,
    legacyId: effect.conditionId,
  })
}

function matchesFacility(
  effect: EffectData,
  facility: Readonly<SkillEffectFacilityContext> | undefined,
): boolean {
  const hasFilter =
    effect.targetFacilityIds.length > 0 ||
    effect.targetFacilityTags.length > 0
  if (facility === undefined) return !hasFilter
  if (
    effect.targetFacilityIds.length > 0 &&
    !effect.targetFacilityIds.some(
      (id) => id.toLowerCase() === facility.id.toLowerCase(),
    )
  ) {
    return false
  }
  if (
    effect.targetFacilityTags.length > 0 &&
    !effect.targetFacilityTags.some((target) =>
      facility.tags.some(
        (tag) => tag.toLowerCase() === target.toLowerCase(),
      ),
    )
  ) {
    return false
  }
  return true
}

function requireEffectData(
  data: Readonly<Record<string, RuntimeAssetValue>>,
  expectedId: string,
): EffectData {
  const id = requireString(data.id, `${expectedId}.id`)
  if (id !== expectedId) {
    throw new Error(
      `Effect asset '${expectedId}' declares mismatched id '${id}'.`,
    )
  }
  return {
    id,
    targetStatId: requireString(
      data.targetStatId,
      `${expectedId}.targetStatId`,
    ),
    operation: requireNumber(data.operation, `${expectedId}.operation`),
    value: requireNumber(data.value, `${expectedId}.value`),
    perLevel: requireNumber(data.perLevel, `${expectedId}.perLevel`),
    order: requireNumber(data.order, `${expectedId}.order`),
    conditionId: requireNullableString(
      data.conditionId,
      `${expectedId}.conditionId`,
    ),
    conditionAssetId: optionalReferenceId(
      data._condition,
      `${expectedId}._condition`,
    ),
    targetFacilityIds: requireStrings(
      data.targetFacilityIds,
      `${expectedId}.targetFacilityIds`,
    ),
    targetFacilityTags: requireStrings(
      data.targetFacilityTags,
      `${expectedId}.targetFacilityTags`,
    ),
  }
}

function optionalReferenceId(
  value: RuntimeAssetValue | undefined,
  path: string,
): string | null {
  if (value === null || value === undefined) return null
  if (
    typeof value !== 'object' ||
    Array.isArray(value) ||
    !('id' in value)
  ) {
    throw new Error(`Exported game data '${path}' must be a reference.`)
  }
  const id = value.id
  if (id !== null && typeof id !== 'string') {
    throw new Error(
      `Exported game data '${path}.id' must be a string or null.`,
    )
  }
  return id
}

function requireReferences(
  value: RuntimeAssetValue | undefined,
  path: string,
): readonly RuntimeAssetReference[] {
  // Runtime transport deliberately retains only the stable ID. Provenance
  // metadata remains in the complete generated catalog and is not gameplay.
  if (
    !Array.isArray(value) ||
    !value.every(
      (entry) =>
        typeof entry === 'object' &&
        entry !== null &&
        'id' in entry,
    )
  ) {
    throw new Error(`Exported game data '${path}' is not a reference list.`)
  }
  return value as unknown as readonly RuntimeAssetReference[]
}

function requireString(
  value: RuntimeAssetValue | undefined,
  path: string,
): string {
  if (typeof value !== 'string') {
    throw new Error(`Exported game data '${path}' must be a string.`)
  }
  return value
}

function requireNullableString(
  value: RuntimeAssetValue | undefined,
  path: string,
): string | null {
  if (value !== null && typeof value !== 'string') {
    throw new Error(
      `Exported game data '${path}' must be a string or null.`,
    )
  }
  return value
}

function requireNumber(
  value: RuntimeAssetValue | undefined,
  path: string,
): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new Error(
      `Exported game data '${path}' must be a finite number.`,
    )
  }
  return value
}

function requireStrings(
  value: RuntimeAssetValue | undefined,
  path: string,
): readonly string[] {
  if (
    !Array.isArray(value) ||
    !value.every((entry) => typeof entry === 'string')
  ) {
    throw new Error(`Exported game data '${path}' must be a string list.`)
  }
  return value
}

function shouldSkipEffect(
  operation: StatEffect['operation'],
  value: number,
): boolean {
  const epsilon = 1e-12
  switch (operation) {
    case 'add':
      return Math.abs(value) <= epsilon
    case 'multiply':
    case 'power':
      return Math.abs(value - 1) <= epsilon
    default:
      return false
  }
}
