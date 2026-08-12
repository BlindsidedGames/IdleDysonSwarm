import {
  GAME_DECIMAL_ONE,
  GAME_DECIMAL_ZERO,
  addGameDecimals,
  ceilGameDecimal,
  cloneGameDecimal,
  compareGameDecimals,
  divideGameDecimals,
  equalGameDecimals,
  floorGameDecimal,
  gameDecimalFromNumber,
  gameDecimalToBigIntChecked,
  isGameDecimal,
  isIntegerGameDecimal,
  isZeroGameDecimal,
  logGameDecimal,
  minGameDecimal,
  multiplyGameDecimals,
  subtractGameDecimals,
  type GameDecimal,
} from '../math/gameDecimal'

export type V2DecimalSemantic = 'ordinary' | 'integer'
export type V2PurchaseMode =
  | 'buy-1'
  | 'buy-10'
  | 'buy-50'
  | 'buy-100'
  | 'buy-max'
export type V2NegligibleDebitPolicy =
  | 'allow-for-purchase'
  | 'reject'

export type V2PurchaseRejection =
  | 'none'
  | 'invalid-request'
  | 'invalid-cost'
  | 'insufficient-funds'
  | 'negligible-debit-forbidden'
  | 'correction-limit'
  | 'stale-revision'
  | 'state-mismatch'
  | 'revision-exhausted'
  | 'quote-rejected'

export interface V2PurchaseQuote {
  readonly kind: 'v2-purchase-quote'
  readonly currencyPath: string
  readonly sourceRevision: number
  readonly requestedMode: V2PurchaseMode
  readonly balanceSemantic: V2DecimalSemantic
  readonly outputSemantic: V2DecimalSemantic
  readonly negligibleDebitPolicy: V2NegligibleDebitPolicy
  readonly accepted: boolean
  readonly changed: boolean
  readonly rejection: V2PurchaseRejection
  readonly batches: GameDecimal
  readonly unitsGranted: GameDecimal
  readonly quotedCost: GameDecimal
  readonly debitedAmount: GameDecimal
  readonly sourceBalance: GameDecimal
  readonly sourceOutput: GameDecimal
  readonly expectedBalance: GameDecimal
  readonly expectedOutput: GameDecimal
}

export interface V2PurchaseCommitResult {
  readonly accepted: boolean
  readonly changed: boolean
  readonly rejection: V2PurchaseRejection
  readonly revision: number
  readonly balance: GameDecimal
  readonly output: GameDecimal
  readonly quotedCost: GameDecimal
  readonly debitedAmount: GameDecimal
  readonly unitsGranted: GameDecimal
}

export interface V2BulkCorrectionResult {
  readonly accepted: boolean
  readonly rejection: 'none' | 'invalid-request' | 'correction-limit'
  readonly batches: GameDecimal
  readonly cost: GameDecimal
  readonly corrections: number
}

export interface V2GeometricAffordabilityResult {
  readonly accepted: boolean
  readonly rejection: 'none' | 'invalid-request' | 'correction-limit'
  readonly batches: GameDecimal
  readonly cost: GameDecimal
  readonly corrections: number
}

export interface V2AtomicAccount {
  readonly id: string
  readonly balance: GameDecimal
  readonly semantic: V2DecimalSemantic
}

export interface V2AtomicLeg {
  readonly accountId: string
  readonly amount: GameDecimal
}

export type V2AtomicRejection =
  | 'none'
  | 'invalid-request'
  | 'insufficient-source'
  | 'unrepresented-debit'
  | 'unrepresented-credit'
  | 'stale-revision'
  | 'state-mismatch'
  | 'revision-exhausted'
  | 'quote-rejected'

export interface V2AtomicExchangeQuote {
  readonly kind: 'v2-atomic-exchange-quote'
  readonly sourceRevision: number
  readonly accepted: boolean
  readonly changed: boolean
  readonly rejection: V2AtomicRejection
  readonly before: readonly V2AtomicAccount[]
  readonly after: readonly V2AtomicAccount[]
  readonly debited: readonly V2AtomicLeg[]
  readonly credited: readonly V2AtomicLeg[]
}

export interface V2AtomicExchangeCommitResult {
  readonly accepted: boolean
  readonly changed: boolean
  readonly rejection: V2AtomicRejection
  readonly revision: number
  readonly accounts: readonly V2AtomicAccount[]
}

export const V2_BULK_MAXIMUM_DOWNWARD_CORRECTIONS = 16
export const V2_FIXED_PRICE_BUY_MAX_BATCH_CAP =
  gameDecimalFromNumber(1_000)

