import { getGameAssetsByKind } from '../game-data/catalog'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { addDiscrete, DISCRETE_MAXIMUM } from './numeric'

const QUANTUM_UPGRADE_KIND =
  'IdleDysonSwarm.Data.QuantumUpgradeDefinition'

export const QUANTUM_CONSTANTS = Object.freeze({
  infinityPointsPerQuantumPoint: 42n,
  secretsPerPurchase: 3n,
  maximumSecrets: 27n,
  influenceSpeedPerPurchase: 4n,
  maximumDivisions: 19n,
})

export const QUANTUM_UPGRADE_IDS = [
  'BotMultitasking',
  'DoubleIP',
  'BreakTheLoop',
  'QuantumEntanglement',
  'Automation',
  'Secrets',
  'Division',
  'Avocado',
  'Fragments',
  'Purity',
  'Terra',
  'Power',
  'Paragade',
  'Stellar',
  'InfluenceSpeed',
  'CashBonus',
  'ScienceBonus',
  'MatrioshkaBrains',
  'BirchPlanets',
  'GalacticBrains',
] as const

export type QuantumUpgradeId =
  (typeof QUANTUM_UPGRADE_IDS)[number]

export type QuantumUpgradeSectionId =
  | 'core'
  | 'skill-paths'
  | 'boosters'
  | 'cosmic-structures'
  | 'avocato'

export type QuantumUpgradeRevealRequirement =
  | { readonly kind: 'points-earned'; readonly value: bigint }
  | { readonly kind: 'upgrade-owned'; readonly upgradeId: QuantumUpgradeId }

export interface QuantumUpgradeSectionPreview {
  readonly sectionId: QuantumUpgradeSectionId
  readonly upgradeIds: readonly QuantumUpgradeId[]
  readonly revealed: boolean
  readonly revealRequirement: QuantumUpgradeRevealRequirement | null
}

const QUANTUM_UPGRADE_SECTION_DEFINITIONS = Object.freeze([
  {
    sectionId: 'core',
    upgradeIds: [
      'DoubleIP',
      'BotMultitasking',
      'Automation',
      'BreakTheLoop',
      'Secrets',
      'Division',
      'QuantumEntanglement',
    ],
    revealRequirement: null,
  },
  {
    sectionId: 'skill-paths',
    upgradeIds: [
      'Fragments',
      'Purity',
      'Terra',
      'Power',
      'Paragade',
      'Stellar',
    ],
    revealRequirement: { kind: 'points-earned', value: 3n },
  },
  {
    sectionId: 'boosters',
    upgradeIds: ['InfluenceSpeed', 'CashBonus', 'ScienceBonus'],
    revealRequirement: { kind: 'points-earned', value: 6n },
  },
  {
    sectionId: 'cosmic-structures',
    upgradeIds: ['MatrioshkaBrains', 'BirchPlanets', 'GalacticBrains'],
    revealRequirement: {
      kind: 'upgrade-owned',
      upgradeId: 'BreakTheLoop',
    },
  },
  {
    sectionId: 'avocato',
    upgradeIds: ['Avocado'],
    revealRequirement: { kind: 'points-earned', value: 20n },
  },
] as const satisfies readonly {
  readonly sectionId: QuantumUpgradeSectionId
  readonly upgradeIds: readonly QuantumUpgradeId[]
  readonly revealRequirement: QuantumUpgradeRevealRequirement | null
}[])

export interface QuantumUpgradeDefinition {
  readonly id: QuantumUpgradeId
  readonly baseCost: bigint
  readonly costScaling: 'flat' | 'exponential'
  readonly repeatable: boolean
  readonly maximumPurchases: bigint | null
  readonly source: 'unity-asset' | 'unity-fallback'
}

export type QuantumUpgradePurchaseCode =
  | 'purchased'
  | 'invalid-quantity'
  | 'unknown-upgrade'
  | 'already-maxed'
  | 'prerequisites-not-met'
  | 'insufficient-points'
  | 'state-saturated'

export interface QuantumUpgradePurchaseResult {
  readonly accepted: boolean
  readonly changed: boolean
  readonly code: QuantumUpgradePurchaseCode
  readonly cost: bigint
  readonly state: CanonicalGameStateV1
}

export type QuantumUpgradeBulkQuantity = bigint | 'max'

export const QUANTUM_BULK_UPGRADE_IDS = Object.freeze([
  'InfluenceSpeed',
  'CashBonus',
  'ScienceBonus',
] as const satisfies readonly QuantumUpgradeId[])

const QUANTUM_BULK_UPGRADE_ID_SET = new Set<QuantumUpgradeId>(
  QUANTUM_BULK_UPGRADE_IDS,
)

