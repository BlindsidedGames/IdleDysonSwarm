import type {
  CanonicalGameStateV2,
  SkillRuntimeStateV2,
} from '../game-state/typesV2'
import type { CanonicalSkillPresetSlot } from '../game-state/types'
import { validateCanonicalGameStateV2 } from '../game-state/validateV2'
import {
  CANONICAL_ACTIVE_SKILL_TIMER_IDS_V2,
  canonicalSkillCatalogV2,
  type CanonicalSkillCatalogV2,
  type CanonicalSkillDefinitionV2,
} from './skillCatalogV2'

export type CanonicalSkillTransactionCodeV2 =
  | 'purchased'
  | 'refunded'
  | 'reset'
  | 'auto-assigned'
  | 'timers-advanced'
  | 'unchanged'
  | 'invalid-state'
  | 'unknown-skill'
  | 'locked'
  | 'requirement-cycle'
  | 'exclusive-conflict'
  | 'insufficient-points'
  | 'not-refundable'
  | 'timer-overflow'

export type CanonicalSkillTransactionResultV2 =
  | {
      readonly accepted: true
      readonly changed: boolean
      readonly code: CanonicalSkillTransactionCodeV2
      readonly state: Readonly<CanonicalGameStateV2>
      readonly affectedSkillIds: readonly string[]
    }
  | {
      readonly accepted: false
      readonly changed: false
      readonly code: CanonicalSkillTransactionCodeV2
      readonly reason: string
      readonly state: Readonly<CanonicalGameStateV2>
      readonly affectedSkillIds: readonly []
    }

export type CanonicalSkillPresetPreviewV2 =
  | {
      readonly accepted: true
      readonly changed: boolean
      readonly affectedSkillIds: readonly string[]
      readonly nextSkillIds: readonly string[]
    }
  | {
      readonly accepted: false
      readonly changed: false
      readonly reason: string
      readonly affectedSkillIds: readonly []
      readonly nextSkillIds: readonly string[]
    }

interface PurchasePlanV2 {
  readonly accepted: boolean
  readonly code: CanonicalSkillTransactionCodeV2
  readonly reason: string
  readonly affectedSkillIds: readonly string[]
  readonly pointsRequired: bigint
}

/**
 * Purchases the target and every missing required/shadow-required ancestor as
 * one exact-bigint transaction. Unlock and bidirectional exclusivity checks
 * apply to every member of the closure before any state is changed.
 */
export function purchaseCanonicalSkillV2(
  state: Readonly<CanonicalGameStateV2>,
  skillId: string,
): CanonicalSkillTransactionResultV2 {
  const catalog = canonicalSkillCatalogV2
  const invalid = invalidState(state)
  if (invalid !== null) return invalid
  const plan = planPurchase(state, skillId, catalog)
  if (!plan.accepted) return rejected(state, plan.code, plan.reason)
  if (plan.affectedSkillIds.length === 0) return accepted(state, false, 'unchanged', [])

  const byId = { ...state.skills.byId }
  let queue = [...state.skills.activeAutoAssignment]
  for (const id of plan.affectedSkillIds) {
    byId[id] = setSkillOwned(byId[id]!, true)
    if (!queue.includes(id)) queue.push(id)
  }
  return accepted(
    skillCandidate(state, {
      points: state.skills.points - plan.pointsRequired,
      byId,
      activeAutoAssignment: queue,
    }, catalog),
    true,
    'purchased',
    plan.affectedSkillIds,
  )
}

/**
 * Refunds an owned Skill and all owned required or shadow-required descendants.
 * Intrinsic/dynamic non-refundable ownership rejects the complete cascade.
 */
