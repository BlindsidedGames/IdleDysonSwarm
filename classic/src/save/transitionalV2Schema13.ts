import { requireRecord, type SaveRecord } from './graph'
import {
  V2_SCHEMA13_BUY_MODES,
  V2_SCHEMA13_CAPPED_RESEARCH_IDS,
  V2_SCHEMA13_DREAM_EDUCATION_IDS,
  V2_SCHEMA13_DREAM_TIMER_IDS,
  V2_SCHEMA13_DREAM_UPGRADE_FLAGS,
  V2_SCHEMA13_FACILITY_IDS,
  V2_SCHEMA13_FRAGMENT_SKILL_IDS,
  V2_SCHEMA13_RESEARCH_IDS,
  V2_SCHEMA13_RETAINED_FACILITY_IDS,
  V2_SCHEMA13_SKILL_IDS,
  V2_SCHEMA13_SKILL_PRESET_COLOR_IDS,
} from './transitionalV2Schema13Manifest'

const MAXIMUM_DEPTH = 128
const MAXIMUM_CONTAINERS = 100_000
const MAXIMUM_ENTRIES = 250_000
const MAXIMUM_STRING_CODE_UNITS = 65_536
const MAXIMUM_DECIMAL_CHARACTERS = 64
const MAXIMUM_BIGINT_DIGITS = 4_096
const DECIMAL_EXPONENT_LIMIT = 9_000_000_000_000_000
const STORED_TIME_MAXIMUM_SECONDS = 42_000_000

type SchemaNode =
  | Readonly<{ kind: 'decimal'; integer?: boolean }>
  | Readonly<{ kind: 'bigint' }>
  | Readonly<{
      kind: 'number'
      minimum?: number
      exclusiveMinimum?: number
      maximum?: number
      safeInteger?: boolean
    }>
  | Readonly<{ kind: 'boolean' }>
  | Readonly<{ kind: 'string'; nullable?: boolean }>
  | Readonly<{ kind: 'literal'; value: string | number }>
  | Readonly<{ kind: 'enum'; values: readonly (string | number)[] }>
  | Readonly<{ kind: 'array'; entry: SchemaNode; length?: number }>
  | Readonly<{ kind: 'tuple'; entries: readonly SchemaNode[] }>
  | Readonly<{
      kind: 'object'
      fields: Readonly<Record<string, SchemaNode>>
    }>

interface StructuralBudget {
  containers: number
  entries: number
}

export interface Schema13IntegerDecimal {
  readonly coefficientDigits: string
  readonly digitLength: number
}

const decimal = Object.freeze({ kind: 'decimal' } as const)
const integerDecimal = Object.freeze({
  kind: 'decimal',
  integer: true,
} as const)
const bigint = Object.freeze({ kind: 'bigint' } as const)
const number = Object.freeze({ kind: 'number' } as const)
const boolean = Object.freeze({ kind: 'boolean' } as const)
const string = Object.freeze({ kind: 'string' } as const)
const nullableString = Object.freeze({
  kind: 'string',
  nullable: true,
} as const)

function object(fields: Readonly<Record<string, SchemaNode>>): SchemaNode {
  return Object.freeze({ kind: 'object', fields: Object.freeze(fields) })
}

function record(keys: readonly string[], entry: SchemaNode): SchemaNode {
  return object(Object.fromEntries(keys.map((key) => [key, entry])))
}

function array(entry: SchemaNode, length?: number): SchemaNode {
  return Object.freeze({ kind: 'array', entry, length })
}

function tuple(entries: readonly SchemaNode[]): SchemaNode {
  return Object.freeze({ kind: 'tuple', entries: Object.freeze(entries) })
}

function enumeration(values: readonly (string | number)[]): SchemaNode {
  return Object.freeze({ kind: 'enum', values: Object.freeze(values) })
}

function boundedNumber(
  constraints: Omit<Extract<SchemaNode, { kind: 'number' }>, 'kind'>,
): SchemaNode {
  return Object.freeze({ kind: 'number', ...constraints })
}

