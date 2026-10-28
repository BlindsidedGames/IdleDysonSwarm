import { mkdtemp, readFile, rm } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, test, vi } from 'vitest'
import { SteamInventoryStore } from '../../hosts/electron/steamInventoryStore.mjs'
import { SteamCloud } from '../../hosts/electron/steam/cloud.mjs'
import { SteamPublication, bindSteamAccount, formatSteamPrice } from '../../hosts/electron/steam/client.mjs'
const ids = {'ids.tiptier1':1001,'ids.tiptier2':1002,'ids.tiptier3':1003,'ids.devoptions':1004,'ids.doubleip':1005}
function inventoryFixture() {
 let items: {itemDefId:number,instanceId:string,quantity:number}[]=[]
 let cache: unknown = null
 const binding={getAuthenticatedSteamId:async()=> '76561198000000000', getAllItems:async()=>structuredClone(items),requestLocalizedPrices:async()=>[],startPurchase:vi.fn(async(id:number)=>{const item=items.find(i=>i.itemDefId===id);if(item)item.quantity++;else items.push({itemDefId:id,instanceId:String(id),quantity:1});return {status:'completed'}})}
 const store=new SteamInventoryStore({config:{schemaVersion:1,enabled:true,steamAppId:4348570,products:ids},binding,cache:{read:async()=>cache,write:async(_id:string,state:unknown)=>{cache=structuredClone(state)}}})
 return {store,binding,setItems:(value:typeof items)=>{items=value},items:()=>items}
}
describe('retained Steam purchase items',()=>{
 test('repeat supporters stack without consumption and restore on a fresh installation',async()=>{
  const f=inventoryFixture();await f.store.initialize()
  expect(await f.store.purchase('ids.tiptier1')).toMatchObject({accepted:true})
  expect(await f.store.purchase('ids.tiptier1')).toMatchObject({accepted:true})
  expect(f.items()[0].quantity).toBe(2)
  const restored=inventoryFixture();restored.setItems(f.items());await restored.store.initialize()
  expect(await restored.store.readEntitlements(true)).toMatchObject({supporterCatGallery:true})
  restored.setItems([])
  expect(await restored.store.readEntitlements(true)).toMatchObject({supporterCatGallery:false})
 })
 test('permanent ownership prevents a second charge',async()=>{
  const f=inventoryFixture();await f.store.initialize()
  await f.store.purchase('ids.doubleip');await f.store.purchase('ids.doubleip')
  expect(f.binding.startPurchase).toHaveBeenCalledTimes(1)
 })
 test('cancellation grants no ownership',async()=>{
  const f=inventoryFixture();f.binding.startPurchase.mockImplementation(async()=>({status:'cancelled'}));await f.store.initialize()
  expect(await f.store.purchase('ids.tiptier1')).toMatchObject({accepted:false,code:'purchase-cancelled'})
  expect(await f.store.readEntitlements(true)).toMatchObject({supporterCatGallery:false})
 })
 test('a cache failure after delivery leaves provider items for recovery',async()=>{
  const f=inventoryFixture();f.store.cache.write=async()=>{throw new Error('Disk failed')};f.store.scheduleRetry=()=>undefined
  await f.store.initialize();expect(await f.store.purchase('ids.tiptier1')).toMatchObject({accepted:true});expect(f.items()).toHaveLength(1)
 })
})
describe('Steam publication',()=>{
 test('pins services to the launch account and stays disabled after a switch',()=>{
  let account='76561198000000000';const write=vi.fn()
  const bound=bindSteamAccount({identity:()=>account,unlock:write})
  bound.unlock('FIRST_BOT');account='76561198000000001'
  expect(()=>bound.unlock('FIRST_BOT')).toThrow('account changed')
  account='76561198000000000';expect(()=>bound.unlock('FIRST_BOT')).toThrow('account changed')
  expect(write).toHaveBeenCalledOnce()
 })
 test('an ambiguous acknowledgement retries absolute playtime and does not clear earned unlocks',async()=>{
  const values:Record<string,number>={TOTAL_PLAY_TIME:100};let ack=2
  const native={identity:()=> '76561198000000000',achievement:()=>true,unlock:vi.fn(),stat:(id:string)=>values[id]??0,setStat:(id:string,v:number)=>{values[id]=v;return true},presence:()=>true,storeStats:vi.fn(()=>true),storedResult:()=>ack}
  const p=new SteamPublication(native,{'achievement.first_bot':'FIRST_BOT'})
  try {
   await p.submit({unlocked:['achievement.first_bot'],statistics:{},presence:''});p.sessionSeconds=10
   await expect(p.flush()).rejects.toThrow('storage failed');expect(values.TOTAL_PLAY_TIME).toBe(110)
   ack=1;await p.flush();expect(values.TOTAL_PLAY_TIME).toBe(110);expect(native.unlock).not.toHaveBeenCalled()
  } finally { p.close() }
 })
 test('preserves maxima, allows allocation decreases and never trusts developer claims',async()=>{
  const values:Record<string,number>={HIGHEST_BOT_EXPONENT:30,SKILL_POINTS_ASSIGNED:42,TOTAL_PLAY_TIME:100}
  const native={identity:()=> '76561198000000000',achievement:()=>false,unlock:vi.fn(()=>true),stat:(id:string)=>values[id]??0,setStat:(id:string,v:number)=>{values[id]=v;return true},presence:()=>true,storeStats:()=>true,storedResult:()=>1}
  const p=new SteamPublication(native,{'achievement.first_bot':'FIRST_BOT','achievement.developer_options':'DEV_OPTIONS'})
  try{await p.submit({unlocked:['achievement.first_bot','achievement.developer_options'],statistics:{'stat.highest_bot_exponent':19,'stat.skill_points_assigned':0},presence:'Building bots'});await p.flush()
   expect(values.HIGHEST_BOT_EXPONENT).toBe(30);expect(values.SKILL_POINTS_ASSIGNED).toBe(0);expect(native.unlock).toHaveBeenCalledWith('FIRST_BOT');expect(native.unlock).not.toHaveBeenCalledWith('DEV_OPTIONS')
   expect(()=>p.submit({unlocked:['arbitrary'],statistics:{},presence:''})).toThrow()
  }finally{p.close()}
 })
})
describe('Steam Cloud file boundaries',()=>{
 test('rotates three snapshots, preserves conflicts and rejects changed accounts',async()=>{
   const root=await mkdtemp(join(tmpdir(),'ids-cloud-test-'));let identity='76561198000000000'
   const cloud=new SteamCloud({userData:root,account:identity,identity:()=>identity,choose:async()=> 'local'})
   try{
    await cloud.read()
    for(let i=1;i<=5;i++)await cloud.publish(`IDSWEB1:${i}`)
    expect(await readFile(join(cloud.directory,'backup-3.idsw'),'utf8')).toBe('IDSWEB1:2')
    expect(await cloud.read()).toBe(null)
    expect(await cloud.choose('IDSWEB1:local','IDSWEB1:remote')).toBe('local')
    identity='76561198000000001';await expect(cloud.publish('IDSWEB1:6')).rejects.toThrow('account changed')
    expect(await readFile(join(cloud.directory,'current.idsw'),'utf8')).toBe('IDSWEB1:5')
   }finally{await rm(root,{recursive:true,force:true})}
 })
})

test('Steam localized price units handle AUD, JPY and KWD',()=>{
 expect(formatSteamPrice(149,'AUD','en-AU')).toBe('$1.49')
 expect(formatSteamPrice(14900,'JPY','en-US')).toBe('¥149')
 expect(formatSteamPrice(149,'KWD','en-US')).toContain('1.490')
})
