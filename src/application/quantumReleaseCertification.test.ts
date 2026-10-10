import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { gameDataCatalog } from '../game-data/catalog'
import { prepareIdb1Save } from '../save/prepare'
import { PortableSaveRepository, type SaveStorageAdapter } from '../save/repository'
import { createCapturedInfinityAssetLookup } from '../simulation/canonicalEventTimeModel'
import { SIMULATION_UPGRADE_DEFINITIONS } from '../simulation/dreamEducationUpgrades'
import { DISCRETE_MAXIMUM } from '../simulation/numeric'
import { REALITY_UPGRADE_DEFINITIONS } from '../simulation/realityUpgrades'
import { createCanonicalGameApplication, type CanonicalGameApplicationFacade } from './canonicalGameApplication'
import { CanonicalRuntimeSession, createCanonicalRuntimeSessionFactory } from './canonicalRuntimeSession'

class TextStorage implements SaveStorageAdapter {
  readonly files = new Map<string, string>()
  async exists(path: string) { return this.files.has(path) }
  async readText(path: string) {
    const text = this.files.get(path)
    if (text === undefined) throw new Error(`Missing ${path}`)
    return text
  }
  async writeText(path: string, text: string) { this.files.set(path, text) }
  async copy(from: string, to: string) { this.files.set(to, await this.readText(from)) }
  async replaceAtomically(from: string, to: string) {
    await this.copy(from, to)
    this.files.delete(from)
  }
  async discoverLegacyCandidates() { return [] }
}

function snapshot(app: CanonicalGameApplicationFacade) {
  const value = app.snapshot()
  if (value.phase !== 'ready') throw new Error(`Unexpected phase ${value.phase}`)
  return value
}

function envelope(app: CanonicalGameApplicationFacade) {
  const { revision } = snapshot(app)
  return { sessionRevision: revision.session, expectedStateRevision: revision.state }
}

function preview(app: CanonicalGameApplicationFacade, id: string) {
  const value = app.frontendSnapshot('infinity')
  if (value.phase !== 'ready') throw new Error(`Unexpected frontend phase ${value.phase}`)
  return value.gameplay.previews.infinity.shop.find(item => item.itemId === `rework-${id}`)!
}

test('IP purchase at signed64 capacity, capped earning, preview and restart preserve exact progress', async () => {
  const original = prepareIdb1Save(readFileSync(new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt', import.meta.url,
  ), 'utf8')).prepared
  const options = { entitlements: { permanentDoubleIp: false } }
  const session = new CanonicalRuntimeSession(original, options)
  const initial = structuredClone(session.initialState)
  initial.gameState.quantum = {
    ...initial.gameState.quantum, pointsEarned: DISCRETE_MAXIMUM, pointsSpent: 0n,
    cashBonusLevels: DISCRETE_MAXIMUM - 1n, scienceBonusLevels: 0n, influenceSpeedBonus: DISCRETE_MAXIMUM - 2n,
    unlocks: { ...initial.gameState.quantum.unlocks, breakTheLoop: true },
  }
  initial.gameState.meta = { ...initial.gameState.meta, firstInfinityComplete: true, reworkMigrationChoice: 'keep' }
  initial.gameState.infinity.points = DISCRETE_MAXIMUM - 2n
  initial.gameState.infinity.spentPoints = 0n
  initial.gameState.skills.activeAutoAssignment = []
  initial.gameState.infinity.automaticResetEnabled = false
  const repository = new PortableSaveRepository(new TextStorage(), {
    current: '/current', temporary: '/temporary', legacyRecovery: '/legacy',
    backups: ['/backup1', '/backup2', '/backup3'],
  }, () => original, { allowCanonicalPlayerWrites: true })
  await repository.commit(session.prepare(initial))
  const create = () => createCanonicalGameApplication({
    repository,
    startupResolver: { resolve: async () => ({
      kind: 'ready', source: 'primary', save: (await repository.loadCurrent())!,
    }) },
    sessionFactory: createCanonicalRuntimeSessionFactory(options),
    engine: { eventContext: {
      mode: 'active', automationIntervalSeconds: 1,
      realityWorkerTuning: { workerBatchSize: 128n, baseWorkerGenerationSpeed: 4 },
      dreamResetDefinitions: SIMULATION_UPGRADE_DEFINITIONS,
      realityUpgradeDefinitions: REALITY_UPGRADE_DEFINITIONS,
      infinityResetAssetLookup: createCapturedInfinityAssetLookup(gameDataCatalog.assets),
    } },
  })
  const app = create()
  await app.start()
  expect(preview(app, 'CashBonus')).toMatchObject({ eligible: true, cost: 3n })
  expect(await app.dispatchPlayer({ ...envelope(app), command: {
    kind: 'infinity.purchase-shop-item', itemId: 'rework-CashBonus',
  } })).toMatchObject({ kind: 'transition', transition: { accepted: true, changed: true } })
  expect(snapshot(app).state.gameState.quantum.cashBonusLevels).toBe(DISCRETE_MAXIMUM)
  expect(snapshot(app).state.gameState.infinity).toMatchObject({ points: DISCRETE_MAXIMUM - 2n, spentPoints: 3n })
  expect(preview(app, 'CashBonus')).toMatchObject({ eligible: false, code: 'output-maxed' })
  const beforeRejected = snapshot(app).state.gameState
  expect(await app.dispatchPlayer({ ...envelope(app), command: {
    kind: 'infinity.purchase-shop-item', itemId: 'rework-CashBonus',
  } })).toMatchObject({ transition: { accepted: false } })
  expect(snapshot(app).state.gameState).toEqual(beforeRejected)
  const ready = structuredClone(snapshot(app).state)
  ready.gameState.dyson.bots = 1e99
  ready.gameState.timeline.infinityCycleSeconds = 10
  expect(await app.commitAwayReplacement(envelope(app), ready)).toMatchObject({ committed: true })
  const reset = await app.dispatchPlayer({ ...envelope(app), command: { kind: 'infinity.request-reset' } })
  expect(reset, JSON.stringify(reset, (_, value) => typeof value === 'bigint' ? String(value) : value))
    .toMatchObject({ transition: { accepted: true, changed: true } })
  expect(snapshot(app).state.gameState.infinity).toMatchObject({ points: DISCRETE_MAXIMUM, spentPoints: 3n })
  expect(snapshot(app).state.gameState.quantum.pointsEarned).toBe(DISCRETE_MAXIMUM)
  expect(await app.dispatchPlayer({ ...envelope(app), command: {
    kind: 'infinity.purchase-shop-item', itemId: 'rework-ScienceBonus',
  } })).toMatchObject({ transition: { accepted: true, changed: true } })
  const expected = snapshot(app).state.gameState
  expect(expected.infinity.spentPoints).toBe(6n)
  expect(expected.quantum.scienceBonusLevels).toBe(1n)
  expect(await app.checkpoint()).toMatchObject({ committed: true })
  const restarted = create()
  await restarted.start()
  expect(snapshot(restarted).state.gameState.quantum).toEqual(expected.quantum)
  expect(snapshot(restarted).state.gameState.infinity).toMatchObject({ points: DISCRETE_MAXIMUM, spentPoints: 6n })
  expect(preview(restarted, 'CashBonus')).toMatchObject({ eligible: false, code: 'output-maxed' })
  expect(preview(restarted, 'ScienceBonus')).toMatchObject({ eligible: true, cost: 3n })
  expect(restarted.advanceActive(100)).toMatchObject({ accepted: true })
})
