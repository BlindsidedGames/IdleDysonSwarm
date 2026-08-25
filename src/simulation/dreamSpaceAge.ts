import type { CanonicalGameStateV1 } from '../game-state/types'
import {
  addContinuous,
  addDiscrete,
  DISCRETE_MAXIMUM,
  floorToDiscrete,
  multiplyContinuous,
} from './numeric'
import { clampDoubleTimeRate } from './timeResources'
import { tryDebitContinuous } from './transactions'

export const DREAM_SPACE_AGE_CONSTANTS = Object.freeze({
  tickSeconds: 0.1,
  spaceFactoryDurationSeconds: 2,
  railgunVolleyDurationSeconds: 1,
  shotsPerVolley: 10,
  basePanelsRequiredToStart: 10n,
  railgunPayloadHeadroom: 1.1,
  maximumRailgunAutomationIntervalSeconds: 1,
})

const DOUBLE_TIME_MULTIPLIER_TOLERANCE_SCALE = 8
// A ten-round volley can accumulate several ULPs of subtraction drift at
// petajoule scales. Keep the allowance relative and far below gameplay units.
const RAILGUN_CHARGE_TOLERANCE_SCALE = 32
const OVERDRIVE_LINEAR_LIMIT = 10
const OVERDRIVE_DIMINISHING_RETURN_EXPONENT = 0.85

export interface DreamSpaceAgeProductionInput {
  readonly tickSeconds: number
  /** Effective multiplier already prepared by Unity's Double Time math. */
  readonly doubleTimeMultiplier: number
}

export interface DreamSpaceAgeProductionResult {
  readonly status: 'success' | 'invalid-input'
  readonly state: CanonicalGameStateV1
  readonly energyGenerated: number
  readonly overdriveEnergyConsumed: number
  readonly spaceFactoryCycles: bigint
  readonly dysonPanelsProduced: bigint
}

export interface DreamSpaceAgeEnergyProductionFacts {
  readonly solarPerSecond: number
  readonly fusionPerSecond: number
  readonly swarmPerSecond: number
  readonly beforeDoubleTimePerSecond: number
  readonly totalPerSecond: number
}

export interface DreamSpaceFactoryProductionFacts {
  readonly active: boolean
  readonly currentProgress: number
  readonly durationSeconds: number
  readonly progressPerSecond: number
  readonly baseProgressPerSecond: number
  readonly cyclesPerSecond: number
  readonly secondsUntilNextCycle: number | null
  readonly nominalPanelsPerSecond: number
  readonly overdriveMultiplier: number
  readonly overdriveEnergyPerSecond: number
  readonly overdriveActive: boolean
  readonly railgunPayloadTarget: number
  readonly railgunLaunchCapacityPerSecond: number
  readonly railgunPayloadCapacity: number
}

export interface DreamSpaceAgeProductionFacts {
  readonly energy: DreamSpaceAgeEnergyProductionFacts
  readonly spaceFactory: DreamSpaceFactoryProductionFacts
}

export type DreamSpaceAgeProductionFactsResult =
  | {
      readonly status: 'success'
      readonly facts: DreamSpaceAgeProductionFacts
    }
  | { readonly status: 'invalid-input' }

export interface DreamRailgunInput {
  readonly tickSeconds: number
  /** Effective multiplier prepared for this exact automation interval. */
  readonly effectiveDoubleTimeMultiplier?: number
  /** Prepared Double Time activity for this exact automation boundary. */
  readonly doubleTimeActive: boolean
  /** Persisted selected rate; Unity clamps it to the inclusive range 0..10. */
  readonly doubleTimeRate: number
}

export interface DreamRailgunResult {
  readonly status: 'success' | 'invalid-input'
  readonly state: CanonicalGameStateV1
  readonly chargeTransferred: number
  readonly volleyStarted: boolean
  readonly shotFired: boolean
  readonly panelsLaunched: bigint
}

export interface DreamRailgunReadinessInput {
  /** Effective multiplier prepared for this exact automation interval. */
  readonly effectiveDoubleTimeMultiplier?: number
  /** Prepared Double Time activity for this exact automation boundary. */
  readonly doubleTimeActive: boolean
  /** Persisted selected rate; Unity clamps it to the inclusive range 0..10. */
  readonly doubleTimeRate: number
}

export interface DreamRailgunReadinessFacts {
  readonly baseMaximumCharge: number
  readonly maximumCharge: number
  readonly chargeTransferred: number
  readonly energyAfterChargeTransfer: number
  readonly chargeAfterChargeTransfer: number
  readonly selectedRate: number
  /** Real-time speed applied to the fixed simulation-time volley cadence. */
  readonly timeMultiplier: number
  readonly mechanicalPayload: number
  readonly payloadCapacity: number
  readonly panelsPerShot: bigint
  readonly panelsPerVolley: bigint
  readonly shotsPerVolley: number
  readonly launchCapacityPerSecond: number
  readonly factoryOverdriveMultiplier: number
  readonly factoryOverdriveEnergyPerSecond: number
  readonly factoryOverdriveActive: boolean
  readonly panelsRequiredToStart: bigint
  readonly totalFireTimeSeconds: number
  readonly shotIntervalSeconds: number
  readonly progressPerSecond: number
  readonly chargePerShot: number
  readonly canStartVolley: boolean
  readonly volleyActiveAfterStartBoundary: boolean
  readonly shotsRemainingAfterStartBoundary: number
  readonly fireProgressAfterStartBoundary: number
  readonly hasChargeForNextShot: boolean
  readonly hasReservedPanelsForNextShot: boolean
  readonly hasSwarmCapacityForNextShot: boolean
  readonly canFireNextShot: boolean
  readonly secondsUntilNextShotAttempt: number | null
}

