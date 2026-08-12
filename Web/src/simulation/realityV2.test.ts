import { describe, expect, test } from 'vitest'

import firstRunIdb1 from '../application/firstRun/generated/first-run-schema-12.idb1.txt?raw'
import { issueRealityStrangeMatterAccountV2ForApplication } from '../application/realityStrangeMatterAuthorityV2'
import { cloneCanonicalGameStateV2 } from '../game-state/cloneV2'
import { migratePreparedSaveToV2 } from '../game-state/mappingV2'
import type { CanonicalGameStateV2 } from '../game-state/typesV2'
import {
  addGameDecimals,
  gameDecimalFromCanonicalString,
  gameDecimalFromNumber,
  gameDecimalToCanonicalString,
} from '../math/gameDecimal'
import { prepareIdb1Save } from '../save/prepare'
import { decodeSchema13WebSave, encodeSchema13WebSave } from '../save/schema13'
import {
  advancePreparedRealityWorkersV2,
  advanceRealityWorkersV2,
  commitRealityUpgradeV2,
  gatherRealityInfluenceV2,
  quoteRealityUpgradeV2,
  realityArtifactSkillPointsV2,
  realityWorkerGenerationRateV2,
} from './realityV2'

const migrated = migratePreparedSaveToV2(
  prepareIdb1Save(firstRunIdb1).prepared,
  { kind: 'trusted-same-device' },
)
const baseState = migrated.state

function stateWith(
  mutate: (state: CanonicalGameStateV2) => CanonicalGameStateV2,
): CanonicalGameStateV2 {
  return cloneCanonicalGameStateV2(mutate(baseState))
}

