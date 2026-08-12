import { getGameAsset } from '../game-data/catalog'
import type { CanonicalFacilityId } from '../game-state/types'
import type { CanonicalGameStateV2 } from '../game-state/typesV2'
import {
  GAME_DECIMAL_ONE,
  GAME_DECIMAL_ZERO,
  addGameDecimals,
  ceilGameDecimal,
  cloneGameDecimal,
  compareGameDecimals,
  divideGameDecimals,
  equalGameDecimals,
  floorGameDecimal,
  gameDecimalFromNumber,
  isGameDecimal,
  logGameDecimal,
  maxGameDecimal,
  minGameDecimal,
  multiplyGameDecimals,
  powGameDecimal,
  subtractGameDecimals,
  type GameDecimal,
} from '../math/gameDecimal'

export const DYSON_V2_FACILITY_IDS = Object.freeze([
  'assembly_lines',
  'ai_managers',
  'servers',
  'data_centers',
  'planets',
  'matrioshka_brains',
  'birch_planets',
  'galactic_brains',
] as const satisfies readonly CanonicalFacilityId[])

export type DysonV2RateTarget =
  | 'panels'
  | 'money'
  | 'science'
  | 'panelLifetimeSeconds'
  | CanonicalFacilityId

export type DysonV2StatEffect =
  | Readonly<{
      id: string
      operation:
        | 'add'
        | 'subtract'
        | 'multiply'
        | 'override'
        | 'clamp-min'
        | 'clamp-max'
      value: GameDecimal
      order: number
    }>
  | Readonly<{
      id: string
      operation: 'power'
      exponent: number
      order: number
    }>

export interface DysonV2DerivationParameters {
  readonly panelRateMultiplier: GameDecimal
  readonly panelLifetimeSeconds: GameDecimal
  readonly moneyMultiplier: GameDecimal
  readonly scienceMultiplier: GameDecimal
  readonly planetGenerationPerSecond: GameDecimal
  readonly facilityModifiers: Readonly<Record<CanonicalFacilityId, GameDecimal>>
  readonly effects?: Readonly<
    Partial<Record<DysonV2RateTarget, readonly DysonV2StatEffect[]>>
  >
}

export interface DysonV2ProductionRates {
  readonly money: GameDecimal
  readonly science: GameDecimal
  readonly panels: GameDecimal
  readonly bots: GameDecimal
  readonly assembly_lines: GameDecimal
  readonly ai_managers: GameDecimal
  readonly servers: GameDecimal
  readonly data_centers: GameDecimal
  readonly planets: GameDecimal
  readonly matrioshka_brains: GameDecimal
  readonly birch_planets: GameDecimal
}

export interface DerivedDysonV2Production {
  readonly allocation: Readonly<{
    workers: GameDecimal
    researchers: GameDecimal
  }>
  readonly effectiveFacilityCounts: Readonly<
    Record<CanonicalFacilityId, GameDecimal>
  >
  readonly facilityBaseProduction: Readonly<
    Record<CanonicalFacilityId, GameDecimal>
  >
  readonly facilityProducerRates: Readonly<
    Record<CanonicalFacilityId, GameDecimal>
  >
  readonly rates: Readonly<DysonV2ProductionRates>
  readonly panelLifetimeSeconds: GameDecimal
  readonly intermediates: Readonly<{
    rudimentarySingularityProduction: GameDecimal
    pocketDimensionsProduction: GameDecimal
  }>
}

export interface DysonV2ProductionSummary {
  readonly generated: Readonly<DysonV2ProductionRates>
  readonly effective: Readonly<DysonV2ProductionRates>
  readonly changed: boolean
}

export interface DysonV2ProductionAdvanceResult {
  readonly state: CanonicalGameStateV2
  readonly summary: Readonly<DysonV2ProductionSummary>
}

const HUNDRED = gameDecimalFromNumber(100)
const LEGACY_MULTIPLIER_EPSILON = gameDecimalFromNumber(1e-12)
const FACILITY_OUTPUT_RATE: Readonly<
  Record<CanonicalFacilityId, keyof DysonV2ProductionRates | null>
