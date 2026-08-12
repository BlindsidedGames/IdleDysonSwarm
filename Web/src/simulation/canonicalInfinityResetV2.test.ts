import { describe, expect, test } from 'vitest'

import schema12Web from '../../test/fixtures/schema-12-canonical-idsweb1-first-run.txt?raw'
import { issueInfinityRewardAuthorityV2ForApplication } from '../application/infinityRewardAuthorityV2'
import { cloneCanonicalGameStateV2 } from '../game-state/cloneV2'
import { migratePreparedSaveToV2 } from '../game-state/mappingV2'
import type { CanonicalGameStateV2 } from '../game-state/typesV2'
import {
  gameDecimalFromCanonicalString,
  gameDecimalToCanonicalString,
} from '../math/gameDecimal'
import { PreparedSave } from '../save/prepare'
import { deserializeWebSave } from '../save/serialization'
import {
  commitCanonicalInfinityResetV2,
  commitPreparedCanonicalInfinityResetV2,
  infinityBoundaryCountdownSecondsV2,
  quotePreparedCanonicalInfinityResetV2,
  registerCanonicalPreparedInfinityResetAuthorityV2ForStoredTime,
} from './canonicalInfinityResetV2'
import { deriveDysonV2FromCauses } from './dysonV2Derivation'
import { quoteInfinityResetBoundaryV2 } from './infinityEconomyV2'
import { RESEARCH_V2_IDS } from './researchV2'

const MIGRATION = migratePreparedSaveToV2(
  PreparedSave.fromDecoded(deserializeWebSave(schema12Web)),
  Object.freeze({ kind: 'trusted-same-device' as const }),
)
const AUTHORITY = issueInfinityRewardAuthorityV2ForApplication(
  Object.freeze({ doubleInfinityPoints: false }),
)
const PREPARED_AUTHORITY =
  registerCanonicalPreparedInfinityResetAuthorityV2ForStoredTime()

function readyState(
  options: Readonly<{
    available?: string
    breakMode?: boolean
    retained?: boolean
    skillPool?: boolean
  }> = {},
): CanonicalGameStateV2 {
  const source = MIGRATION.state
  const byId = { ...source.skills.byId }
  if (options.skillPool) {
    byId.banking = Object.freeze({ ...byId.banking!, owned: true, level: 1n })
    byId.investmentPortfolio = Object.freeze({
      ...byId.investmentPortfolio!,
      owned: true,
      level: 1n,
    })
  }
  return cloneCanonicalGameStateV2({
    ...source,
    meta: { ...source.meta, firstInfinityComplete: false },
    dyson: {
      ...source.dyson,
      bots: gameDecimalFromCanonicalString('4.2e19'),
      money: gameDecimalFromCanonicalString('1e500'),
      science: gameDecimalFromCanonicalString('1e400'),
      goalStage: 7n,
    },
    infinity: {
      ...source.infinity,
      availablePoints: gameDecimalFromCanonicalString(options.available ?? '2e0'),
      breakTarget: options.breakMode
        ? gameDecimalFromCanonicalString('1e0')
        : source.infinity.breakTarget,
      inProgress: true,
      botCapTransitionPending: true,
      botCapRewardsGranted: true,
      permanentSkillPoints: options.skillPool ? 2n : 0n,
      retainedFacilities: Object.fromEntries(
        Object.keys(source.infinity.retainedFacilities).map((id) => [
          id,
          options.retained ?? false,
        ]),
      ) as unknown as CanonicalGameStateV2['infinity']['retainedFacilities'],
      storedTimeUsedThisCycleSeconds: 12,
    },
    skills: {
      ...source.skills,
      points: 99n,
      byId,
      activeAutoAssignment: options.skillPool
        ? ['whatWillComeToPass', 'startHereTree']
        : [],
    },
    research: {
      ...source.research,
      levelsById: {
        ...source.research.levelsById,
        'research.money_multiplier': gameDecimalFromCanonicalString('5e0'),
      },
      progressById: {
        ...source.research.progressById,
        'research.money_multiplier': gameDecimalFromCanonicalString('3e0'),
      },
    },
    quantum: {
      ...source.quantum,
      unlocks: {
        ...source.quantum.unlocks,
        breakTheLoop: options.breakMode ?? false,
        fragments: false,
      },
    },
    secretProgress: {
      ...source.secretProgress,
      completed: options.skillPool ?? false,
    },
    dream: {
      ...source.dream,
      upgrades: {
        ...source.dream.upgrades,
        translation1: options.skillPool ?? false,
      },
    },
    timeline: {
      ...source.timeline,
      infinityCycleSeconds: 42,
      infinityHasPostResetStart: false,
    },
  })
}

