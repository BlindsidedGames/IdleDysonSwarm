import { getGameAsset } from '../game-data/catalog'
import type {
  RuntimeAssetReference,
  RuntimeAssetValue,
  RuntimeGameAsset,
} from '../game-data/types'
import { operationFromUnity, type StatOperation } from './stat'

export type SkillEffectAssetLookup = (
  kind: string,
  id: string,
) => RuntimeGameAsset | undefined

export interface CompiledSkillEffectDefinition {
  readonly id: string
  readonly operation: StatOperation
  readonly authoredValue: number
  readonly perLevel: number
  readonly order: number
  readonly conditionId: string | null
  readonly conditionAssetId: string | null
  readonly targetFacilityIds: readonly string[]
  readonly targetFacilityTags: readonly string[]
}

export interface CompiledSkillEffectCandidate {
  readonly skillId: string
  readonly effect: Readonly<CompiledSkillEffectDefinition>
}

export interface CompiledSkillEffectCatalog {
  readonly candidatesForStat: (
    targetStatId: string,
  ) => readonly Readonly<CompiledSkillEffectCandidate>[]
  /** Resolves an authored effect back to the skill that owns its icon/name. */
  readonly skillIdForEffect: (effectId: string) => string | undefined
}

const EMPTY_CANDIDATES: readonly Readonly<CompiledSkillEffectCandidate>[] =
  Object.freeze([])

let defaultCatalog: Readonly<CompiledSkillEffectCatalog> | undefined

/**
 * Returns the process-wide compiled view of the generated Unity skill catalog.
 * Compilation is deferred until a non-empty statistic is first requested so
 * materializing an empty target retains the original no-catalog-read behavior.
 */
export function getCompiledSkillEffectCatalog(): Readonly<CompiledSkillEffectCatalog> {
  defaultCatalog ??= compileSkillEffectCatalog(getGameAsset)
  return defaultCatalog
}

/**
 * Validates and compiles SkillDatabase in its authored source order. The
 * supplied lookup is injectable so validation and ordering can be certified
 * independently of the generated runtime catalog.
 */
export function compileSkillEffectCatalog(
  lookup: SkillEffectAssetLookup,
): Readonly<CompiledSkillEffectCatalog> {
  const database = lookup(
    'GameData.SkillDatabase',
    'SkillDatabase',
  )
  if (database === undefined) {
    throw new Error('Exported game data is missing SkillDatabase.')
  }
  const skillReferences = requireReferences(
    database.data.skills,
    'SkillDatabase.skills',
  )
  const mutableCandidatesByStat = new Map<
    string,
    CompiledSkillEffectCandidate[]
  >()
  const skillIdsByEffect = new Map<string, string>()

  for (const skillReference of skillReferences) {
    if (skillReference.id === null) continue
    const skillId = skillReference.id
    const skill = lookup('GameData.SkillDefinition', skillId)
    if (skill === undefined) {
      throw new Error(
        `Exported SkillDatabase references missing skill '${skillId}'.`,
      )
    }
    const effectReferences = requireReferences(
      skill.data.effects,
      `skills.${skillId}.effects`,
    )
    for (const effectReference of effectReferences) {
      if (effectReference.id === null) continue
      const effectId = effectReference.id
      const asset = lookup('GameData.EffectDefinition', effectId)
      if (asset === undefined) {
        throw new Error(
          `Skill '${skillId}' references missing effect '${effectId}'.`,
        )
      }
      const compiled = compileEffectData(asset.data, effectId)
      const candidate = Object.freeze({
        skillId,
        effect: compiled.effect,
      })
      skillIdsByEffect.set(effectId, skillId)
      const candidates =
        mutableCandidatesByStat.get(compiled.targetStatId) ?? []
      if (candidates.length === 0) {
        mutableCandidatesByStat.set(compiled.targetStatId, candidates)
      }
      candidates.push(candidate)
    }
  }

  const candidatesByStat = new Map<
    string,
    readonly Readonly<CompiledSkillEffectCandidate>[]
  >(
    [...mutableCandidatesByStat].map(([statId, candidates]) => [
      statId,
      Object.freeze(candidates),
    ]),
  )
  return Object.freeze({
    candidatesForStat: (targetStatId: string) =>
      candidatesByStat.get(targetStatId) ?? EMPTY_CANDIDATES,
    skillIdForEffect: (effectId: string) =>
      skillIdsByEffect.get(effectId),
  })
}

function compileEffectData(
  data: Readonly<Record<string, RuntimeAssetValue>>,
  expectedId: string,
): {
  readonly targetStatId: string
  readonly effect: Readonly<CompiledSkillEffectDefinition>
} {
  const id = requireString(data.id, `${expectedId}.id`)
  if (id !== expectedId) {
    throw new Error(
      `Effect asset '${expectedId}' declares mismatched id '${id}'.`,
    )
  }
  const targetStatId = requireString(
    data.targetStatId,
    `${expectedId}.targetStatId`,
  )
  const operation = requireNumber(
    data.operation,
    `${expectedId}.operation`,
  )
  const authoredValue = requireNumber(
    data.value,
    `${expectedId}.value`,
  )
  const perLevel = requireNumber(
    data.perLevel,
    `${expectedId}.perLevel`,
  )
  const order = requireNumber(data.order, `${expectedId}.order`)
  const conditionId = requireNullableString(
    data.conditionId,
    `${expectedId}.conditionId`,
  )
  const conditionAssetId = optionalReferenceId(
    data._condition,
    `${expectedId}._condition`,
  )
  const targetFacilityIds = requireStrings(
    data.targetFacilityIds,
    `${expectedId}.targetFacilityIds`,
  ).map((value) => value.toLowerCase())
  const targetFacilityTags = requireStrings(
    data.targetFacilityTags,
    `${expectedId}.targetFacilityTags`,
  ).map((value) => value.toLowerCase())
  return {
    targetStatId,
    effect: Object.freeze({
      id,
      operation: operationFromUnity(operation),
      authoredValue,
      perLevel,
      order,
      conditionId,
      conditionAssetId,
      targetFacilityIds: Object.freeze(targetFacilityIds),
      targetFacilityTags: Object.freeze(targetFacilityTags),
    }),
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
    throw new Error(
      `Exported game data '${path}' is not a reference list.`,
    )
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
    throw new Error(
      `Exported game data '${path}' must be a string list.`,
    )
  }
  return value
}