> = Object.freeze({
  assembly_lines: 'assembly_lines',
  ai_managers: 'ai_managers',
  servers: 'servers',
  data_centers: 'data_centers',
  planets: 'planets',
  matrioshka_brains: 'matrioshka_brains',
  birch_planets: 'birch_planets',
  galactic_brains: null,
})

const MEGA_UNLOCK: Readonly<
  Record<
    'matrioshka_brains' | 'birch_planets' | 'galactic_brains',
    'matrioshkaBrains' | 'birchPlanets' | 'galacticBrains'
  >
> = Object.freeze({
  matrioshka_brains: 'matrioshkaBrains',
  birch_planets: 'birchPlanets',
  galactic_brains: 'galacticBrains',
})

export function createNeutralDysonV2DerivationParameters(): Readonly<DysonV2DerivationParameters> {
  return Object.freeze({
    panelRateMultiplier: cloneGameDecimal(GAME_DECIMAL_ONE),
    panelLifetimeSeconds: gameDecimalFromNumber(10),
    moneyMultiplier: cloneGameDecimal(GAME_DECIMAL_ONE),
    scienceMultiplier: cloneGameDecimal(GAME_DECIMAL_ONE),
    planetGenerationPerSecond: cloneGameDecimal(GAME_DECIMAL_ZERO),
    facilityModifiers: Object.freeze(
      Object.fromEntries(
        DYSON_V2_FACILITY_IDS.map((id) => [
          id,
          cloneGameDecimal(GAME_DECIMAL_ONE),
        ]),
      ) as Record<CanonicalFacilityId, GameDecimal>,
    ),
    effects: Object.freeze({}),
  })
}

export function deriveDysonV2Production(
  source: Readonly<CanonicalGameStateV2>,
  parameters: Readonly<DysonV2DerivationParameters>,
): Readonly<DerivedDysonV2Production> {
  requireCanonicalBoundary(source)
  return deriveDysonV2ProductionFromValidatedState(source, parameters)
}

function deriveDysonV2ProductionFromValidatedState(
  state: Readonly<CanonicalGameStateV2>,
  parameters: Readonly<DysonV2DerivationParameters>,
): Readonly<DerivedDysonV2Production> {
  validateParameters(parameters)
  const allocation = deriveBotAllocationFromValidatedState(state)
  const effectiveFacilityCounts = mapFacilities((id) =>
    addGameDecimals(
      state.dyson.facilities[id][0],
      state.dyson.facilities[id][1],
    ),
  )
  const facilityBaseProduction = mapFacilities(readFacilityBaseProduction)
  const facilityProducerRates = mapFacilities((id) => {
    if (id in MEGA_UNLOCK) {
      const unlock = MEGA_UNLOCK[id as keyof typeof MEGA_UNLOCK]
      if (!state.quantum.unlocks[unlock]) {
        return cloneGameDecimal(GAME_DECIMAL_ZERO)
      }
    }
    return calculateFacilityRate(
      id,
      facilityBaseProduction[id],
      effectiveFacilityCounts[id],
      parameters.facilityModifiers[id],
      parameters.effects?.[id] ?? [],
    )
  })

  const panelLifetimeSeconds = applyEffects(
    parameters.panelLifetimeSeconds,
    parameters.effects?.panelLifetimeSeconds ?? [],
  )
  if (compareGameDecimals(panelLifetimeSeconds, GAME_DECIMAL_ZERO) <= 0) {
    throw new RangeError('Dyson V2 panel lifetime must remain positive.')
  }

  const panels = applyEffects(
    multiplyGameDecimals(
      divideGameDecimals(allocation.workers, HUNDRED),
      parameters.panelRateMultiplier,
    ),
    parameters.effects?.panels ?? [],
  )
  const money = applyEffects(
    multiplyGameDecimals(
      multiplyGameDecimals(panels, panelLifetimeSeconds),
      parameters.moneyMultiplier,
    ),
    parameters.effects?.money ?? [],
  )
  const science = applyEffects(
    multiplyGameDecimals(allocation.researchers, parameters.scienceMultiplier),
    parameters.effects?.science ?? [],
  )
  const rates = Object.freeze({
    money,
    science,
    panels,
    bots: facilityProducerRates.assembly_lines,
    assembly_lines: facilityProducerRates.ai_managers,
    ai_managers: facilityProducerRates.servers,
    servers: facilityProducerRates.data_centers,
    data_centers: facilityProducerRates.planets,
    planets: addGameDecimals(
      parameters.planetGenerationPerSecond,
      facilityProducerRates.matrioshka_brains,
    ),
    matrioshka_brains: facilityProducerRates.birch_planets,
    birch_planets: facilityProducerRates.galactic_brains,
  })
  const intermediates = deriveDysonV2Intermediates(
    state,
    allocation,
    rates.assembly_lines,
    panelLifetimeSeconds,
  )
  return Object.freeze({
    allocation,
    effectiveFacilityCounts,
    facilityBaseProduction,
    facilityProducerRates,
    rates,
    panelLifetimeSeconds,
    intermediates,
  })
}

