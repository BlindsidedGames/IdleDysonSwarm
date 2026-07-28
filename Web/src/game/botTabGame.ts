import {
  BasicDysonSimulationModel,
  createBasicDysonState,
  recalculateBasicDysonRates,
  type BasicDysonFacilityId,
  type BasicDysonState,
  type BasicDysonStateInput,
} from '../simulation/dysonModel'
import { createEmptyFacilityPairs } from '../simulation/dysonFacilities'
import { advanceEventTime } from '../simulation/eventTime'
import { addContinuous } from '../simulation/numeric'
import {
  tryPurchaseBasicFacility,
  type BuyMode,
  type FacilityPurchaseResult,
} from '../simulation/transactions'

const AUTOMATION_INTERVAL_SECONDS = 0.1
const INITIAL_TINKER_COOLDOWN_SECONDS = 10
const MINIMUM_TINKER_COOLDOWN_SECONDS = 0.5
const TINKER_BUTTON_HEAD_START_SECONDS = 0.1
const TIME_EPSILON = 1e-12

export interface BotTabGameState {
  dyson: BasicDysonState
  botDistribution: number
  botMultitasking: boolean
  tinkerCooldownSeconds: number
  tinkerRemainingSeconds: number | null
  automationTimeUntilNextEvent: number
  simulatedSeconds: number
}

export interface CreateBotTabGameOptions {
  dyson?: BasicDysonStateInput
  botDistribution?: number
  botMultitasking?: boolean
  tinkerCooldownSeconds?: number
}

function defaultDysonState(): BasicDysonStateInput {
  return {
    money: 0,
    science: 0,
    bots: 0,
    panels: 0,
    workers: 0,
    researchers: 0,
    moneyMultiplier: 1,
    scienceMultiplier: 1,
    panelRateMultiplier: 1,
    panelLifetime: 10,
    ownedSkills: [],
    facilities: createEmptyFacilityPairs(),
    modifiers: {
      assembly_lines: 1,
      ai_managers: 1,
      servers: 1,
      data_centers: 1,
      planets: 1,
    },
    automation: {
      enabledFacilities: [],
      buyMode: 'buy-1',
      roundedBulkBuy: false,
    },
  }
}

export function clampBotDistribution(value: number): number {
  if (!Number.isFinite(value)) return 0.5
  return Math.round(Math.min(1, Math.max(0, value)) * 100) / 100
}

export function applyBotDistribution(
  state: BasicDysonState,
  distribution: number,
  multitasking: boolean,
): void {
  const wholeBots = Math.floor(state.bots)
  if (multitasking) {
    state.workers = wholeBots
    state.researchers = wholeBots
  } else {
    const researchShare = clampBotDistribution(distribution)
    state.workers = Math.ceil(wholeBots * (1 - researchShare))
    state.researchers = Math.floor(wholeBots * researchShare)
  }
  state.rates = recalculateBasicDysonRates(state)
}

export function createBotTabGameState(
  options: CreateBotTabGameOptions = {},
): BotTabGameState {
  const botDistribution = clampBotDistribution(
    options.botDistribution ?? 0.5,
  )
  const botMultitasking = options.botMultitasking ?? false
  const dyson = createBasicDysonState(options.dyson ?? defaultDysonState())
  applyBotDistribution(dyson, botDistribution, botMultitasking)
  return {
    dyson,
    botDistribution,
    botMultitasking,
    tinkerCooldownSeconds: Math.max(
      MINIMUM_TINKER_COOLDOWN_SECONDS,
      options.tinkerCooldownSeconds ?? INITIAL_TINKER_COOLDOWN_SECONDS,
    ),
    tinkerRemainingSeconds: null,
    automationTimeUntilNextEvent: AUTOMATION_INTERVAL_SECONDS,
    simulatedSeconds: 0,
  }
}

export function cloneBotTabGameState(
  state: BotTabGameState,
): BotTabGameState {
  return {
    ...state,
    dyson: createBasicDysonState(state.dyson),
  }
}

