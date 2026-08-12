import { describe, expect, it } from 'vitest'

import { createDeterministicUnityFirstRunPreparedSave } from '../application/firstRun/unityFirstRunSave'
import {
  gameDecimalFromBigInt,
  gameDecimalFromNumber,
  isGameDecimal,
} from '../math/gameDecimal'
import { cloneCanonicalGameStateV2 } from './cloneV2'
import { hydrateGameState } from './mapping'
import {
  canonicalFragmentSkillKeySet,
  canonicalNumericFieldClassifications,
  canonicalResearchKeySet,
  canonicalResearchLevelPolicies,
  plannedV2OnlyNumericClassifications,
} from './numericFieldManifest'
import { STORED_TIME_MAXIMUM_SECONDS } from '../simulation/timeResources'
import {
  REALITY_WORKERS_READY_MAXIMUM_V2,
  type CanonicalGameStateV2,
} from './typesV2'
import { validateCanonicalGameStateV2 } from './validateV2'

const entries = [
  ...canonicalNumericFieldClassifications,
  ...plannedV2OnlyNumericClassifications,
].filter((entry) => entry.intendedV2Path !== null)

function matches(pattern: string, path: string): boolean {
  const expression = pattern
    .replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
    .replaceAll('\\*', '.+')
  return new RegExp(`^${expression}$`, 'u').test(path)
}

function semanticClass(path: string) {
  if (path.startsWith('$.research.levelsById.')) {
    const id = path.slice('$.research.levelsById.'.length)
    return canonicalResearchLevelPolicies.find((policy) => policy.key === id)!.semanticClass
  }
  const entry = entries.find((candidate) => matches(candidate.intendedV2Path!, path))
  if (entry === undefined) throw new Error(`Unclassified V2 fixture path ${path}`)
  return entry.semanticClass
}

function convertNumericGraph(value: unknown, path: string): unknown {
  if (typeof value === 'number' || typeof value === 'bigint') {
    const classification = semanticClass(path)
    if (classification === 'bounded-number') return Number(value)
    if (classification === 'exact-bigint') return BigInt(value)
    return typeof value === 'bigint'
      ? gameDecimalFromBigInt(value)
      : gameDecimalFromNumber(value)
  }
  if (Array.isArray(value)) {
    return value.map((entry, index) => convertNumericGraph(entry, `${path}.${index}`))
  }
  if (value === null || typeof value !== 'object') return value
  return Object.fromEntries(
    Object.entries(value).map(([key, entry]) => [key, convertNumericGraph(entry, `${path}.${key}`)]),
  )
}

function validStateSource(): CanonicalGameStateV2 {
  const v1 = structuredClone(
    hydrateGameState(createDeterministicUnityFirstRunPreparedSave()).state,
  ) as unknown as Record<string, any>
  v1.modelVersion = 2
  v1.skills.selectedPreset = 1
  v1.infinity.availablePoints = v1.infinity.points - v1.infinity.spentPoints
  v1.infinity.allocatedPoints = v1.infinity.spentPoints
  delete v1.infinity.points
  delete v1.infinity.spentPoints
  v1.quantum.availableShards = v1.quantum.pointsEarned - v1.quantum.pointsSpent
  v1.quantum.lifetimeEarnedShards = v1.quantum.pointsEarned
  delete v1.quantum.pointsEarned
  delete v1.quantum.pointsSpent
  v1.meta.navigationVisibility ??= {
    story: true,
    wiki: true,
    statistics: true,
  }
  v1.dream.railgun.activeRailguns ??= 0
  v1.dream.railgun.reservedPanels ??= 0n
  v1.dream.railgun.highestStoredPanels ??= 0n
  v1.dream.railgun.lastRoundsFired ??= 0
  v1.dream.railgun.lastPanelsLaunched ??= 0n
  v1.dream.railgun.pendingBaseSeconds = 0
  v1.dream.railgun.pendingDreamSeconds = 0
  for (const id of canonicalResearchKeySet) {
    v1.research.progressById[id] ??= 0
    v1.research.automation.enabledById[id] ??= false
  }
  return convertNumericGraph(v1, '$') as CanonicalGameStateV2
}

function validState(): CanonicalGameStateV2 {
  return cloneCanonicalGameStateV2(validStateSource())
}