export function deriveDysonV2BotAllocation(
  source: Readonly<CanonicalGameStateV2>,
): Readonly<{ workers: GameDecimal; researchers: GameDecimal }> {
  requireCanonicalBoundary(source)
  return deriveBotAllocationFromValidatedState(source)
}

function deriveBotAllocationFromValidatedState(
  state: Readonly<CanonicalGameStateV2>,
): Readonly<{ workers: GameDecimal; researchers: GameDecimal }> {
  if (state.quantum.unlocks.botMultitasking) {
    return Object.freeze({
      workers: cloneGameDecimal(state.dyson.bots),
      researchers: cloneGameDecimal(state.dyson.bots),
    })
  }
  const wholeBots = floorGameDecimal(state.dyson.bots)
  const distributionNumber = Math.fround(state.dyson.botDistribution)
  const distribution = gameDecimalFromNumber(distributionNumber)
  const workerPercentage = gameDecimalFromNumber(
    Math.fround(Math.fround(1 - distributionNumber) * 100),
  )
  const wholeBotPercent = divideGameDecimals(wholeBots, HUNDRED)
  return Object.freeze({
    workers: ceilGameDecimal(
      multiplyGameDecimals(wholeBotPercent, workerPercentage),
    ),
    researchers: floorGameDecimal(
      multiplyGameDecimals(
        multiplyGameDecimals(wholeBotPercent, distribution),
        HUNDRED,
      ),
    ),
  })
}

/**
 * @internal Scheduler kernel for rates captured at the start of one interval.
 * Callers outside simulation tests should use the active/offline slice APIs so
 * stale or mismatched derived inputs cannot cross a production boundary.
 */
export function applyCapturedDysonV2ProductionKernel(
  source: Readonly<CanonicalGameStateV2>,
  derived: Readonly<DerivedDysonV2Production>,
  seconds: number,
): Readonly<DysonV2ProductionAdvanceResult> {
  validateSliceSeconds(seconds)
  requireCanonicalBoundary(source)
  validateDerivedProduction(derived)
  return applyCapturedDysonV2ProductionFromValidatedState(
    source,
    derived,
    seconds,
  )
}

