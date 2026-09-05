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
