import { getGameAsset, getGameAssetsByKind } from '../game-data/catalog'
import type { RuntimeGameAsset } from '../game-data/types'
import type { DysonCompatibilityTuning } from '../game-state/compatibilityTuning'
import {
  cloneCanonicalRuntimeSidecarV2,
  type CanonicalRuntimeSidecarV2,
} from '../game-state/runtimeV2'
import { resolveDysonTuningProfileV2 } from '../game-state/dysonTuningV2'
import type {
  CanonicalGameStateV2,
  CanonicalResearchId,
  CappedResearchId,
  ResearchLevelsV2,
  UnboundedResearchId,
} from '../game-state/typesV2'
import { validateCanonicalGameStateV2 } from '../game-state/validateV2'
import {
  GAME_DECIMAL_ONE,
  GAME_DECIMAL_ZERO,
  addGameDecimals,
  ceilGameDecimal,
  cloneGameDecimal,
  compareGameDecimals,
  divideGameDecimals,
  equalGameDecimals,
  gameDecimalFromBigInt,
  gameDecimalFromNumber,
  gameDecimalToBigIntChecked,
  isZeroGameDecimal,
  minGameDecimal,
  multiplyGameDecimals,
  subtractGameDecimals,
  type GameDecimal,
} from '../math/gameDecimal'
import { deriveSecretBuffs } from './secretBuffs'
import {
  commitV2Purchase,
  exponentialCostV2,
  geometricSeriesCostV2,
  maximumAffordableGeometricBatchesV2,
  quoteV2GeometricBuyMax,
  quoteV2Purchase,
  selectV2PurchaseBatches,
  type V2PurchaseCommitResult,
  type V2PurchaseMode,
  type V2PurchaseQuote,
  type V2PurchaseRejection,
} from './transactionsV2'

export const RESEARCH_V2_IDS = Object.freeze([
  'research.ai_manager_upgrade',
  'research.assembly_line_upgrade',
  'research.birch_planets_upgrade',
  'research.data_center_upgrade',
  'research.galactic_brains_upgrade',
  'research.matrioshka_brains_upgrade',
  'research.money_multiplier',
  'research.panel_lifetime_1',
  'research.panel_lifetime_2',
  'research.panel_lifetime_3',
  'research.panel_lifetime_4',
  'research.planet_upgrade',
  'research.science_boost',
  'research.server_upgrade',
] as const satisfies readonly CanonicalResearchId[])

export const CAPPED_RESEARCH_V2_IDS = Object.freeze([
  'research.panel_lifetime_1',
  'research.panel_lifetime_2',
  'research.panel_lifetime_3',
  'research.panel_lifetime_4',
] as const satisfies readonly CappedResearchId[])

export const UNBOUNDED_RESEARCH_V2_IDS = Object.freeze(
  RESEARCH_V2_IDS.filter(
    (id): id is UnboundedResearchId => !isCappedResearchId(id),
  ),
)

export type ResearchV2AutomationPolicy =
  | 'preserve-configured-mode'
  | 'force-buy-max'

export type ResearchV2QuoteStatus =
  | 'ready'
  | 'already-maxed'
  | 'automation-disabled'
  | 'prerequisites-not-met'
  | 'catalog-gap'
  | 'invalid-state'
  | 'invalid-tuning'
  | V2PurchaseRejection

export interface ResearchV2Definition {
  readonly id: CanonicalResearchId
  readonly autoBuyGroup: number
  readonly baseCost: number
  readonly exponent: number
  readonly maximumLevel: 1n | null
  readonly prerequisiteResearchIds: readonly CanonicalResearchId[]
  readonly prerequisiteFacilityId: string | null
  readonly prerequisiteFacilityOwned: number
  readonly coefficientField: keyof DysonCompatibilityTuning | null
}

export interface ResearchV2PurchaseQuote {
  readonly kind: 'research-v2-purchase-quote'
  readonly researchId: CanonicalResearchId
  readonly tuningProfileId: CanonicalRuntimeSidecarV2['dysonTuningProfile']
  readonly sourceRevision: number
  readonly requestedMode: V2PurchaseMode
  readonly roundedBulkBuy: boolean
  readonly automated: boolean
  readonly eligible: boolean
  readonly changed: boolean
  readonly status: ResearchV2QuoteStatus
  readonly currentLevel: GameDecimal
  readonly maximumLevel: 1n | null
  readonly affordableBatches: GameDecimal
  readonly batches: GameDecimal
  readonly quotedCost: GameDecimal
  readonly debitedAmount: GameDecimal
  readonly transactionQuote: V2PurchaseQuote | null
}

export interface ResearchV2PurchaseResult {
  readonly accepted: boolean
  readonly purchased: boolean
  readonly changed: boolean
  readonly status: ResearchV2QuoteStatus
  readonly revision: number
  readonly state: CanonicalGameStateV2
  readonly researchId: CanonicalResearchId | null
  readonly requestedMode: V2PurchaseMode | null
  readonly batches: GameDecimal
  readonly quotedCost: GameDecimal
  readonly debitedAmount: GameDecimal
}

export interface ResearchV2PresentationFacts {
  readonly prerequisitesMet: boolean
  readonly visible: boolean
  readonly maxed: boolean
  readonly automationActive: boolean
  readonly effectKind: 'percentage' | 'panel-lifetime-seconds'
  readonly perLevelEffect: GameDecimal
  readonly currentEffect: GameDecimal
  readonly projectedEffect: GameDecimal
  readonly passiveProgress: GameDecimal
}

export interface ResearchV2AutomationAttempt {
  readonly researchId: CanonicalResearchId
  readonly quote: ResearchV2PurchaseQuote
  readonly result: ResearchV2PurchaseResult
}

/** Bounded phase evidence for later scheduler/authority integration. */
export interface ResearchV2PhaseAccounting {
  readonly kind: 'research-v2-phase-accounting'
  readonly sourceRevision: number
  readonly startTargetIndex: number
  readonly nextTargetIndex: number
  readonly visitedResearchCount: number
  readonly successfulPurchaseCount: number
  readonly purchasedBatches: GameDecimal
  readonly scienceDebited: GameDecimal
  readonly progressPolicy: 'preserve-until-infinity-reset'
}

