import { getGameAsset, getGameAssetsByKind } from '../game-data/catalog'
import type { CanonicalFacilityId } from '../game-state/types'
import type { CanonicalGameStateV2 } from '../game-state/typesV2'
import {
  GAME_DECIMAL_ONE,
  GAME_DECIMAL_ZERO,
  addGameDecimals,
  cloneGameDecimal,
  compareGameDecimals,
  divideGameDecimals,
  equalGameDecimals,
  gameDecimalFromNumber,
  isGameDecimal,
  isIntegerGameDecimal,
  isZeroGameDecimal,
  subtractGameDecimals,
  type GameDecimal,
} from '../math/gameDecimal'
import type { BasicDysonFacilityId } from './dysonFacilities'
import {
  commitV2Purchase,
  exponentialCostV2,
  geometricSeriesCostV2,
  quoteV2FixedPriceBuyMax,
  quoteV2GeometricBuyMax,
  quoteV2Purchase,
  selectV2PurchaseBatches,
  type V2PurchaseCommitResult,
  type V2PurchaseMode,
  type V2PurchaseQuote,
  type V2PurchaseRejection,
} from './transactionsV2'

export const DYSON_V2_COMMAND_TARGETS = Object.freeze([
  'assembly_lines',
  'ai_managers',
  'servers',
  'data_centers',
  'planets',
  'matrioshka_brains',
  'birch_planets',
  'galactic_brains',
] as const satisfies readonly CanonicalFacilityId[])

export type DysonV2CommandFacilityId =
  (typeof DYSON_V2_COMMAND_TARGETS)[number]

export type DysonV2AutomationPolicy =
  | 'preserve-configured-mode'
  | 'force-buy-max'

export type DysonV2QuoteStatus =
  | 'ready'
  | 'global-disabled'
  | 'facility-disabled'
  | 'locked'
  | 'prerequisite-not-met'
  | 'catalog-gap'
  | 'invalid-state'
  | V2PurchaseRejection

export interface DysonV2FacilityPurchaseQuote {
  readonly kind: 'dyson-v2-facility-purchase-quote'
  readonly facilityId: DysonV2CommandFacilityId
  readonly sourceRevision: number
  readonly requestedMode: V2PurchaseMode
  readonly roundedBulkBuy: boolean
  readonly automated: boolean
  readonly eligible: boolean
  readonly changed: boolean
  readonly status: DysonV2QuoteStatus
  readonly batches: GameDecimal
  readonly unitsGranted: GameDecimal
  readonly quotedCost: GameDecimal
  readonly debitedAmount: GameDecimal
  readonly transactionQuote: V2PurchaseQuote | null
}

export interface DysonV2FacilityPurchaseResult {
  readonly accepted: boolean
  readonly purchased: boolean
  readonly changed: boolean
  readonly status: DysonV2QuoteStatus
  readonly revision: number
  readonly state: CanonicalGameStateV2
  readonly facilityId: DysonV2CommandFacilityId | null
  readonly requestedMode: V2PurchaseMode | null
  readonly batches: GameDecimal
  readonly quotedCost: GameDecimal
  readonly debitedAmount: GameDecimal
  readonly unitsGranted: GameDecimal
}

export interface DysonV2AutomationAttempt {
  readonly facilityId: DysonV2CommandFacilityId
  readonly quote: DysonV2FacilityPurchaseQuote
  readonly result: DysonV2FacilityPurchaseResult
}

export interface DysonV2AutomationResult {
  readonly state: CanonicalGameStateV2
  readonly revision: number
  readonly changed: boolean
  readonly startIndex: number
  readonly nextTargetIndex: number
  readonly attempts: readonly DysonV2AutomationAttempt[]
}

type FacilityRule = Readonly<{
  facilityId: DysonV2CommandFacilityId
  group: 0 | 2
  prerequisiteFacilityId: DysonV2CommandFacilityId | null
  prerequisiteOwned: number
  quantumGate: 0 | 1 | 2 | 3
}>

type FacilityDefinition = Readonly<{
  facilityId: DysonV2CommandFacilityId
  baseCost: number
  costExponent: number
}>

