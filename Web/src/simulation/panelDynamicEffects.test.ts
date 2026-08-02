import { describe, expect, test } from 'vitest'
import {
  tryResolvePanelLifetimeDynamicEffect,
  tryResolvePanelsPerSecondDynamicEffect,
  type PanelDynamicEffectInputs,
} from './panelDynamicEffects'

function inputs(
  skills: readonly string[] = [],
  overrides: Partial<PanelDynamicEffectInputs> = {},
): PanelDynamicEffectInputs {
  return {
    ownedSkills: new Set(skills),
    botMultitasking: false,
    botDistribution: 0.25,
    fragments: 0n,
    managers: [0, 0],
    androidsTimerSeconds: 0,
    workers: 0,
    totalPanelsDecayed: 0,
    panelsPerSecond: 0,
    panelLifetimeSeconds: 10,
    bots: 0,
    ...overrides,
  }
}

const lifetime = (
  skill: string,
  state: PanelDynamicEffectInputs,
): number | undefined =>
  tryResolvePanelLifetimeDynamicEffect(
    `effect.${skill}.panel_lifetime`,
    state,
  )

const panelRate = (
  skill: string,
  state: PanelDynamicEffectInputs,
): number | undefined =>
  tryResolvePanelsPerSecondDynamicEffect(
    `effect.${skill}.panels_per_second`,
    state,
  )

describe('Unity panel lifetime dynamic effects', () => {
  test('matches maintenance distribution and multitasking branches', () => {
    expect(lifetime('panelMaintenance', inputs(['panelMaintenance']))).toBe(75)
    expect(
      lifetime(
        'panelMaintenance',
        inputs(['panelMaintenance'], { botMultitasking: true }),
      ),
    ).toBe(100)
    expect(lifetime('panelMaintenance', inputs())).toBe(0)
  })

  test('matches warranty exponential behavior', () => {
    expect(lifetime('panelWarranty', inputs(['panelWarranty']))).toBe(1)
    expect(
      lifetime('panelWarranty', inputs(['panelWarranty'], { fragments: 2n })),
    ).toBe(2)
    expect(
      lifetime(
        'panelWarranty',
        inputs(['panelWarranty'], { fragments: 1_025n }),
      ),
    ).toBe(Number.POSITIVE_INFINITY)
  })

  test('matches manager logarithm and minimum condition', () => {
    expect(
      lifetime(
        'artificiallyEnhancedPanels',
        inputs(['artificiallyEnhancedPanels'], { managers: [0.4, 0.5] }),
      ),
    ).toBe(0)
    expect(
      lifetime(
        'artificiallyEnhancedPanels',
        inputs(['artificiallyEnhancedPanels'], { managers: [5, 5] }),
      ),
    ).toBe(5)
  })

  test('matches Android timer floor and 200 cap', () => {
    expect(
      lifetime(
        'androids',
        inputs(['androids'], { androidsTimerSeconds: 599 }),
      ),
    ).toBe(199)
    expect(
      lifetime(
        'androids',
        inputs(['androids'], { androidsTimerSeconds: 600 }),
      ),
    ).toBe(200)
    expect(
      lifetime(
        'androids',
        inputs(['androids'], { androidsTimerSeconds: 601 }),
      ),
    ).toBe(200)
  })

  test('matches renewable-energy and citadel logarithm thresholds', () => {
    expect(
      lifetime(
        'renewableEnergy',
        inputs(['renewableEnergy'], { workers: 9_999_999 }),
      ),
    ).toBe(1)
    expect(
      lifetime(
        'renewableEnergy',
        inputs(['renewableEnergy'], { workers: 10_000_000 }),
      ),
    ).toBe(1.1)
    expect(
      lifetime(
        'citadelCouncil',
        inputs(['citadelCouncil'], { totalPanelsDecayed: 1 }),
      ),
    ).toBe(0)
    expect(
      lifetime(
        'citadelCouncil',
        inputs(['citadelCouncil'], { totalPanelsDecayed: 1.2 }),
      ),
    ).toBe(1)
  })

  test('matches stellar-dominance requirements and strict bot comparison', () => {
    const state = inputs(['stellarDominance'], {
      panelsPerSecond: 2_000,
      panelLifetimeSeconds: 10,
      bots: 100,
    })
    expect(lifetime('stellarDominance', state)).toBe(1)
    expect(lifetime('stellarDominance', { ...state, bots: 101 })).toBe(10)
    expect(
      lifetime(
        'stellarDominance',
        inputs(['stellarDominance', 'stellarImprovements'], {
          bots: 0.1,
        }),
      ),
    ).toBe(1)
    expect(
      lifetime(
        'stellarDominance',
        inputs(['stellarDominance', 'stellarImprovements'], {
          bots: 0.10000000000000002,
        }),
      ),
    ).toBe(10)
  })
})

describe('Unity panels-per-second dynamic effects', () => {
  test('matches Reapers base-two logarithm and strict threshold', () => {
    expect(
      panelRate(
        'reapers',
        inputs(['reapers'], { totalPanelsDecayed: 2 }),
      ),
    ).toBe(1)
    expect(
      panelRate(
        'reapers',
        inputs(['reapers'], { totalPanelsDecayed: 4 }),
      ),
    ).toBe(1.2)
    expect(panelRate('reapers', inputs())).toBe(1)
  })

  test('matches Rocket Mania base-twenty logarithm and strict threshold', () => {
    expect(
      panelRate(
        'rocketMania',
        inputs(['rocketMania'], { panelsPerSecond: 20 }),
      ),
    ).toBe(1)
    expect(
      panelRate(
        'rocketMania',
        inputs(['rocketMania'], { panelsPerSecond: 400 }),
      ),
    ).toBe(2)
    expect(panelRate('rocketMania', inputs())).toBe(1)
  })

  test('does not claim unsupported effect identifiers', () => {
    expect(lifetime('notPorted', inputs())).toBeUndefined()
    expect(panelRate('notPorted', inputs())).toBeUndefined()
    expect(
      tryResolvePanelLifetimeDynamicEffect(
        'effect.androids.panels_per_second',
        inputs(['androids']),
      ),
    ).toBeUndefined()
  })

  test('fails closed when a recognized effect has invalid dependencies', () => {
    expect(() =>
      lifetime(
        'androids',
        inputs(['androids'], { androidsTimerSeconds: Number.NaN }),
      ),
    ).toThrow(
      'Panel dynamic effects require finite non-negative androids timer.',
    )
    expect(() =>
      panelRate(
        'reapers',
        inputs(['reapers'], { totalPanelsDecayed: -1 }),
      ),
    ).toThrow(
      'Panel dynamic effects require finite non-negative total panels decayed.',
    )
  })
})