export type V2PurchaseRequest = Readonly<{
  currencyPath: string
  sourceRevision: number
  requestedMode: V2PurchaseMode
  balance: GameDecimal
  balanceSemantic: V2DecimalSemantic
  output: GameDecimal
  outputSemantic: V2DecimalSemantic
  batches: GameDecimal
  unitsPerPurchase: GameDecimal
  quotedCost: GameDecimal
  integerCost: boolean
  negligibleDebitPolicy: V2NegligibleDebitPolicy
}>

type V2BuyMaxRequest = Omit<
  V2PurchaseRequest,
  'requestedMode' | 'batches' | 'quotedCost'
>

const purchaseQuoteRederivers = new WeakMap<
  V2PurchaseQuote,
  () => V2PurchaseQuote
>()
const atomicQuoteRederivers = new WeakMap<
  V2AtomicExchangeQuote,
  () => V2AtomicExchangeQuote
>()
const V2_PURCHASE_MODES = new Set<V2PurchaseMode>([
  'buy-1',
  'buy-10',
  'buy-50',
  'buy-100',
  'buy-max',
])

function validRevision(value: number): boolean {
  return typeof value === 'number' &&
    Number.isSafeInteger(value) &&
    value >= 0 &&
    !Object.is(value, -0)
}

function validSemanticValue(
  value: GameDecimal,
  semantic: V2DecimalSemantic,
): boolean {
  return (semantic === 'ordinary' || semantic === 'integer') &&
    isGameDecimal(value) &&
    (semantic === 'ordinary' || isIntegerGameDecimal(value))
}

function positiveInteger(value: GameDecimal): boolean {
  return isGameDecimal(value) &&
    isIntegerGameDecimal(value) &&
    !isZeroGameDecimal(value)
}

function positive(value: GameDecimal): boolean {
  return isGameDecimal(value) && !isZeroGameDecimal(value)
}

function cloneAccount(account: V2AtomicAccount): V2AtomicAccount {
  return Object.freeze({
    id: account.id,
    balance: cloneGameDecimal(account.balance),
    semantic: account.semantic,
  })
}

function cloneLeg(leg: V2AtomicLeg): V2AtomicLeg {
  return Object.freeze({
    accountId: leg.accountId,
    amount: cloneGameDecimal(leg.amount),
  })
}

function normalizeCost(
  cost: GameDecimal,
  integerCost: boolean,
): GameDecimal | null {
  if (!positive(cost)) return null
  const normalized = integerCost ? ceilGameDecimal(cost) : cloneGameDecimal(cost)
  return positive(normalized) ? normalized : null
}

function rejectedPurchase(
  request: V2PurchaseRequest,
  rejection: V2PurchaseRejection,
  quotedCost = GAME_DECIMAL_ZERO,
): V2PurchaseQuote {
  return Object.freeze({
    kind: 'v2-purchase-quote',
    currencyPath: request.currencyPath,
    sourceRevision: request.sourceRevision,
    requestedMode: request.requestedMode,
    balanceSemantic: request.balanceSemantic,
    outputSemantic: request.outputSemantic,
    negligibleDebitPolicy: request.negligibleDebitPolicy,
    accepted: false,
    changed: false,
    rejection,
    batches: cloneGameDecimal(request.batches),
    unitsGranted: cloneGameDecimal(GAME_DECIMAL_ZERO),
    quotedCost: cloneGameDecimal(quotedCost),
    debitedAmount: cloneGameDecimal(GAME_DECIMAL_ZERO),
    sourceBalance: cloneGameDecimal(request.balance),
    sourceOutput: cloneGameDecimal(request.output),
    expectedBalance: cloneGameDecimal(request.balance),
    expectedOutput: cloneGameDecimal(request.output),
  })
}

