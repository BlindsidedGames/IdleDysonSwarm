import { expect, test } from 'vitest'
import { execFileSync } from 'node:child_process'
import { createUnityFirstRunPreparedSave } from '../application/firstRun/unityFirstRunSave'
import { hydrateGameState, dehydrateGameState } from '../game-state/mapping'
import { validateCanonicalGameState } from '../game-state/validate'
import { PreparedSave } from '../save/prepare'
import { deserializeWebSave, serializeWebSave } from '../save/serialization'
import type { CanonicalGameStateV1, CivilizationFocus, CivilizationState, CivilizationActivityState, FarmingState } from '../game-state/types'
import { advanceCivilization, validateCivilization, allocateCivilizationWorkers } from './civilization'
import { advanceFarming, validateFarming, startFarming, farmingGoal, farmingCanBuyGranary, buyFarmingGranary, farmingComplete, setFarmingFocus, completeFarmingAge, farmingWorkers, farmingCapacity, farmingGranaryCost, farmingGranaryPurchaseStatus, farmingStoredTimeBudget, farmingMilestoneFlags, farmingManualGate } from './farming'
import { eligibleCanonicalFractureIds, galvanizeCanonicalSkill } from './canonicalSkillTransactions'
import { restartInfinityChallenge } from './canonicalInfinityChallengeRestart'
import { REWORK_CHALLENGES } from './reworkChallenges'
import { DISCRETE_MAXIMUM } from './numeric'
const session=hydrateGameState(createUnityFirstRunPreparedSave({startedAtUtc:'2026-10-09T00:00:00Z'}))
const fresh=():CanonicalGameStateV1=>({...session.state,meta:{...session.state.meta,reworkMigrationChoice:'keep'}})
const opening=()=>advanceCivilization(fresh(),7043)
const reload=(state:CanonicalGameStateV1)=>hydrateGameState(PreparedSave.fromDecoded(deserializeWebSave(serializeWebSave(dehydrateGameState(session,state).copyValidatedState())))).state
function until(s:CanonicalGameStateV1,p:(s:CanonicalGameStateV1)=>boolean,max=25000){for(let n=0;n<max&&!p(s);n++)s=advanceCivilization(s,1);expect(p(s)).toBe(true);return s}
const farm=()=>until(startFarming(opening())!,s=>s.civilization!.farming!.phase==='farming')
const gate=()=>until(farm(),s=>farmingCanBuyGranary(s.civilization!.farming!))

test.each(['pending','none','mixed'] as const)('%s paid Forager jobs finish once at immediate age entry and after legacy reload',scenario=>{
 expect(startFarming(fresh())).toBeNull()
 const original=opening(),c=structuredClone(original.civilization!) as Omit<CivilizationState,'activities'> & {activities:Record<string,{-readonly [K in keyof CivilizationActivityState]:CivilizationActivityState[K]}>}
 if(scenario==='none')for(const job of Object.values(c.activities)){
  job.active=false;job.workers=0n;job.progress=0;delete job.cycleReceipt
 }
 if(scenario==='mixed'){
  const job=c.activities.gathering,r=job.cycleReceipt!
  const {finishAt:_deadline,...receipt}=r
  job.progress=r.seconds;job.cycleReceipt={...receipt,remainingWork:0,rate:0}
 }
 const old={...original,civilization:c},before=structuredClone(old)
 expect(validateCanonicalGameState(old)).toEqual({valid:true,errors:[]})
 const paid=Object.entries(c.activities).filter(([,j])=>j.active)
 if(scenario==='none')expect(paid.length).toBe(0)
 else expect(paid.length).toBeGreaterThan(1)
 const expectedResources={...c.resources}
 let population=0n
 for(const [,job] of paid){
  population+=job.cycleReceipt!.populationDelta
  for(const [id,n] of Object.entries(job.cycleReceipt!.outputs))expectedResources[id as keyof typeof expectedResources]+=n!
 }
 const assertHandoff=(ready:CanonicalGameStateV1)=>{
  const next=ready.civilization!,f=next.farming!
  expect(f.phase).toBe('farming')
  expect(next.resources).toEqual(expectedResources)
  expect(next.workers).toBe(c.workers-3n+population)
  expect(next.elapsedSeconds).toBe(c.elapsedSeconds)
  expect(next.nextEquipmentSeconds).toBe(c.nextEquipmentSeconds)
  expect(next.equippedWorkers).toBe(c.equippedWorkers)
  expect(f.elapsedSeconds).toBe(0);expect(f.weathering).toBe(0)
  expect(f.resources).toEqual({food:0,materials:0,tools:0,goods:0});expect(f.jobs).toEqual({})
  for(const [id,job] of Object.entries(c.activities))expect(next.activities[id].completions).toBe(job.completions+BigInt(job.active))
  expect(Object.values(next.activities).every(j=>!j.active&&j.workers===0n&&!j.cycleReceipt)).toBe(true)
  expect(ready.challenges).toEqual(old.challenges)
  expect({...ready,civilization:old.civilization,challenges:old.challenges}).toEqual(old)
  expect(validateCanonicalGameState(ready)).toEqual({valid:true,errors:[]})
  const saved=reload(ready);expect(saved.civilization).toEqual(next)
  expect(startFarming(saved)).toBeNull()
  expect(advanceCivilization(saved,0)).toEqual(saved)
  expect(advanceCivilization(saved,500).civilization!.resources).toEqual(next.resources)
 }
 const start=startFarming(old)!
 assertHandoff(start);expect(old).toEqual(before)
 // Build a validated old release handoff with real paid receipts and founders
 // already transferred. Reload it through the same serializer as player saves.
 const legacyCamp={...c,version:5 as const,workers:c.workers-3n,
  populationBaseline:start.civilization!.populationBaseline,populationGranted:start.civilization!.populationGranted-population,
  farming:{...start.civilization!.farming!,phase:'settling-forager' as const,inheritedFoodPerMinute:0,inheritedMaterialsPerMinute:0}}
 const crews=allocateCivilizationWorkers(legacyCamp)
 const legacy={...old,civilization:{...legacyCamp,activities:Object.fromEntries(Object.entries(c.activities).map(([id,j])=>[id,{...j,workers:crews[id]}]))}}
 expect(validateCanonicalGameState(legacy)).toEqual({valid:true,errors:[]})
 assertHandoff(advanceCivilization(reload(legacy),0))
 expect(reload(old).civilization!.version).toBe(4)
})

