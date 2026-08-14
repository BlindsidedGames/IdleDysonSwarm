import { gzipSync, gunzipSync, strFromU8, strToU8 } from 'fflate'
import { createHash } from 'node:crypto'
import { describe, expect, test } from 'vitest'
import {
  gameDecimalFromCanonicalString,
  gameDecimalFromNumber,
  gameDecimalToCanonicalString,
  isGameDecimal,
  type GameDecimal,
} from '../math/gameDecimal'
import {
  canonicalDreamTimerKeySet,
  canonicalFragmentSkillKeySet,
  canonicalNumericFieldClassifications,
  canonicalResearchKeySet,
  canonicalResearchLevelPolicies,
  canonicalSkillStateKeySet,
  durableRuntimeNumericClassifications,
  plannedV2OnlyNumericClassifications,
} from '../game-state/numericFieldManifest'
import { mappingCoverageManifest } from '../game-state/mappingCoverage'
import { DREAM_UPGRADE_FLAGS } from '../game-state/types'
import {
  admitValidatedCanonicalGameStateV2,
  isIssuedCanonicalGameStateV2,
  registerCanonicalGameStateValidationAuthorityV2,
} from '../game-state/cloneV2'
import {
  REALITY_WORKERS_READY_MAXIMUM_V2,
  type CanonicalGameStateV2,
} from '../game-state/typesV2'
import type { CanonicalRuntimeSidecarV2 } from '../game-state/runtimeV2'
import { resolveDysonTuningProfileV2 } from '../game-state/dysonTuningV2'
import { deriveDysonV2FromCauses } from '../simulation/dysonV2Derivation'
import { STORED_TIME_MAXIMUM_SECONDS } from '../simulation/timeResources'
import {
  decodeSchema13WebSave,
  encodeSchema13WebSave,
  SCHEMA13_CODEC_LIMITS,
  SCHEMA13_WEB_SAVE_PREFIX,
  schema13NumericPathInventory,
  type Schema13WebSaveSource,
  validateSchema13PlatformState,
  validateSchema13PresentationPreferences,
} from './schema13'

const savedAtUtc = '2026-08-08T00:00:00.000Z'
const facilityIds = [
  'assembly_lines',
  'ai_managers',
  'servers',
  'data_centers',
  'planets',
  'matrioshka_brains',
  'birch_planets',
  'galactic_brains',
] as const
const educationIds = [
  'engineering',
  'shipping',
  'worldTrade',
  'worldPeace',
  'mathematics',
  'advancedPhysics',
] as const

function decimal(value: number): GameDecimal {
  return gameDecimalFromNumber(value)
}

function recordFromKeys<Value>(
  keys: readonly string[],
  create: (key: string) => Value,
): Readonly<Record<string, Value>> {
  return Object.fromEntries(keys.map((key) => [key, create(key)]))
}

function statisticsTotals(): CanonicalGameStateV2['statistics']['lifetime'] {
  return {
    ordinaryInfinityCount: 1n,
    breakInfinityCount: 1n,
    ordinaryInfinityPoints: decimal(1),
    breakInfinityPoints: decimal(1),
    botCapInfinityPoints: decimal(1),
    botCapOverflowRewards: decimal(1),
    meteorDreamResets: 1n,
    aiDreamResets: 1n,
    globalWarmingDreamResets: 1n,
    blackHoleDreamResets: 1n,
    strangeMatter: decimal(1),
    realityWorkers: decimal(1),
    automaticInfluence: decimal(1),
    manualInfluence: decimal(1),
    realityCapacityStallSeconds: 0.5,
    simulatedSeconds: 1,
  }
}

function statisticsWindow(
  sequence: number,
): CanonicalGameStateV2['statistics']['minuteWindows'][number] {
  return {
    sequence: BigInt(sequence),
    simulatedSeconds: 1,
    infinityCount: 1n,
    infinityPoints: decimal(1),
    dreamResetCount: 1n,
    strangeMatter: decimal(1),
    realityWorkers: decimal(1),
  }
}