function buildV2PurchaseQuote(
  request: V2PurchaseRequest,
): V2PurchaseQuote {
  if (
    typeof request.currencyPath !== 'string' ||
    !request.currencyPath.startsWith('$.') ||
    !V2_PURCHASE_MODES.has(request.requestedMode) ||
    typeof request.integerCost !== 'boolean' ||
    !validRevision(request.sourceRevision) ||
    !validSemanticValue(request.balance, request.balanceSemantic) ||
    !validSemanticValue(request.output, request.outputSemantic) ||
    !positiveInteger(request.batches) ||
    !positiveInteger(request.unitsPerPurchase) ||
    !isGameDecimal(request.quotedCost) ||
    (request.negligibleDebitPolicy !== 'allow-for-purchase' &&
      request.negligibleDebitPolicy !== 'reject')
  ) {
    return rejectedPurchase(request, 'invalid-request')
  }

  const quotedCost = normalizeCost(request.quotedCost, request.integerCost)
  if (quotedCost === null) {
    return rejectedPurchase(request, 'invalid-cost')
  }
  if (compareGameDecimals(quotedCost, request.balance) > 0) {
    return rejectedPurchase(request, 'insufficient-funds', quotedCost)
  }

  const expectedBalance = subtractGameDecimals(request.balance, quotedCost)
  const debitedAmount = subtractGameDecimals(
    request.balance,
    expectedBalance,
  )
  if (
    isZeroGameDecimal(debitedAmount) &&
    request.negligibleDebitPolicy !== 'allow-for-purchase'
  ) {
    return rejectedPurchase(
      request,
      'negligible-debit-forbidden',
      quotedCost,
    )
  }

  const unitsGranted = multiplyGameDecimals(
    request.batches,
    request.unitsPerPurchase,
  )
  if (!isIntegerGameDecimal(unitsGranted)) {
    return rejectedPurchase(request, 'invalid-request', quotedCost)
  }
  const expectedOutput = addGameDecimals(request.output, unitsGranted)
  if (!validSemanticValue(expectedOutput, request.outputSemantic)) {
    return rejectedPurchase(request, 'invalid-request', quotedCost)
  }

  const balanceChanged = !equalGameDecimals(
    expectedBalance,
    request.balance,
  )
  const outputChanged = !equalGameDecimals(
    expectedOutput,
    request.output,
  )
  return Object.freeze({
    kind: 'v2-purchase-quote',
    currencyPath: request.currencyPath,
    sourceRevision: request.sourceRevision,
    requestedMode: request.requestedMode,
    balanceSemantic: request.balanceSemantic,
    outputSemantic: request.outputSemantic,
    negligibleDebitPolicy: request.negligibleDebitPolicy,
    accepted: true,
    changed: balanceChanged || outputChanged,
    rejection: 'none',
    batches: cloneGameDecimal(request.batches),
    unitsGranted: cloneGameDecimal(unitsGranted),
    quotedCost: cloneGameDecimal(quotedCost),
    debitedAmount: cloneGameDecimal(debitedAmount),
    sourceBalance: cloneGameDecimal(request.balance),
    sourceOutput: cloneGameDecimal(request.output),
    expectedBalance: cloneGameDecimal(expectedBalance),
    expectedOutput: cloneGameDecimal(expectedOutput),
  })
}

function snapshotPurchaseRequest(
  request: V2PurchaseRequest,
): V2PurchaseRequest {
  return Object.freeze({
    ...request,
    balance: cloneGameDecimal(request.balance),
    output: cloneGameDecimal(request.output),
    batches: cloneGameDecimal(request.batches),
    unitsPerPurchase: cloneGameDecimal(request.unitsPerPurchase),
    quotedCost: cloneGameDecimal(request.quotedCost),
  })
}

function registerPurchaseQuote(
  quote: V2PurchaseQuote,
  rederive: () => V2PurchaseQuote,
): V2PurchaseQuote {
  purchaseQuoteRederivers.set(quote, rederive)
  return quote
}

export function quoteV2Purchase(
  request: V2PurchaseRequest,
): V2PurchaseQuote {
  const snapshot = snapshotPurchaseRequest(request)
  return registerPurchaseQuote(
    buildV2PurchaseQuote(snapshot),
    () => buildV2PurchaseQuote(snapshot),
  )
}

function equivalentPurchaseQuotes(
  left: V2PurchaseQuote,
  right: V2PurchaseQuote,
): boolean {
  return left.currencyPath === right.currencyPath &&
    left.sourceRevision === right.sourceRevision &&
    left.requestedMode === right.requestedMode &&
    left.balanceSemantic === right.balanceSemantic &&
    left.outputSemantic === right.outputSemantic &&
    left.negligibleDebitPolicy === right.negligibleDebitPolicy &&
    left.accepted === right.accepted &&
    left.changed === right.changed &&
    left.rejection === right.rejection &&
    equalGameDecimals(left.batches, right.batches) &&
    equalGameDecimals(left.unitsGranted, right.unitsGranted) &&
    equalGameDecimals(left.quotedCost, right.quotedCost) &&
    equalGameDecimals(left.debitedAmount, right.debitedAmount) &&
    equalGameDecimals(left.sourceBalance, right.sourceBalance) &&
    equalGameDecimals(left.sourceOutput, right.sourceOutput) &&
    equalGameDecimals(left.expectedBalance, right.expectedBalance) &&
    equalGameDecimals(left.expectedOutput, right.expectedOutput)
}

