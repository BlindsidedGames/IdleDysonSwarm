import { isFiniteNonNegativeNumber } from '../core/finiteNonNegativeNumber'
import { getGameAsset } from '../game-data/catalog'
import type { CanonicalFacilityId } from '../game-state/types'
import {
  DYSON_FACILITY_IDS,
  isBasicFacility,
  isMegaStructureFacility,
  type BasicDysonFacilityId,
} from './dysonFacilityCatalog'
import {
  buyModeAmount,
  buyXCost,
  isBuyMode,
  maxAffordable,
  tryDebitContinuous,
  type BuyMode,
  type TransactionStatus,
} from './transactions'
import {
  addContinuous,
  divideContinuous,
  floorToDiscrete,
} from './numeric'
import type { SimulationAutomationPolicy } from './types'

export const DYSON_AUTOMATION_TARGETS = DYSON_FACILITY_IDS

const AUTOMATION_TARGET_COUNT = DYSON_AUTOMATION_TARGETS.length
const MAX_MEGA_PURCHASE_QUANTITY = 2_147_483_647n
const MAX_SAFE_PURCHASE_QUANTITY = BigInt(Number.MAX_SAFE_INTEGER)

export type MutableOwnedPair = [automatic: number, manual: number]

export interface DysonAutomationState {
  money: number
  facilities: Record<CanonicalFacilityId, MutableOwnedPair>
  targetIndex: number
  globalEnabled: boolean
  enabledFacilities: Record<CanonicalFacilityId, boolean>
  unlockedFacilities: Record<CanonicalFacilityId, boolean>
  buyMode: BuyMode
  roundedBulkBuy: boolean
  retainedFacilities: Record<BasicDysonFacilityId, boolean>
  assemblyMegaLinesOwned: boolean
  planetModifier?: number
  terraNovaOwned?: boolean
  terraGloriaeOwned?: boolean
}

export type DysonAutomationSkipStatus =
  | 'global-disabled'
  | 'facility-disabled'
  | 'locked'

export type DysonFacilityPurchasePreviewStatus =
  | TransactionStatus
  | DysonAutomationSkipStatus
  | 'definition-gap'
  | 'invalid-state'
  | 'prerequisite-not-met'

export interface DysonAutomationAttempt {
  readonly facilityId: CanonicalFacilityId
  readonly purchased: boolean
  readonly quantity: bigint
  readonly cost: number
  readonly status: DysonFacilityPurchasePreviewStatus
}

/**
 * The exact, non-mutating quote used by both player and automation purchases.
 * `selectedQuantity` is the amount shown for the configured buy mode even
 * when the current balance cannot afford it.
 */
export interface DysonFacilityPurchasePreview<
  TFacilityId extends CanonicalFacilityId = CanonicalFacilityId,
> {
  readonly facilityId: TFacilityId
  readonly eligible: boolean
  readonly selectedQuantity: bigint
  readonly affordableQuantity: bigint
  readonly cost: number
  readonly status: DysonFacilityPurchasePreviewStatus
}

export interface DysonAutomationResult {
  readonly state: DysonAutomationState
  readonly startIndex: number
  readonly nextTargetIndex: number
  readonly attempts: readonly DysonAutomationAttempt[]
}

export interface DysonFacilityPurchaseResult {
  readonly state: DysonAutomationState
  readonly attempt: DysonAutomationAttempt
}

export type DysonFacilityUnlockResolver = (
  facilityId: CanonicalFacilityId,
  currentState: Readonly<DysonAutomationState>,
) => boolean | 'locked' | 'prerequisite-not-met'

export type DysonFacilityDefinitionLookup = (
  facilityId: CanonicalFacilityId,
) =>
  | {
      readonly baseCost: unknown
      readonly costExponent: unknown
    }
  | undefined

export function planDysonAutomationTargets(
  targetIndex: number,
): readonly CanonicalFacilityId[] {
  const start = normalizeTargetIndex(targetIndex)
  return Array.from(
    { length: AUTOMATION_TARGET_COUNT },
    (_, offset) =>
      DYSON_AUTOMATION_TARGETS[
        (start + offset) % AUTOMATION_TARGET_COUNT
      ]!,
  )
}

