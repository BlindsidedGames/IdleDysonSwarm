import { cloneCanonicalGameStateV2 } from '../game-state/cloneV2'
import type { CanonicalGameStateV2, QuantumStateV2 } from '../game-state/typesV2'
import { validateCanonicalGameStateV2 } from '../game-state/validateV2'
import {
  GAME_DECIMAL_ONE, GAME_DECIMAL_ZERO, cloneGameDecimal, compareGameDecimals,
  divideGameDecimals, equalGameDecimals, floorGameDecimal, gameDecimalFromBigInt,
  gameDecimalFromNumber, gameDecimalToBigIntChecked, isIntegerGameDecimal,
  isZeroGameDecimal, multiplyGameDecimals, powGameDecimal, subtractGameDecimals,
  type GameDecimal,
} from '../math/gameDecimal'
import {
  QUANTUM_V2_BULK_UPGRADE_IDS, QUANTUM_V2_DEFINITIONS, QUANTUM_V2_UPGRADE_IDS,
  type QuantumUpgradeIdV2,
} from './quantumCatalogV2'
import {
  commitV2Purchase, quoteV2FixedPriceBuyMax, quoteV2Purchase,
  selectV2PurchaseBatches, type V2PurchaseCommitResult, type V2PurchaseMode,
  type V2PurchaseQuote, type V2PurchaseRejection,
} from './transactionsV2'

const ID_SET = new Set<string>(QUANTUM_V2_UPGRADE_IDS)
const BULK_SET = new Set<string>(QUANTUM_V2_BULK_UPGRADE_IDS)
const MODE_SET = new Set<V2PurchaseMode>(['buy-1', 'buy-10', 'buy-50', 'buy-100', 'buy-max'])
const issued = new WeakMap<QuantumPurchaseQuoteV2, Readonly<{
  id: QuantumUpgradeIdV2
  mode: V2PurchaseMode
  sourceRevision: number
  sourceState: CanonicalGameStateV2
  unitsPerBatch: bigint
}>>()
const consumed = new WeakSet<QuantumPurchaseQuoteV2>()

export type QuantumPurchaseStatusV2 = 'ready' | 'invalid-request' | 'invalid-state' |
  'catalog-gap' | 'already-maxed' | 'prerequisites-not-met' | 'bulk-mode-forbidden' |
  'insufficient-funds' | 'invalid-cost'

export interface QuantumPurchaseQuoteV2 {
  readonly kind: 'quantum-v2-purchase-quote'
  readonly upgradeId: QuantumUpgradeIdV2
  readonly sourceRevision: number
  readonly requestedMode: V2PurchaseMode
  readonly status: QuantumPurchaseStatusV2
  readonly eligible: boolean
  readonly currentPurchases: GameDecimal
  readonly maximumPurchases: bigint | null
  readonly batches: GameDecimal
  readonly quotedCost: GameDecimal
  readonly transactionQuote: V2PurchaseQuote | null
}

export interface QuantumPurchaseResultV2 {
  readonly accepted: boolean
  readonly purchased: boolean
  readonly changed: boolean
  readonly status: QuantumPurchaseStatusV2 | V2PurchaseRejection
  readonly revision: number
  readonly state: CanonicalGameStateV2
  readonly upgradeId: QuantumUpgradeIdV2 | null
  readonly requestedMode: V2PurchaseMode | null
  readonly batches: GameDecimal
  readonly quotedCost: GameDecimal
  readonly debitedAmount: GameDecimal
}

export type QuantumSectionIdV2 = 'core' | 'skill-paths' | 'boosters' | 'cosmic-structures' | 'avocato'
export interface QuantumSectionPreviewV2 {
  readonly id: QuantumSectionIdV2
  readonly upgradeIds: readonly QuantumUpgradeIdV2[]
  readonly revealed: boolean
}

const SECTIONS = Object.freeze([
  Object.freeze({ id: 'core', ids: Object.freeze(['DoubleIP','BotMultitasking','Automation','BreakTheLoop','Secrets','Division','QuantumEntanglement'] as const), threshold: null, unlock: null }),
  Object.freeze({ id: 'skill-paths', ids: Object.freeze(['Fragments','Purity','Terra','Power','Paragade','Stellar'] as const), threshold: 3, unlock: null }),
  Object.freeze({ id: 'boosters', ids: Object.freeze(['InfluenceSpeed','CashBonus','ScienceBonus'] as const), threshold: 6, unlock: null }),
  Object.freeze({ id: 'cosmic-structures', ids: Object.freeze(['MatrioshkaBrains','BirchPlanets','GalacticBrains'] as const), threshold: null, unlock: 'breakTheLoop' as const }),
  Object.freeze({ id: 'avocato', ids: Object.freeze(['Avocado'] as const), threshold: 20, unlock: null }),
] as const)