function applyCapturedDysonV2ProductionFromValidatedState(
  state: Readonly<CanonicalGameStateV2>,
  derived: Readonly<DerivedDysonV2Production>,
  seconds: number,
): Readonly<DysonV2ProductionAdvanceResult> {
  if (seconds === 0) return unchangedProductionResult(state)
  const duration = gameDecimalFromNumber(seconds)
  const generated = mapProductionRates((id) =>
    multiplyGameDecimals(derived.rates[id], duration),
  )
  const mappedFacilities = mapFacilities((id) => {
    const rateKey = FACILITY_OUTPUT_RATE[id]
    const arrival = rateKey === null
      ? cloneGameDecimal(GAME_DECIMAL_ZERO)
      : generated[rateKey]
    const pair = state.dyson.facilities[id]
    const automatic = addGameDecimals(pair[0], arrival)
    return equalGameDecimals(automatic, pair[0])
      ? pair
      : Object.freeze([automatic, pair[1]] as const)
  })
  const facilities = DYSON_V2_FACILITY_IDS.every(
    (id) => mappedFacilities[id] === state.dyson.facilities[id],
  )
    ? state.dyson.facilities
    : mappedFacilities
  const bots = addGameDecimals(state.dyson.bots, generated.bots)
  const allocation = deriveBotAllocationFromValidatedState({
    ...state,
    dyson: { ...state.dyson, bots },
  })
  const candidateDyson = Object.freeze({
    ...state.dyson,
    money: addGameDecimals(state.dyson.money, generated.money),
    science: addGameDecimals(state.dyson.science, generated.science),
    bots,
    workers: allocation.workers,
    researchers: allocation.researchers,
    totalPanelsDecayed: addGameDecimals(
      state.dyson.totalPanelsDecayed,
      generated.panels,
    ),
    facilities,
  })
  const candidate = Object.freeze({
    ...state,
    dyson: candidateDyson,
  }) as CanonicalGameStateV2
  const effective = Object.freeze({
    money: representedCredit(state.dyson.money, candidate.dyson.money),
    science: representedCredit(state.dyson.science, candidate.dyson.science),
    panels: representedCredit(
      state.dyson.totalPanelsDecayed,
      candidate.dyson.totalPanelsDecayed,
    ),
    bots: representedCredit(state.dyson.bots, candidate.dyson.bots),
    assembly_lines: representedCredit(
      state.dyson.facilities.assembly_lines[0],
      candidate.dyson.facilities.assembly_lines[0],
    ),
    ai_managers: representedCredit(
      state.dyson.facilities.ai_managers[0],
      candidate.dyson.facilities.ai_managers[0],
    ),
    servers: representedCredit(
      state.dyson.facilities.servers[0],
      candidate.dyson.facilities.servers[0],
    ),
    data_centers: representedCredit(
      state.dyson.facilities.data_centers[0],
      candidate.dyson.facilities.data_centers[0],
    ),
    planets: representedCredit(
      state.dyson.facilities.planets[0],
      candidate.dyson.facilities.planets[0],
    ),
    matrioshka_brains: representedCredit(
      state.dyson.facilities.matrioshka_brains[0],
      candidate.dyson.facilities.matrioshka_brains[0],
    ),
    birch_planets: representedCredit(
      state.dyson.facilities.birch_planets[0],
      candidate.dyson.facilities.birch_planets[0],
    ),
  })
  const changed =
    Object.values(effective).some(
      (value) => !equalGameDecimals(value, GAME_DECIMAL_ZERO),
    ) ||
    !equalGameDecimals(state.dyson.workers, candidate.dyson.workers) ||
    !equalGameDecimals(
      state.dyson.researchers,
      candidate.dyson.researchers,
    )
  return Object.freeze({
    state: changed ? candidate : state as CanonicalGameStateV2,
    summary: Object.freeze({ generated, effective, changed }),
  })
}

export function advanceActiveDysonV2Production(
  state: Readonly<CanonicalGameStateV2>,
  parameters: Readonly<DysonV2DerivationParameters>,
  seconds: number,
): Readonly<DysonV2ProductionAdvanceResult> {
  return advanceDysonV2Production(state, parameters, seconds)
}

export function advanceOfflineDysonV2Production(
  state: Readonly<CanonicalGameStateV2>,
  parameters: Readonly<DysonV2DerivationParameters>,
  seconds: number,
): Readonly<DysonV2ProductionAdvanceResult> {
  return advanceDysonV2Production(state, parameters, seconds)
}