export function runDysonAutomationTick(
  input: Readonly<DysonAutomationState>,
  policy: SimulationAutomationPolicy = 'preserve-configured-mode',
  resolveUnlock: DysonFacilityUnlockResolver = configuredUnlock,
): DysonAutomationResult {
  const state = cloneState(input)
  const startIndex = normalizeTargetIndex(input.targetIndex)
  const attempts = planDysonAutomationTargets(startIndex).map(
    (facilityId) =>
      attemptFacilityPurchase(state, facilityId, policy, resolveUnlock),
  )
  const nextTargetIndex =
    (startIndex + 1) % AUTOMATION_TARGET_COUNT
  state.targetIndex = nextTargetIndex

  return {
    state,
    startIndex,
    nextTargetIndex,
    attempts,
  }
}

/**
 * Executes one manual facility purchase through the same authored cost and
 * buy-mode transaction used by automation without advancing its rotation.
 */
export function tryPurchaseDysonFacility(
  input: Readonly<DysonAutomationState>,
  facilityId: CanonicalFacilityId,
  resolveUnlock: DysonFacilityUnlockResolver = configuredUnlock,
): DysonFacilityPurchaseResult {
  const state = cloneState(input)
  const attempt = attemptFacilityPurchase(
    state,
    facilityId,
    'preserve-configured-mode',
    resolveUnlock,
  )
  return { state, attempt }
}

/**
 * Quotes one facility purchase without changing the supplied state.
 *
 * Basic facilities preserve Unity's two pricing exceptions: the retained
 * starter ten do not count toward the geometric price level, and the
 * Assembly Megalines skill divides Assembly Line base cost by total Planets.
 * Missing or malformed authored definitions and malformed pricing state fail
 * closed.
 */
export function previewDysonFacilityPurchase<
  TFacilityId extends CanonicalFacilityId,
>(
  state: Readonly<DysonAutomationState>,
  facilityId: TFacilityId,
  policy: SimulationAutomationPolicy = 'preserve-configured-mode',
  resolveUnlock: DysonFacilityUnlockResolver = configuredUnlock,
  lookupDefinition: DysonFacilityDefinitionLookup =
    lookupFacilityDefinition,
): DysonFacilityPurchasePreview<TFacilityId> {
  if (
    typeof state.globalEnabled !== 'boolean' ||
    !hasValidFacilityBooleanFlags(state.enabledFacilities) ||
    !hasValidFacilityBooleanFlags(state.unlockedFacilities) ||
    typeof state.roundedBulkBuy !== 'boolean' ||
    !isBuyMode(state.buyMode) ||
    typeof state.assemblyMegaLinesOwned !== 'boolean' ||
    (state.terraNovaOwned !== undefined &&
      typeof state.terraNovaOwned !== 'boolean') ||
    (state.terraGloriaeOwned !== undefined &&
      typeof state.terraGloriaeOwned !== 'boolean') ||
    (state.planetModifier !== undefined &&
      (!Number.isFinite(state.planetModifier) ||
        state.planetModifier <= 0)) ||
    !hasValidFacilityPairs(state.facilities) ||
    !hasValidRetainedFacilityFlags(state.retainedFacilities)
  ) {
    return purchasePreview(facilityId, 'invalid-state')
  }
  if (!state.globalEnabled) {
    return purchasePreview(facilityId, 'global-disabled')
  }
  if (!state.enabledFacilities[facilityId]) {
    return purchasePreview(facilityId, 'facility-disabled')
  }
  const availability = resolveUnlock(facilityId, state)
  if (availability !== true) {
    return purchasePreview(
      facilityId,
      availability === false ? 'locked' : availability,
    )
  }
  if (
    !Number.isFinite(state.money) ||
    state.money < 0
  ) {
    return purchasePreview(facilityId, 'invalid-balance')
  }

  const ownedPair = state.facilities[facilityId]

  const definition = lookupDefinition(facilityId)
  const authoredBaseCost = definition?.baseCost
  const exponent = definition?.costExponent
  if (
    typeof authoredBaseCost !== 'number' ||
    !Number.isFinite(authoredBaseCost) ||
    authoredBaseCost <= 0 ||
    typeof exponent !== 'number' ||
    !Number.isFinite(exponent) ||
    exponent < 1
  ) {
    return purchasePreview(facilityId, 'definition-gap')
  }

  const effectiveBaseCost = effectiveFacilityBaseCost(
    state,
    facilityId,
    authoredBaseCost,
  )
  if (effectiveBaseCost === null) {
    return purchasePreview(facilityId, 'invalid-state')
  }
  if (effectiveBaseCost <= 0) {
    return purchasePreview(facilityId, 'invalid-cost')
  }

  const manualOwned = ownedPair[1]
  const costLevel = facilityCostLevel(
    state,
    facilityId,
    manualOwned,
  )
  const maximumQuantity = isMegaStructureFacility(facilityId)
    ? MAX_MEGA_PURCHASE_QUANTITY
    : MAX_SAFE_PURCHASE_QUANTITY
  const affordableQuantity = minBigInt(
    maxAffordable(
      state.money,
      effectiveBaseCost,
      exponent,
      costLevel,
    ),
    maximumQuantity,
  )
  const mode =
    policy === 'force-buy-max' ? 'buy-max' : state.buyMode
  const selectedQuantity = minBigInt(
    buyModeAmount(
      mode,
      state.roundedBulkBuy,
      floorToDiscrete(manualOwned),
      affordableQuantity,
    ),
    maximumQuantity,
  )
  if (selectedQuantity <= 0n) {
    return purchasePreview(
      facilityId,
      'invalid-quantity',
      selectedQuantity,
      affordableQuantity,
    )
  }

  const cost = buyXCost(
    selectedQuantity,
    effectiveBaseCost,
    exponent,
    costLevel,
  )
  const nextOwned = addContinuous(
    manualOwned,
    Number(selectedQuantity),
  )
  if (nextOwned <= manualOwned) {
    return purchasePreview(
      facilityId,
      'output-maxed',
      selectedQuantity,
      affordableQuantity,
      cost,
    )
  }

  const debit = tryDebitContinuous(
    state.money,
    cost,
    selectedQuantity,
  )
  return purchasePreview(
    facilityId,
    debit.status,
    selectedQuantity,
    affordableQuantity,
    cost,
  )
}