export type DreamRailgunReadinessFactsResult =
  | {
      readonly status: 'success'
      readonly facts: DreamRailgunReadinessFacts
    }
  | { readonly status: 'invalid-input' }

export type DreamSpaceAgePurchase = 'solar' | 'fusion'

export type DreamSpaceAgePurchaseStatus =
  | 'success'
  | 'invalid-cost'
  | 'insufficient-influence'
  | 'output-maxed'

export interface DreamSpaceAgePurchaseResult {
  readonly purchased: boolean
  readonly command: DreamSpaceAgePurchase
  readonly cost: bigint
  readonly status: DreamSpaceAgePurchaseStatus
  readonly state: CanonicalGameStateV1
}

/**
 * Derives no-time Space Age production rates from the tick-start state.
 */
export function deriveDreamSpaceAgeProductionFacts(
  state: Readonly<CanonicalGameStateV1>,
  doubleTimeMultiplier: number,
): DreamSpaceAgeProductionFactsResult {
  if (
    !Number.isFinite(doubleTimeMultiplier) ||
    doubleTimeMultiplier < 0
  ) {
    return Object.freeze({ status: 'invalid-input' })
  }

  const resources = state.dream.resources
  let solarPerSecond = multiplyContinuous(
    resources.solarPanels,
    Number(state.dream.parameters.solarPanelGeneration),
  )
  if (state.dream.education.mathematics.complete) {
    solarPerSecond = multiplyContinuous(solarPerSecond, 2)
  }
  const fusionPerSecond = multiplyContinuous(
    resources.fusion,
    Number(state.dream.parameters.fusionGeneration),
  )
  const swarmPerSecond = multiplyContinuous(
    Number(resources.swarmPanels),
    Number(state.dream.parameters.swarmPanelGeneration),
  )
  const beforeDoubleTimePerSecond = addContinuous(
    addContinuous(solarPerSecond, fusionPerSecond),
    swarmPerSecond,
  )
  const totalPerSecond = multiplyContinuous(
    beforeDoubleTimePerSecond,
    doubleTimeMultiplier,
  )

  const currentProgress =
    state.dream.timers.spaceFactoriesTimerProgress ?? 0
  const hasSpaceFactories =
    Number.isFinite(resources.spaceFactories) &&
    resources.spaceFactories >= 1
  const active =
    hasSpaceFactories && resources.dysonPanels < DISCRETE_MAXIMUM
  let potentialBaseProgressPerSecond = 0
  if (hasSpaceFactories) {
    let globalMultiplier = doubleTimeMultiplier
    if (state.dream.upgrades.sfActivator1) {
      globalMultiplier = multiplyContinuous(globalMultiplier, 2)
    }
    if (state.dream.upgrades.sfActivator2) {
      globalMultiplier = multiplyContinuous(globalMultiplier, 2)
    }
    if (state.dream.upgrades.sfActivator3) {
      globalMultiplier = multiplyContinuous(globalMultiplier, 2)
    }
    potentialBaseProgressPerSecond = multiplyContinuous(
      1 + Math.log10(resources.spaceFactories),
      globalMultiplier,
    )
  }
  const potentialBaseCyclesPerSecond =
    potentialBaseProgressPerSecond /
    DREAM_SPACE_AGE_CONSTANTS.spaceFactoryDurationSeconds
  const throughput = deriveSpaceAgeThroughputPlan(
    state,
    potentialBaseCyclesPerSecond,
    doubleTimeMultiplier,
    totalPerSecond,
  )
  const baseProgressPerSecond = active
    ? potentialBaseProgressPerSecond
    : 0
  const progressPerSecond = multiplyContinuous(
    baseProgressPerSecond,
    throughput.overdriveMultiplier,
  )
  const cyclesPerSecond =
    progressPerSecond /
    DREAM_SPACE_AGE_CONSTANTS.spaceFactoryDurationSeconds
  const secondsUntilNextCycle =
    active && progressPerSecond > 0
      ? secondsUntilTimerBoundary(
          currentProgress,
          DREAM_SPACE_AGE_CONSTANTS.spaceFactoryDurationSeconds,
          progressPerSecond,
        )
      : null

  return Object.freeze({
    status: 'success',
    facts: Object.freeze({
      energy: Object.freeze({
        solarPerSecond,
        fusionPerSecond,
        swarmPerSecond,
        beforeDoubleTimePerSecond,
        totalPerSecond,
      }),
      spaceFactory: Object.freeze({
        active,
        currentProgress,
        durationSeconds:
          DREAM_SPACE_AGE_CONSTANTS.spaceFactoryDurationSeconds,
        progressPerSecond,
        baseProgressPerSecond,
        cyclesPerSecond,
        secondsUntilNextCycle,
        nominalPanelsPerSecond: cyclesPerSecond,
        overdriveMultiplier: throughput.overdriveMultiplier,
        overdriveEnergyPerSecond:
          active ? throughput.overdriveEnergyPerSecond : 0,
        overdriveActive:
          active && throughput.overdriveMultiplier > 1,
        railgunPayloadTarget: throughput.mechanicalPayload,
        railgunLaunchCapacityPerSecond:
          throughput.launchCapacityPerSecond,
        railgunPayloadCapacity: throughput.payloadCapacity,
      }),
    }),
  })
}

