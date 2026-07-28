import { getGameAsset } from '../game-data/catalog'
import {
  addContinuous,
  addDiscrete,
  clampContinuous,
  multiplyContinuous,
} from './numeric'
import {
  BASIC_DYSON_FACILITY_IDS,
  type BasicDysonFacilityId,
  type OwnedPair,
} from './dysonFacilities'
import {
  applyFiniteBotCapSpecialReward,
  breakInfinityBotThreshold,
  clampBreakTarget,
  cloneBasicDysonInfinityState,
  createBasicDysonInfinityState,
  infinityPointsForBots,
  ordinaryInfinityBotThreshold,
  timeToNextInfinityEvent,
  tryApplyBasicDysonInfinityReset,
  validateBasicDysonInfinityState,
  type BasicDysonInfinityState,
} from './infinityCycle'
import { staticSkillEffects } from './skillEffects'
import { calculateStat, type StatEffect } from './stat'
import { tryPurchaseBasicFacility, type BuyMode } from './transactions'
import type {
  EventTimeSimulationModel,
  SimulationAutomationPolicy,
  SimulationPresentationSummary,
  SimulationQueuedInput,
} from './types'

export {
  BASIC_DYSON_FACILITY_IDS,
  breakInfinityBotThreshold,
  infinityPointsForBots,
  ordinaryInfinityBotThreshold,
}
export type {
  BasicDysonFacilityId,
  BasicDysonInfinityState,
  OwnedPair,
}

export interface BasicDysonRates {
  money: number
  science: number
  panels: number
  bots: number
  assembly_lines: number
  ai_managers: number
  servers: number
  data_centers: number
  planets: number
}

export interface BasicDysonState {
  money: number
  science: number
  bots: number
  panels: number
  workers: number
  researchers: number
  moneyMultiplier: number
  scienceMultiplier: number
  panelRateMultiplier: number
  panelLifetime: number
  ownedSkills: string[]
  facilities: Record<BasicDysonFacilityId, OwnedPair>
  modifiers: Record<BasicDysonFacilityId, number>
  modifierEffectsApplied?: boolean
  rates: BasicDysonRates
  automation: {
    enabledFacilities: BasicDysonFacilityId[]
    buyMode: BuyMode
    roundedBulkBuy: boolean
  }
  infinity: BasicDysonInfinityState
}

export type BasicDysonStateInput = Omit<
  BasicDysonState,
  'rates' | 'infinity'
> & {
  rates?: BasicDysonRates
  infinity?: Partial<BasicDysonInfinityState>
}

const ZERO_RATES: BasicDysonRates = {
  money: 0,
  science: 0,
  panels: 0,
  bots: 0,
  assembly_lines: 0,
  ai_managers: 0,
  servers: 0,
  data_centers: 0,
  planets: 0,
}

function cloneRates(rates: BasicDysonRates): BasicDysonRates {
  return { ...rates }
}

function cloneState(state: BasicDysonState): BasicDysonState {
  return {
    ...state,
    facilities: {
      assembly_lines: [...state.facilities.assembly_lines],
      ai_managers: [...state.facilities.ai_managers],
      servers: [...state.facilities.servers],
      data_centers: [...state.facilities.data_centers],
      planets: [...state.facilities.planets],
    },
    modifiers: { ...state.modifiers },
    modifierEffectsApplied: state.modifierEffectsApplied ?? false,
    ownedSkills: [...state.ownedSkills],
    rates: cloneRates(state.rates),
    automation: {
      enabledFacilities: [...state.automation.enabledFacilities],
      buyMode: state.automation.buyMode,
      roundedBulkBuy: state.automation.roundedBulkBuy,
    },
    infinity: cloneBasicDysonInfinityState(state.infinity),
  }
}

function effectiveCount(pair: OwnedPair): number {
  return addContinuous(pair[0], pair[1])
}

function legacyBaseProduction(id: BasicDysonFacilityId): number {
  const asset = getGameAsset('GameData.FacilityDefinition', id)
  const value = asset?.data.baseProduction
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new Error(`Facility '${id}' has no valid baseProduction`)
  }

  // Unity deliberately calls ToLegacyFloat before StatCalculator. Keeping this
  // explicit is required for golden-master parity.
  return Math.fround(value)
}

