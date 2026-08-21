import type {
  CanonicalFacilityId,
  CanonicalGameStateV1,
} from '../game-state/types'
import {
  runCanonicalSkillAutoAssignment,
} from './canonicalSkillTransactions'
import {
  addContinuous,
  addDiscrete,
  DISCRETE_MAXIMUM,
} from './numeric'
import { QUANTUM_CONSTANTS } from './quantumUpgrades'

export const CANONICAL_INFINITY_SHOP_ITEM_IDS = [
  'secret',
  'permanent-skill-point',
  'unlock-research-automation',
  'unlock-bot-automation',
  'retain-assembly-lines',
  'retain-ai-managers',
  'retain-servers',
  'retain-data-centers',
  'retain-planets',
] as const

export type CanonicalInfinityShopItemId =
  (typeof CANONICAL_INFINITY_SHOP_ITEM_IDS)[number]

export const CANONICAL_INFINITY_SHOP_CONSTANTS = Object.freeze({
  secretCost: 1n,
  maximumSecrets: QUANTUM_CONSTANTS.maximumSecrets,
  permanentSkillPointCost: 1n,
  maximumPermanentSkillPoints: 10n,
  retainedFacilityCost: 1n,
  retainedFacilityQuantity: 10,
  automationCost: 3n,
})

export type CanonicalInfinityShopPurchaseCode =
  | 'purchased'
  | 'unknown-item'
  | 'invalid-state'
  | 'maximum-reached'
  | 'already-purchased'
  | 'prerequisite-not-met'
  | 'insufficient-infinity-points'
  | 'output-maxed'
  | 'definition-gap'
  | 'auto-assignment-rejected'

export interface CanonicalInfinityShopPurchaseResult {
  readonly accepted: boolean
  readonly changed: boolean
  readonly code: CanonicalInfinityShopPurchaseCode
  readonly cost: bigint
  readonly state: CanonicalGameStateV1
  readonly autoAssignedSkillIds: readonly string[]
  readonly issue: string | null
}

interface RetainedFacilityDefinition {
  readonly facilityId: CanonicalFacilityId
  readonly retainedKey: keyof CanonicalGameStateV1['infinity']['retainedFacilities']
  readonly prerequisite:
    | keyof CanonicalGameStateV1['infinity']['retainedFacilities']
    | null
}

const RETAINED_FACILITIES: Readonly<
  Partial<
    Record<CanonicalInfinityShopItemId, RetainedFacilityDefinition>
  >
> = Object.freeze({
  'retain-assembly-lines': {
    facilityId: 'assembly_lines',
    retainedKey: 'assembly_lines',
    prerequisite: null,
  },
  'retain-ai-managers': {
    facilityId: 'ai_managers',
    retainedKey: 'ai_managers',
    prerequisite: 'assembly_lines',
  },
  'retain-servers': {
    facilityId: 'servers',
    retainedKey: 'servers',
    prerequisite: 'ai_managers',
  },
  'retain-data-centers': {
    facilityId: 'data_centers',
    retainedKey: 'data_centers',
    prerequisite: 'servers',
  },
  'retain-planets': {
    facilityId: 'planets',
    retainedKey: 'planets',
    prerequisite: 'data_centers',
  },
})

const ITEM_ID_SET = new Set<string>(
  CANONICAL_INFINITY_SHOP_ITEM_IDS,
)
const EMPTY_SKILL_IDS = Object.freeze([] as string[])

/**
 * Returns Unity InfinityManager's unspent balance. Corrupt overspent or
 * out-of-range counters fail closed to zero.
 */
export function availableCanonicalInfinityShopPoints(
  state: Readonly<CanonicalGameStateV1>,
): bigint {
  const { points, spentPoints } = state.infinity
  if (
    points < 0n ||
    spentPoints < 0n ||
    points > DISCRETE_MAXIMUM ||
    spentPoints > DISCRETE_MAXIMUM ||
    spentPoints > points
  ) {
    return 0n
  }
  return points - spentPoints
}

/**
 * Applies one InfinityManager purchase as an immutable transaction.
 *
 * Output changes are proven before the Infinity Point debit. Permanent skill
 * points and Unity's immediate auto-assignment pass publish together, while a
 * definition failure rolls the entire candidate back.
 */