test('Granaries require manual funds, repeated purchases cannot duplicate a receipt and paid modes survive reload',()=>{
 const early=farm();expect(buyFarmingGranary(early)).toBeNull();expect(farmingGranaryPurchaseStatus(early.civilization!.farming!)).toBe('firstHome')
 const before=gate(),f=before.civilization!.farming!,paid=f.jobs,bought=buyFarmingGranary(before)!
 expect(farmingGranaryPurchaseStatus(f)).toBe('ready')
 expect(bought.civilization!.farming!.granaries).toBe(1)
 expect(bought.civilization!.farming!.resources.materials).toBeCloseTo(f.resources.materials-35,8)
 expect(bought.civilization!.farming!.resources.tools).toBeCloseTo(f.resources.tools-4,8)
 expect(buyFarmingGranary(bought)).toBeNull()
 expect(farmingGranaryPurchaseStatus(bought.civilization!.farming!)).toBe('inputs')
 for(const focus of ['balanced','provisioning','settlement','expeditions']){
  const selected=setFarmingFocus(bought,focus)??bought
  expect(selected.civilization!.farming!.jobs).toEqual(paid)
  expect(reload(selected).civilization!.farming).toEqual(selected.civilization!.farming)
 }
 expect(advanceCivilization(before,7200).civilization!.farming!.granaries).toBe(0)
})