/**
 * Derives the exact charge-transfer, volley sizing, and next-shot readiness
 * used by the persistent railgun automation phase without advancing time.
 */
export function deriveDreamRailgunReadinessFacts(
  state: Readonly<CanonicalGameStateV1>,
  input: Readonly<DreamRailgunReadinessInput>,
): DreamRailgunReadinessFactsResult {
  const baseMaximumCharge = state.dream.parameters.railgunMaxCharge
  if (
    typeof input.doubleTimeActive !== 'boolean' ||
    !Number.isFinite(input.doubleTimeRate) ||
    !Number.isFinite(baseMaximumCharge) ||
    baseMaximumCharge <= 0
  ) {
    return Object.freeze({ status: 'invalid-input' })
  }

  const selectedRate = clampDoubleTimeRate(input.doubleTimeRate)
  const preparedMultiplier = input.effectiveDoubleTimeMultiplier
  const maximumMultiplier = 1 + selectedRate
  const multiplierTolerance =
    Number.EPSILON *
    Math.max(1, Math.abs(maximumMultiplier)) *
    DOUBLE_TIME_MULTIPLIER_TOLERANCE_SCALE
  if (
    preparedMultiplier !== undefined &&
    (!Number.isFinite(preparedMultiplier) ||
      preparedMultiplier < 1 - multiplierTolerance ||
      preparedMultiplier > maximumMultiplier + multiplierTolerance ||
      (!input.doubleTimeActive &&
        Math.abs(preparedMultiplier - 1) > multiplierTolerance))
  ) {
    return Object.freeze({ status: 'invalid-input' })
  }
  const timeMultiplier =
    preparedMultiplier === undefined
      ? input.doubleTimeActive && selectedRate >= 1
        ? maximumMultiplier
        : 1
      : input.doubleTimeActive
        ? Math.min(maximumMultiplier, Math.max(1, preparedMultiplier))
        : 1
  const production = deriveDreamSpaceAgeProductionFacts(
    state,
    timeMultiplier,
  )
  if (production.status === 'invalid-input') {
    return Object.freeze({ status: 'invalid-input' })
  }
  const resources = state.dream.resources
  const payloadCapacity =
    production.facts.spaceFactory.railgunPayloadCapacity
  const targetPayload = Math.max(
    1,
    Math.min(
      payloadCapacity,
      production.facts.spaceFactory.railgunPayloadTarget,
    ),
  )
  const persistedActiveRailguns =
    state.dream.railgun.activeRailguns ?? 0
  const activeVolleyPayload = state.dream.railgun.firing
    ? clampSafePayload(
        persistedActiveRailguns > 0
          ? persistedActiveRailguns
          : inferActiveMechanicalPayload(
              resources.railgunCharge,
              state.dream.railgun.shotsRemaining,
              baseMaximumCharge,
              targetPayload,
            ),
      )
    : 0
  const maximumCharge = multiplyContinuous(
    baseMaximumCharge,
    state.dream.railgun.firing ? activeVolleyPayload : targetPayload,
  )
  const chargeTransfer = state.dream.railgun.firing
    ? {
        energy: resources.energy,
        charge: resources.railgunCharge,
        transferred: 0,
      }
    : deriveRailgunChargeTransfer(
        resources.energy,
        resources.railgunCharge,
        maximumCharge,
      )
  const maximumArrayFromPanels = safeBigIntToPayload(
    resources.dysonPanels /
      BigInt(DREAM_SPACE_AGE_CONSTANTS.shotsPerVolley),
  )
  const maximumArrayFromCharge = wholeRailgunChargeUnits(
    chargeTransfer.charge,
    baseMaximumCharge,
  )
  const startingPayload = Math.max(
    0,
    Math.min(
      targetPayload,
      maximumArrayFromPanels,
      maximumArrayFromCharge,
    ),
  )
  const mechanicalPayload = state.dream.railgun.firing
    ? activeVolleyPayload
    : startingPayload > 0
      ? startingPayload
      : targetPayload
  const panelsPerShot = BigInt(mechanicalPayload)
  const panelsRequiredToStart =
    DREAM_SPACE_AGE_CONSTANTS.basePanelsRequiredToStart
  const panelsPerVolley =
    panelsPerShot * BigInt(DREAM_SPACE_AGE_CONSTANTS.shotsPerVolley)
  const totalFireTimeSeconds =
    DREAM_SPACE_AGE_CONSTANTS.railgunVolleyDurationSeconds
  const progressPerSecond = timeMultiplier
  const shotIntervalSeconds =
    totalFireTimeSeconds /
    DREAM_SPACE_AGE_CONSTANTS.shotsPerVolley
  const chargePerShot =
    multiplyContinuous(baseMaximumCharge, mechanicalPayload) /
    DREAM_SPACE_AGE_CONSTANTS.shotsPerVolley
  const canStartVolley =
    startingPayload >= 1 &&
    hasSufficientRailgunCharge(
      chargeTransfer.charge,
      multiplyContinuous(baseMaximumCharge, startingPayload),
    ) &&
    resources.dysonPanels >= panelsRequiredToStart &&
    !state.dream.railgun.firing
  const volleyActiveAfterStartBoundary =
    state.dream.railgun.firing || canStartVolley
  const shotsRemainingAfterStartBoundary = canStartVolley
    ? DREAM_SPACE_AGE_CONSTANTS.shotsPerVolley
    : state.dream.railgun.shotsRemaining
  const fireProgressAfterStartBoundary = canStartVolley
    ? 0
    : state.dream.railgun.fireProgress
  const hasChargeForNextShot = hasSufficientRailgunCharge(
    chargeTransfer.charge,
    chargePerShot,
  )
  const reservedPanels = state.dream.railgun.reservedPanels ?? 0n
  const hasReservedPanelsForNextShot = canStartVolley ||
    reservedPanels >= panelsPerShot
  const hasSwarmCapacityForNextShot =
    resources.swarmPanels <= DISCRETE_MAXIMUM - panelsPerShot
  const canFireNextShot =
    volleyActiveAfterStartBoundary &&
    shotsRemainingAfterStartBoundary > 0 &&
    hasChargeForNextShot &&
    hasReservedPanelsForNextShot &&
    hasSwarmCapacityForNextShot
  const secondsUntilNextShotAttempt =
    volleyActiveAfterStartBoundary &&
    shotsRemainingAfterStartBoundary > 0 &&
    hasChargeForNextShot
      ? secondsUntilTimerBoundary(
          fireProgressAfterStartBoundary,
          shotIntervalSeconds,
          progressPerSecond,
        )
      : null

  return Object.freeze({
    status: 'success',
    facts: Object.freeze({
      baseMaximumCharge,
      maximumCharge,
      chargeTransferred: chargeTransfer.transferred,
      energyAfterChargeTransfer: chargeTransfer.energy,
      chargeAfterChargeTransfer: chargeTransfer.charge,
      selectedRate,
      timeMultiplier,
      mechanicalPayload,
      payloadCapacity,
      panelsPerShot,
      panelsPerVolley,
      shotsPerVolley: DREAM_SPACE_AGE_CONSTANTS.shotsPerVolley,
      launchCapacityPerSecond:
        Number(panelsPerShot) *
        DREAM_SPACE_AGE_CONSTANTS.shotsPerVolley /
        totalFireTimeSeconds *
        timeMultiplier,
      factoryOverdriveMultiplier:
        production.facts.spaceFactory.overdriveMultiplier,
      factoryOverdriveEnergyPerSecond:
        production.facts.spaceFactory.overdriveEnergyPerSecond,
      factoryOverdriveActive:
        production.facts.spaceFactory.overdriveActive,
      panelsRequiredToStart,
      totalFireTimeSeconds,
      shotIntervalSeconds,
      progressPerSecond,
      chargePerShot,
      canStartVolley,
      volleyActiveAfterStartBoundary,
      shotsRemainingAfterStartBoundary,
      fireProgressAfterStartBoundary,
      hasChargeForNextShot,
      hasReservedPanelsForNextShot,
      hasSwarmCapacityForNextShot,
      canFireNextShot,
      secondsUntilNextShotAttempt,
    }),
  })
}

