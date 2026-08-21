import {
  getCompiledSkillEffectCatalog,
  type CompiledSkillEffectCatalog,
  type CompiledSkillEffectDefinition,
} from './compiledSkillEffectCatalog'
import type { StatEffect } from './stat'

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

const EMPTY_EFFECTS: readonly StatEffect[] = Object.freeze([])
const EMPTY_EFFECT_GROUPS: readonly (readonly StatEffect[])[] =
  Object.freeze([])

/**
 * Mirrors SkillEffectProvider.BuildEffects over the exported Unity catalog.
 * Stable source ordering is retained so equal-order effects resolve exactly as
 * they do in the SkillDatabase and each SkillDefinition's effect list.
 */
export function materializeSkillEffects(
  context: Readonly<SkillEffectMaterializationContext>,
): readonly StatEffect[] {
  if (context.targetStatId.length === 0) return EMPTY_EFFECTS
  return materializeFromCompiledCatalog(
    context,
    getCompiledSkillEffectCatalog(),
  )
}

/**
 * Batch companion for callers that materialize several statistic contexts at
 * once. Results retain input order and each group retains SkillDatabase source
 * ordering. The generated catalog is compiled at most once for the batch.
 */
export function materializeSkillEffectsForContexts(
  contexts: readonly Readonly<SkillEffectMaterializationContext>[],
): readonly (readonly StatEffect[])[] {
  if (contexts.length === 0) return EMPTY_EFFECT_GROUPS
  const needsCatalog = contexts.some(
    (context) => context.targetStatId.length > 0,
  )
  if (!needsCatalog) {
    return Object.freeze(contexts.map(() => EMPTY_EFFECTS))
  }
  const catalog = getCompiledSkillEffectCatalog()
  return Object.freeze(
    contexts.map((context) =>
      context.targetStatId.length === 0
        ? EMPTY_EFFECTS
        : materializeFromCompiledCatalog(context, catalog),
    ),
  )
}

function materializeFromCompiledCatalog(
  context: Readonly<SkillEffectMaterializationContext>,
  catalog: Readonly<CompiledSkillEffectCatalog>,
): readonly StatEffect[] {
  const effects: StatEffect[] = []
  for (const candidate of catalog.candidatesForStat(
    context.targetStatId,
  )) {
    if (!context.ownedSkillIds.has(candidate.skillId)) continue
    const effect = candidate.effect
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
        ? effect.authoredValue + effect.perLevel
        : dynamicValue
    if (!Number.isFinite(resolvedValue)) {
      throw new Error(
        `Effect '${effect.id}' resolved to a non-finite value.`,
      )
    }
    if (shouldSkipEffect(effect.operation, resolvedValue)) continue
    effects.push(
      Object.freeze({
        id: effect.id,
        operation: effect.operation,
        value: resolvedValue,
        order: effect.order,
        ...((effect.conditionAssetId ?? effect.conditionId) === null
          ? {}
          : {
              conditionIdentifier:
                effect.conditionAssetId ?? effect.conditionId!,
            }),
      }),
    )
  }
  return effects.length === 0 ? EMPTY_EFFECTS : Object.freeze(effects)
}

function conditionMet(
  effect: Readonly<CompiledSkillEffectDefinition>,
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
  effect: Readonly<CompiledSkillEffectDefinition>,
  facility: Readonly<SkillEffectFacilityContext> | undefined,
): boolean {
  const hasFilter =
    effect.targetFacilityIds.length > 0 ||
    effect.targetFacilityTags.length > 0
  if (facility === undefined) return !hasFilter
  if (
    effect.targetFacilityIds.length > 0 &&
    !effect.targetFacilityIds.includes(facility.id.toLowerCase())
  ) {
    return false
  }
  if (
    effect.targetFacilityTags.length > 0 &&
    !effect.targetFacilityTags.some((target) =>
      facility.tags.some((tag) => tag.toLowerCase() === target),
    )
  ) {
    return false
  }
  return true
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