export function refundCanonicalSkillV2(
  state: Readonly<CanonicalGameStateV2>,
  skillId: string,
): CanonicalSkillTransactionResultV2 {
  const catalog = canonicalSkillCatalogV2
  const invalid = invalidState(state)
  if (invalid !== null) return invalid
  const definition = catalog.byId[skillId]
  if (definition === undefined) return rejected(state, 'unknown-skill', `Unknown Skill '${skillId}'.`)
  if (!state.skills.byId[skillId]!.owned) return accepted(state, false, 'unchanged', [])

  const descendants = dependentIds(skillId, catalog, state.skills.byId, true)
  const affected = [...descendants, skillId]
  for (const id of affected) {
    if (!isRefundable(catalog.byId[id]!, state.skills.byId)) {
      return rejected(state, 'not-refundable', `Skill '${id}' prevents refunding '${skillId}'.`)
    }
  }

  const byId = { ...state.skills.byId }
  let points = state.skills.points
  for (const id of affected) {
    if (!byId[id]!.owned) continue
    points += catalog.byId[id]!.cost
    byId[id] = setSkillOwned(byId[id]!, false)
  }
  const remove = new Set([...dependentIds(skillId, catalog, state.skills.byId, false), skillId])
  return accepted(
    skillCandidate(state, {
      points,
      byId,
      activeAutoAssignment: state.skills.activeAutoAssignment.filter((id) => !remove.has(id)),
      presets: mapPresetQueues(state.skills.presets, remove),
    }, catalog),
    true,
    'refunded',
    affected,
  )
}

/** Unity-compatible manual Skill reset: locked Skills survive, refundable ones
 * return their exact costs, and the live auto-assignment queue is cleared. */
export function resetCanonicalSkillsV2(
  state: Readonly<CanonicalGameStateV2>,
): CanonicalSkillTransactionResultV2 {
  const catalog = canonicalSkillCatalogV2
  const invalid = invalidState(state)
  if (invalid !== null) return invalid
  const byId = { ...state.skills.byId }
  let points = state.skills.points
  const affected: string[] = []
  for (const id of catalog.skillIds) {
    const definition = catalog.byId[id]!
    if (!byId[id]!.owned || !isRefundable(definition, state.skills.byId)) continue
    points += definition.cost
    byId[id] = setSkillOwned(byId[id]!, false)
    affected.push(id)
  }
  const changed = affected.length > 0 || state.skills.activeAutoAssignment.length > 0
  if (!changed) return accepted(state, false, 'unchanged', [])
  return accepted(
    skillCandidate(state, { points, byId, activeAutoAssignment: [] }, catalog),
    true,
    'reset',
    affected,
  )
}

/** Skip-blocked, bounded multipass auto-assignment shared by goal, shop, and
 * later Infinity reset owners. Unknown/locked queue entries fail closed. */
export function runCanonicalSkillAutoAssignmentV2(
  state: Readonly<CanonicalGameStateV2>,
): CanonicalSkillTransactionResultV2 {
  const catalog = canonicalSkillCatalogV2
  const invalid = invalidState(state)
  if (invalid !== null) return invalid
  for (const id of state.skills.activeAutoAssignment) {
    const definition = catalog.byId[id]
    if (definition === undefined) return rejected(state, 'unknown-skill', `Unknown queued Skill '${id}'.`)
  }
  if (state.skills.activeAutoAssignment.length === 0 || state.skills.points <= 0n) {
    return accepted(state, false, 'unchanged', [])
  }

  const byId = { ...state.skills.byId }
  let points = state.skills.points
  const affected: string[] = []
  let passes = state.skills.activeAutoAssignment.length
  let assigned: boolean
  do {
    assigned = false
    for (const id of state.skills.activeAutoAssignment) {
      const definition = catalog.byId[id]!
      if (
        byId[id]!.owned ||
        points < definition.cost ||
        !isUnlocked(definition, state) ||
        !requirementsMet(definition, byId) ||
        conflictsWithOwned(definition, byId, catalog) ||
        (!state.skills.autoAssignNonRefundable && !definition.refundable)
      ) continue
      points -= definition.cost
      byId[id] = setSkillOwned(byId[id]!, true)
      affected.push(id)
      assigned = true
      if (points <= 0n) break
    }
    passes -= 1
  } while (assigned && points > 0n && passes > 0)
  if (affected.length === 0) return accepted(state, false, 'unchanged', [])
  return accepted(
    skillCandidate(state, { points, byId }, catalog),
    true,
    'auto-assigned',
    affected,
  )
}