const ownedPair = tuple([decimal, integerDecimal])
const skillRuntime = object({
  owned: boolean,
  level: bigint,
  timerSeconds: number,
  secondaryTimerSeconds: number,
})
const skillPreset = object({
  name: string,
  skillIds: array(string),
  botDistribution: number,
  colorId: enumeration(V2_SCHEMA13_SKILL_PRESET_COLOR_IDS),
})
const cappedResearchIds = new Set<string>(
  V2_SCHEMA13_CAPPED_RESEARCH_IDS,
)
const researchLevels = object(Object.fromEntries(
  V2_SCHEMA13_RESEARCH_IDS.map((id) => [
    id,
    cappedResearchIds.has(id) ? bigint : integerDecimal,
  ]),
))
const dreamEducation = object({
  active: boolean,
  complete: boolean,
  progress: decimal,
  researchTime: number,
  cost: integerDecimal,
})
const statisticsTotals = object({
  ordinaryInfinityCount: bigint,
  breakInfinityCount: bigint,
  ordinaryInfinityPoints: integerDecimal,
  breakInfinityPoints: integerDecimal,
  botCapInfinityPoints: integerDecimal,
  botCapOverflowRewards: integerDecimal,
  meteorDreamResets: bigint,
  aiDreamResets: bigint,
  globalWarmingDreamResets: bigint,
  blackHoleDreamResets: bigint,
  strangeMatter: integerDecimal,
  realityWorkers: integerDecimal,
  automaticInfluence: integerDecimal,
  manualInfluence: integerDecimal,
  realityCapacityStallSeconds: number,
  simulatedSeconds: number,
})
const statisticsWindow = object({
  sequence: bigint,
  simulatedSeconds: number,
  infinityCount: bigint,
  infinityPoints: integerDecimal,
  dreamResetCount: bigint,
  strangeMatter: integerDecimal,
  realityWorkers: integerDecimal,
})
const runtime = object({
  dysonEvaluationSnapshot: object({
    panelsPerSecond: decimal,
    panelLifetimeSeconds: decimal,
    scienceMultiplier: decimal,
    rudimentarySingularityProduction: decimal,
    pocketDimensionsProduction: decimal,
    scientificPlanetsProduction: decimal,
    managerAssemblyLineProduction: decimal,
  }),
  dysonTuningProfile: enumeration(['web-authored-v1']),
})

