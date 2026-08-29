import { getGameAssetsByKind } from '../game-data/catalog'
import type {
  CanonicalGameStateV1,
  CanonicalSkillPresetSlot,
  SkillPresetState,
} from '../game-state/types'
import {
  isSkillPresetColorId,
  type SkillPresetColorId,
} from '../game-state/skillPresetColors'
import { normalizeCanonicalBotDistribution } from './botDistribution'

const SKILL_KIND = 'GameData.SkillDefinition'
const PRESET_FORMAT_VERSION = 1

interface SkillQueueDefinition {
  readonly required: readonly string[]
  readonly shadowRequired: readonly string[]
  readonly exclusiveWith: readonly string[]
  readonly unlock:
    | 'always'
    | 'first-infinity'
    | 'fragments'
    | 'purity'
    | 'terra'
    | 'power'
    | 'paragade'
    | 'stellar'
}

export interface CanonicalSkillPresetQueueSource {
  readonly skills: {
    readonly presets: readonly Readonly<SkillPresetState>[]
  }
}

interface SkillUnlockState {
  readonly meta: { readonly firstInfinityComplete: boolean }
  readonly quantum: {
    readonly unlocks: {
      readonly fragments: boolean
      readonly purity: boolean
      readonly terra: boolean
      readonly power: boolean
      readonly paragade: boolean
      readonly stellar: boolean
    }
  }
}

export interface CanonicalSkillPresetPayloadV1 {
  readonly version: 1
  readonly presetName: string
  readonly botDistribution: number
  readonly skillIds: readonly string[]
  readonly colorId?: SkillPresetColorId
}

export type CanonicalSkillPresetQueuePreview =
  | {
      readonly accepted: true
      readonly changed: boolean
      readonly code: 'added' | 'removed' | 'unchanged'
      readonly affectedSkillIds: readonly string[]
      readonly nextSkillIds: readonly string[]
    }
  | {
      readonly accepted: false
      readonly changed: false
      readonly code:
        | 'definition-gap'
        | 'exclusive-conflict'
        | 'unknown-skill'
      readonly reason: string
      readonly affectedSkillIds: readonly []
      readonly nextSkillIds: readonly string[]
    }

export type CanonicalSkillPresetImportResult =
  | {
      readonly accepted: true
      readonly payload: CanonicalSkillPresetPayloadV1
      readonly blockedSkillIds?: readonly string[]
    }
  | {
      readonly accepted: false
      readonly code:
        | 'invalid-json'
        | 'invalid-payload'
        | 'unsupported-version'
        | 'unknown-skill'
        | 'exclusive-conflict'
      readonly reason: string
    }

/**
 * Previews adding one skill to a preset. The returned queue includes the
 * complete authored required and shadow-required dependency closure in
 * dependency-safe order. No game state is changed.
 */
export function previewAddSkillToPreset(
  state: CanonicalSkillPresetQueueSource,
  slot: CanonicalSkillPresetSlot,
  skillId: string,
): CanonicalSkillPresetQueuePreview {
  const current = state.skills.presets[slot - 1].skillIds
  const definitions = loadQueueDefinitions()
  const target = definitions.get(skillId)
  if (target === undefined) {
    return rejectedPreview(
      current,
      'unknown-skill',
      `Unknown skill '${skillId}'.`,
    )
  }

  const closure: string[] = []
  const visited = new Set<string>()
  const visiting = new Set<string>()
  const appendClosure = (id: string): boolean => {
    if (visited.has(id)) return true
    if (visiting.has(id)) return false
    const definition = definitions.get(id)
    if (definition === undefined) return false
    visiting.add(id)
    for (const dependency of [
      ...definition.required,
      ...definition.shadowRequired,
    ]) {
      if (!appendClosure(dependency)) return false
    }
    visiting.delete(id)
    visited.add(id)
    closure.push(id)
    return true
  }
  if (!appendClosure(skillId)) {
    return rejectedPreview(
      current,
      'definition-gap',
      `Skill '${skillId}' has an unknown or cyclic dependency.`,
    )
  }

  const next = normalizeSkillAssignment(
    [...current, ...closure],
    definitions,
  )
  const nextSet = new Set(next)
  const missing = closure.find((id) => !nextSet.has(id))
  if (missing !== undefined) {
    return rejectedPreview(
      current,
      'exclusive-conflict',
      `Skill '${missing}' conflicts with the current preset queue.`,
    )
  }
  const currentSet = new Set(current)
  const affected = closure.filter((id) => !currentSet.has(id))
  return Object.freeze({
    accepted: true,
    changed: affected.length > 0,
    code: affected.length > 0 ? 'added' : 'unchanged',
    affectedSkillIds: Object.freeze(affected),
    nextSkillIds: Object.freeze(next),
  })
}

/**
 * Previews removing one skill and every queued skill that directly or
 * transitively depends upon it. No game state is changed.
 */