/** Adds a dependency-complete Skill closure to one preset without mutation. */
export function previewAddCanonicalSkillToPresetV2(
  state: Readonly<CanonicalGameStateV2>,
  slot: CanonicalSkillPresetSlot,
  skillId: string,
): CanonicalSkillPresetPreviewV2 {
  const catalog = canonicalSkillCatalogV2
  const boundaryFailure = validatePresetBoundary(state, slot, skillId)
  if (boundaryFailure !== null) return boundaryFailure
  const current = state.skills.presets[slot - 1].skillIds
  if (catalog.byId[skillId] === undefined) return rejectedPreset(current, `Unknown Skill '${skillId}'.`)
  const closure: string[] = []
  const visited = new Set<string>()
  const visiting = new Set<string>()
  const visit = (id: string): boolean => {
    if (visited.has(id)) return true
    if (visiting.has(id)) return false
    const definition = catalog.byId[id]
    if (definition === undefined) return false
    visiting.add(id)
    for (const dependency of [...definition.required, ...definition.shadowRequired]) {
      if (!visit(dependency)) return false
    }
    visiting.delete(id)
    visited.add(id)
    closure.push(id)
    return true
  }
  if (!visit(skillId)) return rejectedPreset(current, `Skill '${skillId}' has an invalid dependency closure.`)
  const normalized = normalizePresetIds([...current, ...closure], catalog)
  const normalizedSet = new Set(normalized)
  const blocked = closure.find((id) => !normalizedSet.has(id))
  if (blocked !== undefined) return rejectedPreset(current, `Skill '${blocked}' conflicts with the preset queue.`)
  const currentSet = new Set(current)
  const affected = closure.filter((id) => !currentSet.has(id))
  return Object.freeze({
    accepted: true,
    changed: affected.length > 0,
    affectedSkillIds: Object.freeze(affected),
    nextSkillIds: Object.freeze(normalized),
  })
}

/** Removes a Skill and all queued required/shadow-required descendants. */
export function previewRemoveCanonicalSkillFromPresetV2(
  state: Readonly<CanonicalGameStateV2>,
  slot: CanonicalSkillPresetSlot,
  skillId: string,
): CanonicalSkillPresetPreviewV2 {
  const catalog = canonicalSkillCatalogV2
  const boundaryFailure = validatePresetBoundary(state, slot, skillId)
  if (boundaryFailure !== null) return boundaryFailure
  const current = state.skills.presets[slot - 1].skillIds
  if (catalog.byId[skillId] === undefined) return rejectedPreset(current, `Unknown Skill '${skillId}'.`)
  const remove = new Set(current.includes(skillId) ? [skillId] : [])
  let expanded: boolean
  do {
    expanded = false
    for (const id of current) {
      if (remove.has(id)) continue
      const definition = catalog.byId[id]
      if (definition !== undefined && [...definition.required, ...definition.shadowRequired].some((dependency) => remove.has(dependency))) {
        remove.add(id)
        expanded = true
      }
    }
  } while (expanded)
  const affected = current.filter((id) => remove.has(id))
  const next = normalizePresetIds(current.filter((id) => !remove.has(id)), catalog)
  return Object.freeze({
    accepted: true,
    changed: affected.length > 0,
    affectedSkillIds: Object.freeze(affected),
    nextSkillIds: Object.freeze(next),
  })
}

