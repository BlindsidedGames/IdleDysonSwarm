import {
  isFiniteNonNegativeNumber,
  isFinitePositiveNumber,
} from '../core/finiteNonNegativeNumber'
import type { CanonicalGameStateV1 } from '../game-state/types'
import {
  addContinuous,
  CONTINUOUS_MAXIMUM,
  DISCRETE_MAXIMUM,
  multiplyContinuous,
} from './numeric'
import { buyXCost, tryDebitContinuous } from './transactions'
import { settleExactContinuousCredit } from './conservativeSettlement'

export const DREAM_PRODUCER_COST_EXPONENT = 1.01

export const DREAM_FOUNDATIONAL_INFORMATION_DURATIONS = Object.freeze({
  hunterTimerProgress: 3,
  gathererTimerProgress: 3,
  communityTimerProgress: 3,
  housingTimerProgress: 20,
  villagesTimerProgress: 12,
  workersTimerProgress: 4,
  citiesTimerProgress: 3,
  factoriesTimerProgress: 30,
  botsTimerProgress: 20,
})

export const DREAM_HOUSING_TO_VILLAGE_COST = 10
export const DREAM_VILLAGE_TO_CITY_COST = 25

export type DreamTimerId =
  keyof typeof DREAM_FOUNDATIONAL_INFORMATION_DURATIONS

export interface DreamProductionTickInput {
  readonly tickSeconds: number
  /** Effective multiplier already prepared by Unity's Double Time math. */
  readonly doubleTimeMultiplier: number
}

export interface DreamProductionAmounts {
  readonly community: number
  readonly housing: number
  readonly workers: number
  readonly factories: number
  readonly bots: number
  readonly rockets: number
}

export interface DreamTimerProductionFact {
  readonly timerId: DreamTimerId
  readonly currentProgress: number
  readonly durationSeconds: number
  readonly progressPerSecond: number
  /** Producer count supplied to the canonical speed formula. */
  readonly sourceCount: number
  /** Formula term before global and era-specific multipliers are applied. */
  readonly baseMultiplier: number
  /** Prepared multiplier containing all canonical global and era bonuses. */
  readonly globalMultiplier: number
  /** Identifies how the canonical base multiplier was prepared. */
  readonly multiplierFormula: 'logarithmic-source' | 'prepared-base'
  readonly cyclesPerSecond: number
  readonly secondsUntilNextCycle: number | null
  readonly advanceEnabled: boolean
  readonly outputPerCycle: DreamProductionAmounts
  /** Long-run output from this timer at its current canonical cycle rate. */
  readonly outputPerSecond: DreamProductionAmounts
}

export interface DreamFoundationalInformationProductionFacts {
  readonly timers: Readonly<
    Record<DreamTimerId, DreamTimerProductionFact>
  >
  /** Long-run average output at the current tick-start producer counts. */
  readonly productionPerSecond: DreamProductionAmounts
}

export type DreamFoundationalInformationProductionFactsResult =
  | {
      readonly status: 'success'
      readonly facts: DreamFoundationalInformationProductionFacts
    }
  | { readonly status: 'invalid-input' }

export interface DreamProductionTickResult {
  readonly status: 'success' | 'invalid-input'
  readonly state: CanonicalGameStateV1
  readonly completedCycles: Readonly<Record<DreamTimerId, number>>
  readonly produced: DreamProductionAmounts
}

export type DreamPurchaseCommand =
  | 'hunters'
  | 'gatherers'
  | 'community-boost'
  | 'factories-boost'

export type DreamPurchaseStatus =
  | 'success'
  | 'locked'
  | 'already-active'
  | 'invalid-cost'
  | 'invalid-quantity'
  | 'insufficient-influence'
  | 'output-maxed'

export interface DreamPurchaseResult {
  readonly purchased: boolean
  readonly command: DreamPurchaseCommand
  readonly cost: number
  readonly status: DreamPurchaseStatus
  readonly state: CanonicalGameStateV1
}

export interface DreamConversionResult {
  readonly state: CanonicalGameStateV1
  readonly housingToVillages: number
  readonly villagesToCities: number
  readonly rocketsToSpaceFactories: number
}

