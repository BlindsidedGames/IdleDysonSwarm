import { describe, expect, test } from 'vitest'

import firstRunIdb1 from '../application/firstRun/generated/first-run-schema-12.idb1.txt?raw'
import {
  gameDecimalFromBigInt,
  gameDecimalFromNumber,
  isGameDecimal,
  isIntegerGameDecimal,
} from '../math/gameDecimal'
import { requireRecord } from '../save/graph'
import { prepareIdb1Save, PreparedSave } from '../save/prepare'
import {
  DEFAULT_STORED_TIME_CAPACITY_SECONDS,
  STORED_TIME_MAXIMUM_SECONDS,
} from '../simulation/timeResources'
import { deriveDysonV2FromCauses } from '../simulation/dysonV2Derivation'
import {
  decodeSchema13WebSave,
  encodeSchema13WebSave,
} from '../save/schema13'
import { deserializeWebSave } from '../save/serialization'
import schema08Idb1 from '../../test/fixtures/schema-08-canonical-idb1-main-save.txt?raw'
import schema12Web from '../../test/fixtures/schema-12-canonical-idsweb1-first-run.txt?raw'
import support01Idb1 from '../../test/fixtures/support-case-01-attached-idb1.txt?raw'
import support02Idb1 from '../../test/fixtures/support-case-02-inline-idb1.txt?raw'
import support03Idb1 from '../../test/fixtures/support-case-03-inline-idb1.txt?raw'
import * as mappingV2Exports from './mappingV2'
import {
  migratePreparedSaveToV2,
  type V2LocalPlatformState,
  type V2LocalPreferences,
} from './mappingV2'
import {
  canonicalFragmentSkillKeySet,
  canonicalResearchLevelPolicies,
} from './numericFieldManifest'
import { REALITY_WORKERS_READY_MAXIMUM_V2 } from './typesV2'
import { validateCanonicalGameStateV2 } from './validateV2'

const idb1Cases = [
  ['historical schema 8', schema08Idb1, 8, 'historical-compatibility', 'web-authored-v1'],
  ['public schema 11', support01Idb1, 11, 'certified-public-unity-schema-11', 'web-authored-v1'],
  ['historical schema 0', support02Idb1, 0, 'historical-compatibility', 'web-authored-v1'],
  ['historical schema 10', support03Idb1, 10, 'historical-compatibility', 'web-authored-v1'],
  ['development schema 12', firstRunIdb1, 12, 'non-public-schema-12', 'web-authored-v1'],
] as const
const TRUSTED_AUTHORITY = Object.freeze({
  kind: 'trusted-same-device' as const,
})

