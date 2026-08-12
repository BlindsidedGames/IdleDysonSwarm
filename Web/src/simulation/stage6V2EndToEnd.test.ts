import { describe, expect, test } from 'vitest'

import {
  DeveloperOptionsTransactionOwnerV2,
  registerDeveloperOptionsReceiverAuthorityV2,
  type DeveloperOptionsPersistenceCandidateV2,
  type DeveloperOptionsTransactionPortV2,
} from '../application/developerOptionsTransactionV2'
import {
  commitDreamCommandV2,
  quoteDreamCommandV2,
  type DreamPublicationV2,
} from '../application/dreamStrangeMatterAuthorityV2'
import { issueInfinityRewardAuthorityV2ForApplication } from '../application/infinityRewardAuthorityV2'
import { cloneCanonicalGameStateV2 } from '../game-state/cloneV2'
import { migratePreparedSaveToV2 } from '../game-state/mappingV2'
import {
  GAME_DECIMAL_ONE,
  gameDecimalFromCanonicalString,
  gameDecimalFromNumber,
  gameDecimalToCanonicalString,
} from '../math/gameDecimal'
import { PreparedSave } from '../save/prepare'
import { decodeSchema13WebSave, encodeSchema13WebSave } from '../save/schema13'
import { deserializeWebSave } from '../save/serialization'
import schema12Web from '../../test/fixtures/schema-12-canonical-idsweb1-first-run.txt?raw'
import { commitAvocadoCommandV2, quoteAvocadoCommandV2 } from './avocadoV2'
import {
  commitCanonicalDreamResetV2,
  quoteCanonicalDreamResetV2,
} from './canonicalDreamResetV2'
import { commitCanonicalInfinityResetV2 } from './canonicalInfinityResetV2'
import {
  commitCanonicalQuantumResetV2,
  quoteCanonicalQuantumResetV2,
} from './canonicalQuantumResetV2'
import {
  advanceDreamEducationV2,
  advanceDreamFoundationalV2,
  runDreamConversionsV2,
} from './dreamV2'
import {
  quoteInfinityResetBoundaryV2,
} from './infinityEconomyV2'
import { commitQuantumUpgradeV2, quoteQuantumUpgradeV2 } from './quantumV2'

const migrated = migratePreparedSaveToV2(
  PreparedSave.fromDecoded(deserializeWebSave(schema12Web)),
  Object.freeze({ kind: 'trusted-same-device' as const }),
)
const decimal = (value: string) => gameDecimalFromCanonicalString(value)

