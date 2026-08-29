import { isSafeNonNegativeInteger } from '../core/finiteNonNegativeNumber'
import { getGameAssetsByKind } from '../game-data/catalog'
import {
  readStringArray,
  readUnityBoolean,
} from '../game-data/runtimeValueGuards'
import type { RuntimeGameAsset } from '../game-data/types'
import type {
  CanonicalGameStateV1,
  SkillRuntimeState,
} from '../game-state/types'
import {
  deriveManualPurchaseProductionLayer,
} from './canonicalDysonDerivation'
import { BASIC_DYSON_FACILITY_IDS } from './dysonFacilities'

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

export interface CanonicalSkillProductionImpact {
  readonly pointsBefore: bigint
  readonly pointsAfter: bigint
  readonly purity?: {
    readonly cashScienceBefore: number
    readonly cashScienceAfter: number
    readonly botsBefore: number
    readonly botsAfter: number
    readonly everythingBefore: number
    readonly everythingAfter: number
  }
  readonly manualPurchase?: readonly {
    readonly facilityId: (typeof BASIC_DYSON_FACILITY_IDS)[number]
    readonly effectiveManualCount: number
    readonly beforeMultiplier: number
    readonly afterMultiplier: number
  }[]
}

interface CanonicalSkillPurchasePlan
  extends CanonicalSkillActionPreview {
  readonly pointsRequired: bigint
  readonly reason: string
}

export type CanonicalSkillVisualState =
  | 'root'
  | 'fragment'
  | 'owned'
  | 'non-refundable'
  | 'non-refundable-owned'
  | 'exclusive'
  | 'normal'

export interface CanonicalSkillAvailabilityPreview {
  readonly skillId: string
  readonly cost: bigint
  readonly owned: boolean
  readonly visible: boolean
  readonly unlocked: boolean
  readonly queued: boolean
  readonly visualState: CanonicalSkillVisualState
  readonly fragment: boolean
  readonly intrinsicallyRefundable: boolean
  readonly requiredSkillIds: readonly string[]
  readonly shadowRequiredSkillIds: readonly string[]
  readonly exclusiveWithSkillIds: readonly string[]
  readonly purchase: CanonicalSkillActionPreview & {
    readonly pointsRequired: bigint
    readonly productionImpact?: CanonicalSkillProductionImpact
  }
  readonly refund: CanonicalSkillActionPreview & {
    readonly pointsReturned: bigint
    readonly fragmentsRemoved: bigint
    readonly productionImpact?: CanonicalSkillProductionImpact
  }
}