export function setBotDistribution(
  state: BotTabGameState,
  value: number,
): BotTabGameState {
  const next = cloneBotTabGameState(state)
  next.botDistribution = clampBotDistribution(value)
  applyBotDistribution(
    next.dyson,
    next.botDistribution,
    next.botMultitasking,
  )
  return next
}

export function setBotBuyMode(
  state: BotTabGameState,
  buyMode: BuyMode,
): BotTabGameState {
  const next = cloneBotTabGameState(state)
  next.dyson.automation.buyMode = buyMode
  return next
}

export function setRoundedBulkBuy(
  state: BotTabGameState,
  roundedBulkBuy: boolean,
): BotTabGameState {
  const next = cloneBotTabGameState(state)
  next.dyson.automation.roundedBulkBuy = roundedBulkBuy
  return next
}

export function startTinkering(state: BotTabGameState): BotTabGameState {
  if (state.tinkerRemainingSeconds !== null) return state
  const next = cloneBotTabGameState(state)
  next.tinkerRemainingSeconds = Math.max(
    0,
    next.tinkerCooldownSeconds - TINKER_BUTTON_HEAD_START_SECONDS,
  )
  return next
}

export function purchaseBotFacility(
  state: BotTabGameState,
  facilityId: BasicDysonFacilityId,
): {
  state: BotTabGameState
  result: FacilityPurchaseResult
} {
  const next = cloneBotTabGameState(state)
  const result = tryPurchaseBasicFacility(
    next.dyson,
    facilityId,
    'preserve-configured-mode',
  )
  if (result.purchased) {
    applyBotDistribution(
      next.dyson,
      next.botDistribution,
      next.botMultitasking,
    )
  }
  return { state: next, result }
}

export function advanceBotTabGame(
  state: BotTabGameState,
  requestedSeconds: number,
): BotTabGameState {
  if (!Number.isFinite(requestedSeconds) || requestedSeconds <= 0) {
    return state
  }

  const next = cloneBotTabGameState(state)
  let remainingSeconds = requestedSeconds

  while (remainingSeconds > TIME_EPSILON) {
    applyBotDistribution(
      next.dyson,
      next.botDistribution,
      next.botMultitasking,
    )

    const tinkerHorizon =
      next.tinkerRemainingSeconds === null
        ? Number.MAX_VALUE
        : next.tinkerRemainingSeconds
    const stepSeconds = Math.min(
      remainingSeconds,
      AUTOMATION_INTERVAL_SECONDS,
      tinkerHorizon,
    )
    const result = advanceEventTime({
      startingState: new BasicDysonSimulationModel(next.dyson),
      durationSeconds: stepSeconds,
      automationIntervalSeconds: AUTOMATION_INTERVAL_SECONDS,
      automationTimeUntilNextEvent:
        next.automationTimeUntilNextEvent,
      processingBudgetMilliseconds: 0,
    })
    if (!result.completed) {
      throw new Error(
        result.diagnosticCode ??
          `Bot tab simulation stopped with ${result.validationStatus}`,
      )
    }

    next.dyson = result.candidateState.state
    next.automationTimeUntilNextEvent =
      result.automationTimeUntilNextEvent
    next.simulatedSeconds += result.consumedSeconds
    remainingSeconds -= result.consumedSeconds

    if (next.tinkerRemainingSeconds !== null) {
      next.tinkerRemainingSeconds = Math.max(
        0,
        next.tinkerRemainingSeconds - result.consumedSeconds,
      )
      if (next.tinkerRemainingSeconds <= TIME_EPSILON) {
        next.dyson.bots = addContinuous(next.dyson.bots, 1)
        next.tinkerCooldownSeconds = Math.max(
          MINIMUM_TINKER_COOLDOWN_SECONDS,
          next.tinkerCooldownSeconds - 1,
        )
        next.tinkerRemainingSeconds = null
        applyBotDistribution(
          next.dyson,
          next.botDistribution,
          next.botMultitasking,
        )
      }
    }

    if (result.consumedSeconds <= TIME_EPSILON) break
  }

  return next
}
