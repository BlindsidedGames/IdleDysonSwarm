import { cloneCanonicalGameStateV2 } from '../game-state/cloneV2'
import type { CanonicalFacilityId } from '../game-state/types'
import type { CanonicalGameStateV2 } from '../game-state/typesV2'
import { validateCanonicalGameStateV2 } from '../game-state/validateV2'
import {
  addGameDecimals,
  cloneGameDecimal,
  compareGameDecimals,
  gameDecimalFromNumber,
  subtractGameDecimals,
  type GameDecimal,
} from '../math/gameDecimal'
import { runCanonicalSkillAutoAssignmentV2 } from './skillTransactionsV2'

export const INFINITY_SHOP_ITEM_IDS_V2 = Object.freeze([
  'secret',
  'permanent-skill-point',
  'unlock-research-automation',
  'unlock-bot-automation',
  'retain-assembly-lines',
  'retain-ai-managers',
  'retain-servers',
  'retain-data-centers',
  'retain-planets',
] as const)

export type InfinityShopItemIdV2 = (typeof INFINITY_SHOP_ITEM_IDS_V2)[number]
export type InfinityShopStatusV2 =
  | 'ready'
  | 'maximum-reached'
  | 'already-purchased'
  | 'prerequisite-not-met'
  | 'insufficient-infinity-points'
  | 'auto-assignment-rejected'
  | 'stale-revision'
  | 'revision-exhausted'
  | 'quote-rejected'
  | 'state-mismatch'

export interface InfinityShopQuoteV2 {
  readonly kind: 'infinity-shop-quote-v2'
  readonly itemId: InfinityShopItemIdV2
  readonly sourceRevision: number
  readonly eligible: boolean
  readonly status: InfinityShopStatusV2
  readonly quotedCost: GameDecimal
  readonly debitedAmount: GameDecimal
  readonly allocatedAmount: GameDecimal
  readonly autoAssignedSkillIds: readonly string[]
}

export interface InfinityShopCommitResultV2 {
  readonly accepted: boolean
  readonly changed: boolean
  readonly status: InfinityShopStatusV2
  readonly revision: number
  readonly state: Readonly<CanonicalGameStateV2>
  readonly itemId: InfinityShopItemIdV2 | null
  readonly quotedCost: GameDecimal
  readonly debitedAmount: GameDecimal
  readonly allocatedAmount: GameDecimal
  readonly autoAssignedSkillIds: readonly string[]
}

type RetainedKey = keyof CanonicalGameStateV2['infinity']['retainedFacilities']
type ShopPlan = Readonly<{
  quote: Readonly<InfinityShopQuoteV2>
  source: Readonly<CanonicalGameStateV2>
  candidate: Readonly<CanonicalGameStateV2> | null
}>

const ITEM_SET = new Set<string>(INFINITY_SHOP_ITEM_IDS_V2)
const ONE = gameDecimalFromNumber(1)
const THREE = gameDecimalFromNumber(3)
const TEN = gameDecimalFromNumber(10)
const ZERO = gameDecimalFromNumber(0)
export const INFINITY_SHOP_TUNING_V2 = Object.freeze({
  secretCost: ONE,
  maximumSecrets: 27n,
  permanentSkillPointCost: ONE,
  maximumPermanentSkillPoints: 10n,
  automationCost: THREE,
  retainedFacilityCost: ONE,
  retainedFacilityQuantity: TEN,
})
const quoteDescriptors = new WeakMap<InfinityShopQuoteV2, Readonly<{
  itemId: InfinityShopItemIdV2
  source: Readonly<CanonicalGameStateV2>
  sourceIdentity: Readonly<CanonicalGameStateV2>
  identityFastPath: boolean
  candidate: Readonly<CanonicalGameStateV2> | null
}>>()

const RETAINED = Object.freeze({
  'retain-assembly-lines': Object.freeze({ facility: 'assembly_lines', key: 'assembly_lines', prerequisite: null }),
  'retain-ai-managers': Object.freeze({ facility: 'ai_managers', key: 'ai_managers', prerequisite: 'assembly_lines' }),
  'retain-servers': Object.freeze({ facility: 'servers', key: 'servers', prerequisite: 'ai_managers' }),
  'retain-data-centers': Object.freeze({ facility: 'data_centers', key: 'data_centers', prerequisite: 'servers' }),
  'retain-planets': Object.freeze({ facility: 'planets', key: 'planets', prerequisite: 'data_centers' }),
} as const satisfies Readonly<Record<string, Readonly<{
  facility: CanonicalFacilityId
  key: RetainedKey
  prerequisite: RetainedKey | null
}>>>)