describe('Stage 6 dormant V2 combined end-to-end', () => {
  test('preserves authored ledgers and reset pools across every Stage 6 gameplay layer', () => {
    let publication: Readonly<DreamPublicationV2> = Object.freeze({
      revision: 0,
      state: cloneCanonicalGameStateV2({
        ...migrated.state,
        dyson: { ...migrated.state.dyson, goalStage: 10n },
        dream: {
          ...migrated.state.dream,
          strangeMatter: decimal('1e1000'),
          disasterStage: 1n,
          resources: {
            ...migrated.state.dream.resources,
            hunters: gameDecimalFromNumber(1),
            housing: gameDecimalFromNumber(10),
            villages: gameDecimalFromNumber(24),
            cities: gameDecimalFromNumber(1),
          },
          education: {
            ...migrated.state.dream.education,
            engineering: {
              ...migrated.state.dream.education.engineering,
              active: true,
              complete: false,
              progress: gameDecimalFromNumber(0),
              researchTime: 1,
              cost: gameDecimalFromNumber(1),
            },
          },
        },
        reality: {
          ...migrated.state.reality,
          influence: decimal('1e1000'),
        },
      }),
      runtime: migrated.runtime,
    })

    const foundational = advanceDreamFoundationalV2(
      publication.state,
      3,
      GAME_DECIMAL_ONE,
    )
    expect(foundational.accepted).toBe(true)
    const converted = runDreamConversionsV2(foundational.state)
    expect(converted.changed).toBe(true)
    const educated = advanceDreamEducationV2(converted.state, 1, GAME_DECIMAL_ONE)
    expect(educated.completed).toContain('engineering')
    publication = Object.freeze({ ...publication, state: educated.state })

    const dreamQuote = quoteCanonicalDreamResetV2(
      publication,
      Object.freeze({ kind: 'automatic' }),
    )
    const dreamReset = commitCanonicalDreamResetV2(dreamQuote, publication)
    expect(dreamReset.accepted).toBe(true)
    publication = dreamReset.publication!
    expect(publication.state.dream.resetCount)
      .toBe(migrated.state.dream.resetCount + 1n)
    expect(gameDecimalToCanonicalString(dreamQuote.effectiveReward)).toBe('0')
    expect(publication.state.statistics.lastCompletedCycle.dreamCause).toBe('Meteor')

    const realityQuote = quoteDreamCommandV2(
      publication,
      Object.freeze({ kind: 'reality-upgrade', upgradeId: 'translation1' }),
    )
    const reality = commitDreamCommandV2(realityQuote, publication)
    expect(reality).toMatchObject({ accepted: true, changed: true })
    publication = reality.publication!
    expect(publication.state.dream.upgrades.translation1).toBe(true)
    expect(gameDecimalToCanonicalString(publication.state.dream.strangeMatter))
      .toBe('1e1000')

    const infinitySource = cloneCanonicalGameStateV2({
      ...publication.state,
      dyson: {
        ...publication.state.dyson,
        bots: decimal('4.2e19'),
        goalStage: 10n,
      },
      infinity: {
        ...publication.state.infinity,
        permanentSkillPoints: 2n,
      },
      skills: {
        ...publication.state.skills,
        points: 7n,
        activeAutoAssignment: Object.freeze([]),
      },
      timeline: {
        ...publication.state.timeline,
        infinityCycleSeconds: 1,
        infinityBoundaryRemaining: 0,
      },
    })
    const infinityQuote = quoteInfinityResetBoundaryV2(
      infinitySource,
      publication.runtime,
      publication.revision,
      issueInfinityRewardAuthorityV2ForApplication(
        Object.freeze({ doubleInfinityPoints: false }),
      ),
    )
    expect(infinityQuote.ready).toBe(true)
    const infinity = commitCanonicalInfinityResetV2(
      infinityQuote,
      infinitySource,
      publication.runtime,
      publication.revision,
    )
    // Infinity owns its dedicated pool: 2 permanent + 1 Reality artifact.
    expect(infinity.resetSkillPoints).toBe(3n)
    expect(infinity.state.skills.points).toBe(3n)
    expect(infinity.state.statistics.lifetime.ordinaryInfinityCount)
      .toBe(publication.state.statistics.lifetime.ordinaryInfinityCount + 1n)

    const quantumSeed = cloneCanonicalGameStateV2({
      ...infinity.state,
      infinity: {
        ...infinity.state.infinity,
        availablePoints: gameDecimalFromNumber(42),
        allocatedPoints: gameDecimalFromNumber(0),
      },
      quantum: {
        ...infinity.state.quantum,
        availableShards: gameDecimalFromNumber(100),
        lifetimeEarnedShards: gameDecimalFromNumber(100),
      },
    })
    const avocadoUpgrade = commitQuantumUpgradeV2(
      quoteQuantumUpgradeV2(quantumSeed, infinity.revision, 'Avocado'),
      quantumSeed,
      infinity.revision,
    )
    expect(avocadoUpgrade.accepted).toBe(true)
    const ordinaryPublication = Object.freeze({
      revision: avocadoUpgrade.revision,
      state: avocadoUpgrade.state,
      runtime: infinity.runtime,
    })
    const ordinaryQuote = quoteCanonicalQuantumResetV2(
      ordinaryPublication,
      Object.freeze({ kind: 'quantum-action' }),
    )
    expect(ordinaryQuote.resetSkillPoints).toBe(1n)
    const ordinary = commitCanonicalQuantumResetV2(
      ordinaryQuote,
      ordinaryPublication,
    )
    expect(ordinary.accepted).toBe(true)
    let quantumPublication = ordinary.publication!
    expect(quantumPublication.state.skills.points).toBe(1n)
    expect(gameDecimalToCanonicalString(
      quantumPublication.state.quantum.lifetimeEarnedShards,
    )).toBe('1.01e2')

    const lifetimeBeforeDoubleIp = quantumPublication.state.quantum.lifetimeEarnedShards
    const doubleIp = commitQuantumUpgradeV2(
      quoteQuantumUpgradeV2(
        quantumPublication.state,
        quantumPublication.revision,
        'DoubleIP',
      ),
      quantumPublication.state,
      quantumPublication.revision,
    )
    expect(doubleIp.state.quantum.unlocks.doubleInfinityPoints).toBe(true)
    expect(doubleIp.state.quantum.lifetimeEarnedShards).toEqual(lifetimeBeforeDoubleIp)
    quantumPublication = Object.freeze({
      revision: doubleIp.revision,
      state: doubleIp.state,
      runtime: quantumPublication.runtime,
    })

    const entangledSource = Object.freeze({
      revision: quantumPublication.revision,
      state: cloneCanonicalGameStateV2({
        ...quantumPublication.state,
        infinity: {
          ...quantumPublication.state.infinity,
          availablePoints: gameDecimalFromNumber(84),
          allocatedPoints: gameDecimalFromNumber(0),
        },
        quantum: {
          ...quantumPublication.state.quantum,
          unlocks: {
            ...quantumPublication.state.quantum.unlocks,
            quantumEntanglement: true,
          },
        },
      }),
      runtime: quantumPublication.runtime,
    })
    const entangleQuote = quoteCanonicalQuantumResetV2(
      entangledSource,
      Object.freeze({ kind: 'quantum-action' }),
    )
    expect(entangleQuote.operation).toBe('entanglement')
    const entangled = commitCanonicalQuantumResetV2(
      entangleQuote,
      entangledSource,
    )
    expect(entangled.accepted).toBe(true)
    expect(gameDecimalToCanonicalString(entangleQuote.requestedShards)).toBe('2e0')
    expect(gameDecimalToCanonicalString(
      entangled.publication!.state.infinity.availablePoints,
    )).toBe('0')

    let avocadoPublication = entangled.publication!
    const feedQuote = quoteAvocadoCommandV2(
      avocadoPublication,
      Object.freeze({ kind: 'feed-all', source: 'influence' }),
    )
    expect(feedQuote.accepted).toBe(true)
    const fed = commitAvocadoCommandV2(feedQuote, avocadoPublication)
    expect(fed.accepted).toBe(true)
    avocadoPublication = fed.publication!
    expect(gameDecimalToCanonicalString(avocadoPublication.state.reality.influence))
      .toBe('0')
    expect(gameDecimalToCanonicalString(avocadoPublication.state.avocado.influence))
      .toBe('1e1000')
    expect(commitAvocadoCommandV2(feedQuote, avocadoPublication).code)
      .toBe('quote-rejected')

    const pointsBeforeMeditation = avocadoPublication.state.skills.points
    for (let step = 0; step < 7; step += 1) {
      const quote = quoteAvocadoCommandV2(
        avocadoPublication,
        Object.freeze({ kind: 'meditation-step', stepIndex: step }),
      )
      const committed = commitAvocadoCommandV2(quote, avocadoPublication)
      expect(committed.accepted).toBe(true)
      avocadoPublication = committed.publication!
    }
    expect(avocadoPublication.state.skills.points).toBe(pointsBeforeMeditation + 4n)
    expect(avocadoPublication.state.secretProgress).toEqual({ completed: true, step: 7 })

    const saveSource = Object.freeze({
      savedAtUtc: '2026-08-10T00:00:00.000Z',
      state: avocadoPublication.state,
      runtime: avocadoPublication.runtime,
    })
    const encoded = encodeSchema13WebSave(saveSource)
    const decoded = decodeSchema13WebSave(encoded)
    expect(decoded.state).toEqual(saveSource.state)
    expect(decoded.runtime).toEqual(saveSource.runtime)
    expect(encodeSchema13WebSave(decoded)).toBe(encoded)
  }, 120_000)

  test('persists free-enable and dual-currency Developer Options transactions atomically', async () => {
    const state = cloneCanonicalGameStateV2({
      ...migrated.state,
      quantum: {
        ...migrated.state.quantum,
        availableShards: gameDecimalFromNumber(100_000),
        lifetimeEarnedShards: decimal('1e1000'),
      },
      dream: {
        ...migrated.state.dream,
        strangeMatter: gameDecimalFromNumber(500_000),
      },
    })
    const makeOwner = (
      purchased: boolean,
      enabled: boolean,
    ) => {
      let stored: Readonly<DeveloperOptionsPersistenceCandidateV2> | null = null
      const port: DeveloperOptionsTransactionPortV2 = {
        invalidateAndBlockStoredTimeJob: () => true,
        persist: (candidate) => { stored = candidate },
        readBack: () => stored,
        releaseStoredTimeBlock: () => undefined,
      }
      const platform = Object.freeze({
        developerOptionsPurchased: purchased,
        developerOptionsEnabled: enabled,
      })
      const publication = Object.freeze({
        revision: 9,
        state,
        runtime: migrated.runtime,
        platform,
      })
      return new DeveloperOptionsTransactionOwnerV2(
        publication,
        registerDeveloperOptionsReceiverAuthorityV2(platform, port),
      )
    }

    const enabler = makeOwner(true, false)
    const enabled = await enabler.commit(enabler.quote(
      Object.freeze({ kind: 'purchase-developer-options' }),
    ))
    expect(enabled).toMatchObject({
      accepted: true,
      changed: true,
      publication: { platform: { developerOptionsEnabled: true } },
    })
    expect(enabled.publication.state).toEqual(state)

    const purchaser = makeOwner(false, false)
    const lifetimeBefore = purchaser.snapshot().state.quantum.lifetimeEarnedShards
    const purchased = await purchaser.commit(purchaser.quote(
      Object.freeze({ kind: 'purchase-developer-options' }),
    ))
    expect(purchased).toMatchObject({
      accepted: true,
      changed: true,
      code: 'committed',
      publication: {
        platform: {
          developerOptionsPurchased: true,
          developerOptionsEnabled: true,
        },
      },
    })
    expect(gameDecimalToCanonicalString(
      purchased.publication.state.quantum.availableShards,
    )).toBe('0')
    expect(gameDecimalToCanonicalString(
      purchased.publication.state.dream.strangeMatter,
    )).toBe('0')
    expect(purchased.publication.state.quantum.lifetimeEarnedShards)
      .toEqual(lifetimeBefore)
  })
})
