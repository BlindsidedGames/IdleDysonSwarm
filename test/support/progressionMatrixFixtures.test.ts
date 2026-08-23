import { describe, expect, test } from 'vitest'
import { hydrateGameState } from '../../src/game-state/mapping'
import { validateCanonicalGameState } from '../../src/game-state/validate'
import { prepareImportedSaveText } from '../../src/save/import'
import { serializeWebSave } from '../../src/save/serialization'
import { previewCanonicalSkillCatalog } from '../../src/simulation/canonicalSkillTransactions'
import { CanonicalRuntimeSession } from '../../src/application/canonicalRuntimeSession'
import { createProductionCanonicalApplicationFactory } from '../../src/application/productionApplicationFactory'
import type {
  FirstLaunchMigrationResult,
  SaveRepository,
} from '../../src/save/repository'
import type { PreparedSave } from '../../src/save/prepare'
import {
  createProgressionMatrixFixtures,
  loadCheckedInProgressionMatrixFixtures,
  deriveProgressionRoutes,
  PROGRESSION_FIXTURE_IDS,
} from './progressionMatrixFixtures'

describe('production-valid progression matrix fixtures', () => {
  const expectedSaveSha256 = {
    fresh: '97da444f0420a54c11173c4bc844b00572ecaeb3bcc46c35cca858b3558b0db1',
    'mid-swarm': 'c19c72acebe80bfe72c2bba2cbfb1b692f296bffe0e43c54a3455e48c6d10429',
    'first-infinity': 'b16975cd75d45b44df72940fb55442225a88c6927f24c31ef6e7e2a4c07e6922',
    'mature-infinity': '5a6e27434a8264050e77624e6d3521a8d10fed541b3a66f3878c8318b2a71801',
    'reality-unlock': 'bf43961a72217e9c8df606fe2d3da9038e26ed2080d83968efafaa116c29840f',
    'mature-simulations': '51bbdabeb552ccfb1ae0448990034b4d9c8bde7c167ad2b01c7a0a721f56075e',
    'quantum-unlock': 'a47d4b4eb02255f6a68a0ef9a8fbf228571aec018fba992318532eea6a87eb9e',
    'late-quantum': '8e21b7b2dfb0dcf48702f27aacea13628dbe3a226e9b40a19749f52cbecef27c',
    'maximum-skills': '0e1700c9223268ca8689d23d02e0895b263df8c1fa1465b83b06acb456c33973',
  }
  test('materializes every named deterministic state with stable fingerprints', () => {
    const first = createProgressionMatrixFixtures()
    const second = createProgressionMatrixFixtures()
    expect(first.map((fixture) => fixture.id)).toEqual(PROGRESSION_FIXTURE_IDS)
    expect(first.map((fixture) => fixture.fingerprint)).toEqual(
      second.map((fixture) => fixture.fingerprint),
    )
    expect(new Set(first.map((fixture) => fixture.fingerprint)).size).toBe(first.length)
    for (const fixture of first) {
      expect(fixture.saveSha256).toBe(expectedSaveSha256[fixture.id])
      expect(validateCanonicalGameState(fixture.state)).toEqual({ valid: true, errors: [] })
      const imported = prepareImportedSaveText(
        fixture.saveText,
        '2026-08-19T00:00:00.000Z',
      )
      expect(validateCanonicalGameState(hydrateGameState(imported).state).valid).toBe(true)
      const runtime = new CanonicalRuntimeSession(imported, {
        entitlements: { permanentDoubleIp: false },
      })
      const reconstructed = new CanonicalRuntimeSession(
        runtime.prepare(runtime.initialState),
        { entitlements: { permanentDoubleIp: false } },
      )
      expect(reconstructed.initialState).toEqual(runtime.initialState)
    }
  })

  test('canonical builders exactly reproduce the immutable profiling artifacts', () => {
    const built = createProgressionMatrixFixtures()
    const checkedIn = loadCheckedInProgressionMatrixFixtures()
    expect(checkedIn.map((fixture) => fixture.id)).toEqual(PROGRESSION_FIXTURE_IDS)
    expect(checkedIn.map((fixture) => fixture.saveSha256)).toEqual(built.map((fixture) => fixture.saveSha256))
    expect(checkedIn.map((fixture) => fixture.fingerprint)).toEqual(built.map((fixture) => fixture.fingerprint))
    expect(checkedIn.map((fixture) => fixture.saveText)).toEqual(built.map((fixture) => fixture.saveText))
  })

  test('opens and advances every checked-in fixture through the full production application engine', async () => {
    for (const fixture of loadCheckedInProgressionMatrixFixtures()) {
      const prepared = prepareImportedSaveText(
        fixture.saveText,
        '2026-08-19T00:00:00.000Z',
      )
      const application = createProductionCanonicalApplicationFactory({
        createFirstRunSave: () => {
          throw new Error('Fixture certification must not use first-run fallback.')
        },
        readHostEntitlements: () => ({ permanentDoubleIp: false }),
      })(new FixtureRepository(prepared))

      await expect(application.start(), fixture.id).resolves.toMatchObject({
        phase: 'ready',
        source: 'primary',
      })
      expect(application.advanceActive(1), fixture.id).toMatchObject({
        accepted: true,
      })
    }
  })

  test('rejects an invalid automation phase before commit and preserves the current fixture', async () => {
    const fixtures = loadCheckedInProgressionMatrixFixtures()
    const current = prepareImportedSaveText(
      fixtures[0].saveText,
      '2026-08-19T00:00:00.000Z',
    )
    const mature = prepareImportedSaveText(
      fixtures.find((fixture) => fixture.id === 'mature-infinity')!.saveText,
      '2026-08-19T00:00:00.000Z',
    )
    const hydrated = hydrateGameState(mature)
    const invalid = hydrated.prepare({
      ...hydrated.state,
      timeline: {
        ...hydrated.state.timeline,
        automationTimeUntilNextEvent: 1,
      },
    })
    const repository = new FixtureRepository(current)
    const application = createProductionCanonicalApplicationFactory({
      createFirstRunSave: () => {
        throw new Error('Invalid-phase import test must not use first-run fallback.')
      },
      readHostEntitlements: () => ({ permanentDoubleIp: false }),
    })(repository)
    await expect(application.start()).resolves.toMatchObject({ phase: 'ready' })
    const before = repository.current

    await expect(application.importSave({
      text: serializeWebSave(invalid.copyValidatedState()),
      importedAtUtc: '2026-08-19T00:00:01.000Z',
      overwriteApproved: true,
    })).resolves.toMatchObject({
      imported: false,
      committed: false,
      code: 'APP-IMPORT-INVALID',
      reason: expect.stringContaining('CANONICAL_EVENT_AUTOMATION_PHASE_INVALID'),
    })
    expect(repository.current).toBe(before)
    expect(repository.commits).toEqual([])
  })

  test('certifies exact Infinity accounting and populated Simulation progression', () => {
    const byId = Object.fromEntries(createProgressionMatrixFixtures().map((fixture) => [fixture.id, fixture]))
    expect(byId['first-infinity'].state.infinity).toMatchObject({ points: 1n, spentPoints: 0n })
    expect(byId['mature-infinity'].state.infinity).toMatchObject({ points: 41n, spentPoints: 26n, secretsOfTheUniverse: 20n })
    expect(byId['mature-infinity'].state.infinity.automationUnlocked).toEqual({ research: true, bots: true })
    expect(byId['mature-infinity'].state.dyson.goalStage).toBe(10n)
    expect(byId['reality-unlock'].state.infinity).toMatchObject({ points: 41n, spentPoints: 37n, secretsOfTheUniverse: 27n, permanentSkillPoints: 10n })
    const simulation = byId['mature-simulations'].state
    expect(simulation.dream.resetCount).toBeGreaterThan(0n)
    expect(simulation.dream.upgrades.counterMeteor).toBe(true)
    expect(simulation.dream.resources.hunters).toBeGreaterThan(0n)
    expect(simulation.dream.resources.gatherers).toBeGreaterThan(0n)
    expect(simulation.dream.resources.community).toBeGreaterThan(0)
    expect(simulation.reality.universeDesignationCount).toBeGreaterThan(0n)
  })

  test('records exact route growth at the authored progression boundaries', () => {
    const byId = Object.fromEntries(
      createProgressionMatrixFixtures().map((fixture) => [fixture.id, fixture]),
    )
    expect(byId.fresh.reachableRoutes).toEqual([
      'bots', 'research', 'story', 'wiki', 'offline-time', 'statistics', 'settings',
    ])
    expect(byId['mid-swarm'].reachableRoutes).toContain('skills')
    expect(byId['first-infinity'].reachableRoutes).toContain('infinity')
    expect(byId['mature-infinity'].reachableRoutes).not.toContain('reality')
    expect(byId['reality-unlock'].reachableRoutes).toEqual(
      expect.arrayContaining(['reality', 'simulations']),
    )
    expect(byId['quantum-unlock'].reachableRoutes).toContain('quantum')
    expect(byId['late-quantum'].reachableRoutes).toContain('avocato')
    expect(byId['late-quantum'].state.quantum.pointsEarned).toBe(420n)
    const maximum = byId['maximum-skills'].state
    expect(Object.values(maximum.skills.byId).filter((skill) => skill.owned)).toHaveLength(96)
    expect(maximum.skills.points).toBe(73n)
    expect(maximum.skills.fragments).toBe(49n)
    const preview = previewCanonicalSkillCatalog(maximum)
    expect(preview.skills.filter((skill) => !skill.owned && skill.purchase.eligible)).toEqual([])
    expect(byId['maximum-skills'].state.infinity.permanentSkillPoints).toBe(10n)
  })

  test('certifies navigation immediately before and at authored boundaries', () => {
    const fresh = createProgressionMatrixFixtures()[0].state
    const withBots = (bots: number) => ({ ...fresh, dyson: { ...fresh.dyson, bots } })
    expect(deriveProgressionRoutes(withBots(9))).not.toContain('skills')
    expect(deriveProgressionRoutes(withBots(10))).toContain('skills')
    expect(deriveProgressionRoutes(fresh)).not.toContain('infinity')
    expect(deriveProgressionRoutes({ ...fresh, meta: { ...fresh.meta, firstInfinityComplete: true } })).toContain('infinity')
    const withSecrets = (secrets: bigint) => ({ ...fresh, infinity: { ...fresh.infinity, points: 41n, spentPoints: secrets, secretsOfTheUniverse: secrets } })
    expect(deriveProgressionRoutes(withSecrets(26n))).not.toContain('reality')
    expect(deriveProgressionRoutes(withSecrets(27n))).toEqual(expect.arrayContaining(['reality', 'simulations']))
    expect(deriveProgressionRoutes(withSecrets(26n))).not.toContain('quantum')
    expect(deriveProgressionRoutes({ ...withSecrets(26n), infinity: { ...withSecrets(26n).infinity, points: 42n } })).toContain('quantum')
    expect(deriveProgressionRoutes(fresh)).not.toContain('avocato')
    expect(deriveProgressionRoutes({ ...fresh, avocado: { ...fresh.avocado, unlocked: true } })).toContain('avocato')
  })
})

class FixtureRepository implements SaveRepository {
  readonly commits: PreparedSave[] = []

  constructor(public current: PreparedSave) {}

  async hasCurrent(): Promise<boolean> {
    return true
  }

  async loadCurrent(): Promise<PreparedSave> {
    return this.current
  }

  async migrateLegacyOnFirstLaunch(): Promise<FirstLaunchMigrationResult> {
    return { status: 'already-migrated', save: this.current }
  }

  async commit(save: PreparedSave): Promise<PreparedSave> {
    this.commits.push(save)
    this.current = save
    return save
  }
}