const QUANTUM_UPGRADE_ID_SET = new Set<string>(
  QUANTUM_UPGRADE_IDS,
)

const FALLBACK_COSTS: Readonly<
  Record<QuantumUpgradeId, bigint>
> = Object.freeze({
  BotMultitasking: 1n,
  DoubleIP: 1n,
  BreakTheLoop: 6n,
  QuantumEntanglement: 12n,
  Automation: 1n,
  Secrets: 1n,
  Division: 2n,
  Avocado: 42n,
  Fragments: 2n,
  Purity: 3n,
  Terra: 2n,
  Power: 2n,
  Paragade: 1n,
  Stellar: 4n,
  InfluenceSpeed: 1n,
  CashBonus: 1n,
  ScienceBonus: 1n,
  MatrioshkaBrains: 5n,
  BirchPlanets: 10n,
  GalacticBrains: 20n,
})

const ONE_TIME_IDS = new Set<QuantumUpgradeId>([
  'BotMultitasking',
  'DoubleIP',
  'BreakTheLoop',
  'QuantumEntanglement',
  'Automation',
  'Avocado',
  'Fragments',
  'Purity',
  'Terra',
  'Power',
  'Paragade',
  'Stellar',
  'MatrioshkaBrains',
  'BirchPlanets',
  'GalacticBrains',
])

export const QUANTUM_UPGRADE_DEFINITIONS: ReadonlyMap<
  QuantumUpgradeId,
  QuantumUpgradeDefinition
> = loadQuantumUpgradeDefinitions()

/**
 * Returns total minus spent exactly like QuantumService.AvailablePoints.
 * Corrupt overspent state exposes zero rather than a negative balance.
 */
export function availableQuantumPoints(
  state: Readonly<CanonicalGameStateV1>,
): bigint {
  return state.quantum.pointsEarned >= state.quantum.pointsSpent
    ? state.quantum.pointsEarned - state.quantum.pointsSpent
    : 0n
}

/**
 * Resolves the next authored cost. Unity uses the database when an entry
 * exists and the hard-coded compatibility table for the three mega unlocks.
 */
export function quantumUpgradeCost(
  state: Readonly<CanonicalGameStateV1>,
  id: QuantumUpgradeId,
  definitions = QUANTUM_UPGRADE_DEFINITIONS,
): bigint {
  if (id === 'DoubleIP') return 0n
  const definition = definitions.get(id)
  if (definition === undefined) return DISCRETE_MAXIMUM
  const purchases = quantumUpgradePurchaseCount(state, id)
  if (definition.costScaling === 'flat' || purchases === 0n) {
    return definition.baseCost
  }
  if (purchases >= 63n) return DISCRETE_MAXIMUM
  const cost = definition.baseCost << purchases
  return cost > DISCRETE_MAXIMUM ? DISCRETE_MAXIMUM : cost
}

/**
 * Applies one QuantumService.TryPurchaseUpgrade transaction immutably.
 * Effects and the spent-points debit either both commit or neither commits.
 */
export function purchaseQuantumUpgrade(
  state: Readonly<CanonicalGameStateV1>,
  id: string,
  definitions = QUANTUM_UPGRADE_DEFINITIONS,
): QuantumUpgradePurchaseResult {
  if (!isQuantumUpgradeId(id) || !definitions.has(id)) {
    return rejected(state, 'unknown-upgrade', 0n)
  }
  const definition = definitions.get(id)!
  const purchases = quantumUpgradePurchaseCount(state, id)
  if (
    (definition.maximumPurchases !== null &&
      purchases >= definition.maximumPurchases) ||
    (ONE_TIME_IDS.has(id) && purchases >= 1n)
  ) {
    return rejected(state, 'already-maxed', 0n)
  }
  if (!quantumUpgradePrerequisitesMet(state, id)) {
    return rejected(state, 'prerequisites-not-met', 0n)
  }

  const cost = quantumUpgradeCost(state, id, definitions)
  if (
    cost < 0n ||
    cost === DISCRETE_MAXIMUM ||
    availableQuantumPoints(state) < cost
  ) {
    return rejected(state, 'insufficient-points', cost)
  }
  const nextSpent = cost === 0n
    ? state.quantum.pointsSpent
    : addDiscrete(state.quantum.pointsSpent, cost)
  if (cost > 0n && nextSpent <= state.quantum.pointsSpent) {
    return rejected(state, 'state-saturated', cost)
  }

  const effected = applyQuantumUpgradeEffect(state, id)
  if (effected === null) {
    return rejected(state, 'state-saturated', cost)
  }
  return {
    accepted: true,
    changed: true,
    code: 'purchased',
    cost,
    state: {
      ...effected,
      quantum: {
        ...effected.quantum,
        pointsSpent: nextSpent,
      },
    },
  }
}

