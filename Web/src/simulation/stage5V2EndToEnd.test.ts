import { describe, expect, test } from 'vitest'

import schema12Web from '../../test/fixtures/schema-12-canonical-idsweb1-first-run.txt?raw'
import { issueInfinityRewardAuthorityV2ForApplication } from '../application/infinityRewardAuthorityV2'
import { issueRealityStrangeMatterAccountV2ForApplication } from '../application/realityStrangeMatterAuthorityV2'
import { cloneCanonicalGameStateV2 } from '../game-state/cloneV2'
import { migratePreparedSaveToV2 } from '../game-state/mappingV2'
import type { CanonicalGameStateV2 } from '../game-state/typesV2'
import {
  GAME_DECIMAL_ZERO,
  addGameDecimals,
  gameDecimalFromCanonicalString,
  gameDecimalToCanonicalString,
} from '../math/gameDecimal'
import { PreparedSave } from '../save/prepare'
import {
  decodeSchema13WebSave,
  encodeSchema13WebSave,
} from '../save/schema13'
import { deserializeWebSave } from '../save/serialization'
import {
  CANONICAL_V2_NO_DORMANT_DUE_EVENTS,
  advanceCanonicalEventTimeV2,
  type CanonicalEventTimeCarrierV2,
} from './canonicalEventTimeModelV2'
import { commitCanonicalInfinityResetV2 } from './canonicalInfinityResetV2'
import { quoteInfinityResetBoundaryV2 } from './infinityEconomyV2'
import {
  commitRealityUpgradeV2,
  quoteRealityUpgradeV2,
  realityArtifactSkillPointsV2,
} from './realityV2'
import {
  commitV2ResearchPurchase,
  quoteV2ResearchPurchase,
} from './researchV2'
import { purchaseCanonicalSkillV2 } from './skillTransactionsV2'

const migrated = migratePreparedSaveToV2(
  PreparedSave.fromDecoded(deserializeWebSave(schema12Web)),
  Object.freeze({ kind: 'trusted-same-device' as const }),
)
const infinityAuthority = issueInfinityRewardAuthorityV2ForApplication(
  Object.freeze({ doubleInfinityPoints: false }),
)

function stage5State(): CanonicalGameStateV2 {
  const source = migrated.state
  const facilities = Object.fromEntries(Object.keys(source.dyson.facilities).map((id) => [
    id,
    Object.freeze([GAME_DECIMAL_ZERO, GAME_DECIMAL_ZERO]),
  ])) as unknown as CanonicalGameStateV2['dyson']['facilities']
  return cloneCanonicalGameStateV2({
    ...source,
    meta: {
      ...source.meta,
      firstInfinityComplete: true,
    },
    dyson: {
      ...source.dyson,
      money: gameDecimalFromCanonicalString('1e500'),
      science: gameDecimalFromCanonicalString('1e500'),
      bots: gameDecimalFromCanonicalString('4.2e19'),
      facilities,
      goalStage: 10n,
    },
    infinity: {
      ...source.infinity,
      availablePoints: gameDecimalFromCanonicalString('2e0'),
      permanentSkillPoints: 3n,
      inProgress: true,
      botCapTransitionPending: true,
      botCapRewardsGranted: true,
      storedTimeUsedThisCycleSeconds: 2,
    },
    skills: {
      ...source.skills,
      points: 10n,
      activeAutoAssignment: [],
    },
    research: {
      ...source.research,
      levelsById: {
        ...source.research.levelsById,
        'research.money_multiplier': GAME_DECIMAL_ZERO,
        'research.science_boost': gameDecimalFromCanonicalString('1e400'),
      },
    },
    reality: {
      ...source.reality,
      universeDesignationCount: gameDecimalFromCanonicalString('1e500'),
      influence: gameDecimalFromCanonicalString('1e400'),
      workersReady: 124n,
      workerGenerationProgress: 0,
      autoGather: true,
    },
    secretProgress: {
      ...source.secretProgress,
      completed: true,
    },
    dream: {
      ...source.dream,
      strangeMatter: gameDecimalFromCanonicalString('1e500'),
      upgrades: {
        ...source.dream.upgrades,
        translation1: false,
      },
    },
    timeline: {
      ...source.timeline,
      eventClockInitialized: true,
      automationTimeUntilNextEvent: 10,
      infinityBoundaryRemaining: 10,
      infinityCycleSeconds: 42,
      doubleTime: {
        ...source.timeline.doubleTime,
        unlocked: true,
        enabled: true,
        bankSeconds: 10,
        rate: 1,
      },
    },
  })
}

