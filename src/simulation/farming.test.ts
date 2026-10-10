import { expect, test } from 'vitest'
import { createUnityFirstRunPreparedSave } from '../application/firstRun/unityFirstRunSave'
import { hydrateGameState, dehydrateGameState } from '../game-state/mapping'
import { validateCanonicalGameState } from '../game-state/validate'
import { PreparedSave } from '../save/prepare'
import { deserializeWebSave, serializeWebSave } from '../save/serialization'
import type { CanonicalGameStateV1, CivilizationFocus } from '../game-state/types'
import { advanceCivilization, validateCivilization } from './civilization'
import { startFarming, farmingGoal, farmingCanBuyGranary, buyFarmingGranary, farmingComplete, setFarmingFocus, completeFarmingAge, farmingWorkers, farmingCapacity, farmingGranaryCost, farmingGranaryPurchaseStatus } from './farming'
import { eligibleCanonicalFractureIds, galvanizeCanonicalSkill } from './canonicalSkillTransactions'
import { restartInfinityChallenge } from './canonicalInfinityChallengeRestart'
import { REWORK_CHALLENGES } from './reworkChallenges'
const session=hydrateGameState(createUnityFirstRunPreparedSave({startedAtUtc:'2026-10-09T00:00:00Z'}))
const fresh=():CanonicalGameStateV1=>({...session.state,meta:{...session.state.meta,reworkMigrationChoice:'keep'}})
const opening=()=>advanceCivilization(fresh(),7043)
const reload=(state:CanonicalGameStateV1)=>hydrateGameState(PreparedSave.fromDecoded(deserializeWebSave(serializeWebSave(dehydrateGameState(session,state).copyValidatedState())))).state
function until(s:CanonicalGameStateV1,p:(s:CanonicalGameStateV1)=>boolean,max=25000){for(let n=0;n<max&&!p(s);n++)s=advanceCivilization(s,1);expect(p(s)).toBe(true);return s}
const farm=()=>until(startFarming(opening())!,s=>s.civilization!.farming!.phase==='farming')
const gate=()=>until(farm(),s=>farmingCanBuyGranary(s.civilization!.farming!))

test('explicit age handoff settles paid work, transfers founders once and retains one camp owner',()=>{
 expect(startFarming(fresh())).toBeNull()
 const old=opening(),paid=Object.entries(old.civilization!.activities).filter(([,j])=>j.active),start=startFarming(old)!
 expect(start.civilization!.workers).toBe(old.civilization!.workers-3n)
 expect(start.civilization!.resources).toEqual(old.civilization!.resources)
 expect(validateCanonicalGameState(start)).toEqual({valid:true,errors:[]})
 expect(startFarming(reload(start))).toBeNull()
 const ready=until(reload(start),s=>s.civilization!.farming!.phase==='farming')
 for(const [id,j]of paid)expect(ready.civilization!.activities[id].completions).toBe(j.completions+1n)
 expect(Object.values(ready.civilization!.activities).every(j=>!j.active&&j.workers===0n)).toBe(true)
 expect(ready.civilization!.farming!.inheritedFoodPerMinute).toBe(1.89)
 expect(ready.civilization!.farming!.inheritedMaterialsPerMinute).toBe(1.89)
 expect(advanceCivilization(ready,500).civilization!.resources).toEqual(ready.civilization!.resources)
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
 expect(farmingComplete(f)).toBe(true);expect(f.elapsedSeconds/60).toBeGreaterThan(140);expect(f.elapsedSeconds/60).toBeLessThan(165)
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