/**
 * Applies one atomic bulk purchase for the three authored repeatable boosters.
 * Fixed quantities are all-or-nothing; `max` resolves against both the
 * available shard balance and discrete-state headroom without replaying
 * individual purchases.
 */
export function purchaseQuantumUpgradeBulk(
  state: Readonly<CanonicalGameStateV1>,
  id: string,
  requestedQuantity: QuantumUpgradeBulkQuantity,
  definitions = QUANTUM_UPGRADE_DEFINITIONS,
): QuantumUpgradePurchaseResult {
  if (requestedQuantity === 1n) {
    return purchaseQuantumUpgrade(state, id, definitions)
  }
  if (
    !isQuantumUpgradeId(id) ||
    !isQuantumBulkUpgradeId(id) ||
    !definitions.has(id)
  ) {
    return rejected(state, 'unknown-upgrade', 0n)
  }
  if (requestedQuantity !== 'max' && requestedQuantity <= 0n) {
    return rejected(state, 'invalid-quantity', 0n)
  }
  if (!quantumUpgradePrerequisitesMet(state, id)) {
    return rejected(state, 'prerequisites-not-met', 0n)
  }

  const definition = definitions.get(id)!
  const unitCost = quantumUpgradeCost(state, id, definitions)
  if (
    definition.costScaling !== 'flat' ||
    unitCost <= 0n ||
    unitCost === DISCRETE_MAXIMUM
  ) {
    return rejected(state, 'insufficient-points', unitCost)
  }

  const affordableQuantity = availableQuantumPoints(state) / unitCost
  const stateQuantity = quantumUpgradeStateHeadroom(state, id)
  const spentQuantity =
    (DISCRETE_MAXIMUM - state.quantum.pointsSpent) / unitCost
  const maximumQuantity = minimum(
    affordableQuantity,
    minimum(stateQuantity, spentQuantity),
  )
  const quantity =
    requestedQuantity === 'max' ? maximumQuantity : requestedQuantity
  const totalCost = unitCost * quantity
  if (quantity <= 0n || quantity > affordableQuantity) {
    return rejected(state, 'insufficient-points', totalCost)
  }
  if (quantity > stateQuantity || quantity > spentQuantity) {
    return rejected(state, 'state-saturated', totalCost)
  }

  const effected = applyQuantumUpgradeBulkEffect(state, id, quantity)
  if (effected === null) {
    return rejected(state, 'state-saturated', totalCost)
  }
  return {
    accepted: true,
    changed: true,
    code: 'purchased',
    cost: totalCost,
    state: {
      ...effected,
      quantum: {
        ...effected.quantum,
        pointsSpent: state.quantum.pointsSpent + totalCost,
      },
    },
  }
}

/**
 * Encodes the actual QuantumUpgradeUI access graph rather than relying on a
 * future frontend to reproduce it correctly.
 */
export function quantumUpgradePrerequisitesMet(
  state: Readonly<CanonicalGameStateV1>,
  id: QuantumUpgradeId,
): boolean {
  if (id === 'BirchPlanets') {
    return state.quantum.unlocks.matrioshkaBrains
  }
  if (id === 'GalacticBrains') {
    return (
      state.quantum.unlocks.matrioshkaBrains &&
      state.quantum.unlocks.birchPlanets
    )
  }
  return true
}

export function previewQuantumUpgradeSections(
  state: Readonly<CanonicalGameStateV1>,
): readonly QuantumUpgradeSectionPreview[] {
  return QUANTUM_UPGRADE_SECTION_DEFINITIONS.map((definition) => {
    const requirement = definition.revealRequirement
    const revealed = requirement === null || (
      requirement.kind === 'points-earned'
        ? state.quantum.pointsEarned >= requirement.value
        : isOneTimeOwned(state, requirement.upgradeId)
    )
    return {
      sectionId: definition.sectionId,
      upgradeIds: definition.upgradeIds,
      revealed,
      revealRequirement: requirement,
    }
  })
}

