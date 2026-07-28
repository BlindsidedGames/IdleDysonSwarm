import type { CanonicalGameStateV1 } from '../game-state/types'
import {
  addContinuous,
  addDiscrete,
  DISCRETE_MAXIMUM,
  floorToDiscrete,
  multiplyContinuous,
} from './numeric'
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
  let solarEnergy = multiplyContinuous(
    resources.solarPanels,
    Number(state.dream.parameters.solarPanelGeneration),
  )
  if (state.dream.education.mathematics.complete) {
    solarEnergy = multiplyContinuous(solarEnergy, 2)
  }
  const fusionEnergy = multiplyContinuous(
    resources.fusion,
    Number(state.dream.parameters.fusionGeneration),
  )
  const swarmEnergy = multiplyContinuous(
    Number(resources.swarmPanels),
    Number(state.dream.parameters.swarmPanelGeneration),
  )
  const energyGenerated = multiplyContinuous(
    multiplyContinuous(
      addContinuous(
        addContinuous(solarEnergy, fusionEnergy),
        swarmEnergy,
      ),
      input.doubleTimeMultiplier,
    ),
    input.tickSeconds,
  )

  let spaceFactoryCycles = 0n
  let dysonPanelsProduced = 0n
  let timerProgress =
    state.dream.timers.spaceFactoriesTimerProgress ?? 0
  if (
    Number.isFinite(resources.spaceFactories) &&
    resources.spaceFactories >= 1 &&
    resources.dysonPanels <
      DREAM_SPACE_AGE_CONSTANTS.dysonPanelCap
  ) {
    let globalMultiplier = input.doubleTimeMultiplier
    if (state.dream.upgrades.sfActivator1) {
      globalMultiplier = multiplyContinuous(globalMultiplier, 2)
    }
    if (state.dream.upgrades.sfActivator2) {
      globalMultiplier = multiplyContinuous(globalMultiplier, 2)
    }
    if (state.dream.upgrades.sfActivator3) {
      globalMultiplier = multiplyContinuous(globalMultiplier, 2)
    }
    const baseMultiplier =
      1 + Math.log10(resources.spaceFactories)
    const accumulated = addContinuous(
      safeTimerProgress(timerProgress),
      multiplyContinuous(
        multiplyContinuous(baseMultiplier, globalMultiplier),
        input.tickSeconds,
      ),
    )
    spaceFactoryCycles = floorToDiscrete(
      accumulated /
        DREAM_SPACE_AGE_CONSTANTS.spaceFactoryDurationSeconds,
    )
    timerProgress =
      spaceFactoryCycles > 0n
        ? accumulated %
          DREAM_SPACE_AGE_CONSTANTS.spaceFactoryDurationSeconds
        : accumulated

    const availableCapacity =
      DREAM_SPACE_AGE_CONSTANTS.dysonPanelCap -
      resources.dysonPanels
    dysonPanelsProduced =
      spaceFactoryCycles > availableCapacity
        ? availableCapacity
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
  const maximumCharge = state.dream.parameters.railgunMaxCharge
  if (
    !Number.isFinite(input.tickSeconds) ||
    input.tickSeconds <= 0 ||
    typeof input.doubleTimeActive !== 'boolean' ||
    !Number.isFinite(input.doubleTimeRate) ||
    !Number.isFinite(maximumCharge) ||
    maximumCharge <= 0
  ) {
    return invalidRailgun(state)
  }

  const originalResources = state.dream.resources
  let energy = originalResources.energy
  let charge = originalResources.railgunCharge
  let chargeTransferred = 0
  if (energy > 0 && charge < maximumCharge) {
    const requested = Math.min(maximumCharge - charge, energy)
    const debit = tryDebitContinuous(energy, requested)
    if (debit.status === 'success') {
      const nextCharge = addContinuous(charge, debit.charged)
      if (nextCharge > charge) {
        energy = debit.balance
        charge = Math.min(maximumCharge, nextCharge)
        chargeTransferred = charge - originalResources.railgunCharge
      }
    }
  }

  const selectedRate = clampDoubleTimeRate(input.doubleTimeRate)
  const activeRate =
    input.doubleTimeActive && selectedRate >= 1
      ? selectedRate
      : 1
  const panelsPerShot = BigInt(activeRate)
  const panelsRequiredToStart =
    DREAM_SPACE_AGE_CONSTANTS.basePanelsRequiredToStart *
    panelsPerShot
  let dysonPanels = originalResources.dysonPanels
  let swarmPanels = originalResources.swarmPanels
  let firing = state.dream.railgun.firing
  let fireProgress = state.dream.railgun.fireProgress
  let shotsRemaining = state.dream.railgun.shotsRemaining
  let volleyStarted = false
  let shotFired = false
  let panelsLaunched = 0n

  if (
    charge >= maximumCharge &&
    dysonPanels >= panelsRequiredToStart &&
    !firing
  ) {
    firing = true
    fireProgress = 0
    shotsRemaining = DREAM_SPACE_AGE_CONSTANTS.shotsPerVolley
    volleyStarted = true
  }

  if (firing) {
    const totalFireTime = railgunFireTime(state)
    const progressDelta = multiplyContinuous(
      DREAM_SPACE_AGE_CONSTANTS.shotsPerVolley /
        totalFireTime,
      input.tickSeconds,
    )
    fireProgress = addContinuous(
      safeTimerProgress(fireProgress),
      progressDelta,
    )
    const shotThreshold =
      totalFireTime /
      DREAM_SPACE_AGE_CONSTANTS.shotsPerVolley
    const chargePerShot =
      maximumCharge /
      DREAM_SPACE_AGE_CONSTANTS.shotsPerVolley

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

function clampDoubleTimeRate(rate: number): number {
  return Math.max(0, Math.min(10, Math.trunc(rate)))
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