function canonicalState(): CanonicalGameStateV2 {
  const levelsById = Object.fromEntries(
    canonicalResearchLevelPolicies.map((policy) => [
      policy.key,
      policy.semanticClass === 'exact-bigint' ? 1n : decimal(1),
    ]),
  ) as CanonicalGameStateV2['research']['levelsById']
  return {
    modelVersion: 2,
    meta: {
      createdAtLegacyText: 'legacy-created-at',
      tutorialComplete: true,
      firstInfinityComplete: true,
      navigationVisibility: {
        story: true,
        wiki: false,
        statistics: true,
      },
    },
    dyson: {
      money: decimal(1.5),
      science: decimal(2.5),
      bots: decimal(3.5),
      workers: decimal(4.5),
      researchers: decimal(5.5),
      facilities: recordFromKeys(
        facilityIds,
        () => [decimal(0.5), decimal(1)] as const,
      ),
      manualCreationIntervalSeconds: 0.25,
      totalPanelsDecayed: decimal(0.5),
      goalStage: 1n,
      botDistribution: 0.5,
      automation: {
        buyMode: 'buy-max',
        roundedBulkBuy: true,
        enabledFacilities: recordFromKeys(facilityIds, () => true),
      },
    },
    infinity: {
      availablePoints: decimal(2),
      allocatedPoints: decimal(1),
      breakTarget: decimal(10),
      inProgress: false,
      botCapTransitionPending: false,
      botCapRewardsGranted: true,
      lastCycleDurationSeconds: 1,
      lastPointsGained: decimal(1),
      storedTimeUsedThisCycleSeconds: 0.5,
      storedTimeUsedPreviousCycleSeconds: 0.25,
      secretsOfTheUniverse: 1n,
      permanentSkillPoints: 1n,
      retainedFacilities: {
        assembly_lines: true,
        ai_managers: false,
        servers: true,
        data_centers: false,
        planets: true,
      },
      automationUnlocked: { research: true, bots: false },
    },
    skills: {
      points: 1n,
      fragments: 0n,
      byId: recordFromKeys(canonicalSkillStateKeySet, () => ({
        owned: false,
        level: 0n,
        timerSeconds: 0,
        secondaryTimerSeconds: 0,
      })),
      activeAutoAssignment: [],
      selectedPreset: 4,
      presets: [
        { name: 'One', skillIds: [], botDistribution: 0, colorId: 'cyan' },
        { name: 'Two', skillIds: [], botDistribution: 0, colorId: 'orange' },
        { name: 'Three', skillIds: [], botDistribution: 0, colorId: 'gold' },
        { name: 'Four', skillIds: [], botDistribution: 0, colorId: 'rose' },
        { name: 'Five', skillIds: [], botDistribution: 0, colorId: 'pink' },
      ],
      autoAssignNonRefundable: true,
      tabPresetAutomation: { bots: 0, research: 5 },
    },
    research: {
      levelsById,
      progressById: recordFromKeys(
        canonicalResearchKeySet,
        () => decimal(0.5),
      ),
      automation: {
        buyMode: 'buy-10',
        roundedBulkBuy: false,
        enabledById: recordFromKeys(canonicalResearchKeySet, () => true),
      },
    },
    reality: {
      universeDesignationCount: decimal(1),
      workersReady: 1n,
      workerGenerationProgress: 0.5,
      influence: decimal(1),
      autoGather: true,
    },
    quantum: {
      availableShards: decimal(1),
      lifetimeEarnedShards: decimal(2),
      divisionsPurchased: 1n,
      permanentSecrets: 1n,
      influenceSpeedBonus: decimal(1),
      cashBonusLevels: decimal(1),
      scienceBonusLevels: decimal(1),
      unlocks: {
        botMultitasking: true,
        doubleInfinityPoints: true,
        breakTheLoop: true,
        quantumEntanglement: true,
        automation: true,
        fragments: true,
        purity: true,
        terra: true,
        power: true,
        paragade: true,
        stellar: true,
        matrioshkaBrains: true,
        birchPlanets: true,
        galacticBrains: true,
      },
    },
    avocado: {
      unlocked: true,
      infinityPoints: decimal(0.5),
      influence: decimal(0.5),
      strangeMatter: decimal(0.5),
      overflowMultiplier: decimal(1.5),
    },
    timeline: {
      eventClockInitialized: true,
      automationTimeUntilNextEvent: 0.1,
      dysonAutomationTargetIndex: 0,
      researchAutomationTargetIndex: 0,
      infinityBoundaryRemaining: 0.1,
      infinityCycleSeconds: 1,
      infinityCycleStartingPoints: decimal(1),
      infinityHasPostResetStart: true,
      storedTimeAvailableSeconds: 1,
      storedTimeCapacitySeconds: 2,
      lastSuspendedAtLegacyText: null,
      doubleTime: { unlocked: true, enabled: true, bankSeconds: 1, rate: 2 },
    },
    secretProgress: { completed: false, step: 1 },
    dream: {
      resources: {
        hunters: decimal(1),
        gatherers: decimal(1),
        community: decimal(1),
        housing: decimal(1),
        villages: decimal(1),
        workers: decimal(1),
        cities: decimal(1),
        factories: decimal(1),
        bots: decimal(1),
        rockets: decimal(1),
        energy: decimal(0.5),
        spaceFactories: decimal(1),
        dysonPanels: decimal(1),
        railgunCharge: decimal(0.5),
        solarPanels: decimal(1),
        fusion: decimal(1),
        swarmPanels: decimal(1),
      },
      parameters: {
        hunterCost: decimal(1),
        gathererCost: decimal(1),
        communityBoostCost: decimal(1),
        communityBoostIsFree: false,
        communityBoostClock: 0.5,
        communityBoostDuration: 1,
        factoriesBoostCost: decimal(1),
        factoriesBoostClock: 0.5,
        factoriesBoostDuration: 1,
        rocketsPerSpaceFactory: decimal(1),
        railgunMaxCharge: decimal(1.5),
        solarCost: decimal(1),
        solarPanelGeneration: decimal(0.5),
        fusionCost: decimal(1),
        fusionGeneration: decimal(0.5),
        swarmPanelGeneration: decimal(0.5),
      },
      education: recordFromKeys(educationIds, () => ({
        active: false,
        complete: false,
        progress: decimal(0.5),
        researchTime: 1,
        cost: decimal(1),
      })),
      timers: recordFromKeys(canonicalDreamTimerKeySet, () => 0.5),
      railgun: {
        firing: false,
        fireProgress: 0.5,
        pendingBaseSeconds: 0.25,
        pendingDreamSeconds: 0.5,
        shotsRemaining: 1,
        activeRailguns: 1,
        reservedPanels: decimal(1),
        highestStoredPanels: decimal(1),
        lastRoundsFired: 1,
        lastPanelsLaunched: decimal(1),
      },
      resetCount: 1n,
      strangeMatter: decimal(1),
      disasterStage: 1n,
      upgrades: recordFromKeys(DREAM_UPGRADE_FLAGS, () => false),
      huntersPerPurchase: decimal(1),
      gatherersPerPurchase: decimal(1),
    },
    statistics: {
      trackedSinceUpdate: true,
      trackingStartedMarker: 'tracking-marker',
      trackedSimulatedSeconds: 1,
      lifetime: statisticsTotals(),
      currentQuantumRun: statisticsTotals(),
      recentProcessedSegment: statisticsTotals(),
      lastCompletedCycle: {
        valid: true,
        breakInfinity: false,
        durationSeconds: 1,
        reward: decimal(1),
        dreamCause: null,
      },
      minuteWindows: Array.from({ length: 60 }, (_, index) =>
        statisticsWindow(index),
      ),
      halfHourWindows: Array.from({ length: 48 }, (_, index) =>
        statisticsWindow(index),
      ),
      dailyWindows: Array.from({ length: 30 }, (_, index) =>
        statisticsWindow(index),
      ),
    },
  }
}