function attemptFacilityPurchase(
  state: DysonAutomationState,
  facilityId: CanonicalFacilityId,
  policy: SimulationAutomationPolicy,
  resolveUnlock: DysonFacilityUnlockResolver,
): DysonAutomationAttempt {
  const preview = previewDysonFacilityPurchase(
    state,
    facilityId,
    policy,
    resolveUnlock,
  )
  if (!preview.eligible) {
    return {
      facilityId,
      purchased: false,
      quantity: 0n,
      cost: preview.cost,
      status: preview.status,
    }
  }

  const owned = state.facilities[facilityId][1]
  const debit = tryDebitContinuous(
    state.money,
    preview.cost,
    preview.selectedQuantity,
  )
  if (debit.status !== 'success') {
    return {
      ...failedAttempt(facilityId, debit.status),
      cost: preview.cost,
    }
  }

  state.money = debit.balance
  state.facilities[facilityId][1] = addContinuous(
    owned,
    Number(preview.selectedQuantity),
  )
  return {
    facilityId,
    purchased: true,
    quantity: preview.selectedQuantity,
    cost: preview.cost,
    status: 'success',
  }
}

function configuredUnlock(
  facilityId: CanonicalFacilityId,
  state: Readonly<DysonAutomationState>,
): boolean {
  return state.unlockedFacilities[facilityId]
}

function normalizeTargetIndex(targetIndex: number): number {
  if (!Number.isFinite(targetIndex)) return 0
  const integer = Math.trunc(targetIndex)
  return (
    (integer % AUTOMATION_TARGET_COUNT) +
    AUTOMATION_TARGET_COUNT
  ) % AUTOMATION_TARGET_COUNT
}

function facilityCostLevel(
  state: Readonly<DysonAutomationState>,
  facilityId: CanonicalFacilityId,
  manualOwned: number,
): number {
  return (
    isBasicFacility(facilityId) &&
    state.retainedFacilities[facilityId]
  )
    ? Math.max(0, manualOwned - 10)
    : manualOwned
}