type CatalogContract = Readonly<{
  valid: boolean
  definitions: ReadonlyMap<DysonV2CommandFacilityId, FacilityDefinition>
  rules: ReadonlyMap<DysonV2CommandFacilityId, FacilityRule>
}>

type QuoteDescriptor = Readonly<{
  facilityId: DysonV2CommandFacilityId
  requestedMode: V2PurchaseMode
  roundedBulkBuy: boolean
  automated: boolean
}>

const BASIC_IDS = new Set<DysonV2CommandFacilityId>([
  'assembly_lines',
  'ai_managers',
  'servers',
  'data_centers',
  'planets',
])
const PURCHASE_MODES = new Set<V2PurchaseMode>([
  'buy-1',
  'buy-10',
  'buy-50',
  'buy-100',
  'buy-max',
])
const quoteDescriptors = new WeakMap<
  DysonV2FacilityPurchaseQuote,
  QuoteDescriptor
>()

export function quoteV2DysonFacilityPurchase(
  state: CanonicalGameStateV2,
  sourceRevision: number,
  facilityId: DysonV2CommandFacilityId,
  requestedMode: V2PurchaseMode = state.dyson.automation.buyMode,
  roundedBulkBuy: boolean = state.dyson.automation.roundedBulkBuy,
): DysonV2FacilityPurchaseQuote {
  return registerQuote(buildQuote(
    state,
    sourceRevision,
    facilityId,
    requestedMode,
    roundedBulkBuy,
    false,
  ))
}

export function commitV2DysonFacilityPurchase(
  quote: DysonV2FacilityPurchaseQuote,
  state: CanonicalGameStateV2,
  currentRevision: number,
): DysonV2FacilityPurchaseResult {
  if (quote === null || typeof quote !== 'object') {
    return rejectedResult(state, currentRevision, 'quote-rejected')
  }
  const descriptor = quoteDescriptors.get(quote)
  if (descriptor === undefined) {
    return rejectedResult(state, currentRevision, 'quote-rejected')
  }

  const authoritative = buildQuote(
    state,
    currentRevision,
    descriptor.facilityId,
    descriptor.requestedMode,
    descriptor.roundedBulkBuy,
    descriptor.automated,
  )
  if (!equivalentQuotes(quote, authoritative)) {
    return rejectedResult(
      state,
      currentRevision,
      currentRevision === quote.sourceRevision
        ? 'state-mismatch'
        : 'stale-revision',
      quote,
    )
  }
  if (quote.transactionQuote === null) {
    return rejectedResult(
      state,
      currentRevision,
      quote.status,
      quote,
    )
  }

  const committed = commitV2Purchase(quote.transactionQuote, {
    revision: currentRevision,
    balance: state.dyson.money,
    output: state.dyson.facilities[descriptor.facilityId][1],
  })
  if (!committed.accepted) {
    return rejectedResult(
      state,
      currentRevision,
      committed.rejection,
      quote,
      committed,
    )
  }
  const candidate = committed.changed
    ? replacePurchasedFacility(state, descriptor.facilityId, committed)
    : state
  return Object.freeze({
    accepted: true,
    purchased: true,
    changed: committed.changed,
    status: 'ready' as const,
    revision: committed.revision,
    state: candidate,
    facilityId: descriptor.facilityId,
    requestedMode: descriptor.requestedMode,
    batches: cloneGameDecimal(quote.batches),
    quotedCost: cloneGameDecimal(committed.quotedCost),
    debitedAmount: cloneGameDecimal(committed.debitedAmount),
    unitsGranted: cloneGameDecimal(committed.unitsGranted),
  })
}

export function planV2DysonAutomationTargets(
  targetIndex: number,
): readonly DysonV2CommandFacilityId[] {
  const startIndex = normalizeTargetIndex(targetIndex)
  return Object.freeze(Array.from(
    { length: DYSON_V2_COMMAND_TARGETS.length },
    (_, offset) => DYSON_V2_COMMAND_TARGETS[
      (startIndex + offset) % DYSON_V2_COMMAND_TARGETS.length
    ]!,
  ))
}