export function purchaseCanonicalInfinityShopItem(
  state: CanonicalGameStateV1,
  itemId: string,
): CanonicalInfinityShopPurchaseResult {
  if (!isInfinityShopItemId(itemId)) {
    return rejected(state, 'unknown-item', 0n)
  }
  if (!hasValidInfinityPointState(state)) {
    return rejected(state, 'invalid-state', itemCost(itemId))
  }

  const retained = RETAINED_FACILITIES[itemId]
  if (retained !== undefined) {
    return purchaseRetainedFacility(state, retained)
  }

  switch (itemId) {
    case 'secret':
      return purchaseSecret(state)
    case 'permanent-skill-point':
      return purchasePermanentSkillPoint(state)
    case 'unlock-research-automation':
      return purchaseAutomationUnlock(state, 'research')
    case 'unlock-bot-automation':
      return purchaseAutomationUnlock(state, 'bots')
    default:
      return rejected(state, 'unknown-item', 0n)
  }
}

function purchaseSecret(
  state: CanonicalGameStateV1,
): CanonicalInfinityShopPurchaseResult {
  const cost = CANONICAL_INFINITY_SHOP_CONSTANTS.secretCost
  if (
    state.infinity.secretsOfTheUniverse >=
    CANONICAL_INFINITY_SHOP_CONSTANTS.maximumSecrets
  ) {
    return rejected(state, 'maximum-reached', cost)
  }
  const next = addDiscrete(
    state.infinity.secretsOfTheUniverse,
    1n,
  )
  if (next <= state.infinity.secretsOfTheUniverse) {
    return rejected(state, 'output-maxed', cost)
  }
  const nextSpent = trySpend(state, cost)
  if (nextSpent === null) {
    return rejected(state, 'insufficient-infinity-points', cost)
  }
  return purchased(
    {
      ...state,
      infinity: {
        ...state.infinity,
        spentPoints: nextSpent,
        secretsOfTheUniverse:
          next >
          CANONICAL_INFINITY_SHOP_CONSTANTS.maximumSecrets
            ? CANONICAL_INFINITY_SHOP_CONSTANTS.maximumSecrets
            : next,
      },
    },
    cost,
  )
}

function purchasePermanentSkillPoint(
  state: CanonicalGameStateV1,
): CanonicalInfinityShopPurchaseResult {
  const cost =
    CANONICAL_INFINITY_SHOP_CONSTANTS.permanentSkillPointCost
  if (
    state.infinity.permanentSkillPoints >=
    CANONICAL_INFINITY_SHOP_CONSTANTS.maximumPermanentSkillPoints
  ) {
    return rejected(state, 'maximum-reached', cost)
  }
  const nextSkillPoints = addDiscrete(state.skills.points, 1n)
  const nextPermanent = addDiscrete(
    state.infinity.permanentSkillPoints,
    1n,
  )
  if (
    nextSkillPoints <= state.skills.points ||
    nextPermanent <= state.infinity.permanentSkillPoints
  ) {
    return rejected(state, 'output-maxed', cost)
  }
  const nextSpent = trySpend(state, cost)
  if (nextSpent === null) {
    return rejected(state, 'insufficient-infinity-points', cost)
  }

  const candidate: CanonicalGameStateV1 = {
    ...state,
    infinity: {
      ...state.infinity,
      spentPoints: nextSpent,
      permanentSkillPoints: nextPermanent,
    },
    skills: {
      ...state.skills,
      points: nextSkillPoints,
    },
  }
  try {
    const assignment = runCanonicalSkillAutoAssignment(candidate)
    if (!assignment.accepted) {
      return rejected(
        state,
        'auto-assignment-rejected',
        cost,
        assignment.reason,
      )
    }
    return purchased(
      assignment.state,
      cost,
      assignment.affectedSkillIds,
    )
  } catch (error) {
    return rejected(
      state,
      'definition-gap',
      cost,
      error instanceof Error ? error.message : String(error),
    )
  }
}