export function commitV2Purchase(
  quote: V2PurchaseQuote,
  current: Readonly<{
    revision: number
    balance: GameDecimal
    output: GameDecimal
  }>,
): V2PurchaseCommitResult {
  const rejectUnissued = () => Object.freeze({
    accepted: false,
    changed: false,
    rejection: 'quote-rejected' as const,
    revision: current.revision,
    balance: cloneGameDecimal(current.balance),
    output: cloneGameDecimal(current.output),
    quotedCost: cloneGameDecimal(GAME_DECIMAL_ZERO),
    debitedAmount: cloneGameDecimal(GAME_DECIMAL_ZERO),
    unitsGranted: cloneGameDecimal(GAME_DECIMAL_ZERO),
  })
  if (quote === null || typeof quote !== 'object') {
    return rejectUnissued()
  }
  const rederive = purchaseQuoteRederivers.get(quote)
  if (rederive === undefined) return rejectUnissued()

  const unchanged = (rejection: V2PurchaseRejection) => Object.freeze({
    accepted: false,
    changed: false,
    rejection,
    revision: current.revision,
    balance: cloneGameDecimal(current.balance),
    output: cloneGameDecimal(current.output),
    quotedCost: cloneGameDecimal(quote.quotedCost),
    debitedAmount: cloneGameDecimal(GAME_DECIMAL_ZERO),
    unitsGranted: cloneGameDecimal(GAME_DECIMAL_ZERO),
  })

  const authoritative = rederive()
  if (!equivalentPurchaseQuotes(quote, authoritative)) {
    return unchanged('quote-rejected')
  }
  if (!quote.accepted) return unchanged('quote-rejected')
  if (current.revision !== quote.sourceRevision) {
    return unchanged('stale-revision')
  }
  if (!validRevision(current.revision)) {
    return unchanged('stale-revision')
  }
  if (quote.changed && current.revision === Number.MAX_SAFE_INTEGER) {
    return unchanged('revision-exhausted')
  }
  if (
    !equalGameDecimals(current.balance, quote.sourceBalance) ||
    !equalGameDecimals(current.output, quote.sourceOutput)
  ) {
    return unchanged('state-mismatch')
  }
  return Object.freeze({
    accepted: true,
    changed: quote.changed,
    rejection: 'none',
    revision: quote.changed ? current.revision + 1 : current.revision,
    balance: cloneGameDecimal(quote.expectedBalance),
    output: cloneGameDecimal(quote.expectedOutput),
    quotedCost: cloneGameDecimal(quote.quotedCost),
    debitedAmount: cloneGameDecimal(quote.debitedAmount),
    unitsGranted: cloneGameDecimal(quote.unitsGranted),
  })
}

function integerPower(
  base: GameDecimal,
  exponent: GameDecimal,
): GameDecimal {
  return integerPowerAndGeometricSum(base, exponent).power
}

function integerPowerAndGeometricSum(
  base: GameDecimal,
  exponent: GameDecimal,
): Readonly<{ power: GameDecimal; sum: GameDecimal }> {
  if (!positive(base) || !isIntegerGameDecimal(exponent)) {
    throw new RangeError('V2 integer power has an invalid domain.')
  }
  let remaining = gameDecimalToBigIntChecked(exponent)
  let power = cloneGameDecimal(GAME_DECIMAL_ONE)
  let sum = cloneGameDecimal(GAME_DECIMAL_ZERO)
  let blockPower = cloneGameDecimal(base)
  let blockSum = cloneGameDecimal(GAME_DECIMAL_ONE)
  while (remaining > 0n) {
    if ((remaining & 1n) === 1n) {
      sum = addGameDecimals(
        sum,
        multiplyGameDecimals(power, blockSum),
      )
      power = multiplyGameDecimals(power, blockPower)
    }
    remaining >>= 1n
    if (remaining > 0n) {
      blockSum = multiplyGameDecimals(
        blockSum,
        addGameDecimals(GAME_DECIMAL_ONE, blockPower),
      )
      blockPower = multiplyGameDecimals(blockPower, blockPower)
    }
  }
  return Object.freeze({
    power: cloneGameDecimal(power),
    sum: cloneGameDecimal(sum),
  })
}

export function exponentialCostV2(
  baseCost: GameDecimal,
  ratio: number,
  level: GameDecimal,
): GameDecimal {
  if (
    !positive(baseCost) ||
    !Number.isFinite(ratio) ||
    ratio < 1 ||
    !isIntegerGameDecimal(level)
  ) {
    throw new RangeError('V2 exponential cost has an invalid domain.')
  }
  if (ratio === 1) return cloneGameDecimal(baseCost)
  return multiplyGameDecimals(
    baseCost,
    integerPower(gameDecimalFromNumber(ratio), level),
  )
}