/** Advances only the three active production-owned timers in constant work. */
export function advanceCanonicalSkillTimersV2(
  state: Readonly<CanonicalGameStateV2>,
  seconds: number,
): CanonicalSkillTransactionResultV2 {
  const invalid = invalidState(state)
  if (invalid !== null) return invalid
  if (!Number.isFinite(seconds) || seconds < 0 || Object.is(seconds, -0)) {
    return rejected(state, 'invalid-state', 'Skill timer duration must be finite and non-negative.')
  }
  if (seconds === 0) return accepted(state, false, 'unchanged', [])
  const byId = { ...state.skills.byId }
  const affected: string[] = []
  for (const id of CANONICAL_ACTIVE_SKILL_TIMER_IDS_V2) {
    const runtime = byId[id]!
    if (!runtime.owned) continue
    const timerSeconds = Math.min(
      Number.MAX_VALUE,
      runtime.timerSeconds + seconds,
    )
    if (timerSeconds === runtime.timerSeconds) continue
    byId[id] = Object.freeze({ ...runtime, timerSeconds })
    affected.push(id)
  }
  if (affected.length === 0) return accepted(state, false, 'unchanged', [])
  return accepted(
    skillCandidate(state, { byId }, canonicalSkillCatalogV2),
    true,
    'timers-advanced',
    affected,
  )
}

/** Clears both owner-local timer slots for a prestige reset. */
export function clearedCanonicalSkillRuntimeV2(): Readonly<SkillRuntimeStateV2> {
  return Object.freeze({
    owned: false,
    level: 0n,
    timerSeconds: 0,
    secondaryTimerSeconds: 0,
  })
}

/** Current Web parity: the generated effect is dynamic and the existing Web
 * resolver contributes 1, 2, 4, ... rather than Unity's older factor-of-five. */
export function panelWarrantyLifetimeAdditionV2(
  state: Readonly<CanonicalGameStateV2>,
): number {
  if (!state.skills.byId.panelWarranty!.owned) return 0
  const fragments = state.skills.fragments
  if (fragments < 0n || fragments > BigInt(canonicalSkillCatalogV2.fragmentSkillIds.length)) {
    throw new RangeError('Panel Warranty requires the closed fragment count.')
  }
  return fragments > 1n ? 2 ** Number(fragments - 1n) : 1
}

/** Direct consumer for the fragment Skill that intentionally has no generated
 * EffectDefinition. */
export function productionScalingThresholdV2(
  state: Readonly<CanonicalGameStateV2>,
): 90 | 100 {
  return state.skills.byId.productionScaling!.owned ? 90 : 100
}

function planPurchase(
  state: Readonly<CanonicalGameStateV2>,
  skillId: string,
  catalog: Readonly<CanonicalSkillCatalogV2>,
): PurchasePlanV2 {
  if (catalog.byId[skillId] === undefined) return failedPlan('unknown-skill', `Unknown Skill '${skillId}'.`)
  if (state.skills.byId[skillId]!.owned) return Object.freeze({ accepted: true, code: 'unchanged', reason: '', affectedSkillIds: Object.freeze([]), pointsRequired: 0n })
  const byId = { ...state.skills.byId }
  const visiting = new Set<string>()
  const planned = new Set<string>()
  const affected: string[] = []
  let points = 0n
  let failure: PurchasePlanV2 | undefined
  const visit = (id: string): boolean => {
    if (byId[id]!.owned || planned.has(id)) return true
    const definition = catalog.byId[id]
    if (definition === undefined) {
      failure = failedPlan('unknown-skill', `Missing required Skill '${id}'.`)
      return false
    }
    if (visiting.has(id)) {
      failure = failedPlan('requirement-cycle', `Skill '${id}' has a requirement cycle.`)
      return false
    }
    if (!isUnlocked(definition, state)) {
      failure = failedPlan('locked', `Skill '${id}' is locked.`)
      return false
    }
    visiting.add(id)
    for (const dependency of [...definition.required, ...definition.shadowRequired]) {
      if (!visit(dependency)) return false
    }
    visiting.delete(id)
    if (conflictsWithOwned(definition, byId, catalog)) {
      failure = failedPlan('exclusive-conflict', `Skill '${id}' conflicts with an owned or required Skill.`)
      return false
    }
    planned.add(id)
    affected.push(id)
    points += definition.cost
    byId[id] = setSkillOwned(byId[id]!, true)
    return true
  }
  if (!visit(skillId)) return failure!
  if (state.skills.points < points) {
    return Object.freeze({ accepted: false, code: 'insufficient-points', reason: `Skill closure costs ${points.toString()} points.`, affectedSkillIds: Object.freeze(affected), pointsRequired: points })
  }
  return Object.freeze({ accepted: true, code: 'purchased', reason: '', affectedSkillIds: Object.freeze(affected), pointsRequired: points })
}