function advanceDysonV2Production(
  state: Readonly<CanonicalGameStateV2>,
  parameters: Readonly<DysonV2DerivationParameters>,
  seconds: number,
): Readonly<DysonV2ProductionAdvanceResult> {
  validateSliceSeconds(seconds)
  if (seconds === 0) {
    requireCanonicalBoundary(state)
    return unchangedProductionResult(state as CanonicalGameStateV2)
  }
  requireCanonicalBoundary(state)
  const derived = deriveDysonV2ProductionFromValidatedState(
    state,
    parameters,
  )
  return applyCapturedDysonV2ProductionFromValidatedState(
    state,
    derived,
    seconds,
  )
}

function calculateFacilityRate(
  id: CanonicalFacilityId,
  base: GameDecimal,
  count: GameDecimal,
  modifier: GameDecimal,
  effects: readonly DysonV2StatEffect[],
): GameDecimal {
  const modifierEffects: readonly DysonV2StatEffect[] =
    modifierDiffersFromOne(modifier)
      ? [
          {
            id: `${id}.modifier`,
            operation: 'multiply',
            value: modifier,
            order: 10,
          },
        ]
      : []
  return applyEffects(
    base,
    [
      {
        id: `${id}.count`,
        operation: 'multiply',
        value: count,
        order: 0,
      },
      ...modifierEffects,
      ...effects,
    ],
  )
}

function applyEffects(
  base: GameDecimal,
  effects: readonly DysonV2StatEffect[],
): GameDecimal {
  let value = cloneGameDecimal(base)
  for (const { effect } of effects
    .map((effect, index) => ({ effect, index }))
    .sort(
      (left, right) =>
        left.effect.order - right.effect.order || left.index - right.index,
    )) {
    if (!Number.isFinite(effect.order)) {
      throw new TypeError(`Dyson V2 effect '${effect.id}' has an invalid order.`)
    }
    switch (effect.operation) {
      case 'add':
        value = addGameDecimals(value, effect.value)
        break
      case 'subtract':
        if (compareGameDecimals(value, effect.value) < 0) {
          throw new RangeError(
            `Dyson V2 effect '${effect.id}' would make its target negative.`,
          )
        }
        value = subtractGameDecimals(value, effect.value)
        break
      case 'multiply':
        value = multiplyGameDecimals(value, effect.value)
        break
      case 'power':
        value = powGameDecimal(value, effect.exponent)
        break
      case 'override':
        value = cloneGameDecimal(effect.value)
        break
      case 'clamp-min':
        value = maxGameDecimal(value, effect.value)
        break
      case 'clamp-max':
        value = minGameDecimal(value, effect.value)
        break
    }
  }
  return value
}