export function runV2DysonAutomationTick(
  state: CanonicalGameStateV2,
  sourceRevision: number,
  policy: DysonV2AutomationPolicy = 'preserve-configured-mode',
): DysonV2AutomationResult {
  if (!validRevision(sourceRevision) || sourceRevision === Number.MAX_SAFE_INTEGER) {
    throw new RangeError('Dyson V2 automation requires an incrementable application revision.')
  }
  if (
    policy !== 'preserve-configured-mode' &&
    policy !== 'force-buy-max'
  ) {
    throw new RangeError('Unknown Dyson V2 automation policy.')
  }
  const startIndex = normalizeTargetIndex(
    state.timeline.dysonAutomationTargetIndex,
  )
  let candidate = state
  const attempts: DysonV2AutomationAttempt[] = []
  for (const facilityId of planV2DysonAutomationTargets(startIndex)) {
    const requestedMode = policy === 'force-buy-max'
      ? 'buy-max'
      : candidate.dyson.automation.buyMode
    const quote = registerQuote(buildQuote(
      candidate,
      sourceRevision,
      facilityId,
      requestedMode,
      candidate.dyson.automation.roundedBulkBuy,
      true,
    ))
    const result = commitV2DysonFacilityPurchase(
      quote,
      candidate,
      sourceRevision,
    )
    candidate = result.state
    attempts.push(Object.freeze({ facilityId, quote, result }))
  }

  const nextTargetIndex =
    (startIndex + 1) % DYSON_V2_COMMAND_TARGETS.length
  candidate = replaceAutomationTargetIndex(candidate, nextTargetIndex)
  return Object.freeze({
    state: candidate,
    revision: sourceRevision + 1,
    changed: true,
    startIndex,
    nextTargetIndex,
    attempts: Object.freeze(attempts),
  })
}

function buildQuote(
  state: CanonicalGameStateV2,
  sourceRevision: number,
  facilityId: DysonV2CommandFacilityId,
  requestedMode: V2PurchaseMode,
  roundedBulkBuy: boolean,
  automated: boolean,
): DysonV2FacilityPurchaseQuote {
  if (
    !isCommandFacilityId(facilityId) ||
    !validRevision(sourceRevision) ||
    !PURCHASE_MODES.has(requestedMode) ||
    typeof roundedBulkBuy !== 'boolean' ||
    !hasRelevantValidState(state)
  ) {
    return emptyQuote(
      isCommandFacilityId(facilityId) ? facilityId : 'assembly_lines',
      sourceRevision,
      PURCHASE_MODES.has(requestedMode) ? requestedMode : 'buy-1',
      roundedBulkBuy === true,
      automated,
      'invalid-state',
    )
  }
  if (!catalogContract.valid) {
    return emptyQuote(
      facilityId,
      sourceRevision,
      requestedMode,
      roundedBulkBuy,
      automated,
      'catalog-gap',
    )
  }
  if (automated && !state.infinity.automationUnlocked.bots) {
    return emptyQuote(
      facilityId,
      sourceRevision,
      requestedMode,
      roundedBulkBuy,
      automated,
      'global-disabled',
    )
  }
  if (automated && !state.dyson.automation.enabledFacilities[facilityId]) {
    return emptyQuote(
      facilityId,
      sourceRevision,
      requestedMode,
      roundedBulkBuy,
      automated,
      'facility-disabled',
    )
  }
  const unlockStatus = facilityUnlockStatus(state, facilityId)
  if (unlockStatus !== 'ready') {
    return emptyQuote(
      facilityId,
      sourceRevision,
      requestedMode,
      roundedBulkBuy,
      automated,
      unlockStatus,
    )
  }

  const definition = catalogContract.definitions.get(facilityId)
  if (definition === undefined) {
    return emptyQuote(
      facilityId,
      sourceRevision,
      requestedMode,
      roundedBulkBuy,
      automated,
      'catalog-gap',
    )
  }
  try {
    const manualOwned = state.dyson.facilities[facilityId][1]
    const costLevel = facilityCostLevel(state, facilityId, manualOwned)
    const effectiveBaseCost = effectiveBaseCostFor(
      state,
      facilityId,
      gameDecimalFromNumber(definition.baseCost),
    )
    const firstBatchCost = exponentialCostV2(
      effectiveBaseCost,
      definition.costExponent,
      costLevel,
    )
    const common = {
      currencyPath: '$.dyson.money',
      sourceRevision,
      balance: state.dyson.money,
      balanceSemantic: 'ordinary' as const,
      output: manualOwned,
      outputSemantic: 'integer' as const,
      unitsPerPurchase: GAME_DECIMAL_ONE,
      integerCost: false,
      negligibleDebitPolicy: 'allow-for-purchase' as const,
    }
    let transactionQuote: V2PurchaseQuote
    if (requestedMode === 'buy-max') {
      transactionQuote = definition.costExponent === 1
        ? quoteV2FixedPriceBuyMax({
            ...common,
            pricePerBatch: firstBatchCost,
          })
        : quoteV2GeometricBuyMax({
            ...common,
            firstBatchCost,
            ratio: definition.costExponent,
          })
    } else {
      const batches = selectV2PurchaseBatches({
        mode: requestedMode,
        rounded: roundedBulkBuy,
        currentOwned: manualOwned,
        affordable: GAME_DECIMAL_ZERO,
      })
      const quotedCost = geometricSeriesCostV2(
        firstBatchCost,
        definition.costExponent,
        batches,
      )
      transactionQuote = quoteV2Purchase({
        ...common,
        requestedMode,
        batches,
        quotedCost,
      })
    }
    return purchaseQuote(
      facilityId,
      requestedMode,
      roundedBulkBuy,
      automated,
      transactionQuote,
    )
  } catch {
    return emptyQuote(
      facilityId,
      sourceRevision,
      requestedMode,
      roundedBulkBuy,
      automated,
      'invalid-cost',
    )
  }
}