export interface CanonicalSkillCatalogPreview {
  readonly complete: boolean
  readonly definitionGap: string | null
  readonly skills: readonly CanonicalSkillAvailabilityPreview[]
  /** Exact authored-order result of the bulk reset command at this state. */
  readonly reset: {
    readonly refundableSkillIds: readonly string[]
    readonly retainedSkillIds: readonly string[]
    readonly queuedSkillIds: readonly string[]
  }
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
      reset: Object.freeze({
        refundableSkillIds: Object.freeze([]),
        retainedSkillIds: Object.freeze([]),
        queuedSkillIds: Object.freeze([]),
      }),
    })
  }

  const effectivelyNotRefundableIds =
    selectEffectivelyNotRefundableSkillIds(state, definitions)
  const skills = [...definitions.values()].map((definition) => {
    const owned = state.skills.byId[definition.id]?.owned === true
    const unlocked = isUnlocked(definition, state)
    const purchase = planPurchaseWithDefinitions(
      state,
      definition.id,
      definitions,
    )
    const refund = refundWithDefinitions(
      state,
      definition.id,
      definitions,
    )
    const purchaseTransaction =
      purchase.eligible && purchase.affectedSkillIds.length > 0
        ? purchaseWithDefinitions(state, definition.id, definitions)
        : null
    const purchaseImpact =
      purchaseTransaction?.accepted === true &&
      purchaseTransaction.changed
        ? previewProductionImpact(
            state,
            purchaseTransaction.state,
          )
        : undefined
    const refundImpact = refund.accepted && refund.changed
      ? previewProductionImpact(state, refund.state)
      : undefined
    const refundAffected =
      refund.accepted && refund.changed
        ? refund.affectedSkillIds
        : []
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
      owned,
      visible: unlocked,
      unlocked,
      queued: state.skills.activeAutoAssignment.includes(
        definition.id,
      ),
      visualState: resolveVisualState(
        definition,
        state,
        effectivelyNotRefundableIds,
        owned,
      ),
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
        eligible:
          purchase.eligible && purchase.affectedSkillIds.length > 0,
        code: purchase.code,
        affectedSkillIds: Object.freeze([
          ...purchase.affectedSkillIds,
        ]),
        pointsRequired: purchase.pointsRequired,
        ...(purchaseImpact === undefined
          ? {}
          : { productionImpact: purchaseImpact }),
      }),
      refund: Object.freeze({
        eligible: refund.accepted && refund.changed,
        code: refundCode,
        affectedSkillIds: Object.freeze([...refundAffected]),
        pointsReturned,
        fragmentsRemoved,
        ...(refundImpact === undefined
          ? {}
          : { productionImpact: refundImpact }),
      }),
    })
  })
  const ownedDefinitions = [...definitions.values()].filter(
    (definition) => state.skills.byId[definition.id]?.owned === true,
  )
  return Object.freeze({
    complete: true,
    definitionGap: null,
    skills: Object.freeze(skills),
    reset: Object.freeze({
      refundableSkillIds: Object.freeze(
        ownedDefinitions
          .filter((definition) =>
            isRefundable(definition, state.skills.byId),
          )
          .map((definition) => definition.id),
      ),
      retainedSkillIds: Object.freeze(
        ownedDefinitions
          .filter((definition) =>
            !isRefundable(definition, state.skills.byId),
          )
          .map((definition) => definition.id),
      ),
      queuedSkillIds: Object.freeze([
        ...state.skills.activeAutoAssignment,
      ]),
    }),
  })
}

function previewProductionImpact(
  before: CanonicalGameStateV1,
  after: CanonicalGameStateV1,
): CanonicalSkillProductionImpact | undefined {
  const purity =
    [before, after].some((state) =>
      state.skills.byId.purityOfMind?.owned === true ||
      state.skills.byId.purityOfBody?.owned === true ||
      state.skills.byId.purityOfSEssence?.owned === true,
    )
      ? {
          cashScienceBefore: purityCashScienceMultiplier(before),
          cashScienceAfter: purityCashScienceMultiplier(after),
          botsBefore: purityBotsMultiplier(before),
          botsAfter: purityBotsMultiplier(after),
          everythingBefore: purityEssenceMultiplier(before),
          everythingAfter: purityEssenceMultiplier(after),
        }
      : undefined
  const supernovaOwnershipChanged =
    before.skills.byId.supernova?.owned !==
    after.skills.byId.supernova?.owned
  const manualPurchase = supernovaOwnershipChanged
    ? BASIC_DYSON_FACILITY_IDS.map((facilityId) => {
        const previous = deriveManualPurchaseProductionLayer(
          before,
          facilityId,
        )
        const next = deriveManualPurchaseProductionLayer(after, facilityId)
        return Object.freeze({
          facilityId,
          effectiveManualCount: previous.effectiveManualCount,
          beforeMultiplier: previous.totalMultiplier,
          afterMultiplier: next.totalMultiplier,
        })
      })
    : undefined
  if (purity === undefined && manualPurchase === undefined) return undefined
  return Object.freeze({
    pointsBefore: before.skills.points,
    pointsAfter: after.skills.points,
    ...(purity === undefined ? {} : { purity: Object.freeze(purity) }),
    ...(manualPurchase === undefined
      ? {}
      : { manualPurchase: Object.freeze(manualPurchase) }),
  })
}

