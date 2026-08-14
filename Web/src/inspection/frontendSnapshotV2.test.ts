import { describe, expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import schema12Web from '../../test/fixtures/schema-12-canonical-idsweb1-first-run.txt?raw'
import { createCanonicalRuntimePublicationV2 } from '../application/canonicalRuntimeSessionV2'
import { issueInfinityRewardAuthorityV2ForApplication } from '../application/infinityRewardAuthorityV2'
import { cloneCanonicalGameStateV2 } from '../game-state/cloneV2'
import { migratePreparedSaveToV2 } from '../game-state/mappingV2'
import {
  gameDecimalFromCanonicalString,
  gameDecimalToCanonicalString,
  isGameDecimal,
} from '../math/gameDecimal'
import { PreparedSave } from '../save/prepare'
import { deriveDysonV2FromCauses } from '../simulation/dysonV2Derivation'
import { createCanonicalTinkerRuntimeState } from '../simulation/canonicalTinker'
import { deserializeWebSave } from '../save/serialization'
import { selectFrontendApplicationSnapshotV2 } from './frontendSnapshotV2'

const migrated = migratePreparedSaveToV2(
  PreparedSave.fromDecoded(deserializeWebSave(schema12Web)),
  Object.freeze({ kind: 'trusted-same-device' as const }),
)
const TEST_TINKER = createCanonicalTinkerRuntimeState()
const STANDARD_INFINITY_AUTHORITY = issueInfinityRewardAuthorityV2ForApplication(
  Object.freeze({ doubleInfinityPoints: false }),
)

describe('V2 full-game frontend projection', () => {
  test('unlocks Reality, Simulations, and Story at the canonical 27-secret boundary', () => {
    const snapshotAt = (secretsOfTheUniverse: bigint) => {
      const zero = gameDecimalFromCanonicalString('0')
      const state = cloneCanonicalGameStateV2({
        ...migrated.state,
        infinity: {
          ...migrated.state.infinity,
          availablePoints: zero,
          allocatedPoints: zero,
          secretsOfTheUniverse,
        },
        quantum: {
          ...migrated.state.quantum,
          availableShards: zero,
          lifetimeEarnedShards: zero,
        },
      })
      return selectFrontendApplicationSnapshotV2(
        createCanonicalRuntimePublicationV2(Object.freeze({
          revision: Number(secretsOfTheUniverse),
          state,
          runtime: migrated.runtime,
        })),
        Object.freeze({
          session: 1,
          state: Number(secretsOfTheUniverse),
          durable: Number(secretsOfTheUniverse),
        }),
        'clean',
        'bots',
        TEST_TINKER,
        STANDARD_INFINITY_AUTHORITY,
      )
    }

    const below = snapshotAt(26n)
    const boundary = snapshotAt(27n)
    if (below.phase !== 'ready' || boundary.phase !== 'ready') {
      throw new Error('Expected ready V2 snapshots.')
    }
    expect(below.gameplay.visibility.reality.routeUnlocked).toBe(false)
    expect(below.gameplay.visibility.simulations.routeUnlocked).toBe(false)
    expect(below.gameplay.derived.story.visibleChapterIds).not.toContain('chapter-5')
    expect(boundary.gameplay.visibility.reality).toMatchObject({
      unlockProgress: { currentSecrets: 27n, requiredSecrets: 27n, fraction: 1 },
      routeUnlocked: true,
    })
    expect(boundary.gameplay.visibility.simulations.routeUnlocked).toBe(true)
    expect(boundary.gameplay.derived.story.visibleChapterIds).toContain('chapter-5')
  })

  test('keys persisted Stored Time integrity state into warnings and previews', () => {
    const state = cloneCanonicalGameStateV2({
      ...migrated.state,
      timeline: {
        ...migrated.state.timeline,
        storedTimeAvailableSeconds:
          migrated.state.timeline.storedTimeCapacitySeconds,
      },
    })
    const publication = createCanonicalRuntimePublicationV2(Object.freeze({
      revision: 3,
      state,
      runtime: migrated.runtime,
    }))
    const revision = Object.freeze({ session: 1, state: 3, durable: 3 })
    const clean = selectFrontendApplicationSnapshotV2(
      publication,
      revision,
      'clean',
      'offline-time',
      TEST_TINKER,
      STANDARD_INFINITY_AUTHORITY,
      false,
    )
    const marked = selectFrontendApplicationSnapshotV2(
      publication,
      revision,
      'clean',
      'offline-time',
      TEST_TINKER,
      STANDARD_INFINITY_AUTHORITY,
      true,
    )
    if (clean.phase !== 'ready' || marked.phase !== 'ready') {
      throw new Error('Expected ready V2 snapshots.')
    }
    expect(marked).not.toBe(clean)
    expect(marked.gameplay.runtime.storedTimeCheater).toBe(true)
    expect(marked.gameplay.previews.time.storedCapacity).toMatchObject({
      eligible: false,
      code: 'integrity-compromised',
      consumesStoredSeconds: 0,
    })
    expect(marked.gameplay.previews.time.storedSpend.maximumSeconds).toBe(0)
    expect(clean.gameplay.previews.time.storedCapacity.eligible).toBe(true)
  })

  test('keys projection and native Infinity reward by the live entitlement authority', () => {
    const state = cloneCanonicalGameStateV2({ ...migrated.state, dyson: { ...migrated.state.dyson, bots: gameDecimalFromCanonicalString('4.2e19') } })
    const publication = createCanonicalRuntimePublicationV2(Object.freeze({ revision: 2, state, runtime: migrated.runtime }))
    const revision = Object.freeze({ session: 2, state: 2, durable: 2 })
    const standard = selectFrontendApplicationSnapshotV2(
      publication,
      revision,
      'clean',
      'bots',
      TEST_TINKER,
      STANDARD_INFINITY_AUTHORITY,
    )
    const doubled = selectFrontendApplicationSnapshotV2(publication, revision, 'clean', 'bots', createCanonicalTinkerRuntimeState(), issueInfinityRewardAuthorityV2ForApplication(Object.freeze({ doubleInfinityPoints: true })))
    if (standard.phase !== 'ready' || doubled.phase !== 'ready') throw new Error('Expected ready snapshots.')
    expect(doubled).not.toBe(standard)
    expect(gameDecimalToCanonicalString(doubled.gameplay.derived.infinity.currentReward)).not.toBe(
      gameDecimalToCanonicalString(standard.gameplay.derived.infinity.currentReward),
    )
  })
  test('keeps a route-scoped Bots projection within an interactive budget', () => {
    const publication = createCanonicalRuntimePublicationV2(Object.freeze({
      revision: 1,
      state: migrated.state,
      runtime: migrated.runtime,
    }))
    const started = performance.now()
    const revision = Object.freeze({ session: 1, state: 1, durable: 1 })
    const snapshot = selectFrontendApplicationSnapshotV2(
      publication,
      revision,
      'clean',
      'bots',
      TEST_TINKER,
      STANDARD_INFINITY_AUTHORITY,
    )
    const elapsed = performance.now() - started
    expect(snapshot.phase).toBe('ready')
    if (snapshot.phase !== 'ready') return
    expect(snapshot.gameplay.modelVersion).toBe(2)
    const expectedDyson = deriveDysonV2FromCauses(
      publication.state,
      publication.runtime,
    )
    expect(snapshot.gameplay.derived.dyson.status).toBe('ready')
    if (snapshot.gameplay.derived.dyson.status === 'ready') {
      expect(isGameDecimal(snapshot.gameplay.derived.dyson.value.rates.money)).toBe(true)
      expect(gameDecimalToCanonicalString(snapshot.gameplay.derived.dyson.value.rates.money)).toBe(
        gameDecimalToCanonicalString(expectedDyson.production.rates.money),
      )
      const assembly = snapshot.gameplay.derived.dyson.value.presentation.facilities.assembly_lines
      expect(gameDecimalToCanonicalString(assembly.production.perSecond)).toBe(
        gameDecimalToCanonicalString(expectedDyson.production.rates.bots),
      )
      expect(assembly.details.contributions?.length).toBeGreaterThanOrEqual(2)
      expect(assembly.details.contributions?.map(({ displayRole }) => displayRole)).toContain(
        'producer-count',
      )
      expect(snapshot.gameplay.derived.dyson.value.presentation.facilities.planets.details.upstreamSources).toEqual([])
    }
    expect(elapsed).toBeLessThan(250)
    const cachedStarted = performance.now()
    expect(selectFrontendApplicationSnapshotV2(
      publication,
      revision,
      'clean',
      'bots',
      TEST_TINKER,
      STANDARD_INFINITY_AUTHORITY,
    )).toBe(snapshot)
    expect(performance.now() - cachedStarted).toBeLessThan(2)
  })

  test('keeps exact large resources in the real gameplay snapshot', () => {
    const huge = gameDecimalFromCanonicalString('1e1000')
    const state = cloneCanonicalGameStateV2({
      ...migrated.state,
      dyson: { ...migrated.state.dyson, money: huge, science: huge },
      infinity: {
        ...migrated.state.infinity,
        availablePoints: huge,
        breakTarget: huge,
      },
      skills: { ...migrated.state.skills, selectedPreset: 4 },
      reality: { ...migrated.state.reality, influence: huge },
      quantum: {
        ...migrated.state.quantum,
        availableShards: huge,
        lifetimeEarnedShards: huge,
      },
      avocado: { ...migrated.state.avocado, unlocked: true },
      dream: { ...migrated.state.dream, strangeMatter: huge },
    })
    const publication = createCanonicalRuntimePublicationV2(Object.freeze({
      revision: 8,
      state,
      runtime: migrated.runtime,
    }))
    const snapshot = selectFrontendApplicationSnapshotV2(
      publication,
      Object.freeze({ session: 1, state: 8, durable: 8 }),
      'clean',
      'all',
      TEST_TINKER,
      STANDARD_INFINITY_AUTHORITY,
    )

    expect(snapshot.phase).toBe('ready')
    if (snapshot.phase !== 'ready') return
    expect(gameDecimalToCanonicalString(snapshot.gameplay.resources.dyson.money)).toBe('1e1000')
    expect(gameDecimalToCanonicalString(snapshot.gameplay.resources.dyson.science)).toBe('1e1000')
    expect(gameDecimalToCanonicalString(snapshot.gameplay.resources.infinity.availablePoints)).toBe('1e1000')
    expect(Object.isFrozen(snapshot)).toBe(true)
    expect(Object.isFrozen(snapshot.gameplay.resources)).toBe(true)
    expect(snapshot.gameplay.runtime.selectedSkillPresetSlot).toBe(4)
    expect(snapshot.gameplay.progression.dyson.facilities).toBe(publication.state.dyson.facilities)
    expect(snapshot.gameplay.progression.skills.byId).toBe(publication.state.skills.byId)
    expect(snapshot.gameplay.progression.research).toBe(publication.state.research)
    expect(snapshot.gameplay.progression.quantum.unlocks).toBe(publication.state.quantum.unlocks)
    expect(snapshot.gameplay.progression.secretProgress).toBe(publication.state.secretProgress)
    expect(snapshot.gameplay.progression.statistics).toBe(publication.state.statistics)
    expect(gameDecimalToCanonicalString(snapshot.gameplay.progression.dyson.totalPanelsDecayed)).toBe(
      gameDecimalToCanonicalString(state.dyson.totalPanelsDecayed),
    )
    expect(gameDecimalToCanonicalString(snapshot.gameplay.progression.infinity.breakTarget)).toBe('1e1000')
    expect(snapshot.gameplay.runtime.tinker.status).toBe('ready')
    if (snapshot.gameplay.runtime.tinker.status === 'ready') {
      expect(isGameDecimal(snapshot.gameplay.runtime.tinker.value.stats.assemblyYield)).toBe(true)
    }
    expect(isGameDecimal(snapshot.gameplay.derived.infinity.currentReward)).toBe(true)
    expect(isGameDecimal(snapshot.gameplay.derived.avocado.total)).toBe(true)
    expect(isGameDecimal(snapshot.gameplay.derived.reality.nextUniverseDesignation)).toBe(true)
    expect(snapshot.gameplay.derived.reality.workerBatchSize).toBe(128n)
    expect(snapshot.gameplay.derived.dyson.status).toBe('ready')
    if (snapshot.gameplay.derived.dyson.status === 'ready') {
      expect(isGameDecimal(snapshot.gameplay.derived.dyson.value.presentation.activePanelMetric.value)).toBe(true)
      expect(isGameDecimal(
        snapshot.gameplay.derived.dyson.value.presentation.facilities.assembly_lines.ownership.total,
      )).toBe(true)
    }
    expect(snapshot.gameplay.visibility.skills.routeUnlocked).toBe(true)
    expect(snapshot.gameplay.visibility.infinity.routeUnlocked).toBe(true)
    expect(snapshot.gameplay.visibility.reality).toMatchObject({
      routeVisible: true,
      routeUnlocked: true,
    })

    const assemblyLine = snapshot.gameplay.previews.dyson.basicFacilities.find(
      ({ facilityId }) => facilityId === 'assembly_lines',
    )
    expect(assemblyLine?.eligible).toBe(true)
    expect(isGameDecimal(assemblyLine?.cost)).toBe(true)
    if (assemblyLine !== undefined && isGameDecimal(assemblyLine.cost)) {
      expect(gameDecimalToCanonicalString(assemblyLine.cost)).toBe('1e2')
    }
    expect(snapshot.gameplay.previews.research.cards.some(({ eligible }) => eligible)).toBe(true)
    expect(snapshot.gameplay.previews.infinity.shop.some(({ eligible }) => eligible)).toBe(true)
    expect(snapshot.gameplay.previews.dream.foundational.some(({ eligible }) => eligible)).toBe(true)
    expect(snapshot.gameplay.previews.reality.upgrades.some(({ eligible }) => eligible)).toBe(true)
    expect(snapshot.gameplay.previews.quantum.upgrades.some(({ eligible }) => eligible)).toBe(true)
    expect(snapshot.gameplay.previews.avocado.feeds.some(({ eligible }) => eligible)).toBe(true)
    const hunter = snapshot.gameplay.previews.dream.foundational.find(
      ({ purchase }) => purchase === 'hunters',
    )
    expect(hunter?.influenceQuotes?.map(({ requestedMode }) => requestedMode)).toEqual([
      'buy-1',
      'buy-10',
      'buy-50',
      'buy-100',
      'buy-max',
    ])
    expect(hunter?.selectedInfluenceQuote?.requestedMode).toBe(
      state.dyson.automation.buyMode,
    )
    expect(isGameDecimal(snapshot.gameplay.previews.quantum.leap.requestedShards)).toBe(true)
    expect(isGameDecimal(snapshot.gameplay.previews.quantum.leap.infinityPointsConsumed)).toBe(true)
    expect(isGameDecimal(snapshot.gameplay.previews.quantum.leap.infinityPointsRemainder)).toBe(true)
    expect(containsMaximumNumber(snapshot.gameplay.previews)).toBe(false)
  }, 30_000)

  test('loads composite native previews for Reality and Quantum routes', () => {
    const publication = createCanonicalRuntimePublicationV2(Object.freeze({
      revision: 12,
      state: migrated.state,
      runtime: migrated.runtime,
    }))
    const revision = Object.freeze({ session: 1, state: 12, durable: 12 })
    const reality = selectFrontendApplicationSnapshotV2(
      publication,
      revision,
      'clean',
      'reality',
      TEST_TINKER,
      STANDARD_INFINITY_AUTHORITY,
    )
    const quantum = selectFrontendApplicationSnapshotV2(
      publication,
      revision,
      'clean',
      'quantum',
      TEST_TINKER,
      STANDARD_INFINITY_AUTHORITY,
    )
    if (reality.phase !== 'ready' || quantum.phase !== 'ready') {
      throw new Error('Expected ready V2 snapshots.')
    }
    expect(reality.gameplay.previews.dream.foundational).not.toHaveLength(0)
    expect(reality.gameplay.previews.reality.upgrades).not.toHaveLength(0)
    expect(quantum.gameplay.previews.quantum.sections).not.toHaveLength(0)
    expect(quantum.gameplay.previews.avocado.feeds).toHaveLength(3)
  }, 30_000)

  test('guards native V2 families from regressing into the legacy selector', () => {
    const source = readFileSync(
      new URL('./frontendSnapshotV2.ts', import.meta.url),
      'utf8',
    )
    expect(source).not.toContain('projectLegacyPresentationStateWithSafety(\n    publication.state')
    expect(source).not.toContain('selectLegacyFrontendBridgeFamilies(')
    expect(source).toContain('NATIVE_PREVIEW_METADATA')
    expect(source).not.toContain('as unknown as DeepReadonly<FrontendGameplayPreviews>')
    expect(source).toContain('production.facilityProducerRates.matrioshka_brains')
    expect(source).not.toContain('selectFrontendApplicationSnapshot({')
    expect(source).toContain(
      "from '../application/frontendPresentationMetadata'",
    )
    expect(source).toContain(
      "from '../application/frontendCommandReadiness'",
    )
    expect(source).not.toContain('selectFrontendReadinessConstants')
    for (const commitCapablePreview of [
      'quoteDreamCommandV2',
      'quoteCanonicalDreamResetV2',
      'quoteCanonicalQuantumResetV2',
      'quoteQuantumUpgradeV2',
    ]) {
      expect(source).not.toContain(commitCapablePreview)
    }

    const progression = source.slice(
      source.indexOf('function selectV2Progression('),
      source.indexOf('function selectV2GameplayVisibility('),
    )
    for (const family of [
      'meta',
      'dyson',
      'infinity',
      'skills',
      'research',
      'reality',
      'quantum',
      'avocado',
      'timeline',
      'secretProgress',
      'statistics',
    ]) {
      expect(progression).not.toContain(`legacy.${family}`)
    }
    expect(progression).toContain('dream,')
    expect(source).not.toContain('includeStatistics: false')
    expect(source).toContain('projectInfinityProgressV2(')
    expect(source).toContain('derivePreparedAvocadoMultiplierV2(state)')
    expect(source).toContain('reality: selectV2RealityDerivedFacts(state)')
    expect(source).toContain('dyson = selectV2DysonDerivedFacts(publication)')
    expect(source).toContain('story: selectV2StoryDerivedFacts(state, dyson)')

    expect(source).toContain("previewDemand === 'reality' && family === 'simulations'")
    expect(source).toContain("previewDemand === 'quantum' && family === 'avocato'")
  })
})

function containsMaximumNumber(value: unknown): boolean {
  if (value === Number.MAX_VALUE) return true
  if (Array.isArray(value)) return value.some(containsMaximumNumber)
  if (typeof value !== 'object' || value === null) return false
  return Object.values(value).some(containsMaximumNumber)
}