export interface ResearchV2AutomationResult {
  readonly state: CanonicalGameStateV2
  readonly revision: number
  readonly changed: boolean
  readonly startIndex: number
  readonly nextTargetIndex: number
  readonly attempts: readonly ResearchV2AutomationAttempt[]
  readonly accounting: ResearchV2PhaseAccounting
}

type QuoteDescriptor = Readonly<{
  researchId: CanonicalResearchId
  requestedMode: V2PurchaseMode
  roundedBulkBuy: boolean
  automated: boolean
}>

type ExpectedDefinition = ResearchV2Definition & Readonly<{
  readonly effectId: string
  readonly targetStatId: string
  readonly perLevel: number
}>

export type ResearchV2CatalogEffectLookup = (
  kind: string,
  id: string,
) => RuntimeGameAsset | undefined

const PURCHASE_MODES = new Set<V2PurchaseMode>([
  'buy-1',
  'buy-10',
  'buy-50',
  'buy-100',
  'buy-max',
])

const COEFFICIENT_BY_RESEARCH_ID: Readonly<Partial<
  Record<CanonicalResearchId, keyof DysonCompatibilityTuning>
>> = Object.freeze({
  'research.money_multiplier': 'moneyMultiUpgradePercent',
  'research.science_boost': 'scienceBoostPercent',
  'research.assembly_line_upgrade': 'assemblyLineUpgradePercent',
  'research.ai_manager_upgrade': 'aiManagerUpgradePercent',
  'research.server_upgrade': 'serverUpgradePercent',
  'research.data_center_upgrade': 'dataCenterUpgradePercent',
  'research.planet_upgrade': 'planetUpgradePercent',
  'research.matrioshka_brains_upgrade': 'matrioshkaUpgradePercent',
  'research.birch_planets_upgrade': 'birchUpgradePercent',
  'research.galactic_brains_upgrade': 'galacticUpgradePercent',
})

const AUTOMATION_ID_BY_GROUP = Object.freeze({
  2: 'research.science_boost',
  3: 'research.money_multiplier',
  4: 'research.assembly_line_upgrade',
  5: 'research.ai_manager_upgrade',
  6: 'research.server_upgrade',
  7: 'research.data_center_upgrade',
  8: 'research.planet_upgrade',
  9: 'research.matrioshka_brains_upgrade',
  10: 'research.birch_planets_upgrade',
  11: 'research.galactic_brains_upgrade',
} as const satisfies Readonly<Record<number, CanonicalResearchId>>)

const EXPECTED_DEFINITIONS = Object.freeze([
  expected('research.ai_manager_upgrade', 5, 1_000_000, 1.5, null, [], null, 'effect.research.ai_manager_modifier', 'Facility.Manager.Modifier', 0),
  expected('research.assembly_line_upgrade', 4, 50_000, 1.4, null, [], null, 'effect.research.assembly_line_modifier', 'Facility.AssemblyLine.Modifier', 0),
  expected('research.birch_planets_upgrade', 10, 50_000_000_000, 1.82, null, [], 'birch_planets', 'effect.research.birch_modifier', 'Facility.Birch.Modifier', 0),
  expected('research.data_center_upgrade', 7, 1_000_000_000, 1.7, null, [], null, 'effect.research.data_center_modifier', 'Facility.DataCenter.Modifier', 0),
  expected('research.galactic_brains_upgrade', 11, 250_000_000_000, 1.85, null, [], 'galactic_brains', 'effect.research.galactic_modifier', 'Facility.Galactic.Modifier', 0),
  expected('research.matrioshka_brains_upgrade', 9, 10_000_000_000, 1.8, null, [], 'matrioshka_brains', 'effect.research.matrioshka_modifier', 'Facility.Matrioshka.Modifier', 0),
  expected('research.money_multiplier', 3, 5_000, 1.77, null, [], null, 'effect.research.money_multiplier', 'Global.MoneyMultiplier', 0),
  expected('research.panel_lifetime_1', 1, 1_000_000_000, 1, 1n, [], null, 'effect.research.panel_lifetime_1', 'Global.PanelLifetime', 1),
  expected('research.panel_lifetime_2', 1, 1_000_000_000_000, 1, 1n, ['research.panel_lifetime_1'], null, 'effect.research.panel_lifetime_2', 'Global.PanelLifetime', 2),
  expected('research.panel_lifetime_3', 1, 1_000_000_000_000_000, 1, 1n, ['research.panel_lifetime_2'], null, 'effect.research.panel_lifetime_3', 'Global.PanelLifetime', 3),
  expected('research.panel_lifetime_4', 1, 1_000_000_000_000_000_000, 1, 1n, ['research.panel_lifetime_3'], null, 'effect.research.panel_lifetime_4', 'Global.PanelLifetime', 4),
  expected('research.planet_upgrade', 8, 2_000_000_000, 1.8, null, [], null, 'effect.research.planet_modifier', 'Facility.Planet.Modifier', 0),
  expected('research.science_boost', 2, 10_000, 1.55, null, [], null, 'effect.research.science_multiplier', 'Global.ScienceMultiplier', 0),
  expected('research.server_upgrade', 6, 100_000_000, 1.6, null, [], null, 'effect.research.server_modifier', 'Facility.Server.Modifier', 0),
] as const satisfies readonly ExpectedDefinition[])

const quoteDescriptors = new WeakMap<ResearchV2PurchaseQuote, QuoteDescriptor>()
const admittedResearchStates = new WeakSet<object>()
const admittedRuntimeSidecars = new WeakMap<
  object,
  Readonly<CanonicalRuntimeSidecarV2>
>()
const catalogContract = readCatalogContract(
  getGameAssetsByKind('GameData.ResearchDefinition'),
  getGameAsset,
)

export const RESEARCH_V2_CATALOG_CONTRACT_VALID = catalogContract.valid
export const RESEARCH_V2_DEFINITIONS = catalogContract.definitions

