import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import { prepareIdb1Save } from '../save/prepare'
import { deriveDreamSpaceAgeProductionFacts } from './dreamSpaceAge'
import { SIMULATION_RESOURCE_MAXIMUM } from './numeric'

const baseline = hydrateGameState(prepareIdb1Save(readFileSync(
  new URL('../../test/fixtures/schema-08-canonical-idb1-main-save.txt', import.meta.url),
  'utf8',
)).prepared).state

describe('Space Factory formula operands', () => {
  test.each([false, true])('publishes the existing active rate with overdrive energy available: %s', energyAvailable => {
    const state = {
      ...baseline,
      dream: {
        ...baseline.dream,
        resources: { ...baseline.dream.resources, spaceFactories: 100, dysonPanels: 0n, energy: 0, solarPanels: energyAvailable ? 1e9 : 0, fusion: 0, swarmPanels: 0n },
        upgrades: { ...baseline.dream.upgrades, sfActivator1: true, sfActivator2: true, sfActivator3: false },
      },
    }
    const result = deriveDreamSpaceAgeProductionFacts(state, 2)
    expect(result.status).toBe('success')
    if (result.status !== 'success') throw new Error('Invalid fixture')
    const factory = result.facts.spaceFactory
    expect(factory.overdriveActive).toBe(energyAvailable)
    if (energyAvailable) expect(factory.overdriveMultiplier).toBeGreaterThan(1)
    else expect(factory.overdriveMultiplier).toBe(1)
    expect(factory.sourceCount).toBe(100)
    expect(factory.globalMultiplier).toBe(8)
    expect(factory.baseProgressPerSecond).toBe(24)
    expect(factory.progressPerSecond).toBe(24 * factory.overdriveMultiplier)
    expect(factory.cyclesPerSecond).toBe(factory.progressPerSecond / 2)
  })

  test.each([0, 100])('marks count %s inactive when production cannot advance', count => {
    const result = deriveDreamSpaceAgeProductionFacts({
      ...baseline,
      dream: { ...baseline.dream, resources: { ...baseline.dream.resources, spaceFactories: count, dysonPanels: BigInt(SIMULATION_RESOURCE_MAXIMUM) } },
    }, 1)
    expect(result.status).toBe('success')
    if (result.status !== 'success') throw new Error('Invalid fixture')
    expect(result.facts.spaceFactory.active).toBe(false)
    expect(result.facts.spaceFactory.progressPerSecond).toBe(0)
  })
})