test.each(['balanced','provisioning','settlement','expeditions'] as const)('%s reaches city readiness with funded upgrades, conserving caps, repairs and six one-time rewards',(focus:CivilizationFocus)=>{
 let s=setFarmingFocus(farm(),focus)??farm(),partial=false,damage=false,recovered=false,previousLost=0,retainedGoods=false
 const funded=new Set<string>(),benefited=new Set<string>(),bills={intensiveCultivation:{inputs:{materials:180,tools:12,goods:40},work:1260},guildWorkshop:{inputs:{materials:250,tools:16,goods:60},work:1680},townMarket:{inputs:{food:450,materials:320,tools:20,goods:80},work:2100}}
 for(let n=0;n<10000&&!farmingComplete(s.civilization!.farming!);n++){
  const f=s.civilization!.farming!
  if(farmingGoal(f).kind==='granary'&&farmingCanBuyGranary(f))s=buyFarmingGranary(s)!
  s=advanceCivilization(s,1);const next=s.civilization!.farming!
  const construction=next.jobs.build
  if(construction&&construction.kind in bills&&!funded.has(construction.kind)){
   const expected=bills[construction.kind as keyof typeof bills];funded.add(construction.kind)
   expect(construction.inputs).toEqual(expected.inputs);expect(construction.work).toBe(expected.work)
   expect(next.completedBuildings).toContain('waterworks')
   if(construction.kind!=='intensiveCultivation'){expect(next.homesBuilt).toBeGreaterThanOrEqual(5);expect(next.shipments).toBeGreaterThanOrEqual(3);expect(next.completedBuildings).toContain('hall')}
   if(construction.kind==='townMarket'){expect(next.completedBuildings).toEqual(expect.arrayContaining(['intensiveCultivation','guildWorkshop']));expect(next.granaries).toBeGreaterThanOrEqual(3)}
   expect(next.awardedCatalystIds).not.toContain('farming-catalyst-6')
   expect(reload(s).civilization!.farming).toEqual(next)
  }
  const batch=next.jobs.food?.output,normal=12*(next.completedBuildings.includes('pasture')?1.5:1)*(next.completedBuildings.includes('waterworks')?1.25:1)*(next.completedBuildings.includes('intensiveCultivation')?1.2:1)
  if(batch===27)benefited.add('fields')
  if(next.completedBuildings.includes('guildWorkshop')&&next.jobs.goods?.output===2){retainedGoods=true;expect(next.jobs.goods.inputs).toEqual({materials:4});expect(reload(s).civilization!.farming!.jobs.goods).toEqual(next.jobs.goods)}
  if(next.jobs.goods?.output===3){expect(next.jobs.goods.inputs).toEqual({materials:6});expect(next.jobs.goods.work).toBe(63);benefited.add('goods')}
  if(next.jobs.ship?.output===100){expect(next.jobs.ship.inputs).toEqual({food:350,goods:35});expect(next.jobs.ship.work).toBe(1512);benefited.add('ship')}
  if(batch&&batch<normal)partial=true
  if(next.lostHomes.length)damage=true;if(previousLost&&!next.lostHomes.length)recovered=true;previousLost=next.lostHomes.length
  expect(next.resources.food+(batch??0)).toBeLessThanOrEqual(farmingCapacity(next)+1e-6)
  expect(farmingWorkers(next)).toBe(3+2*next.homes.length)
  expect(validateCivilization(s.civilization)).toBeNull()
 }
 const f=s.civilization!.farming!
 expect(farmingComplete(f)).toBe(true)
 expect(funded).toEqual(new Set(Object.keys(bills)));expect(f.completedBuildings).toEqual(expect.arrayContaining(Object.keys(bills)))
 if(focus==='settlement')expect(retainedGoods).toBe(true)
 expect(benefited).toEqual(new Set(['fields','goods','ship']))
 expect(partial).toBe(true)
 if(focus==='provisioning'||focus==='expeditions'){expect(damage).toBe(true);expect(recovered).toBe(true)}
 expect(f.awardedCatalystIds).toHaveLength(6)
 const wallet=s.challenges!.galvanizers,final=completeFarmingAge(reload(s))!
 expect(completeFarmingAge(final)).toBeNull()
 const settled=until(final,s=>s.civilization!.farming!.phase==='complete',1000)
 expect(advanceCivilization(reload(settled),3600).civilization).toEqual(settled.civilization)
 expect(settled.challenges!.galvanizers).toBe(wallet)
},20000)

test('fractional updates and serialized paid cycles produce the same durable village',()=>{
 const start=buyFarmingGranary(gate())!,large=advanceCivilization(start,600)
 let small=start;for(let n=0;n<1200;n++){small=advanceCivilization(small,.5);if(n%137===0)small=reload(small)}
 expect(small.civilization!.farming).toEqual(large.civilization!.farming)
 const corrupt=structuredClone(small) as any
 const job=Object.values(corrupt.civilization.farming.jobs)[0] as any;job.work+=1
 expect(validateCivilization(corrupt.civilization)).toBe('Unknown funded Farming bill.')
})

