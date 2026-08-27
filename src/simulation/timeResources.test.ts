import { describe, expect, test } from 'vitest'
import {
  applyAwayTimeGrant,
  clampDoubleTimeRate,
  DEFAULT_STORED_TIME_CAPACITY_SECONDS,
  repairStoredTimeState,
  resolveAwayTime,
  STORED_TIME_MAXIMUM_SECONDS,
  upgradeStoredTimeCapacity,
  type ParsedUtcTimestamp,
} from './timeResources'

const missing = { status: 'missing' } as const
const invalid = { status: 'invalid' } as const
const valid = (utcMilliseconds: number): ParsedUtcTimestamp => ({
  status: 'valid',
  utcMilliseconds,
})

describe('away-time resolution parity', () => {
  test('a missing quit timestamp grants nothing and does not consume anything', () => {
    const result = resolveAwayTime({
      nowUtcMilliseconds: 20_000,
      quitTimestamp: missing,
      startedTimestamp: valid(1_000),
    })

    expect(result).toEqual({
      source: 'missing_quit_timestamp',
      resolvedStartUtcMilliseconds: 20_000,
      nowUtcMilliseconds: 20_000,
      rawSeconds: 0,
      grantedSeconds: 0,
      hasQuitTimestampInput: false,
      shouldConsumeQuitTimestamp: false,
      cheater: false,
    })
  })

  test('uses a valid quit timestamp before the started timestamp', () => {
    const result = resolveAwayTime({
      nowUtcMilliseconds: 20_000,
      quitTimestamp: valid(5_000),
      startedTimestamp: valid(1_000),
    })

    expect(result.source).toBe('quit_timestamp')
    expect(result.rawSeconds).toBe(15)
    expect(result.grantedSeconds).toBe(15)
    expect(result.shouldConsumeQuitTimestamp).toBe(true)
  })

  test('an explicitly invalid quit timestamp falls back to started time', () => {
    const result = resolveAwayTime({
      nowUtcMilliseconds: 20_000,
      quitTimestamp: invalid,
      startedTimestamp: valid(2_000),
    })

    expect(result.source).toBe('started_timestamp_fallback')
    expect(result.rawSeconds).toBe(18)
    expect(result.grantedSeconds).toBe(18)
  })

  test('invalid quit and started timestamps fall back to now', () => {
    const result = resolveAwayTime({
      nowUtcMilliseconds: 20_000,
      quitTimestamp: invalid,
      startedTimestamp: invalid,
    })

    expect(result.source).toBe('runtime_utc_fallback')
    expect(result.resolvedStartUtcMilliseconds).toBe(20_000)
    expect(result.grantedSeconds).toBe(0)
    expect(result.shouldConsumeQuitTimestamp).toBe(true)
  })

  test('backward clock movement grants zero and marks comparison integrity', () => {
    const result = resolveAwayTime({
      nowUtcMilliseconds: 20_000,
      quitTimestamp: valid(25_000),
      startedTimestamp: invalid,
    })

    expect(result.rawSeconds).toBe(-5)
    expect(result.grantedSeconds).toBe(0)
    expect(result.cheater).toBe(true)
  })

  test('rejects non-finite explicit timestamp values', () => {
    expect(() =>
      resolveAwayTime({
        nowUtcMilliseconds: Number.NaN,
        quitTimestamp: valid(0),
        startedTimestamp: missing,
      }),
    ).toThrow(RangeError)
    expect(() =>
      resolveAwayTime({
        nowUtcMilliseconds: 0,
        quitTimestamp: valid(Number.POSITIVE_INFINITY),
        startedTimestamp: missing,
      }),
    ).toThrow(RangeError)
  })
})