export function quantumUpgradePurchaseCount(
  state: Readonly<CanonicalGameStateV1>,
  id: QuantumUpgradeId,
): bigint {
  switch (id) {
    case 'Division':
      return state.quantum.divisionsPurchased
    case 'Secrets':
      return (
        state.quantum.permanentSecrets /
        QUANTUM_CONSTANTS.secretsPerPurchase
      )
    case 'InfluenceSpeed':
      return (
        state.quantum.influenceSpeedBonus /
        QUANTUM_CONSTANTS.influenceSpeedPerPurchase
      )
    case 'CashBonus':
      return state.quantum.cashBonusLevels
    case 'ScienceBonus':
      return state.quantum.scienceBonusLevels
    default:
      return isOneTimeOwned(state, id) ? 1n : 0n
  }
}

/**
 * Reports authored/fallback coverage for every QuantumService enum member.
 */
export function findQuantumUpgradeCanonicalGaps(
  definitions = QUANTUM_UPGRADE_DEFINITIONS,
): readonly QuantumUpgradeId[] {
  return QUANTUM_UPGRADE_IDS.filter((id) => !definitions.has(id))
}

function applyQuantumUpgradeEffect(
  state: Readonly<CanonicalGameStateV1>,
  id: QuantumUpgradeId,
): CanonicalGameStateV1 | null {
  if (id === 'Secrets') {
    if (
      state.quantum.permanentSecrets >=
      QUANTUM_CONSTANTS.maximumSecrets
    ) {
      return null
    }
    const permanent = minimum(
      addDiscrete(
        state.quantum.permanentSecrets,
        QUANTUM_CONSTANTS.secretsPerPurchase,
      ),
      QUANTUM_CONSTANTS.maximumSecrets,
    )
    const session = minimum(
      addDiscrete(
        state.infinity.secretsOfTheUniverse,
        QUANTUM_CONSTANTS.secretsPerPurchase,
      ),
      QUANTUM_CONSTANTS.maximumSecrets,
    )
    return {
      ...state,
      quantum: { ...state.quantum, permanentSecrets: permanent },
      infinity: { ...state.infinity, secretsOfTheUniverse: session },
    }
  }
  if (id === 'Division') {
    if (
      state.quantum.divisionsPurchased >=
      QUANTUM_CONSTANTS.maximumDivisions
    ) {
      return null
    }
    const value = addDiscrete(state.quantum.divisionsPurchased, 1n)
    if (value <= state.quantum.divisionsPurchased) return null
    return {
      ...state,
      quantum: { ...state.quantum, divisionsPurchased: value },
    }
  }
  if (id === 'InfluenceSpeed') {
    const value = addDiscrete(
      state.quantum.influenceSpeedBonus,
      QUANTUM_CONSTANTS.influenceSpeedPerPurchase,
    )
    if (value <= state.quantum.influenceSpeedBonus) return null
    return {
      ...state,
      quantum: { ...state.quantum, influenceSpeedBonus: value },
    }
  }
  if (id === 'CashBonus' || id === 'ScienceBonus') {
    const key =
      id === 'CashBonus'
        ? 'cashBonusLevels'
        : 'scienceBonusLevels'
    const value = addDiscrete(state.quantum[key], 1n)
    if (value <= state.quantum[key]) return null
    return {
      ...state,
      quantum: { ...state.quantum, [key]: value },
    }
  }
  if (id === 'Avocado') {
    return {
      ...state,
      avocado: { ...state.avocado, unlocked: true },
    }
  }
  if (id === 'Automation') {
    return {
      ...state,
      quantum: {
        ...state.quantum,
        unlocks: { ...state.quantum.unlocks, automation: true },
      },
      infinity: {
        ...state.infinity,
        automationUnlocked: { research: true, bots: true },
      },
    }
  }

  const unlockKey = unlockKeyFor(id)
  if (unlockKey === null) return null
  return {
    ...state,
    quantum: {
      ...state.quantum,
      unlocks: {
        ...state.quantum.unlocks,
        [unlockKey]: true,
      },
    },
  }
}

function quantumUpgradeStateHeadroom(
  state: Readonly<CanonicalGameStateV1>,
  id: (typeof QUANTUM_BULK_UPGRADE_IDS)[number],
): bigint {
  if (id === 'InfluenceSpeed') {
    return (
      (DISCRETE_MAXIMUM - state.quantum.influenceSpeedBonus) /
      QUANTUM_CONSTANTS.influenceSpeedPerPurchase
    )
  }
  const current = id === 'CashBonus'
    ? state.quantum.cashBonusLevels
    : state.quantum.scienceBonusLevels
  return DISCRETE_MAXIMUM - current
}