const state = object({
  meta: object({
    createdAtLegacyText: nullableString,
    tutorialComplete: boolean,
    firstInfinityComplete: boolean,
    navigationVisibility: object({
      story: boolean,
      wiki: boolean,
      statistics: boolean,
    }),
  }),
  dyson: object({
    money: decimal,
    science: decimal,
    bots: decimal,
    workers: decimal,
    researchers: decimal,
    facilities: record(V2_SCHEMA13_FACILITY_IDS, ownedPair),
    manualCreationIntervalSeconds: boundedNumber({ exclusiveMinimum: 0 }),
    totalPanelsDecayed: decimal,
    goalStage: bigint,
    botDistribution: number,
    automation: object({
      buyMode: enumeration(V2_SCHEMA13_BUY_MODES),
      roundedBulkBuy: boolean,
      enabledFacilities: record(V2_SCHEMA13_FACILITY_IDS, boolean),
    }),
  }),
  infinity: object({
    availablePoints: integerDecimal,
    allocatedPoints: integerDecimal,
    breakTarget: integerDecimal,
    inProgress: boolean,
    botCapTransitionPending: boolean,
    botCapRewardsGranted: boolean,
    lastCycleDurationSeconds: number,
    lastPointsGained: integerDecimal,
    storedTimeUsedThisCycleSeconds: number,
    storedTimeUsedPreviousCycleSeconds: number,
    secretsOfTheUniverse: bigint,
    permanentSkillPoints: bigint,
    retainedFacilities: record(V2_SCHEMA13_RETAINED_FACILITY_IDS, boolean),
    automationUnlocked: object({ research: boolean, bots: boolean }),
  }),
  skills: object({
    points: bigint,
    fragments: bigint,
    byId: record(V2_SCHEMA13_SKILL_IDS, skillRuntime),
    activeAutoAssignment: array(string),
    selectedPreset: enumeration([1, 2, 3, 4, 5]),
    presets: array(skillPreset, 5),
    autoAssignNonRefundable: boolean,
    tabPresetAutomation: object({
      bots: enumeration([0, 1, 2, 3, 4, 5]),
      research: enumeration([0, 1, 2, 3, 4, 5]),
    }),
  }),
  research: object({
    levelsById: researchLevels,
    progressById: record(V2_SCHEMA13_RESEARCH_IDS, decimal),
    automation: object({
      buyMode: enumeration(V2_SCHEMA13_BUY_MODES),
      roundedBulkBuy: boolean,
      enabledById: record(V2_SCHEMA13_RESEARCH_IDS, boolean),
    }),
  }),
  reality: object({
    universeDesignationCount: integerDecimal,
    workersReady: bigint,
    workerGenerationProgress: number,
    influence: integerDecimal,
    autoGather: boolean,
  }),
  quantum: object({
    availableShards: integerDecimal,
    lifetimeEarnedShards: integerDecimal,
    divisionsPurchased: bigint,
    permanentSecrets: bigint,
    influenceSpeedBonus: integerDecimal,
    cashBonusLevels: integerDecimal,
    scienceBonusLevels: integerDecimal,
    unlocks: object({
      botMultitasking: boolean,
      doubleInfinityPoints: boolean,
      breakTheLoop: boolean,
      quantumEntanglement: boolean,
      automation: boolean,
      fragments: boolean,
      purity: boolean,
      terra: boolean,
      power: boolean,
      paragade: boolean,
      stellar: boolean,
      matrioshkaBrains: boolean,
      birchPlanets: boolean,
      galacticBrains: boolean,
    }),
  }),
  avocado: object({
    unlocked: boolean,
    infinityPoints: decimal,
    influence: decimal,
    strangeMatter: decimal,
    overflowMultiplier: decimal,
  }),
  timeline: object({
    eventClockInitialized: boolean,
    automationTimeUntilNextEvent: number,
    dysonAutomationTargetIndex: number,
    researchAutomationTargetIndex: number,
    infinityBoundaryRemaining: number,
    infinityCycleSeconds: number,
    infinityCycleStartingPoints: integerDecimal,
    infinityHasPostResetStart: boolean,
    storedTimeAvailableSeconds: number,
    storedTimeCapacitySeconds: number,
    lastSuspendedAtLegacyText: nullableString,
    doubleTime: object({
      unlocked: boolean,
      enabled: boolean,
      bankSeconds: number,
      rate: number,
    }),
  }),
  secretProgress: object({ completed: boolean, step: number }),
  dream: object({
    resources: object({
      hunters: integerDecimal,
      gatherers: integerDecimal,
      community: integerDecimal,
      housing: integerDecimal,
      villages: integerDecimal,
      workers: integerDecimal,
      cities: integerDecimal,
      factories: integerDecimal,
      bots: integerDecimal,
      rockets: integerDecimal,
      energy: decimal,
      spaceFactories: integerDecimal,
      dysonPanels: integerDecimal,
      railgunCharge: decimal,
      solarPanels: integerDecimal,
      fusion: integerDecimal,
      swarmPanels: integerDecimal,
    }),
    parameters: object({
      hunterCost: integerDecimal,
      gathererCost: integerDecimal,
      communityBoostCost: integerDecimal,
      communityBoostIsFree: boolean,
      communityBoostClock: number,
      communityBoostDuration: number,
      factoriesBoostCost: integerDecimal,
      factoriesBoostClock: number,
      factoriesBoostDuration: number,
      rocketsPerSpaceFactory: integerDecimal,
      railgunMaxCharge: decimal,
      solarCost: integerDecimal,
      solarPanelGeneration: decimal,
      fusionCost: integerDecimal,
      fusionGeneration: decimal,
      swarmPanelGeneration: decimal,
    }),
    education: record(V2_SCHEMA13_DREAM_EDUCATION_IDS, dreamEducation),
    timers: record(V2_SCHEMA13_DREAM_TIMER_IDS, number),
    railgun: object({
      firing: boolean,
      fireProgress: number,
      pendingBaseSeconds: number,
      pendingDreamSeconds: number,
      shotsRemaining: number,
      activeRailguns: number,
      reservedPanels: integerDecimal,
      highestStoredPanels: integerDecimal,
      lastRoundsFired: number,
      lastPanelsLaunched: integerDecimal,
    }),
    resetCount: bigint,
    strangeMatter: integerDecimal,
    disasterStage: bigint,
    upgrades: record(V2_SCHEMA13_DREAM_UPGRADE_FLAGS, boolean),
    huntersPerPurchase: integerDecimal,
    gatherersPerPurchase: integerDecimal,
  }),
  statistics: object({
    trackedSinceUpdate: boolean,
    trackingStartedMarker: string,
    trackedSimulatedSeconds: number,
    lifetime: statisticsTotals,
    currentQuantumRun: statisticsTotals,
    recentProcessedSegment: statisticsTotals,
    lastCompletedCycle: object({
      valid: boolean,
      breakInfinity: boolean,
      durationSeconds: number,
      reward: integerDecimal,
      dreamCause: nullableString,
    }),
    minuteWindows: array(statisticsWindow, 60),
    halfHourWindows: array(statisticsWindow, 48),
    dailyWindows: array(statisticsWindow, 30),
  }),
})