function effectiveFacilityBaseCost(
  state: Readonly<DysonAutomationState>,
  facilityId: CanonicalFacilityId,
  authoredBaseCost: number,
): number | null {
  let effective = authoredBaseCost
  if (
    facilityId === 'planets' &&
    (state.terraNovaOwned || state.terraGloriaeOwned)
  ) {
    const planets = state.facilities.planets
    if (!isValidOwnedPair(planets)) return null
    const totalPlanets = addContinuous(planets[0], planets[1])
    if (totalPlanets <= 0) return effective
    if (state.terraNovaOwned) {
      effective = divideContinuous(effective, state.planetModifier ?? 1)
      if (effective <= 0) return null
    }
    if (state.terraGloriaeOwned) {
      effective = divideContinuous(effective, totalPlanets)
      if (effective <= 0) return null
    }
    return effective
  }
  if (facilityId !== 'assembly_lines' || !state.assemblyMegaLinesOwned) {
    return effective
  }

  const planets = state.facilities.planets
  if (!isValidOwnedPair(planets)) return null
  const totalPlanets = addContinuous(planets[0], planets[1])
  if (totalPlanets <= 0) return effective
  const discounted = divideContinuous(effective, totalPlanets)
  return discounted > 0 ? discounted : null
}

function hasValidRetainedFacilityFlags(
  retained: Readonly<Record<BasicDysonFacilityId, boolean>>,
): boolean {
  return (
    retained !== null &&
    typeof retained === 'object' &&
    [
      'assembly_lines',
      'ai_managers',
      'servers',
      'data_centers',
      'planets',
    ].every(
      (facilityId) =>
        typeof retained[facilityId as BasicDysonFacilityId] ===
        'boolean',
    )
  )
}

function hasValidFacilityBooleanFlags(
  flags: Readonly<Record<CanonicalFacilityId, boolean>>,
): boolean {
  return (
    flags !== null &&
    typeof flags === 'object' &&
    DYSON_AUTOMATION_TARGETS.every(
      (facilityId) => typeof flags[facilityId] === 'boolean',
    )
  )
}

function hasValidFacilityPairs(
  facilities: Readonly<
    Record<CanonicalFacilityId, readonly number[]>
  >,
): boolean {
  return (
    facilities !== null &&
    typeof facilities === 'object' &&
    DYSON_AUTOMATION_TARGETS.every((facilityId) =>
      isValidOwnedPair(facilities[facilityId]),
    )
  )
}

function isValidOwnedPair(
  pair: readonly number[] | undefined,
): pair is readonly [number, number] {
  return (
    Array.isArray(pair) &&
    pair.length === 2 &&
    pair.every(isFiniteNonNegativeNumber)
  )
}

function lookupFacilityDefinition(
  facilityId: CanonicalFacilityId,
): ReturnType<DysonFacilityDefinitionLookup> {
  const definition = getGameAsset(
    'GameData.FacilityDefinition',
    facilityId,
  )
  if (definition === undefined) return undefined
  return {
    baseCost: definition.data.baseCost,
    costExponent: definition.data.costExponent,
  }
}

function purchasePreview<
  TFacilityId extends CanonicalFacilityId,
>(
  facilityId: TFacilityId,
  status: DysonFacilityPurchasePreviewStatus,
  selectedQuantity = 0n,
  affordableQuantity = 0n,
  cost = 0,
): DysonFacilityPurchasePreview<TFacilityId> {
  return Object.freeze({
    facilityId,
    eligible: status === 'success',
    selectedQuantity,
    affordableQuantity,
    cost,
    status,
  })
}

function minBigInt(left: bigint, right: bigint): bigint {
  return left < right ? left : right
}

function failedAttempt(
  facilityId: CanonicalFacilityId,
  status: DysonFacilityPurchasePreviewStatus,
): DysonAutomationAttempt {
  return {
    facilityId,
    purchased: false,
    quantity: 0n,
    cost: 0,
    status,
  }
}

function cloneState(
  state: Readonly<DysonAutomationState>,
): DysonAutomationState {
  return {
    money: state.money,
    facilities: Object.fromEntries(
      DYSON_AUTOMATION_TARGETS.map((facilityId) => [
        facilityId,
        [...state.facilities[facilityId]],
      ]),
    ) as Record<CanonicalFacilityId, MutableOwnedPair>,
    targetIndex: state.targetIndex,
    globalEnabled: state.globalEnabled,
    enabledFacilities: { ...state.enabledFacilities },
    unlockedFacilities: { ...state.unlockedFacilities },
    buyMode: state.buyMode,
    roundedBulkBuy: state.roundedBulkBuy,
    retainedFacilities: { ...state.retainedFacilities },
    assemblyMegaLinesOwned: state.assemblyMegaLinesOwned,
    planetModifier: state.planetModifier,
    terraNovaOwned: state.terraNovaOwned,
    terraGloriaeOwned: state.terraGloriaeOwned,
  }
}