function applyQuantumUpgradeBulkEffect(
  state: Readonly<CanonicalGameStateV1>,
  id: (typeof QUANTUM_BULK_UPGRADE_IDS)[number],
  quantity: bigint,
): CanonicalGameStateV1 | null {
  if (id === 'InfluenceSpeed') {
    const increase = quantity * QUANTUM_CONSTANTS.influenceSpeedPerPurchase
    const value = state.quantum.influenceSpeedBonus + increase
    if (value > DISCRETE_MAXIMUM) return null
    return {
      ...state,
      quantum: { ...state.quantum, influenceSpeedBonus: value },
    }
  }
  const key = id === 'CashBonus' ? 'cashBonusLevels' : 'scienceBonusLevels'
  const value = state.quantum[key] + quantity
  if (value > DISCRETE_MAXIMUM) return null
  return {
    ...state,
    quantum: { ...state.quantum, [key]: value },
  }
}

function unlockKeyFor(
  id: QuantumUpgradeId,
): keyof CanonicalGameStateV1['quantum']['unlocks'] | null {
  switch (id) {
    case 'BotMultitasking':
      return 'botMultitasking'
    case 'DoubleIP':
      return 'doubleInfinityPoints'
    case 'BreakTheLoop':
      return 'breakTheLoop'
    case 'QuantumEntanglement':
      return 'quantumEntanglement'
    case 'Fragments':
      return 'fragments'
    case 'Purity':
      return 'purity'
    case 'Terra':
      return 'terra'
    case 'Power':
      return 'power'
    case 'Paragade':
      return 'paragade'
    case 'Stellar':
      return 'stellar'
    case 'MatrioshkaBrains':
      return 'matrioshkaBrains'
    case 'BirchPlanets':
      return 'birchPlanets'
    case 'GalacticBrains':
      return 'galacticBrains'
    default:
      return null
  }
}

function isOneTimeOwned(
  state: Readonly<CanonicalGameStateV1>,
  id: QuantumUpgradeId,
): boolean {
  if (id === 'Avocado') return state.avocado.unlocked
  if (id === 'Automation') return state.quantum.unlocks.automation
  const key = unlockKeyFor(id)
  return key === null ? false : state.quantum.unlocks[key]
}

function loadQuantumUpgradeDefinitions(): ReadonlyMap<
  QuantumUpgradeId,
  QuantumUpgradeDefinition
> {
  const definitions = new Map<
    QuantumUpgradeId,
    QuantumUpgradeDefinition
  >()
  for (const asset of getGameAssetsByKind(QUANTUM_UPGRADE_KIND)) {
    const data = asset.data
    if (
      typeof data.id !== 'string' ||
      !isQuantumUpgradeId(data.id) ||
      typeof data.baseCost !== 'number' ||
      !Number.isSafeInteger(data.baseCost) ||
      data.baseCost <= 0 ||
      (data.costScaling !== 0 && data.costScaling !== 1) ||
      typeof data.maxPurchases !== 'number' ||
      !Number.isSafeInteger(data.maxPurchases) ||
      data.maxPurchases < 0
    ) {
      continue
    }
    definitions.set(data.id, {
      id: data.id,
      baseCost: BigInt(data.baseCost),
      costScaling:
        data.costScaling === 1 ? 'exponential' : 'flat',
      repeatable: Boolean(data.isRepeatable),
      maximumPurchases:
        data.maxPurchases > 0 ? BigInt(data.maxPurchases) : null,
      source: 'unity-asset',
    })
  }
  for (const id of QUANTUM_UPGRADE_IDS) {
    if (definitions.has(id)) continue
    definitions.set(id, {
      id,
      baseCost: FALLBACK_COSTS[id],
      costScaling: id === 'Division' ? 'exponential' : 'flat',
      repeatable: !ONE_TIME_IDS.has(id),
      maximumPurchases:
        id === 'Division'
          ? QUANTUM_CONSTANTS.maximumDivisions
          : id === 'Secrets'
            ? 9n
            : ONE_TIME_IDS.has(id)
              ? 1n
              : null,
      source: 'unity-fallback',
    })
  }
  return definitions
}

function isQuantumUpgradeId(value: string): value is QuantumUpgradeId {
  return QUANTUM_UPGRADE_ID_SET.has(value)
}

function isQuantumBulkUpgradeId(
  value: QuantumUpgradeId,
): value is (typeof QUANTUM_BULK_UPGRADE_IDS)[number] {
  return QUANTUM_BULK_UPGRADE_ID_SET.has(value)
}

function minimum(left: bigint, right: bigint): bigint {
  return left < right ? left : right
}

function rejected(
  state: Readonly<CanonicalGameStateV1>,
  code: Exclude<QuantumUpgradePurchaseCode, 'purchased'>,
  cost: bigint,
): QuantumUpgradePurchaseResult {
  return {
    accepted: false,
    changed: false,
    code,
    cost,
    state,
  }
}
