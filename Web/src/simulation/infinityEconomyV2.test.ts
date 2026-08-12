import { describe, expect, test } from 'vitest'

import schema12Web from '../../test/fixtures/schema-12-canonical-idsweb1-first-run.txt?raw'
import { cloneCanonicalGameStateV2 } from '../game-state/cloneV2'
import { migratePreparedSaveToV2 } from '../game-state/mappingV2'
import type { CanonicalGameStateV2 } from '../game-state/typesV2'
import { issueInfinityRewardAuthorityV2ForApplication } from '../application/infinityRewardAuthorityV2'
import {
  gameDecimalFromCanonicalString,
  gameDecimalToCanonicalString,
} from '../math/gameDecimal'
import { PreparedSave } from '../save/prepare'
import { deserializeWebSave } from '../save/serialization'
import {
  consumeInfinityBoundaryEvaluationV2ForReset,
  infinityProductionHorizonV2,
  prepareInfinityBoundaryEvaluationV2ForReset,
  ordinaryInfinityBotThresholdV2,
  quoteInfinityBoundaryV2,
  quoteInfinityResetBoundaryV2,
  rederiveInfinityBoundaryV2,
} from './infinityEconomyV2'

const MIGRATION = migratePreparedSaveToV2(
  PreparedSave.fromDecoded(deserializeWebSave(schema12Web)),
  Object.freeze({ kind: 'trusted-same-device' as const }),
)
const MIGRATED = MIGRATION.state

function stateWith(options: Readonly<{
  bots?: string
  divisions?: bigint
  breakTarget?: string
  breakTheLoop?: boolean
  quantumDouble?: boolean
}> = {}): CanonicalGameStateV2 {
  return cloneCanonicalGameStateV2({
    ...MIGRATED,
    dyson: {
      ...MIGRATED.dyson,
      bots: options.bots === undefined
        ? MIGRATED.dyson.bots
        : gameDecimalFromCanonicalString(options.bots),
    },
    infinity: {
      ...MIGRATED.infinity,
      breakTarget: options.breakTarget === undefined
        ? MIGRATED.infinity.breakTarget
        : gameDecimalFromCanonicalString(options.breakTarget),
    },
    quantum: {
      ...MIGRATED.quantum,
      divisionsPurchased: options.divisions ?? MIGRATED.quantum.divisionsPurchased,
      unlocks: {
        ...MIGRATED.quantum.unlocks,
        breakTheLoop: options.breakTheLoop ?? false,
        doubleInfinityPoints: options.quantumDouble ?? false,
      },
    },
    timeline: {
      ...MIGRATED.timeline,
      infinityCycleSeconds: 1 / 60,
    },
  })
}

