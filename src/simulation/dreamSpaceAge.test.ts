import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { createUnityFirstRunPreparedSave } from '../application/firstRun/unityFirstRunSave'
import { prepareImportedSaveText } from '../save/import'
import { prepareIdb1Save } from '../save/prepare'
import { serializeWebSave } from '../save/serialization'
import { deriveDreamRailgunReadinessFacts, deriveDreamSpaceAgeProductionFacts, runDreamRailgunAutomation } from './dreamSpaceAge'
import { SIMULATION_RESOURCE_MAXIMUM } from './numeric'
import { SWARM_AUGMENTS } from './skillSubskills'

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

const railgunSession = hydrateGameState(createUnityFirstRunPreparedSave({ startedAtUtc: '2026-10-05T00:00:00.000Z' }))
const railgunInput = { tickSeconds: 0.1, effectiveDoubleTimeMultiplier: 1, doubleTimeActive: false, doubleTimeRate: 0 }

function fundedRailgun(): CanonicalGameStateV1 {
  const state = structuredClone(railgunSession.state)
  const owned = { owned: true, level: 1, timerSeconds: 0, secondaryTimerSeconds: 0 }
  return {
    ...state,
    challenges: { ...state.challenges!, unlocked: true, blankSlateCompleted: true, hasEarnedGalvanizer: true, galvanizedSkillIds: ['ultimateSwarm'] },
    skills: { ...state.skills, byId: { ...state.skills.byId, ultimateSwarm: owned, [SWARM_AUGMENTS.selfReplicatingWorkers]: owned } },
    dream: {
      ...state.dream,
      disasterStage: 4n,
      resources: { ...state.dream.resources, spaceFactories: 519_000, fusion: 1, swarmPanels: 22_700_000_000_000n, railgunCharge: 0, energy: 1.5838e21, dysonPanels: 9_780_000_000_000_000n },
      upgrades: { ...state.dream.upgrades, sfActivator1: true, sfActivator2: true, sfActivator3: true },
      railgun: { firing: false, fireProgress: 0, shotsRemaining: 0, activeRailguns: 0, reservedPanels: 0n },
    },
  }
}

describe('Railgun charge rounding', () => {
  test('completes all ten rounds after charging a large SRW array', () => {
    const before = fundedRailgun()
    let state = before
    let rounds = 0
    for (let round = 0; round < 10; round += 1) {
      const result = runDreamRailgunAutomation(state, railgunInput)
      expect(result.status).toBe('success')
      state = result.state
      rounds += state.dream.railgun.lastRoundsFired ?? 0
    }
    expect(rounds).toBe(10)
    expect(state.dream.railgun.firing).toBe(false)
    expect(state.dream.railgun.shotsRemaining).toBe(0)
    expect(state.dream.resources.railgunCharge).toBeGreaterThanOrEqual(0)
    expect(state.dream.resources.energy).toBeLessThan(before.dream.resources.energy)
    expect(state.dream.resources.dysonPanels + state.dream.resources.swarmPanels).toBe(before.dream.resources.dysonPanels + before.dream.resources.swarmPanels)
  })

  test('reloads and finishes an existing stuck final round using its reserved panels and charge', () => {
    const seed = fundedRailgun()
    // Captured from the unmodified engine: nine rounds fired, the last short by numerical dust.
    const stuck: CanonicalGameStateV1 = {
      ...seed,
      dream: {
        ...seed.dream,
        resources: { ...seed.dream.resources, energy: 0, dysonPanels: 0n, railgunCharge: 15_379_950_739_697_370_000 },
        railgun: { firing: true, fireProgress: 0.2, shotsRemaining: 1, activeRailguns: 6_151_980_295_879, reservedPanels: 6_151_980_295_879n },
      },
    }
    const saved = serializeWebSave(railgunSession.prepare(stuck).copyValidatedState())
    const loaded = hydrateGameState(prepareImportedSaveText(saved, '2026-10-05T00:00:00.000Z')).state
    expect(loaded.dream.resources.railgunCharge).toBe(stuck.dream.resources.railgunCharge)
    expect(loaded.dream.railgun.reservedPanels).toBe(6_151_980_295_879n)
    const readiness = deriveDreamRailgunReadinessFacts(loaded, railgunInput)
    expect(readiness.status).toBe('success')
    if (readiness.status !== 'success') throw new Error('Invalid Railgun fixture')
    expect(readiness.facts.canFireNextShot).toBe(true)
    const result = runDreamRailgunAutomation(loaded, railgunInput)
    expect(result.panelsLaunched).toBe(6_151_980_295_879n)
    expect(result.state.dream.railgun.firing).toBe(false)
    expect(result.state.dream.railgun.shotsRemaining).toBe(0)
    expect(result.state.dream.railgun.reservedPanels).toBe(0n)
    expect(result.state.dream.resources.railgunCharge).toBe(0)
    expect(result.state.dream.resources.energy).toBe(0)
    expect(result.state.dream.resetCount).toBe(loaded.dream.resetCount)
  })

  test('starts and completes a 42× update when the remaining charge top-up is unrepresentable', () => {
    const seed = fundedRailgun()
    const state = {
      ...seed,
      dream: { ...seed.dream, resources: { ...seed.dream.resources, energy: 6.6885434444231915e28, railgunCharge: 2.2517998136845608e23, swarmPanels: 32_067_530_589_086_570n, dysonPanels: 13_296_447_282_297_530_453n } },
    }
    const readiness = deriveDreamRailgunReadinessFacts(state, railgunInput)
    expect(readiness.status).toBe('success')
    if (readiness.status !== 'success') throw new Error('Invalid Railgun fixture')
    expect(readiness.facts.chargeTransferred).toBe(0)
    expect(readiness.facts.canStartVolley).toBe(true)
    const result = runDreamRailgunAutomation(state, { ...railgunInput, tickSeconds: 1.386 })
    expect(result.state.dream.railgun.lastRoundsFired).toBe(10)
    expect(result.state.dream.railgun.firing).toBe(false)
    expect(result.state.dream.resources.energy).toBe(state.dream.resources.energy)
    expect(result.state.dream.resources.railgunCharge).toBe(0)
    expect(result.state.dream.resources.dysonPanels + result.state.dream.resources.swarmPanels).toBe(state.dream.resources.dysonPanels + state.dream.resources.swarmPanels)
  })

  test('keeps a genuinely underfunded round and its reserved panels waiting', () => {
    const seed = fundedRailgun()
    const state = {
      ...seed,
      dream: {
        ...seed.dream,
        resources: { ...seed.dream.resources, railgunCharge: 1, energy: 0 },
        railgun: { firing: true, shotsRemaining: 1, activeRailguns: 100, fireProgress: 1, reservedPanels: 100n },
      },
    }
    const result = runDreamRailgunAutomation(state, railgunInput)
    expect(result.panelsLaunched).toBe(0n)
    expect(result.state.dream.railgun.shotsRemaining).toBe(1)
    expect(result.state.dream.railgun.reservedPanels).toBe(100n)
    expect(result.state.dream.resources.railgunCharge).toBe(1)
    expect(result.state.dream.resources.swarmPanels).toBe(state.dream.resources.swarmPanels)
  })
})
