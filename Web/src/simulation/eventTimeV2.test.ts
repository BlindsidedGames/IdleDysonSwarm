import { describe, expect, test } from 'vitest'

import {
  GAME_DECIMAL_ZERO,
  addGameDecimals,
  compareGameDecimals,
  gameDecimalFromCanonicalString,
  gameDecimalFromNumber,
  gameDecimalToCanonicalString,
} from '../math/gameDecimal'
import {
  V2_EVENT_BOUNDARY_ORDER,
  V2_MAXIMUM_EVENT_HORIZON_CANDIDATES,
  advanceV2PeriodicClock,
  deriveV2LinearEventHorizon,
  requireV2DueEventProgress,
  resolveV2EventSlice,
  type V2EventHorizonCandidate,
} from './eventTimeV2'

function candidates(
  ...values: readonly V2EventHorizonCandidate[]
): readonly Readonly<V2EventHorizonCandidate>[] {
  return Object.freeze(values.map((value) => Object.freeze(value)))
}

describe('dormant V2 event-time primitives', () => {
  test('derives scalable linear horizons without number narrowing', () => {
    const huge = deriveV2LinearEventHorizon(
      gameDecimalFromCanonicalString('1e500'),
      gameDecimalFromCanonicalString('3e500'),
      gameDecimalFromNumber(2),
    )
    expect(gameDecimalToCanonicalString(huge!)).toBe('1e500')
    expect(deriveV2LinearEventHorizon(
      gameDecimalFromNumber(2),
      gameDecimalFromNumber(1),
      gameDecimalFromNumber(1),
    )).toBe(GAME_DECIMAL_ZERO)
    expect(deriveV2LinearEventHorizon(
      gameDecimalFromNumber(0),
      gameDecimalFromNumber(1),
      GAME_DECIMAL_ZERO,
    )).toBeNull()
  })

  test('compares before upward conversion for tiny, beyond-slice, exact, and huge horizons', () => {
    const tiny = resolveV2EventSlice(
      candidates({ id: 'tiny', horizon: gameDecimalFromCanonicalString('1e-30') }),
      1,
    )
    expect(tiny).toMatchObject({ seconds: 1e-12, reached: true, dueEventIds: ['tiny'] })

    const subMinimumSlice = resolveV2EventSlice(
      candidates({ id: 'tiny', horizon: gameDecimalFromCanonicalString('1e-30') }),
      5e-13,
    )
    expect(subMinimumSlice).toMatchObject({ seconds: 5e-13, reached: false, dueEventIds: [] })

    expect(resolveV2EventSlice(
      candidates({ id: 'later', horizon: gameDecimalFromNumber(2) }),
      1,
    )).toMatchObject({ seconds: 1, reached: false, dueEventIds: [] })
    expect(resolveV2EventSlice(
      candidates({ id: 'boundary', horizon: gameDecimalFromNumber(1) }),
      1,
    )).toMatchObject({ seconds: 1, reached: true, dueEventIds: ['boundary'] })
    expect(resolveV2EventSlice(
      candidates({ id: 'huge', horizon: gameDecimalFromCanonicalString('1e500') }),
      Number.MAX_VALUE,
    )).toMatchObject({ seconds: Number.MAX_VALUE, reached: false, dueEventIds: [] })

    const horizon = gameDecimalFromCanonicalString('2.993601483643416e-11')
    const upward = resolveV2EventSlice(candidates({ id: 'upward', horizon }), 1)
    expect(upward.reached).toBe(true)
    expect(compareGameDecimals(gameDecimalFromNumber(upward.seconds), horizon)).toBeGreaterThanOrEqual(0)
  })

  test('preserves coincident input order and the established V1 boundary phase order', () => {
    const result = resolveV2EventSlice(candidates(
      { id: 'model', horizon: gameDecimalFromNumber(1) },
      { id: 'input', horizon: gameDecimalFromNumber(1) },
      { id: 'automation', horizon: gameDecimalFromNumber(1) },
    ), 1)
    expect(result.dueEventIds).toEqual(['model', 'input', 'automation'])
    expect(V2_EVENT_BOUNDARY_ORDER).toEqual([
      'production-arrival',
      'queued-input',
      'automation',
      'derived-timers-and-double-time',
      'dream-reset',
      'bot-cap-transition',
      'infinity-reset',
    ])
  })

  test('fails a due-now event that makes no represented progress', () => {
    const due = resolveV2EventSlice(
      candidates({ id: 'due', horizon: GAME_DECIMAL_ZERO }),
      1,
    )
    expect(due.seconds).toBe(0)
    expect(() => requireV2DueEventProgress(due, false)).toThrow(
      'V2_ZERO_TIME_EVENT_NO_PROGRESS',
    )
    expect(() => requireV2DueEventProgress(due, true)).not.toThrow()
  })

  test('captures a bounded frozen closed candidate list without invoking accessors', () => {
    let getterCalls = 0
    const hostile = Object.freeze(Object.defineProperty({
      id: 'hostile',
    }, 'horizon', {
      configurable: false,
      enumerable: true,
      get: () => {
        getterCalls += 1
        return GAME_DECIMAL_ZERO
      },
    }))
    expect(() => resolveV2EventSlice(Object.freeze([hostile]) as never, 1)).toThrow(
      'data properties',
    )
    expect(getterCalls).toBe(0)
    expect(() => resolveV2EventSlice(
      Object.freeze(Array.from(
        { length: V2_MAXIMUM_EVENT_HORIZON_CANDIDATES + 1 },
        (_, index) => Object.freeze({ id: index.toString(), horizon: null }),
      )),
      1,
    )).toThrow('count')
    expect(() => resolveV2EventSlice([], 1)).toThrow('frozen candidate array')
    expect(() => resolveV2EventSlice(candidates(
      { id: '', horizon: null },
    ), 1)).toThrow('non-empty and unique')
    expect(() => resolveV2EventSlice(candidates(
      { id: 'duplicate', horizon: null },
      { id: 'duplicate', horizon: null },
    ), 1)).toThrow('non-empty and unique')
    expect(() => resolveV2EventSlice(candidates(
      { id: 42 as never, horizon: null },
    ), 1)).toThrow('non-empty and unique')
  })

  test('advances periodic catch-up with bounded Decimal quotient/remainder work', () => {
    const exact = advanceV2PeriodicClock(
      GAME_DECIMAL_ZERO,
      gameDecimalFromNumber(2),
      10,
    )
    expect(gameDecimalToCanonicalString(exact.completedCycles)).toBe('5e0')
    expect(exact.remainderSeconds).toEqual(GAME_DECIMAL_ZERO)

    const enormous = advanceV2PeriodicClock(
      GAME_DECIMAL_ZERO,
      gameDecimalFromCanonicalString('1e-500'),
      1,
    )
    expect(gameDecimalToCanonicalString(enormous.completedCycles)).toBe('1e500')
    expect(enormous.remainderSeconds).toEqual(GAME_DECIMAL_ZERO)

    const tinySlice = advanceV2PeriodicClock(
      GAME_DECIMAL_ZERO,
      gameDecimalFromNumber(1),
      5e-13,
    )
    expect(tinySlice.completedCycles).toEqual(GAME_DECIMAL_ZERO)
    expect(gameDecimalToCanonicalString(tinySlice.remainderSeconds)).toBe('5e-13')
  })

  test('is deterministic across exact periodic slice partitions', () => {
    const whole = advanceV2PeriodicClock(
      GAME_DECIMAL_ZERO,
      gameDecimalFromNumber(7),
      10,
    )
    const first = advanceV2PeriodicClock(
      GAME_DECIMAL_ZERO,
      gameDecimalFromNumber(7),
      4,
    )
    const second = advanceV2PeriodicClock(
      first.remainderSeconds,
      gameDecimalFromNumber(7),
      6,
    )
    expect(second.remainderSeconds).toEqual(whole.remainderSeconds)
    expect(addGameDecimals(first.completedCycles, second.completedCycles)).toEqual(
      whole.completedCycles,
    )
  })

  test('fails closed when a positive periodic slice has no represented effect', () => {
    expect(() => advanceV2PeriodicClock(
      gameDecimalFromCanonicalString('1e500'),
      gameDecimalFromCanonicalString('2e500'),
      1,
    )).toThrow('V2_PERIODIC_CLOCK_NO_REPRESENTED_PROGRESS')
    expect(() => resolveV2EventSlice(candidates(), 0)).toThrow('finite and positive')
  })
})