function registerQuote(
  quote: DysonV2FacilityPurchaseQuote,
): DysonV2FacilityPurchaseQuote {
  quoteDescriptors.set(quote, Object.freeze({
    facilityId: quote.facilityId,
    requestedMode: quote.requestedMode,
    roundedBulkBuy: quote.roundedBulkBuy,
    automated: quote.automated,
  }))
  return quote
}

function purchaseQuote(
  facilityId: DysonV2CommandFacilityId,
  requestedMode: V2PurchaseMode,
  roundedBulkBuy: boolean,
  automated: boolean,
  transactionQuote: V2PurchaseQuote,
): DysonV2FacilityPurchaseQuote {
  return Object.freeze({
    kind: 'dyson-v2-facility-purchase-quote',
    facilityId,
    sourceRevision: transactionQuote.sourceRevision,
    requestedMode,
    roundedBulkBuy,
    automated,
    eligible: transactionQuote.accepted,
    changed: transactionQuote.changed,
    status: transactionQuote.accepted
      ? 'ready'
      : transactionQuote.rejection,
    batches: cloneGameDecimal(transactionQuote.batches),
    unitsGranted: cloneGameDecimal(transactionQuote.unitsGranted),
    quotedCost: cloneGameDecimal(transactionQuote.quotedCost),
    debitedAmount: cloneGameDecimal(transactionQuote.debitedAmount),
    transactionQuote,
  })
}

function emptyQuote(
  facilityId: DysonV2CommandFacilityId,
  sourceRevision: number,
  requestedMode: V2PurchaseMode,
  roundedBulkBuy: boolean,
  automated: boolean,
  status: DysonV2QuoteStatus,
): DysonV2FacilityPurchaseQuote {
  return Object.freeze({
    kind: 'dyson-v2-facility-purchase-quote',
    facilityId,
    sourceRevision,
    requestedMode,
    roundedBulkBuy,
    automated,
    eligible: false,
    changed: false,
    status,
    batches: cloneGameDecimal(GAME_DECIMAL_ZERO),
    unitsGranted: cloneGameDecimal(GAME_DECIMAL_ZERO),
    quotedCost: cloneGameDecimal(GAME_DECIMAL_ZERO),
    debitedAmount: cloneGameDecimal(GAME_DECIMAL_ZERO),
    transactionQuote: null,
  })
}