function failedPlan(code: CanonicalSkillTransactionCodeV2, reason: string): PurchasePlanV2 {
  return Object.freeze({ accepted: false, code, reason, affectedSkillIds: Object.freeze([]), pointsRequired: 0n })
}

function isUnlocked(
  definition: Readonly<CanonicalSkillDefinitionV2>,
  state: Readonly<CanonicalGameStateV2>,
): boolean {
  switch (definition.unlock) {
    case 'always': return true
    case 'first-infinity': return state.meta.firstInfinityComplete
    case 'fragments': return state.quantum.unlocks.fragments
    case 'purity': return state.quantum.unlocks.purity
    case 'terra': return state.quantum.unlocks.terra
    case 'power': return state.quantum.unlocks.power
    case 'paragade': return state.quantum.unlocks.paragade
    case 'stellar': return state.quantum.unlocks.stellar
  }
}

function requirementsMet(
  definition: Readonly<CanonicalSkillDefinitionV2>,
  byId: CanonicalGameStateV2['skills']['byId'],
): boolean {
  return [...definition.required, ...definition.shadowRequired].every((id) => byId[id]!.owned)
}

function conflictsWithOwned(
  definition: Readonly<CanonicalSkillDefinitionV2>,
  byId: CanonicalGameStateV2['skills']['byId'],
  catalog: Readonly<CanonicalSkillCatalogV2>,
): boolean {
  if (definition.exclusiveWith.some((id) => byId[id]!.owned)) return true
  return catalog.skillIds.some((id) => byId[id]!.owned && catalog.byId[id]!.exclusiveWith.includes(definition.id))
}

function isRefundable(
  definition: Readonly<CanonicalSkillDefinitionV2>,
  byId: CanonicalGameStateV2['skills']['byId'],
): boolean {
  return definition.refundable && !definition.unrefundableWith.some((id) => byId[id]!.owned)
}

function dependentIds(
  root: string,
  catalog: Readonly<CanonicalSkillCatalogV2>,
  byId: CanonicalGameStateV2['skills']['byId'],
  ownedOnly: boolean,
): string[] {
  const result: string[] = []
  const visited = new Set([root])
  const queue = [root]
  while (queue.length > 0) {
    const dependency = queue.shift()!
    for (const id of catalog.skillIds) {
      const definition = catalog.byId[id]!
      if (
        visited.has(id) ||
        (ownedOnly && !byId[id]!.owned) ||
        ![...definition.required, ...definition.shadowRequired].includes(dependency)
      ) continue
      visited.add(id)
      result.push(id)
      queue.push(id)
    }
  }
  return result
}

function setSkillOwned(
  runtime: Readonly<SkillRuntimeStateV2>,
  owned: boolean,
): Readonly<SkillRuntimeStateV2> {
  return Object.freeze({
    ...runtime,
    owned,
    level: owned ? (runtime.level < 1n ? 1n : runtime.level) : 0n,
  })
}

function skillCandidate(
  state: Readonly<CanonicalGameStateV2>,
  replacement: Readonly<{
    points?: bigint
    byId?: Record<string, Readonly<SkillRuntimeStateV2>>
    activeAutoAssignment?: readonly string[]
    presets?: CanonicalGameStateV2['skills']['presets']
  }>,
  catalog: Readonly<CanonicalSkillCatalogV2>,
): Readonly<CanonicalGameStateV2> {
  const byId = replacement.byId ?? state.skills.byId
  const candidate = Object.freeze({
    ...state,
    skills: Object.freeze({
      ...state.skills,
      points: replacement.points ?? state.skills.points,
      fragments: BigInt(catalog.fragmentSkillIds.filter((id) => byId[id]!.owned).length),
      byId: replacement.byId === undefined ? byId : Object.freeze(replacement.byId),
      activeAutoAssignment: replacement.activeAutoAssignment === undefined
        ? state.skills.activeAutoAssignment
        : Object.freeze([...replacement.activeAutoAssignment]),
      presets: replacement.presets ?? state.skills.presets,
    }),
  }) as CanonicalGameStateV2
  const validation = validateCanonicalGameStateV2(candidate)
  if (!validation.valid) throw new Error(`Canonical Skill transaction produced invalid V2 state: ${validation.errors.join(' ')}`)
  return candidate
}