const envelope = object({
  schemaVersion: Object.freeze({ kind: 'literal', value: 13 }),
  modelVersion: Object.freeze({ kind: 'literal', value: 2 }),
  savedAtUtc: string,
  state,
  runtime,
})

/** Validates an already transport-decoded envelope exactly as shipped schema 13. */
export function validateDecodedSchema13Envelope(input: unknown): SaveRecord {
  walkSchema(input, envelope, '$', { containers: 0, entries: 0 }, 0)
  const dto = requireRecord(input, 'schema 13 portable save')
  const savedAtUtc = dto.savedAtUtc as string
  const milliseconds = Date.parse(savedAtUtc)
  if (
    !Number.isFinite(milliseconds) ||
    new Date(milliseconds).toISOString() !== savedAtUtc
  ) {
    throw new RangeError(
      'Schema 13 savedAtUtc must be a canonical UTC timestamp.',
    )
  }
  validateHistoricalStateInvariants(
    requireRecord(dto.state, 'schema 13 state'),
  )
  return dto
}

function walkSchema(
  value: unknown,
  node: SchemaNode,
  path: string,
  budget: StructuralBudget,
  depth: number,
): void {
  if (depth > MAXIMUM_DEPTH) {
    throw new Error('Schema 13 exceeds the maximum decode depth.')
  }
  switch (node.kind) {
    case 'decimal':
      parseSchema13CanonicalDecimal(value, path, node.integer === true)
      return
    case 'bigint':
      parseSchema13CanonicalBigInt(value, path)
      return
    case 'number':
      requireSchema13Number(value, path, node)
      return
    case 'boolean':
      if (typeof value !== 'boolean') {
        throw new TypeError(`${path} must be a boolean.`)
      }
      return
    case 'string':
      if (value === null && node.nullable === true) return
      if (typeof value !== 'string') {
        throw new TypeError(`${path} must be a string.`)
      }
      if (value.length > MAXIMUM_STRING_CODE_UNITS) {
        throw new RangeError(`${path} exceeds the string length limit.`)
      }
      return
    case 'literal':
      if (value !== node.value) {
        throw new TypeError(`${path} does not match its schema literal.`)
      }
      return
    case 'enum':
      if (
        (typeof value === 'number' && Object.is(value, -0)) ||
        !node.values.includes(value as never)
      ) {
        throw new TypeError(`${path} contains an unsupported enum value.`)
      }
      return
    case 'tuple': {
      if (!Array.isArray(value) || value.length !== node.entries.length) {
        throw new TypeError(`${path} must contain exactly ${node.entries.length} entries.`)
      }
      consumeBudget(value.length, budget)
      node.entries.forEach((entry, index) =>
        walkSchema(value[index], entry, `${path}.${index}`, budget, depth + 1),
      )
      return
    }
    case 'array': {
      if (!Array.isArray(value)) {
        throw new TypeError(`${path} must be an array.`)
      }
      if (node.length !== undefined && value.length !== node.length) {
        throw new TypeError(`${path} must contain exactly ${node.length} entries.`)
      }
      consumeBudget(value.length, budget)
      value.forEach((entry, index) =>
        walkSchema(entry, node.entry, `${path}.${index}`, budget, depth + 1),
      )
      return
    }
    case 'object': {
      const source = requireRecord(value, path)
      const actual = Object.keys(source)
      const expected = Object.keys(node.fields)
      if (
        actual.length !== expected.length ||
        actual.some((key) => !Object.hasOwn(node.fields, key))
      ) {
        const unexpected = actual.find((key) => !Object.hasOwn(node.fields, key))
        if (unexpected !== undefined) {
          throw new TypeError(`${path}.${unexpected} is an undeclared field.`)
        }
        const missing = expected.find((key) => !Object.hasOwn(source, key))
        if (missing !== undefined) {
          throw new TypeError(`${path}.${missing} is a missing declared field.`)
        }
        throw new TypeError(`${path} must contain exactly its declared fields.`)
      }
      consumeBudget(actual.length, budget)
      for (const [key, child] of Object.entries(node.fields)) {
        walkSchema(source[key], child, `${path}.${key}`, budget, depth + 1)
      }
      return
    }
  }
}