/**
 * Runs one canonical Space Age production interval.
 *
 * Energy and Space Factory arrivals both use the tick-start state. Railgun
 * automation is intentionally separate because it runs in a later phase.
 */
export function runDreamSpaceAgeProduction(
  state: Readonly<CanonicalGameStateV1>,
  input: Readonly<DreamSpaceAgeProductionInput>,
): DreamSpaceAgeProductionResult {
  if (
    !Number.isFinite(input.tickSeconds) ||
    input.tickSeconds < 0 ||
    !Number.isFinite(input.doubleTimeMultiplier) ||
    input.doubleTimeMultiplier < 0
  ) {
    return {
      status: 'invalid-input',
      state,
      energyGenerated: 0,
      overdriveEnergyConsumed: 0,
      spaceFactoryCycles: 0n,
      dysonPanelsProduced: 0n,
    }
  }

  const resources = state.dream.resources
  const derived = deriveDreamSpaceAgeProductionFacts(
    state,
    input.doubleTimeMultiplier,
  )
  if (derived.status === 'invalid-input') {
    return {
      status: 'invalid-input',
      state,
      energyGenerated: 0,
      overdriveEnergyConsumed: 0,
      spaceFactoryCycles: 0n,
      dysonPanelsProduced: 0n,
    }
  }
  const production = derived.facts
  const energyGenerated = multiplyContinuous(
    production.energy.totalPerSecond,
    input.tickSeconds,
  )
  const requestedOverdriveEnergy = multiplyContinuous(
    production.spaceFactory.overdriveEnergyPerSecond,
    input.tickSeconds,
  )
  const overdriveDebit = tryDebitContinuous(
    resources.energy,
    Math.min(resources.energy, requestedOverdriveEnergy),
  )
  const overdriveEnergyConsumed =
    overdriveDebit.status === 'success'
      ? overdriveDebit.charged
      : 0
  const overdriveDeliveryFraction =
    requestedOverdriveEnergy > 0
      ? Math.min(1, overdriveEnergyConsumed / requestedOverdriveEnergy)
      : 0
  const deliveredOverdriveMultiplier =
    1 +
    (production.spaceFactory.overdriveMultiplier - 1) *
      overdriveDeliveryFraction
  const deliveredProgressPerSecond = multiplyContinuous(
    production.spaceFactory.baseProgressPerSecond,
    deliveredOverdriveMultiplier,
  )

  let spaceFactoryCycles = 0n
  let dysonPanelsProduced = 0n
  let timerProgress = production.spaceFactory.currentProgress
  if (production.spaceFactory.active) {
    const accumulated = addContinuous(
      safeTimerProgress(timerProgress),
        multiplyContinuous(
          deliveredProgressPerSecond,
          input.tickSeconds,
      ),
    )
    spaceFactoryCycles = floorToDiscrete(
      accumulated / production.spaceFactory.durationSeconds,
    )
    timerProgress =
      spaceFactoryCycles > 0n
        ? accumulated % production.spaceFactory.durationSeconds
        : accumulated

    const remainingDiscreteCapacity =
      DISCRETE_MAXIMUM - resources.dysonPanels
    dysonPanelsProduced =
      spaceFactoryCycles > remainingDiscreteCapacity
        ? remainingDiscreteCapacity
        : spaceFactoryCycles
  }

  const nextDysonPanels = addDiscrete(
    resources.dysonPanels,
    dysonPanelsProduced,
  )
  const previousRecord =
    state.dream.railgun.highestStoredPanels ?? resources.dysonPanels
  const highestStoredPanels =
    nextDysonPanels > previousRecord ? nextDysonPanels : previousRecord

  return {
    status: 'success',
    state: {
      ...state,
      dream: {
        ...state.dream,
        resources: {
          ...resources,
          energy: addContinuous(
            overdriveDebit.status === 'success'
              ? overdriveDebit.balance
              : resources.energy,
            energyGenerated,
          ),
          dysonPanels: nextDysonPanels,
        },
        timers: {
          ...state.dream.timers,
          spaceFactoriesTimerProgress: timerProgress,
        },
        railgun: {
          ...state.dream.railgun,
          highestStoredPanels,
        },
      },
    },
    energyGenerated,
    overdriveEnergyConsumed,
    spaceFactoryCycles,
    dysonPanelsProduced,
  }
}