const EMPTY_PRODUCTION: DreamProductionAmounts = Object.freeze({
  community: 0,
  housing: 0,
  workers: 0,
  factories: 0,
  bots: 0,
  rockets: 0,
})

/**
 * Derives the no-time production facts used by the Foundational and
 * Information Era transition. The multiplier must already be prepared for
 * the exact scheduler boundary that will consume these facts.
 */
export function deriveDreamFoundationalInformationProductionFacts(
  state: Readonly<CanonicalGameStateV1>,
  doubleTimeMultiplier: number,
): DreamFoundationalInformationProductionFactsResult {
  if (
    !Number.isFinite(doubleTimeMultiplier) ||
    doubleTimeMultiplier < 0
  ) {
    return Object.freeze({ status: 'invalid-input' })
  }

  const resources = state.dream.resources
  const timers = state.dream.timers
  const multiplier = doubleTimeMultiplier
  const communityMultiplier =
    state.dream.parameters.communityBoostClock > 0
      ? multiplyContinuous(multiplier, 2)
      : multiplier
  const workerMultiplier =
    state.dream.upgrades.workerBoostAcivator && resources.workers > 0
      ? multiplyContinuous(
          multiplier,
          1 + Math.log10(resources.workers),
        )
      : multiplier

  let factoryMultiplier = multiplier
  if (state.dream.parameters.factoriesBoostClock > 0) {
    factoryMultiplier = multiplyContinuous(factoryMultiplier, 2)
  }
  if (state.dream.education.shipping.complete) {
    factoryMultiplier = multiplyContinuous(factoryMultiplier, 2)
  }
  if (state.dream.education.worldTrade.complete) {
    factoryMultiplier = multiplyContinuous(factoryMultiplier, 2)
  }

  let botBaseMultiplier = 0
  if (resources.bots >= 1) {
    botBaseMultiplier = 1 + Math.log10(resources.bots)
    if (resources.bots < 100) {
      botBaseMultiplier = multiplyContinuous(
        botBaseMultiplier,
        resources.bots / 100,
      )
    }
  }
  let botGlobalMultiplier = multiplier
  if (state.dream.education.worldPeace.complete) {
    botGlobalMultiplier = multiplyContinuous(botGlobalMultiplier, 2)
  }
  if (state.dream.upgrades.botsBoost1Activator) {
    botGlobalMultiplier = multiplyContinuous(botGlobalMultiplier, 2)
  }

  const cityFactoryYield = state.dream.education.engineering.complete
    ? state.dream.upgrades.citiesBoostActivator
      ? 10
      : 1
    : 0
  const botsPerFactoryCycle = state.dream.upgrades
    .factoriesBoostActivator
    ? multiplyContinuous(resources.factories, 9)
    : resources.factories
  const rocketsPerBotCycle = state.dream.upgrades
    .botsBoost2Activator
    ? 2
    : 1

  const productionTimers = Object.freeze({
    hunterTimerProgress: createTimerProductionFact(
      'hunterTimerProgress',
      timers.hunterTimerProgress ?? 0,
      standardTimerRate(Number(resources.hunters), multiplier),
      productionAmounts({ community: 1 }),
    ),
    gathererTimerProgress: createTimerProductionFact(
      'gathererTimerProgress',
      timers.gathererTimerProgress ?? 0,
      standardTimerRate(Number(resources.gatherers), multiplier),
      productionAmounts({ community: 1 }),
    ),
    communityTimerProgress: createTimerProductionFact(
      'communityTimerProgress',
      timers.communityTimerProgress ?? 0,
      standardTimerRate(resources.community, communityMultiplier),
      productionAmounts({ housing: 1 }),
    ),
    housingTimerProgress: createTimerProductionFact(
      'housingTimerProgress',
      timers.housingTimerProgress ?? 0,
      standardTimerRate(resources.housing, multiplier),
      productionAmounts({ workers: 1 }),
    ),
    villagesTimerProgress: createTimerProductionFact(
      'villagesTimerProgress',
      timers.villagesTimerProgress ?? 0,
      standardTimerRate(resources.villages, multiplier),
      productionAmounts({ workers: 2 }),
    ),
    workersTimerProgress: createTimerProductionFact(
      'workersTimerProgress',
      timers.workersTimerProgress ?? 0,
      standardTimerRate(resources.workers, workerMultiplier),
      productionAmounts({ housing: 1 }),
    ),
    citiesTimerProgress: createTimerProductionFact(
      'citiesTimerProgress',
      timers.citiesTimerProgress ?? 0,
      standardTimerRate(resources.cities, multiplier),
      productionAmounts({
        workers: 5,
        factories: cityFactoryYield,
      }),
    ),
    factoriesTimerProgress: createTimerProductionFact(
      'factoriesTimerProgress',
      timers.factoriesTimerProgress ?? 0,
      standardTimerRate(resources.factories, factoryMultiplier),
      productionAmounts({ bots: botsPerFactoryCycle }),
    ),
    botsTimerProgress: createTimerProductionFact(
      'botsTimerProgress',
      timers.botsTimerProgress ?? 0,
      customTimerRate(botBaseMultiplier, botGlobalMultiplier),
      productionAmounts({ rockets: rocketsPerBotCycle }),
    ),
  })
  const cycleRates = Object.freeze({
    hunterTimerProgress:
      productionTimers.hunterTimerProgress.cyclesPerSecond,
    gathererTimerProgress:
      productionTimers.gathererTimerProgress.cyclesPerSecond,
    communityTimerProgress:
      productionTimers.communityTimerProgress.cyclesPerSecond,
    housingTimerProgress:
      productionTimers.housingTimerProgress.cyclesPerSecond,
    villagesTimerProgress:
      productionTimers.villagesTimerProgress.cyclesPerSecond,
    workersTimerProgress:
      productionTimers.workersTimerProgress.cyclesPerSecond,
    citiesTimerProgress:
      productionTimers.citiesTimerProgress.cyclesPerSecond,
    factoriesTimerProgress:
      productionTimers.factoriesTimerProgress.cyclesPerSecond,
    botsTimerProgress:
      productionTimers.botsTimerProgress.cyclesPerSecond,
  })

  return Object.freeze({
    status: 'success',
    facts: Object.freeze({
      timers: productionTimers,
      productionPerSecond: aggregateProduction(
        productionTimers,
        cycleRates,
      ),
    }),
  })
}

