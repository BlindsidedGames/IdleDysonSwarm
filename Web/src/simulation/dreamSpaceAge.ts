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
  railgunBaseFireTimeSeconds: 5,
  railgunUpgrade1FireTimeSeconds: 2.5,
  railgunUpgrade2FireTimeSeconds: 1,
  shotsPerVolley: 10,
  basePanelsRequiredToStart: 10n,
  dysonPanelCap: 1_000n,
})

export interface DreamSpaceAgeProductionInput {
  readonly tickSeconds: number
  /** Effective multiplier already prepared by Unity's Double Time math. */
  readonly doubleTimeMultiplier: number
}

export interface DreamSpaceAgeProductionResult {
  readonly status: 'success' | 'invalid-input'
  readonly state: CanonicalGameStateV1
  readonly energyGenerated: number
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
  readonly cyclesPerSecond: number
  readonly secondsUntilNextCycle: number | null
  readonly remainingPanelCapacity: bigint
  readonly nominalPanelsPerSecond: number
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
  /** Prepared Double Time activity for this exact automation boundary. */
  readonly doubleTimeActive: boolean
  /** Persisted selected rate; Unity clamps it to the inclusive range 0..10. */
  readonly doubleTimeRate: number
}

export interface DreamRailgunReadinessFacts {
  readonly maximumCharge: number
  readonly chargeTransferred: number
  readonly energyAfterChargeTransfer: number
  readonly chargeAfterChargeTransfer: number
  readonly selectedRate: number
  readonly activeRate: number
  readonly panelsPerShot: bigint
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
  readonly hasPanelsForNextShot: boolean
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
  const remainingPanelCapacity =
    resources.dysonPanels <
    DREAM_SPACE_AGE_CONSTANTS.dysonPanelCap
      ? DREAM_SPACE_AGE_CONSTANTS.dysonPanelCap -
        resources.dysonPanels
      : 0n
  const active =
    Number.isFinite(resources.spaceFactories) &&
    resources.spaceFactories >= 1 &&
    remainingPanelCapacity > 0n
  let progressPerSecond = 0
  if (active) {
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
    progressPerSecond = multiplyContinuous(
      1 + Math.log10(resources.spaceFactories),
      globalMultiplier,
    )
  }
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
        cyclesPerSecond,
        secondsUntilNextCycle,
        remainingPanelCapacity,
        nominalPanelsPerSecond: cyclesPerSecond,
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
  const maximumCharge = state.dream.parameters.railgunMaxCharge
  if (
    typeof input.doubleTimeActive !== 'boolean' ||
    !Number.isFinite(input.doubleTimeRate) ||
    !Number.isFinite(maximumCharge) ||
    maximumCharge <= 0
  ) {
    return Object.freeze({ status: 'invalid-input' })
  }

  const resources = state.dream.resources
  const chargeTransfer = deriveRailgunChargeTransfer(
    resources.energy,
    resources.railgunCharge,
    maximumCharge,
  )
  const selectedRate = clampDoubleTimeRate(input.doubleTimeRate)
  const activeRate =
    input.doubleTimeActive && selectedRate >= 1
      ? selectedRate
      : 1
  const panelsPerShot = BigInt(activeRate)
  const panelsRequiredToStart =
    DREAM_SPACE_AGE_CONSTANTS.basePanelsRequiredToStart *
    panelsPerShot
  const totalFireTimeSeconds = railgunFireTime(state)
  const progressPerSecond =
    DREAM_SPACE_AGE_CONSTANTS.shotsPerVolley /
    totalFireTimeSeconds
  const shotIntervalSeconds =
    totalFireTimeSeconds /
    DREAM_SPACE_AGE_CONSTANTS.shotsPerVolley
  const chargePerShot =
    maximumCharge / DREAM_SPACE_AGE_CONSTANTS.shotsPerVolley
  const canStartVolley =
    chargeTransfer.charge >= maximumCharge &&
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
  const hasChargeForNextShot =
    chargeTransfer.charge >= chargePerShot
  const hasPanelsForNextShot =
    resources.dysonPanels >= panelsPerShot
  const hasSwarmCapacityForNextShot =
    resources.swarmPanels <= DISCRETE_MAXIMUM - panelsPerShot
  const canFireNextShot =
    volleyActiveAfterStartBoundary &&
    shotsRemainingAfterStartBoundary > 0 &&
    hasChargeForNextShot &&
    hasPanelsForNextShot &&
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
      maximumCharge,
      chargeTransferred: chargeTransfer.transferred,
      energyAfterChargeTransfer: chargeTransfer.energy,
      chargeAfterChargeTransfer: chargeTransfer.charge,
      selectedRate,
      activeRate,
      panelsPerShot,
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
      hasPanelsForNextShot,
      hasSwarmCapacityForNextShot,
      canFireNextShot,
      secondsUntilNextShotAttempt,
    }),
  })
}