function deriveDysonV2Intermediates(
  state: Readonly<CanonicalGameStateV2>,
  allocation: Readonly<{ workers: GameDecimal; researchers: GameDecimal }>,
  managerAssemblyLineProduction: GameDecimal,
  panelLifetimeSeconds: GameDecimal,
): Readonly<{
  rudimentarySingularityProduction: GameDecimal
  pocketDimensionsProduction: GameDecimal
}> {
  const owned = (id: string) => state.skills.byId[id]?.owned === true
  let rudimentary = cloneGameDecimal(GAME_DECIMAL_ZERO)
  if (
    owned('rudimentarySingularity') &&
    compareGameDecimals(managerAssemblyLineProduction, GAME_DECIMAL_ONE) > 0
  ) {
    const logarithm = logGameDecimal(managerAssemblyLineProduction, 2)
    const exponent =
      1 + logarithmAsNumber(managerAssemblyLineProduction, 10) / 10
    rudimentary = powGameDecimal(logarithm, exponent)
    if (owned('unsuspiciousAlgorithms')) {
      rudimentary = multiplyGameDecimals(rudimentary, gameDecimalFromNumber(10))
    }
    if (owned('clusterNetworking')) {
      const servers = addGameDecimals(
        state.dyson.facilities.servers[0],
        state.dyson.facilities.servers[1],
      )
      if (compareGameDecimals(servers, GAME_DECIMAL_ONE) > 0) {
        const clusterBonus = multiplyGameDecimals(
          gameDecimalFromNumber(Math.fround(0.05)),
          logGameDecimal(servers, 10),
        )
        rudimentary = multiplyGameDecimals(
          rudimentary,
          addGameDecimals(GAME_DECIMAL_ONE, clusterBonus),
        )
      }
    }
  }

  let pocket =
    owned('pocketDimensions') &&
    compareGameDecimals(allocation.workers, GAME_DECIMAL_ONE) > 0
      ? logGameDecimal(allocation.workers, 10)
      : cloneGameDecimal(GAME_DECIMAL_ZERO)
  if (owned('pocketMultiverse')) {
    const multiplier =
      owned('pocketDimensions') &&
      compareGameDecimals(allocation.researchers, GAME_DECIMAL_ONE) > 0
        ? logGameDecimal(allocation.researchers, 10)
        : cloneGameDecimal(GAME_DECIMAL_ZERO)
    if (compareGameDecimals(multiplier, GAME_DECIMAL_ZERO) > 0) {
      pocket = multiplyGameDecimals(pocket, multiplier)
    }
  } else if (
    owned('pocketProtectors') &&
    owned('pocketDimensions') &&
    compareGameDecimals(allocation.researchers, GAME_DECIMAL_ONE) > 0
  ) {
    pocket = addGameDecimals(
      pocket,
      logGameDecimal(allocation.researchers, 10),
    )
  }
  if (owned('dimensionalCatCables')) {
    pocket = multiplyGameDecimals(pocket, gameDecimalFromNumber(5))
  }
  if (owned('solarBubbles')) {
    pocket = multiplyGameDecimals(
      pocket,
      addGameDecimals(
        GAME_DECIMAL_ONE,
        multiplyGameDecimals(gameDecimalFromNumber(0.01), panelLifetimeSeconds),
      ),
    )
  }
  if (owned('pocketAndroids')) {
    const timer = state.skills.byId.pocketAndroids?.timerSeconds ?? 0
    if (!Number.isFinite(timer) || timer < 0) {
      throw new RangeError(
        'Dyson V2 pocket Android timer must be finite and non-negative.',
      )
    }
    pocket = multiplyGameDecimals(
      pocket,
      gameDecimalFromNumber(timer > 3564 ? 100 : 1 + timer / 36),
    )
  }
  if (owned('quantumComputing')) {
    const quantumBonus = compareGameDecimals(rudimentary, GAME_DECIMAL_ONE) >= 0
      ? logGameDecimal(rudimentary, 2)
      : cloneGameDecimal(GAME_DECIMAL_ZERO)
    pocket = multiplyGameDecimals(
      pocket,
      addGameDecimals(GAME_DECIMAL_ONE, quantumBonus),
    )
  }
  return Object.freeze({
    rudimentarySingularityProduction: rudimentary,
    pocketDimensionsProduction: pocket,
  })
}

function logarithmAsNumber(value: GameDecimal, base: number): number {
  const result =
    (value.exponent + Math.log10(value.mantissa)) / Math.log10(base)
  if (!Number.isFinite(result) || result < 0) {
    throw new RangeError('Dyson V2 logarithmic exponent is outside its bounded range.')
  }
  return result
}

function readFacilityBaseProduction(id: CanonicalFacilityId): GameDecimal {
  const base = getGameAsset('GameData.FacilityDefinition', id)?.data
    .baseProduction
  if (typeof base !== 'number' || !Number.isFinite(base) || base < 0) {
    throw new Error(`Facility '${id}' has no valid baseProduction.`)
  }
  return gameDecimalFromNumber(Math.fround(base))
}

