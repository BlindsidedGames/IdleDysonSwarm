import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { hydrateGameState, dehydrateGameState } from '../game-state/mapping'
import { prepareIdb1Save } from '../save/prepare'
import { purchaseDiscovery, EMPTY_DISCOVERY } from './discovery'
import { deriveDiscoveryEffects } from './discoveryEffects'
import { deriveBasicDysonState } from './canonicalDysonDerivation'
import { CanonicalRuntimeSession } from '../application/canonicalRuntimeSession'
import { applyCanonicalOverflowReset } from './canonicalOverflowReset'
import { routeCanonicalGameCommand } from '../application/canonicalGameCommands'
import { DISCRETE_MAXIMUM } from './numeric'

const prepared = prepareIdb1Save(readFileSync(new URL('../../test/fixtures/schema-08-canonical-idb1-main-save.txt', import.meta.url), 'utf8')).prepared
const session = new CanonicalRuntimeSession(prepared, { entitlements: { permanentDoubleIp: false } })
const runtime = session.initialState
const source = { ...runtime.gameState, avocado: { ...runtime.gameState.avocado, overflowPoints: 10n } }
const unlocked = purchaseDiscovery(source, 'unlock')!

describe('Discovery integration', () => {
  it('retires research atomically and does not purchase the Avocato feed unlock', () => {
    expect(unlocked.avocado.overflowPoints).toBe(9n)
    expect(unlocked.avocado.unlocked).toBe(source.avocado.unlocked)
    expect(unlocked.dyson.science).toBe(0)
    expect(unlocked.dyson.researchers).toBe(0)
    expect(unlocked.dyson.workers).toBe(unlocked.dyson.bots)
    expect(unlocked.research.levelsById).toEqual({})
    expect(purchaseDiscovery(unlocked, 'unlock')).toBeNull()
    expect(purchaseDiscovery({ ...source, avocado: { ...source.avocado, overflowPoints: 0n } }, 'unlock')).toBeNull()
    expect(source.discovery).toEqual(EMPTY_DISCOVERY)
  })
  it('round-trips unlocked state and permanent purchases', () => {
    const bought = purchaseDiscovery(purchaseDiscovery(unlocked, 'power')!, 'speed')!
    const reloaded = hydrateGameState(dehydrateGameState(hydrateGameState(prepared), bought)).state
    expect(reloaded.discovery).toEqual({ ...EMPTY_DISCOVERY, unlocked: true, startingPower: 1n, speedUpgrades: 1n })
    expect(reloaded.avocado.overflowPoints).toBe(7n)
  })
  it('rejects stale commands', () => {
    expect(routeCanonicalGameCommand(unlocked, { kind: 'dyson.set-bot-distribution', distribution: 0.5 } as Parameters<typeof routeCanonicalGameCommand>[1]).accepted).toBe(false)
    expect(routeCanonicalGameCommand(unlocked, { kind: 'research.purchase', researchId: 'research.science_boost' }).accepted).toBe(false)
  })
  it('resets only run progress on Transcendence', () => {
    const state = { ...unlocked, discovery: { ...unlocked.discovery!, completions: 100n, progress: 50, startingPower: 2n }, dyson: { ...unlocked.dyson, bots: 4e242 } }
    const reset = applyCanonicalOverflowReset(state)
    expect(reset.ok).toBe(true)
    if (reset.ok) expect(reset.state.discovery).toEqual({ ...state.discovery, completions: 0n, progress: 0 })
  })
  it('derives a finite Discovery economy without any Science generation', () => {
    const result = deriveBasicDysonState(unlocked, runtime.compatibilityTuning, runtime.entitlements, runtime.evaluationSnapshot)
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.value.productionArrivalRates.science).toBe(0)
      expect(result.value.auxiliary.scienceBoostPerSecond).toBe(0)
      expect(result.value.auxiliary.moneyUpgradePerSecond).toBe(0)
    }
    const high = deriveDiscoveryEffects({ ...unlocked, discovery: { ...unlocked.discovery!, completions: DISCRETE_MAXIMUM, startingPower: DISCRETE_MAXIMUM, speedUpgrades: DISCRETE_MAXIMUM } }, runtime.evaluationSnapshot)
    expect(Number.isFinite(high.multiplier)).toBe(true)
    expect(Number.isFinite(high.speed)).toBe(true)
  })
})