/**
 * Runs one pure Unity-parity Space Age production interval.
 *
 * Energy and Space Factory arrivals both use the tick-start state. Railgun
 * automation is intentionally separate because Unity runs it in a later phase.
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
      spaceFactoryCycles: 0n,
      dysonPanelsProduced: 0n,
    }
  }
  const production = derived.facts
  const energyGenerated = multiplyContinuous(
    production.energy.totalPerSecond,
    input.tickSeconds,
  )

  let spaceFactoryCycles = 0n
  let dysonPanelsProduced = 0n
  let timerProgress = production.spaceFactory.currentProgress
  if (production.spaceFactory.active) {
    const accumulated = addContinuous(
      safeTimerProgress(timerProgress),
      multiplyContinuous(
        production.spaceFactory.progressPerSecond,
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

    dysonPanelsProduced =
      spaceFactoryCycles >
      production.spaceFactory.remainingPanelCapacity
        ? production.spaceFactory.remainingPanelCapacity
        : spaceFactoryCycles
  }

  return {
    status: 'success',
    state: {
      ...state,
      dream: {
        ...state.dream,
        resources: {
          ...resources,
          energy: addContinuous(
            resources.energy,
            energyGenerated,
          ),
          dysonPanels: addDiscrete(
            resources.dysonPanels,
            dysonPanelsProduced,
          ),
        },
        timers: {
          ...state.dream.timers,
          spaceFactoriesTimerProgress: timerProgress,
        },
      },
    },
    energyGenerated,
    spaceFactoryCycles,
    dysonPanelsProduced,
  }
}

/**
 * Runs the persistent railgun automation phase, including charge transfer,
 * volley start, and at most one shot for the supplied interval.
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
  const chargeTransferred = readiness.chargeTransferred
  const panelsPerShot = readiness.panelsPerShot
  let dysonPanels = originalResources.dysonPanels
  let swarmPanels = originalResources.swarmPanels
  let firing = readiness.volleyActiveAfterStartBoundary
  let fireProgress = readiness.fireProgressAfterStartBoundary
  let shotsRemaining = readiness.shotsRemainingAfterStartBoundary
  const volleyStarted = readiness.canStartVolley
  let shotFired = false
  let panelsLaunched = 0n

  if (firing) {
    const progressDelta = multiplyContinuous(
      readiness.progressPerSecond,
      input.tickSeconds,
    )
    fireProgress = addContinuous(
      safeTimerProgress(fireProgress),
      progressDelta,
    )
    const shotThreshold = readiness.shotIntervalSeconds
    const chargePerShot = readiness.chargePerShot

    if (fireProgress >= shotThreshold) {
      if (
        charge < chargePerShot ||
        dysonPanels < panelsPerShot ||
        swarmPanels > DISCRETE_MAXIMUM - panelsPerShot
      ) {
        firing = false
        fireProgress = 0
        shotsRemaining = 0
      } else {
        const debit = tryDebitContinuous(charge, chargePerShot)
        if (debit.status !== 'success') {
          firing = false
          fireProgress = 0
          shotsRemaining = 0
        } else {
          charge = debit.balance
          dysonPanels -= panelsPerShot
          swarmPanels += panelsPerShot
          fireProgress = 0
          shotsRemaining = Math.max(0, shotsRemaining - 1)
          shotFired = true
          panelsLaunched = panelsPerShot
        }
      }
    }

    if (
      firing &&
      (charge < chargePerShot || shotsRemaining <= 0)
    ) {
      firing = false
      fireProgress = 0
      shotsRemaining = 0
    }
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
        },
      },
    },
    chargeTransferred,
    volleyStarted,
    shotFired,
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
): DreamSpaceAgePurchaseResult {
  const cost =
    command === 'solar'
      ? state.dream.parameters.solarCost
      : state.dream.parameters.fusionCost
  if (cost <= 0n) {
    return purchaseFailure(state, command, cost, 'invalid-cost')
  }
  if (state.reality.influence < cost) {
    return purchaseFailure(
      state,
      command,
      cost,
      'insufficient-influence',
    )
  }
  const resource = command === 'solar' ? 'solarPanels' : 'fusion'
  const current = state.dream.resources[resource]
  const next = current + 1
  if (
    !Number.isFinite(current) ||
    current < 0 ||
    !Number.isFinite(next) ||
    next <= current
  ) {
    return purchaseFailure(
      state,
      command,
      cost,
      'output-maxed',
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
          [resource]: next,
        },
      },
    },
  }
}

function railgunFireTime(
  state: Readonly<CanonicalGameStateV1>,
): number {
  if (state.dream.upgrades.railgunActivator2) {
    return DREAM_SPACE_AGE_CONSTANTS.railgunUpgrade2FireTimeSeconds
  }
  if (state.dream.upgrades.railgunActivator1) {
    return DREAM_SPACE_AGE_CONSTANTS.railgunUpgrade1FireTimeSeconds
  }
  return DREAM_SPACE_AGE_CONSTANTS.railgunBaseFireTimeSeconds
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
  if (energy > 0 && charge < maximumCharge) {
    const requested = Math.min(maximumCharge - charge, energy)
    const debit = tryDebitContinuous(energy, requested)
    if (debit.status === 'success') {
      const nextCharge = addContinuous(charge, debit.charged)
      if (nextCharge > charge) {
        energy = debit.balance
        charge = Math.min(maximumCharge, nextCharge)
        transferred = charge - originalCharge
      }
    }
  }
  return { energy, charge, transferred }
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
