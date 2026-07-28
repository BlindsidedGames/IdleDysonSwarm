import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import type {
  CanonicalGameStateV1,
  SkillRuntimeState,
} from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import { deriveDysonIntermediates } from './dysonDerivedIntermediates'

const fixture = readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)

function state(
  skillIds: readonly string[],
  timers: Readonly<Record<string, number>> = {},
): CanonicalGameStateV1 {
  const source = hydrateGameState(
    prepareIdb1Save(fixture).prepared,
  ).state
  const owned = new Set(skillIds)
  return {
    ...source,
    dyson: {
      ...source.dyson,
      workers: 100,
      researchers: 1_000,
      facilities: {
        ...source.dyson.facilities,
        servers: [50, 50],
      },
    },
    skills: {
      ...source.skills,
      byId: Object.fromEntries(
        Object.entries(source.skills.byId).map(([id, skill]) => [
          id,
          {
            ...skill,
            owned: owned.has(id),
            timerSeconds: timers[id] ?? 0,
          } satisfies SkillRuntimeState,
        ]),
      ),
    },
  }
}

describe('Dyson derived intermediates', () => {
  test('matches Rudimentary Singularity and its ordered multipliers', () => {
    const assemblyRate = 1_024
    const base = Math.pow(
      Math.log2(assemblyRate),
      1 + Math.log10(assemblyRate) / 10,
    )
    const result = deriveDysonIntermediates(
      state([
        'rudimentarySingularity',
        'unsuspiciousAlgorithms',
        'clusterNetworking',
      ]),
      {
        managerAssemblyLineProduction: assemblyRate,
        panelLifetimeSeconds: 10,
      },
    )
    expect(result.rudimentarySingularityProduction).toBeCloseTo(
      base * 10 * (1 + Math.fround(0.05) * 2),
      14,
    )
  })

  test('matches the additive Pocket Protectors chain', () => {
    const result = deriveDysonIntermediates(
      state([
        'pocketDimensions',
        'pocketProtectors',
        'dimensionalCatCables',
        'solarBubbles',
      ]),
      {
        managerAssemblyLineProduction: 0,
        panelLifetimeSeconds: 100,
      },
    )
    expect(result.pocketDimensionsProduction).toBe(
      (Math.log10(100) + Math.log10(1_000)) * 5 * 2,
    )
  })

  test('matches multiverse, Android cap and quantum computation', () => {
    const source = state(
      [
        'rudimentarySingularity',
        'pocketDimensions',
        'pocketMultiverse',
        'pocketAndroids',
        'quantumComputing',
      ],
      { pocketAndroids: 3565 },
    )
    const result = deriveDysonIntermediates(source, {
      managerAssemblyLineProduction: 16,
      panelLifetimeSeconds: 10,
    })
    const rudimentary = Math.pow(
      Math.log2(16),
      1 + Math.log10(16) / 10,
    )
    expect(result.pocketDimensionsProduction).toBeCloseTo(
      Math.log10(100) *
        Math.log10(1_000) *
        100 *
        (1 + Math.log2(rudimentary)),
      14,
    )
  })

  test('returns neutral values without enabling skills', () => {
    expect(
      deriveDysonIntermediates(state([]), {
        managerAssemblyLineProduction: 1e100,
        panelLifetimeSeconds: 1e100,
      }),
    ).toEqual({
      rudimentarySingularityProduction: 0,
      pocketDimensionsProduction: 0,
    })
  })

  test('fails closed for invalid derived inputs and active timers', () => {
    expect(() =>
      deriveDysonIntermediates(state([]), {
        managerAssemblyLineProduction: -1,
        panelLifetimeSeconds: 10,
      }),
    ).toThrow('managerAssemblyLineProduction')
    expect(() =>
      deriveDysonIntermediates(
        state(['pocketAndroids'], { pocketAndroids: -1 }),
        {
          managerAssemblyLineProduction: 0,
          panelLifetimeSeconds: 10,
        },
      ),
    ).toThrow('pocketAndroids.timerSeconds')
  })
})