describe('dormant Reality V2 core', () => {
  test('advances the raw-seconds worker clock with bounded ready workers', () => {
    const state = stateWith((source) => ({
      ...source,
      quantum: {
        ...source.quantum,
        influenceSpeedBonus: gameDecimalFromNumber(3),
      },
      reality: {
        ...source.reality,
        workerGenerationProgress: 0.25,
      },
      timeline: {
        ...source.timeline,
        doubleTime: {
          ...source.timeline.doubleTime,
          enabled: true,
          rate: 10,
        },
      },
    }))
    const result = advanceRealityWorkersV2(state, 1)
    expect(result).toMatchObject({
      accepted: true,
      changed: true,
      code: 'advanced',
      stalledSeconds: 0,
    })
    expect(gameDecimalToCanonicalString(result.generationPerSecond)).toBe('7e0')
    expect(gameDecimalToCanonicalString(result.workersGenerated)).toBe('7e0')
    expect(result.state.reality).toMatchObject({
      workersReady: 7n,
      workerGenerationProgress: 0.25,
    })
    expect(gameDecimalToCanonicalString(
      result.state.reality.universeDesignationCount,
    )).toBe('7e0')
  })

  test('preserves exact partition order for representable worker production', () => {
    const state = stateWith((source) => ({
      ...source,
      quantum: {
        ...source.quantum,
        influenceSpeedBonus: gameDecimalFromNumber(3),
      },
      reality: { ...source.reality, workerGenerationProgress: 0.25 },
    }))
    const whole = advanceRealityWorkersV2(state, 1)
    const first = advanceRealityWorkersV2(state, 0.5)
    const second = advanceRealityWorkersV2(first.state, 0.5)
    expect(second.state.reality).toEqual(whole.state.reality)
  })

  test('publishes the prepared event candidate exactly like the validated public path', () => {
    const state = stateWith((source) => ({
      ...source,
      quantum: {
        ...source.quantum,
        influenceSpeedBonus: gameDecimalFromNumber(3),
      },
      reality: {
        ...source.reality,
        workerGenerationProgress: 0.25,
      },
    }))
    const publicResult = advanceRealityWorkersV2(state, 1)
    const preparedResult = advancePreparedRealityWorkersV2(state, 1)
    expect(preparedResult).toEqual(publicResult)
    expect(Object.isFrozen(preparedResult)).toBe(true)
    expect(Object.isFrozen(preparedResult.state)).toBe(true)
    expect(Object.isFrozen(preparedResult.state.reality)).toBe(true)
  })

  test('preserves Float32 rate parity before transitioning to scalable Decimal', () => {
    const bounded = stateWith((source) => ({
      ...source,
      quantum: {
        ...source.quantum,
        influenceSpeedBonus: gameDecimalFromNumber(16_777_217),
      },
    }))
    expect(gameDecimalToCanonicalString(
      realityWorkerGenerationRateV2(bounded.quantum.influenceSpeedBonus),
    )).toBe(gameDecimalToCanonicalString(
      gameDecimalFromNumber(Math.fround(16_777_221)),
    ))
    const scalable = stateWith((source) => ({
      ...source,
      quantum: {
        ...source.quantum,
        influenceSpeedBonus: gameDecimalFromCanonicalString('1e39'),
      },
    }))
    expect(gameDecimalToCanonicalString(
      realityWorkerGenerationRateV2(scalable.quantum.influenceSpeedBonus),
    )).toBe('1e39')
  })

  test('auto-gathers complete 128-worker batches and retains the remainder', () => {
    const state = stateWith((source) => ({
      ...source,
      reality: {
        ...source.reality,
        autoGather: true,
        workersReady: 127n,
      },
    }))
    const result = advanceRealityWorkersV2(state, 0.5)
    expect(result.state.reality.workersReady).toBe(1n)
    expect(gameDecimalToCanonicalString(result.automaticInfluence)).toBe('1.28e2')
    expect(gameDecimalToCanonicalString(result.state.reality.influence)).toBe('1.28e2')
    expect(gameDecimalToCanonicalString(result.workersGenerated)).toBe('2e0')
  })

  test('supports worker generation and Influence beyond 1e308 without narrowing', () => {
    const huge = gameDecimalFromCanonicalString('1e309')
    const state = stateWith((source) => ({
      ...source,
      quantum: { ...source.quantum, influenceSpeedBonus: huge },
      reality: { ...source.reality, autoGather: true },
    }))
    const result = advanceRealityWorkersV2(state, 1)
    expect(result.accepted).toBe(true)
    expect(gameDecimalToCanonicalString(result.workersGenerated)).toBe('1e309')
    expect(gameDecimalToCanonicalString(
      result.state.reality.universeDesignationCount,
    )).toBe('1e309')
    expect(gameDecimalToCanonicalString(result.state.reality.influence)).toBe('1e309')
    expect(result.state.reality.workersReady).toBe(0n)
  })

  test('never burns a manual batch when huge Influence cannot represent the credit', () => {
    const state = stateWith((source) => ({
      ...source,
      reality: {
        ...source.reality,
        workersReady: 128n,
        influence: gameDecimalFromCanonicalString('1e309'),
      },
    }))
    const result = gatherRealityInfluenceV2(state)
    expect(result).toMatchObject({
      accepted: false,
      changed: false,
      code: 'output-unrepresented',
    })
    expect(result.state.reality.workersReady).toBe(128n)
    expect(gameDecimalToCanonicalString(result.influenceGathered)).toBe('0')
    expect(gameDecimalToCanonicalString(result.state.reality.influence)).toBe('1e309')
  })

  test('atomically records represented manual Influence and conserves it across reload', () => {
    const state = stateWith((source) => ({
      ...source,
      reality: {
        ...source.reality,
        workersReady: 128n,
        influence: gameDecimalFromNumber(10),
      },
    }))
    const result = gatherRealityInfluenceV2(state)
    expect(result).toMatchObject({ accepted: true, changed: true, code: 'gathered' })
    expect(gameDecimalToCanonicalString(result.influenceGathered)).toBe('1.28e2')
    expect(gameDecimalToCanonicalString(result.state.reality.influence)).toBe('1.38e2')
    expect(result.state.reality.workersReady).toBe(0n)
    for (const key of ['lifetime', 'currentQuantumRun', 'recentProcessedSegment'] as const) {
      expect(gameDecimalToCanonicalString(result.state.statistics[key].manualInfluence))
        .toBe(gameDecimalToCanonicalString(
          addGameDecimals(
            state.statistics[key].manualInfluence,
            gameDecimalFromNumber(128),
          ),
        ))
      expect(result.state.statistics[key].simulatedSeconds)
        .toBe(state.statistics[key].simulatedSeconds)
    }
    expect(result.state.statistics.minuteWindows).toBe(state.statistics.minuteWindows)
    expect(result.state.statistics.halfHourWindows).toBe(state.statistics.halfHourWindows)
    expect(result.state.statistics.dailyWindows).toBe(state.statistics.dailyWindows)

    const encoded = encodeSchema13WebSave(Object.freeze({
      savedAtUtc: '2026-08-09T00:00:00.000Z',
      state: result.state,
      runtime: migrated.runtime,
    }))
    const decoded = decodeSchema13WebSave(encoded)
    expect(decoded.state.statistics).toEqual(result.state.statistics)
    expect(decoded.state.reality).toEqual(result.state.reality)
  })

  test('never burns auto-gather workers across an unrepresented-credit reload', () => {
    const state = stateWith((source) => ({
      ...source,
      reality: {
        ...source.reality,
        autoGather: true,
        workersReady: 127n,
        influence: gameDecimalFromCanonicalString('1e309'),
      },
    }))
    const first = advanceRealityWorkersV2(state, 0.5)
    expect(first.state.reality.workersReady).toBe(128n)
    expect(gameDecimalToCanonicalString(first.automaticInfluence)).toBe('0')
    expect(gameDecimalToCanonicalString(first.workersGenerated)).toBe('1e0')
    expect(first.stalledSeconds).toBe(0.25)

    const reloaded = cloneCanonicalGameStateV2({
      ...first.state,
      reality: {
        ...first.state.reality,
        workerGenerationProgress: 0.5,
      },
    })
    const second = advanceRealityWorkersV2(reloaded, 0.25)
    expect(second.accepted).toBe(true)
    expect(second.state.reality.workersReady).toBe(128n)
    expect(gameDecimalToCanonicalString(second.automaticInfluence)).toBe('0')
    expect(gameDecimalToCanonicalString(second.workersGenerated)).toBe('0')
    expect(second.stalledSeconds).toBe(0.25)
  })

  test('uses existing fractional progress when computing manual stall time', () => {
    const state = stateWith((source) => ({
      ...source,
      reality: {
        ...source.reality,
        workersReady: 127n,
        workerGenerationProgress: 0.5,
      },
    }))
    const result = advanceRealityWorkersV2(state, 1)
    expect(result.state.reality.workersReady).toBe(128n)
    expect(result.stalledSeconds).toBe(0.875)
  })

  test('enforces the local [0, 128] workersReady contract', () => {
    const invalid = Object.freeze({
      ...baseState,
      reality: Object.freeze({ ...baseState.reality, workersReady: 129n }),
    }) as CanonicalGameStateV2
    expect(advanceRealityWorkersV2(invalid, 1)).toMatchObject({
      accepted: false,
      code: 'invalid-state',
    })
    expect(gatherRealityInfluenceV2(invalid)).toMatchObject({
      accepted: false,
      code: 'invalid-state',
    })
  })

  test('quotes and commits one-time upgrades through an external account', () => {
    const balance = gameDecimalFromCanonicalString('1e309')
    const state = stateWith((source) => ({
      ...source,
      dream: { ...source.dream, strangeMatter: balance },
    }))
    const account = issueRealityStrangeMatterAccountV2ForApplication(
      state,
      Object.freeze({ accountId: 'stage6:dream.strangeMatter', revision: 7 }),
    )
    const quote = quoteRealityUpgradeV2(state, account, 'translation1')
    expect(quote).toMatchObject({
      accepted: true,
      code: 'ready',
      currencyPath: '$.dream.strangeMatter',
      sourceRevision: 7,
    })
    const committed = commitRealityUpgradeV2(quote, state, account)
    expect(committed).toMatchObject({ accepted: true, code: 'committed' })
    expect(committed.state.dream.upgrades.translation1).toBe(true)
    expect(committed.state.skills.points).toBe(state.skills.points + 1n)
    expect(committed.account.revision).toBe(8)
    expect(gameDecimalToCanonicalString(committed.cost)).toBe('8e0')
    expect(gameDecimalToCanonicalString(committed.account.balance)).toBe('1e309')
    expect(committed.state.dream.strangeMatter).toEqual(state.dream.strangeMatter)
    expect(committed.state.dream.strangeMatter).not.toBe(state.dream.strangeMatter)
    expect(commitRealityUpgradeV2(quote, state, account)).toMatchObject({
      accepted: false,
      code: 'quote-rejected',
    })
  })

  test('enforces prerequisites, one-time ownership, and account/state identity', () => {
    const state = stateWith((source) => ({
      ...source,
      dream: { ...source.dream, strangeMatter: gameDecimalFromNumber(100) },
    }))
    const account = issueRealityStrangeMatterAccountV2ForApplication(
      state,
      Object.freeze({ accountId: 'stage6:dream.strangeMatter', revision: 1 }),
    )
    expect(quoteRealityUpgradeV2(state, account, 'translation2')).toMatchObject({
      accepted: false,
      code: 'prerequisites-not-met',
    })
    const mismatchedState = stateWith((source) => ({
      ...source,
      dream: { ...source.dream, strangeMatter: gameDecimalFromNumber(99) },
    }))
    const mismatched = issueRealityStrangeMatterAccountV2ForApplication(
      mismatchedState,
      Object.freeze({ accountId: 'stage6:dream.strangeMatter', revision: 1 }),
    )
    expect(quoteRealityUpgradeV2(state, mismatched, 'translation1')).toMatchObject({
      accepted: false,
      code: 'invalid-account',
    })
    const owned = stateWith((source) => ({
      ...source,
      dream: {
        ...source.dream,
        strangeMatter: gameDecimalFromNumber(100),
        upgrades: { ...source.dream.upgrades, translation1: true },
      },
    }))
    const ownedAccount = issueRealityStrangeMatterAccountV2ForApplication(
      owned,
      Object.freeze({ accountId: 'stage6:dream.strangeMatter', revision: 1 }),
    )
    expect(quoteRealityUpgradeV2(owned, ownedAccount, 'translation1')).toMatchObject({
      accepted: false,
      code: 'already-owned',
    })
  })

  test('snapshots mutable quote input and binds commit to the exact state', () => {
    const mutable = {
      ...baseState,
      dream: {
        ...baseState.dream,
        strangeMatter: gameDecimalFromNumber(100),
        upgrades: { ...baseState.dream.upgrades },
      },
    } as CanonicalGameStateV2
    const account = issueRealityStrangeMatterAccountV2ForApplication(
      mutable,
      Object.freeze({ accountId: 'stage6:dream.strangeMatter', revision: 3 }),
    )
    const staleQuote = quoteRealityUpgradeV2(mutable, account, 'translation1')
    ;(mutable.dream.upgrades as { speed8: boolean }).speed8 = true
    expect(commitRealityUpgradeV2(staleQuote, mutable, account)).toMatchObject({
      accepted: false,
      code: 'stale-state',
    })

    ;(mutable.dream.upgrades as { speed8: boolean }).speed8 = false
    const quote = quoteRealityUpgradeV2(mutable, account, 'translation1')
    ;(mutable.dream.upgrades as { speed8: boolean }).speed8 = true
    ;(mutable.dream.upgrades as { speed8: boolean }).speed8 = false
    const committed = commitRealityUpgradeV2(quote, mutable, account)
    expect(committed.accepted).toBe(true)
    expect(committed.state.dream.upgrades.speed8).toBe(false)
    expect(Object.isFrozen(committed.state)).toBe(true)
    expect(Object.isFrozen(committed.state.dream.upgrades)).toBe(true)
  })

  test('fails forged quote and hostile account boundaries without getter execution', () => {
    const state = stateWith((source) => ({
      ...source,
      dream: { ...source.dream, strangeMatter: gameDecimalFromNumber(100) },
    }))
    let getterCalls = 0
    const forged = Object.create(null)
    Object.defineProperty(forged, 'cost', {
      get() {
        getterCalls += 1
        return gameDecimalFromNumber(0)
      },
    })
    expect(commitRealityUpgradeV2(
      forged,
      state,
      null as never,
    )).toMatchObject({ accepted: false, code: 'quote-rejected' })
    expect(quoteRealityUpgradeV2(
      state,
      Object.defineProperty({}, 'balance', {
        get() {
          getterCalls += 1
          return gameDecimalFromNumber(100)
        },
      }) as never,
      'translation1',
    )).toMatchObject({ accepted: false, code: 'invalid-account' })
    expect(getterCalls).toBe(0)
  })

  test('derives reset Skill Points only from owned authored artifacts', () => {
    const state = stateWith((source) => ({
      ...source,
      dream: {
        ...source.dream,
        upgrades: {
          ...source.dream.upgrades,
          translation1: true,
          speed1: true,
        },
      },
      timeline: {
        ...source.timeline,
        doubleTime: { ...source.timeline.doubleTime, unlocked: true },
      },
    }))
    expect(realityArtifactSkillPointsV2(state)).toBe(2n)
  })
})
