import { readFileSync } from 'node:fs'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { hydrateGameState, dehydrateGameState } from '../game-state/mapping'
import { prepareIdb1Save } from '../save/prepare'
import { routeCanonicalGameCommand } from '../application/canonicalGameCommands'
import { botBoostMultiplier, botBoostRemaining, recordBotBoostUsage } from './botBoost'
import { deriveBasicDysonState } from './canonicalDysonDerivation'
import { createSpeedrunStatistics, observeSpeedruns } from './speedrunStatistics'
import { advanceCanonicalTinker, createCanonicalTinkerRuntimeState } from './canonicalTinker'
import { leastRecentlyShown, eligiblePromotions } from '../store/promotions'

const hydrated = hydrateGameState(prepareIdb1Save(readFileSync(new URL('../../test/fixtures/schema-08-canonical-idb1-main-save.txt', import.meta.url), 'utf8')).prepared)
const initial = () => ({ ...hydrated.state, statistics: { ...hydrated.state.statistics,
  speedruns: createSpeedrunStatistics(new Date(1_000_000).toISOString(), true, 1_000_000) } })
afterEach(() => vi.restoreAllMocks())

describe('Bot boost', () => {
  test('allows immediate double claims, rejects spam above five minutes and admits the boundary', () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(1_000_000)
    let state = initial()
    for (let n = 0; n < 2; n++) {
      const result = routeCanonicalGameCommand(state, { kind: 'boost.claim' })
      expect(result.accepted).toBe(true)
      state = result.state
    }
    expect(botBoostRemaining(state.meta.botBoost)).toBe(600_000)
    expect(routeCanonicalGameCommand(state, { kind: 'boost.claim' }).accepted).toBe(false)
    clock.mockReturnValue(1_300_000)
    const topped = routeCanonicalGameCommand(state, { kind: 'boost.claim' })
    expect(topped.accepted).toBe(true)
    expect(botBoostRemaining(topped.state.meta.botBoost)).toBe(600_000)
    expect(hydrateGameState(dehydrateGameState(hydrated, topped.state)).state.meta.botBoost).toEqual(topped.state.meta.botBoost)
    clock.mockReturnValue(1_900_000)
    expect(botBoostMultiplier(topped.state, {})).toBe(1)
  })

  test('requires verified ownership for permanent use and starts disabled', () => {
    const state = initial()
    expect(botBoostMultiplier(state, { permanentBotBoost: true })).toBe(1)
    expect(routeCanonicalGameCommand(state, { kind: 'boost.set-enabled', enabled: true }).accepted).toBe(false)
    const enabled = routeCanonicalGameCommand(state, { kind: 'boost.set-enabled', enabled: true }, { permanentBotBoost: true }).state
    expect(botBoostMultiplier(enabled, { permanentBotBoost: true })).toBe(2)
    expect(botBoostMultiplier(enabled, {})).toBe(1)
    expect(routeCanonicalGameCommand(enabled, { kind: 'boost.claim' }, { permanentBotBoost: true }).accepted).toBe(false)
    const disabled = routeCanonicalGameCommand(enabled, { kind: 'boost.set-enabled', enabled: false }, { permanentBotBoost: true }).state
    expect(botBoostMultiplier(disabled, { permanentBotBoost: true })).toBe(1)
  })

  test('doubles only final Bot production and preserves every other rate', () => {
    vi.spyOn(Date, 'now').mockReturnValue(1_000_000)
    const state = initial()
    const boosted = routeCanonicalGameCommand(state, { kind: 'boost.claim' }).state
    const derive = (input: typeof state) => deriveBasicDysonState(input, hydrated.compatibilityTuning, { permanentDoubleIp: false }, hydrated.skillEffectEvaluationSnapshot)
    const before = derive(state)
    const after = derive(boosted)
    expect(before.ok && after.ok).toBe(true)
    if (!before.ok || !after.ok) throw new Error('Derivation failed')
    expect(after.value.productionArrivalRates).toEqual({ ...before.value.productionArrivalRates, bots: before.value.productionArrivalRates.bots * 2 })
    expect(after.value.auxiliary.stellarSacrifice).toEqual(before.value.auxiliary.stellarSacrifice)
    expect(after.value.facilityFacts.assembly_lines.details.contributions.at(-1)?.sourceId).toBe('bot-boost')
  })

  test('doubles direct Bot creation and records use only on a gain', () => {
    const source = initial()
    const state = { ...source, dyson: { ...source.dyson, bots: 0 }, skills: { ...source.skills, byId: {} } }
    const runtime = { ...createCanonicalTinkerRuntimeState(), running: true, cooldownSeconds: 1 }
    const stats = { botYield: 1, assemblyYield: 0, cooldownSeconds: 1 }
    expect(advanceCanonicalTinker(state, runtime, stats, 0, 2).state.statistics.speedruns?.botBoostUsed).not.toBe(true)
    const plain = advanceCanonicalTinker(state, runtime, stats, 1, 1)
    const boosted = advanceCanonicalTinker(state, runtime, stats, 1, 2)
    expect(plain.botsGranted).toBeGreaterThan(0)
    expect(boosted.botsGranted).toBe(plain.botsGranted * 2)
    expect(boosted.state.statistics.speedruns?.botBoostUsed).toBe(true)
  })

  test('snapshots usage at milestones and never erases it on disabling or expiry', () => {
    const source = initial()
    const state = { ...source, meta: { ...source.meta, firstInfinityComplete: true } }
    const first = observeSpeedruns(state, 1_000_000)
    expect(first.statistics.speedruns?.milestones.firstInfinity?.botBoostUsed).toBe(false)
    const used = recordBotBoostUsage(first)
    const disabled = routeCanonicalGameCommand(used, { kind: 'boost.set-enabled', enabled: false }, { permanentBotBoost: true }).state
    expect(disabled.statistics.speedruns?.botBoostUsed).toBe(true)
    expect(disabled.statistics.speedruns?.milestones.firstInfinity?.botBoostUsed).toBe(false)
    const reload = hydrateGameState(dehydrateGameState(hydrated, disabled)).state
    expect(reload.statistics.speedruns?.botBoostUsed).toBe(true)
  })

  test('filters platform before fair rotation and avoids games without a matching destination', () => {
    const games = eligiblePromotions('android')
    expect(games.length).toBeGreaterThan(1)
    const history: string[] = []
    for (const _game of games) {
      const next = leastRecentlyShown('android', history)!
      expect(history).not.toContain(next.id)
      expect(next.links.android).toContain('play.google.com')
      history.push(next.id)
    }
    expect(leastRecentlyShown('android', history)?.id).toBe(history[0])
    expect(eligiblePromotions('desktop').every(game => Boolean(game.links.desktop))).toBe(true)
  })
})