export function quoteInfinityShopPurchaseV2(
  state: Readonly<CanonicalGameStateV2>,
  sourceRevision: number,
  itemId: string,
): Readonly<InfinityShopQuoteV2> {
  requireRevision(sourceRevision)
  if (!ITEM_SET.has(itemId)) throw new TypeError(`Unknown Infinity shop item '${itemId}'.`)
  const admitted = admitSource(state)
  const plan = buildPlan(admitted.state, sourceRevision, itemId as InfinityShopItemIdV2)
  quoteDescriptors.set(plan.quote, Object.freeze({
    itemId: itemId as InfinityShopItemIdV2,
    source: plan.source,
    sourceIdentity: state,
    identityFastPath: admitted.identityFastPath,
    candidate: plan.candidate,
  }))
  return plan.quote
}

export function commitInfinityShopPurchaseV2(
  quote: unknown,
  state: Readonly<CanonicalGameStateV2>,
  currentRevision: number,
): Readonly<InfinityShopCommitResultV2> {
  if (typeof quote !== 'object' || quote === null) {
    return rejected(state, currentRevision, 'quote-rejected')
  }
  const descriptor = quoteDescriptors.get(quote as InfinityShopQuoteV2)
  if (descriptor === undefined) return rejected(state, currentRevision, 'quote-rejected')
  const { itemId } = descriptor
  requireRevision(currentRevision)
  const issued = quote as InfinityShopQuoteV2
  if (currentRevision !== issued.sourceRevision) {
    return rejected(state, currentRevision, 'stale-revision', itemId, issued)
  }
  const current = descriptor.identityFastPath && state === descriptor.sourceIdentity
    ? descriptor.source
    : admitSource(state).state
  if (!equalCanonicalValue(descriptor.source, current)) {
    return rejected(state, currentRevision, 'state-mismatch', itemId, issued)
  }
  if (!issued.eligible || descriptor.candidate === null) {
    return rejected(
      state,
      currentRevision,
      issued.status,
      itemId,
      issued,
    )
  }
  if (currentRevision === Number.MAX_SAFE_INTEGER) {
    return rejected(state, currentRevision, 'revision-exhausted', itemId, issued)
  }
  return Object.freeze({
    accepted: true,
    changed: true,
    status: 'ready' as const,
    revision: currentRevision + 1,
    state: descriptor.candidate,
    itemId,
    quotedCost: cloneGameDecimal(issued.quotedCost),
    debitedAmount: cloneGameDecimal(issued.debitedAmount),
    allocatedAmount: cloneGameDecimal(issued.allocatedAmount),
    autoAssignedSkillIds: Object.freeze([...issued.autoAssignedSkillIds]),
  })
}