function rejectedResult(
  state: CanonicalGameStateV2,
  revision: number,
  status: DysonV2QuoteStatus,
  quote?: DysonV2FacilityPurchaseQuote,
  transaction?: V2PurchaseCommitResult,
): DysonV2FacilityPurchaseResult {
  return Object.freeze({
    accepted: false,
    purchased: false,
    changed: false,
    status,
    revision,
    state,
    facilityId: quote?.facilityId ?? null,
    requestedMode: quote?.requestedMode ?? null,
    batches: quote === undefined
      ? cloneGameDecimal(GAME_DECIMAL_ZERO)
      : cloneGameDecimal(quote.batches),
    quotedCost: transaction === undefined
      ? quote === undefined
        ? cloneGameDecimal(GAME_DECIMAL_ZERO)
        : cloneGameDecimal(quote.quotedCost)
      : cloneGameDecimal(transaction.quotedCost),
    debitedAmount: cloneGameDecimal(GAME_DECIMAL_ZERO),
    unitsGranted: cloneGameDecimal(GAME_DECIMAL_ZERO),
  })
}

function equivalentQuotes(
  left: DysonV2FacilityPurchaseQuote,
  right: DysonV2FacilityPurchaseQuote,
): boolean {
  return left.facilityId === right.facilityId &&
    left.sourceRevision === right.sourceRevision &&
    left.requestedMode === right.requestedMode &&
    left.roundedBulkBuy === right.roundedBulkBuy &&
    left.automated === right.automated &&
    left.eligible === right.eligible &&
    left.changed === right.changed &&
    left.status === right.status &&
    equalGameDecimals(left.batches, right.batches) &&
    equalGameDecimals(left.unitsGranted, right.unitsGranted) &&
    equalGameDecimals(left.quotedCost, right.quotedCost) &&
    equalGameDecimals(left.debitedAmount, right.debitedAmount) &&
    equivalentTransactionQuotes(
      left.transactionQuote,
      right.transactionQuote,
    )
}

function equivalentTransactionQuotes(
  left: V2PurchaseQuote | null,
  right: V2PurchaseQuote | null,
): boolean {
  if (left === null || right === null) return left === right
  return left.currencyPath === right.currencyPath &&
    left.sourceRevision === right.sourceRevision &&
    left.requestedMode === right.requestedMode &&
    left.accepted === right.accepted &&
    left.changed === right.changed &&
    left.rejection === right.rejection &&
    equalGameDecimals(left.batches, right.batches) &&
    equalGameDecimals(left.unitsGranted, right.unitsGranted) &&
    equalGameDecimals(left.quotedCost, right.quotedCost) &&
    equalGameDecimals(left.sourceBalance, right.sourceBalance) &&
    equalGameDecimals(left.sourceOutput, right.sourceOutput) &&
    equalGameDecimals(left.expectedBalance, right.expectedBalance) &&
    equalGameDecimals(left.expectedOutput, right.expectedOutput)
}

function replacePurchasedFacility(
  state: CanonicalGameStateV2,
  facilityId: DysonV2CommandFacilityId,
  committed: V2PurchaseCommitResult,
): CanonicalGameStateV2 {
  const currentPair = state.dyson.facilities[facilityId]
  const facilities = Object.freeze({
    ...state.dyson.facilities,
    [facilityId]: Object.freeze([
      currentPair[0],
      cloneGameDecimal(committed.output),
    ] as const),
  })
  const dyson = Object.freeze({
    ...state.dyson,
    money: cloneGameDecimal(committed.balance),
    facilities,
  })
  return Object.freeze({ ...state, dyson })
}

function replaceAutomationTargetIndex(
  state: CanonicalGameStateV2,
  targetIndex: number,
): CanonicalGameStateV2 {
  const timeline = Object.freeze({
    ...state.timeline,
    dysonAutomationTargetIndex: targetIndex,
  })
  return Object.freeze({ ...state, timeline })
}

function facilityCostLevel(
  state: CanonicalGameStateV2,
  facilityId: DysonV2CommandFacilityId,
  manualOwned: GameDecimal,
): GameDecimal {
  if (
    !isBasicFacility(facilityId) ||
    !state.infinity.retainedFacilities[facilityId]
  ) {
    return manualOwned
  }
  const starterTen = gameDecimalFromNumber(10)
  return compareGameDecimals(manualOwned, starterTen) > 0
    ? subtractGameDecimals(manualOwned, starterTen)
    : cloneGameDecimal(GAME_DECIMAL_ZERO)
}