export function previewQuantumSectionsV2(state: CanonicalGameStateV2): readonly QuantumSectionPreviewV2[] {
  if (!admitState(state)) return Object.freeze([])
  return Object.freeze(SECTIONS.map((section) => Object.freeze({
    id: section.id,
    upgradeIds: section.ids,
    revealed: section.threshold === null
      ? section.unlock === null || state.quantum.unlocks[section.unlock]
      : compareGameDecimals(state.quantum.lifetimeEarnedShards, gameDecimalFromNumber(section.threshold)) >= 0,
  })))
}

export function quoteQuantumUpgradeV2(
  state: CanonicalGameStateV2,
  sourceRevision: number,
  upgradeId: QuantumUpgradeIdV2,
  requestedMode: V2PurchaseMode = 'buy-1',
): QuantumPurchaseQuoteV2 {
  const quote = buildQuote(state, sourceRevision, upgradeId, requestedMode)
  if (admitState(state) && validRevision(sourceRevision) && isId(upgradeId) && isMode(requestedMode)) {
    issued.set(quote, Object.freeze({
      id: upgradeId,
      mode: requestedMode,
      sourceRevision,
      sourceState: cloneCanonicalGameStateV2(state),
      unitsPerBatch: effectUnits(state, upgradeId),
    }))
  }
  return quote
}

/** Read-only catalog projection. It validates once and does not mint commit authorities. */
export function previewQuantumUpgradeCatalogV2(
  state: CanonicalGameStateV2,
  sourceRevision: number,
): readonly QuantumPurchaseQuoteV2[] {
  if (!admitState(state) || !validRevision(sourceRevision)) {
    return Object.freeze([])
  }
  return Object.freeze(QUANTUM_V2_UPGRADE_IDS.map((upgradeId) =>
    buildQuote(state, sourceRevision, upgradeId, 'buy-1', true),
  ))
}

export function commitQuantumUpgradeV2(
  quote: QuantumPurchaseQuoteV2,
  state: CanonicalGameStateV2,
  currentRevision: number,
): QuantumPurchaseResultV2 {
  if (quote === null || typeof quote !== 'object') return rejected(state, currentRevision, 'quote-rejected')
  const descriptor = issued.get(quote)
  if (descriptor === undefined || consumed.has(quote)) return rejected(state, currentRevision, 'quote-rejected')
  consumed.add(quote)
  if (!validRevision(currentRevision) || !admitState(state)) return rejected(state, currentRevision, 'state-mismatch', quote)
  if (currentRevision !== descriptor.sourceRevision) return rejected(state, currentRevision, 'stale-revision', quote)
  const canonicalCurrent = cloneCanonicalGameStateV2(state)
  if (!exactDataTreeEqual(canonicalCurrent, descriptor.sourceState)) return rejected(canonicalCurrent, currentRevision, 'state-mismatch', quote)
  const authoritative = buildQuote(canonicalCurrent, currentRevision, descriptor.id, descriptor.mode)
  if (!equivalent(quote, authoritative)) {
    return rejected(state, currentRevision, currentRevision === quote.sourceRevision ? 'state-mismatch' : 'stale-revision', quote)
  }
  if (quote.transactionQuote === null) return rejected(state, currentRevision, quote.status, quote)
  const transaction = commitV2Purchase(quote.transactionQuote, {
    revision: currentRevision,
    balance: canonicalCurrent.quantum.availableShards,
    output: purchaseOutput(canonicalCurrent, descriptor.id),
  })
  if (!transaction.accepted) return rejected(state, currentRevision, transaction.rejection, quote, transaction)
  const candidate = transaction.changed
    ? applyEffect(canonicalCurrent, descriptor.id, transaction)
    : canonicalCurrent
  const representedBatches = divideGameDecimals(
    subtractGameDecimals(transaction.output, purchaseOutput(canonicalCurrent, descriptor.id)),
    gameDecimalFromBigInt(descriptor.unitsPerBatch),
  )
  return Object.freeze({
    accepted: true,
    purchased: !isZeroGameDecimal(representedBatches),
    changed: transaction.changed,
    status: 'ready' as const,
    revision: transaction.revision,
    state: candidate,
    upgradeId: descriptor.id,
    requestedMode: descriptor.mode,
    batches: cloneGameDecimal(representedBatches),
    quotedCost: cloneGameDecimal(transaction.quotedCost),
    debitedAmount: cloneGameDecimal(transaction.debitedAmount),
  })
}