function mapPresetQueues(
  presets: CanonicalGameStateV2['skills']['presets'],
  remove: ReadonlySet<string>,
): CanonicalGameStateV2['skills']['presets'] {
  return Object.freeze(presets.map((preset) => Object.freeze({
    ...preset,
    skillIds: Object.freeze(preset.skillIds.filter((id) => !remove.has(id))),
  }))) as unknown as CanonicalGameStateV2['skills']['presets']
}

function normalizePresetIds(
  source: readonly string[],
  catalog: Readonly<CanonicalSkillCatalogV2>,
): string[] {
  const unique = source.filter((id, index) => id.length > 0 && source.indexOf(id) === index && catalog.byId[id] !== undefined)
  const selected = new Set(unique)
  const result: string[] = []
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const visit = (id: string): void => {
    if (visited.has(id) || visiting.has(id)) return
    visiting.add(id)
    const definition = catalog.byId[id]!
    for (const dependency of [...definition.required, ...definition.shadowRequired]) {
      if (selected.has(dependency)) visit(dependency)
    }
    visiting.delete(id)
    visited.add(id)
    if (!result.some((acceptedId) => {
      const accepted = catalog.byId[acceptedId]!
      return definition.exclusiveWith.includes(acceptedId) || accepted.exclusiveWith.includes(id)
    })) result.push(id)
  }
  for (const id of unique) visit(id)
  return result
}

function invalidState(
  state: Readonly<CanonicalGameStateV2>,
): Extract<CanonicalSkillTransactionResultV2, { accepted: false }> | null {
  const validation = validateCanonicalGameStateV2(state)
  return validation.valid
    ? null
    : rejected(state, 'invalid-state', validation.errors[0] ?? 'Invalid V2 state.')
}

function accepted(
  state: Readonly<CanonicalGameStateV2>,
  changed: boolean,
  code: CanonicalSkillTransactionCodeV2,
  affectedSkillIds: readonly string[],
): Extract<CanonicalSkillTransactionResultV2, { accepted: true }> {
  return Object.freeze({ accepted: true, changed, code, state, affectedSkillIds: Object.freeze([...affectedSkillIds]) })
}

function rejected(
  state: Readonly<CanonicalGameStateV2>,
  code: CanonicalSkillTransactionCodeV2,
  reason: string,
): Extract<CanonicalSkillTransactionResultV2, { accepted: false }> {
  return Object.freeze({ accepted: false, changed: false, code, reason, state, affectedSkillIds: Object.freeze([] as []) })
}

function rejectedPreset(
  current: readonly string[],
  reason: string,
): Extract<CanonicalSkillPresetPreviewV2, { accepted: false }> {
  return Object.freeze({ accepted: false, changed: false, reason, affectedSkillIds: Object.freeze([] as []), nextSkillIds: Object.freeze([...current]) })
}

function validatePresetBoundary(
  state: Readonly<CanonicalGameStateV2>,
  slot: CanonicalSkillPresetSlot,
  skillId: string,
): Extract<CanonicalSkillPresetPreviewV2, { accepted: false }> | null {
  const validation = validateCanonicalGameStateV2(state)
  if (!validation.valid) {
    return rejectedPreset([], validation.errors[0] ?? 'Invalid V2 state.')
  }
  if (!Number.isSafeInteger(slot) || slot < 1 || slot > 5) {
    return rejectedPreset([], 'Skill preset slot must be from 1 through 5.')
  }
  if (typeof skillId !== 'string' || skillId.length === 0) {
    return rejectedPreset([], 'Skill ID must be a non-empty string.')
  }
  return null
}