function buildPlan(
  source: Readonly<CanonicalGameStateV2>,
  sourceRevision: number,
  itemId: InfinityShopItemIdV2,
): ShopPlan {
  const state = source
  const cost = itemCost(itemId)
  const preflight = preflightStatus(state, itemId)
  if (preflight !== null) {
    return ineligible(state, itemId, sourceRevision, cost, preflight)
  }
  if (compareGameDecimals(state.infinity.availablePoints, cost) < 0) {
    return ineligible(state, itemId, sourceRevision, cost, 'insufficient-infinity-points')
  }
  const nextAvailable = subtractGameDecimals(state.infinity.availablePoints, cost)
  const nextAllocated = addGameDecimals(state.infinity.allocatedPoints, cost)
  const ledger = Object.freeze({
    availablePoints: nextAvailable,
    allocatedPoints: nextAllocated,
  })
  const debit = subtractGameDecimals(state.infinity.availablePoints, nextAvailable)
  const allocation = subtractGameDecimals(nextAllocated, state.infinity.allocatedPoints)

  if (itemId === 'secret') {
    return eligible(state, itemId, sourceRevision, cost, debit, allocation, Object.freeze({
      ...state,
      infinity: Object.freeze({ ...state.infinity, ...ledger, secretsOfTheUniverse: state.infinity.secretsOfTheUniverse + 1n }),
    }) as Readonly<CanonicalGameStateV2>)
  }
  if (itemId === 'permanent-skill-point') {
    const granted = Object.freeze({
      ...state,
      infinity: Object.freeze({ ...state.infinity, ...ledger, permanentSkillPoints: state.infinity.permanentSkillPoints + 1n }),
      skills: Object.freeze({ ...state.skills, points: state.skills.points + 1n }),
    }) as Readonly<CanonicalGameStateV2>
    const assignment = runCanonicalSkillAutoAssignmentV2(granted)
    if (!assignment.accepted) {
      return ineligible(state, itemId, sourceRevision, cost, 'auto-assignment-rejected')
    }
    return eligible(
      state,
      itemId,
      sourceRevision,
      cost,
      debit,
      allocation,
      assignment.state,
      assignment.affectedSkillIds,
    )
  }
  if (itemId === 'unlock-research-automation' || itemId === 'unlock-bot-automation') {
    const key = itemId === 'unlock-research-automation' ? 'research' : 'bots'
    return eligible(state, itemId, sourceRevision, cost, debit, allocation, Object.freeze({
      ...state,
      infinity: Object.freeze({
        ...state.infinity,
        ...ledger,
        automationUnlocked: Object.freeze({ ...state.infinity.automationUnlocked, [key]: true }),
      }),
    }) as Readonly<CanonicalGameStateV2>)
  }
  const retained = RETAINED[itemId]
  const owned = state.dyson.facilities[retained.facility]
  return eligible(state, itemId, sourceRevision, cost, debit, allocation, Object.freeze({
    ...state,
    meta: Object.freeze({ ...state.meta, tutorialComplete: true }),
    dyson: Object.freeze({
      ...state.dyson,
      facilities: Object.freeze({
        ...state.dyson.facilities,
        [retained.facility]: Object.freeze([
          owned[0],
          addGameDecimals(owned[1], INFINITY_SHOP_TUNING_V2.retainedFacilityQuantity),
        ]),
      }),
    }),
    infinity: Object.freeze({
      ...state.infinity,
      ...ledger,
      retainedFacilities: Object.freeze({ ...state.infinity.retainedFacilities, [retained.key]: true }),
    }),
  }) as Readonly<CanonicalGameStateV2>)
}

function admitSource(source: Readonly<CanonicalGameStateV2>): Readonly<{
  state: Readonly<CanonicalGameStateV2>
  identityFastPath: boolean
}> {
  if (
    validateCanonicalGameStateV2(source).valid &&
    isDeepFrozenDataTree(source, new Set())
  ) {
    return Object.freeze({ state: source, identityFastPath: true })
  }
  return Object.freeze({
    state: cloneCanonicalGameStateV2(source),
    identityFastPath: false,
  })
}

function isDeepFrozenDataTree(value: unknown, seen: Set<object>): boolean {
  if (typeof value !== 'object' || value === null) return true
  if (seen.has(value)) return false
  seen.add(value)
  if (!Object.isFrozen(value)) return false
  const descriptors = Object.getOwnPropertyDescriptors(value)
  for (const key of Reflect.ownKeys(descriptors)) {
    const descriptor = descriptors[key as keyof typeof descriptors]
    if (descriptor === undefined || !('value' in descriptor) ||
      !isDeepFrozenDataTree(descriptor.value, seen)) return false
  }
  return true
}

function preflightStatus(
  state: Readonly<CanonicalGameStateV2>,
  itemId: InfinityShopItemIdV2,
): 'maximum-reached' | 'already-purchased' | 'prerequisite-not-met' | null {
  if (itemId === 'secret') {
    return state.infinity.secretsOfTheUniverse >= INFINITY_SHOP_TUNING_V2.maximumSecrets
      ? 'maximum-reached'
      : null
  }
  if (itemId === 'permanent-skill-point') {
    return state.infinity.permanentSkillPoints >=
      INFINITY_SHOP_TUNING_V2.maximumPermanentSkillPoints
      ? 'maximum-reached'
      : null
  }
  if (itemId === 'unlock-research-automation' || itemId === 'unlock-bot-automation') {
    const key = itemId === 'unlock-research-automation' ? 'research' : 'bots'
    return state.infinity.automationUnlocked[key] ? 'already-purchased' : null
  }
  const retained = RETAINED[itemId]
  if (state.infinity.retainedFacilities[retained.key]) return 'already-purchased'
  return retained.prerequisite !== null &&
    !state.infinity.retainedFacilities[retained.prerequisite]
    ? 'prerequisite-not-met'
    : null
}