function buildQuote(state: CanonicalGameStateV2, revision: number, id: QuantumUpgradeIdV2, mode: V2PurchaseMode, stateAlreadyAdmitted = false): QuantumPurchaseQuoteV2 {
  const safeId = isId(id) ? id : QUANTUM_V2_UPGRADE_IDS[0]
  const safeMode = isMode(mode) ? mode : 'buy-1'
  if (!isId(id) || !isMode(mode) || !validRevision(revision)) return empty(safeId, revision, safeMode, 'invalid-request')
  if (!stateAlreadyAdmitted && !admitState(state)) return empty(id, revision, mode, 'invalid-state')
  const definition = QUANTUM_V2_DEFINITIONS[id]
  if (definition === undefined) return empty(id, revision, mode, 'catalog-gap')
  const current = purchaseOutput(state, id)
  const currentPurchases = purchaseCount(state, id)
  if (!isIntegerGameDecimal(current)) return empty(id, revision, mode, 'invalid-state', current)
  if (!BULK_SET.has(id) && mode !== 'buy-1') return empty(id, revision, mode, 'bulk-mode-forbidden', currentPurchases, definition.maximumPurchases)
  if (!prerequisitesMet(state, id)) return empty(id, revision, mode, 'prerequisites-not-met', currentPurchases, definition.maximumPurchases)
  const maximumOutput = definition.maximumPurchases === null ? null : definition.maximumPurchases * definition.unitsPerPurchase
  if (maximumOutput !== null && compareGameDecimals(current, gameDecimalFromBigInt(maximumOutput)) >= 0) {
    return empty(id, revision, mode, 'already-maxed', currentPurchases, definition.maximumPurchases)
  }
  try {
    const price = definition.costScaling === 'exponential'
      ? multiplyGameDecimals(definition.baseCost, powGameDecimal(gameDecimalFromNumber(2), Number(state.quantum.divisionsPurchased)))
      : definition.baseCost
    const common = {
      currencyPath: '$.quantum.availableShards', sourceRevision: revision,
      balance: state.quantum.availableShards, balanceSemantic: 'integer' as const,
      output: current, outputSemantic: 'integer' as const,
      unitsPerPurchase: gameDecimalFromBigInt(effectUnits(state, id)),
      integerCost: true, negligibleDebitPolicy: 'allow-for-purchase' as const,
    }
    let transaction: V2PurchaseQuote
    if (mode === 'buy-max') {
      transaction = quoteV2FixedPriceBuyMax({ ...common, pricePerBatch: price })
    } else {
      const batches = selectV2PurchaseBatches({
        mode, rounded: false, currentOwned: currentPurchases,
        affordable: floorGameDecimal(divideGameDecimals(state.quantum.availableShards, price)),
      })
      transaction = quoteV2Purchase({ ...common, requestedMode: mode, batches, quotedCost: multiplyGameDecimals(price, batches) })
    }
    if (!transaction.accepted) return empty(id, revision, mode, transaction.rejection === 'insufficient-funds' ? 'insufficient-funds' : 'invalid-cost', currentPurchases, definition.maximumPurchases)
    return Object.freeze({
      kind: 'quantum-v2-purchase-quote', upgradeId: id, sourceRevision: revision,
      requestedMode: mode, status: 'ready', eligible: true,
      currentPurchases: cloneGameDecimal(currentPurchases), maximumPurchases: definition.maximumPurchases,
      batches: cloneGameDecimal(transaction.batches), quotedCost: cloneGameDecimal(transaction.quotedCost), transactionQuote: transaction,
    })
  } catch { return empty(id, revision, mode, 'invalid-cost', currentPurchases, definition.maximumPurchases) }
}