/**
 * Runs one Unity-parity Foundational and Information Era production tick.
 *
 * Every producer count and gate is captured from the tick-start snapshot, so
 * an output created in this tick cannot itself produce until the next tick.
 */
export function runDreamFoundationalInformationProduction(
  state: Readonly<CanonicalGameStateV1>,
  input: Readonly<DreamProductionTickInput>,
): DreamProductionTickResult {
  if (
    !Number.isFinite(input.tickSeconds) ||
    input.tickSeconds < 0 ||
    !Number.isFinite(input.doubleTimeMultiplier) ||
    input.doubleTimeMultiplier < 0
  ) {
    return {
      status: 'invalid-input',
      state,
      completedCycles: zeroCycles(),
      produced: EMPTY_PRODUCTION,
    }
  }

  const resources = state.dream.resources
  const timers = { ...state.dream.timers }
  const tickSeconds = input.tickSeconds
  const derived = deriveDreamFoundationalInformationProductionFacts(
    state,
    input.doubleTimeMultiplier,
  )
  if (derived.status === 'invalid-input') {
    return {
      status: 'invalid-input',
      state,
      completedCycles: zeroCycles(),
      produced: EMPTY_PRODUCTION,
    }
  }

  const productionTimers = derived.facts.timers
  const hunter = advanceProductionTimer(
    productionTimers.hunterTimerProgress,
    tickSeconds,
  )
  const gatherer = advanceProductionTimer(
    productionTimers.gathererTimerProgress,
    tickSeconds,
  )
  const community = advanceProductionTimer(
    productionTimers.communityTimerProgress,
    tickSeconds,
  )
  const housing = advanceProductionTimer(
    productionTimers.housingTimerProgress,
    tickSeconds,
  )
  const villages = advanceProductionTimer(
    productionTimers.villagesTimerProgress,
    tickSeconds,
  )
  const workers = advanceProductionTimer(
    productionTimers.workersTimerProgress,
    tickSeconds,
  )
  const cities = advanceProductionTimer(
    productionTimers.citiesTimerProgress,
    tickSeconds,
  )
  const factories = advanceProductionTimer(
    productionTimers.factoriesTimerProgress,
    tickSeconds,
  )
  const bots = advanceProductionTimer(
    productionTimers.botsTimerProgress,
    tickSeconds,
  )

  timers.hunterTimerProgress = hunter.progress
  timers.gathererTimerProgress = gatherer.progress
  timers.communityTimerProgress = community.progress
  timers.housingTimerProgress = housing.progress
  timers.villagesTimerProgress = villages.progress
  timers.workersTimerProgress = workers.progress
  timers.citiesTimerProgress = cities.progress
  timers.factoriesTimerProgress = factories.progress
  timers.botsTimerProgress = bots.progress

  let nextCommunity = addContinuous(
    resources.community,
    hunter.cycles,
  )
  nextCommunity = addContinuous(nextCommunity, gatherer.cycles)
  let nextHousing = addContinuous(
    resources.housing,
    community.cycles,
  )
  nextHousing = addContinuous(nextHousing, workers.cycles)
  let nextWorkers = addContinuous(
    resources.workers,
    housing.cycles,
  )
  nextWorkers = addContinuous(
    nextWorkers,
    multiplyContinuous(villages.cycles, 2),
  )
  nextWorkers = addContinuous(
    nextWorkers,
    multiplyContinuous(cities.cycles, 5),
  )
  const completedCycles = Object.freeze({
    hunterTimerProgress: hunter.cycles,
    gathererTimerProgress: gatherer.cycles,
    communityTimerProgress: community.cycles,
    housingTimerProgress: housing.cycles,
    villagesTimerProgress: villages.cycles,
    workersTimerProgress: workers.cycles,
    citiesTimerProgress: cities.cycles,
    factoriesTimerProgress: factories.cycles,
    botsTimerProgress: bots.cycles,
  })
  const produced = aggregateProduction(
    productionTimers,
    completedCycles,
  )

  return {
    status: 'success',
    state: {
      ...state,
      dream: {
        ...state.dream,
        resources: {
          ...resources,
          community: nextCommunity,
          housing: nextHousing,
          workers: nextWorkers,
          factories: addContinuous(
            resources.factories,
            produced.factories,
          ),
          bots: addContinuous(resources.bots, produced.bots),
          rockets: addContinuous(resources.rockets, produced.rockets),
        },
        parameters: {
          ...state.dream.parameters,
          communityBoostClock: decrementClock(
            state.dream.parameters.communityBoostClock,
            tickSeconds,
          ),
          factoriesBoostClock: decrementClock(
            state.dream.parameters.factoriesBoostClock,
            tickSeconds,
          ),
        },
        timers,
      },
    },
    completedCycles,
    produced,
  }
}