function eligible(
  source: Readonly<CanonicalGameStateV2>,
  itemId: InfinityShopItemIdV2,
  sourceRevision: number,
  cost: GameDecimal,
  debit: GameDecimal,
  allocation: GameDecimal,
  candidate: Readonly<CanonicalGameStateV2>,
  assigned: readonly string[] = [],
): ShopPlan {
  return Object.freeze({
    quote: Object.freeze({
      kind: 'infinity-shop-quote-v2' as const,
      itemId,
      sourceRevision,
      eligible: true,
      status: 'ready' as const,
      quotedCost: cloneGameDecimal(cost),
      debitedAmount: cloneGameDecimal(debit),
      allocatedAmount: cloneGameDecimal(allocation),
      autoAssignedSkillIds: Object.freeze([...assigned]),
    }),
    source,
    candidate,
  })
}

function ineligible(
  source: Readonly<CanonicalGameStateV2>,
  itemId: InfinityShopItemIdV2,
  sourceRevision: number,
  cost: GameDecimal,
  status: Exclude<InfinityShopStatusV2, 'ready' | 'stale-revision' | 'revision-exhausted' | 'quote-rejected' | 'state-mismatch'>,
): ShopPlan {
  return Object.freeze({
    quote: Object.freeze({
      kind: 'infinity-shop-quote-v2' as const,
      itemId,
      sourceRevision,
      eligible: false,
      status,
      quotedCost: cloneGameDecimal(cost),
      debitedAmount: cloneGameDecimal(ZERO),
      allocatedAmount: cloneGameDecimal(ZERO),
      autoAssignedSkillIds: Object.freeze([] as string[]),
    }),
    source,
    candidate: null,
  })
}

function rejected(
  state: Readonly<CanonicalGameStateV2>,
  revision: number,
  status: InfinityShopStatusV2,
  itemId: InfinityShopItemIdV2 | null = null,
  quote?: Readonly<InfinityShopQuoteV2>,
): Readonly<InfinityShopCommitResultV2> {
  return Object.freeze({
    accepted: false,
    changed: false,
    status,
    revision,
    state,
    itemId,
    quotedCost: cloneGameDecimal(quote?.quotedCost ?? ZERO),
    debitedAmount: cloneGameDecimal(ZERO),
    allocatedAmount: cloneGameDecimal(ZERO),
    autoAssignedSkillIds: Object.freeze([] as string[]),
  })
}

function equalCanonicalValue(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (
    typeof left !== 'object' || left === null ||
    typeof right !== 'object' || right === null ||
    Object.getPrototypeOf(left) !== Object.getPrototypeOf(right)
  ) return false
  const leftDescriptors = Object.getOwnPropertyDescriptors(left)
  const rightDescriptors = Object.getOwnPropertyDescriptors(right)
  const leftKeys = Reflect.ownKeys(leftDescriptors)
  const rightKeys = Reflect.ownKeys(rightDescriptors)
  if (leftKeys.length !== rightKeys.length) return false
  return leftKeys.every((key, index) => {
    if (key !== rightKeys[index]) return false
    const leftDescriptor = leftDescriptors[key as keyof typeof leftDescriptors]
    const rightDescriptor = rightDescriptors[key as keyof typeof rightDescriptors]
    return leftDescriptor !== undefined && rightDescriptor !== undefined &&
      'value' in leftDescriptor && 'value' in rightDescriptor &&
      equalCanonicalValue(leftDescriptor.value, rightDescriptor.value)
  })
}

function itemCost(itemId: InfinityShopItemIdV2): GameDecimal {
  return cloneGameDecimal(
    itemId === 'unlock-research-automation' || itemId === 'unlock-bot-automation'
      ? INFINITY_SHOP_TUNING_V2.automationCost
      : itemId === 'secret'
        ? INFINITY_SHOP_TUNING_V2.secretCost
        : itemId === 'permanent-skill-point'
          ? INFINITY_SHOP_TUNING_V2.permanentSkillPointCost
          : INFINITY_SHOP_TUNING_V2.retainedFacilityCost,
  )
}

function requireRevision(value: number): void {
  if (!Number.isSafeInteger(value) || value < 0 || Object.is(value, -0)) {
    throw new RangeError('Infinity shop revision is invalid.')
  }
}