export function geometricSeriesCostV2(
  firstBatchCost: GameDecimal,
  ratio: number,
  batches: GameDecimal,
): GameDecimal {
  if (
    !positive(firstBatchCost) ||
    !Number.isFinite(ratio) ||
    ratio < 1 ||
    !positiveInteger(batches)
  ) {
    throw new RangeError('V2 geometric cost has an invalid domain.')
  }
  if (ratio === 1) {
    return multiplyGameDecimals(firstBatchCost, batches)
  }
  const ratioDecimal = gameDecimalFromNumber(ratio)
  return multiplyGameDecimals(
    firstBatchCost,
    integerPowerAndGeometricSum(ratioDecimal, batches).sum,
  )
}

export function correctV2BulkEstimate(
  estimate: GameDecimal,
  available: GameDecimal,
  authoritativeCost: (batches: GameDecimal) => GameDecimal,
): V2BulkCorrectionResult {
  if (!positiveInteger(estimate) || !isGameDecimal(available)) {
    return Object.freeze({
      accepted: false,
      rejection: 'invalid-request',
      batches: cloneGameDecimal(GAME_DECIMAL_ZERO),
      cost: cloneGameDecimal(GAME_DECIMAL_ZERO),
      corrections: 0,
    })
  }
  let batches = cloneGameDecimal(estimate)
  let cost: GameDecimal
  try {
    cost = authoritativeCost(batches)
  } catch {
    return Object.freeze({
      accepted: false,
      rejection: 'invalid-request',
      batches: cloneGameDecimal(GAME_DECIMAL_ZERO),
      cost: cloneGameDecimal(GAME_DECIMAL_ZERO),
      corrections: 0,
    })
  }
  let corrections = 0
  while (
    compareGameDecimals(cost, available) > 0 &&
    corrections < V2_BULK_MAXIMUM_DOWNWARD_CORRECTIONS &&
    compareGameDecimals(batches, GAME_DECIMAL_ONE) > 0
  ) {
    batches = subtractGameDecimals(batches, GAME_DECIMAL_ONE)
    corrections += 1
    try {
      cost = authoritativeCost(batches)
    } catch {
      return Object.freeze({
        accepted: false,
        rejection: 'invalid-request',
        batches: cloneGameDecimal(GAME_DECIMAL_ZERO),
        cost: cloneGameDecimal(GAME_DECIMAL_ZERO),
        corrections,
      })
    }
  }
  if (compareGameDecimals(cost, available) > 0) {
    return Object.freeze({
      accepted: false,
      rejection: 'correction-limit',
      batches: cloneGameDecimal(GAME_DECIMAL_ZERO),
      cost: cloneGameDecimal(GAME_DECIMAL_ZERO),
      corrections,
    })
  }
  return Object.freeze({
    accepted: true,
    rejection: 'none',
    batches: cloneGameDecimal(batches),
    cost: cloneGameDecimal(cost),
    corrections,
  })
}

export function quoteV2GeometricBuyMax(
  request: V2BuyMaxRequest & Readonly<{
    firstBatchCost: GameDecimal
    ratio: number
  }>,
): V2PurchaseQuote {
  const invalidRequest: V2PurchaseRequest = {
    ...request,
    requestedMode: 'buy-max',
    batches: GAME_DECIMAL_ONE,
    quotedCost: GAME_DECIMAL_ZERO,
  }
  if (
    !positive(request.firstBatchCost) ||
    !Number.isFinite(request.ratio) ||
    request.ratio < 1
  ) {
    return rejectedPurchase(invalidRequest, 'invalid-request')
  }
  if (request.ratio === 1) {
    return quoteV2FixedPriceBuyMax({
      ...request,
      pricePerBatch: request.firstBatchCost,
    })
  }
  const corrected = maximumAffordableGeometricBatchesV2({
    available: request.balance,
    firstBatchCost: request.firstBatchCost,
    ratio: request.ratio,
    integerCost: request.integerCost,
  })
  if (!corrected.accepted) {
    return rejectedPurchase(
      invalidRequest,
      corrected.rejection === 'correction-limit'
        ? 'correction-limit'
        : 'invalid-request',
    )
  }
  if (isZeroGameDecimal(corrected.batches)) {
    return rejectedPurchase(invalidRequest, 'insufficient-funds')
  }
  const snapshot = Object.freeze({
    ...request,
    balance: cloneGameDecimal(request.balance),
    output: cloneGameDecimal(request.output),
    unitsPerPurchase: cloneGameDecimal(request.unitsPerPurchase),
    firstBatchCost: cloneGameDecimal(request.firstBatchCost),
  })
  const quote = quoteV2Purchase({
    ...request,
    requestedMode: 'buy-max',
    batches: corrected.batches,
    quotedCost: corrected.cost,
  })
  return registerPurchaseQuote(
    quote,
    () => quoteV2GeometricBuyMax(snapshot),
  )
}