function purityEssenceMultiplier(state: CanonicalGameStateV1): number {
  return state.skills.byId.purityOfSEssence?.owned === true
    ? Math.pow(1.42, Number(state.skills.points))
    : 1
}

function purityCashScienceMultiplier(state: CanonicalGameStateV1): number {
  const mind = state.skills.byId.purityOfMind?.owned === true
    ? Math.pow(1.5, Number(state.skills.points))
    : 1
  return mind * purityEssenceMultiplier(state)
}

function purityBotsMultiplier(state: CanonicalGameStateV1): number {
  const body = state.skills.byId.purityOfBody?.owned === true
    ? Math.pow(1.25, Number(state.skills.points))
    : 1
  return body * purityEssenceMultiplier(state)
}

/**
 * Purchases an authored skill and any missing prerequisites as one atomic
 * transaction after applying the canonical visibility, dependency,
 * exclusivity, point, and fragment rules.
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
  const plan = planPurchaseWithDefinitions(
    state,
    skillId,
    definitions,
  )
  if (plan.eligible && plan.affectedSkillIds.length === 0) {
    return accepted(state, false, [])
  }
  if (!plan.eligible) {
    return rejected(state, plan.code, plan.reason)
  }

  let fragments = state.skills.fragments
  let activeAutoAssignment = state.skills.activeAutoAssignment
  const byId = { ...state.skills.byId }
  for (const affectedSkillId of plan.affectedSkillIds) {
    const definition = definitions.get(affectedSkillId)!
    const runtime = byId[affectedSkillId] ?? emptyRuntime()
    byId[affectedSkillId] = { ...runtime, owned: true }
    fragments += definition.fragment ? 1n : 0n
    activeAutoAssignment = appendUnique(
      activeAutoAssignment,
      affectedSkillId,
    )
  }

  return accepted(
    {
      ...state,
      skills: {
        ...state.skills,
        points: state.skills.points - plan.pointsRequired,
        fragments,
        byId,
        activeAutoAssignment,
      },
    },
    true,
    plan.affectedSkillIds,
  )
}

function planPurchaseWithDefinitions(
  state: CanonicalGameStateV1,
  skillId: string,
  definitions: ReadonlyMap<string, SkillDefinition>,
): CanonicalSkillPurchasePlan {
  if (!definitions.has(skillId)) {
    return purchasePlanRejected(
      'SKILL-UNKNOWN',
      `Unknown skill '${skillId}'.`,
    )
  }
  if (state.skills.byId[skillId]?.owned === true) {
    return {
      eligible: true,
      code: 'already-owned',
      affectedSkillIds: [],
      pointsRequired: 0n,
      reason: '',
    }
  }

  const byId = { ...state.skills.byId }
  const visiting = new Set<string>()
  const planned = new Set<string>()
  const affectedSkillIds: string[] = []
  let pointsRequired = 0n
  let failure: CanonicalSkillPurchasePlan | null = null

  const visit = (candidateId: string): boolean => {
    if (byId[candidateId]?.owned === true || planned.has(candidateId)) {
      return true
    }
    const definition = definitions.get(candidateId)
    if (definition === undefined) {
      failure = purchasePlanRejected(
        'SKILL-DEFINITION-GAP',
        `Skill '${candidateId}' is required but has no definition.`,
      )
      return false
    }
    if (visiting.has(candidateId)) {
      failure = purchasePlanRejected(
        'SKILL-REQUIREMENT-CYCLE',
        `Skill '${candidateId}' belongs to a circular requirement chain.`,
      )
      return false
    }
    if (!isUnlocked(definition, state)) {
      failure = purchasePlanRejected(
        'SKILL-LOCKED',
        `Skill '${candidateId}' is locked.`,
      )
      return false
    }

    visiting.add(candidateId)
    for (const requiredId of [
      ...definition.required,
      ...definition.shadowRequired,
    ]) {
      if (!visit(requiredId)) {
        visiting.delete(candidateId)
        return false
      }
    }
    visiting.delete(candidateId)

    if (hasOwned(definition.exclusiveWith, byId)) {
      failure = purchasePlanRejected(
        'SKILL-EXCLUSIVE',
        `Skill '${candidateId}' conflicts with an owned or required skill.`,
      )
      return false
    }

    planned.add(candidateId)
    affectedSkillIds.push(candidateId)
    pointsRequired += definition.cost
    byId[candidateId] = {
      ...(byId[candidateId] ?? emptyRuntime()),
      owned: true,
    }
    return true
  }

  if (!visit(skillId)) {
    return failure!
  }
  if (state.skills.points < pointsRequired) {
    return {
      eligible: false,
      code: 'SKILL-INSUFFICIENT-POINTS',
      affectedSkillIds,
      pointsRequired,
      reason:
        `Assigning '${skillId}' and its missing prerequisites costs ` +
        `${pointsRequired} skill points.`,
    }
  }
  return {
    eligible: true,
    code: 'purchasable',
    affectedSkillIds,
    pointsRequired,
    reason: '',
  }
}

function purchasePlanRejected(
  code: string,
  reason: string,
): CanonicalSkillPurchasePlan {
  return {
    eligible: false,
    code,
    affectedSkillIds: [],
    pointsRequired: 0n,
    reason,
  }
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

function parseDefinition(asset: RuntimeGameAsset): SkillDefinition {
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
  asset: RuntimeGameAsset,
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

function resolveVisualState(
  definition: SkillDefinition,
  state: CanonicalGameStateV1,
  effectivelyNotRefundableIds: ReadonlySet<string>,
  owned: boolean,
): CanonicalSkillVisualState {
  if (hasOwned(definition.exclusiveWith, state.skills.byId)) {
    return 'exclusive'
  }
  if (effectivelyNotRefundableIds.has(definition.id)) {
    return owned ? 'non-refundable-owned' : 'non-refundable'
  }
  if (owned) return 'owned'
  if (definition.fragment) return 'fragment'
  if (definition.required.length === 0) return 'root'
  return 'normal'
}

function selectEffectivelyNotRefundableSkillIds(
  state: CanonicalGameStateV1,
  definitions: ReadonlyMap<string, SkillDefinition>,
): ReadonlySet<string> {
  const skillIds = new Set<string>()
  for (const definition of definitions.values()) {
    if (!definition.refundable) skillIds.add(definition.id)
    if (
      state.skills.byId[definition.id]?.owned === true &&
      hasOwned(definition.unrefundableWith, state.skills.byId)
    ) {
      skillIds.add(definition.id)
    }
  }

  for (const candidate of definitions.values()) {
    if (
      candidate.refundable ||
      state.skills.byId[candidate.id]?.owned !== true
    ) {
      continue
    }
    const visited = new Set([candidate.id])
    const queue = [candidate.id]
    while (queue.length > 0) {
      const current = queue.shift()!
      const required = definitions.get(current)?.required ?? []
      for (const requiredId of required) {
        if (!visited.add(requiredId)) continue
        if (state.skills.byId[requiredId]?.owned === true) {
          skillIds.add(requiredId)
        }
        queue.push(requiredId)
      }
    }
  }
  return skillIds
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
  asset: RuntimeGameAsset,
  field: string,
): number {
  if (isSafeNonNegativeInteger(value)) {
    return value
  }
  throw invalidDefinition(asset, field)
}

function requireBoolean(
  value: unknown,
  asset: RuntimeGameAsset,
  field: string,
): boolean {
  const parsed = readUnityBoolean(value)
  if (parsed !== undefined) return parsed
  throw invalidDefinition(asset, field)
}

function requireStringArray(
  value: unknown,
  asset: RuntimeGameAsset,
): readonly string[] {
  const parsed = readStringArray(value)
  if (parsed !== undefined) return parsed
  throw invalidDefinition(asset, 'string array')
}

function invalidDefinition(
  asset: RuntimeGameAsset,
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
