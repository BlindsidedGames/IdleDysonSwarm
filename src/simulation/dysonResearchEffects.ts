import { isFiniteNonNegativeNumber } from '../core/finiteNonNegativeNumber'
import { isNonArrayRecord as isRecord } from '../core/nonArrayRecord'
import type { DysonCompatibilityTuning } from '../game-state/compatibilityTuning'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { getGameAsset } from '../game-data/catalog'
import type { RuntimeGameAsset } from '../game-data/types'
import type { SecretResearchCoefficientId } from './secretBuffs'
import {
  operationFromUnity,
  type StatEffect,
  type StatOperation,
} from './stat'

export const DYSON_RESEARCH_IDS = [
  'research.money_multiplier',
  'research.science_boost',
  'research.assembly_line_upgrade',
  'research.ai_manager_upgrade',
  'research.server_upgrade',
  'research.data_center_upgrade',
  'research.planet_upgrade',
  'research.matrioshka_brains_upgrade',
  'research.birch_planets_upgrade',
  'research.galactic_brains_upgrade',
  'research.panel_lifetime_1',
  'research.panel_lifetime_2',
  'research.panel_lifetime_3',
  'research.panel_lifetime_4',
] as const

export type DysonResearchId = (typeof DYSON_RESEARCH_IDS)[number]

type ResearchLevels = CanonicalGameStateV1['research']['levelsById']
type ResearchCoefficientField = Exclude<
  keyof DysonCompatibilityTuning,
  'panelsPerSecMulti'
>

interface ResearchSpec {
  readonly id: DysonResearchId
  readonly effectId: string
  readonly targetStatId: string
  readonly maxLevel: -1 | 1
  readonly coefficientField?: ResearchCoefficientField
  readonly panelLifetimePerLevel?: number
}

const RESEARCH_SPECS: readonly ResearchSpec[] = [
  {
    id: 'research.money_multiplier',
    effectId: 'effect.research.money_multiplier',
    targetStatId: 'Global.MoneyMultiplier',
    maxLevel: -1,
    coefficientField: 'moneyMultiUpgradePercent',
  },
  {
    id: 'research.science_boost',
    effectId: 'effect.research.science_multiplier',
    targetStatId: 'Global.ScienceMultiplier',
    maxLevel: -1,
    coefficientField: 'scienceBoostPercent',
  },
  {
    id: 'research.assembly_line_upgrade',
    effectId: 'effect.research.assembly_line_modifier',
    targetStatId: 'Facility.AssemblyLine.Modifier',
    maxLevel: -1,
    coefficientField: 'assemblyLineUpgradePercent',
  },
  {
    id: 'research.ai_manager_upgrade',
    effectId: 'effect.research.ai_manager_modifier',
    targetStatId: 'Facility.Manager.Modifier',
    maxLevel: -1,
    coefficientField: 'aiManagerUpgradePercent',
  },
  {
    id: 'research.server_upgrade',
    effectId: 'effect.research.server_modifier',
    targetStatId: 'Facility.Server.Modifier',
    maxLevel: -1,
    coefficientField: 'serverUpgradePercent',
  },
  {
    id: 'research.data_center_upgrade',
    effectId: 'effect.research.data_center_modifier',
    targetStatId: 'Facility.DataCenter.Modifier',
    maxLevel: -1,
    coefficientField: 'dataCenterUpgradePercent',
  },
  {
    id: 'research.planet_upgrade',
    effectId: 'effect.research.planet_modifier',
    targetStatId: 'Facility.Planet.Modifier',
    maxLevel: -1,
    coefficientField: 'planetUpgradePercent',
  },
  {
    id: 'research.matrioshka_brains_upgrade',
    effectId: 'effect.research.matrioshka_modifier',
    targetStatId: 'Facility.Matrioshka.Modifier',
    maxLevel: -1,
    coefficientField: 'matrioshkaUpgradePercent',
  },
  {
    id: 'research.birch_planets_upgrade',
    effectId: 'effect.research.birch_modifier',
    targetStatId: 'Facility.Birch.Modifier',
    maxLevel: -1,
    coefficientField: 'birchUpgradePercent',
  },
  {
    id: 'research.galactic_brains_upgrade',
    effectId: 'effect.research.galactic_modifier',
    targetStatId: 'Facility.Galactic.Modifier',
    maxLevel: -1,
    coefficientField: 'galacticUpgradePercent',
  },
  {
    id: 'research.panel_lifetime_1',
    effectId: 'effect.research.panel_lifetime_1',
    targetStatId: 'Global.PanelLifetime',
    maxLevel: 1,
    panelLifetimePerLevel: 1,
  },
  {
    id: 'research.panel_lifetime_2',
    effectId: 'effect.research.panel_lifetime_2',
    targetStatId: 'Global.PanelLifetime',
    maxLevel: 1,
    panelLifetimePerLevel: 2,
  },
  {
    id: 'research.panel_lifetime_3',
    effectId: 'effect.research.panel_lifetime_3',
    targetStatId: 'Global.PanelLifetime',
    maxLevel: 1,
    panelLifetimePerLevel: 3,
  },
  {
    id: 'research.panel_lifetime_4',
    effectId: 'effect.research.panel_lifetime_4',
    targetStatId: 'Global.PanelLifetime',
    maxLevel: 1,
    panelLifetimePerLevel: 4,
  },
]