function consumeBudget(entries: number, budget: StructuralBudget): void {
  budget.containers += 1
  budget.entries += entries
  if (budget.containers > MAXIMUM_CONTAINERS) {
    throw new Error('Schema 13 exceeds the maximum container count.')
  }
  if (budget.entries > MAXIMUM_ENTRIES) {
    throw new Error('Schema 13 exceeds the maximum entry count.')
  }
}

function requireSchema13Number(
  value: unknown,
  path: string,
  node: Extract<SchemaNode, { kind: 'number' }>,
): number {
  if (
    typeof value !== 'number' ||
    !Number.isFinite(value) ||
    value < 0 ||
    Object.is(value, -0)
  ) {
    throw new TypeError(`${path} must be a finite non-negative number.`)
  }
  if (node.safeInteger === true && !Number.isSafeInteger(value)) {
    throw new TypeError(`${path} must be a safe integer.`)
  }
  if (node.minimum !== undefined && value < node.minimum) {
    throw new RangeError(`${path} is below its supported minimum.`)
  }
  if (node.exclusiveMinimum !== undefined && value <= node.exclusiveMinimum) {
    throw new RangeError(`${path} must be greater than its minimum.`)
  }
  if (node.maximum !== undefined && value > node.maximum) {
    throw new RangeError(`${path} exceeds its supported maximum.`)
  }
  return value
}

export function parseSchema13CanonicalBigInt(
  value: unknown,
  path: string,
): bigint {
  if (
    typeof value !== 'string' ||
    value.length > MAXIMUM_BIGINT_DIGITS ||
    !/^(?:0|[1-9]\d*)$/u.test(value)
  ) {
    throw new RangeError(`${path} has a noncanonical bigint string.`)
  }
  return BigInt(value)
}