const preferences = {
  globalMute: false,
  screensaverEnabled: true,
  hidePurchased: true,
  buyMax: true,
  numberFormatting: 2,
  skillsBuyOnTap: true,
  frameRate: 120,
  botsButtonToggle: true,
  researchbuttonToggle: true,
  skillsButtonToggle: true,
  skillsFirstRunDone: true,
  infinityButtonToggle: true,
  infinityFirstRunDone: true,
  realityButtonToggle: true,
  realityFirstRun: true,
  simulationsButtonToggle: true,
  prestigeButtonToggle: true,
  prestigeFirstRun: true,
  settingsButtonToggle: true,
  firstReality: true,
} as const

const platform = {
  debugOptions: false,
  debugEverEnabled: true,
  cheater: false,
  unlockAllTabs: false,
} as const

function source(): Schema13WebSaveSource {
  return {
    savedAtUtc,
    state: canonicalState(),
    runtime: runtimeSidecar(),
  }
}

function runtimeSidecar(): CanonicalRuntimeSidecarV2 {
  return {
    dysonEvaluationSnapshot: {
      panelsPerSecond: gameDecimalFromCanonicalString('1.23456789e400'),
      panelLifetimeSeconds: decimal(10),
      scienceMultiplier: decimal(2),
      rudimentarySingularityProduction: decimal(3),
      pocketDimensionsProduction: decimal(4),
      scientificPlanetsProduction: decimal(5),
      managerAssemblyLineProduction: decimal(6),
    },
    dysonTuningProfile: 'web-authored-v1',
  }
}

