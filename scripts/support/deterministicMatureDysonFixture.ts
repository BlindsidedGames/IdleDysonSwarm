import { readFileSync } from 'node:fs'
import type { DysonCompatibilityTuning } from '../../src/game-state/compatibilityTuning'
import type { DysonSkillEffectEvaluationSnapshot } from '../../src/game-state/skillEffectEvaluationSnapshot'
import { hydrateGameState } from '../../src/game-state/mapping'
import type {
  CanonicalGameStateV1,
  SkillRuntimeState,
} from '../../src/game-state/types'
import { prepareIdb1Save } from '../../src/save/prepare'

const fixtureText = readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)

const characterizedState = hydrateGameState(
  prepareIdb1Save(fixtureText).prepared,
).state

export const DETERMINISTIC_DYSON_TUNING: Readonly<DysonCompatibilityTuning> =
  Object.freeze({
    panelsPerSecMulti: 1.25,
    scienceBoostPercent: 0.05,
    moneyMultiUpgradePercent: 0.05,
    assemblyLineUpgradePercent: 0.03,
    aiManagerUpgradePercent: 0.03,
    serverUpgradePercent: 0.03,
    dataCenterUpgradePercent: 0.03,
    planetUpgradePercent: 0.03,
    matrioshkaUpgradePercent: 0.03,
    birchUpgradePercent: 0.03,
    galacticUpgradePercent: 0.03,
  })

export const DETERMINISTIC_DYSON_SNAPSHOT: Readonly<DysonSkillEffectEvaluationSnapshot> =
  Object.freeze({
    panelsPerSecond: 4.2e8,
    panelLifetimeSeconds: 4_200,
    scienceMultiplier: 42,
    rudimentarySingularityProduction: 1.25e5,
    pocketDimensionsProduction: 4.2e4,
    scientificPlanetsProduction: 6.9e3,
    managerAssemblyLineProduction: 4.2e6,
  })

export const DETERMINISTIC_ALL_SKILL_IDS = Object.freeze(
  Object.keys(characterizedState.skills.byId),
)

export interface DeterministicMatureDysonFixtureOptions {
  readonly ownedSkillIds?: readonly string[] | 'all'
  /** Manual count 69 activates every currently authored Avocados condition. */
  readonly conditionsMet?: boolean
}

/**
 * A bounded, deterministic late-game state for differential tests and local
 * microbenchmarks. It deliberately derives from a committed compatibility
 * fixture rather than a developer's machine-specific live save.
 */
export function createDeterministicMatureDysonFixture(
  options: Readonly<DeterministicMatureDysonFixtureOptions> = {},
): CanonicalGameStateV1 {
  const ownedIds = new Set(
    options.ownedSkillIds === 'all'
      ? DETERMINISTIC_ALL_SKILL_IDS
      : (options.ownedSkillIds ?? []),
  )
  const manualCount = options.conditionsMet === false ? 68 : 69
  const byId = Object.fromEntries(
    Object.entries(characterizedState.skills.byId).map(
      ([id, skill]) => [
        id,
        {
          ...skill,
          owned: ownedIds.has(id),
          timerSeconds:
            id === 'superRadiantScattering'
              ? 420
              : id === 'androids'
                ? 69
                : skill.timerSeconds,
        } satisfies SkillRuntimeState,
      ],
    ),
  )
  const levelsById = Object.fromEntries(
    Object.keys(characterizedState.research.levelsById).map(
      (id, index) => [id, (index % 7) + 1],
    ),
  )

  return {
    ...characterizedState,
    meta: {
      ...characterizedState.meta,
      tutorialComplete: true,
      firstInfinityComplete: true,
    },
    dyson: {
      ...characterizedState.dyson,
      money: 2.5e120,
      science: 4.2e105,
      bots: 6.9e80,
      workers: 42_000,
      researchers: 21_000,
      totalPanelsDecayed: 8.4e16,
      botDistribution: 0.42,
      facilities: {
        assembly_lines: [42_000, manualCount],
        ai_managers: [21_000, manualCount],
        servers: [10_500, manualCount],
        data_centers: [5_250, manualCount],
        planets: [2_625, manualCount],
        matrioshka_brains: [420, 42],
        birch_planets: [69, 21],
        galactic_brains: [7, 3],
      },
    },
    infinity: {
      ...characterizedState.infinity,
      points: 4_200n,
      spentPoints: 420n,
      permanentSkillPoints: 10n,
      secretsOfTheUniverse: 27n,
    },
    skills: {
      ...characterizedState.skills,
      points: 200n,
      fragments: 42n,
      byId,
      activeAutoAssignment: [],
    },
    research: {
      ...characterizedState.research,
      levelsById,
    },
    quantum: {
      ...characterizedState.quantum,
      pointsEarned: 420n,
      pointsSpent: 210n,
      cashBonusLevels: 42n,
      scienceBonusLevels: 42n,
      unlocks: Object.fromEntries(
        Object.keys(characterizedState.quantum.unlocks).map((id) => [
          id,
          true,
        ]),
      ) as CanonicalGameStateV1['quantum']['unlocks'],
    },
    avocado: {
      unlocked: true,
      infinityPoints: 4.2e8,
      influence: 6.9e6,
      strangeMatter: 4.2e5,
      overflowMultiplier: 42,
    },
  }
}