/**
 * Applies one player-facing foundational/information purchase atomically.
 */
export function purchaseDreamFoundationalInformation(
  state: Readonly<CanonicalGameStateV1>,
  command: DreamPurchaseCommand,
  batches = 1,
): DreamPurchaseResult {
  switch (command) {
    case 'hunters':
      return purchaseDiscreteProducer(
        state,
        command,
        state.dream.parameters.hunterCost,
        state.dream.resources.hunters,
        state.dream.huntersPerPurchase,
        state.dream.purchaseBatches?.hunters ?? 0n,
        batches,
      )
    case 'gatherers':
      return purchaseDiscreteProducer(
        state,
        command,
        state.dream.parameters.gathererCost,
        state.dream.resources.gatherers,
        state.dream.gatherersPerPurchase,
        state.dream.purchaseBatches?.gatherers ?? 0n,
        batches,
      )
    case 'community-boost':
      return purchaseBoost(
        state,
        command,
        state.dream.parameters.communityBoostCost,
        state.dream.parameters.communityBoostDuration,
        state.dream.parameters.communityBoostClock,
        state.dream.parameters.communityBoostIsFree,
        state.dream.resources.hunters > 0n ||
          state.dream.resources.gatherers > 0n,
      )
    case 'factories-boost':
      return purchaseBoost(
        state,
        command,
        state.dream.parameters.factoriesBoostCost,
        state.dream.parameters.factoriesBoostDuration,
        state.dream.parameters.factoriesBoostClock,
        false,
        state.dream.resources.cities >= 1 &&
          state.dream.education.engineering.complete,
      )
  }
}