const DYSON_RESEARCH_ID_SET: ReadonlySet<string> = new Set(
  DYSON_RESEARCH_IDS,
)

export type DysonResearchEffectIssueCode =
  | 'DYSON_RESEARCH_LEVEL_INVALID'
  | 'DYSON_RESEARCH_ID_UNSUPPORTED'
  | 'DYSON_RESEARCH_TUNING_INVALID'
  | 'DYSON_RESEARCH_OVERRIDE_INVALID'
  | 'DYSON_RESEARCH_DEFINITION_MISSING'
  | 'DYSON_RESEARCH_DEFINITION_INVALID'
  | 'DYSON_RESEARCH_EFFECT_MISSING'
  | 'DYSON_RESEARCH_EFFECT_INVALID'
  | 'DYSON_RESEARCH_EFFECT_CONDITION_UNSUPPORTED'
  | 'DYSON_RESEARCH_EFFECT_VALUE_INVALID'

export interface DysonResearchEffectIssue {
  readonly code: DysonResearchEffectIssueCode
  readonly path: string
  readonly detail: string
}

export interface MaterializedDysonResearchEffect extends StatEffect {
  readonly researchId: DysonResearchId
  readonly targetStatId: string
  readonly level: number
  readonly perLevelValue: number
}

export type DysonResearchEffectMaterializationResult =
  | {
      readonly ok: true
      readonly effects: readonly MaterializedDysonResearchEffect[]
    }
  | {
      readonly ok: false
      readonly issues: readonly DysonResearchEffectIssue[]
    }

export type DysonResearchAssetLookup = (
  kind: string,
  id: string,
) => RuntimeGameAsset | undefined

/**
 * Materializes Unity's research effects from canonical research levels.
 *
 * Unity keeps the ten repeatable research coefficients in its legacy save
 * graph, so callers must provide the values extracted from that same prepared
 * save. Panel-lifetime research continues to use the exported effect's
 * value/perLevel fields.
 */