describe('canonical Infinity reset V2', () => {
  test('prepared Stored Time authority reset is byte-identical without exposing forgery', () => {
    const state = readyState({ retained: true })
    const publicResult = commitCanonicalInfinityResetV2(
      quoteInfinityResetBoundaryV2(state, MIGRATION.runtime, 12, AUTHORITY),
      state,
      MIGRATION.runtime,
      12,
    )
    const preparedResult = commitPreparedCanonicalInfinityResetV2(
      PREPARED_AUTHORITY,
      quotePreparedCanonicalInfinityResetV2(
        PREPARED_AUTHORITY, state, MIGRATION.runtime, 12, AUTHORITY,
      ),
      state,
      MIGRATION.runtime,
      12,
    )
    expect(preparedResult).toEqual(publicResult)
    expect(() => commitPreparedCanonicalInfinityResetV2(
      Object.freeze({ policy: 'stored-time-transient-infinity-authority-v1' }),
      quotePreparedCanonicalInfinityResetV2(
        PREPARED_AUTHORITY, state, MIGRATION.runtime, 12, AUTHORITY,
      ),
      state,
      MIGRATION.runtime,
      12,
    )).toThrow(/not authentic/u)
  })

  test('atomically resets ordinary Infinity and publishes the post-reset runtime', () => {
    const state = readyState({ retained: true })
    const evaluation = quoteInfinityResetBoundaryV2(state, MIGRATION.runtime, 12, AUTHORITY)
    const result = commitCanonicalInfinityResetV2(
      evaluation,
      state,
      MIGRATION.runtime,
      12,
    )
    expect(result.revision).toBe(13)
    expect(gameDecimalToCanonicalString(result.quotedReward)).toBe('1e0')
    expect(gameDecimalToCanonicalString(result.rewardGranted)).toBe('1e0')
    expect(gameDecimalToCanonicalString(result.state.infinity.availablePoints)).toBe('3e0')
    expect(result.state.infinity.allocatedPoints).toEqual(state.infinity.allocatedPoints)
    expect(result.state.infinity).toMatchObject({
      inProgress: false,
      botCapTransitionPending: false,
      botCapRewardsGranted: false,
      lastCycleDurationSeconds: 42,
      storedTimeUsedThisCycleSeconds: 0,
      storedTimeUsedPreviousCycleSeconds: 12,
    })
    expect(gameDecimalToCanonicalString(result.state.dyson.bots)).toBe('1e1')
    for (const facility of ['assembly_lines', 'ai_managers', 'servers', 'data_centers', 'planets'] as const) {
      expect(gameDecimalToCanonicalString(result.state.dyson.facilities[facility][1])).toBe('1e1')
    }
    expect(result.state.timeline.infinityCycleSeconds).toBe(0)
    expect(result.state.timeline.infinityHasPostResetStart).toBe(true)
    expect(result.state.timeline.infinityBoundaryRemaining).toBeGreaterThanOrEqual(1 / 60)
    const expected = deriveDysonV2FromCauses(result.state, MIGRATION.runtime)
    expect(result.runtime.dysonEvaluationSnapshot).toEqual(expected.nextEvaluationSnapshot)
  })

  test('derives the exact permanent, banking, Reality, and secret Skill pool', () => {
    const state = readyState({ skillPool: true })
    const result = commitCanonicalInfinityResetV2(
      quoteInfinityResetBoundaryV2(state, MIGRATION.runtime, 3, AUTHORITY),
      state,
      MIGRATION.runtime,
      3,
    )
    expect(result.resetSkillPoints).toBe(9n)
    expect(result.autoAssignedSkillIds).toContain('startHereTree')
    expect(result.autoAssignedSkillIds).not.toContain('whatWillComeToPass')
    expect(result.state.skills.byId.startHereTree?.owned).toBe(true)
    expect(result.state.skills.byId.whatWillComeToPass?.owned).toBe(false)
    expect(result.state.skills.fragments).toBe(0n)
    for (const runtime of Object.values(result.state.skills.byId)) {
      expect(runtime.timerSeconds).toBe(0)
      expect(runtime.secondaryTimerSeconds).toBe(0)
    }
  })

  test('resets all 14 Research levels and progress without changing automation', () => {
    const state = readyState()
    const result = commitCanonicalInfinityResetV2(
      quoteInfinityResetBoundaryV2(state, MIGRATION.runtime, 1, AUTHORITY),
      state,
      MIGRATION.runtime,
      1,
    )
    expect(Object.keys(result.state.research.levelsById).sort()).toEqual([...RESEARCH_V2_IDS])
    expect(Object.keys(result.state.research.progressById).sort()).toEqual([...RESEARCH_V2_IDS])
    for (const value of Object.values(result.state.research.levelsById)) {
      if (typeof value === 'bigint') expect(value).toBe(0n)
      else expect(gameDecimalToCanonicalString(value)).toBe('0')
    }
    for (const value of Object.values(result.state.research.progressById)) {
      expect(gameDecimalToCanonicalString(value)).toBe('0')
    }
    expect(result.state.research.automation).toEqual(state.research.automation)
    expect(result.state.timeline.researchAutomationTargetIndex)
      .toBe(state.timeline.researchAutomationTargetIndex)
  })

  test('records break statistics and permits an unrepresented reward credit', () => {
    const base = readyState({
      available: '1e1000',
      breakMode: true,
      retained: true,
    })
    const state = cloneCanonicalGameStateV2({
      ...base,
      quantum: { ...base.quantum, divisionsPurchased: 19n },
    })
    const result = commitCanonicalInfinityResetV2(
      quoteInfinityResetBoundaryV2(state, MIGRATION.runtime, 5, AUTHORITY),
      state,
      MIGRATION.runtime,
      5,
    )
    expect(gameDecimalToCanonicalString(result.rewardGranted)).toBe('0')
    expect(result.state.statistics.lastCompletedCycle).toMatchObject({
      valid: true,
      breakInfinity: true,
      durationSeconds: 42,
    })
    expect(result.state.statistics.lifetime.breakInfinityCount)
      .toBe(state.statistics.lifetime.breakInfinityCount + 1n)
    expect(result.state.timeline.infinityBoundaryRemaining).toBe(1 / 60)
  })

  test('enforces the authored minimum cycle over a positive sub-frame horizon', () => {
    expect(infinityBoundaryCountdownSecondsV2(
      gameDecimalFromCanonicalString('1e-6'),
    )).toBe(1 / 60)
  })

  test('requires the minimum cycle unless bot-cap rewards authorize the bypass', () => {
    const source = readyState()
    const early = cloneCanonicalGameStateV2({
      ...source,
      infinity: { ...source.infinity, botCapRewardsGranted: false },
      timeline: { ...source.timeline, infinityCycleSeconds: 0 },
    })
    expect(() => commitCanonicalInfinityResetV2(
      quoteInfinityResetBoundaryV2(early, MIGRATION.runtime, 20, AUTHORITY),
      early,
      MIGRATION.runtime,
      20,
    )).toThrow(/not ready/u)

    const bypass = cloneCanonicalGameStateV2({
      ...source,
      infinity: { ...source.infinity, botCapRewardsGranted: true },
      timeline: { ...source.timeline, infinityCycleSeconds: 0 },
    })
    expect(commitCanonicalInfinityResetV2(
      quoteInfinityResetBoundaryV2(bypass, MIGRATION.runtime, 21, AUTHORITY),
      bypass,
      MIGRATION.runtime,
      21,
    ).accepted).toBe(true)

    const belowThreshold = cloneCanonicalGameStateV2({
      ...source,
      dyson: { ...source.dyson, bots: gameDecimalFromCanonicalString('0') },
      infinity: { ...source.infinity, botCapRewardsGranted: true },
      timeline: { ...source.timeline, infinityCycleSeconds: 0 },
    })
    expect(quoteInfinityResetBoundaryV2(
      belowThreshold, MIGRATION.runtime, 22, AUTHORITY,
    ).ready).toBe(true)
    expect(commitCanonicalInfinityResetV2(
      quoteInfinityResetBoundaryV2(
        belowThreshold, MIGRATION.runtime, 22, AUTHORITY,
      ),
      belowThreshold,
      MIGRATION.runtime,
      22,
    ).accepted).toBe(true)
  })

  test('rejects forged, stale, changed, exhausted, and reused evaluations atomically', () => {
    const state = readyState()
    const evaluation = quoteInfinityResetBoundaryV2(state, MIGRATION.runtime, 7, AUTHORITY)
    expect(() => commitCanonicalInfinityResetV2(
      Object.freeze({ ...evaluation }), state, MIGRATION.runtime, 7,
    )).toThrow(/not issued/u)
    let runtimeGetterCalls = 0
    const hostileRuntime = Object.freeze(Object.defineProperty({}, 'dysonEvaluationSnapshot', {
      enumerable: true,
      get() {
        runtimeGetterCalls += 1
        return MIGRATION.runtime.dysonEvaluationSnapshot
      },
    }))
    expect(() => commitCanonicalInfinityResetV2(
      Object.freeze({ ...evaluation }), state, hostileRuntime as never, 7,
    )).toThrow(/not issued/u)
    expect(runtimeGetterCalls).toBe(0)
    expect(() => commitCanonicalInfinityResetV2(
      evaluation, state, MIGRATION.runtime, 8,
    )).toThrow(/stale/u)
    const changed = cloneCanonicalGameStateV2({
      ...state,
      skills: { ...state.skills, points: state.skills.points + 1n },
    })
    expect(() => commitCanonicalInfinityResetV2(
      evaluation, changed, MIGRATION.runtime, 7,
    )).toThrow(/does not match/u)
    const changedRuntime = Object.freeze({
      ...MIGRATION.runtime,
      dysonEvaluationSnapshot: Object.freeze({
        ...MIGRATION.runtime.dysonEvaluationSnapshot,
        panelsPerSecond: gameDecimalFromCanonicalString('1e0'),
      }),
    })
    expect(() => commitCanonicalInfinityResetV2(
      evaluation, state, changedRuntime, 7,
    )).toThrow(/runtime does not match/u)
    let issuedRuntimeGetterCalls = 0
    const hostileIssuedRuntime = Object.freeze(Object.defineProperty(
      {},
      'dysonEvaluationSnapshot',
      {
        enumerable: true,
        get() {
          issuedRuntimeGetterCalls += 1
          return MIGRATION.runtime.dysonEvaluationSnapshot
        },
      },
    ))
    expect(() => commitCanonicalInfinityResetV2(
      evaluation, state, hostileIssuedRuntime as never, 7,
    )).toThrow(/declared data fields/u)
    expect(issuedRuntimeGetterCalls).toBe(0)
    expect(() => commitCanonicalInfinityResetV2(
      evaluation, state, MIGRATION.runtime, Number.MAX_SAFE_INTEGER,
    )).toThrow(/exhausted/u)
    expect(commitCanonicalInfinityResetV2(evaluation, state, MIGRATION.runtime, 7).accepted)
      .toBe(true)
    expect(() => commitCanonicalInfinityResetV2(evaluation, state, MIGRATION.runtime, 7))
      .toThrow(/already consumed/u)
  })
})
