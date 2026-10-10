import { expect, test } from 'vitest'
import { readFileSync } from 'node:fs'
import { createUnityFirstRunPreparedSave } from '../application/firstRun/unityFirstRunSave'
import { hydrateGameState, dehydrateGameState } from '../game-state/mapping'
import { validateCanonicalGameState } from '../game-state/validate'
import { PreparedSave } from '../save/prepare'
import { serializeWebSave, deserializeWebSave } from '../save/serialization'
import { applyCanonicalInfinityReset } from './canonicalInfinityReset'
import { applyCanonicalOverflowReset } from './canonicalOverflowReset'
import { OVERFLOW_BOT_CAP } from './overflowBoundary'
import { galvanizedSkillIds } from './galvanization'
import { galvanizeCanonicalSkill } from './canonicalSkillTransactions'
import { restartInfinityChallenge } from './canonicalInfinityChallengeRestart'
import { REWORK_CHALLENGES } from './reworkChallenges'
import { EMPTY_INFINITY_CHALLENGES } from './infinityChallenges'
import { applyAwayTimeReplay } from './lifecycleAwayTime'
import { DISCRETE_MAXIMUM } from './numeric'
import { advanceCivilization, setCivilizationFocus, equipCivilizationWorkers, civilizationEquipmentLabor, CIVILIZATION_ACTIVITIES, EMPTY_CIVILIZATION, civilizationSpeed, civilizationAvailableWorkers, civilizationJobWaiting, civilizationMilestoneProgress, civilizationLogProgress, hydrateCivilization, validateCivilization, validateCivilizationSave, civilizationCatalystMilestone, nextCivilizationCatalyst, civilizationActivityInputs } from './civilization'
import type { CanonicalGameStateV1, CivilizationState } from '../game-state/types'
const prepared=createUnityFirstRunPreparedSave({startedAtUtc:'2026-10-08T00:00:00Z'}),session=hydrateGameState(prepared)
const fresh=():CanonicalGameStateV1=>({...session.state,meta:{...session.state.meta,reworkMigrationChoice:'keep'}})
function reload(state:CanonicalGameStateV1){return hydrateGameState(PreparedSave.fromDecoded(deserializeWebSave(serializeWebSave(dehydrateGameState(session,state).copyValidatedState())))).state}
function equivalent(a:CivilizationState,b:CivilizationState){expect(a.resources).toEqual(b.resources);expect(a.workers).toBe(b.workers);expect(a.equippedWorkers).toBe(b.equippedWorkers);expect(a.awardedCatalystMilestoneIds).toEqual(b.awardedCatalystMilestoneIds);for(const {id} of CIVILIZATION_ACTIVITIES){expect(a.activities[id].completions).toBe(b.activities[id].completions);expect(a.activities[id].workers).toBe(b.activities[id].workers);expect(a.activities[id].active).toBe(b.activities[id].active);expect(a.activities[id].progress).toBeCloseTo(b.activities[id].progress,6)}}
// Frozen approved-candidate study: real ledger and one-second gate boundaries.
test.each([
 ['balanced',59n,14n,6n,9n,5n,7043,6],
 ['provisioning',210n,50n,23n,25n,14n,4919,7],
 ['settlement',450n,112n,49n,102n,59n,2595,9],
 ['expeditions',129n,32n,14n,32n,317n,3186,7],
] as const)('%s matches approved focus balance two-hour ledger and opening gate',(focus,workers,kits,camps,explorations,trades,gate,awards)=>{
 const selected=setCivilizationFocus(fresh(),focus)??fresh(),before=advanceCivilization(selected,gate-1),after=advanceCivilization(selected,gate)
 expect(before.civilization!.awardedCatalystMilestoneIds).not.toContain('forager-catalyst-6');expect(after.civilization!.awardedCatalystMilestoneIds).toContain('forager-catalyst-6')
 const state=advanceCivilization(selected,7200),c=state.civilization!
 expect(c).toMatchObject({workers,equippedWorkers:kits});expect(c.activities.campExpansion.completions).toBe(camps);expect(c.activities.seasonalExpeditions.completions).toBe(explorations);expect(c.activities.exchangeNetworks.completions).toBe(trades)
 expect(c.awardedCatalystMilestoneIds).toHaveLength(awards);expect(civilizationAvailableWorkers(c)).toBe(0n)
 expect(c.workers).toBe(3n+2n*c.activities.shelterBuilding.completions+3n*c.activities.campExpansion.completions)
 expect(validateCanonicalGameState(state)).toEqual({valid:true,errors:[]})
})
test('starter kit is one-time, real founders produce Gathering, and tents add residents',()=>{
 const first=advanceCivilization(fresh(),.001),c=first.civilization!
 expect(c.workers).toBe(3n);expect(c.activities.gathering.workers).toBe(3n);expect(civilizationSpeed(c,0,0)).toBe(3)
 expect(c.resources).toMatchObject({food:6n,materials:18n,hides:2n,tools:1n})
 const tent=advanceCivilization(reload(first),220.001)
 expect(tent.civilization!.activities.shelterBuilding.completions).toBe(1n);expect(tent.civilization!.workers).toBe(5n)
})
test('three paid tents retain six residents, then settle one Camp with only three new residents',()=>{
 let state=advanceCivilization(fresh(),1)
 for(let n=0;n<4500&&!state.civilization!.activities.campExpansion.active;n++)state=advanceCivilization(state,1)
 const c=state.civilization!,job=c.activities.campExpansion
 expect(job.active).toBe(true);expect(job.cycleReceipt!.inputs.shelters).toBe(3n)
 expect(c.workers).toBe(3n+2n*c.activities.shelterBuilding.completions)
 const paid=reload(state);expect(paid.civilization!.activities.campExpansion.cycleReceipt).toEqual(job.cycleReceipt)
 const count=job.completions
 while(state.civilization!.activities.campExpansion.completions===count)state=advanceCivilization(state,1)
 const done=state.civilization!;expect(done.workers).toBe(3n+2n*done.activities.shelterBuilding.completions+3n)
 expect(done.resources.shelters+3n*done.resources.camps+(done.activities.campExpansion.active?3n:0n)).toBe(done.activities.shelterBuilding.completions)
})
test('demand met releases exploration crews; actual award resumes the next needed goal',()=>{
 const state=advanceCivilization(setCivilizationFocus(fresh(),'expeditions')!,7200),c=state.civilization!,i=CIVILIZATION_ACTIVITIES.findIndex(a=>a.id==='seasonalExpeditions')
 expect(c.activities.seasonalExpeditions).toMatchObject({active:false,workers:0n,completions:32n});expect(civilizationJobWaiting(c,i).reason).toBe('demand')
 expect(nextCivilizationCatalyst(c).ordinal).toBe(8)
 // The next goal needs more Camps/Trade before exploration demand changes.
 const resumed=advanceCivilization(setCivilizationFocus(state,'settlement')!,7200);expect(resumed.civilization!.activities.seasonalExpeditions.completions).toBeGreaterThan(32n)
},20000)
test('construction lifetime prices survive reload and paid receipts keep their quoted bill',()=>{
 const state=advanceCivilization(fresh(),500),c=state.civilization!,i=CIVILIZATION_ACTIVITIES.findIndex(a=>a.id==='shelterBuilding'),job=c.activities.shelterBuilding
 expect(civilizationActivityInputs(c,i,0n)).toEqual({food:6n,materials:18n,hides:2n,tools:1n})
 expect(civilizationActivityInputs(c,i,10n).materials).toBeGreaterThan(18n)
 const restored=reload(state).civilization!;expect(civilizationActivityInputs(restored,i)).toEqual(civilizationActivityInputs(c,i));if(job.active)expect(civilizationActivityInputs(c,i)).toEqual(job.cycleReceipt!.inputs)
})
test('large, irregular ticks and four hourly serialized saves conserve paid work and rewards',()=>{
 const large=advanceCivilization(fresh(),14400);let small=fresh(),elapsed=0,i=0
 while(elapsed<7200){const seconds=Math.min(7200-elapsed,[.2,1.7,37,13.1][i++%4]);small=advanceCivilization(small,seconds);elapsed+=seconds}
 equivalent(small.civilization!,advanceCivilization(fresh(),7200).civilization!)
 let hourly=fresh();for(let n=0;n<4;n++)hourly=reload(advanceCivilization(hourly,3600))
 equivalent(hourly.civilization!,large.civilization!);expect(hourly.challenges).toEqual(large.challenges)
},30000)
test('automatic gear targets one quarter, uses real half-labor field crews, and repeated clicks buy nothing',()=>{
 const state=advanceCivilization(fresh(),7200),c=state.civilization!
 expect(c.equippedWorkers).toBe(c.workers/4n)
 const field=['gathering','hunting','fishing'].reduce((n,id)=>n+(c.activities[id].active?c.activities[id].workers:0n),0n)
 const labor=CIVILIZATION_ACTIVITIES.reduce((n,_a,i)=>n+civilizationEquipmentLabor(c,i),0)
 expect(labor).toBeCloseTo(Number(c.equippedWorkers<field?c.equippedWorkers:field)*.5)
 expect(equipCivilizationWorkers(state,1n)).toBeNull();expect(equipCivilizationWorkers(state,1n)).toBeNull()
})
test('automatic awards have no resource debit and wallet-full receipts wait without loss',()=>{
 const base=advanceCivilization(fresh(),7200),candidate={...base,civilization:{...base.civilization!,awardedCatalystMilestoneIds:[]},challenges:{...base.challenges!,galvanizers:0n}}
 const normal=advanceCivilization(base,.001),credited=advanceCivilization(candidate,.001)
 expect(credited.civilization!.resources).toEqual(normal.civilization!.resources);expect(credited.challenges!.galvanizers).toBe(6n)
 expect(advanceCivilization(reload(credited),.001).challenges!.galvanizers).toBe(6n)
 const full=advanceCivilization({...candidate,challenges:{...candidate.challenges,galvanizers:DISCRETE_MAXIMUM}},.001)
 expect(full.civilization!.awardedCatalystMilestoneIds).toEqual([])
 const room=advanceCivilization({...full,challenges:{...full.challenges!,galvanizers:DISCRETE_MAXIMUM-1n}},.001)
 expect(room.challenges!.galvanizers).toBe(DISCRETE_MAXIMUM);expect(room.civilization!.awardedCatalystMilestoneIds).toEqual(['forager-catalyst-1'])
})
test('only actual permanent skill-tree purchases add speed; saved wallet alone adds nothing',()=>{
 const start=advanceCivilization(fresh(),640),speed=civilizationSpeed(start.civilization!,0,0)
 expect(civilizationSpeed(start.civilization!,0,galvanizedSkillIds(start).length)).toBe(speed)
 const purchase=galvanizeCanonicalSkill(start,'startHereTree');if(!purchase.accepted)throw Error(purchase.reason)
 expect(civilizationSpeed(purchase.state.civilization!,0,galvanizedSkillIds(purchase.state).length)).toBeCloseTo(speed*1.05)
 expect(reload(purchase.state).challenges!.galvanizedSkillIds).toEqual(['startHereTree'])
})
test.each([
 ...REWORK_CHALLENGES.map(({id})=>({id,permanent: true})),
 {id:'built-by-hand' as const,permanent:false},
])('paid Forager work retains receipt speed in $id (permanent=$permanent)',({id,permanent})=>{
 const started=advanceCivilization(fresh(),.001)
 let source:CanonicalGameStateV1={...started,meta:{...started.meta,firstInfinityComplete:true},infinity:{...started.infinity,points:64n},quantum:{...started.quantum,unlocks:{...started.quantum.unlocks,breakTheLoop:true}},challenges:{...EMPTY_INFINITY_CHALLENGES,unlocked:true,galvanizers:1n,hasEarnedGalvanizer:true}}
 if(permanent){const purchased=galvanizeCanonicalSkill(source,'startHereTree');if(!purchased.accepted)throw Error(purchased.reason);source=purchased.state}
 const before=source.civilization!.activities.gathering
 expect(before.active).toBe(true);expect(before.workers).toBe(3n)
 const entered=restartInfinityChallenge(source,'enter',0n,id);if(!entered.ok)throw Error(entered.code)
 // Focus normalizes the existing paid deadline; reload exercises receipt ownership.
 const selected=setCivilizationFocus(entered.state,'provisioning');if(!selected)throw Error('Focus rejected')
 const result=advanceCivilization(reload(selected),.25),after=result.civilization!.activities.gathering
 expect(after.progress-before.progress).toBeCloseTo(3*.25*12*(permanent?1.05:1),10)
 expect(after.cycleReceipt!.inputs).toEqual(before.cycleReceipt!.inputs)
 expect(result.challenges!.galvanizedSkillIds??[]).toEqual(permanent?['startHereTree']:[])
 expect(validateCanonicalGameState(result)).toEqual({valid:true,errors:[]})
 const abandoned=restartInfinityChallenge(result,'abandon',0n);if(!abandoned.ok)throw Error(abandoned.code)
 const resumed=advanceCivilization(abandoned.state,.25).civilization!.activities.gathering
 expect(resumed.progress-after.progress).toBeCloseTo(3*.25*12*(permanent?1.05:1),10)
})
test.each(['infinity','transcendence'] as const)('retains population, focus, paid recipes, gear and awards through %s',reset=>{
 const start=advanceCivilization(fresh(),7200),state={...start,dyson:{...start.dyson,bots:OVERFLOW_BOT_CAP}},result=reset==='infinity'?applyCanonicalInfinityReset(state,{breakInfinity:false,requestedReward:0n,artifactSkillPoints:0n}):applyCanonicalOverflowReset(state)
 expect(result.ok).toBe(true);if(!result.ok)return;expect(result.state.civilization).toBe(state.civilization);expect(result.state.challenges!.galvanizers).toBe(state.challenges!.galvanizers);expect(validateCanonicalGameState(result.state).valid).toBe(true)
})
test('v3 paid retired recruitment migrates once without retroactive housing population or second input debit',()=>{
 const old={version:3,focus:'craft',unlocked:true,workers:7n,equippedWorkers:2n,resources:{...EMPTY_CIVILIZATION.resources,food:100n,materials:100n,shelters:3n},awardedCatalystMilestoneIds:['forager-catalyst-1'],activities:Object.fromEntries(CIVILIZATION_ACTIVITIES.map(({id})=>[id,{completions:10n,workers:0n,active:false,progress:0}]))}
 old.activities.campProvisioning={completions:10n,workers:1n,active:true,progress:89}
 expect(validateCivilizationSave(old)).toBeNull();expect(validateCivilizationSave({...old,awardedCatalystMilestoneIds:['forager-catalyst-64']})).not.toBeNull();expect(validateCivilizationSave({...old,workers:100n})).not.toBeNull();const c=hydrateCivilization(old)!
 expect(c).toMatchObject({version:4,workers:7n,equippedWorkers:2n,focus:'balanced',populationBaseline:7n})
 const paid=reload({...fresh(),civilization:c});expect(paid.civilization!.activities.campProvisioning).toMatchObject({active:true,cycleReceipt:{populationDelta:1n,seconds:90}})
 const done=advanceCivilization(paid,2);expect(done.civilization!.activities.campProvisioning).toMatchObject({active:false,completions:11n});expect(done.civilization!.workers).toBe(8n)
 expect(advanceCivilization(reload(done),20).civilization!.activities.campProvisioning.completions).toBe(11n)
})
test('v2 receipt preserves original duration/output while undefined legacy Knowledge remains inert',()=>{
 const old={unlocked:true,resources:{food:100n,materials:40n,knowledge:6n},activities:Object.fromEntries(CIVILIZATION_ACTIVITIES.map(({id})=>[id,{completions:10n,progress:0}])),claimedCatalystOfferIds:['forager-catalyst-1']}
 expect(validateCivilizationSave(old)).toBeNull();expect(hydrateCivilization(old)).toMatchObject({version:4,workers:3n,legacyKnowledge:6n})
 const v2={version:2,unlocked:true,workers:3n,equippedWorkers:0n,resources:{...EMPTY_CIVILIZATION.resources},claimedCatalystOfferIds:['forager-catalyst-1'],activities:Object.fromEntries(CIVILIZATION_ACTIVITIES.map(({id})=>[id,{completions:10n,progress:0,workers:0n,active:false,autoAssign:true}]))};v2.activities.toolmaking={...v2.activities.toolmaking,active:true,progress:30}
 expect(validateCivilizationSave(v2)).toBeNull();expect(hydrateCivilization(v2)!.activities.toolmaking).toMatchObject({progress:30,active:true,cycleReceipt:{seconds:40,inputs:{food:2n,materials:2n},outputs:{tools:1n}}})
})
test('pending migration, invalid time and away time bank no production; Stored Time remains separate',()=>{
 const start=fresh();for(const seconds of [0,-1,NaN,Infinity])expect(advanceCivilization(start,seconds)).toBe(start)
 expect(advanceCivilization({...start,meta:{...start.meta,reworkMigrationChoice:undefined}},100).civilization).toBeUndefined()
 const state=advanceCivilization(start,500),result=applyAwayTimeReplay({state:{canonical:state,loaded:true,saveReady:true,coldStartReplayPending:false,coldStartGateSaveUsed:false,departureTimestampRecorded:true},clock:{utcMilliseconds:100000,serializedUtcText:'1970-01-01T00:01:40Z'},parsedQuitTimestamp:{status:'valid',utcMilliseconds:90000},parsedStartedTimestamp:{status:'missing'}})
 expect(result.state.canonical.civilization).toBe(state.civilization);expect(result.storedTimeCreditedSeconds).toBe(10)
})
test('validation rejects double crews, malformed paid work, invalid population and negative stocks',()=>{
 const c=advanceCivilization(fresh(),7200).civilization!
 for(const invalid of [{...c,equippedWorkers:c.workers+1n},{...c,workers:c.workers+1n},{...c,resources:{...c.resources,food:-1n}},{...c,activities:{...c.activities,hunting:{...c.activities.hunting,workers:c.workers+1n}}},{...c,activities:{...c.activities,hunting:{...c.activities.hunting,active:false,progress:1}}},{...c,awardedCatalystMilestoneIds:['unknown']}])expect(validateCivilization(invalid)).not.toBeNull()
})
test('logarithmic progress cannot award unfinished work; continuation exceeds Int64 without looping',()=>{
 for(const [a,b] of [[0,10],[-1,10],[NaN,10],[1,0],[1,-1],[1,Infinity]])expect(civilizationLogProgress(a,b)).toBe(0)
 expect(civilizationLogProgress(2,10)).toBeCloseTo(Math.log1p(2)/Math.log1p(10));expect(civilizationLogProgress(20,10)).toBe(1)
 const c=advanceCivilization(fresh(),1).civilization!,m=civilizationCatalystMilestone(1),partial={...c,activities:{...c.activities,hunting:{...c.activities.hunting,progress:59.999}}}
 expect(civilizationMilestoneProgress(partial,m).complete).toBe(false);expect(civilizationMilestoneProgress(partial,m).progress).toBeLessThan(1)
 const saturated={...c,activities:Object.fromEntries(Object.entries(c.activities).map(([id,j])=>[id,{...j,completions:DISCRETE_MAXIMUM,active:false,progress:0,cycleReceipt:undefined}])),awardedCatalystMilestoneIds:[]}
 const awarded=advanceCivilization({...fresh(),civilization:saturated},.001)
 expect(awarded.civilization!.awardedCatalystMilestoneIds).toHaveLength(65);expect(nextCivilizationCatalyst(awarded.civilization!).ordinal).toBe(66)
 expect(civilizationMilestoneProgress(awarded.civilization!,nextCivilizationCatalyst(awarded.civilization!)).complete).toBe(false)
})