export function previewRemoveSkillFromPreset(
  state: CanonicalSkillPresetQueueSource,
  slot: CanonicalSkillPresetSlot,
  skillId: string,
): CanonicalSkillPresetQueuePreview {
  const current = state.skills.presets[slot - 1].skillIds
  const definitions = loadQueueDefinitions()
  if (!definitions.has(skillId)) {
    return rejectedPreview(
      current,
      'unknown-skill',
      `Unknown skill '${skillId}'.`,
    )
  }
  const queued = new Set(current)
  const remove = new Set<string>()
  if (queued.has(skillId)) remove.add(skillId)
  let expanded: boolean
  do {
    expanded = false
    for (const id of current) {
      if (remove.has(id)) continue
      const definition = definitions.get(id)
      if (definition === undefined) continue
      if (
        [...definition.required, ...definition.shadowRequired].some(
          (dependency) => remove.has(dependency),
        )
      ) {
        remove.add(id)
        expanded = true
      }
    }
  } while (expanded)

  const affected = current.filter((id) => remove.has(id))
  const next = normalizeSkillAssignment(
    current.filter((id) => !remove.has(id)),
    definitions,
  )
  return Object.freeze({
    accepted: true,
    changed: affected.length > 0,
    code: affected.length > 0 ? 'removed' : 'unchanged',
    affectedSkillIds: Object.freeze(affected),
    nextSkillIds: Object.freeze(next),
  })
}

/**
 * Serializes the Unity-compatible version-one preset exchange payload.
 */
export function serializeCanonicalSkillPreset(
  preset: Readonly<SkillPresetState>,
): string {
  return JSON.stringify({
    version: PRESET_FORMAT_VERSION,
    presetName: preset.name,
    botDistribution: preset.botDistribution,
    skillIds: [...preset.skillIds],
    colorId: preset.colorId,
  } satisfies CanonicalSkillPresetPayloadV1)
}

/**
 * Parses and validates a Unity-compatible version-one preset payload. Import
 * is all-or-nothing: malformed values, unknown skills, and exclusive
 * conflicts reject before any canonical state can be changed.
 */
export function parseCanonicalSkillPreset(
  serialized: string,
  state?: Readonly<SkillUnlockState>,
): CanonicalSkillPresetImportResult {
  let value: unknown
  try {
    value = JSON.parse(serialized)
  } catch {
    return rejectedImport('invalid-json', 'Preset data is not valid JSON.')
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return rejectedImport(
      'invalid-payload',
      'Preset data must be a JSON object.',
    )
  }
  const source = value as Record<string, unknown>
  const botDistribution =
    typeof source.botDistribution === 'number'
      ? normalizeCanonicalBotDistribution(source.botDistribution)
      : null
  if (source.version !== PRESET_FORMAT_VERSION) {
    return rejectedImport(
      'unsupported-version',
      `Preset version '${String(source.version)}' is not supported.`,
    )
  }
  if (
    typeof source.presetName !== 'string' ||
    botDistribution === null ||
    !Array.isArray(source.skillIds) ||
    !source.skillIds.every((id) => typeof id === 'string') ||
    (source.colorId !== undefined &&
      !isSkillPresetColorId(source.colorId))
  ) {
    return rejectedImport(
      'invalid-payload',
      'Preset name, bot distribution, or skill IDs are invalid.',
    )
  }

  const definitions = loadQueueDefinitions()
  const unique = stableUnique(source.skillIds)
  const unknown = unique.find((id) => !definitions.has(id))
  if (unknown !== undefined) {
    return rejectedImport(
      'unknown-skill',
      `Preset contains unknown skill '${unknown}'.`,
    )
  }
  const skillIds = normalizeSkillAssignment(unique, definitions)
  if (skillIds.length !== unique.length) {
    return rejectedImport(
      'exclusive-conflict',
      'Preset contains mutually exclusive skills.',
    )
  }
  return Object.freeze({
    accepted: true,
    ...(state === undefined
      ? {}
      : { blockedSkillIds: Object.freeze(
          skillIds.filter(
            (id) => !isQueueSkillUnlocked(definitions.get(id)!, state),
          ),
        ) }),
    payload: Object.freeze({
      version: PRESET_FORMAT_VERSION,
      presetName: source.presetName,
      botDistribution,
      skillIds: Object.freeze(skillIds),
      ...(isSkillPresetColorId(source.colorId)
        ? { colorId: source.colorId }
        : {}),
    }),
  })
}

/**
 * Replaces one stored preset without affecting the currently active queue.
 */
export function replaceCanonicalSkillPreset(
  state: CanonicalGameStateV1,
  slot: CanonicalSkillPresetSlot,
  preset: Readonly<SkillPresetState>,
): CanonicalGameStateV1 {
  const current = state.skills.presets[slot - 1]
  if (
    current.name === preset.name &&
    current.botDistribution === preset.botDistribution &&
    current.colorId === preset.colorId &&
    current.skillIds.length === preset.skillIds.length &&
    current.skillIds.every(
      (id, index) => id === preset.skillIds[index],
    )
  ) {
    return state
  }
  const presets = [...state.skills.presets]
  presets[slot - 1] = {
    name: preset.name,
    botDistribution: preset.botDistribution,
    skillIds: [...preset.skillIds],
    colorId: preset.colorId,
  }
  return {
    ...state,
    skills: {
      ...state.skills,
      presets:
        presets as unknown as CanonicalGameStateV1['skills']['presets'],
    },
  }
}