describe('stored-time grant and capacity parity', () => {
  test('repairs invalid capacity to one day and invalid bank to zero', () => {
    const result = repairStoredTimeState({
      bankSeconds: Number.NaN,
      capacitySeconds: -1,
      cheater: false,
    })

    expect(result.capacitySeconds).toBe(
      DEFAULT_STORED_TIME_CAPACITY_SECONDS,
    )
    expect(result.bankSeconds).toBe(0)
    expect(result.capacityRepaired).toBe(true)
    expect(result.bankRepaired).toBe(true)
    expect(result.cheater).toBe(false)
  })

  test('repairs positive-infinite capacity and bank at the finite numeric ceiling', () => {
    const result = repairStoredTimeState({
      bankSeconds: Number.POSITIVE_INFINITY,
      capacitySeconds: Number.POSITIVE_INFINITY,
      cheater: false,
    })

    expect(result.capacitySeconds).toBe(STORED_TIME_MAXIMUM_SECONDS)
    expect(result.bankSeconds).toBe(STORED_TIME_MAXIMUM_SECONDS)
    expect(result.cheater).toBe(true)
  })

  test('credits only the available Stored Time capacity and clears the retired Dream bank', () => {
    const result = applyAwayTimeGrant({
      awaySeconds: 40,
      bankSeconds: 80,
      capacitySeconds: 100,
      dreamDoubleTimeBankSeconds: 10,
      cheater: false,
    })

    expect(result.storedTimeCreditedSeconds).toBe(20)
    expect(result.bankSeconds).toBe(100)
    expect(result.dreamDoubleTimeBankSeconds).toBe(0)
  })

  test('a full Stored Time bank discards excess away time and clears the retired Dream bank', () => {
    const result = applyAwayTimeGrant({
      awaySeconds: 40,
      bankSeconds: 100,
      capacitySeconds: 100,
      dreamDoubleTimeBankSeconds: 10,
      cheater: false,
    })

    expect(result.storedTimeCreditedSeconds).toBe(0)
    expect(result.bankSeconds).toBe(100)
    expect(result.dreamDoubleTimeBankSeconds).toBe(0)
  })

  test('invalid and backward durations grant zero, with only backward time flagged', () => {
    const invalidResult = applyAwayTimeGrant({
      awaySeconds: Number.NaN,
      bankSeconds: 10,
      capacitySeconds: 100,
      dreamDoubleTimeBankSeconds: 20,
      cheater: false,
    })
    const backwardResult = applyAwayTimeGrant({
      awaySeconds: -1,
      bankSeconds: 10,
      capacitySeconds: 100,
      dreamDoubleTimeBankSeconds: 20,
      cheater: false,
    })

    expect(invalidResult.bankSeconds).toBe(10)
    expect(invalidResult.dreamDoubleTimeBankSeconds).toBe(0)
    expect(invalidResult.cheater).toBe(false)
    expect(backwardResult.bankSeconds).toBe(10)
    expect(backwardResult.dreamDoubleTimeBankSeconds).toBe(0)
    expect(backwardResult.cheater).toBe(true)
  })

  test('upgrades only from a full bank, consumes it, and keeps doubling without a gameplay cap', () => {
    expect(
      upgradeStoredTimeCapacity({
        bankSeconds: 99,
        capacitySeconds: 100,
        cheater: false,
      }).upgraded,
    ).toBe(false)

    const doubled = upgradeStoredTimeCapacity({
      bankSeconds: 100,
      capacitySeconds: 100,
      cheater: false,
    })
    expect(doubled.upgraded).toBe(true)
    expect(doubled.bankSeconds).toBe(0)
    expect(doubled.capacitySeconds).toBe(200)

    const beyondLegacyCap = upgradeStoredTimeCapacity({
      bankSeconds: 30_000_000,
      capacitySeconds: 30_000_000,
      cheater: false,
    })
    expect(beyondLegacyCap.upgraded).toBe(true)
    expect(beyondLegacyCap.capacitySeconds).toBe(60_000_000)
    expect(beyondLegacyCap.maximumReached).toBe(false)

    const numericCeiling = upgradeStoredTimeCapacity({
      bankSeconds: STORED_TIME_MAXIMUM_SECONDS / 2,
      capacitySeconds: STORED_TIME_MAXIMUM_SECONDS / 2,
      cheater: false,
    })
    expect(numericCeiling.upgraded).toBe(true)
    expect(numericCeiling.capacitySeconds).toBe(STORED_TIME_MAXIMUM_SECONDS)
    expect(numericCeiling.maximumReached).toBe(true)
  })
})

describe('legacy Double Time rate validation', () => {
  test('clamps the integer rate to 0 through 10', () => {
    expect(clampDoubleTimeRate(-4)).toBe(0)
    expect(clampDoubleTimeRate(3.9)).toBe(3)
    expect(clampDoubleTimeRate(12)).toBe(10)
    expect(clampDoubleTimeRate(Number.NaN)).toBe(0)
  })
})
