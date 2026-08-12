import { describe, expect, test } from 'vitest'

import {
  deriveExpectedLegacyDysonTuningV2,
  DYSON_TUNING_PROFILES_V2,
  DYSON_TUNING_PROFILE_IDS,
  resolveDysonTuningProfileV2,
  selectDysonTuningProfileV2,
} from './dysonTuningV2'

const AUTHORED_VECTOR = Object.freeze({
  panelsPerSecMulti: 1,
  scienceBoostPercent: 0.05,
  moneyMultiUpgradePercent: 0.05,
  assemblyLineUpgradePercent: 0.03,
  aiManagerUpgradePercent: 0.03,
  serverUpgradePercent: 0.03,
  dataCenterUpgradePercent: 0.03,
  planetUpgradePercent: 0.03,
  matrioshkaUpgradePercent: 0.03,
  birchUpgradePercent: 0.03,
  galacticUpgradePercent: 0.03,
})

describe('Web-native Dyson V2 tuning profiles', () => {
  test('freezes the exact Unity-authored defaults as a closed eleven-field profile', () => {
    expect(DYSON_TUNING_PROFILE_IDS).toEqual(['web-authored-v1'])
    expect(DYSON_TUNING_PROFILES_V2['web-authored-v1']).toEqual(
      AUTHORED_VECTOR,
    )
    expect(Object.keys(DYSON_TUNING_PROFILES_V2['web-authored-v1']))
      .toHaveLength(11)
    expect(Object.isFrozen(DYSON_TUNING_PROFILES_V2)).toBe(true)
    expect(Object.values(DYSON_TUNING_PROFILES_V2).every(Object.isFrozen))
      .toBe(true)
  })

  test('derives every rank 0..27 coefficient vector using Unity float-cast override thresholds', () => {
    for (let rank = 0; rank <= 27; rank += 1) {
      const expected = Object.freeze({
        ...AUTHORED_VECTOR,
        assemblyLineUpgradePercent: rank >= 12
          ? Math.fround(0.12)
          : rank >= 4
            ? Math.fround(0.09)
            : rank >= 1
              ? Math.fround(0.06)
              : 0.03,
        aiManagerUpgradePercent: rank >= 13
          ? Math.fround(0.09)
          : rank >= 5
            ? Math.fround(0.06)
            : 0.03,
        serverUpgradePercent: rank >= 9
          ? Math.fround(0.09)
          : rank >= 3
            ? Math.fround(0.06)
            : 0.03,
        planetUpgradePercent: rank >= 14
          ? Math.fround(0.09)
          : rank >= 7
            ? Math.fround(0.06)
            : 0.03,
      })
      const derived = deriveExpectedLegacyDysonTuningV2(BigInt(rank))

      expect(derived, `Secrets rank ${rank}`).toEqual(expected)
      expect(Object.isFrozen(derived)).toBe(true)
      expect(selectDysonTuningProfileV2(expected, BigInt(rank)))
        .toBe('web-authored-v1')
    }
  })

  test('identifies schema-8 assembly tuning as the rank-one state override, not a base profile', () => {
    const rankOne = deriveExpectedLegacyDysonTuningV2(1n)
    expect(rankOne).toEqual({
      ...AUTHORED_VECTOR,
      assemblyLineUpgradePercent: 0.05999999865889549,
    })
    expect(selectDysonTuningProfileV2(rankOne, 1n)).toBe('web-authored-v1')
    expect(() => selectDysonTuningProfileV2(rankOne, 0n))
      .toThrow(/Secrets of the Universe rank 0/i)
    expect(() => selectDysonTuningProfileV2(AUTHORED_VECTOR, 1n))
      .toThrow(/Secrets of the Universe rank 1/i)
  })

  test('fails closed for unknown vectors, ranks, and profile identifiers', () => {
    expect(() => selectDysonTuningProfileV2({
      ...AUTHORED_VECTOR,
      assemblyLineUpgradePercent: 0.04,
    }, 0n)).toThrow(/does not match web-authored-v1/i)
    expect(() => deriveExpectedLegacyDysonTuningV2(-1n)).toThrow(/between 0 and 27/i)
    expect(() => deriveExpectedLegacyDysonTuningV2(28n)).toThrow(/between 0 and 27/i)
    expect(() => deriveExpectedLegacyDysonTuningV2(1 as never)).toThrow(/bigint/i)
    expect(() => resolveDysonTuningProfileV2(
      'future-open-profile' as never,
    )).toThrow(/unknown Dyson V2 tuning profile/i)
  })

  test('rejects malformed or accessor-backed vectors without invoking getters', () => {
    const withExtra = { ...AUTHORED_VECTOR, extra: 1 }
    expect(() => selectDysonTuningProfileV2(withExtra, 0n)).toThrow(/exactly eleven/i)

    const withMissing = { ...AUTHORED_VECTOR } as Record<string, unknown>
    delete withMissing.serverUpgradePercent
    expect(() => selectDysonTuningProfileV2(withMissing as never, 0n))
      .toThrow(/exactly eleven/i)

    const withGetter = { ...AUTHORED_VECTOR } as Record<string, unknown>
    let reads = 0
    Object.defineProperty(withGetter, 'panelsPerSecMulti', {
      enumerable: true,
      get() {
        reads += 1
        return 1
      },
    })
    expect(() => selectDysonTuningProfileV2(withGetter as never, 0n))
      .toThrow(/numeric data fields/i)
    expect(reads).toBe(0)
  })
})