/**
 * Runs the persistent railgun automation phase. A gameplay update may cross
 * several round boundaries and therefore settles them as one exact batch.
 */
export function runDreamRailgunAutomation(
  state: Readonly<CanonicalGameStateV1>,
  input: Readonly<DreamRailgunInput>,
): DreamRailgunResult {
  if (
    !Number.isFinite(input.tickSeconds) ||
    input.tickSeconds <= 0
  ) {
    return invalidRailgun(state)
  }
  const derived = deriveDreamRailgunReadinessFacts(state, input)
  if (derived.status === 'invalid-input') {
    return invalidRailgun(state)
  }

  const readiness = derived.facts
  const originalResources = state.dream.resources
  let energy = readiness.energyAfterChargeTransfer
  let charge = readiness.chargeAfterChargeTransfer
  let chargeTransferred = readiness.chargeTransferred
  let dysonPanels = originalResources.dysonPanels
  let swarmPanels = originalResources.swarmPanels
  let firing = readiness.volleyActiveAfterStartBoundary
  let fireProgress = readiness.fireProgressAfterStartBoundary
  let shotsRemaining = readiness.shotsRemainingAfterStartBoundary
  let activeRailguns = state.dream.railgun.activeRailguns ?? 0
  let reservedPanels = state.dream.railgun.reservedPanels ?? 0n
  let volleyStarted = readiness.canStartVolley
  let roundsFired = 0
  let panelsLaunched = 0n

  if (volleyStarted) {
    activeRailguns = readiness.mechanicalPayload
    reservedPanels = readiness.panelsPerVolley
    dysonPanels -= reservedPanels
  } else if (firing && activeRailguns <= 0) {
    activeRailguns = readiness.mechanicalPayload
  }

  // Legacy saves held panels in factory storage throughout a volley. Reserve
  // the remaining payload once so reloads transition without duplication.
  if (firing && reservedPanels <= 0n && activeRailguns > 0) {
    const legacyReservation =
      BigInt(activeRailguns) * BigInt(shotsRemaining)
    if (dysonPanels >= legacyReservation) {
      dysonPanels -= legacyReservation
      reservedPanels = legacyReservation
    } else {
      firing = false
      fireProgress = 0
      shotsRemaining = 0
      activeRailguns = 0
    }
  }

  let accumulatedProgress = firing
    ? addContinuous(
        safeTimerProgress(fireProgress),
        multiplyContinuous(readiness.progressPerSecond, input.tickSeconds),
      )
    : 0
  const shotThreshold = readiness.shotIntervalSeconds

  while (accumulatedProgress > 0) {
    if (!firing) {
      // One authoritative game update may start at most one volley. Any
      // remaining simulated duration is intentionally left for the next
      // update instead of turning a coarse Stored Time step into an
      // unbounded automation loop.
      if (volleyStarted) {
        accumulatedProgress = 0
        break
      }
      const boundaryState: CanonicalGameStateV1 = {
        ...state,
        dream: {
          ...state.dream,
          resources: {
            ...originalResources,
            energy,
            railgunCharge: charge,
            dysonPanels,
            swarmPanels,
          },
          railgun: {
            ...state.dream.railgun,
            firing: false,
            fireProgress: 0,
            shotsRemaining: 0,
            activeRailguns: 0,
            reservedPanels: 0n,
          },
        },
      }
      const nextBoundary = deriveDreamRailgunReadinessFacts(
        boundaryState,
        input,
      )
      if (nextBoundary.status === 'invalid-input') {
        return invalidRailgun(state)
      }
      energy = nextBoundary.facts.energyAfterChargeTransfer
      charge = nextBoundary.facts.chargeAfterChargeTransfer
      chargeTransferred = addContinuous(
        chargeTransferred,
        nextBoundary.facts.chargeTransferred,
      )
      if (!nextBoundary.facts.canStartVolley) {
        accumulatedProgress = 0
        break
      }
      firing = true
      shotsRemaining = DREAM_SPACE_AGE_CONSTANTS.shotsPerVolley
      activeRailguns = nextBoundary.facts.mechanicalPayload
      reservedPanels = nextBoundary.facts.panelsPerVolley
      dysonPanels -= reservedPanels
      volleyStarted = true
    }

    if (activeRailguns <= 0 || reservedPanels <= 0n) {
      break
    }

    const dueRounds = Math.min(
      shotsRemaining,
      Math.max(
        0,
        Math.floor(
          (accumulatedProgress + Number.EPSILON * 8) / shotThreshold,
        ),
      ),
    )
    if (dueRounds <= 0) {
      fireProgress = accumulatedProgress
      break
    }
    const panelsPerRound = BigInt(activeRailguns)
    const chargePerRound =
      multiplyContinuous(readiness.baseMaximumCharge, activeRailguns) /
      DREAM_SPACE_AGE_CONSTANTS.shotsPerVolley
    const roundsSupportedByPanels = Math.min(
      shotsRemaining,
      safeBigIntToPayload(reservedPanels / panelsPerRound),
    )
    const roundsSupportedByCharge = wholeRailgunChargeUnits(
      charge,
      chargePerRound,
    )
    const remainingSwarmCapacity = DISCRETE_MAXIMUM - swarmPanels
    const roundsSupportedBySwarm = safeBigIntToPayload(
      remainingSwarmCapacity / panelsPerRound,
    )
    const roundsFiredThisPass = Math.min(
      dueRounds,
      roundsSupportedByPanels,
      roundsSupportedByCharge,
      roundsSupportedBySwarm,
    )

    if (roundsFiredThisPass > 0) {
      const requestedChargeDebit = multiplyContinuous(
        chargePerRound,
        roundsFiredThisPass,
      )
      const chargeDebit = tryDebitContinuous(
        charge,
        requestedChargeDebit > charge &&
          hasSufficientRailgunCharge(charge, requestedChargeDebit)
          ? charge
          : requestedChargeDebit,
      )
      if (chargeDebit.status === 'success') {
        charge = chargeDebit.balance
        const launchedThisPass =
          panelsPerRound * BigInt(roundsFiredThisPass)
        roundsFired += roundsFiredThisPass
        panelsLaunched += launchedThisPass
        reservedPanels -= launchedThisPass
        swarmPanels += launchedThisPass
        shotsRemaining -= roundsFiredThisPass
        accumulatedProgress -= roundsFiredThisPass * shotThreshold
        fireProgress = accumulatedProgress
      } else {
        fireProgress = accumulatedProgress
        break
      }
    } else {
      fireProgress = accumulatedProgress
      break
    }

    if (shotsRemaining <= 0 || reservedPanels <= 0n) {
      firing = false
      fireProgress = 0
      shotsRemaining = 0
      activeRailguns = 0
      reservedPanels = 0n
    }
  }

  if (!firing) {
    fireProgress = 0
  }

  return {
    status: 'success',
    state: {
      ...state,
      dream: {
        ...state.dream,
        resources: {
          ...originalResources,
          energy,
          railgunCharge: charge,
          dysonPanels,
          swarmPanels,
        },
        railgun: {
          firing,
          fireProgress,
          shotsRemaining,
          activeRailguns,
          reservedPanels,
          highestStoredPanels:
            state.dream.railgun.highestStoredPanels ??
            originalResources.dysonPanels,
          lastRoundsFired: roundsFired,
          lastPanelsLaunched: panelsLaunched,
        },
      },
    },
    chargeTransferred,
    volleyStarted,
    shotFired: roundsFired > 0,
    panelsLaunched,
  }
}