test('only spending an eligible existing Skill tree choice gives speed; farming does not author new eligibility',()=>{
 const before=until(buyFarmingGranary(gate())!,s=>!!s.civilization!.farming!.jobs.build),ids=eligibleCanonicalFractureIds(before),credited=advanceCivilization(before,1)
 expect(eligibleCanonicalFractureIds(credited)).toEqual(ids)
 const rich={...before,challenges:{...before.challenges!,galvanizers:before.challenges!.galvanizers+100n}}
 expect(advanceCivilization(rich,30).civilization!.farming).toEqual(advanceCivilization(before,30).civilization!.farming)
 const result=galvanizeCanonicalSkill(before,ids[0]);expect(result.accepted).toBe(true);if(!result.accepted)return
 const ordinary=advanceCivilization(before,30).civilization!.farming!,boosted=advanceCivilization(result.state,30).civilization!.farming!
 expect(boosted.jobs.build.remainingWork).toBeLessThan(ordinary.jobs.build.remainingWork)
 expect(reload(result.state).challenges!.galvanizedSkillIds).toContain(ids[0])
 // The owned village bonus is independent of Dyson's active challenge effects.
 for(const {id} of REWORK_CHALLENGES){
  const ready={...result.state,meta:{...result.state.meta,firstInfinityComplete:true},infinity:{...result.state.infinity,points:64n},quantum:{...result.state.quantum,unlocks:{...result.state.quantum.unlocks,breakTheLoop:true}}}
  const entered=restartInfinityChallenge(ready,'enter',0n,id);if(!entered.ok)throw Error(entered.code)
  const active=advanceCivilization(reload(entered.state),30).civilization!.farming!
  expect(active.jobs.build.remainingWork, id).toBeCloseTo(boosted.jobs.build.remainingWork,8)
  expect(active.resources, id).toEqual(boosted.resources)
 }
})

test('earned Farming milestones wait durably when the existing Skill tree has no eligible choice',()=>{
 let source=farm();source={...source,challenges:{...source.challenges!,galvanizers:1000n}}
 for(let n=0;n<500;n++){const id=eligibleCanonicalFractureIds(source)[0];if(!id)break;const spent=galvanizeCanonicalSkill(source,id);if(!spent.accepted)throw Error(spent.reason);source=spent.state}
 expect(eligibleCanonicalFractureIds(source)).toHaveLength(0)
 const earned=until(source,s=>s.civilization!.farming!.homesBuilt>=1),f=earned.civilization!.farming!
 expect(f.skillRewardPending).toBe(true);expect(f.awardedCatalystIds).toHaveLength(0)
 const reloaded=reload(earned);expect(reloaded.civilization!.farming!.skillRewardPending).toBe(true)
 const available={...reloaded,meta:{...reloaded.meta,firstInfinityComplete:true}}
 expect(eligibleCanonicalFractureIds(available).length).toBeGreaterThan(0)
 const rewarded=advanceCivilization(available,1)
 expect(rewarded.civilization!.farming!.awardedCatalystIds).toEqual(['farming-catalyst-1'])
 expect(advanceCivilization(reload(rewarded),1).challenges!.galvanizers).toBe(rewarded.challenges!.galvanizers)
})

test('optional Granary cannot take the Materials and Tools reserve of a lost Home',()=>{
 let s=setFarmingFocus(farm(),'provisioning')!
 for(let n=0;n<10000&&!s.civilization!.farming!.lostHomes.length;n++){const f=s.civilization!.farming!;if(farmingGoal(f).kind==='granary'&&farmingCanBuyGranary(f))s=buyFarmingGranary(s)!;s=advanceCivilization(s,1)}
 const f=s.civilization!.farming!;expect(f.lostHomes.length).toBeGreaterThan(0)
 // If repair was already paid, it has no remaining stock reserve to protect.
 const unpaid=until(s,s=>!s.civilization!.farming!.jobs.build&&s.civilization!.farming!.lostHomes.length>0,1000)
 const u=unpaid.civilization!.farming!,cost=farmingGranaryCost(u)
 const stocked={...unpaid,civilization:{...unpaid.civilization!,farming:{...u,resources:{...u.resources,materials:cost.materials!,tools:cost.tools!}}}}
 expect(validateCivilization(stocked.civilization)).toBeNull()
 expect(buyFarmingGranary(stocked)).toBeNull()
 expect(farmingGranaryPurchaseStatus(stocked.civilization!.farming!)).toBe('repairReserve')
})

// Independent work/output contracts at the real engine boundary. These fixtures
// supply funded receipts, never completion ordering or results from a fake clock.
function carryoverVillage(fractures=0,changes:Partial<FarmingState>={}):CanonicalGameStateV1 {
 let state=farm()
 const farming:FarmingState={...state.civilization!.farming!,elapsedSeconds:0,tickRemainder:0,
  focus:'balanced',homes:[0,1,2,3,4,5],lostHomes:[],homesBuilt:6,granaries:3,shipments:3,
  firstHarvest:true,weathering:0,inheritedFoodPerMinute:0,inheritedMaterialsPerMinute:0,
  completedBuildings:['pasture','kiln','waterworks','hall','intensiveCultivation','guildWorkshop','townMarket'],
  resources:{food:0,materials:80,tools:8,goods:35},targets:{food:350,materials:0,tools:0,goods:35},
  jobs:{food:{kind:'food',work:42,remainingWork:42,inputs:{},output:27}},
  awardedCatalystIds:['farming-catalyst-1','farming-catalyst-2','farming-catalyst-3','farming-catalyst-4','farming-catalyst-5'],
  ...changes}
 state={...state,meta:{...state.meta,firstInfinityComplete:true},civilization:{...state.civilization!,farming},
  challenges:{...state.challenges!,galvanizers:state.challenges!.galvanizers+BigInt(fractures)}}
 expect(validateFarming(farming)).toBeNull()
 for(let n=0;n<fractures;n++){
  const result=galvanizeCanonicalSkill(state,eligibleCanonicalFractureIds(state)[0])
  if(!result.accepted)throw Error(result.reason)
  state=result.state
 }
 expect(validateCanonicalGameState(state)).toEqual({valid:true,errors:[]})
 return state
}