/**
 * Computes a geometric affordability boundary without creating a debit quote.
 * This is shared by purchase systems and Decimal-native reward thresholds.
 */
export function maximumAffordableGeometricBatchesV2(
  request: Readonly<{
    available: GameDecimal
    firstBatchCost: GameDecimal
    ratio: number
    integerCost: boolean
  }>,
): V2GeometricAffordabilityResult {
  if (
    !isGameDecimal(request.available) ||
    !positive(request.firstBatchCost) ||
    !Number.isFinite(request.ratio) ||
    request.ratio <= 1 ||
    typeof request.integerCost !== 'boolean'
  ) {
    return geometricAffordabilityFailure('invalid-request')
  }
  if (compareGameDecimals(request.available, request.firstBatchCost) < 0) {
    return Object.freeze({
      accepted: true,
      rejection: 'none',
      batches: cloneGameDecimal(GAME_DECIMAL_ZERO),
      cost: cloneGameDecimal(GAME_DECIMAL_ZERO),
      corrections: 0,
    })
  }

  let estimate: GameDecimal
  try {
    const ratioMinusOne = gameDecimalFromNumber(request.ratio - 1)
    const scaled = divideGameDecimals(
      multiplyGameDecimals(request.available, ratioMinusOne),
      request.firstBatchCost,
    )
    estimate = floorGameDecimal(
      logGameDecimal(
        addGameDecimals(GAME_DECIMAL_ONE, scaled),
        request.ratio,
      ),
    )
  } catch {
    return geometricAffordabilityFailure('invalid-request')
  }
  const corrected = correctV2BulkEstimate(
    estimate,
    request.available,
    (batches) => {
      const cost = geometricSeriesCostV2(
        request.firstBatchCost,
        request.ratio,
        batches,
      )
      const normalized = normalizeCost(cost, request.integerCost)
      if (normalized === null) {
        throw new RangeError('V2 geometric cost could not be normalized.')
      }
      return normalized
    },
  )
  return Object.freeze({
    accepted: corrected.accepted,
    rejection: corrected.rejection,
    batches: cloneGameDecimal(corrected.batches),
    cost: cloneGameDecimal(corrected.cost),
    corrections: corrected.corrections,
  })
}

function geometricAffordabilityFailure(
  rejection: 'invalid-request' | 'correction-limit',
): V2GeometricAffordabilityResult {
  return Object.freeze({
    accepted: false,
    rejection,
    batches: cloneGameDecimal(GAME_DECIMAL_ZERO),
    cost: cloneGameDecimal(GAME_DECIMAL_ZERO),
    corrections: 0,
  })
}

export function quoteV2FixedPriceBuyMax(
  request: V2BuyMaxRequest & Readonly<{
    pricePerBatch: GameDecimal
  }>,
): V2PurchaseQuote {
  const invalidRequest: V2PurchaseRequest = {
    ...request,
    requestedMode: 'buy-max',
    batches: GAME_DECIMAL_ONE,
    quotedCost: GAME_DECIMAL_ZERO,
  }
  const pricePerBatch = normalizeCost(
    request.pricePerBatch,
    request.integerCost,
  )
  if (pricePerBatch === null) {
    return rejectedPurchase(invalidRequest, 'invalid-cost')
  }
  const affordable = floorGameDecimal(
    divideGameDecimals(request.balance, pricePerBatch),
  )
  const batches = minGameDecimal(
    affordable,
    V2_FIXED_PRICE_BUY_MAX_BATCH_CAP,
  )
  if (isZeroGameDecimal(batches)) {
    return rejectedPurchase(
      invalidRequest,
      'insufficient-funds',
      pricePerBatch,
    )
  }
  const snapshot = Object.freeze({
    ...request,
    balance: cloneGameDecimal(request.balance),
    output: cloneGameDecimal(request.output),
    unitsPerPurchase: cloneGameDecimal(request.unitsPerPurchase),
    pricePerBatch: cloneGameDecimal(request.pricePerBatch),
  })
  const quote = quoteV2Purchase({
    ...request,
    requestedMode: 'buy-max',
    batches,
    quotedCost: multiplyGameDecimals(pricePerBatch, batches),
  })
  return registerPurchaseQuote(
    quote,
    () => quoteV2FixedPriceBuyMax(snapshot),
  )
}