/**
 * Runs the independent automation boundary: one housing conversion, then one
 * village conversion, followed by the bulk rocket/factory exchange.
 */
export function runDreamFoundationalInformationConversions(
  state: Readonly<CanonicalGameStateV1>,
): DreamConversionResult {
  let housing = state.dream.resources.housing
  let villages = state.dream.resources.villages
  let cities = state.dream.resources.cities
  let rockets = state.dream.resources.rockets
  let factories = state.dream.resources.factories
  let spaceFactories = state.dream.resources.spaceFactories
  let housingToVillages = 0
  let villagesToCities = 0
  let rocketsToSpaceFactories = 0

  if (
    housing >= DREAM_HOUSING_TO_VILLAGE_COST &&
    canAddTransactionOutput(villages, 1)
  ) {
    const debit = tryDebitContinuous(
      housing,
      DREAM_HOUSING_TO_VILLAGE_COST,
    )
    if (debit.status === 'success') {
      housing = debit.balance
      villages += 1
      housingToVillages = 1
    }
  }
  if (
    villages >= DREAM_VILLAGE_TO_CITY_COST &&
    canAddTransactionOutput(cities, 1)
  ) {
    const debit = tryDebitContinuous(
      villages,
      DREAM_VILLAGE_TO_CITY_COST,
    )
    if (debit.status === 'success') {
      villages = debit.balance
      cities += 1
      villagesToCities = 1
    }
  }

  const divisor = Number(state.dream.parameters.rocketsPerSpaceFactory)
  if (isFinitePositiveNumber(divisor)) {
    const conversions = Math.min(
      Math.floor(rockets / divisor),
      Math.floor(factories),
    )
    const rocketCost = multiplyContinuous(conversions, divisor)
    if (
      conversions > 0 &&
      rocketCost > 0 &&
      rocketCost !== CONTINUOUS_MAXIMUM &&
      rocketCost <= rockets &&
      conversions <= factories &&
      canAddTransactionOutput(spaceFactories, conversions)
    ) {
      const rocketDebit = tryDebitContinuous(rockets, rocketCost)
      const factoryDebit = tryDebitContinuous(factories, conversions)
      if (
        rocketDebit.status === 'success' &&
        factoryDebit.status === 'success'
      ) {
        rockets = rocketDebit.balance
        factories = factoryDebit.balance
        spaceFactories += conversions
        rocketsToSpaceFactories = conversions
      }
    }
  }

  if (
    housingToVillages === 0 &&
    villagesToCities === 0 &&
    rocketsToSpaceFactories === 0
  ) {
    return {
      state,
      housingToVillages,
      villagesToCities,
      rocketsToSpaceFactories,
    }
  }
  return {
    state: {
      ...state,
      dream: {
        ...state.dream,
        resources: {
          ...state.dream.resources,
          housing,
          villages,
          cities,
          rockets,
          factories,
          spaceFactories,
        },
      },
    },
    housingToVillages,
    villagesToCities,
    rocketsToSpaceFactories,
  }
}

interface TimerAdvance {
  readonly cycles: number
  readonly progress: number
}

interface TimerRate {
  readonly advanceEnabled: boolean
  readonly progressPerSecond: number
  readonly sourceCount: number
  readonly baseMultiplier: number
  readonly globalMultiplier: number
  readonly multiplierFormula: 'logarithmic-source' | 'prepared-base'
}