export function parseSchema13CanonicalDecimal(
  value: unknown,
  path: string,
  integer: boolean,
): Schema13IntegerDecimal | null {
  if (typeof value !== 'string' || value.length > MAXIMUM_DECIMAL_CHARACTERS) {
    throw new RangeError(`${path} exceeds the Decimal string limit.`)
  }
  if (value === '0') {
    return integer
      ? Object.freeze({ coefficientDigits: '0', digitLength: 1 })
      : null
  }
  const match = /^([1-9](?:\.[0-9]+)?)e(0|-[1-9][0-9]*|[1-9][0-9]*)$/u
    .exec(value)
  if (match === null) {
    throw new RangeError(`${path} has invalid canonical Decimal syntax.`)
  }
  const mantissaText = match[1]!
  const exponentText = match[2]!
  const mantissa = Number(mantissaText)
  const exponent = Number(exponentText)
  if (
    mantissa.toString() !== mantissaText ||
    !Number.isSafeInteger(exponent) ||
    Math.abs(exponent) >= DECIMAL_EXPONENT_LIMIT ||
    mantissa < 1 ||
    mantissa >= 10
  ) {
    throw new RangeError(`${path} has noncanonical Decimal parts.`)
  }
  if (!integer) return null
  const digits = mantissaText.replace('.', '')
  const decimalPosition = exponent + 1
  if (
    decimalPosition <= 0 ||
    (
      decimalPosition < digits.length &&
      !/^0*$/u.test(digits.slice(decimalPosition))
    )
  ) {
    throw new RangeError(`${path} must be an integer-valued Decimal.`)
  }
  return Object.freeze({
    coefficientDigits: decimalPosition < digits.length
      ? digits.slice(0, decimalPosition)
      : digits,
    digitLength: decimalPosition,
  })
}

export function compareSchema13IntegerDecimals(
  left: Schema13IntegerDecimal,
  right: Schema13IntegerDecimal,
): -1 | 0 | 1 {
  if (left.digitLength !== right.digitLength) {
    return left.digitLength < right.digitLength ? -1 : 1
  }
  const width = Math.max(
    left.coefficientDigits.length,
    right.coefficientDigits.length,
  )
  const leftDigits = left.coefficientDigits.padEnd(width, '0')
  const rightDigits = right.coefficientDigits.padEnd(width, '0')
  return leftDigits === rightDigits ? 0 : leftDigits < rightDigits ? -1 : 1
}

export function schema13IntegerDecimalToBigIntAtMost(
  encoded: unknown,
  maximum: bigint,
  path: string,
  overflow: 'saturate' | 'reject',
): bigint {
  const parsed = parseSchema13CanonicalDecimal(encoded, path, true)!
  const maximumText = maximum.toString()
  const exceeds = parsed.digitLength > maximumText.length ||
    (
      parsed.digitLength === maximumText.length &&
      parsed.coefficientDigits
        .padEnd(parsed.digitLength, '0') > maximumText
    )
  if (exceeds) {
    if (overflow === 'saturate') return maximum
    throw new RangeError(`${path} exceeds its current exact integer range.`)
  }
  return BigInt(
    parsed.coefficientDigits.padEnd(parsed.digitLength, '0'),
  )
}

/**
 * Narrows one historically ordinary Decimal into a current bigint carrier by
 * rounding to the nearest integer, with exact halves rounded upward. The
 * exponent is compared before any zero expansion so valid huge values remain
 * bounded and saturate without allocating exponent-sized strings.
 */
export function schema13DecimalToRoundedBigIntAtMost(
  encoded: unknown,
  maximum: bigint,
  path: string,
): bigint {
  parseSchema13CanonicalDecimal(encoded, path, false)
  if (encoded === '0') return 0n
  const match = /^([1-9](?:\.[0-9]+)?)e(0|-[1-9][0-9]*|[1-9][0-9]*)$/u
    .exec(String(encoded))!
  const mantissaText = match[1]!
  const exponent = Number(match[2]!)
  const digits = mantissaText.replace('.', '')
  const decimalPosition = exponent + 1
  if (decimalPosition <= 0) {
    const rounded = exponent === -1 && Number(mantissaText) >= 5 ? 1n : 0n
    return rounded > maximum ? maximum : rounded
  }
  if (decimalPosition < digits.length) {
    const integer = BigInt(digits.slice(0, decimalPosition))
    const rounded = integer + (digits[decimalPosition]! >= '5' ? 1n : 0n)
    return rounded > maximum ? maximum : rounded
  }
  return schema13IntegerDecimalToBigIntAtMost(
    encoded,
    maximum,
    path,
    'saturate',
  )
}