function facilityRate(
  state: BasicDysonState,
  id: BasicDysonFacilityId,
): number {
  const asset = getGameAsset('GameData.FacilityDefinition', id)
  const productionStatId = asset?.data.productionStatId
  if (typeof productionStatId !== 'string') {
    throw new Error(`Facility '${id}' has no productionStatId`)
  }
  const modifierStatId = FACILITY_MODIFIER_STATS[id]
  const modifier = state.modifierEffectsApplied
    ? clampContinuous(state.modifiers[id])
    : calculateStat(
        clampContinuous(state.modifiers[id]),
        staticSkillEffects(state.ownedSkills, modifierStatId),
      )
  const productionEffects: StatEffect[] = [
    {
      id: `${id}.count`,
      operation: 'multiply',
      value: effectiveCount(state.facilities[id]),
      order: 0,
    },
  ]
  if (Math.abs(modifier - 1) > 1e-12) {
    productionEffects.push({
      id: `${id}.modifier`,
      operation: 'multiply',
      value: modifier,
      order: 10,
    })
  }
  productionEffects.push(
    ...staticSkillEffects(state.ownedSkills, productionStatId),
  )
  return clampContinuous(
    calculateStat(legacyBaseProduction(id), productionEffects),
  )
}

const FACILITY_MODIFIER_STATS: Record<BasicDysonFacilityId, string> = {
  assembly_lines: 'Facility.AssemblyLine.Modifier',
  ai_managers: 'Facility.Manager.Modifier',
  servers: 'Facility.Server.Modifier',
  data_centers: 'Facility.DataCenter.Modifier',
  planets: 'Facility.Planet.Modifier',
}

export function recalculateBasicDysonRates(
  state: BasicDysonState,
): BasicDysonRates {
  const panels = clampContinuous(
    calculateStat(
      multiplyContinuous(state.workers / 100, state.panelRateMultiplier),
      staticSkillEffects(state.ownedSkills, 'Global.PanelsPerSecond'),
    ),
  )
  return {
    panels,
    money: multiplyContinuous(
      multiplyContinuous(panels, state.panelLifetime),
      state.moneyMultiplier,
    ),
    science: multiplyContinuous(state.researchers, state.scienceMultiplier),
    bots: facilityRate(state, 'assembly_lines'),
    assembly_lines: facilityRate(state, 'ai_managers'),
    ai_managers: facilityRate(state, 'servers'),
    servers: facilityRate(state, 'data_centers'),
    data_centers: facilityRate(state, 'planets'),
    planets: 0,
  }
}

export function createBasicDysonState(
  state: BasicDysonStateInput,
): BasicDysonState {
  const created = cloneState({
    ...state,
    rates: state.rates ?? ZERO_RATES,
    infinity: createBasicDysonInfinityState(state.infinity),
  })
  created.rates = recalculateBasicDysonRates(created)
  return created
}