describe('dormant Stage 5 V2 end-to-end', () => {
  test('conserves exact Skills/rewards through operations, event time, reset, and reload', () => {
    let state = stage5State()
    let runtime = migrated.runtime
    let revision = 20

    const skill = purchaseCanonicalSkillV2(state, 'startHereTree')
    expect(skill).toMatchObject({ accepted: true, changed: true, code: 'purchased' })
    expect(skill.state.skills.points).toBe(9n)
    state = cloneCanonicalGameStateV2(skill.state)
    revision += 1

    const research = commitV2ResearchPurchase(
      quoteV2ResearchPurchase(
        state,
        runtime,
        revision,
        'research.money_multiplier',
        'buy-1',
        false,
      ),
      state,
      runtime,
      revision,
    )
    expect(research).toMatchObject({ accepted: true, purchased: true, changed: true })
    expect(research.revision).toBe(revision + 1)
    expect(gameDecimalToCanonicalString(research.state.dyson.science)).toBe('1e500')
    expect(gameDecimalToCanonicalString(research.debitedAmount)).toBe('0')
    expect(gameDecimalToCanonicalString(
      research.state.research.levelsById['research.science_boost'],
    )).toBe('1e400')
    state = cloneCanonicalGameStateV2(research.state)
    revision = research.revision

    const account = issueRealityStrangeMatterAccountV2ForApplication(
      state,
      Object.freeze({ accountId: 'stage5-harness', revision }),
    )
    const reality = commitRealityUpgradeV2(
      quoteRealityUpgradeV2(state, account, 'translation1'),
      state,
      account,
    )
    expect(reality).toMatchObject({ accepted: true, changed: true, upgradeId: 'translation1' })
    expect(reality.state.skills.points).toBe(10n)
    expect(reality.account.revision).toBe(revision + 1)
    state = cloneCanonicalGameStateV2({
      ...reality.state,
      dream: {
        ...reality.state.dream,
        strangeMatter: reality.account.balance,
      },
    })
    revision = reality.account.revision
    expect(gameDecimalToCanonicalString(state.dream.strangeMatter)).toBe('1e500')
    expect(realityArtifactSkillPointsV2(state)).toBe(1n)

    const advanced = advanceCanonicalEventTimeV2(Object.freeze({
      carrier: Object.freeze({ state, runtime, revision }) satisfies CanonicalEventTimeCarrierV2,
      durationSeconds: 1,
      materialEventBudget: 128,
      mode: 'active' as const,
      context: Object.freeze({
        automationIntervalSeconds: 10,
        dormantDueEvents: CANONICAL_V2_NO_DORMANT_DUE_EVENTS,
        timerAggregationAuthority: null,
        quantumEpochAuthority: null,
        catalogLookup: null,
        infinityRewardAuthority: infinityAuthority,
      }),
      queuedInputs: Object.freeze([]),
      cancelRequested: null,
    }))
    expect(advanced.status).toBe('completed')
    expect(advanced.carrier.revision).toBe(revision + 1)
    expect(advanced.carrier.state.reality.workersReady).toBe(128n)
    expect(gameDecimalToCanonicalString(
      advanced.carrier.state.reality.universeDesignationCount,
    )).toBe('1e500')
    expect(gameDecimalToCanonicalString(advanced.carrier.state.reality.influence))
      .toBe('1e400')
    expect(gameDecimalToCanonicalString(advanced.summary.realityWorkers)).toBe('4e0')
    state = advanced.carrier.state as CanonicalGameStateV2
    runtime = advanced.carrier.runtime
    revision = advanced.carrier.revision

    const availableBeforeReset = state.infinity.availablePoints
    const reset = commitCanonicalInfinityResetV2(
      quoteInfinityResetBoundaryV2(state, runtime, revision, infinityAuthority),
      state,
      runtime,
      revision,
    )
    expect(reset.revision).toBe(revision + 1)
    expect(gameDecimalToCanonicalString(reset.quotedReward)).toBe('1e0')
    expect(gameDecimalToCanonicalString(reset.rewardGranted)).toBe('1e0')
    expect(reset.state.infinity.availablePoints).toEqual(
      addGameDecimals(availableBeforeReset, reset.rewardGranted),
    )
    expect(reset.resetSkillPoints).toBe(8n)
    expect(reset.state.skills.points).toBe(7n)
    expect(reset.state.skills.byId.startHereTree?.owned).toBe(true)
    expect(reset.state.skills.points + 1n).toBe(reset.resetSkillPoints)
    expect(realityArtifactSkillPointsV2(reset.state)).toBe(1n)
    expect(gameDecimalToCanonicalString(reset.state.reality.influence)).toBe('1e400')
    expect(gameDecimalToCanonicalString(
      reset.state.research.levelsById['research.science_boost'],
    )).toBe('0')

    const encoded = encodeSchema13WebSave(Object.freeze({
      savedAtUtc: '2026-08-09T00:00:00.000Z',
      state: reset.state,
      runtime: reset.runtime,
    }))
    const reloaded = decodeSchema13WebSave(encoded)
    expect(reloaded.state).toEqual(reset.state)
    expect(reloaded.runtime).toEqual(reset.runtime)
    expect(encodeSchema13WebSave(Object.freeze({
      savedAtUtc: '2026-08-09T00:00:00.000Z',
      state: reloaded.state,
      runtime: reloaded.runtime,
    }))).toBe(encoded)
  })
})