function validateParameters(
  parameters: Readonly<DysonV2DerivationParameters>,
): void {
  for (const [path, value] of [
    ['panelRateMultiplier', parameters.panelRateMultiplier],
    ['panelLifetimeSeconds', parameters.panelLifetimeSeconds],
    ['moneyMultiplier', parameters.moneyMultiplier],
    ['scienceMultiplier', parameters.scienceMultiplier],
    ['planetGenerationPerSecond', parameters.planetGenerationPerSecond],
  ] as const) {
    cloneGameDecimal(value)
    if (path === 'panelLifetimeSeconds' && compareGameDecimals(value, GAME_DECIMAL_ZERO) <= 0) {
      throw new RangeError('Dyson V2 panel lifetime must be positive.')
    }
  }
  for (const id of DYSON_V2_FACILITY_IDS) {
    cloneGameDecimal(parameters.facilityModifiers[id])
  }
}

function mapFacilities<Value>(
  create: (id: CanonicalFacilityId) => Value,
): Readonly<Record<CanonicalFacilityId, Value>> {
  return Object.freeze(
    Object.fromEntries(
      DYSON_V2_FACILITY_IDS.map((id) => [id, create(id)]),
    ) as Record<CanonicalFacilityId, Value>,
  )
}

function mapProductionRates(
  create: (id: keyof DysonV2ProductionRates) => GameDecimal,
): Readonly<DysonV2ProductionRates> {
  const ids: readonly (keyof DysonV2ProductionRates)[] = [
    'money',
    'science',
    'panels',
    'bots',
    'assembly_lines',
    'ai_managers',
    'servers',
    'data_centers',
    'planets',
    'matrioshka_brains',
    'birch_planets',
  ]
  return Object.freeze(
    Object.fromEntries(ids.map((id) => [id, create(id)])) as unknown as
      DysonV2ProductionRates,
  )
}

function modifierDiffersFromOne(modifier: GameDecimal): boolean {
  const difference = compareGameDecimals(modifier, GAME_DECIMAL_ONE) >= 0
    ? subtractGameDecimals(modifier, GAME_DECIMAL_ONE)
    : subtractGameDecimals(GAME_DECIMAL_ONE, modifier)
  return compareGameDecimals(difference, LEGACY_MULTIPLIER_EPSILON) > 0
}

function representedCredit(before: GameDecimal, after: GameDecimal): GameDecimal {
  return equalGameDecimals(before, after)
    ? cloneGameDecimal(GAME_DECIMAL_ZERO)
    : subtractGameDecimals(after, before)
}

function validateSliceSeconds(seconds: number): void {
  if (!Number.isFinite(seconds) || seconds < 0) {
    throw new RangeError(
      'Dyson V2 production seconds must be finite and non-negative.',
    )
  }
}

function requireCanonicalBoundary(
  state: Readonly<CanonicalGameStateV2>,
): void {
  if (
    state.modelVersion !== 2 ||
    !Object.isFrozen(state) ||
    !Object.isFrozen(state.dyson) ||
    !Object.isFrozen(state.dyson.facilities) ||
    !Object.isFrozen(state.quantum) ||
    !Object.isFrozen(state.skills)
  ) {
    throw new TypeError(
      'Dyson V2 production requires a validated frozen canonical boundary.',
    )
  }
}

function validateDerivedProduction(
  derived: Readonly<DerivedDysonV2Production>,
): void {
  if (
    !Object.isFrozen(derived) ||
    !Object.isFrozen(derived.rates) ||
    !Object.isFrozen(derived.allocation) ||
    !Object.values(derived.rates).every(isGameDecimal) ||
    !isGameDecimal(derived.allocation.workers) ||
    !isGameDecimal(derived.allocation.researchers)
  ) {
    throw new TypeError(
      'Dyson V2 captured production must be a frozen derived result.',
    )
  }
}

function unchangedProductionResult(
  state: CanonicalGameStateV2,
): Readonly<DysonV2ProductionAdvanceResult> {
  const generated = mapProductionRates(() =>
    cloneGameDecimal(GAME_DECIMAL_ZERO),
  )
  return Object.freeze({
    state,
    summary: Object.freeze({
      generated,
      effective: generated,
      changed: false,
    }),
  })
}