export class BasicDysonSimulationModel
  implements EventTimeSimulationModel<BasicDysonSimulationModel>
{
  readonly state: BasicDysonState
  private pending: BasicDysonRates = cloneRates(ZERO_RATES)

  constructor(state: BasicDysonState) {
    this.state = cloneState(state)
  }

  clone(): BasicDysonSimulationModel {
    const copy = new BasicDysonSimulationModel(this.state)
    copy.pending = cloneRates(this.pending)
    return copy
  }

  validate(): string | undefined {
    const values = [
      this.state.money,
      this.state.science,
      this.state.bots,
      this.state.panels,
      this.state.workers,
      this.state.researchers,
      this.state.moneyMultiplier,
      this.state.scienceMultiplier,
      this.state.panelRateMultiplier,
      this.state.panelLifetime,
      this.state.ownedSkills.length,
      ...Object.values(this.state.facilities).flat(),
      ...Object.values(this.state.modifiers),
      ...Object.values(this.state.rates),
      ...Object.values(this.pending),
    ]
    if (!values.every((value) => Number.isFinite(value) && value >= 0)) {
      return 'SIM-DYSON-NON-FINITE'
    }
    if (
      (this.state.infinity.botCapTransitionPending ||
        this.state.infinity.botCapRewardsGranted) &&
      this.state.bots !== Number.MAX_VALUE
    ) {
      return 'SIM-BOT-CAP-CHECKPOINT-INVALID'
    }
    return validateBasicDysonInfinityState(this.state.infinity)
  }

  timeToNextMaterialEvent(
    maximumSeconds: number,
    infinityMinimumCycleSeconds: number,
  ): number {
    return timeToNextInfinityEvent(
      this.state.bots,
      this.state.rates.bots,
      this.state.infinity,
      maximumSeconds,
      infinityMinimumCycleSeconds,
    )
  }

  advanceContinuous(seconds: number): void {
    const rates = this.state.rates
    for (const key of Object.keys(rates) as (keyof BasicDysonRates)[]) {
      this.pending[key] = addContinuous(
        this.pending[key],
        multiplyContinuous(rates[key], seconds),
      )
    }
    this.state.infinity.secondsInCurrentCycle = addContinuous(
      this.state.infinity.secondsInCurrentCycle,
      seconds,
    )
  }

  applyProductionArrivals(): void {
    this.state.money = addContinuous(this.state.money, this.pending.money)
    this.state.science = addContinuous(
      this.state.science,
      this.pending.science,
    )
    this.state.bots = addContinuous(this.state.bots, this.pending.bots)
    this.state.panels = addContinuous(this.state.panels, this.pending.panels)
    this.creditFacility('assembly_lines')
    this.creditFacility('ai_managers')
    this.creditFacility('servers')
    this.creditFacility('data_centers')
    this.creditFacility('planets')
    this.pending = cloneRates(ZERO_RATES)
  }

  applyAutomation(
    policy: SimulationAutomationPolicy,
    _summary: SimulationPresentationSummary,
  ): void {
    for (const facilityId of this.state.automation.enabledFacilities) {
      tryPurchaseBasicFacility(this.state, facilityId, policy)
    }
  }

  applyDerivedTimersAndDoubleTime(): void {
    this.state.rates = recalculateBasicDysonRates(this.state)
  }

  applyDreamReset(_summary: SimulationPresentationSummary): void {}

  applyBotCapTransition(summary: SimulationPresentationSummary): void {
    const outcome = applyFiniteBotCapSpecialReward(this.state)
    if (!outcome.specialRewardGranted) return
    summary.botCapInfinityPoints = addDiscrete(
      summary.botCapInfinityPoints,
      outcome.infinityPointsGranted,
    )
    summary.botCapOverflowRewards = addDiscrete(
      summary.botCapOverflowRewards,
      1n,
    )
  }

  applyInfinityReset(
    minimumCycleSeconds: number,
    summary: SimulationPresentationSummary,
  ): void {
    const outcome = tryApplyBasicDysonInfinityReset(
      this.state,
      minimumCycleSeconds,
    )
    if (outcome === undefined) return
    this.state.rates = recalculateBasicDysonRates(this.state)

    if (outcome.breakInfinity) {
      summary.breakInfinityCount = addDiscrete(
        summary.breakInfinityCount,
        1n,
      )
      summary.breakInfinityPoints = addDiscrete(
        summary.breakInfinityPoints,
        outcome.rewardGranted,
      )
    } else {
      summary.ordinaryInfinityCount = addDiscrete(
        summary.ordinaryInfinityCount,
        1n,
      )
      summary.ordinaryInfinityPoints = addDiscrete(
        summary.ordinaryInfinityPoints,
        outcome.rewardGranted,
      )
    }
  }

  applyQueuedInput(
    input: SimulationQueuedInput,
    _summary: SimulationPresentationSummary,
  ): void {
    if (
      input.kind === 'break-target' &&
      input.discreteValue !== undefined &&
      input.discreteValue >= 1n
    ) {
      this.state.infinity.breakTarget = clampBreakTarget(
        input.discreteValue,
      )
    }
  }

  private creditFacility(id: BasicDysonFacilityId): void {
    this.state.facilities[id][0] = addContinuous(
      this.state.facilities[id][0],
      this.pending[id],
    )
  }
}