/**
 * Preserves Unity's low-level queue normalization for legacy setter commands:
 * stable de-duplication, dependency ordering for selected entries, and
 * first-entry-wins exclusive filtering.
 */
export function normalizeSkillAssignment(
  source: readonly string[],
  providedDefinitions?: ReadonlyMap<string, SkillQueueDefinition>,
): readonly string[] {
  if (source.length <= 1) return [...source]
  const orderedInput = stableUnique(source)
  if (orderedInput.length <= 1) return orderedInput
  const definitions = providedDefinitions ?? loadQueueDefinitions()
  const selected = new Set(orderedInput)
  const indegree = new Map(orderedInput.map((id) => [id, 0]))
  const adjacency = new Map(
    orderedInput.map((id) => [id, [] as string[]]),
  )
  for (const id of orderedInput) {
    const definition = definitions.get(id)
    if (definition === undefined) continue
    for (const dependency of [
      ...definition.required,
      ...definition.shadowRequired,
    ]) {
      if (!selected.has(dependency)) continue
      adjacency.get(dependency)!.push(id)
      indegree.set(id, indegree.get(id)! + 1)
    }
  }

  const remaining = new Set(orderedInput)
  const topological: string[] = []
  while (remaining.size > 0) {
    let progressed = false
    for (const id of orderedInput) {
      if (!remaining.has(id) || indegree.get(id) !== 0) continue
      remaining.delete(id)
      topological.push(id)
      for (const neighbor of adjacency.get(id)!) {
        indegree.set(neighbor, indegree.get(neighbor)! - 1)
      }
      progressed = true
    }
    if (progressed) continue
    for (const id of orderedInput) {
      if (remaining.has(id)) topological.push(id)
    }
    break
  }

  const accepted: string[] = []
  const acceptedSet = new Set<string>()
  for (const id of topological) {
    const definition = definitions.get(id)
    if (
      definition !== undefined &&
      definition.exclusiveWith.some((exclusive) =>
        acceptedSet.has(exclusive),
      )
    ) {
      continue
    }
    accepted.push(id)
    acceptedSet.add(id)
  }
  return accepted
}

function loadQueueDefinitions(): ReadonlyMap<string, SkillQueueDefinition> {
  return new Map(
    getGameAssetsByKind(SKILL_KIND).map((asset) => [
      asset.id,
      Object.freeze({
        required: stringArray(asset.data.requiredSkillIds),
        shadowRequired: stringArray(
          asset.data.shadowRequirementIds,
        ),
        exclusiveWith: stringArray(asset.data.exclusiveWithIds),
        unlock: queueSkillUnlock(asset.data),
      }),
    ]),
  )
}

function queueSkillUnlock(
  data: Readonly<Record<string, unknown>>,
): SkillQueueDefinition['unlock'] {
  for (const [field, unlock] of [
    ['firstRunBlocked', 'first-infinity'],
    ['isFragment', 'fragments'],
    ['purityLine', 'purity'],
    ['terraLine', 'terra'],
    ['powerLine', 'power'],
    ['paragadeLine', 'paragade'],
    ['stellarLine', 'stellar'],
  ] as const) {
    if (data[field] === true || data[field] === 1) return unlock
  }
  return 'always'
}

function isQueueSkillUnlocked(
  definition: Readonly<SkillQueueDefinition>,
  state: Readonly<SkillUnlockState>,
): boolean {
  switch (definition.unlock) {
    case 'always':
      return true
    case 'first-infinity':
      return state.meta.firstInfinityComplete
    case 'fragments':
      return state.quantum.unlocks.fragments
    case 'purity':
      return state.quantum.unlocks.purity
    case 'terra':
      return state.quantum.unlocks.terra
    case 'power':
      return state.quantum.unlocks.power
    case 'paragade':
      return state.quantum.unlocks.paragade
    case 'stellar':
      return state.quantum.unlocks.stellar
  }
}

function rejectedPreview(
  current: readonly string[],
  code: Extract<
    CanonicalSkillPresetQueuePreview,
    { accepted: false }
  >['code'],
  reason: string,
): CanonicalSkillPresetQueuePreview {
  return Object.freeze({
    accepted: false,
    changed: false,
    code,
    reason,
    affectedSkillIds: Object.freeze([] as []),
    nextSkillIds: Object.freeze([...current]),
  })
}

function rejectedImport(
  code: Extract<
    CanonicalSkillPresetImportResult,
    { accepted: false }
  >['code'],
  reason: string,
): CanonicalSkillPresetImportResult {
  return Object.freeze({ accepted: false, code, reason })
}

function stableUnique(source: readonly string[]): string[] {
  const result: string[] = []
  const seen = new Set<string>()
  for (const id of source) {
    if (id.length === 0 || seen.has(id)) continue
    seen.add(id)
    result.push(id)
  }
  return result
}

function stringArray(value: unknown): readonly string[] {
  return Array.isArray(value)
    ? value.filter(
        (entry): entry is string => typeof entry === 'string',
      )
    : []
}