function effectiveBaseCostFor(
  state: CanonicalGameStateV2,
  facilityId: DysonV2CommandFacilityId,
  authoredBaseCost: GameDecimal,
): GameDecimal {
  if (
    facilityId !== 'assembly_lines' ||
    state.skills.byId.assemblyMegaLines?.owned !== true
  ) {
    return authoredBaseCost
  }
  const totalPlanets = addGameDecimals(
    state.dyson.facilities.planets[0],
    state.dyson.facilities.planets[1],
  )
  return isZeroGameDecimal(totalPlanets)
    ? authoredBaseCost
    : divideGameDecimals(authoredBaseCost, totalPlanets)
}

function facilityUnlockStatus(
  state: CanonicalGameStateV2,
  facilityId: DysonV2CommandFacilityId,
): 'ready' | 'locked' | 'prerequisite-not-met' | 'catalog-gap' {
  const rule = catalogContract.rules.get(facilityId)
  if (rule === undefined) return 'catalog-gap'
  if (rule.quantumGate !== 0 && !quantumGateOpen(state, rule.quantumGate)) {
    return 'locked'
  }
  if (rule.prerequisiteFacilityId === null) return 'ready'
  const prerequisite = state.dyson.facilities[rule.prerequisiteFacilityId]
  const total = addGameDecimals(prerequisite[0], prerequisite[1])
  return compareGameDecimals(
    total,
    gameDecimalFromNumber(rule.prerequisiteOwned),
  ) >= 0
    ? 'ready'
    : 'prerequisite-not-met'
}

function quantumGateOpen(
  state: CanonicalGameStateV2,
  quantumGate: 1 | 2 | 3,
): boolean {
  return quantumGate === 1
    ? state.quantum.unlocks.matrioshkaBrains
    : quantumGate === 2
      ? state.quantum.unlocks.birchPlanets
      : state.quantum.unlocks.galacticBrains
}

function hasRelevantValidState(state: CanonicalGameStateV2): boolean {
  if (
    state === null ||
    typeof state !== 'object' ||
    state.modelVersion !== 2 ||
    !isGameDecimal(state.dyson?.money) ||
    !PURCHASE_MODES.has(state.dyson?.automation?.buyMode) ||
    typeof state.dyson?.automation?.roundedBulkBuy !== 'boolean' ||
    typeof state.infinity?.automationUnlocked?.bots !== 'boolean'
  ) {
    return false
  }
  return DYSON_V2_COMMAND_TARGETS.every((facilityId) => {
    const pair = state.dyson.facilities?.[facilityId]
    return Array.isArray(pair) &&
      pair.length === 2 &&
      isGameDecimal(pair[0]) &&
      isIntegerGameDecimal(pair[1]) &&
      typeof state.dyson.automation.enabledFacilities?.[facilityId] === 'boolean'
  }) && [
    'assembly_lines',
    'ai_managers',
    'servers',
    'data_centers',
    'planets',
  ].every((facilityId) =>
    typeof state.infinity.retainedFacilities?.[
      facilityId as BasicDysonFacilityId
    ] === 'boolean',
  )
}

function validRevision(value: number): boolean {
  return typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    !Object.is(value, -0)
}

function normalizeTargetIndex(value: number): number {
  if (!Number.isSafeInteger(value)) return 0
  const count = DYSON_V2_COMMAND_TARGETS.length
  return ((value % count) + count) % count
}

function isCommandFacilityId(
  value: unknown,
): value is DysonV2CommandFacilityId {
  return typeof value === 'string' &&
    (DYSON_V2_COMMAND_TARGETS as readonly string[]).includes(value)
}

function isBasicFacility(
  facilityId: DysonV2CommandFacilityId,
): facilityId is BasicDysonFacilityId {
  return BASIC_IDS.has(facilityId)
}