function validateHistoricalStateInvariants(source: SaveRecord): void {
  const dyson = requireRecord(source.dyson, '$.dyson')
  const infinity = requireRecord(source.infinity, '$.infinity')
  const skills = requireRecord(source.skills, '$.skills')
  const research = requireRecord(source.research, '$.research')
  const reality = requireRecord(source.reality, '$.reality')
  const quantum = requireRecord(source.quantum, '$.quantum')
  const timeline = requireRecord(source.timeline, '$.timeline')
  const doubleTime = requireRecord(timeline.doubleTime, '$.timeline.doubleTime')
  const secretProgress = requireRecord(source.secretProgress, '$.secretProgress')
  const dream = requireRecord(source.dream, '$.dream')
  const railgun = requireRecord(dream.railgun, '$.dream.railgun')

  requireUnitInterval(dyson.botDistribution, '$.dyson.botDistribution')
  const presets = skills.presets as readonly SaveRecord[]
  for (const [index, preset] of presets.entries()) {
    requireUnitInterval(
      preset.botDistribution,
      `$.skills.presets.${index}.botDistribution`,
    )
    requireUniqueSkillIds(
      preset.skillIds,
      `$.skills.presets.${index}.skillIds`,
    )
  }
  requireUniqueSkillIds(
    skills.activeAutoAssignment,
    '$.skills.activeAutoAssignment',
  )

  requireSafeIntegerRange(
    timeline.dysonAutomationTargetIndex,
    0,
    7,
    '$.timeline.dysonAutomationTargetIndex',
  )
  requireSafeIntegerRange(
    timeline.researchAutomationTargetIndex,
    0,
    V2_SCHEMA13_RESEARCH_IDS.length - 1,
    '$.timeline.researchAutomationTargetIndex',
  )
  requireSafeIntegerRange(
    doubleTime.rate,
    0,
    10,
    '$.timeline.doubleTime.rate',
  )
  const capacity = timeline.storedTimeCapacitySeconds as number
  const available = timeline.storedTimeAvailableSeconds as number
  if (capacity <= 0 || capacity > STORED_TIME_MAXIMUM_SECONDS) {
    throw new RangeError('$.timeline.storedTimeCapacitySeconds is outside its authored range.')
  }
  if (available > capacity) {
    throw new RangeError('$.timeline.storedTimeAvailableSeconds exceeds capacity.')
  }
  if ((doubleTime.bankSeconds as number) > STORED_TIME_MAXIMUM_SECONDS) {
    throw new RangeError('$.timeline.doubleTime.bankSeconds exceeds its authored maximum.')
  }
  if ((reality.workerGenerationProgress as number) >= 1) {
    throw new RangeError('$.reality.workerGenerationProgress must be below one.')
  }
  requireSafeIntegerRange(
    railgun.shotsRemaining,
    0,
    10,
    '$.dream.railgun.shotsRemaining',
  )
  requireSafeIntegerRange(
    railgun.activeRailguns,
    0,
    Number.MAX_SAFE_INTEGER,
    '$.dream.railgun.activeRailguns',
  )
  requireSafeIntegerRange(
    railgun.lastRoundsFired,
    0,
    110,
    '$.dream.railgun.lastRoundsFired',
  )
  if ((railgun.pendingDreamSeconds as number) < (railgun.pendingBaseSeconds as number)) {
    throw new RangeError('$.dream.railgun.pendingDreamSeconds is below pending base seconds.')
  }
  requireSafeIntegerRange(
    secretProgress.step,
    0,
    7,
    '$.secretProgress.step',
  )

  requireBigIntMaximum(dyson.goalStage, 10n, '$.dyson.goalStage')
  requireBigIntMaximum(
    infinity.secretsOfTheUniverse,
    27n,
    '$.infinity.secretsOfTheUniverse',
  )
  requireBigIntMaximum(
    infinity.permanentSkillPoints,
    10n,
    '$.infinity.permanentSkillPoints',
  )
  requireBigIntMaximum(
    quantum.divisionsPurchased,
    19n,
    '$.quantum.divisionsPurchased',
  )
  requireBigIntMaximum(
    quantum.permanentSecrets,
    27n,
    '$.quantum.permanentSecrets',
  )
  requireBigIntMaximum(
    reality.workersReady,
    128n,
    '$.reality.workersReady',
  )
  const disasterStage = parseSchema13CanonicalBigInt(
    dream.disasterStage,
    '$.dream.disasterStage',
  )
  if (![0n, 1n, 2n, 3n, 42n].includes(disasterStage)) {
    throw new RangeError('$.dream.disasterStage is not an authored stage.')
  }

  const unlocks = requireRecord(quantum.unlocks, '$.quantum.unlocks')
  const breakTarget = parseSchema13CanonicalDecimal(
    infinity.breakTarget,
    '$.infinity.breakTarget',
    true,
  )!
  if (
    unlocks.breakTheLoop === true &&
    breakTarget.coefficientDigits === '0'
  ) {
    throw new RangeError('Infinity Break target must be positive while Break The Loop is owned.')
  }

  const skillStates = requireRecord(skills.byId, '$.skills.byId')
  const expectedFragments = BigInt(
    V2_SCHEMA13_FRAGMENT_SKILL_IDS.filter((id) =>
      requireRecord(skillStates[id], `$.skills.byId.${id}`).owned === true,
    ).length,
  )
  if (
    parseSchema13CanonicalBigInt(skills.fragments, '$.skills.fragments') !==
      expectedFragments
  ) {
    throw new RangeError('$.skills.fragments does not match owned fragment Skills.')
  }

  const levels = requireRecord(research.levelsById, '$.research.levelsById')
  for (const id of V2_SCHEMA13_CAPPED_RESEARCH_IDS) {
    requireBigIntMaximum(
      levels[id],
      1n,
      `$.research.levelsById.${id}`,
    )
  }
  const lastCycle = requireRecord(
    requireRecord(source.statistics, '$.statistics').lastCompletedCycle,
    '$.statistics.lastCompletedCycle',
  )
  if (
    lastCycle.dreamCause !== null &&
    ![
      'Meteor',
      'ArtificialIntelligence',
      'GlobalWarming',
      'BlackHole',
    ].includes(lastCycle.dreamCause as string)
  ) {
    throw new TypeError('$.statistics.lastCompletedCycle.dreamCause is unsupported.')
  }
}

function requireUniqueSkillIds(value: unknown, path: string): void {
  const ids = value as readonly string[]
  const allowed = new Set<string>(V2_SCHEMA13_SKILL_IDS)
  if (
    new Set(ids).size !== ids.length ||
    ids.some((id) => !allowed.has(id))
  ) {
    throw new TypeError(`${path} must contain unique schema-13 Skill IDs only.`)
  }
}

function requireUnitInterval(value: unknown, path: string): void {
  if (typeof value !== 'number' || value < 0 || value > 1) {
    throw new RangeError(`${path} must be in the unit interval.`)
  }
}

function requireSafeIntegerRange(
  value: unknown,
  minimum: number,
  maximum: number,
  path: string,
): void {
  if (
    typeof value !== 'number' ||
    !Number.isSafeInteger(value) ||
    value < minimum ||
    value > maximum
  ) {
    throw new RangeError(`${path} is outside its authored integer range.`)
  }
}

function requireBigIntMaximum(
  value: unknown,
  maximum: bigint,
  path: string,
): void {
  if (parseSchema13CanonicalBigInt(value, path) > maximum) {
    throw new RangeError(`${path} exceeds its authored maximum.`)
  }
}