function standardTimerRate(
  sourceCount: number,
  globalMultiplier: number,
): TimerRate {
  if (
    sourceCount < 1 ||
    !Number.isFinite(sourceCount) ||
    !Number.isFinite(globalMultiplier) ||
    globalMultiplier < 0
  ) {
    return {
      advanceEnabled: false,
      progressPerSecond: 0,
      sourceCount,
      baseMultiplier: 0,
      globalMultiplier,
      multiplierFormula: 'logarithmic-source',
    }
  }
  const baseMultiplier = 1 + Math.log10(sourceCount)
  return {
    advanceEnabled: true,
    progressPerSecond: multiplyContinuous(baseMultiplier, globalMultiplier),
    sourceCount,
    baseMultiplier,
    globalMultiplier,
    multiplierFormula: 'logarithmic-source',
  }
}

function customTimerRate(
  baseMultiplier: number,
  globalMultiplier: number,
): TimerRate {
  if (
    !Number.isFinite(baseMultiplier) ||
    baseMultiplier < 0 ||
    !Number.isFinite(globalMultiplier) ||
    globalMultiplier < 0
  ) {
    return {
      advanceEnabled: false,
      progressPerSecond: 0,
      sourceCount: 0,
      baseMultiplier,
      globalMultiplier,
      multiplierFormula: 'prepared-base',
    }
  }
  return {
    advanceEnabled: true,
    progressPerSecond: multiplyContinuous(
      baseMultiplier,
      globalMultiplier,
    ),
    sourceCount: 0,
    baseMultiplier,
    globalMultiplier,
    multiplierFormula: 'prepared-base',
  }
}

function createTimerProductionFact(
  timerId: DreamTimerId,
  currentProgress: number,
  rate: Readonly<TimerRate>,
  outputPerCycle: DreamProductionAmounts,
): DreamTimerProductionFact {
  const durationSeconds =
    DREAM_FOUNDATIONAL_INFORMATION_DURATIONS[timerId]
  const cyclesPerSecond = rate.advanceEnabled
    ? rate.progressPerSecond / durationSeconds
    : 0
  return Object.freeze({
    timerId,
    currentProgress,
    durationSeconds,
    progressPerSecond: rate.progressPerSecond,
    sourceCount: rate.sourceCount,
    baseMultiplier: rate.baseMultiplier,
    globalMultiplier: rate.globalMultiplier,
    multiplierFormula: rate.multiplierFormula,
    cyclesPerSecond,
    secondsUntilNextCycle: secondsUntilNextCycle(
      currentProgress,
      durationSeconds,
      rate,
    ),
    advanceEnabled: rate.advanceEnabled,
    outputPerCycle,
    outputPerSecond: scaleProductionAmounts(outputPerCycle, cyclesPerSecond),
  })
}

function secondsUntilNextCycle(
  progress: number,
  durationSeconds: number,
  rate: Readonly<TimerRate>,
): number | null {
  if (!rate.advanceEnabled || rate.progressPerSecond <= 0) {
    return null
  }
  const safeProgress = isFiniteNonNegativeNumber(progress) ? progress : 0
  if (safeProgress >= durationSeconds) return 0
  return (
    (durationSeconds - safeProgress) /
    rate.progressPerSecond
  )
}

function advanceProductionTimer(
  fact: Readonly<DreamTimerProductionFact>,
  tickSeconds: number,
): TimerAdvance {
  if (!fact.advanceEnabled) {
    return { cycles: 0, progress: fact.currentProgress }
  }
  const safeProgress = isFiniteNonNegativeNumber(fact.currentProgress)
    ? fact.currentProgress
    : 0
  const added = multiplyContinuous(
    tickSeconds,
    fact.progressPerSecond,
  )
  const accumulated = addContinuous(safeProgress, added)
  const completed = Math.floor(
    accumulated / fact.durationSeconds,
  )
  if (!isFinitePositiveNumber(completed)) {
    return { cycles: 0, progress: accumulated }
  }
  const remainder = accumulated % fact.durationSeconds
  return {
    cycles: Math.min(CONTINUOUS_MAXIMUM, completed),
    progress:
      Number.isFinite(remainder) &&
      remainder >= 0 &&
      remainder < fact.durationSeconds
        ? remainder
        : 0,
  }
}

