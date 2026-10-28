import { readFileSync } from 'node:fs'
import { describe, expect, test, vi } from 'vitest'
import { CloudStartupResolver, type PortableCloud } from './portableCloud'
import { prepareIdb1Save, type PreparedSave } from '../save/prepare'
import { serializeSharedWebSave } from '../save/serialization'
import type { SaveRepository } from '../save/repository'
const original = prepareIdb1Save(readFileSync(new URL('../../test/fixtures/schema-08-canonical-idb1-main-save.txt', import.meta.url), 'utf8')).prepared
function fixture(text: string | null, current: PreparedSave | null = null) {
  const cloud: PortableCloud = {read: vi.fn(async () => text), choose: vi.fn(async () => 'local' as const), publish: vi.fn(), acknowledge: vi.fn()}
  const local = {resolve: vi.fn(async () => ({kind:'first-run' as const,save:original}))}
  const repository: SaveRepository = {loadCurrent:vi.fn(async () => current),hasCurrent:vi.fn(async () => current !== null),migrateLegacyOnFirstLaunch:vi.fn(),commit:vi.fn(async save => save)}
  return {cloud,local,repository,resolver:new CloudStartupResolver(local,repository,cloud)}
}
describe('Cloud startup preparation', () => {
  test('valid portable checkpoint takes precedence over Unity and retains lifecycle time', async () => {
    const data=original.copyValidatedState();data.dateQuitString='2026-09-04T01:00:00Z';data.debugOptions=true
    const f=fixture(serializeSharedWebSave(original.withValidatedState(data).copyValidatedState()))
    const result=await f.resolver.resolve()
    expect(result).toMatchObject({kind:'ready',source:'cloud'});expect(f.local.resolve).not.toHaveBeenCalled()
    if(result.kind==='ready') expect(result.save.copyValidatedState()).toMatchObject({dateQuitString:data.dateQuitString,debugOptions:false})
  })
  test('conflicting valid local progress requires a choice and remains local when selected', async () => {
    const data=original.copyValidatedState();data.dateQuitString='2026-09-04T02:00:00Z'
    const f=fixture(serializeSharedWebSave(data), original)
    await f.resolver.resolve()
    expect(f.cloud.choose).toHaveBeenCalledOnce();expect(f.repository.commit).not.toHaveBeenCalled();expect(f.local.resolve).toHaveBeenCalledOnce()
  })
  test('invalid downloaded save blocks publication when no recovery exists', async () => {
    const f=fixture('IDSWEB1:broken')
    expect(await f.resolver.resolve()).toMatchObject({kind:'blocked'})
    expect(f.repository.commit).not.toHaveBeenCalled();expect(f.cloud.acknowledge).not.toHaveBeenCalled()
  })
  test('valid Cloud backup recovers a corrupt primary through preparation', async () => {
    const f=fixture('IDSWEB1:broken');f.cloud.readBackups=async()=>['also broken',serializeSharedWebSave(original.copyValidatedState())]
    expect(await f.resolver.resolve()).toMatchObject({kind:'ready',source:'recovered-canonical'})
    expect(f.repository.commit).toHaveBeenCalledOnce()
  })
  test('absent or unreadable Cloud allows local startup',async()=>{
    const f=fixture(null);await f.resolver.resolve();expect(f.local.resolve).toHaveBeenCalledOnce()
    f.cloud.read=async()=>{throw new Error('Read failed')};await f.resolver.resolve();expect(f.local.resolve).toHaveBeenCalledTimes(2)
  })
})

test.each([false, true])('Cloud retains personal bests and imported=%s provenance, unlike shared exports', async imported => {
  const { serializeCloudWebSave, deserializeWebSave } = await import('../save/serialization')
  const { createSpeedrunStatistics } = await import('../simulation/speedrunStatistics')
  const data = original.copyValidatedState()
  data.idsSpeedruns = { ...createSpeedrunStatistics(new Date().toISOString(), true), imported,
    personalBests: { firstInfinity: { elapsedSeconds: 12, debug: 'no', storedTime: 'no', doubleIpUsed: true } } }
  const cloudText = serializeCloudWebSave(data)
  expect(deserializeWebSave(cloudText).idsSpeedruns).toEqual(data.idsSpeedruns)
  const f = fixture(cloudText)
  const result = await f.resolver.resolve()
  expect(result.kind).toBe('ready')
  if (result.kind === 'ready') expect(result.save.copyValidatedState().idsSpeedruns).toEqual(data.idsSpeedruns)
  const shared = deserializeWebSave(serializeSharedWebSave(data)).idsSpeedruns as Record<string, unknown>
  expect(shared.personalBests).toBeUndefined()
})

test.each([false, true])('Cloud preserves earned Developer Options on startup (local checkpoint=%s)', async hasLocal => {
  const { serializeCloudWebSave, deserializeWebSave } = await import('../save/serialization')
  const { CanonicalRuntimeSession } = await import('../application/canonicalRuntimeSession')
  const { applyDevelopmentAction } = await import('../application/canonicalDevelopmentCommands')
  const { createProductionEventContext } = await import('../simulation/productionEventContext')
  const owner = new CanonicalRuntimeSession(original, { entitlements: { permanentDoubleIp: false } })
  const state = structuredClone(owner.initialState)
  state.debugEntitlementPurchased = false
  state.gameState.avocado.overflowPoints = 10n
  expect(applyDevelopmentAction(state, { kind: 'purchase-debug-options' }, createProductionEventContext()).accepted).toBe(true)
  const current = owner.prepare(state)
  const text = serializeCloudWebSave(current.copyValidatedState())
  const f = fixture(text, hasLocal ? current : null)
  const result = await f.resolver.resolve()
  expect(result.kind).toBe('ready')
  if (result.kind !== 'ready') throw new Error('Cloud startup failed')
  const restored = new CanonicalRuntimeSession(result.save, { entitlements: { permanentDoubleIp: false } }).initialState
  expect(restored.debugEntitlementPurchased).toBe(true)
  expect(restored.debugOptionsEnabled).toBe(true)
  expect(restored.gameState.avocado.overflowPoints).toBe(0n)
  expect(f.cloud.choose).not.toHaveBeenCalled()
  expect(deserializeWebSave(serializeSharedWebSave(current.copyValidatedState())).debugEverEnabled).toBe(false)
})

test('selecting an old stripped Cloud checkpoint does not revoke a local earned unlock', async () => {
  const data = original.copyValidatedState()
  data.debugEverEnabled = true
  const f = fixture(serializeSharedWebSave(data), original.withValidatedState(data))
  f.cloud.choose = vi.fn(async () => 'cloud')
  const result = await f.resolver.resolve()
  expect(result.kind).toBe('ready')
  if (result.kind === 'ready') expect(result.save.copyValidatedState().debugEverEnabled).toBe(true)
})

test('Cloud does not turn host-enabled Developer Options into a gameplay purchase', async () => {
  const { serializeCloudWebSave, deserializeWebSave } = await import('../save/serialization')
  const data = original.copyValidatedState()
  Object.assign(data, { debugOptions: true, debugEverEnabled: false, doubleIp: true })
  expect(deserializeWebSave(serializeCloudWebSave(data))).toMatchObject({ debugOptions: false, debugEverEnabled: false, doubleIp: false })
})