test.each([
 {fractures:0,food:81,remainingWork:40.5},
 {fractures:10,food:108,remainingWork:18.75},
 {fractures:40,food:243,remainingWork:37.5},
 {fractures:60,food:324,remainingWork:36},
])('eligible repeated Farming cycles keep elapsed work at $fractures fractures',scenario=>{
 const state=carryoverVillage(scenario.fractures),next=advanceCivilization(state,10).civilization!.farming!
 // 15 residents * .85 useful labor * (1 + fractures * .05) * 10 seconds.
 // Every 42 work completes a paid 27-Food cycle; leftover work starts the next.
 expect(next.resources.food).toBe(scenario.food)
 expect(next.jobs.food.remainingWork).toBeCloseTo(scenario.remainingWork,9)
 expect(next.elapsedSeconds).toBe(10)
 expect(next.resources.materials).toBe(80)
 expect(next.resources.goods).toBe(35)
})

test('fractional Farming time advances authoritative work immediately, including a saved unused old tick residue',()=>{
 const state=carryoverVillage(),partial=advanceCivilization(state,.5).civilization!.farming!
 expect(partial.jobs.food.remainingWork).toBeCloseTo(35.625,9)
 expect(partial.elapsedSeconds).toBe(.5)
 const legacy={...state,civilization:{...state.civilization!,farming:{...state.civilization!.farming!,tickRemainder:.5}}}
 const resumed=advanceCivilization(reload(legacy),.5).civilization!.farming!
 expect(resumed.jobs.food.remainingWork).toBeCloseTo(29.25,9)
 expect(resumed.elapsedSeconds).toBe(1)
 expect(resumed.tickRemainder).toBe(0)
 const due=carryoverVillage(0,{jobs:{food:{kind:'food',work:42,remainingWork:0,inputs:{},output:27}}})
 const continued=advanceFarming(reload(due),.5).civilization!.farming!
 expect(continued.resources.food).toBe(27)
 expect(continued.jobs.food.remainingWork).toBeCloseTo(35.625,9)
})

test('a repair completion redistributes the shared labor pool before unused time advances subsequent food work',()=>{
 const state=carryoverVillage(40,{focus:'expeditions',homes:[0,1,2,3,4],lostHomes:[5],
  jobs:{food:{kind:'food',work:42,remainingWork:42,inputs:{},output:27},
   build:{kind:'repair',index:5,work:1092,remainingWork:1,inputs:{materials:400,tools:14},output:0}}})
 const next=advanceCivilization(state,1).civilization!.farming!
 expect(next.homes).toEqual([0,1,2,3,4,5])
 // Repair uses 1 work at 21.233333.../s; Fields receives .8 work concurrently.
 // Restored residents then give Fields 44.1 work/s for the remaining interval.
 expect(next.resources.food).toBe(27)
 expect(next.jobs.food.remainingWork).toBeCloseTo(41.176923076923075,9)
 expect(next.resources.materials).toBe(80)
})

test('unused Farming time cannot fund a blocked next Tools cycle before actual Materials arrive',()=>{
 const state=carryoverVillage(0,{homes:[0,1,2,3,4],homesBuilt:5,
  resources:{food:0,materials:0,tools:0,goods:35},
  jobs:{tools:{kind:'tools',work:42,remainingWork:.1,inputs:{materials:6},output:2}}})
 const next=advanceCivilization(state,1).civilization!.farming!
 expect(next.resources.tools).toBe(2)
 expect(next.resources.materials).toBe(0)
 expect(next.jobs.tools).toBeUndefined()
 expect(next.jobs.materials.remainingWork).toBeGreaterThan(0)
 expect(next.resources.food).toBe(0)
 expect(validateFarming(next)).toBeNull()
})