function aggregateProduction(
  timers: Readonly<
    Record<DreamTimerId, DreamTimerProductionFact>
  >,
  cycles: Readonly<Record<DreamTimerId, number>>,
): DreamProductionAmounts {
  const communityProduced = addContinuous(
    multiplyContinuous(
      cycles.hunterTimerProgress,
      timers.hunterTimerProgress.outputPerCycle.community,
    ),
    multiplyContinuous(
      cycles.gathererTimerProgress,
      timers.gathererTimerProgress.outputPerCycle.community,
    ),
  )
  const housingProduced = addContinuous(
    multiplyContinuous(
      cycles.communityTimerProgress,
      timers.communityTimerProgress.outputPerCycle.housing,
    ),
    multiplyContinuous(
      cycles.workersTimerProgress,
      timers.workersTimerProgress.outputPerCycle.housing,
    ),
  )
  const workersProduced = addContinuous(
    addContinuous(
      multiplyContinuous(
        cycles.housingTimerProgress,
        timers.housingTimerProgress.outputPerCycle.workers,
      ),
      multiplyContinuous(
        cycles.villagesTimerProgress,
        timers.villagesTimerProgress.outputPerCycle.workers,
      ),
    ),
    multiplyContinuous(
      cycles.citiesTimerProgress,
      timers.citiesTimerProgress.outputPerCycle.workers,
    ),
  )
  const factoriesProduced = multiplyContinuous(
    cycles.citiesTimerProgress,
    timers.citiesTimerProgress.outputPerCycle.factories,
  )
  const botsProduced = multiplyContinuous(
    cycles.factoriesTimerProgress,
    timers.factoriesTimerProgress.outputPerCycle.bots,
  )
  const rocketsProduced = multiplyContinuous(
    cycles.botsTimerProgress,
    timers.botsTimerProgress.outputPerCycle.rockets,
  )

  return Object.freeze({
    community: communityProduced,
    housing: housingProduced,
    workers: workersProduced,
    factories: factoriesProduced,
    bots: botsProduced,
    rockets: rocketsProduced,
  })
}

function productionAmounts(
  overrides: Partial<DreamProductionAmounts>,
): DreamProductionAmounts {
  return Object.freeze({
    ...EMPTY_PRODUCTION,
    ...overrides,
  })
}

function scaleProductionAmounts(
  amounts: DreamProductionAmounts,
  multiplier: number,
): DreamProductionAmounts {
  return Object.freeze({
    community: multiplyContinuous(amounts.community, multiplier),
    housing: multiplyContinuous(amounts.housing, multiplier),
    workers: multiplyContinuous(amounts.workers, multiplier),
    factories: multiplyContinuous(amounts.factories, multiplier),
    bots: multiplyContinuous(amounts.bots, multiplier),
    rockets: multiplyContinuous(amounts.rockets, multiplier),
  })
}

function purchaseDiscreteProducer(
  state: Readonly<CanonicalGameStateV1>,
  command: 'hunters' | 'gatherers',
  cost: bigint,
  owned: bigint,
  quantity: bigint,
  purchasedBatches: bigint,
  requestedBatches: number,
): DreamPurchaseResult {
  if (
    cost <= 0n ||
    !Number.isSafeInteger(requestedBatches) ||
    requestedBatches < 1 ||
    purchasedBatches > BigInt(Number.MAX_SAFE_INTEGER)
  ) {
    return purchaseFailure(state, command, 'invalid-cost')
  }
  if (quantity <= 0n) {
    return purchaseFailure(state, command, 'invalid-quantity')
  }
  const batchQuantity = BigInt(requestedBatches)
  const totalQuantity = quantity * batchQuantity
  if (
    totalQuantity <= 0n ||
    totalQuantity > DISCRETE_MAXIMUM ||
    owned > DISCRETE_MAXIMUM - totalQuantity ||
    purchasedBatches > DISCRETE_MAXIMUM - batchQuantity
  ) {
    return purchaseFailure(state, command, 'output-maxed')
  }
  const totalCost = buyXCost(
    batchQuantity,
    Number(cost),
    DREAM_PRODUCER_COST_EXPONENT,
    Number(purchasedBatches),
  )
  const debit = tryDebitContinuous(
    state.reality.influence,
    totalCost,
    batchQuantity,
  )
  if (debit.status === 'insufficient-funds') {
    return purchaseFailure(
      state,
      command,
      'insufficient-influence',
      totalCost,
    )
  }
  if (debit.status !== 'success') {
    return purchaseFailure(state, command, 'invalid-cost', totalCost)
  }
  const previousBatches = state.dream.purchaseBatches ?? {
    hunters: 0n,
    gatherers: 0n,
    solar: 0n,
    fusion: 0n,
  }
  return {
    purchased: true,
    command,
    cost: totalCost,
    status: 'success',
    state: {
      ...state,
      reality: {
        ...state.reality,
        influence: debit.balance,
      },
      dream: {
        ...state.dream,
        resources: {
          ...state.dream.resources,
          [command]: owned + totalQuantity,
        },
        purchaseBatches: {
          ...previousBatches,
          [command]: purchasedBatches + batchQuantity,
        },
      },
    },
  }
}