function readCatalogContract(): CatalogContract {
  const definitions = new Map<
    DysonV2CommandFacilityId,
    FacilityDefinition
  >()
  const assets = getGameAssetsByKind('GameData.FacilityDefinition')
  for (const facilityId of DYSON_V2_COMMAND_TARGETS) {
    const asset = getGameAsset('GameData.FacilityDefinition', facilityId)
    const data = asset?.data
    const identity = isRecord(data?._id) ? data._id.id : undefined
    if (
      asset === undefined ||
      asset.id !== facilityId ||
      identity !== facilityId ||
      typeof data?.baseCost !== 'number' ||
      !Number.isFinite(data.baseCost) ||
      data.baseCost <= 0 ||
      typeof data.costExponent !== 'number' ||
      !Number.isFinite(data.costExponent) ||
      data.costExponent < 1
    ) {
      return invalidCatalog()
    }
    definitions.set(facilityId, Object.freeze({
      facilityId,
      baseCost: data.baseCost,
      costExponent: data.costExponent,
    }))
  }
  if (
    assets.length !== DYSON_V2_COMMAND_TARGETS.length ||
    assets.some((asset) => !isCommandFacilityId(asset.id))
  ) {
    return invalidCatalog()
  }

  const profile = getGameAsset(
    'IdleDysonSwarm.Data.Balance.FacilityBalanceProfile',
    'FacilityBalanceProfile',
  )
  const entries = profile?.data.entries
  if (!Array.isArray(entries) || entries.length !== DYSON_V2_COMMAND_TARGETS.length) {
    return invalidCatalog()
  }
  const rules = new Map<DysonV2CommandFacilityId, FacilityRule>()
  for (const expected of EXPECTED_RULES) {
    const entry = entries.find((candidate) =>
      isRecord(candidate) && candidate.facilityId === expected.facilityId,
    )
    const prerequisite = isRecord(entry?.prerequisiteFacilityId)
      ? entry.prerequisiteFacilityId.id
      : entry?.prerequisiteFacilityId
    if (
      !isRecord(entry) ||
      entry.group !== expected.group ||
      prerequisite !== expected.prerequisiteFacilityId ||
      entry.prerequisiteOwned !== expected.prerequisiteOwned ||
      entry.quantumGate !== expected.quantumGate
    ) {
      return invalidCatalog()
    }
    rules.set(expected.facilityId, expected)
  }
  return Object.freeze({ valid: true, definitions, rules })
}

function invalidCatalog(): CatalogContract {
  return Object.freeze({
    valid: false,
    definitions: new Map(),
    rules: new Map(),
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

const EXPECTED_RULES = Object.freeze([
  Object.freeze({
    facilityId: 'assembly_lines', group: 0,
    prerequisiteFacilityId: null, prerequisiteOwned: 0, quantumGate: 0,
  }),
  Object.freeze({
    facilityId: 'ai_managers', group: 0,
    prerequisiteFacilityId: 'assembly_lines', prerequisiteOwned: 5,
    quantumGate: 0,
  }),
  Object.freeze({
    facilityId: 'servers', group: 0,
    prerequisiteFacilityId: 'ai_managers', prerequisiteOwned: 1,
    quantumGate: 0,
  }),
  Object.freeze({
    facilityId: 'data_centers', group: 0,
    prerequisiteFacilityId: 'servers', prerequisiteOwned: 1,
    quantumGate: 0,
  }),
  Object.freeze({
    facilityId: 'planets', group: 0,
    prerequisiteFacilityId: 'data_centers', prerequisiteOwned: 1,
    quantumGate: 0,
  }),
  Object.freeze({
    facilityId: 'matrioshka_brains', group: 2,
    prerequisiteFacilityId: 'planets', prerequisiteOwned: 1, quantumGate: 1,
  }),
  Object.freeze({
    facilityId: 'birch_planets', group: 2,
    prerequisiteFacilityId: 'matrioshka_brains', prerequisiteOwned: 1,
    quantumGate: 2,
  }),
  Object.freeze({
    facilityId: 'galactic_brains', group: 2,
    prerequisiteFacilityId: 'birch_planets', prerequisiteOwned: 1,
    quantumGate: 3,
  }),
] as const satisfies readonly FacilityRule[])

const catalogContract = readCatalogContract()

export const DYSON_V2_CATALOG_CONTRACT_VALID = catalogContract.valid