test('partial paid Food and inherited inflow respect the same reserved capacity during subsecond completion',()=>{
 const state=carryoverVillage(0,{inheritedFoodPerMinute:2.7,
  resources:{food:558,materials:80,tools:8,goods:0},
  jobs:{food:{kind:'food',work:42,remainingWork:.1,inputs:{},output:2}}})
 const next=advanceCivilization(state,.5).civilization!.farming!
 expect(next.resources.food).toBe(560)
 expect(next.jobs.food).toBeUndefined()
 expect(next.resources.food).toBeLessThanOrEqual(farmingCapacity(next))
 expect(validateFarming(next)).toBeNull()
})


test('a huge blocked interval advances time without per-second or per-cycle replay',()=>{
 const state=carryoverVillage(0,{homes:[0],homesBuilt:1,granaries:0,shipments:0,completedBuildings:[],
  resources:{food:0,materials:35,tools:4,goods:0},jobs:{},awardedCatalystIds:['farming-catalyst-1']})
 // A subprocess timeout safely catches reintroduced synchronous trillion-step
 // loops; it is a bounded-completion contract, not a latency benchmark.
 const owner=new URL('./farming.ts',import.meta.url).href
 const script=`import {readFileSync} from 'node:fs';import {advanceFarming} from ${JSON.stringify(owner)};const s=JSON.parse(readFileSync(0,'utf8'),(_k,v)=>v&&typeof v==='object'&&'__bigint' in v?BigInt(v.__bigint):v);const f=advanceFarming(s,1e12).civilization.farming;process.stdout.write(JSON.stringify({elapsed:f.elapsedSeconds,resources:f.resources,jobs:f.jobs}));`
 const result=JSON.parse(execFileSync(process.execPath,['--import','tsx','--input-type=module','-e',script],
  {input:JSON.stringify(state,(_k,v)=>typeof v==='bigint'?{__bigint:v.toString()}:v),timeout:3000,encoding:'utf8'}))
 expect(result).toEqual({elapsed:1e12,resources:{food:0,materials:35,tools:4,goods:0},jobs:{}})
})

test.each([{remainder:0,doubleTime:false},{remainder:.5,doubleTime:false},{remainder:.5,doubleTime:true}])('continuous Granary funding consumes legacy remainder once and budgets new time: %j',({remainder,doubleTime})=>{
 const state=carryoverVillage(0,{homes:[0],homesBuilt:1,granaries:0,shipments:0,completedBuildings:[],
  inheritedMaterialsPerMinute:2.7,resources:{food:0,materials:34.9,tools:4,goods:0},jobs:{},
  awardedCatalystIds:['farming-catalyst-1']})
 const legacy={...state,timeline:{...state.timeline,doubleTime:{...state.timeline.doubleTime,unlocked:doubleTime}},civilization:{...state.civilization!,farming:{...state.civilization!.farming!,tickRemainder:remainder}}}
 const admitted=farmingStoredTimeBudget(reload(legacy),10)
 expect(admitted).toBeCloseTo((20/9-remainder)/(doubleTime?2:1),9) // .1 Materials / (.045 per second).
 const next=advanceFarming(reload(legacy),admitted*(doubleTime?2:1),true).civilization!.farming!
 expect(next.elapsedSeconds).toBeCloseTo(20/9,9)
 expect(next.resources.materials).toBeCloseTo(35,9)
 expect(next.resources.tools).toBe(4)
 expect(next.granaries).toBe(0)
 expect(next.jobs.materials.remainingWork).toBeCloseTo(42-(20/9)*4.25,9)
 expect(next.tickRemainder).toBe(0)
 const saved=reload({...legacy,civilization:{...legacy.civilization!,farming:next}})
 expect(farmingStoredTimeBudget(saved,10)).toBe(0)
 expect(saved.civilization!.farming).toEqual(next)
})

test('Farming housing loss settles before a simultaneous paid repair, then admits from the resulting ownership',()=>{
 const duration=1/(13*.98/1.8),state=carryoverVillage(0,{focus:'expeditions',homes:[0,1,2,3,4],lostHomes:[5],
  weathering:100-duration*(4/60)*.6*.8,
  jobs:{food:{kind:'food',work:42,remainingWork:42,inputs:{},output:27},
   build:{kind:'repair',index:5,work:1092,remainingWork:1,inputs:{materials:400,tools:14},output:0}}})
 const next=advanceCivilization(state,duration).civilization!.farming!
 expect(next.homes).toEqual([0,1,2,3,5])
 expect(next.lostHomes).toEqual([4])
 expect(next.weathering).toBeCloseTo(40,9)
 expect(next.jobs.food.remainingWork).toBeCloseTo(41.2,9)
 expect(validateFarming(next)).toBeNull()
})