describe('one-way CanonicalGameStateV2 migration', () => {
  test.each(idb1Cases)(
    'migrates the complete $0 IDB1 fixture through PreparedSave',
    (_name, fixture, sourceSchema, schemaAuthority, tuningProfile) => {
      const prepared = prepareIdb1Save(fixture).prepared
      const before = prepared.copyValidatedState()
      const result = migratePreparedSaveToV2(prepared, TRUSTED_AUTHORITY)

      expect(result.legacyRuntimeEvidence).toMatchObject({
        sourceSchema,
        schemaAuthority,
      })
      expect(result.runtime.dysonTuningProfile).toBe(tuningProfile)
      expect(Object.values(result.runtime.dysonEvaluationSnapshot).every(
        (value) => isGameDecimal(value) && Object.isFrozen(value),
      )).toBe(true)
      expect(validateCanonicalGameStateV2(result.state)).toEqual({
        valid: true,
        errors: [],
      })
      expect(Object.isFrozen(result.state)).toBe(true)
      expect(Object.isFrozen(result.runtime)).toBe(true)
      expect(Object.isFrozen(result.runtime.dysonEvaluationSnapshot)).toBe(true)
      expect(Object.isFrozen(result.localPreferences)).toBe(true)
      expect(Object.isFrozen(result.localPlatformState)).toBe(true)
      expect(prepared.copyValidatedState()).toEqual(before)
      expect(result.state).not.toHaveProperty('compatibilityTuning')
      expect(result.state).not.toHaveProperty('skillEffectEvaluationSnapshot')
    },
  )

  test('keeps schema 11 as the sole certified public Unity authority', () => {
    const publicResult = migratePreparedSaveToV2(
      prepareIdb1Save(support01Idb1).prepared,
      TRUSTED_AUTHORITY,
    )
    const developmentResult = migratePreparedSaveToV2(
      prepareIdb1Save(firstRunIdb1).prepared,
      TRUSTED_AUTHORITY,
    )

    expect(publicResult.legacyRuntimeEvidence).toMatchObject({
      sourceSchema: 11,
      schemaAuthority: 'certified-public-unity-schema-11',
    })
    expect(developmentResult.legacyRuntimeEvidence).toMatchObject({
      sourceSchema: 12,
      schemaAuthority: 'non-public-schema-12',
    })
  })

  test('migrates the deterministic schema-12 Web fixture and round-trips schema 13', () => {
    const prepared = PreparedSave.fromDecoded(deserializeWebSave(schema12Web))
    const result = migratePreparedSaveToV2(prepared, TRUSTED_AUTHORITY)
    const encoded = encodeSchema13WebSave({
      savedAtUtc: '2000-01-01T00:00:00.000Z',
      state: result.state,
      runtime: result.runtime,
    })
    const decoded = decodeSchema13WebSave(encoded)

    expect(result.legacyRuntimeEvidence).toMatchObject({
      sourceSchema: 12,
      schemaAuthority: 'non-public-schema-12',
    })
    expect(decoded.state).toEqual(result.state)
    expect(decoded.runtime).toEqual(result.runtime)
    expect(decoded.runtime.dysonTuningProfile).toBe('web-authored-v1')
    expect(validateCanonicalGameStateV2(decoded.state).valid).toBe(true)
  })

  test('preserves the selected Skill preset through legacy migration and schema-13 round-trip', () => {
    const prepared = prepareIdb1Save(firstRunIdb1).prepared
    const candidate = prepared.copyValidatedState()
    requireRecord(candidate.dysonVerseSaveData).selectedPreset = 4
    const result = migratePreparedSaveToV2(
      prepared.withValidatedState(candidate),
      TRUSTED_AUTHORITY,
    )
    expect(result.state.skills.selectedPreset).toBe(4)
    const decoded = decodeSchema13WebSave(encodeSchema13WebSave({
      savedAtUtc: '2000-01-01T00:00:00.000Z',
      state: result.state,
      runtime: result.runtime,
    }))
    expect(decoded.state.skills.selectedPreset).toBe(4)
  })

  test('applies every numeric conversion policy without bigint narrowing', () => {
    const prepared = prepareIdb1Save(firstRunIdb1).prepared
    const candidate = prepared.copyValidatedState()
    const dyson = requireRecord(candidate.dysonVerseSaveData)
    const infinity = requireRecord(dyson.dysonVerseInfinityData)
    const prestige = requireRecord(dyson.dysonVersePrestigeData)
    const quantum = requireRecord(candidate.prestigePlus)
    const huge = 10n ** 400n

    infinity.money = 1.234567890123456e307
    infinity.assemblyLines = [0.25, 3]
    prestige.infinityPoints = huge
    prestige.spentInfinityPoints = 3n
    quantum.points = huge
    quantum.spentPoints = 7n
    const levels = requireRecord(infinity.researchLevelsById)
    const skills = requireRecord(infinity.skillStateById)
    const legacySkill = requireRecord(skills.addictionToPower)
    legacySkill.level = 7
    for (const policy of canonicalResearchLevelPolicies) {
      levels[policy.key] = policy.semanticClass === 'exact-bigint' ? 1 : 1234
    }

    const result = migratePreparedSaveToV2(
      prepared.withValidatedState(candidate),
      TRUSTED_AUTHORITY,
    )

    expect(result.state.dyson.money).toEqual(
      gameDecimalFromNumber(1.234567890123456e307),
    )
    expect(result.state.dyson.facilities.assembly_lines[0]).toEqual(
      gameDecimalFromNumber(0.25),
    )
    expect(isIntegerGameDecimal(
      result.state.dyson.facilities.assembly_lines[1],
    )).toBe(true)
    expect(result.state.infinity.availablePoints).toEqual(
      gameDecimalFromBigInt(huge - 3n),
    )
    expect(result.state.infinity.allocatedPoints).toEqual(
      gameDecimalFromBigInt(3n),
    )
    expect(result.state.quantum.availableShards).toEqual(
      gameDecimalFromBigInt(huge - 7n),
    )
    expect(result.state.quantum.lifetimeEarnedShards).toEqual(
      gameDecimalFromBigInt(huge),
    )
    expect(result.state.skills.byId.addictionToPower.level).toBe(7n)
    for (const policy of canonicalResearchLevelPolicies) {
      const level = result.state.research.levelsById[policy.key]
      if (policy.semanticClass === 'exact-bigint') expect(level).toBe(1n)
      else {
        expect(isGameDecimal(level)).toBe(true)
        if (!isGameDecimal(level)) throw new Error('Expected GameDecimal Research level.')
        expect(isIntegerGameDecimal(level)).toBe(true)
      }
    }
    expect(canonicalResearchLevelPolicies.filter((policy) => policy.semanticClass === 'exact-bigint')).toHaveLength(4)
    expect(canonicalResearchLevelPolicies.filter((policy) => policy.semanticClass === 'integer-decimal')).toHaveLength(10)
  })

  test('clamps over-spent ledgers and repairs an unknown Dream cause', () => {
    const prepared = prepareIdb1Save(firstRunIdb1).prepared
    const candidate = prepared.copyValidatedState()
    const dyson = requireRecord(candidate.dysonVerseSaveData)
    const prestige = requireRecord(dyson.dysonVersePrestigeData)
    const quantum = requireRecord(candidate.prestigePlus)
    const statistics = requireRecord(candidate.simulationStatistics)
    const lastCycle = requireRecord(statistics.lastCompletedCycle)
    prestige.infinityPoints = 2n
    prestige.spentInfinityPoints = 3n
    quantum.points = 4n
    quantum.spentPoints = 5n
    lastCycle.dreamCause = 'NotCanonical'

    const result = migratePreparedSaveToV2(
      prepared.withValidatedState(candidate),
      TRUSTED_AUTHORITY,
    )

    expect(result.state.infinity.availablePoints).toEqual(gameDecimalFromBigInt(0n))
    expect(result.state.infinity.allocatedPoints).toEqual(gameDecimalFromBigInt(3n))
    expect(result.state.quantum.availableShards).toEqual(gameDecimalFromBigInt(0n))
    expect(result.state.quantum.lifetimeEarnedShards).toEqual(gameDecimalFromBigInt(4n))
    expect(result.state.statistics.lastCompletedCycle.dreamCause).toBeNull()
    expect(result.repairs.filter((entry) => entry.phase === 'v1-to-v2').map((entry) => entry.path)).toEqual([
      '$.infinity.availablePoints',
      '$.quantum.availableShards',
      '$.statistics.lastCompletedCycle.dreamCause',
      '$.dream.railgun.pendingBaseSeconds',
      '$.dream.railgun.pendingDreamSeconds',
    ])
  })

  test('fills required navigation and railgun state from legacy defaults', () => {
    const prepared = prepareIdb1Save(firstRunIdb1).prepared
    const candidate = prepared.copyValidatedState()
    delete candidate.storyButtonToggle
    delete candidate.wikiButtonToggle
    delete candidate.statisticsButtonToggle
    const dream = requireRecord(candidate.sdSimulation)
    delete dream.railgunActiveRailguns
    delete dream.railgunReservedPanels
    delete dream.highestStoredDysonPanels

    const result = migratePreparedSaveToV2(
      prepared.withValidatedState(candidate),
      TRUSTED_AUTHORITY,
    )

    expect(result.state.meta.navigationVisibility).toEqual({
      story: false,
      wiki: false,
      statistics: false,
    })
    expect(result.state.dream.railgun).toMatchObject({
      activeRailguns: 0,
      reservedPanels: gameDecimalFromBigInt(0n),
      lastRoundsFired: 0,
      lastPanelsLaunched: gameDecimalFromBigInt(0n),
    })
    expect(result.state.dream.railgun.highestStoredPanels).toEqual(
      result.state.dream.resources.dysonPanels,
    )
  })

  test('keeps manual/shared imports under receiving local authority', () => {
    const prepared = prepareIdb1Save(schema08Idb1).prepared
    const receivingPreferences = preferencesFixture()
    const receivingPlatformState = platformFixture()
    const result = migratePreparedSaveToV2(prepared, {
      kind: 'manual-shared-import',
      receivingPreferences,
      receivingPlatformState,
    })

    expect(result.localPreferences).toEqual(receivingPreferences)
    expect(result.localPlatformState).toEqual(receivingPlatformState)
    expect(result.localPreferences).not.toBe(receivingPreferences)
    expect(result.localPlatformState).not.toBe(receivingPlatformState)
    expect(result.runtime.dysonTuningProfile).toBe('web-authored-v1')
    expect(result.runtime.dysonEvaluationSnapshot.panelsPerSecond).toEqual(
      gameDecimalFromNumber(
        result.legacyRuntimeEvidence.skillEffectEvaluationSnapshot
          .panelsPerSecond,
      ),
    )
  })

  test('recognizes the authentic schema-8 coefficient as its rank-one Secrets override', () => {
    const result = migratePreparedSaveToV2(
      prepareIdb1Save(schema08Idb1).prepared,
      TRUSTED_AUTHORITY,
    )

    expect(result.state.infinity.secretsOfTheUniverse).toBe(1n)
    expect(
      result.legacyRuntimeEvidence.compatibilityTuning
        .assemblyLineUpgradePercent,
    ).toBe(Math.fround(0.06))
    expect(result.runtime.dysonTuningProfile).toBe('web-authored-v1')
  })

  test('reapplies schema-8 Secrets once from canonical state after storing only the base profile', () => {
    const result = migratePreparedSaveToV2(
      prepareIdb1Save(schema08Idb1).prepared,
      TRUSTED_AUTHORITY,
    )

    expect(deriveDysonV2FromCauses(result.state, result.runtime)).toEqual(
      deriveDysonV2FromCauses(result.state, result.legacyRuntimeEvidence),
    )
  })

  test('accepts synthetic higher Secrets overrides and rejects vector/rank mismatches', () => {
    const prepared = prepareIdb1Save(firstRunIdb1).prepared
    const candidate = prepared.copyValidatedState()
    const dyson = requireRecord(candidate.dysonVerseSaveData)
    const infinity = requireRecord(dyson.dysonVerseInfinityData)
    const prestige = requireRecord(dyson.dysonVersePrestigeData)
    prestige.secretsOfTheUniverse = 14n
    infinity.assemblyLineUpgradePercent = Math.fround(0.12)
    infinity.serverUpgradePercent = Math.fround(0.09)
    infinity.aiManagerUpgradePercent = Math.fround(0.09)
    infinity.planetUpgradePercent = Math.fround(0.09)

    const result = migratePreparedSaveToV2(
      prepared.withValidatedState(candidate),
      TRUSTED_AUTHORITY,
    )
    expect(result.state.infinity.secretsOfTheUniverse).toBe(14n)
    expect(result.runtime.dysonTuningProfile).toBe('web-authored-v1')
    expect(deriveDysonV2FromCauses(result.state, result.runtime)).toEqual(
      deriveDysonV2FromCauses(result.state, result.legacyRuntimeEvidence),
    )

    infinity.planetUpgradePercent = Math.fround(0.06)
    expect(() => migratePreparedSaveToV2(
      prepared.withValidatedState(candidate),
      TRUSTED_AUTHORITY,
    )).toThrow(/Secrets of the Universe rank 14/i)
  })

  test('rejects a legacy tuning vector that disagrees with canonical Secrets state', () => {
    const prepared = prepareIdb1Save(firstRunIdb1).prepared
    const candidate = prepared.copyValidatedState()
    const dyson = requireRecord(candidate.dysonVerseSaveData)
    const infinity = requireRecord(dyson.dysonVerseInfinityData)
    infinity.serverUpgradePercent = 0.031

    expect(() => migratePreparedSaveToV2(
      prepared.withValidatedState(candidate),
      TRUSTED_AUTHORITY,
    )).toThrow(/does not match web-authored-v1/i)
  })

  test('extracts the exact closed local preference and platform fields for same-device migration', () => {
    const prepared = prepareIdb1Save(firstRunIdb1).prepared
    const candidate = prepared.copyValidatedState()
    const preferences = preferencesFixture()
    const platform = platformFixture()
    Object.assign(candidate, preferences, platform)

    const result = migratePreparedSaveToV2(
      prepared.withValidatedState(candidate),
      TRUSTED_AUTHORITY,
    )

    expect(result.localPreferences).toEqual(preferences)
    expect(result.localPlatformState).toEqual(platform)
    expect(Object.keys(result.localPreferences).sort()).toEqual(
      Object.keys(preferences).sort(),
    )
    expect(Object.keys(result.localPlatformState).sort()).toEqual(
      Object.keys(platform).sort(),
    )
  })

  test('repairs trusted legacy local numeric preferences and rejects invalid receiving authority', () => {
    const prepared = prepareIdb1Save(firstRunIdb1).prepared
    const candidate = prepared.copyValidatedState()
    candidate.numberFormatting = 3
    candidate.frameRate = 1_001

    const migrated = migratePreparedSaveToV2(
      prepared.withValidatedState(candidate),
      TRUSTED_AUTHORITY,
    )
    expect(migrated.localPreferences).toMatchObject({
      numberFormatting: 0,
      frameRate: 0,
    })
    expect(migrated.repairs.map((entry) => entry.path)).toEqual(
      expect.arrayContaining([
        '$.localPreferences.numberFormatting',
        '$.localPreferences.frameRate',
      ]),
    )

    expect(() => migratePreparedSaveToV2(prepared, {
      kind: 'manual-shared-import',
      receivingPreferences: {
        ...preferencesFixture(),
        numberFormatting: 3,
      },
      receivingPlatformState: platformFixture(),
    })).toThrow('numberFormatting')
    expect(() => migratePreparedSaveToV2(prepared, {
      kind: 'manual-shared-import',
      receivingPreferences: {
        ...preferencesFixture(),
        frameRate: 1_001,
      },
      receivingPlatformState: platformFixture(),
    })).toThrow('frameRate')
  })

  test('exports no V2-to-schema12 reverse mapping', () => {
    expect(Object.keys(mappingV2Exports)).toEqual(['migratePreparedSaveToV2'])
  })

  test('requires the caller to select migration authority explicitly', () => {
    const prepared = prepareIdb1Save(firstRunIdb1).prepared
    const compileTimeOmission = () => {
      // @ts-expect-error Authority is deliberately mandatory.
      migratePreparedSaveToV2(prepared)
    }
    void compileTimeOmission

    expect(() => (
      migratePreparedSaveToV2 as unknown as (
        input: PreparedSave,
        authority?: unknown,
      ) => unknown
    )(prepared)).toThrow('authority must be explicitly selected')
  })

  test('repairs exact derived and authored invariants without mutating the source', () => {
    const prepared = prepareIdb1Save(firstRunIdb1).prepared
    const candidate = prepared.copyValidatedState()
    const dyson = requireRecord(candidate.dysonVerseSaveData)
    const infinity = requireRecord(dyson.dysonVerseInfinityData)
    const skillTree = requireRecord(dyson.dysonVerseSkillTreeData)
    const skillStates = requireRecord(infinity.skillStateById)
    const reality = requireRecord(candidate.saveData)
    const dream = requireRecord(candidate.sdPrestige)

    infinity.goalSetter = 11n
    skillTree.fragments = 99n
    const ownedFragmentId = canonicalFragmentSkillKeySet[0]!
    const ownedFragment = requireRecord(skillStates[ownedFragmentId])
    ownedFragment.owned = true
    reality.workersReadyToGo = REALITY_WORKERS_READY_MAXIMUM_V2 + 1n
    dream.disasterStage = 41n
    const before = structuredClone(candidate)

    const result = migratePreparedSaveToV2(
      prepared.withValidatedState(candidate),
      TRUSTED_AUTHORITY,
    )

    expect(result.state.dyson.goalStage).toBe(10n)
    expect(result.state.skills.fragments).toBe(1n)
    expect(result.state.reality.workersReady).toBe(REALITY_WORKERS_READY_MAXIMUM_V2)
    expect(result.state.dream.disasterStage).toBe(0n)
    expect(candidate).toEqual(before)
    expect(result.repairs.map((entry) => entry.path)).toEqual(
      expect.arrayContaining([
        '$.dyson.goalStage',
        '$.skills.fragments',
        '$.reality.workersReady',
        '$.dream.disasterStage',
      ]),
    )
  })

  test('repairs stored-time capacity, available time, and the independent Double Time cap', () => {
    const prepared = prepareIdb1Save(firstRunIdb1).prepared
    const candidate = prepared.copyValidatedState()
    const dream = requireRecord(candidate.sdPrestige)
    candidate.maxOfflineTime = 0
    candidate.offlineTime = STORED_TIME_MAXIMUM_SECONDS
    dream.doubleTime = STORED_TIME_MAXIMUM_SECONDS + 1

    const result = migratePreparedSaveToV2(
      prepared.withValidatedState(candidate),
      TRUSTED_AUTHORITY,
    )

    expect(result.state.timeline.storedTimeCapacitySeconds).toBe(
      DEFAULT_STORED_TIME_CAPACITY_SECONDS,
    )
    expect(result.state.timeline.storedTimeAvailableSeconds).toBe(
      DEFAULT_STORED_TIME_CAPACITY_SECONDS,
    )
    expect(result.state.timeline.doubleTime.bankSeconds).toBe(
      STORED_TIME_MAXIMUM_SECONDS,
    )
    expect(result.repairs.map((entry) => entry.path)).toEqual(
      expect.arrayContaining([
        '$.timeline.storedTimeCapacitySeconds',
        '$.timeline.storedTimeAvailableSeconds',
        '$.timeline.doubleTime.bankSeconds',
      ]),
    )
  })
})

function preferencesFixture(): V2LocalPreferences {
  return {
    globalMute: true,
    screensaverEnabled: false,
    hidePurchased: false,
    buyMax: true,
    numberFormatting: 2,
    skillsBuyOnTap: true,
    frameRate: 120,
    botsButtonToggle: true,
    researchbuttonToggle: false,
    skillsButtonToggle: true,
    skillsFirstRunDone: true,
    infinityButtonToggle: false,
    infinityFirstRunDone: true,
    realityButtonToggle: false,
    realityFirstRun: true,
    simulationsButtonToggle: false,
    prestigeButtonToggle: true,
    prestigeFirstRun: true,
    settingsButtonToggle: false,
    firstReality: true,
  }
}

function platformFixture(): V2LocalPlatformState {
  return {
    debugOptions: true,
    debugEverEnabled: true,
    cheater: false,
    unlockAllTabs: true,
  }
}