export function validateResearchV2CatalogIngress(
  researchAssets: readonly RuntimeGameAsset[],
  effectLookup: ResearchV2CatalogEffectLookup,
): boolean {
  return readCatalogContract(researchAssets, effectLookup).valid
}

export function quoteV2ResearchPurchase(
  state: CanonicalGameStateV2,
  runtime: Readonly<CanonicalRuntimeSidecarV2>,
  sourceRevision: number,
  researchId: CanonicalResearchId,
  requestedMode?: V2PurchaseMode,
  roundedBulkBuy?: boolean,
): ResearchV2PurchaseQuote {
  return registerQuote(buildQuote(
    state,
    runtime,
    sourceRevision,
    researchId,
    requestedMode,
    roundedBulkBuy,
    false,
  ))
}

/**
 * Projects the current V2 Research card without consulting the legacy V1
 * selector. Unbounded levels and their displayed effects remain GameDecimal;
 * only authored coefficients are lifted from bounded catalog/tuning numbers.
 */
export function selectResearchV2PresentationFacts(
  state: CanonicalGameStateV2,
  runtime: Readonly<CanonicalRuntimeSidecarV2>,
  researchId: CanonicalResearchId,
  projectedBatches: GameDecimal,
): ResearchV2PresentationFacts | null {
  if (!admitResearchState(state) || admitResearchRuntime(runtime) === null) return null
  const definition = catalogContract.byId.get(researchId)
  const expectedDefinition = EXPECTED_DEFINITIONS.find(({ id }) => id === researchId)
  if (definition === undefined || expectedDefinition === undefined) return null
  let tuning: Readonly<DysonCompatibilityTuning>
  try {
    tuning = effectiveTuning(state, runtime)
  } catch {
    return null
  }
  const currentLevel = currentLevelDecimal(state, researchId)
  const maxed = definition.maximumLevel !== null &&
    compareGameDecimals(currentLevel, gameDecimalFromBigInt(definition.maximumLevel)) >= 0
  const coefficientField = definition.coefficientField
  const effectKind = coefficientField === null
    ? 'panel-lifetime-seconds' as const
    : 'percentage' as const
  const authoredEffect = coefficientField === null
    ? expectedDefinition.perLevel
    : tuning[coefficientField] * 100
  if (!Number.isFinite(authoredEffect) || authoredEffect < 0) return null
  const perLevelEffect = gameDecimalFromNumber(authoredEffect)
  const projectedLevel = addGameDecimals(currentLevel, projectedBatches)
  const meetsPrerequisites = prerequisitesMet(state, definition)
  return Object.freeze({
    prerequisitesMet: meetsPrerequisites,
    visible: (meetsPrerequisites || !isZeroGameDecimal(currentLevel)) && !maxed,
    maxed,
    automationActive: state.infinity.automationUnlocked.research &&
      automationEnabled(state, definition),
    effectKind,
    perLevelEffect,
    currentEffect: multiplyGameDecimals(currentLevel, perLevelEffect),
    projectedEffect: multiplyGameDecimals(projectedLevel, perLevelEffect),
    passiveProgress: cloneGameDecimal(state.research.progressById[researchId]),
  })
}