function base64(value: Uint8Array): string {
  let binary = ''
  for (const byte of value) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function innerJson(encoded: string): string {
  const payload = encoded.slice(SCHEMA13_WEB_SAVE_PREFIX.length)
  const binary = atob(payload)
  const compressed = Uint8Array.from(binary, (character) =>
    character.charCodeAt(0),
  )
  return strFromU8(gunzipSync(compressed))
}

function wrapInnerJson(json: string): string {
  const compressed = gzipSync(strToU8(json), { level: 9, mtime: 0 })
  return `${SCHEMA13_WEB_SAVE_PREFIX}${base64(compressed)}`
}

function corruptGzipChecksum(encoded: string): string {
  const payload = encoded.slice(SCHEMA13_WEB_SAVE_PREFIX.length)
  const compressed = Uint8Array.from(atob(payload), (character) =>
    character.charCodeAt(0),
  )
  compressed[compressed.length - 8] ^= 0xff
  return `${SCHEMA13_WEB_SAVE_PREFIX}${base64(compressed)}`
}

function documentRecord(encoded = encodeSchema13WebSave(source())): Record<string, any> {
  return JSON.parse(innerJson(encoded)) as Record<string, any>
}

function mutateDocument(
  mutate: (document: Record<string, any>) => void,
): string {
  const document = documentRecord()
  mutate(document)
  return wrapInnerJson(JSON.stringify(document))
}

function expectV2SemanticRejection(
  mutateState: (state: Record<string, any>) => void,
  mutateDto: (document: Record<string, any>) => void,
  message: RegExp,
): void {
  const encodeInput = source()
  mutateState(encodeInput.state as unknown as Record<string, any>)
  expect(() => encodeSchema13WebSave(encodeInput)).toThrow(message)
  expect(() =>
    decodeSchema13WebSave(mutateDocument(mutateDto)),
  ).toThrow(message)
}

describe('schema 13 dormant Web-native codec', () => {
  test('matches every intended V2 numeric path to its path-typed parser class', () => {
    const expected = [
      ...canonicalNumericFieldClassifications,
      ...plannedV2OnlyNumericClassifications,
      ...durableRuntimeNumericClassifications,
    ].flatMap((entry) => {
      if (entry.intendedV2Path === null) return []
      if (entry.memberPolicies !== undefined) {
        return entry.memberPolicies.map((policy) => ({
          path: entry.intendedV2Path!.replace('*', policy.key),
          semanticClass: policy.semanticClass,
        }))
      }
      return [{
        path: entry.intendedV2Path,
        semanticClass: entry.semanticClass,
      }]
    }).sort((left, right) =>
      left.path < right.path ? -1 : left.path > right.path ? 1 : 0,
    )

    expect(schema13NumericPathInventory).toEqual(expected)
  })

  test('round-trips the closed path-typed document through deterministic IDSWEB1 gzip', () => {
    const input = source()
    const encoded = encodeSchema13WebSave(input)
    const decoded = decodeSchema13WebSave(encoded)
    const document = documentRecord(encoded)

    expect(encoded.startsWith(SCHEMA13_WEB_SAVE_PREFIX)).toBe(true)
    expect(encodeSchema13WebSave(input)).toBe(encoded)
    expect(Object.keys(document)).toEqual([
      'schemaVersion',
      'modelVersion',
      'savedAtUtc',
      'state',
      'runtime',
    ])
    expect(document.schemaVersion).toBe(13)
    expect(document.modelVersion).toBe(2)
    expect(document.state.modelVersion).toBeUndefined()
    expect(document.state.dyson.money).toBe('1.5e0')
    expect(document.state.dyson.goalStage).toBe('1')
    expect(document.runtime).toEqual({
      dysonEvaluationSnapshot: {
        panelsPerSecond: '1.23456789e400',
        panelLifetimeSeconds: '1e1',
        scienceMultiplier: '2e0',
        rudimentarySingularityProduction: '3e0',
        pocketDimensionsProduction: '4e0',
        scientificPlanetsProduction: '5e0',
        managerAssemblyLineProduction: '6e0',
      },
      dysonTuningProfile: 'web-authored-v1',
    })
    expect(typeof document.state.dyson.manualCreationIntervalSeconds).toBe(
      'number',
    )
    expect(JSON.stringify(document)).not.toContain('$decimal')
    expect(JSON.stringify(document)).not.toContain('doubleIp')
    expect(decoded.state).toEqual(input.state)
    expect(decoded.state).not.toBe(input.state)
    expect(decoded.runtime).toEqual(input.runtime)
    expect(decoded.runtime).not.toBe(input.runtime)
    expect(decoded.runtime.dysonEvaluationSnapshot.panelsPerSecond.exponent)
      .toBe(400)
    expect(isGameDecimal(decoded.state.dyson.money)).toBe(true)
    expect(Object.isFrozen(decoded.state)).toBe(true)
    expect(Object.isFrozen(decoded.state.dyson)).toBe(true)
    expect(Object.isFrozen(decoded.state.statistics.minuteWindows)).toBe(true)
    expect(Object.isFrozen(decoded.state.statistics.minuteWindows[0])).toBe(true)
    expect(isIssuedCanonicalGameStateV2(decoded.state)).toBe(true)
    expect(Object.isFrozen(decoded.runtime)).toBe(true)
    expect(Object.isFrozen(decoded.runtime.dysonEvaluationSnapshot)).toBe(true)
    expect(encodeSchema13WebSave(decoded)).toBe(encoded)
  })

  test('round-trips a resource at the maximum supported GameDecimal exponent', () => {
    const input = source()
    const maximum = gameDecimalFromCanonicalString('1e8999999999999999')
    const encoded = encodeSchema13WebSave({
      ...input,
      state: {
        ...input.state,
        dyson: { ...input.state.dyson, money: maximum },
      },
    })
    const decoded = decodeSchema13WebSave(encoded)

    expect(gameDecimalToCanonicalString(decoded.state.dyson.money)).toBe(
      '1e8999999999999999',
    )
    expect(encodeSchema13WebSave(decoded)).toBe(encoded)
  })

  test('pins deterministic schema-13 bytes for the closed runtime document', () => {
    const encoded = encodeSchema13WebSave(source())
    expect(createHash('sha256').update(encoded).digest('hex')).toBe(
      '55861f31d08af2b4ac2098e1e950a9e3966b335d4f24ae84c8aed6a07c4dd2ff',
    )
  })

  test('preserves Decimal evaluation recurrence across a schema-13 reload', () => {
    const firstLoaded = decodeSchema13WebSave(encodeSchema13WebSave(source()))
    const firstDerived = deriveDysonV2FromCauses(firstLoaded.state, Object.freeze({
      compatibilityTuning: resolveDysonTuningProfileV2(
        firstLoaded.runtime.dysonTuningProfile,
      ),
      evaluationSnapshot: firstLoaded.runtime.dysonEvaluationSnapshot,
    }))
    const reloaded = decodeSchema13WebSave(encodeSchema13WebSave(firstLoaded))
    const reloadedDerived = deriveDysonV2FromCauses(reloaded.state, Object.freeze({
      compatibilityTuning: resolveDysonTuningProfileV2(
        reloaded.runtime.dysonTuningProfile,
      ),
      evaluationSnapshot: reloaded.runtime.dysonEvaluationSnapshot,
    }))

    expect(reloaded.runtime).toEqual(firstLoaded.runtime)
    expect(reloaded.runtime.dysonEvaluationSnapshot.panelsPerSecond.exponent)
      .toBe(400)
    expect(reloadedDerived).toEqual(firstDerived)
  })

  test('rejects a corrupt gzip checksum at the schema-13 transport boundary', () => {
    expect(() =>
      decodeSchema13WebSave(
        corruptGzipChecksum(encodeSchema13WebSave(source())),
      ),
    ).toThrow(/checksum/i)
  })

  test('uses descriptor order rather than source record insertion order', () => {
    const input = source()
    const reversedById = Object.fromEntries(
      Object.entries(input.state.skills.byId).reverse(),
    )
    const reordered = {
      ...input,
      state: {
        ...input.state,
        skills: { ...input.state.skills, byId: reversedById },
      },
    }
    expect(encodeSchema13WebSave(reordered)).toBe(
      encodeSchema13WebSave(input),
    )
  })

  test('rejects aliased encode graphs while retaining the worker-shaped fast path', () => {
    const input = source()
    const mutableStatistics = input.state.statistics as unknown as Record<
      string,
      unknown
    >
    mutableStatistics.currentQuantumRun = mutableStatistics.lifetime

    expect(() => encodeSchema13WebSave(input)).toThrow(/unaliased acyclic/i)
  })

  test('does not let a forged issued-state marker bypass persistence validation', () => {
    const input = source()
    const invalidState = Object.freeze({
      ...input.state,
      timeline: Object.freeze({
        ...input.state.timeline,
        storedTimeAvailableSeconds:
          input.state.timeline.storedTimeCapacitySeconds + 1,
      }),
    })
    const authority = registerCanonicalGameStateValidationAuthorityV2()
    admitValidatedCanonicalGameStateV2(authority, invalidState)

    expect(isIssuedCanonicalGameStateV2(invalidState)).toBe(true)
    expect(() => encodeSchema13WebSave(Object.freeze({
      ...input,
      state: invalidState,
    }))).toThrow(/Stored time available must not exceed stored-time capacity/i)
  })

  test('keeps automatic facility and accumulated panel fractions but rejects integer-path fractions', () => {
    expect(() => decodeSchema13WebSave(encodeSchema13WebSave(source()))).not.toThrow()

    expect(() =>
      decodeSchema13WebSave(
        mutateDocument((document) => {
          document.state.dyson.facilities.assembly_lines[1] = '5e-1'
        }),
      ),
    ).toThrow(/integer/i)
    expect(() =>
      decodeSchema13WebSave(
        mutateDocument((document) => {
          document.state.quantum.influenceSpeedBonus = '5e-1'
        }),
      ),
    ).toThrow(/integer/i)
    expect(() =>
      decodeSchema13WebSave(
        mutateDocument((document) => {
          document.state.dream.parameters.hunterCost = '5e-1'
        }),
      ),
    ).toThrow(/integer/i)
    expect(() =>
      decodeSchema13WebSave(
        mutateDocument((document) => {
          document.state.dream.education.engineering.cost = '5e-1'
        }),
      ),
    ).toThrow(/integer/i)
  })

  test('rejects unknown, missing, forbidden, and nonportable duplicate fields', () => {
    expect(() =>
      decodeSchema13WebSave(
        mutateDocument((document) => {
          document.state.dyson.unknown = true
        }),
      ),
    ).toThrow(/undeclared/i)
    expect(() =>
      decodeSchema13WebSave(
        mutateDocument((document) => {
          delete document.state.dyson.money
        }),
      ),
    ).toThrow(/missing/i)
    expect(() =>
      decodeSchema13WebSave(
        mutateDocument((document) => {
          delete document.runtime.dysonEvaluationSnapshot.panelsPerSecond
        }),
      ),
    ).toThrow(/missing/i)
    expect(() =>
      decodeSchema13WebSave(
        mutateDocument((document) => {
          document.runtime.dysonEvaluationSnapshot.extra = '1e0'
        }),
      ),
    ).toThrow(/undeclared/i)
    expect(() =>
      decodeSchema13WebSave(
        mutateDocument((document) => {
          document.runtime.dysonTuningProfile =
            'historical-schema8-assembly-line-v1'
        }),
      ),
    ).toThrow(/enum/i)
    expect(() =>
      decodeSchema13WebSave(
        mutateDocument((document) => {
          document.runtime.dysonEvaluationSnapshot.panelsPerSecond = '1'.repeat(
            SCHEMA13_CODEC_LIMITS.decimalCharacters + 1,
          )
        }),
      ),
    ).toThrow(/Decimal string limit/i)
    expect(() =>
      decodeSchema13WebSave(
        mutateDocument((document) => {
          document.runtime.dysonEvaluationSnapshot.panelsPerSecond = '1.0e400'
        }),
      ),
    ).toThrow(/canonical|normalized/i)
    expect(() =>
      decodeSchema13WebSave(
        mutateDocument((document) => {
          document.platform = platform
        }),
      ),
    ).toThrow(/undeclared/i)
    expect(() =>
      decodeSchema13WebSave(
        wrapInnerJson('{"schemaVersion":13,"__proto__":{},"modelVersion":2}'),
      ),
    ).toThrow(/forbidden/i)
  })

  test('validates local preferences and platform state outside the portable document', () => {
    const checkedPreferences = validateSchema13PresentationPreferences(
      preferences,
    )
    const checkedPlatform = validateSchema13PlatformState(platform)

    expect(checkedPreferences).toEqual(preferences)
    expect(checkedPlatform).toEqual(platform)
    expect(Object.isFrozen(checkedPreferences)).toBe(true)
    expect(Object.isFrozen(checkedPlatform)).toBe(true)
    expect(Object.keys(checkedPreferences).sort()).toEqual(
      mappingCoverageManifest.entries
        .filter((entry) => entry.classification === 'presentation-preference')
        .map((entry) => entry.sourcePath.slice(2))
        .sort(),
    )
    expect(Object.keys(checkedPlatform).sort()).toEqual(
      mappingCoverageManifest.entries
        .filter((entry) => entry.classification === 'platform-entitlement')
        .map((entry) => entry.sourcePath.slice(2))
        .sort(),
    )
    expect(() =>
      validateSchema13PresentationPreferences({
        ...preferences,
        unknown: true,
      }),
    ).toThrow(/undeclared/i)
    expect(() =>
      validateSchema13PlatformState({ ...platform, doubleIp: true }),
    ).toThrow(/undeclared/i)
    const missingPreference = { ...preferences } as Record<string, unknown>
    delete missingPreference.globalMute
    expect(() =>
      validateSchema13PresentationPreferences(missingPreference),
    ).toThrow(/missing/i)
    const missingPlatform = { ...platform } as Record<string, unknown>
    delete missingPlatform.cheater
    expect(() => validateSchema13PlatformState(missingPlatform)).toThrow(
      /missing/i,
    )
  })

  test('enforces closed local numeric preference policies', () => {
    expect(() =>
      validateSchema13PresentationPreferences({
        ...preferences,
        numberFormatting: 3,
      }),
    ).toThrow(/maximum/i)
    expect(() =>
      validateSchema13PresentationPreferences({
        ...preferences,
        numberFormatting: 0.5,
      }),
    ).toThrow(/safe integer/i)
    expect(() =>
      validateSchema13PresentationPreferences({
        ...preferences,
        frameRate: 1_001,
      }),
    ).toThrow(/maximum/i)
    expect(() =>
      validateSchema13PresentationPreferences({
        ...preferences,
        frameRate: -0,
      }),
    ).toThrow(/non-negative/i)
  })

  test('rejects self-replacing accessors without invoking them', () => {
    const hostileSource = source() as unknown as Record<string, unknown>
    let sourceReads = 0
    Object.defineProperty(hostileSource, 'state', {
      configurable: true,
      enumerable: true,
      get() {
        sourceReads += 1
        Object.defineProperty(hostileSource, 'state', {
          configurable: true,
          enumerable: true,
          value: canonicalState(),
          writable: true,
        })
        return canonicalState()
      },
    })
    expect(() =>
      encodeSchema13WebSave(hostileSource as unknown as Schema13WebSaveSource),
    ).toThrow(/data properties/i)
    expect(sourceReads).toBe(0)

    const hostileStateSource = source()
    const hostileDyson = hostileStateSource.state.dyson as unknown as Record<
      string,
      unknown
    >
    const originalMoney = hostileDyson.money
    let stateReads = 0
    Object.defineProperty(hostileDyson, 'money', {
      configurable: true,
      enumerable: true,
      get() {
        stateReads += 1
        Object.defineProperty(hostileDyson, 'money', {
          configurable: true,
          enumerable: true,
          value: originalMoney,
          writable: true,
        })
        return originalMoney
      },
    })
    expect(() => encodeSchema13WebSave(hostileStateSource)).toThrow(
      /data properties/i,
    )
    expect(stateReads).toBe(0)

    const hostileRuntimeSource = source()
    const hostileSnapshot = hostileRuntimeSource.runtime
      .dysonEvaluationSnapshot as unknown as Record<string, unknown>
    const originalPanels = hostileSnapshot.panelsPerSecond
    let runtimeReads = 0
    Object.defineProperty(hostileSnapshot, 'panelsPerSecond', {
      configurable: true,
      enumerable: true,
      get() {
        runtimeReads += 1
        return originalPanels
      },
    })
    expect(() => encodeSchema13WebSave(hostileRuntimeSource)).toThrow(
      /declared data fields/i,
    )
    expect(runtimeReads).toBe(0)

    const hostilePreferences = { ...preferences } as Record<string, unknown>
    let preferenceReads = 0
    Object.defineProperty(hostilePreferences, 'globalMute', {
      configurable: true,
      enumerable: true,
      get() {
        preferenceReads += 1
        Object.defineProperty(hostilePreferences, 'globalMute', {
          configurable: true,
          enumerable: true,
          value: false,
          writable: true,
        })
        return false
      },
    })
    expect(() =>
      validateSchema13PresentationPreferences(hostilePreferences),
    ).toThrow(/data properties/i)
    expect(preferenceReads).toBe(0)

    const hostilePlatform = { ...platform } as Record<string, unknown>
    let platformReads = 0
    Object.defineProperty(hostilePlatform, 'cheater', {
      configurable: true,
      enumerable: true,
      get() {
        platformReads += 1
        return false
      },
    })
    expect(() => validateSchema13PlatformState(hostilePlatform)).toThrow(
      /data properties/i,
    )
    expect(platformReads).toBe(0)
  })

  test('rejects duplicate-equivalent JSON object keys before JSON materialization', () => {
    const json = innerJson(encodeSchema13WebSave(source())).replace(
      '"schemaVersion":13',
      '"schemaVersion":13,"\\u0073chemaVersion":13',
    )
    expect(() => decodeSchema13WebSave(wrapInnerJson(json))).toThrow(
      /duplicate-equivalent/i,
    )
  })

  test('rejects wrong primitives, generic numeric tags, and noncanonical numeric strings', () => {
    expect(() =>
      decodeSchema13WebSave(
        mutateDocument((document) => {
          document.state.dyson.money = { $decimal: '1e0' }
        }),
      ),
    ).toThrow(/Decimal string/i)
    expect(() =>
      decodeSchema13WebSave(
        mutateDocument((document) => {
          document.state.dyson.goalStage = 1
        }),
      ),
    ).toThrow(/bigint/i)
    expect(() =>
      decodeSchema13WebSave(
        mutateDocument((document) => {
          document.state.dyson.manualCreationIntervalSeconds = '1'
        }),
      ),
    ).toThrow(/number/i)
    expect(() =>
      decodeSchema13WebSave(
        mutateDocument((document) => {
          document.state.dyson.money = '1e+0'
        }),
      ),
    ).toThrow(/canonical|syntax/i)
    expect(() =>
      decodeSchema13WebSave(
        mutateDocument((document) => {
          document.state.dyson.goalStage = '01'
        }),
      ),
    ).toThrow(/noncanonical/i)
  })

  test('rejects signed zero and a zero manual-creation interval', () => {
    const signedZero = innerJson(encodeSchema13WebSave(source())).replace(
      '"manualCreationIntervalSeconds":0.25',
      '"manualCreationIntervalSeconds":-0',
    )
    expect(() => decodeSchema13WebSave(wrapInnerJson(signedZero))).toThrow(
      /non-negative/i,
    )
    expect(() =>
      decodeSchema13WebSave(
        mutateDocument((document) => {
          document.state.dyson.manualCreationIntervalSeconds = 0
        }),
      ),
    ).toThrow(/greater than/i)
  })

  test('delegates exact progression-domain rejection to V2 validation', () => {
    expectV2SemanticRejection(
      (state) => {
        state.dyson.goalStage = 11n
      },
      (document) => {
        document.state.dyson.goalStage = '11'
      },
      /goal stage must be from 0 through 10/i,
    )
    expectV2SemanticRejection(
      (state) => {
        state.dream.disasterStage = 4n
      },
      (document) => {
        document.state.dream.disasterStage = '4'
      },
      /disaster stage must be 0, 1, 2, 3, or 42/i,
    )
    expectV2SemanticRejection(
      (state) => {
        state.reality.workersReady = REALITY_WORKERS_READY_MAXIMUM_V2 + 1n
      },
      (document) => {
        document.state.reality.workersReady = (
          REALITY_WORKERS_READY_MAXIMUM_V2 + 1n
        ).toString()
      },
      /workers ready exceeds the authored batch size 128/i,
    )
  })

  test('rejects fragment totals inconsistent with the closed fragment catalog', () => {
    expectV2SemanticRejection(
      (state) => {
        state.skills.fragments = 1n
      },
      (document) => {
        document.state.skills.fragments = '1'
      },
      /fragments must equal the owned fragment Skill count \(0\)/i,
    )

    const aboveCatalog = BigInt(canonicalFragmentSkillKeySet.length + 1)
    expectV2SemanticRejection(
      (state) => {
        for (const id of canonicalFragmentSkillKeySet) {
          state.skills.byId[id].owned = true
        }
        state.skills.fragments = aboveCatalog
      },
      (document) => {
        for (const id of canonicalFragmentSkillKeySet) {
          document.state.skills.byId[id].owned = true
        }
        document.state.skills.fragments = aboveCatalog.toString()
      },
      new RegExp(
        `fragments must equal the owned fragment Skill count \\(${canonicalFragmentSkillKeySet.length}\\)`,
        'i',
      ),
    )
  })

  test('delegates stored-time relationship and cap rejection to V2 validation', () => {
    expectV2SemanticRejection(
      (state) => {
        state.timeline.storedTimeCapacitySeconds = 0
      },
      (document) => {
        document.state.timeline.storedTimeCapacitySeconds = 0
      },
      /stored-time capacity must be greater than zero/i,
    )
    expectV2SemanticRejection(
      (state) => {
        state.timeline.storedTimeCapacitySeconds =
          STORED_TIME_MAXIMUM_SECONDS + 1
      },
      (document) => {
        document.state.timeline.storedTimeCapacitySeconds =
          STORED_TIME_MAXIMUM_SECONDS + 1
      },
      /stored-time capacity.*no greater than 42000000/i,
    )
    expectV2SemanticRejection(
      (state) => {
        state.timeline.storedTimeAvailableSeconds = 3
        state.timeline.storedTimeCapacitySeconds = 2
      },
      (document) => {
        document.state.timeline.storedTimeAvailableSeconds = 3
        document.state.timeline.storedTimeCapacitySeconds = 2
      },
      /stored time available must not exceed stored-time capacity/i,
    )
    expectV2SemanticRejection(
      (state) => {
        state.timeline.doubleTime.bankSeconds =
          STORED_TIME_MAXIMUM_SECONDS + 1
      },
      (document) => {
        document.state.timeline.doubleTime.bankSeconds =
          STORED_TIME_MAXIMUM_SECONDS + 1
      },
      /Double Time bank must not exceed 42000000/i,
    )
  })

  test('rejects wrong schema/model versions, raw JSON, and noncanonical timestamps', () => {
    expect(() => decodeSchema13WebSave(innerJson(encodeSchema13WebSave(source())))).toThrow(
      /IDSWEB1 envelope/i,
    )
    expect(() =>
      decodeSchema13WebSave(
        mutateDocument((document) => {
          document.schemaVersion = 14
        }),
      ),
    ).toThrow(/literal/i)
    expect(() =>
      decodeSchema13WebSave(
        mutateDocument((document) => {
          document.modelVersion = 1
        }),
      ),
    ).toThrow(/literal/i)
    expect(() =>
      decodeSchema13WebSave(
        mutateDocument((document) => {
          document.savedAtUtc = '2026-08-08T00:00:00Z'
        }),
      ),
    ).toThrow(/canonical UTC/i)
  })

  test('enforces text, depth, container, entry, and ordinary-string budgets', () => {
    expect(() =>
      decodeSchema13WebSave(
        `${SCHEMA13_WEB_SAVE_PREFIX}${'A'.repeat(
          SCHEMA13_CODEC_LIMITS.suppliedTextBytes + 1,
        )}`,
      ),
    ).toThrow(/supplied-text limit/i)

    const tooDeep = `${'['.repeat(
      SCHEMA13_CODEC_LIMITS.maximumDepth + 2,
    )}0${']'.repeat(SCHEMA13_CODEC_LIMITS.maximumDepth + 2)}`
    expect(() => decodeSchema13WebSave(wrapInnerJson(tooDeep))).toThrow(
      /depth/i,
    )

    const tooManyContainers = `[${Array.from(
      { length: SCHEMA13_CODEC_LIMITS.maximumContainers },
      () => '[]',
    ).join(',')}]`
    expect(() =>
      decodeSchema13WebSave(wrapInnerJson(tooManyContainers)),
    ).toThrow(/container count/i)

    const tooManyEntries = `[${'0,'.repeat(
      SCHEMA13_CODEC_LIMITS.maximumEntries,
    )}0]`
    expect(() =>
      decodeSchema13WebSave(wrapInnerJson(tooManyEntries)),
    ).toThrow(/entry count/i)

    const tooLongString = JSON.stringify(
      'x'.repeat(SCHEMA13_CODEC_LIMITS.maximumStringCodeUnits + 1),
    )
    expect(() =>
      decodeSchema13WebSave(wrapInnerJson(tooLongString)),
    ).toThrow(/string length limit/i)
  })

  test('scans a near-budget adversarial numeric array with cursor-based parsing', () => {
    const entryCount = SCHEMA13_CODEC_LIMITS.maximumEntries - 10_000
    const numericArray = `[${'0,'.repeat(entryCount - 1)}0]`

    expect(() =>
      decodeSchema13WebSave(wrapInnerJson(numericArray)),
    ).toThrow(/closed object/i)
  })

  test('enforces Decimal and bigint per-value limits before construction', () => {
    expect(() =>
      decodeSchema13WebSave(
        mutateDocument((document) => {
          document.state.dyson.money = '1'.repeat(
            SCHEMA13_CODEC_LIMITS.decimalCharacters + 1,
          )
        }),
      ),
    ).toThrow(/Decimal string limit/i)
    expect(() =>
      decodeSchema13WebSave(
        mutateDocument((document) => {
          document.state.dyson.goalStage = '1'.repeat(
            SCHEMA13_CODEC_LIMITS.bigintDigits + 1,
          )
        }),
      ),
    ).toThrow(/bigint string/i)
  })
})