describe('CanonicalGameStateV2 dormant contract', () => {
  it('validates the complete closed first-run V2 graph', () => {
    const state = validState()
    expect(validateCanonicalGameStateV2(state)).toEqual({ valid: true, errors: [] })
    expect(isGameDecimal(state.dyson.money)).toBe(true)
    expect(typeof state.research.levelsById['research.panel_lifetime_1']).toBe('bigint')
    expect(isGameDecimal(state.research.levelsById['research.money_multiplier'])).toBe(true)
  })

  it('deep-clones, freezes, and restores Decimal branding after structuredClone', () => {
    const state = validState()
    const nativeClone = structuredClone(state)
    expect(validateCanonicalGameStateV2(nativeClone).valid).toBe(false)

    const restored = cloneCanonicalGameStateV2(nativeClone)
    expect(validateCanonicalGameStateV2(restored).valid).toBe(true)
    expect(restored).not.toBe(state)
    expect(restored.dyson).not.toBe(state.dyson)
    expect(restored.dyson.money).not.toBe(state.dyson.money)
    expect(Object.isFrozen(restored.statistics.minuteWindows)).toBe(true)
    expect(Object.isFrozen(restored.skills.byId)).toBe(true)
  })

  it('rejects incompatible numeric classes, caps, and open durable keys', () => {
    const malformed = validStateSource() as any
    malformed.dream.resources.community = gameDecimalFromNumber(1.5)
    malformed.infinity.secretsOfTheUniverse = 28n
    malformed.research.levelsById['research.panel_lifetime_1'] = gameDecimalFromNumber(1)
    malformed.skills.byId['skill.unknown'] = {
      ...malformed.skills.byId[Object.keys(malformed.skills.byId)[0]],
    }
    malformed.extra = true
    const result = validateCanonicalGameStateV2(malformed)
    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toContain('integer-valued')
    expect(result.errors.join(' ')).toContain('exceeds 27')
    expect(result.errors.join(' ')).toContain('closed keys')
  })

  it('accepts each exact authored rank cap and rejects the next bigint', () => {
    const cases = [
      {
        maximum: 27n,
        rejected: 28n,
        message: 'Secrets of the Universe exceeds 27.',
        set: (state: any, value: bigint) => {
          state.infinity.secretsOfTheUniverse = value
        },
      },
      {
        maximum: 10n,
        rejected: 11n,
        message: 'Permanent Skill rank exceeds 10.',
        set: (state: any, value: bigint) => {
          state.infinity.permanentSkillPoints = value
        },
      },
      {
        maximum: 19n,
        rejected: 20n,
        message: 'Quantum Divisions exceeds 19.',
        set: (state: any, value: bigint) => {
          state.quantum.divisionsPurchased = value
        },
      },
      {
        maximum: 27n,
        rejected: 28n,
        message: 'Permanent Quantum Secrets exceeds 27.',
        set: (state: any, value: bigint) => {
          state.quantum.permanentSecrets = value
        },
      },
    ] as const

    const baseline = validStateSource()
    const capState = () => ({
      ...baseline,
      infinity: { ...baseline.infinity },
      quantum: { ...baseline.quantum },
    })

    for (const cap of cases) {
      const accepted = capState() as any
      cap.set(accepted, cap.maximum)
      expect(validateCanonicalGameStateV2(accepted)).toEqual({
        valid: true,
        errors: [],
      })

      const rejected = capState() as any
      cap.set(rejected, cap.rejected)
      expect(validateCanonicalGameStateV2(rejected)).toEqual({
        valid: false,
        errors: [cap.message],
      })
    }
  })

  it('rejects duplicate or unknown durable Skill ID arrays', () => {
    const malformed = validStateSource() as any
    const known = Object.keys(malformed.skills.byId)[0]
    malformed.skills.activeAutoAssignment = [known, known]
    malformed.skills.presets[0].skillIds = ['skill.unknown']
    const result = validateCanonicalGameStateV2(malformed)
    expect(result.valid).toBe(false)
    expect(result.errors.filter((error) => error.includes('unique canonical Skill IDs'))).toHaveLength(2)
  })

  it('enforces concrete bounded control ranges', () => {
    const malformed = validStateSource() as any
    malformed.dyson.botDistribution = 1.1
    malformed.timeline.researchAutomationTargetIndex = canonicalResearchKeySet.length
    malformed.secretProgress.step = 8
    malformed.dream.railgun.activeRailguns = 0.5
    malformed.dream.railgun.lastRoundsFired = 111
    malformed.dream.railgun.pendingBaseSeconds = 2
    malformed.dream.railgun.pendingDreamSeconds = 1

    const result = validateCanonicalGameStateV2(malformed)
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Dyson bot distribution must be in [0, 1].',
        'Research automation target index must select a closed Research ID.',
        'Secret progress step must be from 0 to 7.',
        'Active railguns must be a non-negative safe integer.',
        'Last railgun rounds fired must be from 0 to 110.',
        'Pending railgun Dream seconds must be finite and at least pending base seconds.',
      ]),
    )
  })

  it('enforces exact authored, catalog-derived, and discrete bigint invariants', () => {
    const atWorkerBatchCap = validStateSource() as any
    atWorkerBatchCap.reality.workersReady = REALITY_WORKERS_READY_MAXIMUM_V2
    expect(validateCanonicalGameStateV2(atWorkerBatchCap).valid).toBe(true)

    const malformed = validStateSource() as any
    malformed.dyson.goalStage = 11n
    malformed.skills.fragments = 1n
    for (const id of canonicalFragmentSkillKeySet) {
      malformed.skills.byId[id].owned = false
    }
    malformed.reality.workersReady = REALITY_WORKERS_READY_MAXIMUM_V2 + 1n
    malformed.dream.disasterStage = 41n

    const result = validateCanonicalGameStateV2(malformed)
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Dyson goal stage must be from 0 through 10.',
        'Skill fragments must equal the owned fragment Skill count (0).',
        'Reality workers ready exceeds the authored batch size 128.',
        'Dream disaster stage must be 0, 1, 2, 3, or 42.',
      ]),
    )
    expect(() => cloneCanonicalGameStateV2(malformed)).toThrow(
      'Cannot publish an invalid CanonicalGameStateV2',
    )
  })

  it('enforces stored-time capacity relations and the independent Double Time cap', () => {
    const malformed = validStateSource() as any
    malformed.timeline.storedTimeCapacitySeconds = 0
    malformed.timeline.storedTimeAvailableSeconds = 1
    malformed.timeline.doubleTime.bankSeconds =
      STORED_TIME_MAXIMUM_SECONDS + 1

    const result = validateCanonicalGameStateV2(malformed)
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        'Stored-time capacity must be greater than zero and no greater than 42000000 seconds.',
        'Stored time available must not exceed stored-time capacity.',
        'Double Time bank must not exceed 42000000 seconds.',
      ]),
    )

    const overMaximum = validStateSource() as any
    overMaximum.timeline.storedTimeCapacitySeconds =
      STORED_TIME_MAXIMUM_SECONDS + 1
    expect(validateCanonicalGameStateV2(overMaximum).errors).toContain(
      'Stored-time capacity must be greater than zero and no greater than 42000000 seconds.',
    )
  })

  it('rejects signed-zero numbers and a zero manual creation interval', () => {
    const malformed = validStateSource() as any
    malformed.timeline.doubleTime.bankSeconds = -0
    malformed.dyson.manualCreationIntervalSeconds = 0

    const result = validateCanonicalGameStateV2(malformed)
    expect(result.valid).toBe(false)
    expect(result.errors).toEqual(
      expect.arrayContaining([
        '$.timeline.doubleTime.bankSeconds must be finite and non-negative.',
        'Dyson manual creation interval must be greater than zero.',
      ]),
    )
    expect(() => cloneCanonicalGameStateV2(malformed)).toThrow(
      'Cannot publish an invalid CanonicalGameStateV2',
    )
  })

  it('rejects hostile missing, wrong-type, and unknown nested fields without throwing', () => {
    const malformed = validStateSource() as any
    malformed.meta.tutorialComplete = 'yes'
    malformed.quantum.unlocks.unknown = true
    malformed.statistics.lastCompletedCycle.dreamCause = 'UnknownCause'
    delete malformed.dream.parameters.solarCost
    delete malformed.meta.navigationVisibility
    delete malformed.dream.railgun.activeRailguns
    malformed.statistics.minuteWindows[0].unknown = false
    const result = validateCanonicalGameStateV2(malformed)
    expect(result.valid).toBe(false)
    expect(result.errors.join(' ')).toContain('unexpected string')
    expect(result.errors.join(' ')).toContain('unsupported Dream reset cause')
    expect(result.errors.join(' ')).toContain('exactly the declared closed keys')
    expect(result.errors.join(' ')).toContain('closed keys')
    expect(() => cloneCanonicalGameStateV2(malformed)).toThrow(
      'Cannot publish an invalid CanonicalGameStateV2',
    )
  })

  it('rejects cycles and shared mutable object identities', () => {
    const cyclic = structuredClone(validState()) as any
    cyclic.loop = cyclic
    expect(() => validateCanonicalGameStateV2(cyclic)).not.toThrow()
    expect(validateCanonicalGameStateV2(cyclic).valid).toBe(false)
    expect(() => cloneCanonicalGameStateV2(cyclic)).toThrow('acyclic tree')

    const aliased = structuredClone(validState()) as any
    aliased.metaAlias = aliased.meta
    expect(() => cloneCanonicalGameStateV2(aliased)).toThrow('unalias')

    const decimalLookalike = validStateSource() as any
    decimalLookalike.meta.navigationVisibility = { mantissa: 1, exponent: 0 }
    expect(() => cloneCanonicalGameStateV2(decimalLookalike)).toThrow(
      'is not a declared GameDecimal field',
    )
  })

  it('rejects enumerable array accessors without invoking them', () => {
    const malformed = validStateSource() as any
    let invocations = 0
    const hostile: string[] = []
    Object.defineProperty(hostile, '0', {
      enumerable: true,
      configurable: true,
      get() {
        invocations += 1
        return Object.keys(malformed.skills.byId)[0]
      },
    })
    hostile.length = 1
    malformed.skills.activeAutoAssignment = hostile

    expect(validateCanonicalGameStateV2(malformed).valid).toBe(false)
    expect(invocations).toBe(0)
    expect(() => cloneCanonicalGameStateV2(malformed)).toThrow(
      'dense data-only array',
    )
    expect(invocations).toBe(0)
  })
})