/**
 * Applies the direct Solar/Fusion button transaction with exact influence
 * costs and no presentation-layer visibility assumptions.
 */
export function purchaseDreamSpaceAge(
  state: Readonly<CanonicalGameStateV1>,
  command: DreamSpaceAgePurchase,
  quantity = 1,
): DreamSpaceAgePurchaseResult {
  const cost =
    command === 'solar'
      ? state.dream.parameters.solarCost
      : state.dream.parameters.fusionCost
  if (!Number.isSafeInteger(quantity) || quantity < 1 || cost <= 0n) {
    return purchaseFailure(state, command, cost, 'invalid-cost')
  }
  const totalCost = cost * BigInt(quantity)
  if (state.reality.influence < totalCost) {
    return purchaseFailure(
      state,
      command,
      totalCost,
      'insufficient-influence',
    )
  }
  const resource = command === 'solar' ? 'solarPanels' : 'fusion'
  const current = state.dream.resources[resource]
  const next = current + quantity
  if (
    !Number.isFinite(current) ||
    current < 0 ||
    !Number.isFinite(next) ||
    next <= current
  ) {
    return purchaseFailure(
      state,
      command,
      totalCost,
      'output-maxed',
    )
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
        influence: state.reality.influence - totalCost,
      },
      dream: {
        ...state.dream,
        resources: {
          ...state.dream.resources,
          [resource]: next,
        },
      },
    },
  }
}

