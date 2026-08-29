import { isFiniteNonNegativeNumber } from '../core/finiteNonNegativeNumber'
import type {
  CanonicalFacilityId,
  CanonicalGameStateV1,
  CanonicalOwnedPair,
} from '../game-state/types'
import { addContinuous, multiplyContinuous } from './numeric'
import type { BasicDysonRates } from './dysonModel'
import type { MegaStructureRates } from './megaStructureRates'
import { clampPreBreakInfinityBots } from './infinityCycle'

/**
 * Tick-start rates committed by Unity ProductionSystem.CalculateProduction.
 * The facility key names the produced output, not the producer:
 * assembly_lines are produced by managers, planets by planet generation plus
 * Matrioshka brains, Matrioshkas by Birch planets, and Birches by Galactic
 * brains. Nothing passively produces Galactic brains.
 */
export interface DysonProductionArrivalRates {
  readonly money: number
  readonly science: number
  readonly panels: number
  readonly bots: number
  readonly assembly_lines: number
  readonly ai_managers: number
  readonly servers: number
  readonly data_centers: number
  readonly planets: number
  readonly matrioshka_brains: number
  readonly birch_planets: number
}

const PRODUCED_FACILITY_IDS = [
  'assembly_lines',
  'ai_managers',
  'servers',
  'data_centers',
  'planets',
  'matrioshka_brains',
  'birch_planets',
] as const satisfies readonly CanonicalFacilityId[]

/**
 * Maps producer-keyed mega rates onto the resources they create and combines
 * them with the existing Dyson chain captured at the same recalculation.
 */
export function combineDysonProductionArrivalRates(
  basic: Readonly<BasicDysonRates>,
  mega: Readonly<MegaStructureRates>,
): Readonly<DysonProductionArrivalRates> {
  const combined: DysonProductionArrivalRates = {
    money: basic.money,
    science: basic.science,
    panels: basic.panels,
    bots: basic.bots,
    assembly_lines: basic.assembly_lines,
    ai_managers: basic.ai_managers,
    servers: basic.servers,
    data_centers: basic.data_centers,
    planets: addContinuous(
      basic.planets,
      mega.matrioshka_brains,
    ),
    matrioshka_brains: mega.birch_planets,
    birch_planets: mega.galactic_brains,
  }
  validateRates(combined)
  return Object.freeze(combined)
}

/**
 * Atomically commits one interval from rates captured before any arrival.
 * Derived-rate recalculation deliberately does not occur here, preventing a
 * newly produced facility from cascading into another tier in the same tick.
 */
export function applyDysonProductionArrivals(
  state: CanonicalGameStateV1,
  rates: Readonly<DysonProductionArrivalRates>,
  seconds: number,
): CanonicalGameStateV1 {
  if (!isFiniteNonNegativeNumber(seconds)) {
    throw new Error(
      'Dyson production arrivals require finite non-negative seconds.',
    )
  }
  validateRates(rates)
  if (seconds === 0) return state

  const facilities = Object.fromEntries(
    Object.entries(state.dyson.facilities).map(([id, pair]) => [
      id,
      [...pair] as [number, number],
    ]),
  ) as Record<CanonicalFacilityId, [number, number]>
  for (const id of PRODUCED_FACILITY_IDS) {
    facilities[id][0] = accumulate(
      facilities[id][0],
      rates[id],
      seconds,
    )
  }

  return {
    ...state,
    dyson: {
      ...state.dyson,
      money: accumulate(state.dyson.money, rates.money, seconds),
      science: accumulate(state.dyson.science, rates.science, seconds),
      bots: clampPreBreakInfinityBots(
        accumulate(state.dyson.bots, rates.bots, seconds),
        state.quantum.unlocks.breakTheLoop,
        state.quantum.divisionsPurchased,
      ),
      totalPanelsDecayed: accumulate(
        state.dyson.totalPanelsDecayed,
        rates.panels,
        seconds,
      ),
      facilities: facilities as Readonly<
        Record<CanonicalFacilityId, CanonicalOwnedPair>
      >,
    },
  }
}

function accumulate(
  current: number,
  rate: number,
  seconds: number,
): number {
  return addContinuous(current, multiplyContinuous(rate, seconds))
}

function validateRates(
  rates: Readonly<DysonProductionArrivalRates>,
): void {
  for (const [id, value] of Object.entries(rates)) {
    if (!Number.isFinite(value) || value < 0) {
      throw new Error(
        `Dyson production rate '${id}' must be finite and non-negative.`,
      )
    }
  }
}