function applyEffect(state: CanonicalGameStateV2, id: QuantumUpgradeIdV2, transaction: V2PurchaseCommitResult): CanonicalGameStateV2 {
  type MutableQuantum = { -readonly [Key in keyof QuantumStateV2]: QuantumStateV2[Key] }
  const q: MutableQuantum = { ...state.quantum, availableShards: transaction.balance }
  let candidate: CanonicalGameStateV2 = { ...state, quantum: q }
  if (id === 'Division') q.divisionsPurchased = gameDecimalToBigIntChecked(transaction.output, { maximum: 19n })
  else if (id === 'Secrets') {
    const secrets = gameDecimalToBigIntChecked(transaction.output, { maximum: 27n })
    q.permanentSecrets = secrets
    const sessionSecrets = state.infinity.secretsOfTheUniverse + 3n > 27n
      ? 27n
      : state.infinity.secretsOfTheUniverse + 3n
    candidate = { ...candidate, infinity: { ...state.infinity, secretsOfTheUniverse: sessionSecrets } }
  } else if (id === 'InfluenceSpeed') q.influenceSpeedBonus = transaction.output
  else if (id === 'CashBonus') q.cashBonusLevels = transaction.output
  else if (id === 'ScienceBonus') q.scienceBonusLevels = transaction.output
  else if (id === 'Avocado') candidate = { ...candidate, avocado: { ...state.avocado, unlocked: true } }
  else if (id === 'Automation') {
    q.unlocks = { ...q.unlocks, automation: true }
    candidate = { ...candidate, infinity: { ...state.infinity, automationUnlocked: { research: true, bots: true } } }
  } else if (id === 'BreakTheLoop') {
    q.unlocks = { ...q.unlocks, breakTheLoop: true }
    candidate = {
      ...candidate,
      infinity: {
        ...state.infinity,
        breakTarget: compareGameDecimals(state.infinity.breakTarget, GAME_DECIMAL_ONE) < 0
          ? GAME_DECIMAL_ONE
          : state.infinity.breakTarget,
      },
    }
  } else {
    const key = unlockKey(id)
    if (key !== null) q.unlocks = { ...q.unlocks, [key]: true }
  }
  return cloneCanonicalGameStateV2(candidate)
}

function purchaseOutput(state: CanonicalGameStateV2, id: QuantumUpgradeIdV2): GameDecimal {
  if (id === 'Division') return gameDecimalFromBigInt(state.quantum.divisionsPurchased)
  if (id === 'Secrets') return gameDecimalFromBigInt(state.quantum.permanentSecrets)
  if (id === 'InfluenceSpeed') return state.quantum.influenceSpeedBonus
  if (id === 'CashBonus') return state.quantum.cashBonusLevels
  if (id === 'ScienceBonus') return state.quantum.scienceBonusLevels
  return (id === 'Avocado' ? state.avocado.unlocked : id === 'Automation' ? state.quantum.unlocks.automation : owned(state, id)) ? GAME_DECIMAL_ONE : GAME_DECIMAL_ZERO
}

function purchaseCount(state: CanonicalGameStateV2, id: QuantumUpgradeIdV2): GameDecimal {
  if (id === 'Secrets') return gameDecimalFromBigInt(state.quantum.permanentSecrets / 3n)
  if (id === 'InfluenceSpeed') return floorGameDecimal(divideGameDecimals(state.quantum.influenceSpeedBonus, gameDecimalFromNumber(4)))
  return purchaseOutput(state, id)
}

function effectUnits(state: CanonicalGameStateV2, id: QuantumUpgradeIdV2): bigint {
  if (id === 'Secrets') return 27n - state.quantum.permanentSecrets < 3n
    ? 27n - state.quantum.permanentSecrets
    : 3n
  return QUANTUM_V2_DEFINITIONS[id].unitsPerPurchase
}

function prerequisitesMet(state: CanonicalGameStateV2, id: QuantumUpgradeIdV2): boolean {
  if (['Fragments','Purity','Terra','Power','Paragade','Stellar'].includes(id) &&
    compareGameDecimals(state.quantum.lifetimeEarnedShards, gameDecimalFromNumber(3)) < 0) return false
  if (BULK_SET.has(id) && compareGameDecimals(state.quantum.lifetimeEarnedShards, gameDecimalFromNumber(6)) < 0) return false
  if (id === 'Avocado' && compareGameDecimals(state.quantum.lifetimeEarnedShards, gameDecimalFromNumber(20)) < 0) return false
  if (id === 'MatrioshkaBrains') return state.quantum.unlocks.breakTheLoop
  if (id === 'BirchPlanets') return state.quantum.unlocks.breakTheLoop && state.quantum.unlocks.matrioshkaBrains
  if (id === 'GalacticBrains') return state.quantum.unlocks.breakTheLoop && state.quantum.unlocks.matrioshkaBrains && state.quantum.unlocks.birchPlanets
  return true
}