interface RailgunChargeTransfer {
  readonly energy: number
  readonly charge: number
  readonly transferred: number
}

function deriveRailgunChargeTransfer(
  originalEnergy: number,
  originalCharge: number,
  maximumCharge: number,
): RailgunChargeTransfer {
  let energy = originalEnergy
  let charge = originalCharge
  let transferred = 0
  if (charge > maximumCharge) {
    energy = addContinuous(energy, charge - maximumCharge)
    charge = maximumCharge
  }
  if (energy > 0 && charge < maximumCharge) {
    const requested = Math.min(maximumCharge - charge, energy)
    const debit = tryDebitContinuous(energy, requested)
    if (debit.status === 'success') {
      const nextCharge = addContinuous(charge, debit.charged)
      if (nextCharge > charge) {
        energy = debit.balance
        charge = Math.min(maximumCharge, nextCharge)
        transferred = debit.charged
      }
    }
  }
  return { energy, charge, transferred }
}

interface SpaceAgeThroughputPlan {
  readonly overdriveMultiplier: number
  readonly overdriveEnergyPerSecond: number
  readonly mechanicalPayload: number
  readonly payloadCapacity: number
  readonly launchCapacityPerSecond: number
}

function deriveSpaceAgeThroughputPlan(
  state: Readonly<CanonicalGameStateV1>,
  basePanelsPerSecond: number,
  timeMultiplier: number,
  sustainableEnergyPerSecond: number,
): SpaceAgeThroughputPlan {
  const preparedTimeMultiplier = Math.max(
    1,
    timeMultiplier,
  )
  const baseMaximumCharge = state.dream.parameters.railgunMaxCharge
  const sustainableChargeUnits = Math.max(
    0,
    sustainableEnergyPerSecond /
      (baseMaximumCharge * preparedTimeMultiplier),
  )
  const payloadCapacity = clampSafePayload(
    Math.max(1, Math.floor(sustainableChargeUnits)),
  )
  if (basePanelsPerSecond <= 0) {
    const mechanicalPayload = Math.max(
      1,
      Math.min(payloadCapacity, Math.floor(sustainableChargeUnits)),
    )
    return {
      overdriveMultiplier: 1,
      overdriveEnergyPerSecond: 0,
      mechanicalPayload,
      payloadCapacity,
      launchCapacityPerSecond:
        mechanicalPayload *
        DREAM_SPACE_AGE_CONSTANTS.shotsPerVolley *
        preparedTimeMultiplier,
    }
  }

  const planForMultiplier = (
    overdriveMultiplier: number,
  ): SpaceAgeThroughputPlan & { readonly sustainable: boolean } => {
    const panelsPerSecond = multiplyContinuous(
      basePanelsPerSecond,
      overdriveMultiplier,
    )
    const requestedMechanicalPayload = Math.max(
      1,
      Math.ceil(
        panelsPerSecond *
          DREAM_SPACE_AGE_CONSTANTS.railgunPayloadHeadroom /
          (DREAM_SPACE_AGE_CONSTANTS.shotsPerVolley *
            preparedTimeMultiplier),
      ),
    )
    const mechanicalPayload = Math.min(
      payloadCapacity,
      requestedMechanicalPayload,
    )
    const launchCapacityPerSecond =
      mechanicalPayload *
      DREAM_SPACE_AGE_CONSTANTS.shotsPerVolley *
      preparedTimeMultiplier
    const keepsUp =
      panelsPerSecond <= 0 ||
      launchCapacityPerSecond >=
        panelsPerSecond *
          DREAM_SPACE_AGE_CONSTANTS.railgunPayloadHeadroom
    const overdriveEnergyPerSecond = multiplyContinuous(
      overdriveMultiplier - 1,
      baseMaximumCharge * preparedTimeMultiplier,
    )
    const railgunEnergyPerSecond = multiplyContinuous(
      baseMaximumCharge,
      mechanicalPayload * preparedTimeMultiplier,
    )
    return {
      overdriveMultiplier,
      overdriveEnergyPerSecond,
      mechanicalPayload,
      payloadCapacity,
      launchCapacityPerSecond,
      sustainable:
        keepsUp &&
        addContinuous(
          overdriveEnergyPerSecond,
          railgunEnergyPerSecond,
        ) <= sustainableEnergyPerSecond,
    }
  }

  const basePlan = planForMultiplier(1)
  if (!basePlan.sustainable) {
    const mechanicalPayload = Math.max(
      1,
      Math.min(payloadCapacity, Math.floor(sustainableChargeUnits)),
    )
    return {
      overdriveMultiplier: 1,
      overdriveEnergyPerSecond: 0,
      mechanicalPayload,
      payloadCapacity,
      launchCapacityPerSecond:
        mechanicalPayload *
        DREAM_SPACE_AGE_CONSTANTS.shotsPerVolley *
        preparedTimeMultiplier,
    }
  }

  const maximumLaunchCapacity =
    payloadCapacity *
    DREAM_SPACE_AGE_CONSTANTS.shotsPerVolley *
    preparedTimeMultiplier
  const energyUpperBound = applyDreamOverdriveDiminishingReturn(
    1 + sustainableChargeUnits,
  )
  const throughputUpperBound =
    maximumLaunchCapacity /
    (basePanelsPerSecond *
      DREAM_SPACE_AGE_CONSTANTS.railgunPayloadHeadroom)
  let lower = 1
  let upper = Math.max(
    1,
    Math.min(energyUpperBound, throughputUpperBound),
  )
  for (let iteration = 0; iteration < 80; iteration += 1) {
    const candidate = lower + (upper - lower) / 2
    if (planForMultiplier(candidate).sustainable) {
      lower = candidate
    } else {
      upper = candidate
    }
  }
  const plan = planForMultiplier(lower)
  return {
    overdriveMultiplier: plan.overdriveMultiplier,
    overdriveEnergyPerSecond: plan.overdriveEnergyPerSecond,
    mechanicalPayload: plan.mechanicalPayload,
    payloadCapacity: plan.payloadCapacity,
    launchCapacityPerSecond: plan.launchCapacityPerSecond,
  }
}