describe('Infinity economy V2', () => {
  test('uses the closed Web-authored fractional threshold through all Divisions', () => {
    expect(gameDecimalToCanonicalString(ordinaryInfinityBotThresholdV2(0n)))
      .toBe('4.2e19')
    expect(gameDecimalToCanonicalString(ordinaryInfinityBotThresholdV2(19n)))
      .toBe('4.2e0')
    expect(() => ordinaryInfinityBotThresholdV2(20n)).toThrow(/0\.\.19/u)

    const below = quoteInfinityBoundaryV2(
      stateWith({ bots: '4.19e0', divisions: 19n }),
      0,
      issueInfinityRewardAuthorityV2ForApplication(Object.freeze({ doubleInfinityPoints: false })),
    )
    expect(below.ready).toBe(false)
    const ready = quoteInfinityBoundaryV2(
      stateWith({ bots: '4.2e0', divisions: 19n }),
      0,
      issueInfinityRewardAuthorityV2ForApplication(Object.freeze({ doubleInfinityPoints: false })),
    )
    expect(ready.ready).toBe(true)
  })

  test('combines only issued permanent authority with state-owned Quantum Double-IP', () => {
    const state = stateWith({ bots: '4.2e19' })
    expect(gameDecimalToCanonicalString(
      quoteInfinityBoundaryV2(
        state,
        7,
        issueInfinityRewardAuthorityV2ForApplication(Object.freeze({ doubleInfinityPoints: false })),
      ).reward,
    )).toBe('1e0')
    expect(gameDecimalToCanonicalString(
      quoteInfinityBoundaryV2(
        stateWith({ bots: '4.2e19', quantumDouble: true }),
        7,
        issueInfinityRewardAuthorityV2ForApplication(Object.freeze({ doubleInfinityPoints: true })),
      ).reward,
    )).toBe('4e0')
    expect(() => quoteInfinityBoundaryV2(
      state,
      7,
      Object.freeze({ permanentDoubleIp: true }),
    )).toThrow(/not issued/u)
  })

  test('shares Decimal geometric arithmetic for huge break thresholds', () => {
    const quote = quoteInfinityBoundaryV2(
      stateWith({
        bots: '1e1000',
        divisions: 19n,
        breakTarget: '1e3',
        breakTheLoop: true,
      }),
      3,
      issueInfinityRewardAuthorityV2ForApplication(Object.freeze({ doubleInfinityPoints: false })),
    )
    expect(quote.ready).toBe(true)
    expect(quote.requiredBots.exponent).toBeGreaterThan(308)
    expect(quote.reward.exponent).toBeGreaterThan(2)
  })

  test('returns Decimal horizons without requiring integer bots', () => {
    expect(gameDecimalToCanonicalString(infinityProductionHorizonV2(
      gameDecimalFromCanonicalString('2.1e0'),
      gameDecimalFromCanonicalString('1e0'),
      gameDecimalFromCanonicalString('4.2e0'),
    )!)).toBe('2.1e0')
    expect(infinityProductionHorizonV2(
      gameDecimalFromCanonicalString('2.1e0'),
      gameDecimalFromCanonicalString('0'),
      gameDecimalFromCanonicalString('4.2e0'),
    )).toBeNull()
  })

  test('rejects forged and stale-shaped boundary evaluations', () => {
    const state = stateWith({ bots: '4.2e19' })
    const quote = quoteInfinityBoundaryV2(
      state,
      4,
      issueInfinityRewardAuthorityV2ForApplication(Object.freeze({ doubleInfinityPoints: false })),
    )
    expect(rederiveInfinityBoundaryV2(quote)).toEqual(quote)
    expect(() => rederiveInfinityBoundaryV2(Object.freeze({ ...quote })))
      .toThrow(/not issued/u)
    expect(() => quoteInfinityBoundaryV2(
      state,
      Number.MAX_SAFE_INTEGER + 1,
      issueInfinityRewardAuthorityV2ForApplication(Object.freeze({ doubleInfinityPoints: false })),
    )).toThrow(/revision/u)
  })

  test('captures an immutable state snapshot for authentic rederivation', () => {
    const valid = stateWith({ bots: '4.2e19' })
    const mutable = {
      ...valid,
      dyson: { ...valid.dyson },
    } as CanonicalGameStateV2 & {
      dyson: { bots: CanonicalGameStateV2['dyson']['bots'] }
    }
    const quote = quoteInfinityBoundaryV2(
      mutable,
      2,
      issueInfinityRewardAuthorityV2ForApplication(Object.freeze({ doubleInfinityPoints: false })),
    )
    mutable.dyson.bots = gameDecimalFromCanonicalString('0')
    expect(rederiveInfinityBoundaryV2(quote)).toEqual(quote)
  })

  test('claims a ready reset evaluation once against the exact revision-bound state', () => {
    const base = stateWith({ bots: '4.2e19' })
    const state = cloneCanonicalGameStateV2({
      ...base,
      timeline: { ...base.timeline, infinityCycleSeconds: 1 / 60 },
    })
    const authority = issueInfinityRewardAuthorityV2ForApplication(
      Object.freeze({ doubleInfinityPoints: false }),
    )
    const quote = quoteInfinityResetBoundaryV2(state, MIGRATION.runtime, 9, authority)
    expect(prepareInfinityBoundaryEvaluationV2ForReset(
      quote, state, MIGRATION.runtime, 9,
    )).toEqual(quote)
    consumeInfinityBoundaryEvaluationV2ForReset(quote)
    expect(() => prepareInfinityBoundaryEvaluationV2ForReset(
      quote, state, MIGRATION.runtime, 9,
    ))
      .toThrow(/already consumed/u)

    const stale = quoteInfinityResetBoundaryV2(state, MIGRATION.runtime, 9, authority)
    expect(() => prepareInfinityBoundaryEvaluationV2ForReset(
      stale, state, MIGRATION.runtime, 10,
    ))
      .toThrow(/stale/u)
    const changed = cloneCanonicalGameStateV2({
      ...state,
      skills: { ...state.skills, points: state.skills.points + 1n },
    })
    expect(() => prepareInfinityBoundaryEvaluationV2ForReset(
      stale, changed, MIGRATION.runtime, 9,
    ))
      .toThrow(/does not match/u)
    expect(() => prepareInfinityBoundaryEvaluationV2ForReset(
      Object.freeze({ ...stale }),
      state,
      MIGRATION.runtime,
      9,
    )).toThrow(/not issued/u)
  })

})
