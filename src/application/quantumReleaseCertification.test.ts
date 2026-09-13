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
  const value = app.frontendSnapshot('quantum')
  if (value.phase !== 'ready') throw new Error(`Unexpected frontend phase ${value.phase}`)
  return value.gameplay.previews.quantum.upgrades.find(item => item.upgradeId === id)!
}

test('full-cap purchase, earn again, capped preview, checkpoint and restart preserve exact progress', async () => {
  const original = prepareIdb1Save(readFileSync(new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt', import.meta.url,
  ), 'utf8')).prepared
  const options = { entitlements: { permanentDoubleIp: false } }
  const session = new CanonicalRuntimeSession(original, options)
  const initial = structuredClone(session.initialState)
  initial.gameState.quantum = {
    ...initial.gameState.quantum, pointsEarned: DISCRETE_MAXIMUM, pointsSpent: 0n,
    cashBonusLevels: 0n, scienceBonusLevels: 0n, influenceSpeedBonus: DISCRETE_MAXIMUM - 2n,
    unlocks: { ...initial.gameState.quantum.unlocks, quantumEntanglement: true },
  }
  initial.gameState.infinity.points = 4207n
  initial.gameState.infinity.spentPoints = 7n
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
  expect(await app.dispatchPlayer({ ...envelope(app), command: {
    kind: 'quantum.set-buy-mode', buyMode: 'buy-50',
  } })).toMatchObject({ kind: 'transition', transition: { accepted: true, changed: true } })
  expect(preview(app, 'CashBonus').maximumQuantity).toBe(DISCRETE_MAXIMUM)
  expect(await app.dispatchPlayer({ ...envelope(app), command: {
    kind: 'quantum.purchase-upgrade', upgradeId: 'CashBonus', quantity: 'max',
  } })).toMatchObject({ kind: 'transition', transition: { accepted: true, changed: true } })
  expect(snapshot(app).state.gameState.quantum.cashBonusLevels).toBe(DISCRETE_MAXIMUM)
  expect(preview(app, 'CashBonus')).toMatchObject({ maximumQuantity: 0n, eligible: false })
  expect(await app.dispatchPlayer({ ...envelope(app), command: { kind: 'quantum.request-leap' } }))
    .toMatchObject({ kind: 'transition', transition: { accepted: true, changed: true } })
  expect(snapshot(app).state.gameState.quantum.pointsEarned).toBe(DISCRETE_MAXIMUM + 100n)
  expect(snapshot(app).state.gameState.infinity).toMatchObject({ points: 7n, spentPoints: 7n })
  expect(preview(app, 'InfluenceSpeed').maximumQuantity).toBe(1n)
  const beforeRejected = snapshot(app).state.gameState.quantum
  expect(await app.dispatchPlayer({ ...envelope(app), command: {
    kind: 'quantum.purchase-upgrade', upgradeId: 'InfluenceSpeed', quantity: 2n,
  } })).toMatchObject({ kind: 'transition', transition: { accepted: false } })
  expect(snapshot(app).state.gameState.quantum).toEqual(beforeRejected)
  for (const [upgradeId, quantity] of [['InfluenceSpeed', 'max'], ['ScienceBonus', 10n]] as const) {
    expect(await app.dispatchPlayer({ ...envelope(app), command: {
      kind: 'quantum.purchase-upgrade', upgradeId, quantity,
    } })).toMatchObject({ kind: 'transition', transition: { accepted: true, changed: true } })
  }
  expect(snapshot(app).state.gameState.quantum).toMatchObject({
    pointsEarned: DISCRETE_MAXIMUM + 100n, pointsSpent: DISCRETE_MAXIMUM + 11n,
    cashBonusLevels: DISCRETE_MAXIMUM, scienceBonusLevels: 10n, influenceSpeedBonus: DISCRETE_MAXIMUM,
  })
  const expected = snapshot(app).state.gameState.quantum
  expect(await app.checkpoint()).toMatchObject({ committed: true })
  const restarted = create()
  await restarted.start()
  expect(snapshot(restarted).state.gameState.quantum).toEqual(expected)
  expect(snapshot(restarted).state.gameState.quantum.buyMode).toBe('buy-50')
  expect(preview(restarted, 'ScienceBonus').maximumQuantity).toBe(89n)
  expect(preview(restarted, 'InfluenceSpeed')).toMatchObject({ maximumQuantity: 0n, eligible: false })
  expect(restarted.advanceActive(100)).toMatchObject({ accepted: true })
})