export function selectV2PurchaseBatches(request: Readonly<{
  mode: V2PurchaseMode
  rounded: boolean
  currentOwned: GameDecimal
  affordable: GameDecimal
}>): GameDecimal {
  if (
    !V2_PURCHASE_MODES.has(request.mode) ||
    typeof request.rounded !== 'boolean' ||
    !isIntegerGameDecimal(request.currentOwned) ||
    !isIntegerGameDecimal(request.affordable)
  ) {
    throw new RangeError('V2 purchase selection requires integer quantities.')
  }
  if (request.mode === 'buy-max') {
    return cloneGameDecimal(request.affordable)
  }
  const target = request.mode === 'buy-100'
    ? gameDecimalFromNumber(100)
    : request.mode === 'buy-50'
      ? gameDecimalFromNumber(50)
      : request.mode === 'buy-10'
        ? gameDecimalFromNumber(10)
        : cloneGameDecimal(GAME_DECIMAL_ONE)
  if (!request.rounded || request.mode === 'buy-1') return target
  const completeGroups = floorGameDecimal(
    divideGameDecimals(request.currentOwned, target),
  )
  const remainder = subtractGameDecimals(
    request.currentOwned,
    multiplyGameDecimals(completeGroups, target),
  )
  return isZeroGameDecimal(remainder)
    ? target
    : subtractGameDecimals(target, remainder)
}

function rejectedAtomic(
  request: Readonly<{
    sourceRevision: number
    accounts: readonly V2AtomicAccount[]
    debits: readonly V2AtomicLeg[]
    credits: readonly V2AtomicLeg[]
  }>,
  rejection: V2AtomicRejection,
): V2AtomicExchangeQuote {
  const before = Object.freeze(request.accounts.map(cloneAccount))
  return Object.freeze({
    kind: 'v2-atomic-exchange-quote',
    sourceRevision: request.sourceRevision,
    accepted: false,
    changed: false,
    rejection,
    before,
    after: Object.freeze(request.accounts.map(cloneAccount)),
    debited: Object.freeze(request.debits.map(cloneLeg)),
    credited: Object.freeze(request.credits.map(cloneLeg)),
  })
}

function buildV2AtomicExchangeQuote(
  request: Readonly<{
    sourceRevision: number
    accounts: readonly V2AtomicAccount[]
    debits: readonly V2AtomicLeg[]
    credits: readonly V2AtomicLeg[]
  }>,
): V2AtomicExchangeQuote {
  const accountIds = request.accounts.map((account) => account.id)
  const debitIds = request.debits.map((leg) => leg.accountId)
  const creditIds = request.credits.map((leg) => leg.accountId)
  if (
    !validRevision(request.sourceRevision) ||
    request.accounts.length === 0 ||
    request.debits.length === 0 ||
    request.credits.length === 0 ||
    accountIds.some((id) => id.length === 0) ||
    new Set(accountIds).size !== accountIds.length ||
    new Set(debitIds).size !== debitIds.length ||
    new Set(creditIds).size !== creditIds.length ||
    debitIds.some((id) => creditIds.includes(id)) ||
    request.accounts.some(
      (account) => !validSemanticValue(account.balance, account.semantic),
    ) ||
    [...request.debits, ...request.credits].some(
      (leg) => !positive(leg.amount) || !accountIds.includes(leg.accountId),
    )
  ) {
    return rejectedAtomic(request, 'invalid-request')
  }

  const byId = new Map(
    request.accounts.map((account) => [account.id, cloneAccount(account)]),
  )
  for (const leg of request.debits) {
    const account = byId.get(leg.accountId)!
    if (
      (account.semantic === 'integer' && !isIntegerGameDecimal(leg.amount)) ||
      compareGameDecimals(leg.amount, account.balance) > 0
    ) {
      return rejectedAtomic(request, 'insufficient-source')
    }
    const next = subtractGameDecimals(account.balance, leg.amount)
    const represented = subtractGameDecimals(account.balance, next)
    if (!equalGameDecimals(represented, leg.amount)) {
      return rejectedAtomic(request, 'unrepresented-debit')
    }
    byId.set(account.id, Object.freeze({
      ...account,
      balance: cloneGameDecimal(next),
    }))
  }
  for (const leg of request.credits) {
    const account = byId.get(leg.accountId)!
    if (account.semantic === 'integer' && !isIntegerGameDecimal(leg.amount)) {
      return rejectedAtomic(request, 'invalid-request')
    }
    const next = addGameDecimals(account.balance, leg.amount)
    const represented = subtractGameDecimals(next, account.balance)
    if (!equalGameDecimals(represented, leg.amount)) {
      return rejectedAtomic(request, 'unrepresented-credit')
    }
    byId.set(account.id, Object.freeze({
      ...account,
      balance: cloneGameDecimal(next),
    }))
  }

  return Object.freeze({
    kind: 'v2-atomic-exchange-quote',
    sourceRevision: request.sourceRevision,
    accepted: true,
    changed: true,
    rejection: 'none',
    before: Object.freeze(request.accounts.map(cloneAccount)),
    after: Object.freeze(
      request.accounts.map((account) => cloneAccount(byId.get(account.id)!)),
    ),
    debited: Object.freeze(request.debits.map(cloneLeg)),
    credited: Object.freeze(request.credits.map(cloneLeg)),
  })
}

