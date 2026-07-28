import type { CanonicalGameStateV1 } from '../game-state/types'
import {
  addContinuous,
  CONTINUOUS_MAXIMUM,
  DISCRETE_MAXIMUM,
  multiplyContinuous,
} from './numeric'
import { tryDebitContinuous } from './transactions'

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

type DreamTimerId =
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
  readonly cost: bigint
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
  const multiplier = input.doubleTimeMultiplier
  const tickSeconds = input.tickSeconds

  const hunter = advanceStandardTimer(
    timers.hunterTimerProgress ?? 0,
    DREAM_FOUNDATIONAL_INFORMATION_DURATIONS.hunterTimerProgress,
    Number(resources.hunters),
    multiplier,
    tickSeconds,
  )
  const gatherer = advanceStandardTimer(
    timers.gathererTimerProgress ?? 0,
    DREAM_FOUNDATIONAL_INFORMATION_DURATIONS.gathererTimerProgress,
    Number(resources.gatherers),
    multiplier,
    tickSeconds,
  )
  const communityMultiplier =
    state.dream.parameters.communityBoostClock > 0
      ? multiplyContinuous(multiplier, 2)
      : multiplier
  const community = advanceStandardTimer(
    timers.communityTimerProgress ?? 0,
    DREAM_FOUNDATIONAL_INFORMATION_DURATIONS.communityTimerProgress,
    resources.community,
    communityMultiplier,
    tickSeconds,
  )
  const housing = advanceStandardTimer(
    timers.housingTimerProgress ?? 0,
    DREAM_FOUNDATIONAL_INFORMATION_DURATIONS.housingTimerProgress,
    resources.housing,
    multiplier,
    tickSeconds,
  )
  const villages = advanceStandardTimer(
    timers.villagesTimerProgress ?? 0,
    DREAM_FOUNDATIONAL_INFORMATION_DURATIONS.villagesTimerProgress,
    resources.villages,
    multiplier,
    tickSeconds,
  )
  const workerMultiplier =
    state.dream.upgrades.workerBoostAcivator && resources.workers > 0
      ? multiplyContinuous(
          multiplier,
          1 + Math.log10(resources.workers),
        )
      : multiplier
  const workers = advanceStandardTimer(
    timers.workersTimerProgress ?? 0,
    DREAM_FOUNDATIONAL_INFORMATION_DURATIONS.workersTimerProgress,
    resources.workers,
    workerMultiplier,
    tickSeconds,
  )
  const cities = advanceStandardTimer(
    timers.citiesTimerProgress ?? 0,
    DREAM_FOUNDATIONAL_INFORMATION_DURATIONS.citiesTimerProgress,
    resources.cities,
    multiplier,
    tickSeconds,
  )

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
  const factories = advanceStandardTimer(
    timers.factoriesTimerProgress ?? 0,
    DREAM_FOUNDATIONAL_INFORMATION_DURATIONS.factoriesTimerProgress,
    resources.factories,
    factoryMultiplier,
    tickSeconds,
  )

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
  const bots = advanceCustomTimer(
    timers.botsTimerProgress ?? 0,
    DREAM_FOUNDATIONAL_INFORMATION_DURATIONS.botsTimerProgress,
    botBaseMultiplier,
    botGlobalMultiplier,
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

  const communityProduced = addContinuous(
    hunter.cycles,
    gatherer.cycles,
  )
  const housingProduced = addContinuous(
    community.cycles,
    workers.cycles,
  )
  const workersProduced = addContinuous(
    addContinuous(housing.cycles, multiplyContinuous(villages.cycles, 2)),
    multiplyContinuous(cities.cycles, 5),
  )
  const factoriesProduced = state.dream.education.engineering.complete
    ? multiplyContinuous(
        cities.cycles,
        state.dream.upgrades.citiesBoostActivator ? 10 : 1,
      )
    : 0
  const botsPerFactoryCycle = state.dream.upgrades.factoriesBoostActivator
    ? multiplyContinuous(resources.factories, 9)
    : resources.factories
  const botsProduced = multiplyContinuous(
    factories.cycles,
    botsPerFactoryCycle,
  )
  const rocketsProduced = multiplyContinuous(
    bots.cycles,
    state.dream.upgrades.botsBoost2Activator ? 2 : 1,
  )

  const produced = Object.freeze({
    community: communityProduced,
    housing: housingProduced,
    workers: workersProduced,
    factories: factoriesProduced,
    bots: botsProduced,
    rockets: rocketsProduced,
  })
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
            factoriesProduced,
          ),
          bots: addContinuous(resources.bots, botsProduced),
          rockets: addContinuous(resources.rockets, rocketsProduced),
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
): DreamPurchaseResult {
  switch (command) {
    case 'hunters':
      return purchaseDiscreteProducer(
        state,
        command,
        state.dream.parameters.hunterCost,
        state.dream.resources.hunters,
        state.dream.huntersPerPurchase,
      )
    case 'gatherers':
      return purchaseDiscreteProducer(
        state,
        command,
        state.dream.parameters.gathererCost,
        state.dream.resources.gatherers,
        state.dream.gatherersPerPurchase,
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
  if (Number.isFinite(divisor) && divisor > 0) {
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

function advanceStandardTimer(
  progress: number,
  duration: number,
  sourceCount: number,
  globalMultiplier: number,
  tickSeconds: number,
): TimerAdvance {
  if (
    sourceCount < 1 ||
    !Number.isFinite(sourceCount) ||
    !Number.isFinite(globalMultiplier) ||
    globalMultiplier < 0
  ) {
    return { cycles: 0, progress }
  }
  return advanceTimer(
    progress,
    duration,
    1 + Math.log10(sourceCount),
    globalMultiplier,
    tickSeconds,
  )
}

function advanceCustomTimer(
  progress: number,
  duration: number,
  baseMultiplier: number,
  globalMultiplier: number,
  tickSeconds: number,
): TimerAdvance {
  if (
    !Number.isFinite(baseMultiplier) ||
    baseMultiplier < 0 ||
    !Number.isFinite(globalMultiplier) ||
    globalMultiplier < 0
  ) {
    return { cycles: 0, progress }
  }
  return advanceTimer(
    progress,
    duration,
    baseMultiplier,
    globalMultiplier,
    tickSeconds,
  )
}

function advanceTimer(
  progress: number,
  duration: number,
  baseMultiplier: number,
  globalMultiplier: number,
  tickSeconds: number,
): TimerAdvance {
  const safeProgress =
    Number.isFinite(progress) && progress >= 0 ? progress : 0
  const effective = multiplyContinuous(
    baseMultiplier,
    globalMultiplier,
  )
  const added = multiplyContinuous(tickSeconds, effective)
  const accumulated = addContinuous(safeProgress, added)
  const completed = Math.floor(accumulated / duration)
  if (!Number.isFinite(completed) || completed <= 0) {
    return { cycles: 0, progress: accumulated }
  }
  const remainder = accumulated % duration
  return {
    cycles: Math.min(CONTINUOUS_MAXIMUM, completed),
    progress:
      Number.isFinite(remainder) &&
      remainder >= 0 &&
      remainder < duration
        ? remainder
        : 0,
  }
}

function purchaseDiscreteProducer(
  state: Readonly<CanonicalGameStateV1>,
  command: 'hunters' | 'gatherers',
  cost: bigint,
  owned: bigint,
  quantity: bigint,
): DreamPurchaseResult {
  if (cost <= 0n) return purchaseFailure(state, command, 'invalid-cost')
  if (quantity <= 0n) {
    return purchaseFailure(state, command, 'invalid-quantity', cost)
  }
  if (owned > DISCRETE_MAXIMUM - quantity) {
    return purchaseFailure(state, command, 'output-maxed', cost)
  }
  if (state.reality.influence < cost) {
    return purchaseFailure(
      state,
      command,
      'insufficient-influence',
      cost,
    )
  }
  return {
    purchased: true,
    command,
    cost,
    status: 'success',
    state: {
      ...state,
      reality: {
        ...state.reality,
        influence: state.reality.influence - cost,
      },
      dream: {
        ...state.dream,
        resources: {
          ...state.dream.resources,
          [command]: owned + quantity,
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
  if (state.reality.influence < cost) {
    return purchaseFailure(
      state,
      command,
      'insufficient-influence',
      cost,
    )
  }
  const parameter =
    command === 'community-boost'
      ? 'communityBoostClock'
      : 'factoriesBoostClock'
  return {
    purchased: true,
    command,
    cost,
    status: 'success',
    state: {
      ...state,
      reality: {
        ...state.reality,
        influence: state.reality.influence - cost,
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
  cost = 0n,
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
  const next = current + quantity
  return (
    Number.isFinite(next) &&
    next <= CONTINUOUS_MAXIMUM &&
    next > current
  )
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
