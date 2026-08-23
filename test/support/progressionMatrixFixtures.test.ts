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
    fresh: '97bed9e16cfecb39e4ac33d54b5990087b09e7cd831dfb04417437b61a63eae6',
    'mid-swarm': '9fbd9913a2f755a7233c36dc04414c2c36f37d2cb2ddf2f8f94b3a826d30d66f',
    'first-infinity': '153db7d80cfb44bc8660f0ffa208c4e90d6783ac607efa549a0e5715cbd449c6',
    'mature-infinity': '2655f5fb89a8de39600a6fde2f0cd42b260df5ee58f1ae88ad26c19e787c0aaf',
    'reality-unlock': 'c0876f3568e9ef909dba164e389c2157ceab2f8b4451dde2f78e63fdf7627666',
    'mature-simulations': '1b05c7c4b1fbd07791c3949737d000fc9640767364bc2b8f7cd73a047d30e40c',
    'quantum-unlock': 'de7da51d884cf89e057970225bd9326782382234b0fdb9f696c8c0b7521e2292',
    'late-quantum': '35e3d9205a82240da56156075bda56bfdf78890180901b7c5d0a98b75212430f',
    'maximum-skills': 'd78a61b98b5c6a3c76a375b8d60243ad27360e4c4f89ab2faa8fb1cf38453fda',
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