function purchaseBoost(
  state: Readonly<CanonicalGameStateV1>,
  command: 'community-boost' | 'factories-boost',
  authoredCost: number,
  duration: number,
  clock: number,
  authoredFree: boolean,
  unlocked: boolean,
): DreamPurchaseResult {
  if (!unlocked) return purchaseFailure(state, command, 'locked')
  if (clock >= 10) {
    return purchaseFailure(state, command, 'already-active')
  }
  const cost = exactDiscreteCost(authoredCost)
  if (cost === undefined || (cost === 0n && !authoredFree)) {
    return purchaseFailure(state, command, 'invalid-cost')
  }
  const debit = cost === 0n && authoredFree
    ? {
        balance: state.reality.influence,
        charged: 0,
        status: 'success' as const,
      }
    : tryDebitContinuous(state.reality.influence, Number(cost))
  if (debit.status === 'insufficient-funds') {
    return purchaseFailure(
      state,
      command,
      'insufficient-influence',
      Number(cost),
    )
  }
  if (debit.status !== 'success') {
    return purchaseFailure(state, command, 'invalid-cost', Number(cost))
  }
  const parameter =
    command === 'community-boost'
      ? 'communityBoostClock'
      : 'factoriesBoostClock'
  return {
    purchased: true,
    command,
    cost: Number(cost),
    status: 'success',
    state: {
      ...state,
      reality: {
        ...state.reality,
        influence: debit.balance,
      },
      dream: {
        ...state.dream,
        parameters: {
          ...state.dream.parameters,
          [parameter]: duration,
        },
      },
    },
  }
}

function exactDiscreteCost(value: number): bigint | undefined {
  if (
    !Number.isFinite(value) ||
    value < 0 ||
    !Number.isInteger(value) ||
    value >= 9_223_372_036_854_775_808
  ) {
    return undefined
  }
  return BigInt(value)
}

function purchaseFailure(
  state: Readonly<CanonicalGameStateV1>,
  command: DreamPurchaseCommand,
  status: DreamPurchaseStatus,
  cost = 0,
): DreamPurchaseResult {
  return {
    purchased: false,
    command,
    cost,
    status,
    state,
  }
}

function decrementClock(clock: number, tickSeconds: number): number {
  return clock > 0 ? Math.max(0, clock - tickSeconds) : 0
}

function canAddTransactionOutput(
  current: number,
  quantity: number,
): boolean {
  if (
    !Number.isFinite(current) ||
    current < 0 ||
    !Number.isFinite(quantity) ||
    quantity <= 0
  ) {
    return false
  }
  return settleExactContinuousCredit(
    current,
    quantity,
    CONTINUOUS_MAXIMUM,
  ).settled === quantity
}

function zeroCycles(): Readonly<Record<DreamTimerId, number>> {
  return Object.freeze(
    Object.fromEntries(
      Object.keys(DREAM_FOUNDATIONAL_INFORMATION_DURATIONS).map(
        (id) => [id, 0],
      ),
    ) as unknown as Record<DreamTimerId, number>,
  )
}