function purchaseRetainedFacility(
  state: CanonicalGameStateV1,
  definition: Readonly<RetainedFacilityDefinition>,
): CanonicalInfinityShopPurchaseResult {
  const cost =
    CANONICAL_INFINITY_SHOP_CONSTANTS.retainedFacilityCost
  if (state.infinity.retainedFacilities[definition.retainedKey]) {
    return rejected(state, 'already-purchased', cost)
  }
  if (
    definition.prerequisite !== null &&
    !state.infinity.retainedFacilities[definition.prerequisite]
  ) {
    return rejected(state, 'prerequisite-not-met', cost)
  }

  const owned = state.dyson.facilities[definition.facilityId]
  if (
    owned === undefined ||
    owned.length !== 2 ||
    !Number.isFinite(owned[0]) ||
    !Number.isFinite(owned[1]) ||
    owned[0] < 0 ||
    owned[1] < 0
  ) {
    return rejected(state, 'invalid-state', cost)
  }
  const nextManual = addContinuous(
    owned[1],
    CANONICAL_INFINITY_SHOP_CONSTANTS.retainedFacilityQuantity,
  )
  if (nextManual <= owned[1]) {
    return rejected(state, 'output-maxed', cost)
  }
  const nextSpent = trySpend(state, cost)
  if (nextSpent === null) {
    return rejected(state, 'insufficient-infinity-points', cost)
  }

  return purchased(
    {
      ...state,
      meta: {
        ...state.meta,
        tutorialComplete: true,
      },
      dyson: {
        ...state.dyson,
        facilities: {
          ...state.dyson.facilities,
          [definition.facilityId]: [
            owned[0],
            nextManual,
          ] as const,
        },
      },
      infinity: {
        ...state.infinity,
        spentPoints: nextSpent,
        retainedFacilities: {
          ...state.infinity.retainedFacilities,
          [definition.retainedKey]: true,
        },
      },
    },
    cost,
  )
}

function purchaseAutomationUnlock(
  state: CanonicalGameStateV1,
  key: keyof CanonicalGameStateV1['infinity']['automationUnlocked'],
): CanonicalInfinityShopPurchaseResult {
  const cost = CANONICAL_INFINITY_SHOP_CONSTANTS.automationCost
  if (state.infinity.automationUnlocked[key]) {
    return rejected(state, 'already-purchased', cost)
  }
  const nextSpent = trySpend(state, cost)
  if (nextSpent === null) {
    return rejected(state, 'insufficient-infinity-points', cost)
  }
  return purchased(
    {
      ...state,
      infinity: {
        ...state.infinity,
        spentPoints: nextSpent,
        automationUnlocked: {
          ...state.infinity.automationUnlocked,
          [key]: true,
        },
      },
    },
    cost,
  )
}

function trySpend(
  state: Readonly<CanonicalGameStateV1>,
  cost: bigint,
): bigint | null {
  if (
    cost <= 0n ||
    availableCanonicalInfinityShopPoints(state) < cost
  ) {
    return null
  }
  const nextSpent = addDiscrete(state.infinity.spentPoints, cost)
  return (
    nextSpent > state.infinity.spentPoints &&
    nextSpent <= state.infinity.points
  )
    ? nextSpent
    : null
}

function hasValidInfinityPointState(
  state: Readonly<CanonicalGameStateV1>,
): boolean {
  const { points, spentPoints } = state.infinity
  return (
    points >= 0n &&
    spentPoints >= 0n &&
    points <= DISCRETE_MAXIMUM &&
    spentPoints <= points
  )
}

function itemCost(itemId: CanonicalInfinityShopItemId): bigint {
  if (itemId === 'secret') {
    return CANONICAL_INFINITY_SHOP_CONSTANTS.secretCost
  }
  if (itemId === 'permanent-skill-point') {
    return CANONICAL_INFINITY_SHOP_CONSTANTS.permanentSkillPointCost
  }
  if (
    itemId === 'unlock-research-automation' ||
    itemId === 'unlock-bot-automation'
  ) {
    return CANONICAL_INFINITY_SHOP_CONSTANTS.automationCost
  }
  return CANONICAL_INFINITY_SHOP_CONSTANTS.retainedFacilityCost
}

function isInfinityShopItemId(
  value: string,
): value is CanonicalInfinityShopItemId {
  return ITEM_ID_SET.has(value)
}

function purchased(
  state: CanonicalGameStateV1,
  cost: bigint,
  autoAssignedSkillIds: readonly string[] = EMPTY_SKILL_IDS,
): CanonicalInfinityShopPurchaseResult {
  return {
    accepted: true,
    changed: true,
    code: 'purchased',
    cost,
    state,
    autoAssignedSkillIds: Object.freeze([
      ...autoAssignedSkillIds,
    ]),
    issue: null,
  }
}

function rejected(
  state: CanonicalGameStateV1,
  code: Exclude<CanonicalInfinityShopPurchaseCode, 'purchased'>,
  cost: bigint,
  issue: string | null = null,
): CanonicalInfinityShopPurchaseResult {
  return {
    accepted: false,
    changed: false,
    code,
    cost,
    state,
    autoAssignedSkillIds: EMPTY_SKILL_IDS,
    issue,
  }
}