function owned(state: CanonicalGameStateV2, id: QuantumUpgradeIdV2): boolean {
  const key = unlockKey(id); return key === null ? false : state.quantum.unlocks[key]
}

function unlockKey(id: QuantumUpgradeIdV2): keyof QuantumStateV2['unlocks'] | null {
  const keys: Partial<Record<QuantumUpgradeIdV2, keyof QuantumStateV2['unlocks']>> = {
    BotMultitasking:'botMultitasking', DoubleIP:'doubleInfinityPoints', BreakTheLoop:'breakTheLoop', QuantumEntanglement:'quantumEntanglement',
    Fragments:'fragments', Purity:'purity', Terra:'terra', Power:'power', Paragade:'paragade', Stellar:'stellar',
    MatrioshkaBrains:'matrioshkaBrains', BirchPlanets:'birchPlanets', GalacticBrains:'galacticBrains',
  }
  return keys[id] ?? null
}

function empty(id: QuantumUpgradeIdV2, revision: number, mode: V2PurchaseMode, status: QuantumPurchaseStatusV2, current = GAME_DECIMAL_ZERO, maximum: bigint | null = null): QuantumPurchaseQuoteV2 {
  return Object.freeze({ kind:'quantum-v2-purchase-quote', upgradeId:id, sourceRevision:revision, requestedMode:mode, status, eligible:false,
    currentPurchases:cloneGameDecimal(current), maximumPurchases:maximum, batches:cloneGameDecimal(GAME_DECIMAL_ZERO), quotedCost:cloneGameDecimal(GAME_DECIMAL_ZERO), transactionQuote:null })
}

function rejected(state: CanonicalGameStateV2, revision: number, status: QuantumPurchaseResultV2['status'], quote?: QuantumPurchaseQuoteV2, transaction?: V2PurchaseCommitResult): QuantumPurchaseResultV2 {
  return Object.freeze({ accepted:false, purchased:false, changed:false, status, revision: validRevision(revision) ? revision : 0, state,
    upgradeId:quote?.upgradeId ?? null, requestedMode:quote?.requestedMode ?? null,
    batches:cloneGameDecimal(GAME_DECIMAL_ZERO), quotedCost:cloneGameDecimal(transaction?.quotedCost ?? quote?.quotedCost ?? GAME_DECIMAL_ZERO),
    debitedAmount:cloneGameDecimal(transaction?.debitedAmount ?? GAME_DECIMAL_ZERO) })
}

function equivalent(a: QuantumPurchaseQuoteV2, b: QuantumPurchaseQuoteV2): boolean {
  return a.kind === b.kind && a.upgradeId === b.upgradeId && a.sourceRevision === b.sourceRevision && a.requestedMode === b.requestedMode &&
    a.status === b.status && a.eligible === b.eligible && a.maximumPurchases === b.maximumPurchases &&
    equalGameDecimals(a.currentPurchases,b.currentPurchases) && equalGameDecimals(a.batches,b.batches) && equalGameDecimals(a.quotedCost,b.quotedCost)
}

function admitState(value: unknown): value is CanonicalGameStateV2 { return validateCanonicalGameStateV2(value).valid }
function validRevision(value: unknown): value is number { return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0) }
function isId(value: unknown): value is QuantumUpgradeIdV2 { return typeof value === 'string' && ID_SET.has(value) }
function isMode(value: unknown): value is V2PurchaseMode { return typeof value === 'string' && MODE_SET.has(value as V2PurchaseMode) }

function exactDataTreeEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true
  if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object') return false
  if (Object.getPrototypeOf(left) !== Object.getPrototypeOf(right)) return false
  const leftKeys = Reflect.ownKeys(left)
  const rightKeys = Reflect.ownKeys(right)
  if (leftKeys.length !== rightKeys.length || leftKeys.some((key) => !rightKeys.includes(key))) return false
  for (const key of leftKeys) {
    const a = Object.getOwnPropertyDescriptor(left, key)
    const b = Object.getOwnPropertyDescriptor(right, key)
    if (a === undefined || b === undefined || !('value' in a) || !('value' in b) ||
      a.enumerable !== b.enumerable || a.configurable !== b.configurable || a.writable !== b.writable ||
      !exactDataTreeEqual(a.value, b.value)) return false
  }
  return true
}
