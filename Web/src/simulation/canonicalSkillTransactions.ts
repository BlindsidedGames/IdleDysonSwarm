import { getGameAssetsByKind } from '../game-data/catalog'
import type { ExportedGameAsset } from '../game-data/types'
import type {
  CanonicalGameStateV1,
  SkillRuntimeState,
} from '../game-state/types'

const SKILL_KIND = 'GameData.SkillDefinition'

interface SkillDefinition {
  readonly id: string
  readonly cost: bigint
  readonly refundable: boolean
  readonly fragment: boolean
  readonly required: readonly string[]
  readonly shadowRequired: readonly string[]
  readonly exclusiveWith: readonly string[]
  readonly unrefundableWith: readonly string[]
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

export type CanonicalSkillTransactionResult =
  | {
      readonly accepted: true
      readonly changed: boolean
      readonly state: CanonicalGameStateV1
      readonly affectedSkillIds: readonly string[]
    }
  | {
      readonly accepted: false
      readonly code: string
      readonly reason: string
      readonly state: CanonicalGameStateV1
    }

export interface CanonicalSkillActionPreview {
  readonly eligible: boolean
  readonly code: string
  readonly affectedSkillIds: readonly string[]
}

export interface CanonicalSkillAvailabilityPreview {
  readonly skillId: string
  readonly cost: bigint
  readonly owned: boolean
  readonly fragment: boolean
  readonly intrinsicallyRefundable: boolean
  readonly requiredSkillIds: readonly string[]
  readonly shadowRequiredSkillIds: readonly string[]
  readonly exclusiveWithSkillIds: readonly string[]
  readonly purchase: CanonicalSkillActionPreview
  readonly refund: CanonicalSkillActionPreview & {
    readonly pointsReturned: bigint
    readonly fragmentsRemoved: bigint
  }
}

export interface CanonicalSkillCatalogPreview {
  readonly complete: boolean
  readonly definitionGap: string | null
  readonly skills: readonly CanonicalSkillAvailabilityPreview[]
}

/**
 * Projects the exact authored skill catalog and current-state purchase/refund
 * eligibility without changing the source. Both actions execute through the
 * same internal transactions used by command routing.
 */
export function previewCanonicalSkillCatalog(
  state: CanonicalGameStateV1,
): CanonicalSkillCatalogPreview {
  let definitions: ReadonlyMap<string, SkillDefinition>
  try {
    definitions = loadDefinitions()
  } catch (error) {
    return Object.freeze({
      complete: false,
      definitionGap:
        error instanceof Error ? error.message : String(error),
      skills: Object.freeze([]),
    })
  }

  const skills = [...definitions.values()].map((definition) => {
    const purchase = purchaseWithDefinitions(
      state,
      definition.id,
      definitions,
    )
    const refund = refundWithDefinitions(
      state,
      definition.id,
      definitions,
    )
    const purchaseAffected =
      purchase.accepted && purchase.changed
        ? purchase.affectedSkillIds
        : []
    const refundAffected =
      refund.accepted && refund.changed
        ? refund.affectedSkillIds
        : []
    const purchaseCode =
      purchase.accepted
        ? purchase.changed
          ? 'purchasable'
          : 'already-owned'
        : purchase.code
    const refundCode =
      refund.accepted
        ? refund.changed
          ? 'refundable'
          : 'not-owned'
        : refund.code
    const pointsReturned =
      refund.accepted && refund.changed
        ? refund.state.skills.points - state.skills.points
        : 0n
    const fragmentsRemoved =
      refund.accepted && refund.changed
        ? state.skills.fragments - refund.state.skills.fragments
        : 0n

    return Object.freeze({
      skillId: definition.id,
      cost: definition.cost,
      owned: state.skills.byId[definition.id]?.owned === true,
      fragment: definition.fragment,
      intrinsicallyRefundable: definition.refundable,
      requiredSkillIds: Object.freeze([...definition.required]),
      shadowRequiredSkillIds: Object.freeze([
        ...definition.shadowRequired,
      ]),
      exclusiveWithSkillIds: Object.freeze([
        ...definition.exclusiveWith,
      ]),
      purchase: Object.freeze({
        eligible: purchase.accepted && purchase.changed,
        code: purchaseCode,
        affectedSkillIds: Object.freeze([...purchaseAffected]),
      }),
      refund: Object.freeze({
        eligible: refund.accepted && refund.changed,
        code: refundCode,
        affectedSkillIds: Object.freeze([...refundAffected]),
        pointsReturned,
        fragmentsRemoved,
      }),
    })
  })
  return Object.freeze({
    complete: true,
    definitionGap: null,
    skills: Object.freeze(skills),
  })
}

/**
 * Purchases one authored skill after applying the same visibility,
 * prerequisite, exclusivity, point, and fragment rules as the Unity tree.
 */
export function purchaseCanonicalSkill(
  state: CanonicalGameStateV1,
  skillId: string,
): CanonicalSkillTransactionResult {
  let definitions: ReadonlyMap<string, SkillDefinition>
  try {
    definitions = loadDefinitions()
  } catch (error) {
    return rejected(
      state,
      'SKILL-DEFINITION-GAP',
      error instanceof Error ? error.message : String(error),
    )
  }
  return purchaseWithDefinitions(state, skillId, definitions)
}

function purchaseWithDefinitions(
  state: CanonicalGameStateV1,
  skillId: string,
  definitions: ReadonlyMap<string, SkillDefinition>,
): CanonicalSkillTransactionResult {
  const definition = definitions.get(skillId)
  if (definition === undefined) {
    return rejected(state, 'SKILL-UNKNOWN', `Unknown skill '${skillId}'.`)
  }
  if (state.skills.byId[skillId]?.owned === true) {
    return accepted(state, false, [])
  }
  if (!isUnlocked(definition, state)) {
    return rejected(state, 'SKILL-LOCKED', `Skill '${skillId}' is locked.`)
  }
  if (!requirementsMet(definition.required, state.skills.byId)) {
    return rejected(
      state,
      'SKILL-REQUIREMENT',
      `Skill '${skillId}' has an unmet required skill.`,
    )
  }
  if (!requirementsMet(definition.shadowRequired, state.skills.byId)) {
    return rejected(
      state,
      'SKILL-SHADOW-REQUIREMENT',
      `Skill '${skillId}' has an unmet shadow requirement.`,
    )
  }
  if (hasOwned(definition.exclusiveWith, state.skills.byId)) {
    return rejected(
      state,
      'SKILL-EXCLUSIVE',
      `Skill '${skillId}' conflicts with an owned skill.`,
    )
  }
  if (state.skills.points < definition.cost) {
    return rejected(
      state,
      'SKILL-INSUFFICIENT-POINTS',
      `Skill '${skillId}' costs ${definition.cost} skill points.`,
    )
  }

  const runtime = state.skills.byId[skillId] ?? emptyRuntime()
  const byId = {
    ...state.skills.byId,
    [skillId]: { ...runtime, owned: true },
  }
  return accepted(
    {
      ...state,
      skills: {
        ...state.skills,
        points: state.skills.points - definition.cost,
        fragments:
          state.skills.fragments + (definition.fragment ? 1n : 0n),
        byId,
        activeAutoAssignment: appendUnique(
          state.skills.activeAutoAssignment,
          skillId,
        ),
      },
    },
    true,
    [skillId],
  )
}

/**
 * Refunds an owned skill and every owned required-skill descendant, matching
 * Unity's recursive cascade. Intrinsic and dynamically locked skills reject
 * the entire transaction before any state is changed.
 */
export function refundCanonicalSkill(
  state: CanonicalGameStateV1,
  skillId: string,
): CanonicalSkillTransactionResult {
  let definitions: ReadonlyMap<string, SkillDefinition>
  try {
    definitions = loadDefinitions()
  } catch (error) {
    return rejected(
      state,
      'SKILL-DEFINITION-GAP',
      error instanceof Error ? error.message : String(error),
    )
  }
  return refundWithDefinitions(state, skillId, definitions)
}

function refundWithDefinitions(
  state: CanonicalGameStateV1,
  skillId: string,
  definitions: ReadonlyMap<string, SkillDefinition>,
): CanonicalSkillTransactionResult {
  const definition = definitions.get(skillId)
  if (definition === undefined) {
    return rejected(state, 'SKILL-UNKNOWN', `Unknown skill '${skillId}'.`)
  }
  if (state.skills.byId[skillId]?.owned !== true) {
    return accepted(state, false, [])
  }

  const descendants = dependentIds(
    skillId,
    definitions,
    state.skills.byId,
    true,
  )
  const affected = [...descendants, skillId]
  for (const id of affected) {
    const candidate = definitions.get(id)
    if (
      candidate === undefined ||
      !isRefundable(candidate, state.skills.byId)
    ) {
      return rejected(
        state,
        'SKILL-NOT-REFUNDABLE',
        `Skill '${id}' prevents refunding '${skillId}'.`,
      )
    }
  }

  let points = state.skills.points
  let fragments = state.skills.fragments
  const byId = { ...state.skills.byId }
  for (const id of affected) {
    const candidate = definitions.get(id)!
    const runtime = byId[id] ?? emptyRuntime()
    if (!runtime.owned) continue
    byId[id] = { ...runtime, owned: false }
    points += candidate.cost
    if (candidate.fragment && fragments > 0n) fragments -= 1n
  }

  const allDescendants = dependentIds(
    skillId,
    definitions,
    state.skills.byId,
    false,
  )
  const removeFromQueues = new Set([...allDescendants, skillId])
  return accepted(
    {
      ...state,
      skills: {
        ...state.skills,
        points,
        fragments,
        byId,
        activeAutoAssignment: state.skills.activeAutoAssignment.filter(
          (id) => !removeFromQueues.has(id),
        ),
        presets: mapSelectedPresetQueues(
          state.skills.presets,
          removeFromQueues,
        ),
      },
    },
    true,
    affected,
  )
}

/**
 * Refunds every currently refundable skill in authored database order and
 * clears the live auto-assignment queue, matching Unity ResetSkills.
 */
export function resetCanonicalSkills(
  state: CanonicalGameStateV1,
): CanonicalSkillTransactionResult {
  const definitions = loadDefinitions()
  let points = state.skills.points
  let fragments = state.skills.fragments
  let changed = false
  const affected: string[] = []
  const byId = { ...state.skills.byId }
  for (const definition of definitions.values()) {
    const runtime = byId[definition.id]
    if (
      runtime?.owned !== true ||
      !isRefundable(definition, state.skills.byId)
    ) {
      continue
    }
    byId[definition.id] = { ...runtime, owned: false }
    points += definition.cost
    if (definition.fragment && fragments > 0n) fragments -= 1n
    affected.push(definition.id)
    changed = true
  }
  if (state.skills.activeAutoAssignment.length > 0) changed = true
  if (!changed) return accepted(state, false, [])
  return accepted(
    {
      ...state,
      skills: {
        ...state.skills,
        points,
        fragments,
        byId,
        activeAutoAssignment: [],
      },
    },
    true,
    affected,
  )
}

/**
 * Executes Unity's skip-blocked, multi-pass auto-assignment queue.
 */
export function runCanonicalSkillAutoAssignment(
  state: CanonicalGameStateV1,
): CanonicalSkillTransactionResult {
  const definitions = loadDefinitions()
  if (
    state.skills.activeAutoAssignment.length === 0 ||
    state.skills.points <= 0n
  ) {
    return accepted(state, false, [])
  }
  let points = state.skills.points
  let fragments = state.skills.fragments
  const byId = { ...state.skills.byId }
  const affected: string[] = []
  let passesRemaining = state.skills.activeAutoAssignment.length
  let assignedAny: boolean

  do {
    assignedAny = false
    for (const id of state.skills.activeAutoAssignment) {
      const definition = definitions.get(id)
      if (
        definition === undefined ||
        byId[id]?.owned === true ||
        points < definition.cost ||
        !isUnlocked(definition, state) ||
        !requirementsMet(definition.required, byId) ||
        !requirementsMet(definition.shadowRequired, byId) ||
        hasOwned(definition.exclusiveWith, byId) ||
        (!state.skills.autoAssignNonRefundable && !definition.refundable)
      ) {
        continue
      }
      points -= definition.cost
      fragments += definition.fragment ? 1n : 0n
      byId[id] = { ...(byId[id] ?? emptyRuntime()), owned: true }
      affected.push(id)
      assignedAny = true
      if (points <= 0n) break
    }
    passesRemaining -= 1
  } while (assignedAny && points > 0n && passesRemaining > 0)

  if (affected.length === 0) return accepted(state, false, [])
  return accepted(
    {
      ...state,
      skills: {
        ...state.skills,
        points,
        fragments,
        byId,
      },
    },
    true,
    affected,
  )
}

function loadDefinitions(): ReadonlyMap<string, SkillDefinition> {
  return new Map(
    getGameAssetsByKind(SKILL_KIND).map((asset) => {
      const definition = parseDefinition(asset)
      return [definition.id, definition]
    }),
  )
}

function parseDefinition(asset: ExportedGameAsset): SkillDefinition {
  const data = asset.data
  return {
    id: asset.id,
    cost: BigInt(requireNonNegativeInteger(data.cost, asset, 'cost')),
    refundable: requireBoolean(data.refundable, asset, 'refundable'),
    fragment: requireBoolean(data.isFragment, asset, 'isFragment'),
    required: requireStringArray(data.requiredSkillIds, asset),
    shadowRequired: requireStringArray(
      data.shadowRequirementIds,
      asset,
    ),
    exclusiveWith: requireStringArray(data.exclusiveWithIds, asset),
    unrefundableWith: requireStringArray(
      data.unrefundableWithIds,
      asset,
    ),
    unlock: resolveUnlock(data, asset),
  }
}

function resolveUnlock(
  data: Readonly<Record<string, unknown>>,
  asset: ExportedGameAsset,
): SkillDefinition['unlock'] {
  const candidates: readonly [
    keyof typeof data,
    Exclude<SkillDefinition['unlock'], 'always'>,
  ][] = [
    ['firstRunBlocked', 'first-infinity'],
    ['isFragment', 'fragments'],
    ['purityLine', 'purity'],
    ['terraLine', 'terra'],
    ['powerLine', 'power'],
    ['paragadeLine', 'paragade'],
    ['stellarLine', 'stellar'],
  ]
  for (const [field, unlock] of candidates) {
    if (requireBoolean(data[field], asset, String(field))) return unlock
  }
  return 'always'
}

function isUnlocked(
  definition: SkillDefinition,
  state: CanonicalGameStateV1,
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

function isRefundable(
  definition: SkillDefinition,
  byId: Readonly<Record<string, SkillRuntimeState>>,
): boolean {
  return (
    definition.refundable &&
    !hasOwned(definition.unrefundableWith, byId)
  )
}

function dependentIds(
  rootId: string,
  definitions: ReadonlyMap<string, SkillDefinition>,
  byId: Readonly<Record<string, SkillRuntimeState>>,
  ownedOnly: boolean,
): string[] {
  const result: string[] = []
  const visited = new Set([rootId])
  const queue = [rootId]
  while (queue.length > 0) {
    const current = queue.shift()!
    for (const definition of definitions.values()) {
      if (
        visited.has(definition.id) ||
        (ownedOnly && byId[definition.id]?.owned !== true) ||
        !definition.required.includes(current)
      ) {
        continue
      }
      visited.add(definition.id)
      result.push(definition.id)
      queue.push(definition.id)
    }
  }
  return result
}

function requirementsMet(
  ids: readonly string[],
  byId: Readonly<Record<string, SkillRuntimeState>>,
): boolean {
  return ids.every((id) => byId[id]?.owned === true)
}

function hasOwned(
  ids: readonly string[],
  byId: Readonly<Record<string, SkillRuntimeState>>,
): boolean {
  return ids.some((id) => byId[id]?.owned === true)
}

function emptyRuntime(): SkillRuntimeState {
  return {
    owned: false,
    level: 0,
    timerSeconds: 0,
    secondaryTimerSeconds: 0,
  }
}

function appendUnique(ids: readonly string[], id: string): readonly string[] {
  return ids.includes(id) ? ids : [...ids, id]
}

function mapSelectedPresetQueues(
  presets: CanonicalGameStateV1['skills']['presets'],
  remove: ReadonlySet<string>,
): CanonicalGameStateV1['skills']['presets'] {
  return presets.map((preset) => ({
    ...preset,
    skillIds: preset.skillIds.filter((id) => !remove.has(id)),
  })) as unknown as CanonicalGameStateV1['skills']['presets']
}

function requireNonNegativeInteger(
  value: unknown,
  asset: ExportedGameAsset,
  field: string,
): number {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) {
    return value
  }
  throw invalidDefinition(asset, field)
}

function requireBoolean(
  value: unknown,
  asset: ExportedGameAsset,
  field: string,
): boolean {
  if (value === true || value === 1) return true
  if (value === false || value === 0) return false
  throw invalidDefinition(asset, field)
}

function requireStringArray(
  value: unknown,
  asset: ExportedGameAsset,
): readonly string[] {
  if (
    Array.isArray(value) &&
    value.every((entry) => typeof entry === 'string')
  ) {
    return value
  }
  throw invalidDefinition(asset, 'string array')
}

function invalidDefinition(
  asset: ExportedGameAsset,
  field: string,
): Error {
  return new Error(
    `Skill definition '${asset.id}' has invalid exported '${field}'.`,
  )
}

function accepted(
  state: CanonicalGameStateV1,
  changed: boolean,
  affectedSkillIds: readonly string[],
): CanonicalSkillTransactionResult {
  return { accepted: true, changed, state, affectedSkillIds }
}

function rejected(
  state: CanonicalGameStateV1,
  code: string,
  reason: string,
): CanonicalSkillTransactionResult {
  return { accepted: false, code, reason, state }
}