export function applyDreamOverdriveDiminishingReturn(
  rawMultiplier: number,
): number {
  if (
    !Number.isFinite(rawMultiplier) ||
    rawMultiplier <= OVERDRIVE_LINEAR_LIMIT
  ) {
    return rawMultiplier
  }
  const overdriveBeyondLinearRange =
    rawMultiplier - OVERDRIVE_LINEAR_LIMIT
  return (
    OVERDRIVE_LINEAR_LIMIT - 1 +
    Math.pow(
      overdriveBeyondLinearRange + 1,
      OVERDRIVE_DIMINISHING_RETURN_EXPONENT,
    )
  )
}

function hasSufficientRailgunCharge(
  balance: number,
  cost: number,
): boolean {
  if (
    !Number.isFinite(balance) ||
    !Number.isFinite(cost) ||
    balance < 0 ||
    cost <= 0
  ) {
    return false
  }
  return cost - balance <= railgunChargeTolerance(balance, cost)
}

function wholeRailgunChargeUnits(
  balance: number,
  unitCost: number,
): number {
  if (
    !Number.isFinite(balance) ||
    !Number.isFinite(unitCost) ||
    balance < 0 ||
    unitCost <= 0
  ) {
    return 0
  }
  const supported = Math.floor(
    (balance + railgunChargeTolerance(balance, unitCost)) / unitCost,
  )
  return Math.max(0, Math.min(Number.MAX_SAFE_INTEGER, supported))
}

function railgunChargeTolerance(balance: number, cost: number): number {
  return (
    Math.max(1, Math.abs(balance), Math.abs(cost)) *
    Number.EPSILON *
    RAILGUN_CHARGE_TOLERANCE_SCALE
  )
}

function clampSafePayload(value: number): number {
  if (!Number.isFinite(value) || value < 1) return 1
  return Math.max(1, Math.min(Number.MAX_SAFE_INTEGER, Math.floor(value)))
}

function safeBigIntToPayload(value: bigint): number {
  if (value <= 0n) return 0
  const maximum = BigInt(Number.MAX_SAFE_INTEGER)
  return Number(value > maximum ? maximum : value)
}

function inferActiveMechanicalPayload(
  charge: number,
  shotsRemaining: number,
  baseMaximumCharge: number,
  fallback: number,
): number {
  if (shotsRemaining <= 0 || charge <= 0) return fallback
  const chargePerBaseShot =
    baseMaximumCharge / DREAM_SPACE_AGE_CONSTANTS.shotsPerVolley
  const inferred = Math.round(
    charge / (shotsRemaining * chargePerBaseShot),
  )
  return Number.isSafeInteger(inferred) && inferred >= 1
    ? inferred
    : fallback
}

function secondsUntilTimerBoundary(
  progress: number,
  threshold: number,
  progressPerSecond: number,
): number {
  const safeProgress = safeTimerProgress(progress)
  if (safeProgress >= threshold) return 0
  return (threshold - safeProgress) / progressPerSecond
}

function safeTimerProgress(value: number): number {
  return Number.isFinite(value) && value >= 0 ? value : 0
}

function invalidRailgun(
  state: Readonly<CanonicalGameStateV1>,
): DreamRailgunResult {
  return {
    status: 'invalid-input',
    state,
    chargeTransferred: 0,
    volleyStarted: false,
    shotFired: false,
    panelsLaunched: 0n,
  }
}

function purchaseFailure(
  state: Readonly<CanonicalGameStateV1>,
  command: DreamSpaceAgePurchase,
  cost: bigint,
  status: Exclude<DreamSpaceAgePurchaseStatus, 'success'>,
): DreamSpaceAgePurchaseResult {
  return {
    purchased: false,
    command,
    cost,
    status,
    state,
  }
}