// Saved V4 receipts exercise the actual load boundary, not a hand-authored admission.
test('V4 paid work survives the focus upgrade and reload without a second debit or accelerated legacy cycle',()=>{
 const save=deserializeWebSave(readFileSync(new URL('../../test/fixtures/forager-v4-paid.websave.txt',import.meta.url),'utf8'))
 const loaded=hydrateGameState(PreparedSave.fromDecoded(save)).state,c=loaded.civilization!
 expect(c.focusBalanceVersion).toBe(2);expect(c.resources).toMatchObject({food:22n,materials:25n,hides:1n})
 expect(c.activities.gathering.cycleReceipt).toMatchObject({seconds:20,legacyWorkMultiplier:1,finishAt:200.4166666666666})
 expect(c.awardedCatalystMilestoneIds).toEqual(['forager-catalyst-1','forager-catalyst-2'])
 const selected=setCivilizationFocus(reload(loaded),'settlement')!,short=advanceCivilization(selected,.1)
 expect(short.civilization!.activities.gathering.completions).toBe(20n)
 expect(reload(short).civilization!.activities.gathering.cycleReceipt!.inputs).toEqual({})
 const settled=advanceCivilization(short,1)
 expect(settled.civilization!.activities.gathering.completions).toBe(21n)
 expect(settled.civilization!.activities.gathering.cycleReceipt).toMatchObject({seconds:120})
 expect(settled.civilization!.activities.gathering.cycleReceipt!.legacyWorkMultiplier).toBeUndefined()
 expect(advanceCivilization(reload(settled),.001).challenges!.galvanizers).toBe(2n)
})
test('Growth then Travel retains paid work across switches/reloads and reaches the measured opening',()=>{
 let state=setCivilizationFocus(fresh(),'settlement')!
 state=advanceCivilization(state,600)
 const time=state.civilization!.elapsedSeconds,awards=state.challenges!.galvanizers,counts=Object.values(state.civilization!.activities).map(j=>j.completions)
 for(let n=0;n<100;n++)state=setCivilizationFocus(state,['balanced','provisioning','settlement','expeditions'][n%4])??state
 expect(state.civilization!.elapsedSeconds).toBe(time);expect(state.challenges!.galvanizers).toBe(awards)
 expect(Object.values(state.civilization!.activities).map(j=>j.completions)).toEqual(counts)
 state=setCivilizationFocus(reload(state),'settlement')!
 state=advanceCivilization(state,400);expect(state.civilization!.activities.campExpansion.completions).toBe(4n)
 state=setCivilizationFocus(reload(state),'expeditions')!
 expect(advanceCivilization(state,173).civilization!.awardedCatalystMilestoneIds).not.toContain('forager-catalyst-6')
 const done=advanceCivilization(state,174)
 expect(done.civilization!.awardedCatalystMilestoneIds).toHaveLength(6)
 expect(advanceCivilization(reload(done),.001).challenges!.galvanizers).toBe(6n)
 expect(validateCanonicalGameState(done)).toEqual({valid:true,errors:[]})
})