export function commitV2ResearchPurchase(
  quote: ResearchV2PurchaseQuote,
  state: CanonicalGameStateV2,
  runtime: Readonly<CanonicalRuntimeSidecarV2>,
  currentRevision: number,
): ResearchV2PurchaseResult {
  if (quote === null || typeof quote !== 'object') {
    return rejectedResult(state, currentRevision, 'quote-rejected')
  }
  const descriptor = quoteDescriptors.get(quote)
  if (descriptor === undefined) {
    return rejectedResult(state, currentRevision, 'quote-rejected')
  }
  const authoritative = buildQuote(
    state,
    runtime,
    currentRevision,
    descriptor.researchId,
    descriptor.requestedMode,
    descriptor.roundedBulkBuy,
    descriptor.automated,
  )
  if (!equivalentQuotes(quote, authoritative)) {
    return rejectedResult(
      state,
      currentRevision,
      currentRevision === quote.sourceRevision ? 'state-mismatch' : 'stale-revision',
      quote,
    )
  }
  if (quote.transactionQuote === null) {
    return rejectedResult(state, currentRevision, quote.status, quote)
  }
  const committed = commitV2Purchase(quote.transactionQuote, {
    revision: currentRevision,
    balance: state.dyson.science,
    output: currentLevelDecimal(state, descriptor.researchId),
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
  const representedBatches = subtractGameDecimals(
    committed.output,
    currentLevelDecimal(state, descriptor.researchId),
  )
  const purchased = !isZeroGameDecimal(representedBatches)
  const candidate = committed.changed
    ? replacePurchasedResearch(state, descriptor.researchId, committed)
    : state
  return Object.freeze({
    accepted: true,
    purchased,
    changed: committed.changed,
    status: 'ready' as const,
    revision: committed.revision,
    state: candidate,
    researchId: descriptor.researchId,
    requestedMode: descriptor.requestedMode,
    batches: cloneGameDecimal(representedBatches),
    quotedCost: cloneGameDecimal(committed.quotedCost),
    debitedAmount: cloneGameDecimal(committed.debitedAmount),
  })
}

export function planV2ResearchAutomationTargets(
  targetIndex: number,
): readonly CanonicalResearchId[] {
  const start = normalizeTargetIndex(targetIndex)
  return Object.freeze(Array.from(
    { length: RESEARCH_V2_IDS.length },
    (_, offset) => RESEARCH_V2_IDS[(start + offset) % RESEARCH_V2_IDS.length]!,
  ))
}

export function runV2ResearchAutomationTick(
  state: CanonicalGameStateV2,
  runtime: Readonly<CanonicalRuntimeSidecarV2>,
  sourceRevision: number,
  policy: ResearchV2AutomationPolicy = 'preserve-configured-mode',
): ResearchV2AutomationResult {
  if (!admitResearchState(state)) {
    throw new TypeError('Research V2 automation requires a valid CanonicalGameStateV2.')
  }
  if (admitResearchRuntime(runtime) === null) {
    throw new TypeError('Research V2 automation requires a valid CanonicalRuntimeSidecarV2.')
  }
  if (!validRevision(sourceRevision) || sourceRevision === Number.MAX_SAFE_INTEGER) {
    throw new RangeError('Research V2 automation requires an incrementable application revision.')
  }
  if (policy !== 'preserve-configured-mode' && policy !== 'force-buy-max') {
    throw new RangeError('Unknown Research V2 automation policy.')
  }
  const startIndex = normalizeTargetIndex(state.timeline.researchAutomationTargetIndex)
  if (!state.infinity.automationUnlocked.research) {
    return automationResult(
      state,
      sourceRevision,
      false,
      startIndex,
      startIndex,
      [],
      GAME_DECIMAL_ZERO,
      GAME_DECIMAL_ZERO,
    )
  }

  let candidate = state
  let purchasedBatches = cloneGameDecimal(GAME_DECIMAL_ZERO)
  let scienceDebited = cloneGameDecimal(GAME_DECIMAL_ZERO)
  const attempts: ResearchV2AutomationAttempt[] = []
  for (const researchId of planV2ResearchAutomationTargets(startIndex)) {
    const quote = registerQuote(buildQuote(
      candidate,
      runtime,
      sourceRevision,
      researchId,
      policy === 'force-buy-max'
        ? 'buy-max'
        : candidate.research.automation.buyMode,
      candidate.research.automation.roundedBulkBuy,
      true,
    ))
    const result = commitV2ResearchPurchase(
      quote,
      candidate,
      runtime,
      sourceRevision,
    )
    candidate = result.state
    if (result.purchased) {
      purchasedBatches = addGameDecimals(purchasedBatches, result.batches)
    }
    if (result.changed) {
      scienceDebited = addGameDecimals(scienceDebited, result.debitedAmount)
    }
    attempts.push(Object.freeze({ researchId, quote, result }))
  }
  const nextTargetIndex = (startIndex + 1) % RESEARCH_V2_IDS.length
  candidate = replaceAutomationTargetIndex(candidate, nextTargetIndex)
  return automationResult(
    candidate,
    sourceRevision + 1,
    true,
    startIndex,
    nextTargetIndex,
    attempts,
    purchasedBatches,
    scienceDebited,
  )
}

/** Clears the closed Research levels/progress graph for an Infinity reset. */
export function resetV2ResearchForInfinity(
  state: CanonicalGameStateV2,
): CanonicalGameStateV2 {
  const levelsById = Object.fromEntries(RESEARCH_V2_IDS.map((id) => [
    id,
    isCappedResearchId(id) ? 0n : cloneGameDecimal(GAME_DECIMAL_ZERO),
  ])) as unknown as ResearchLevelsV2
  const progressById = Object.fromEntries(RESEARCH_V2_IDS.map((id) => [
    id,
    cloneGameDecimal(GAME_DECIMAL_ZERO),
  ])) as Readonly<Record<CanonicalResearchId, GameDecimal>>
  return Object.freeze({
    ...state,
    research: Object.freeze({
      ...state.research,
      levelsById: Object.freeze(levelsById),
      progressById: Object.freeze(progressById),
    }),
  })
}

function buildQuote(
  state: CanonicalGameStateV2,
  runtime: Readonly<CanonicalRuntimeSidecarV2>,
  sourceRevision: number,
  researchId: CanonicalResearchId,
  requestedMode: V2PurchaseMode | undefined,
  roundedBulkBuy: boolean | undefined,
  automated: boolean,
): ResearchV2PurchaseQuote {
  const safeId = isResearchId(researchId) ? researchId : RESEARCH_V2_IDS[0]
  const stateValid = admitResearchState(state)
  const admittedRuntime = admitResearchRuntime(runtime)
  const tuningProfileId = admittedRuntime?.dysonTuningProfile ?? 'web-authored-v1'
  if (stateValid) {
    requestedMode ??= state.research.automation.buyMode
    roundedBulkBuy ??= state.research.automation.roundedBulkBuy
  }
  if (
    !isResearchId(researchId) ||
    !validRevision(sourceRevision) ||
    !isPurchaseMode(requestedMode) ||
    typeof roundedBulkBuy !== 'boolean' ||
    typeof automated !== 'boolean' ||
    !stateValid ||
    admittedRuntime === null
  ) {
    return emptyQuote(
      safeId,
      tuningProfileId,
      sourceRevision,
      isPurchaseMode(requestedMode) ? requestedMode : 'buy-1',
      roundedBulkBuy === true,
      automated === true,
      'invalid-state',
    )
  }
  if (!catalogContract.valid) {
    return emptyQuote(safeId, tuningProfileId, sourceRevision, requestedMode, roundedBulkBuy, automated, 'catalog-gap')
  }
  let tuning: Readonly<DysonCompatibilityTuning>
  try {
    tuning = effectiveTuning(state, admittedRuntime)
  } catch {
    return emptyQuote(safeId, tuningProfileId, sourceRevision, requestedMode, roundedBulkBuy, automated, 'invalid-tuning')
  }
  const definition = catalogContract.byId.get(researchId)
  if (definition === undefined) {
    return emptyQuote(safeId, tuningProfileId, sourceRevision, requestedMode, roundedBulkBuy, automated, 'catalog-gap')
  }
  const currentLevel = currentLevelDecimal(state, researchId)
  if (definition.maximumLevel !== null && compareGameDecimals(currentLevel, GAME_DECIMAL_ONE) >= 0) {
    return emptyQuote(researchId, tuningProfileId, sourceRevision, requestedMode, roundedBulkBuy, automated, 'already-maxed', currentLevel, definition.maximumLevel)
  }
  if (automated && !automationEnabled(state, definition)) {
    return emptyQuote(researchId, tuningProfileId, sourceRevision, requestedMode, roundedBulkBuy, automated, 'automation-disabled', currentLevel, definition.maximumLevel)
  }
  if (!prerequisitesMet(state, definition)) {
    return emptyQuote(researchId, tuningProfileId, sourceRevision, requestedMode, roundedBulkBuy, automated, 'prerequisites-not-met', currentLevel, definition.maximumLevel)
  }

  try {
    let effectiveBaseCost = gameDecimalFromNumber(definition.baseCost)
    if (
      state.skills.byId.repeatableResearch?.owned === true &&
      definition.coefficientField !== null
    ) {
      const coefficient = tuning[definition.coefficientField]
      if (!Number.isFinite(coefficient) || coefficient < 0) {
        throw new RangeError('Research tuning coefficient is invalid.')
      }
      const denominator = addGameDecimals(
        GAME_DECIMAL_ONE,
        multiplyGameDecimals(currentLevel, gameDecimalFromNumber(coefficient)),
      )
      effectiveBaseCost = divideGameDecimals(effectiveBaseCost, denominator)
    }
    const firstBatchCost = exponentialCostV2(
      effectiveBaseCost,
      definition.exponent,
      currentLevel,
    )
    const affordable = definition.maximumLevel === null
      ? maximumAffordableGeometricBatchesV2({
          available: state.dyson.science,
          firstBatchCost,
          ratio: definition.exponent,
          integerCost: true,
        })
      : Object.freeze({
          accepted: true,
          rejection: 'none' as const,
          batches: compareGameDecimals(
            state.dyson.science,
            ceilGameDecimal(firstBatchCost),
          ) >= 0 ? cloneGameDecimal(GAME_DECIMAL_ONE) : cloneGameDecimal(GAME_DECIMAL_ZERO),
          cost: ceilGameDecimal(firstBatchCost),
          corrections: 0,
        })
    if (!affordable.accepted) {
      return emptyQuote(researchId, tuningProfileId, sourceRevision, requestedMode, roundedBulkBuy, automated, affordable.rejection === 'correction-limit' ? 'correction-limit' : 'invalid-cost', currentLevel, definition.maximumLevel)
    }
    const common = {
      currencyPath: '$.dyson.science',
      sourceRevision,
      balance: state.dyson.science,
      balanceSemantic: 'ordinary' as const,
      output: currentLevel,
      outputSemantic: 'integer' as const,
      unitsPerPurchase: GAME_DECIMAL_ONE,
      integerCost: true,
      negligibleDebitPolicy: 'allow-for-purchase' as const,
    }
    let transactionQuote: V2PurchaseQuote
    if (requestedMode === 'buy-max' && definition.maximumLevel === null) {
      transactionQuote = quoteV2GeometricBuyMax({
        ...common,
        firstBatchCost,
        ratio: definition.exponent,
      })
    } else {
      let batches = selectV2PurchaseBatches({
        mode: requestedMode,
        rounded: roundedBulkBuy,
        currentOwned: currentLevel,
        affordable: affordable.batches,
      })
      if (definition.maximumLevel !== null) {
        batches = minGameDecimal(batches, GAME_DECIMAL_ONE)
      }
      if (isZeroGameDecimal(batches)) {
        return emptyQuote(researchId, tuningProfileId, sourceRevision, requestedMode, roundedBulkBuy, automated, 'insufficient-funds', currentLevel, definition.maximumLevel, affordable.batches)
      }
      transactionQuote = quoteV2Purchase({
        ...common,
        requestedMode,
        batches,
        quotedCost: geometricSeriesCostV2(
          firstBatchCost,
          definition.exponent,
          batches,
        ),
      })
    }
    return purchaseQuote(
      researchId,
      tuningProfileId,
      requestedMode,
      roundedBulkBuy,
      automated,
      currentLevel,
      definition.maximumLevel,
      affordable.batches,
      transactionQuote,
    )
  } catch {
    return emptyQuote(researchId, tuningProfileId, sourceRevision, requestedMode, roundedBulkBuy, automated, 'invalid-cost', currentLevel, definition.maximumLevel)
  }
}

function automationResult(
  state: CanonicalGameStateV2,
  revision: number,
  changed: boolean,
  startIndex: number,
  nextTargetIndex: number,
  attempts: readonly ResearchV2AutomationAttempt[],
  purchasedBatches: GameDecimal,
  scienceDebited: GameDecimal,
): ResearchV2AutomationResult {
  const frozenAttempts = Object.freeze([...attempts])
  return Object.freeze({
    state,
    revision,
    changed,
    startIndex,
    nextTargetIndex,
    attempts: frozenAttempts,
    accounting: Object.freeze({
      kind: 'research-v2-phase-accounting' as const,
      sourceRevision: changed ? revision - 1 : revision,
      startTargetIndex: startIndex,
      nextTargetIndex,
      visitedResearchCount: frozenAttempts.length,
      successfulPurchaseCount: frozenAttempts.filter((attempt) => attempt.result.purchased).length,
      purchasedBatches: cloneGameDecimal(purchasedBatches),
      scienceDebited: cloneGameDecimal(scienceDebited),
      progressPolicy: 'preserve-until-infinity-reset' as const,
    }),
  })
}

function registerQuote(quote: ResearchV2PurchaseQuote): ResearchV2PurchaseQuote {
  quoteDescriptors.set(quote, Object.freeze({
    researchId: quote.researchId,
    requestedMode: quote.requestedMode,
    roundedBulkBuy: quote.roundedBulkBuy,
    automated: quote.automated,
  }))
  return quote
}

function purchaseQuote(
  researchId: CanonicalResearchId,
  tuningProfileId: CanonicalRuntimeSidecarV2['dysonTuningProfile'],
  requestedMode: V2PurchaseMode,
  roundedBulkBuy: boolean,
  automated: boolean,
  currentLevel: GameDecimal,
  maximumLevel: 1n | null,
  affordableBatches: GameDecimal,
  transactionQuote: V2PurchaseQuote,
): ResearchV2PurchaseQuote {
  return Object.freeze({
    kind: 'research-v2-purchase-quote' as const,
    researchId,
    tuningProfileId,
    sourceRevision: transactionQuote.sourceRevision,
    requestedMode,
    roundedBulkBuy,
    automated,
    eligible: transactionQuote.accepted,
    changed: transactionQuote.changed,
    status: transactionQuote.accepted ? 'ready' as const : transactionQuote.rejection,
    currentLevel: cloneGameDecimal(currentLevel),
    maximumLevel,
    affordableBatches: cloneGameDecimal(affordableBatches),
    batches: cloneGameDecimal(transactionQuote.batches),
    quotedCost: cloneGameDecimal(transactionQuote.quotedCost),
    debitedAmount: cloneGameDecimal(transactionQuote.debitedAmount),
    transactionQuote,
  })
}

function emptyQuote(
  researchId: CanonicalResearchId,
  tuningProfileId: CanonicalRuntimeSidecarV2['dysonTuningProfile'],
  sourceRevision: number,
  requestedMode: V2PurchaseMode,
  roundedBulkBuy: boolean,
  automated: boolean,
  status: ResearchV2QuoteStatus,
  currentLevel: GameDecimal = GAME_DECIMAL_ZERO,
  maximumLevel: 1n | null = null,
  affordableBatches: GameDecimal = GAME_DECIMAL_ZERO,
): ResearchV2PurchaseQuote {
  return Object.freeze({
    kind: 'research-v2-purchase-quote' as const,
    researchId,
    tuningProfileId,
    sourceRevision,
    requestedMode,
    roundedBulkBuy,
    automated,
    eligible: false,
    changed: false,
    status,
    currentLevel: cloneGameDecimal(currentLevel),
    maximumLevel,
    affordableBatches: cloneGameDecimal(affordableBatches),
    batches: cloneGameDecimal(GAME_DECIMAL_ZERO),
    quotedCost: cloneGameDecimal(GAME_DECIMAL_ZERO),
    debitedAmount: cloneGameDecimal(GAME_DECIMAL_ZERO),
    transactionQuote: null,
  })
}

function rejectedResult(
  state: CanonicalGameStateV2,
  revision: number,
  status: ResearchV2QuoteStatus,
  quote?: ResearchV2PurchaseQuote,
  transaction?: V2PurchaseCommitResult,
): ResearchV2PurchaseResult {
  return Object.freeze({
    accepted: false,
    purchased: false,
    changed: false,
    status,
    revision,
    state,
    researchId: quote?.researchId ?? null,
    requestedMode: quote?.requestedMode ?? null,
    batches: quote === undefined ? cloneGameDecimal(GAME_DECIMAL_ZERO) : cloneGameDecimal(quote.batches),
    quotedCost: transaction === undefined
      ? quote === undefined ? cloneGameDecimal(GAME_DECIMAL_ZERO) : cloneGameDecimal(quote.quotedCost)
      : cloneGameDecimal(transaction.quotedCost),
    debitedAmount: cloneGameDecimal(GAME_DECIMAL_ZERO),
  })
}

function equivalentQuotes(
  left: ResearchV2PurchaseQuote,
  right: ResearchV2PurchaseQuote,
): boolean {
  return left.researchId === right.researchId &&
    left.tuningProfileId === right.tuningProfileId &&
    left.sourceRevision === right.sourceRevision &&
    left.requestedMode === right.requestedMode &&
    left.roundedBulkBuy === right.roundedBulkBuy &&
    left.automated === right.automated &&
    left.eligible === right.eligible &&
    left.changed === right.changed &&
    left.status === right.status &&
    equalGameDecimals(left.currentLevel, right.currentLevel) &&
    left.maximumLevel === right.maximumLevel &&
    equalGameDecimals(left.affordableBatches, right.affordableBatches) &&
    equalGameDecimals(left.batches, right.batches) &&
    equalGameDecimals(left.quotedCost, right.quotedCost) &&
    equalGameDecimals(left.debitedAmount, right.debitedAmount) &&
    equivalentTransactionQuotes(left.transactionQuote, right.transactionQuote)
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

function replacePurchasedResearch(
  state: CanonicalGameStateV2,
  researchId: CanonicalResearchId,
  committed: V2PurchaseCommitResult,
): CanonicalGameStateV2 {
  const level: GameDecimal | bigint = isCappedResearchId(researchId)
    ? gameDecimalToBigIntChecked(committed.output, { maximum: 1n })
    : cloneGameDecimal(committed.output)
  const levelsById = Object.freeze({
    ...state.research.levelsById,
    [researchId]: level,
  }) as ResearchLevelsV2
  const candidate = Object.freeze({
    ...state,
    dyson: Object.freeze({
      ...state.dyson,
      science: cloneGameDecimal(committed.balance),
    }),
    research: Object.freeze({
      ...state.research,
      levelsById,
    }),
  })
  admittedResearchStates.add(candidate)
  return candidate
}

function replaceAutomationTargetIndex(
  state: CanonicalGameStateV2,
  targetIndex: number,
): CanonicalGameStateV2 {
  const candidate = Object.freeze({
    ...state,
    timeline: Object.freeze({
      ...state.timeline,
      researchAutomationTargetIndex: targetIndex,
    }),
  })
  admittedResearchStates.add(candidate)
  return candidate
}

function admitResearchState(value: unknown): value is CanonicalGameStateV2 {
  if (value !== null && typeof value === 'object' && admittedResearchStates.has(value)) {
    return true
  }
  const validation = validateCanonicalGameStateV2(value)
  if (!validation.valid || !isDeepFrozenDataGraph(value)) return false
  admittedResearchStates.add(value as object)
  return true
}

function admitResearchRuntime(
  value: unknown,
): Readonly<CanonicalRuntimeSidecarV2> | null {
  if (value !== null && typeof value === 'object') {
    const admitted = admittedRuntimeSidecars.get(value)
    if (admitted !== undefined) return admitted
  }
  try {
    const cloned = cloneCanonicalRuntimeSidecarV2(
      value as Readonly<CanonicalRuntimeSidecarV2>,
    )
    if (!isDeepFrozenDataGraph(value)) return null
    admittedRuntimeSidecars.set(value as object, cloned)
    admittedRuntimeSidecars.set(cloned, cloned)
    return cloned
  } catch {
    return null
  }
}

function isDeepFrozenDataGraph(value: unknown): boolean {
  if (value === null || typeof value !== 'object') return true
  const pending: object[] = [value]
  const seen = new Set<object>()
  while (pending.length > 0) {
    const current = pending.pop()!
    if (seen.has(current)) continue
    seen.add(current)
    if (!Object.isFrozen(current)) return false
    for (const descriptor of Object.values(
      Object.getOwnPropertyDescriptors(current),
    )) {
      if (!('value' in descriptor)) return false
      if (descriptor.value !== null && typeof descriptor.value === 'object') {
        pending.push(descriptor.value as object)
      }
    }
  }
  return true
}

function currentLevelDecimal(
  state: CanonicalGameStateV2,
  researchId: CanonicalResearchId,
): GameDecimal {
  const level = state.research.levelsById[researchId]
  return typeof level === 'bigint'
    ? gameDecimalFromBigInt(level)
    : cloneGameDecimal(level)
}

function prerequisitesMet(
  state: CanonicalGameStateV2,
  definition: ResearchV2Definition,
): boolean {
  if (definition.prerequisiteResearchIds.some((id) =>
    isZeroGameDecimal(currentLevelDecimal(state, id)),
  )) return false
  if (definition.prerequisiteFacilityId === null) return true
  const pair = state.dyson.facilities[
    definition.prerequisiteFacilityId as keyof typeof state.dyson.facilities
  ]
  return pair !== undefined && compareGameDecimals(
    addGameDecimals(pair[0], pair[1]),
    gameDecimalFromNumber(definition.prerequisiteFacilityOwned),
  ) >= 0
}

function automationEnabled(
  state: CanonicalGameStateV2,
  definition: ResearchV2Definition,
): boolean {
  if (definition.autoBuyGroup === 1) return true
  const id = AUTOMATION_ID_BY_GROUP[
    definition.autoBuyGroup as keyof typeof AUTOMATION_ID_BY_GROUP
  ]
  return id !== undefined && state.research.automation.enabledById[id]
}

function effectiveTuning(
  state: CanonicalGameStateV2,
  runtime: Readonly<CanonicalRuntimeSidecarV2>,
): Readonly<DysonCompatibilityTuning> {
  const tuning = { ...resolveDysonTuningProfileV2(runtime.dysonTuningProfile) }
  const overrides = deriveSecretBuffs(
    state.infinity.secretsOfTheUniverse,
  ).researchCoefficientOverrides
  for (const [id, value] of Object.entries(overrides)) {
    if (value === undefined) continue
    const field = COEFFICIENT_BY_RESEARCH_ID[id as CanonicalResearchId]
    if (field !== undefined) tuning[field] = value
  }
  return Object.freeze(tuning)
}

function normalizeTargetIndex(value: number): number {
  const count = RESEARCH_V2_IDS.length
  return Number.isSafeInteger(value) ? ((value % count) + count) % count : 0
}

function validRevision(value: number): boolean {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 && !Object.is(value, -0)
}

function isResearchId(value: unknown): value is CanonicalResearchId {
  return typeof value === 'string' && (RESEARCH_V2_IDS as readonly string[]).includes(value)
}

function isPurchaseMode(value: unknown): value is V2PurchaseMode {
  return typeof value === 'string' && PURCHASE_MODES.has(value as V2PurchaseMode)
}

function isCappedResearchId(value: CanonicalResearchId): value is CappedResearchId {
  return (CAPPED_RESEARCH_V2_IDS as readonly string[]).includes(value)
}

function expected(
  id: CanonicalResearchId,
  autoBuyGroup: number,
  baseCost: number,
  exponent: number,
  maximumLevel: 1n | null,
  prerequisiteResearchIds: readonly CanonicalResearchId[],
  prerequisiteFacilityId: string | null,
  effectId: string,
  targetStatId: string,
  perLevel: number,
): ExpectedDefinition {
  return Object.freeze({
    id,
    autoBuyGroup,
    baseCost,
    exponent,
    maximumLevel,
    prerequisiteResearchIds: Object.freeze([...prerequisiteResearchIds]),
    prerequisiteFacilityId,
    prerequisiteFacilityOwned: 1,
    coefficientField: COEFFICIENT_BY_RESEARCH_ID[id] ?? null,
    effectId,
    targetStatId,
    perLevel,
  })
}

function readCatalogContract(
  researchAssets: readonly RuntimeGameAsset[],
  effectLookup: ResearchV2CatalogEffectLookup,
): Readonly<{
  valid: boolean
  definitions: readonly ResearchV2Definition[]
  byId: ReadonlyMap<CanonicalResearchId, ResearchV2Definition>
}> {
  const assets = captureDenseArray(researchAssets, EXPECTED_DEFINITIONS.length)
  if (assets === null) return invalidCatalog()
  const byAssetId = new Map<string, unknown>()
  for (const asset of assets) {
    const properties = captureClosedRecord(asset, ['id', 'kind', 'data'])
    if (properties === null) return invalidCatalog()
    const id = properties.id!.value
    if (typeof id !== 'string' || byAssetId.has(id)) return invalidCatalog()
    byAssetId.set(id, asset)
  }
  const definitions: ResearchV2Definition[] = []
  for (const expectedDefinition of EXPECTED_DEFINITIONS) {
    const asset = byAssetId.get(expectedDefinition.id)
    if (!matchesExpectedDefinition(asset, expectedDefinition, effectLookup)) return invalidCatalog()
    definitions.push(Object.freeze({
      id: expectedDefinition.id,
      autoBuyGroup: expectedDefinition.autoBuyGroup,
      baseCost: expectedDefinition.baseCost,
      exponent: expectedDefinition.exponent,
      maximumLevel: expectedDefinition.maximumLevel,
      prerequisiteResearchIds: expectedDefinition.prerequisiteResearchIds,
      prerequisiteFacilityId: expectedDefinition.prerequisiteFacilityId,
      prerequisiteFacilityOwned: expectedDefinition.prerequisiteFacilityOwned,
      coefficientField: expectedDefinition.coefficientField,
    }))
  }
  const frozen = Object.freeze(definitions)
  return Object.freeze({
    valid: true,
    definitions: frozen,
    byId: new Map(frozen.map((definition) => [definition.id, definition])),
  })
}

function invalidCatalog(): Readonly<{
  valid: false
  definitions: readonly ResearchV2Definition[]
  byId: ReadonlyMap<CanonicalResearchId, ResearchV2Definition>
}> {
  return Object.freeze({ valid: false, definitions: Object.freeze([]), byId: new Map() })
}

function matchesExpectedDefinition(
  asset: unknown,
  expectedDefinition: ExpectedDefinition,
  effectLookup: ResearchV2CatalogEffectLookup,
): boolean {
  const assetProperties = captureClosedRecord(asset, ['id', 'kind', 'data'])
  if (
    assetProperties === null ||
    assetProperties.id!.value !== expectedDefinition.id ||
    assetProperties.kind!.value !== 'GameData.ResearchDefinition'
  ) return false
  const commonKeys = [
    'autoBuyGroup',
    'baseCost',
    'effects',
    'exponent',
    'maxLevel',
    'prerequisiteResearchIds',
  ]
  const dataKeys = expectedDefinition.prerequisiteFacilityId === null
    ? commonKeys
    : [...commonKeys, 'prerequisiteFacilityId', 'prerequisiteFacilityOwned']
  const data = captureClosedRecord(assetProperties.data!.value, dataKeys)
  if (
    data === null ||
    data.autoBuyGroup!.value !== expectedDefinition.autoBuyGroup ||
    data.baseCost!.value !== expectedDefinition.baseCost ||
    data.exponent!.value !== expectedDefinition.exponent ||
    data.maxLevel!.value !== (expectedDefinition.maximumLevel === null ? -1 : 1) ||
    (expectedDefinition.prerequisiteFacilityId !== null && (
      data.prerequisiteFacilityId!.value !== expectedDefinition.prerequisiteFacilityId ||
      data.prerequisiteFacilityOwned!.value !== expectedDefinition.prerequisiteFacilityOwned
    ))
  ) return false
  const prerequisites = captureDenseArray(
    data.prerequisiteResearchIds!.value,
    expectedDefinition.prerequisiteResearchIds.length,
  )
  if (
    prerequisites === null ||
    new Set(prerequisites).size !== prerequisites.length ||
    prerequisites.some((value, index) =>
      !isResearchId(value) || value !== expectedDefinition.prerequisiteResearchIds[index],
    )
  ) return false
  const effects = captureDenseArray(data.effects!.value, 1)
  if (effects === null) return false
  const reference = captureClosedRecord(effects[0], ['id'])
  if (reference === null || reference.id!.value !== expectedDefinition.effectId) return false
  return matchesExpectedEffect(
    effectLookup('GameData.EffectDefinition', expectedDefinition.effectId),
    expectedDefinition,
  )
}

function matchesExpectedEffect(
  asset: unknown,
  expectedDefinition: ExpectedDefinition,
): boolean {
  const assetProperties = captureClosedRecord(asset, ['id', 'kind', 'data'])
  if (
    assetProperties === null ||
    assetProperties.id!.value !== expectedDefinition.effectId ||
    assetProperties.kind!.value !== 'GameData.EffectDefinition'
  ) return false
  const data = captureClosedRecord(assetProperties.data!.value, [
    'conditionId',
    'id',
    'operation',
    'order',
    'perLevel',
    'targetFacilityIds',
    'targetFacilityTags',
    'targetStatId',
    'value',
  ])
  return data !== null &&
    data.conditionId!.value === null &&
    data.id!.value === expectedDefinition.effectId &&
    data.operation!.value === 0 &&
    data.order!.value === 0 &&
    data.perLevel!.value === expectedDefinition.perLevel &&
    data.targetStatId!.value === expectedDefinition.targetStatId &&
    data.value!.value === 0 &&
    captureDenseArray(data.targetFacilityIds!.value, 0) !== null &&
    captureDenseArray(data.targetFacilityTags!.value, 0) !== null
}

function captureClosedRecord(
  value: unknown,
  expectedKeys: readonly string[],
): Readonly<Record<string, PropertyDescriptor & { readonly value: unknown }>> | null {
  if (
    value === null ||
    typeof value !== 'object' ||
    Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Object.prototype
  ) return null
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const keys = Reflect.ownKeys(value)
  if (
    keys.length !== expectedKeys.length ||
    keys.some((key) => {
      if (typeof key !== 'string' || !expectedKeys.includes(key)) return true
      const descriptor = descriptors[key]
      return descriptor === undefined ||
        !descriptor.enumerable ||
        !('value' in descriptor)
    })
  ) return null
  return descriptors as Readonly<
    Record<string, PropertyDescriptor & { readonly value: unknown }>
  >
}

function captureDenseArray(
  value: unknown,
  expectedLength: number,
): readonly unknown[] | null {
  if (
    !Array.isArray(value) ||
    Object.getPrototypeOf(value) !== Array.prototype
  ) return null
  const descriptors = Object.getOwnPropertyDescriptors(value)
  const keys = Reflect.ownKeys(value)
  const expectedKeys = [
    ...Array.from({ length: expectedLength }, (_, index) => String(index)),
    'length',
  ]
  if (
    keys.length !== expectedKeys.length ||
    keys.some((key) => {
      if (typeof key !== 'string' || !expectedKeys.includes(key)) return true
      const descriptor = descriptors[key]
      if (descriptor === undefined || !('value' in descriptor)) return true
      return key === 'length'
        ? descriptor.enumerable || descriptor.value !== expectedLength
        : !descriptor.enumerable
    })
  ) return null
  return Object.freeze(Array.from(
    { length: expectedLength },
    (_, index) => descriptors[String(index)]!.value,
  ))
}