export function materializeDysonResearchEffects(
  levelsById: ResearchLevels,
  tuning: Readonly<DysonCompatibilityTuning>,
  coefficientOverrides: Readonly<
    Partial<Record<SecretResearchCoefficientId, number>>
  > = {},
  lookup: DysonResearchAssetLookup = getGameAsset,
): DysonResearchEffectMaterializationResult {
  const issues: DysonResearchEffectIssue[] = []
  validateTuning(tuning, issues)
  validateCoefficientOverrides(coefficientOverrides, issues)
  validateActiveResearchIds(levelsById, issues)
  const effects: MaterializedDysonResearchEffect[] = []

  for (const spec of RESEARCH_SPECS) {
    const researchPath = `research.levelsById.${spec.id}`
    const rawLevel = levelsById[spec.id] ?? 0
    if (
      typeof rawLevel !== 'number' ||
      !Number.isFinite(rawLevel) ||
      !Number.isSafeInteger(rawLevel) ||
      rawLevel < 0
    ) {
      issues.push({
        code: 'DYSON_RESEARCH_LEVEL_INVALID',
        path: researchPath,
        detail: `Research level '${spec.id}' must be a non-negative safe integer.`,
      })
      continue
    }

    const definition = lookup('GameData.ResearchDefinition', spec.id)
    if (definition === undefined) {
      issues.push({
        code: 'DYSON_RESEARCH_DEFINITION_MISSING',
        path: `gameData.research.${spec.id}`,
        detail: `Research definition '${spec.id}' is missing.`,
      })
      continue
    }

    const maxLevel = definition.data.maxLevel
    const references = definition.data.effects
    if (
      definition.kind !== 'GameData.ResearchDefinition' ||
      definition.id !== spec.id ||
      maxLevel !== spec.maxLevel ||
      !Array.isArray(references) ||
      references.length !== 1
    ) {
      issues.push({
        code: 'DYSON_RESEARCH_DEFINITION_INVALID',
        path: `gameData.research.${spec.id}`,
        detail: `Research definition '${spec.id}' does not match its characterized Unity contract.`,
      })
      continue
    }
    const level = maxLevel >= 0 ? Math.min(rawLevel, maxLevel) : rawLevel

    for (let index = 0; index < references.length; index += 1) {
      const reference = references[index]
      const effectId =
        isRecord(reference) && typeof reference.id === 'string'
          ? reference.id
          : undefined
      if (effectId !== spec.effectId) {
        issues.push({
          code: 'DYSON_RESEARCH_DEFINITION_INVALID',
          path: `gameData.research.${spec.id}.effects.${index}`,
          detail: `Research '${spec.id}' must reference exactly '${spec.effectId}'.`,
        })
        continue
      }

      const effectAsset = lookup('GameData.EffectDefinition', effectId)
      if (effectAsset === undefined) {
        issues.push({
          code: 'DYSON_RESEARCH_EFFECT_MISSING',
          path: `gameData.effects.${effectId}`,
          detail: `Research effect '${effectId}' is missing.`,
        })
        continue
      }
      const parsed = parseEffect(effectAsset, spec, issues)
      if (parsed === undefined) continue
      if (level <= 0) continue

      const override =
        isSecretResearchCoefficientId(spec.id)
          ? coefficientOverrides[spec.id]
          : undefined
      const value =
        spec.coefficientField === undefined
          ? parsed.value + parsed.perLevel * level
          : (override ?? tuning[spec.coefficientField]) * level
      const perLevelValue =
        spec.coefficientField === undefined
          ? parsed.perLevel + parsed.value / level
          : override ?? tuning[spec.coefficientField]
      if (!Number.isFinite(value)) {
        issues.push({
          code: 'DYSON_RESEARCH_EFFECT_VALUE_INVALID',
          path: researchPath,
          detail: `Research effect '${effectId}' produced a non-finite value.`,
        })
        continue
      }
      if (shouldSkipEffect(parsed.operation, value)) continue

      effects.push(
        Object.freeze({
          researchId: spec.id,
          targetStatId: parsed.targetStatId,
          level,
          perLevelValue,
          id: parsed.id,
          operation: parsed.operation,
          value,
          order: parsed.order,
        }),
      )
    }
  }

  if (issues.length > 0) {
    return { ok: false, issues: Object.freeze(issues) }
  }
  return { ok: true, effects: Object.freeze(effects) }
}

interface ParsedEffect {
  readonly id: string
  readonly targetStatId: string
  readonly operation: StatOperation
  readonly order: number
  readonly value: number
  readonly perLevel: number
  readonly conditionId: string | null
}

