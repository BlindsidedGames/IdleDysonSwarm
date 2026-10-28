import { beforeAll, beforeEach, describe, expect, test } from 'vitest'
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
  let builtFixtures: ReturnType<typeof createProgressionMatrixFixtures>
  let fixtures: ReturnType<typeof createProgressionMatrixFixtures>

  beforeAll(() => {
    builtFixtures = createProgressionMatrixFixtures()
  })

  beforeEach(() => {
    // Keep each test isolated without replaying the 420 Quantum cycles again.
    fixtures = structuredClone(builtFixtures)
  })

  const expectedSaveSha256 = {
    fresh: '59eb1212fce4d0490341f3bb99669f560ef8a2861a827837094fe487de0baa36',
    'mid-swarm': '0a87b730e3957df08a2b76c74b0e47f809428896a488e85220e2fe18b35d625b',
    'first-infinity': 'e0596ed005750be6921c284c3d6eff28c4e9677feef00a8dc675c4e729ac877b',
    'mature-infinity': 'c0d01aec4fe4b58abb849fc8dd6c38c3f22c211eb0e3a0138ec062c19d397658',
    'reality-unlock': 'ad8e387d762a13299a72d18ee90519ef02dcb25195644f5c6888f8cfefa00292',
    'mature-simulations': 'eaf667617f832bae1583f9a0a9e7c01dd0d69147c87c64f28e772c328b43cdf2',
    'quantum-unlock': '46fce0907464d114eb0d32fffad7ccd33a6556137631dda0136bc9d12d86f2b2',
    'late-quantum': '044ea2dcd50a7c1ba582e841a1ed6a97e09c9bdfc1f6fa652ff67e6d3a3ee69b',
    'maximum-skills': '30091763a2a0148420db85194276be54b103bdfc567c9def94081a782fe25f55',
  }
  test('materializes every named deterministic state with stable fingerprints', () => {
    const first = fixtures
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
    const built = fixtures
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
    const byId = Object.fromEntries(fixtures.map((fixture) => [fixture.id, fixture]))
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
      fixtures.map((fixture) => [fixture.id, fixture]),
    )
    expect(byId.fresh.reachableRoutes).toEqual([
      'bots', 'research', 'story', 'wiki', 'offline-time', 'statistics', 'settings',
    ])
    expect(byId['mid-swarm'].reachableRoutes).toContain('skills')
    expect(byId['first-infinity'].reachableRoutes).toContain('infinity')
    expect(byId['mature-infinity'].reachableRoutes).not.toContain('reality')
    expect(byId['reality-unlock'].reachableRoutes).toContain('reality')
    expect(byId['reality-unlock'].reachableRoutes).not.toContain('simulations')
    expect(byId['mature-simulations'].reachableRoutes).toContain('simulations')
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
    const fresh = fixtures[0].state
    const tenBots = { ...fresh, dyson: { ...fresh.dyson, bots: 10 } }
    expect(deriveProgressionRoutes(tenBots)).not.toContain('skills')
    expect(deriveProgressionRoutes({
      ...tenBots,
      skills: { ...tenBots.skills, points: 1n },
    })).toContain('skills')
    expect(deriveProgressionRoutes(fresh)).not.toContain('infinity')
    expect(deriveProgressionRoutes({ ...fresh, meta: { ...fresh.meta, firstInfinityComplete: true } })).toContain('infinity')
    const withSecrets = (secrets: bigint) => ({ ...fresh, infinity: { ...fresh.infinity, points: 41n, spentPoints: secrets, secretsOfTheUniverse: secrets } })
    expect(deriveProgressionRoutes(withSecrets(26n))).not.toContain('reality')
    const realityUnlocked = withSecrets(27n)
    expect(deriveProgressionRoutes(realityUnlocked)).toContain('reality')
    expect(deriveProgressionRoutes(realityUnlocked)).not.toContain('simulations')
    const withManualInfluence = (manualInfluence: number) => ({
      ...realityUnlocked,
      statistics: {
        ...realityUnlocked.statistics,
        lifetime: {
          ...realityUnlocked.statistics.lifetime,
          manualInfluence,
        },
      },
    })
    expect(deriveProgressionRoutes(withManualInfluence(127))).not.toContain('simulations')
    expect(deriveProgressionRoutes(withManualInfluence(128))).toContain('simulations')
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
