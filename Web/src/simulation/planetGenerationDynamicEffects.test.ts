import { describe, expect, test } from 'vitest'
import {
  PLANET_GENERATION_DYNAMIC_EFFECT_ORDERS,
  tryResolvePlanetGenerationDynamicEffect,
  type PlanetGenerationDynamicInputs,
} from './planetGenerationDynamicEffects'

function inputs(
  skills: readonly string[] = [],
  overrides: Partial<PlanetGenerationDynamicInputs> = {},
): PlanetGenerationDynamicInputs {
  return {
    ownedSkills: new Set(skills),
    researchers: 0,
    fragments: 0n,
    assemblyLines: [0, 0],
    planets: [0, 0],
    panelsPerSecond: 0,
    panelLifetimeSeconds: 10,
    bots: 0,
    scienceBoostLevel: 0,
    ...overrides,
  }
}

const resolve = (
  skill: string,
  state: PlanetGenerationDynamicInputs,
): number | undefined =>
  tryResolvePlanetGenerationDynamicEffect(
    `effect.${skill}.planets_per_second`,
    state,
  )

describe('Unity planet-generation dynamic effects', () => {
  test('preserves authored additive effect order', () => {
    expect(PLANET_GENERATION_DYNAMIC_EFFECT_ORDERS).toEqual({
      scientificPlanets: 10,
      planetAssembly: 20,
      shellWorlds: 30,
      stellarSacrifices: 40,
      shouldersOfTheFallen: 45,
    })
    expect(Object.isFrozen(PLANET_GENERATION_DYNAMIC_EFFECT_ORDERS)).toBe(
      true,
    )
  })

  test('matches scientific planet prerequisites and chained modifiers', () => {
    expect(
      resolve(
        'scientificPlanets',
        inputs(['scientificPlanets'], { researchers: 1 }),
      ),
    ).toBe(0)
    expect(
      resolve(
        'scientificPlanets',
        inputs(['scientificPlanets'], { researchers: 100 }),
      ),
    ).toBe(2)
    expect(
      resolve(
        'scientificPlanets',
        inputs(
          [
            'scientificPlanets',
            'hubbleTelescope',
            'jamesWebbTelescope',
            'terraformingProtocols',
          ],
          { researchers: 100, fragments: 3n },
        ),
      ),
    ).toBe(19)
  })

  test('matches assembly-line threshold and base-ten logarithm', () => {
    expect(
      resolve(
        'planetAssembly',
        inputs(['planetAssembly'], { assemblyLines: [4, 5] }),
      ),
    ).toBe(0)
    expect(
      resolve(
        'planetAssembly',
        inputs(['planetAssembly'], { assemblyLines: [4, 6] }),
      ),
    ).toBe(1)
  })

  test('preserves Unity shell-world gating and base-two logarithm', () => {
    expect(
      resolve(
        'shellWorlds',
        inputs(['shellWorlds'], { planets: [1, 1] }),
      ),
    ).toBe(0)
    expect(
      resolve(
        'shellWorlds',
        inputs(['shellWorlds', 'planetAssembly'], {
          planets: [1, 1],
        }),
      ),
    ).toBe(1)
  })

  test('matches stellar galaxy transforms and inclusive bot threshold', () => {
    const state = inputs(['stellarSacrifices'], {
      panelsPerSecond: 400_000_000_000_000,
      panelLifetimeSeconds: 10,
      bots: 200_000_000_000,
    })
    expect(resolve('stellarSacrifices', state)).toBe(Math.log10(2))
    expect(
      resolve('stellarSacrifices', {
        ...state,
        bots: 199_999_999_999,
      }),
    ).toBe(0)

    const transformed = inputs(
      ['stellarSacrifices', 'stellarObliteration', 'supernova'],
      {
        panelsPerSecond: 4_000_000_000,
        panelLifetimeSeconds: 10,
        bots: Number.MAX_VALUE,
      },
    )
    expect(resolve('stellarSacrifices', transformed)).toBe(
      Math.pow(Math.log10(20), 2),
    )
  })

  test('matches stellar bot scaling and improvements divisor', () => {
    const state = inputs(
      [
        'stellarSacrifices',
        'stellarObliteration',
        'supernova',
        'stellarDominance',
        'stellarImprovements',
      ],
      {
        panelsPerSecond: 4_000_000_000,
        panelLifetimeSeconds: 10,
        bots: 199_999_999_999,
      },
    )
    expect(resolve('stellarSacrifices', state)).toBe(0)
    expect(
      resolve('stellarSacrifices', {
        ...state,
        bots: 200_000_000_000,
      }),
    ).toBeGreaterThan(0)
  })

  test('matches Shoulders of the Fallen prerequisites and base-two log', () => {
    expect(
      resolve(
        'shouldersOfTheFallen',
        inputs(['shouldersOfTheFallen'], { scienceBoostLevel: 8 }),
      ),
    ).toBe(0)
    expect(
      resolve(
        'shouldersOfTheFallen',
        inputs(['shouldersOfTheFallen', 'scientificPlanets'], {
          scienceBoostLevel: 8,
        }),
      ),
    ).toBe(3)
  })

  test('does not claim unsupported identifiers', () => {
    expect(resolve('notPorted', inputs())).toBeUndefined()
    expect(
      tryResolvePlanetGenerationDynamicEffect(
        'effect.scientificPlanets.panel_lifetime',
        inputs(['scientificPlanets']),
      ),
    ).toBeUndefined()
  })

  test('fails closed for invalid recognized dependencies', () => {
    expect(() =>
      resolve(
        'scientificPlanets',
        inputs(['scientificPlanets'], { researchers: Number.NaN }),
      ),
    ).toThrow(
      'Planet generation effects require finite non-negative researchers.',
    )
    expect(() =>
      resolve(
        'scientificPlanets',
        inputs(['scientificPlanets'], {
          fragments: 9_223_372_036_854_775_808n,
        }),
      ),
    ).toThrow(
      'Planet generation effects require long-range non-negative fragments.',
    )
  })
})
