import { describe, expect, test } from 'vitest'
import { hydrateGameState } from '../../src/game-state/mapping'
import { validateCanonicalGameState } from '../../src/game-state/validate'
import { prepareImportedSaveText } from '../../src/save/import'
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
    fresh: 'c731c8401b85982c41b03aca2983046cbe33b8e17a5299fd23f309a9685d2f16',
    'mid-swarm': '6ab07a40a1ef3335fa0feebcc232f92109c0982c3f09f0b444d063051904cc03',
    'first-infinity': '41680b2279087d37bf35f382d1197d5a4d68804557b10b52ebcffe2f1cb54ea0',
    'mature-infinity': 'bb91311ad100f51b8ff64faa8a2591f08155858adeeb297b373e25b5fc82f087',
    'reality-unlock': 'c86548e9785016fd5ad949e311e7d2dfca6d07431487b6a36b8c35240764e697',
    'mature-simulations': '63263f12e45210bb07b081601a5a461b3b6e1e81bd43b711bcf11af20aa05fab',
    'quantum-unlock': '3fcf6ec55e212e5a9376eb3c636108547f455c1357128d78cc90b19a87b2a0d0',
    'late-quantum': 'c56c7836fb83d1a8a2810fa8fce6690aef8138252a6096fc1c46eccc3460e6a7',
    'maximum-skills': 'ebd0575d13626e671b06a15c3839920099cd2f2588a117e278405645c105fb43',
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