function snapshotAtomicRequest(
  request: Readonly<{
    sourceRevision: number
    accounts: readonly V2AtomicAccount[]
    debits: readonly V2AtomicLeg[]
    credits: readonly V2AtomicLeg[]
  }>,
) {
  return Object.freeze({
    sourceRevision: request.sourceRevision,
    accounts: Object.freeze(request.accounts.map(cloneAccount)),
    debits: Object.freeze(request.debits.map(cloneLeg)),
    credits: Object.freeze(request.credits.map(cloneLeg)),
  })
}

export function quoteV2AtomicExchange(
  request: Readonly<{
    sourceRevision: number
    accounts: readonly V2AtomicAccount[]
    debits: readonly V2AtomicLeg[]
    credits: readonly V2AtomicLeg[]
  }>,
): V2AtomicExchangeQuote {
  const snapshot = snapshotAtomicRequest(request)
  const quote = buildV2AtomicExchangeQuote(snapshot)
  atomicQuoteRederivers.set(
    quote,
    () => buildV2AtomicExchangeQuote(snapshot),
  )
  return quote
}

function equivalentAtomicQuotes(
  left: V2AtomicExchangeQuote,
  right: V2AtomicExchangeQuote,
): boolean {
  const equalAccounts = (
    leftAccounts: readonly V2AtomicAccount[],
    rightAccounts: readonly V2AtomicAccount[],
  ) => leftAccounts.length === rightAccounts.length &&
    leftAccounts.every((account, index) => {
      const other = rightAccounts[index]
      return other !== undefined &&
        account.id === other.id &&
        account.semantic === other.semantic &&
        equalGameDecimals(account.balance, other.balance)
    })
  const equalLegs = (
    leftLegs: readonly V2AtomicLeg[],
    rightLegs: readonly V2AtomicLeg[],
  ) => leftLegs.length === rightLegs.length &&
    leftLegs.every((leg, index) => {
      const other = rightLegs[index]
      return other !== undefined &&
        leg.accountId === other.accountId &&
        equalGameDecimals(leg.amount, other.amount)
    })
  return left.sourceRevision === right.sourceRevision &&
    left.accepted === right.accepted &&
    left.changed === right.changed &&
    left.rejection === right.rejection &&
    equalAccounts(left.before, right.before) &&
    equalAccounts(left.after, right.after) &&
    equalLegs(left.debited, right.debited) &&
    equalLegs(left.credited, right.credited)
}

export function commitV2AtomicExchange(
  quote: V2AtomicExchangeQuote,
  current: Readonly<{
    revision: number
    accounts: readonly V2AtomicAccount[]
  }>,
): V2AtomicExchangeCommitResult {
  const unchanged = (rejection: V2AtomicRejection) => Object.freeze({
    accepted: false,
    changed: false,
    rejection,
    revision: current.revision,
    accounts: Object.freeze(current.accounts.map(cloneAccount)),
  })
  if (quote === null || typeof quote !== 'object') {
    return unchanged('quote-rejected')
  }
  const rederive = atomicQuoteRederivers.get(quote)
  if (rederive === undefined) return unchanged('quote-rejected')
  if (!equivalentAtomicQuotes(quote, rederive())) {
    return unchanged('quote-rejected')
  }
  if (!quote.accepted) return unchanged('quote-rejected')
  if (current.revision !== quote.sourceRevision) {
    return unchanged('stale-revision')
  }
  if (!validRevision(current.revision)) {
    return unchanged('stale-revision')
  }
  if (quote.changed && current.revision === Number.MAX_SAFE_INTEGER) {
    return unchanged('revision-exhausted')
  }
  const currentById = new Map(
    current.accounts.map((account) => [account.id, account]),
  )
  if (
    current.accounts.length !== quote.before.length ||
    quote.before.some((account) => {
      const candidate = currentById.get(account.id)
      return candidate === undefined ||
        candidate.semantic !== account.semantic ||
        !equalGameDecimals(candidate.balance, account.balance)
    })
  ) {
    return unchanged('state-mismatch')
  }
  return Object.freeze({
    accepted: true,
    changed: quote.changed,
    rejection: 'none',
    revision: current.revision + 1,
    accounts: Object.freeze(quote.after.map(cloneAccount)),
  })
}