test.each([0,10,40,60])('irregular serialized partitions conserve repeated receipts at %i fractures',fractures=>{
 const initial=carryoverVillage(fractures,{inheritedFoodPerMinute:2.7,inheritedMaterialsPerMinute:2.7})
 const whole=advanceFarming(initial,10).civilization!.farming!
 let small=initial,remaining=10,index=0
 while(remaining>0){const dt=Math.min(remaining,[.017,.333,.7,.05][index++%4]);small=advanceFarming(small,dt);remaining=Math.max(0,remaining-dt);if(index%3===0)small=reload(small)}
 const split=small.civilization!.farming!
 expect(split.homes).toEqual(whole.homes);expect(split.completedBuildings).toEqual(whole.completedBuildings)
 expect(split.jobSequence).toBe(whole.jobSequence);expect(Object.keys(split.jobs)).toEqual(Object.keys(whole.jobs))
 for(const id of ['food','materials','tools','goods'] as const)expect(split.resources[id]).toBeCloseTo(whole.resources[id],8)
 for(const id of Object.keys(whole.jobs)){expect(split.jobs[id].inputs).toEqual(whole.jobs[id].inputs);expect(split.jobs[id].cycle).toBe(whole.jobs[id].cycle);expect(split.jobs[id].remainingWork).toBeCloseTo(whole.jobs[id].remainingWork,8)}
 expect(split.weathering).toBeCloseTo(whole.weathering,8)
 expect(validateFarming(split)).toBeNull()
})


test('a paid Goods admission opens Materials demand immediately in every time partition',()=>{
 const initial=carryoverVillage(60,{focus:'settlement',homes:[0,1,2,3],homesBuilt:4,shipments:0,
  completedBuildings:['kiln','pasture','waterworks','intensiveCultivation','hall'],
  inheritedMaterialsPerMinute:2.7,resources:{food:114,materials:99.6,tools:8,goods:9},
  jobs:{ship:{kind:'ship',work:1890,remainingWork:1470,inputs:{food:350,goods:35},output:80},
   goods:{kind:'goods',work:63,remainingWork:0,inputs:{materials:4},output:2}}})
 const whole=advanceFarming(initial,1).civilization!.farming!
 const split=advanceFarming(reload(advanceFarming(initial,.5)),.5).civilization!.farming!
 expect(whole.jobs.materials).toMatchObject({kind:'materials',work:42,inputs:{},output:8})
 expect(whole.jobSequence).toBe(split.jobSequence)
 expect(Object.keys(whole.jobs).sort()).toEqual(Object.keys(split.jobs).sort())
 for(const id of ['food','materials','tools','goods'] as const)expect(whole.resources[id]).toBeCloseTo(split.resources[id],8)
 for(const id of Object.keys(whole.jobs)){
  expect(whole.jobs[id].cycle).toBe(split.jobs[id].cycle)
  expect(whole.jobs[id].remainingWork).toBeCloseTo(split.jobs[id].remainingWork,8)
 }
 expect(validateFarming(whole)).toBeNull();expect(validateFarming(split)).toBeNull()
})

test('exact repeated weather periods batch without losing paid cycles, readiness or partition ownership',()=>{
 const initial=carryoverVillage(0,{focus:'expeditions',shipments:6,resources:{food:560,materials:480,tools:28,goods:40},jobs:{},inheritedFoodPerMinute:2.7,inheritedMaterialsPerMinute:2.7})
 const whole=advanceFarming(initial,2592000).civilization!.farming!
 let split=initial
 for(let n=0;n<30;n++)split=reload(advanceFarming(split,86400))
 const small=split.civilization!.farming!
 expect(whole.homes).toEqual(small.homes);expect(whole.lostHomes).toEqual(small.lostHomes)
 expect(whole.jobSequence).toBe(small.jobSequence)
 expect(whole.awardedCatalystIds).toEqual(small.awardedCatalystIds)
 expect(whole.cityReadinessReached).toBe(true)
 for(const id of ['food','materials','tools','goods'] as const)expect(whole.resources[id]).toBeCloseTo(small.resources[id],6)
 expect(whole.weathering).toBeCloseTo(small.weathering,6)
 expect(validateFarming(whole)).toBeNull()
 const owner=new URL('./farming.ts',import.meta.url).href
 const script=`import {readFileSync} from 'node:fs';import {advanceFarming,validateFarming} from ${JSON.stringify(owner)};const s=JSON.parse(readFileSync(0,'utf8'),(_k,v)=>v&&typeof v==='object'&&'__bigint' in v?BigInt(v.__bigint):v);const f=advanceFarming(s,1e12).civilization.farming;process.stdout.write(JSON.stringify({elapsed:f.elapsedSeconds,cycles:f.jobSequence,earned:f.awardedCatalystIds.includes('farming-catalyst-6'),validation:validateFarming(f)}));`
 const result=JSON.parse(execFileSync(process.execPath,['--import','tsx','--input-type=module','-e',script],{input:JSON.stringify(initial,(_k,v)=>typeof v==='bigint'?{__bigint:v.toString()}:v),timeout:3000,encoding:'utf8'}))
 expect(result.elapsed).toBe(1e12);expect(result.cycles).toBeGreaterThan(1e10);expect(result.earned).toBe(true);expect(result.validation).toBeNull()
})