function parseEffect(
  asset: RuntimeGameAsset,
  spec: ResearchSpec,
  issues: DysonResearchEffectIssue[],
): ParsedEffect | undefined {
  const data = asset.data
  const id = data.id
  const targetStatId = data.targetStatId
  const operation = data.operation
  const order = data.order
  const value = data.value
  const perLevel = data.perLevel
  const conditionId = data.conditionId
  const targetFacilityIds = data.targetFacilityIds
  const targetFacilityTags = data.targetFacilityTags
  if (conditionId !== null) {
    issues.push({
      code: 'DYSON_RESEARCH_EFFECT_CONDITION_UNSUPPORTED',
      path: `gameData.effects.${spec.effectId}.conditionId`,
      detail: `Research effect '${spec.effectId}' must be unconditional.`,
    })
    return undefined
  }
  const expectedPerLevel = spec.panelLifetimePerLevel ?? 0
  if (
    asset.kind !== 'GameData.EffectDefinition' ||
    asset.id !== spec.effectId ||
    id !== spec.effectId ||
    targetStatId !== spec.targetStatId ||
    operation !== 0 ||
    order !== 0 ||
    value !== 0 ||
    perLevel !== expectedPerLevel ||
    !Array.isArray(targetFacilityIds) ||
    targetFacilityIds.length !== 0 ||
    !Array.isArray(targetFacilityTags) ||
    targetFacilityTags.length !== 0
  ) {
    issues.push({
      code: 'DYSON_RESEARCH_EFFECT_INVALID',
      path: `gameData.effects.${spec.effectId}`,
      detail: `Research effect '${spec.effectId}' does not match its characterized Unity contract.`,
    })
    return undefined
  }
  return {
    id,
    targetStatId,
    operation: operationFromUnity(operation),
    order,
    value,
    perLevel,
    conditionId,
  }
}

function validateTuning(
  tuning: Readonly<DysonCompatibilityTuning>,
  issues: DysonResearchEffectIssue[],
): void {
  const fields = RESEARCH_SPECS.flatMap((spec) =>
    spec.coefficientField === undefined ? [] : [spec.coefficientField],
  )
  for (const field of fields) {
    const value = tuning[field]
    if (isFiniteNonNegativeNumber(value)) {
      continue
    }
    issues.push({
      code: 'DYSON_RESEARCH_TUNING_INVALID',
      path: `compatibilityTuning.${field}`,
      detail: `Research coefficient '${field}' must be finite and non-negative.`,
    })
  }
}

function validateCoefficientOverrides(
  overrides: Readonly<
    Partial<Record<SecretResearchCoefficientId, number>>
  >,
  issues: DysonResearchEffectIssue[],
): void {
  for (const [id, value] of Object.entries(overrides)) {
    if (
      isSecretResearchCoefficientId(id) &&
      typeof value === 'number' &&
      Number.isFinite(value) &&
      value >= 0
    ) {
      continue
    }
    issues.push({
      code: 'DYSON_RESEARCH_OVERRIDE_INVALID',
      path: `researchCoefficientOverrides.${id}`,
      detail: `Research coefficient override '${id}' is unsupported or invalid.`,
    })
  }
}

function validateActiveResearchIds(
  levelsById: ResearchLevels,
  issues: DysonResearchEffectIssue[],
): void {
  for (const [id, level] of Object.entries(levelsById)) {
    if (DYSON_RESEARCH_ID_SET.has(id)) continue
    const path = `research.levelsById.${id}`
    if (
      typeof level !== 'number' ||
      !Number.isFinite(level) ||
      !Number.isSafeInteger(level) ||
      level < 0
    ) {
      issues.push({
        code: 'DYSON_RESEARCH_LEVEL_INVALID',
        path,
        detail: `Research level '${id}' must be a non-negative safe integer.`,
      })
      continue
    }
    if (level > 0) {
      issues.push({
        code: 'DYSON_RESEARCH_ID_UNSUPPORTED',
        path,
        detail: `Active research '${id}' is outside the characterized Dyson research set.`,
      })
    }
  }
}

function isSecretResearchCoefficientId(
  id: string,
): id is SecretResearchCoefficientId {
  return (
    id === 'research.assembly_line_upgrade' ||
    id === 'research.ai_manager_upgrade' ||
    id === 'research.server_upgrade' ||
    id === 'research.planet_upgrade'
  )
}

function shouldSkipEffect(
  operation: StatOperation,
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