test('earned Catalyst readiness survives housing loss while dock readiness and Finish require current Homes',()=>{
 const initial=carryoverVillage(0,{focus:'expeditions',shipments:6,weathering:99.99,jobs:{},
  resources:{food:560,materials:0,tools:0,goods:35}})
 const full={...initial,challenges:{...initial.challenges!,galvanizers:DISCRETE_MAXIMUM}}
 const ready=advanceFarming(full,.1),r=ready.civilization!.farming!
 expect(farmingMilestoneFlags(r).filter(Boolean)).toHaveLength(6)
 expect(completeFarmingAge(ready)).not.toBeNull()
 expect(r.skillRewardPending).toBe(true)
 expect(r.awardedCatalystIds).not.toContain('farming-catalyst-6')
 const damaged=reload(advanceFarming(reload(ready),1)),f=damaged.civilization!.farming!
 expect(f.homes).toHaveLength(5)
 expect(farmingMilestoneFlags(f).filter(Boolean)).toHaveLength(5)
 expect(farmingComplete(f)).toBe(false)
 expect(farmingManualGate(f)).toBe(false)
 expect(completeFarmingAge(damaged)).toBeNull()
 expect(f.cityReadinessReached).toBe(true)
 expect(f.skillRewardPending).toBe(true)
 const room={...damaged,challenges:{...damaged.challenges!,galvanizers:DISCRETE_MAXIMUM-1n}}
 const credited=reload(advanceFarming(room,.1)),c=credited.civilization!.farming!
 expect(credited.challenges!.galvanizers).toBe(DISCRETE_MAXIMUM)
 expect(c.awardedCatalystIds).toContain('farming-catalyst-6')
 expect(c.skillRewardPending).toBe(false)
 expect(farmingMilestoneFlags(c).filter(Boolean)).toHaveLength(5)
 expect(completeFarmingAge(credited)).toBeNull()
 expect(advanceFarming(credited,.1).challenges!.galvanizers).toBe(DISCRETE_MAXIMUM)
})


test('Farming advances within clock precision and rejects unrepresentable time without changing owned work',()=>{
 const supported=carryoverVillage(0,{elapsedSeconds:1e12}),next=advanceFarming(reload(supported),.5).civilization!.farming!
 expect(next.elapsedSeconds).toBe(1e12+.5)
 expect(next.jobs.food.remainingWork).toBeCloseTo(35.625,9)
 expect(validateFarming(next)).toBeNull()
 for(const [elapsedSeconds,seconds,remainingWork,tickRemainder] of [
  [2**53,.25,42,0], [2**53,.25,42,.5], [Number.MAX_VALUE,Number.MAX_VALUE,42,0],
  [2**53,2,.001,0],
 ]){
  const state=carryoverVillage(0,{elapsedSeconds,tickRemainder,jobs:{food:{kind:'food',work:42,remainingWork,inputs:{},output:27}}}),before=structuredClone(state)
  expect(()=>advanceFarming(state,seconds)).toThrow('Farming clock precision exhausted.')
  expect(state).toEqual(before)
 }
})

test('paid Farming cycle identities stop at safe integer exhaustion without publishing charges or repeated identities',()=>{
 const initial=carryoverVillage(0,{jobSequence:Number.MAX_SAFE_INTEGER-1,
  jobs:{food:{cycle:Number.MAX_SAFE_INTEGER-1,kind:'food',work:42,remainingWork:1,inputs:{},output:27}}})
 const last=reload(advanceFarming(initial,.1)),f=last.civilization!.farming!
 expect(f.jobSequence).toBe(Number.MAX_SAFE_INTEGER)
 expect(f.jobs.food.cycle).toBe(Number.MAX_SAFE_INTEGER)
 expect(validateFarming(f)).toBeNull()
 const before=structuredClone(last)
 expect(()=>advanceFarming(last,4)).toThrow('Farming cycle identity exhausted.')
 expect(last).toEqual(before)
})
