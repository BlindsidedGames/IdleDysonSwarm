import { growForager } from '../../test/support/foragerPopulation'
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
import { buyCivilizationChieftain, setCivilizationChieftain, advanceCivilization, buyCivilizationHunting, allocateCivilizationWorkers, buyCivilizationHousing, civilizationSeason, setCivilizationFocus, equipCivilizationWorkers, civilizationEquipmentLabor, CIVILIZATION_ACTIVITIES, EMPTY_CIVILIZATION, civilizationSpeed, civilizationMilestoneProgress, hydrateCivilization, validateCivilization, validateCivilizationSave, nextCivilizationCatalyst, civilizationActivityInputs } from './civilization'
import type { CanonicalGameStateV1, CivilizationState } from '../game-state/types'
const prepared=createUnityFirstRunPreparedSave({startedAtUtc:'2026-10-08T00:00:00Z'}),session=hydrateGameState(prepared)
const fresh=():CanonicalGameStateV1=>({...session.state,dyson:{...session.state.dyson,goalStage:10n},meta:{...session.state.meta,reworkMigrationChoice:'keep'}})
const huntingStart=()=>buyCivilizationHunting(advanceCivilization(fresh(),400))!
function reload(state:CanonicalGameStateV1){return hydrateGameState(PreparedSave.fromDecoded(deserializeWebSave(serializeWebSave(dehydrateGameState(session,state).copyValidatedState())))).state}
function equivalent(a:CivilizationState,b:CivilizationState){expect(a.resources).toEqual(b.resources);expect(a.workers).toBe(b.workers);expect(a.equippedWorkers).toBe(b.equippedWorkers);expect(a.awardedCatalystMilestoneIds).toEqual(b.awardedCatalystMilestoneIds);for(const {id} of CIVILIZATION_ACTIVITIES){expect(a.activities[id].completions).toBe(b.activities[id].completions);expect(a.activities[id].workers).toBe(b.activities[id].workers);expect(a.activities[id].active).toBe(b.activities[id].active);expect(a.activities[id].progress).toBeCloseTo(b.activities[id].progress,6)}}
test('construction lifetime prices survive reload and paid receipts keep their quoted bill',()=>{
 const state=advanceCivilization(fresh(),500),c=state.civilization!,i=CIVILIZATION_ACTIVITIES.findIndex(a=>a.id==='shelterBuilding'),job=c.activities.shelterBuilding
 expect(civilizationActivityInputs(c,i,0n)).toEqual({food:40n,clothing:2n,tools:1n})
 expect(civilizationActivityInputs(c,i,10n).clothing).toBeGreaterThan(2n)
 const restored=reload(state).civilization!;expect(civilizationActivityInputs(restored,i)).toEqual(civilizationActivityInputs(c,i));if(job.active)expect(civilizationActivityInputs(c,i)).toEqual(job.cycleReceipt!.inputs)
})

test('large, irregular ticks and four hourly serialized saves conserve paid work and rewards',()=>{
 const large=advanceCivilization(huntingStart(),14400);let small=huntingStart(),elapsed=0,i=0
 while(elapsed<7200){const seconds=Math.min(7200-elapsed,[.2,1.7,37,13.1][i++%4]);small=advanceCivilization(small,seconds);elapsed+=seconds}
 equivalent(small.civilization!,advanceCivilization(huntingStart(),7200).civilization!)
 let hourly=huntingStart();for(let n=0;n<4;n++)hourly=reload(advanceCivilization(hourly,3600))
 equivalent(hourly.civilization!,large.civilization!);expect(hourly.challenges).toEqual(large.challenges)
},30000)

test('Leather remains housing stock and no automatic equipment consumes it',()=>{
 const state=advanceCivilization(growForager(fresh()),600),c=state.civilization!
 expect(c.equippedWorkers).toBe(0n)
 expect(CIVILIZATION_ACTIVITIES.reduce((n,_a,i)=>n+civilizationEquipmentLabor(c,i),0)).toBe(0)
 expect(equipCivilizationWorkers(state,1n)).toBeNull()
})

test('automatic awards have no resource debit and wallet-full receipts wait without loss',()=>{
 const base=growForager(fresh()),candidate={...base,civilization:{...base.civilization!,awardedCatalystMilestoneIds:[]},challenges:{...base.challenges!,galvanizers:0n}}
 const normal=advanceCivilization(base,.001),credited=advanceCivilization(candidate,.001)
 expect(credited.civilization!.resources).toEqual(normal.civilization!.resources);expect(credited.challenges!.galvanizers).toBe(6n)
 expect(advanceCivilization(reload(credited),.001).challenges!.galvanizers).toBe(6n)
 const full=advanceCivilization({...candidate,challenges:{...candidate.challenges,galvanizers:DISCRETE_MAXIMUM}},.001)
 expect(full.civilization!.awardedCatalystMilestoneIds).toEqual([])
 const room=advanceCivilization({...full,challenges:{...full.challenges!,galvanizers:DISCRETE_MAXIMUM-1n}},.001)
 expect(room.challenges!.galvanizers).toBe(DISCRETE_MAXIMUM);expect(room.civilization!.awardedCatalystMilestoneIds).toEqual(['forager-catalyst-1'])
})

test('only actual permanent skill-tree purchases add speed; saved wallet alone adds nothing',()=>{
 const start=growForager(fresh(),5n),speed=civilizationSpeed(start.civilization!,0,0)
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
 // Reload exercises receipt ownership through the challenge transition.
 const result=advanceCivilization(reload(entered.state),.25),after=result.civilization!.activities.gathering
 expect(after.progress-before.progress).toBeCloseTo(3*.25*(permanent?1.05:1),10)
 expect(after.cycleReceipt!.inputs).toEqual(before.cycleReceipt!.inputs)
 expect(result.challenges!.galvanizedSkillIds??[]).toEqual(permanent?['startHereTree']:[])
 expect(validateCanonicalGameState(result)).toEqual({valid:true,errors:[]})
 const abandoned=restartInfinityChallenge(result,'abandon',0n);if(!abandoned.ok)throw Error(abandoned.code)
 const resumed=advanceCivilization(abandoned.state,.25).civilization!.activities.gathering
 expect(resumed.progress-after.progress).toBeCloseTo(3*.25*(permanent?1.05:1),10)
})
test.each(['infinity','transcendence'] as const)('retains population, focus, paid recipes, gear and awards through %s',reset=>{
 const start=growForager(fresh()),state={...start,dyson:{...start.dyson,bots:OVERFLOW_BOT_CAP}},result=reset==='infinity'?applyCanonicalInfinityReset(state,{breakInfinity:false,requestedReward:0n,artifactSkillPoints:0n}):applyCanonicalOverflowReset(state)
 expect(result.ok).toBe(true);if(!result.ok)return;expect(result.state.civilization).toBe(state.civilization);expect(result.state.challenges!.galvanizers).toBe(state.challenges!.galvanizers);expect(validateCanonicalGameState(result.state).valid).toBe(true)
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
 const c=growForager(fresh()).civilization!
 for(const invalid of [{...c,equippedWorkers:c.workers+1n},{...c,workers:c.workers+1n},{...c,resources:{...c.resources,food:-1n}},{...c,activities:{...c.activities,hunting:{...c.activities.hunting,workers:c.workers+1n}}},{...c,activities:{...c.activities,hunting:{...c.activities.hunting,active:false,progress:1}}},{...c,awardedCatalystMilestoneIds:['unknown']}])expect(validateCivilization(invalid)).not.toBeNull()
})

test('population only grows from an affordable manual purchase and awards persist exactly once',()=>{
 const state=advanceCivilization(huntingStart(),7200),c=state.civilization!
 expect(c.workers).toBe(3n);expect(c.activities.shelterBuilding.completions).toBe(0n)
 const cost=civilizationActivityInputs(c,3)
 const bought=buyCivilizationHousing(state,'tent')!
 expect(bought).not.toBeNull();expect(bought.civilization!.workers).toBe(5n)
 expect(bought.civilization!.resources.shelters).toBe(2n)
 expect(bought.civilization!.resources.food).toBe(c.resources.food-cost.food!)
 expect(bought.challenges!.galvanizers).toBe(1n)
 expect(reload(advanceCivilization(bought,1)).challenges!.galvanizers).toBe(1n)
 expect(buyCivilizationHousing(bought,'camp')).toBeNull()
 expect(nextCivilizationCatalyst(bought.civilization!).requires).toEqual({population:10n})
 expect(civilizationMilestoneProgress(bought.civilization!,nextCivilizationCatalyst(bought.civilization!)).progress).toBe(.5)
})
test('camp purchase converts three tents without removing residents or automatically buying more',()=>{
 let state=huntingStart()
 for(let n=0;n<10000&&(state.civilization?.resources.shelters??0n)<3n;n++){state=advanceCivilization(state,10);state=buyCivilizationHousing(state,'tent')??state}
 for(let n=0;n<10000;n++){
  const bought=buyCivilizationHousing(state,'camp')
  if(bought){const c=state.civilization!,after=bought.civilization!;expect(after.workers).toBe(c.workers+3n);expect(after.resources.shelters).toBe(c.resources.shelters-3n);expect(after.resources.camps).toBe(c.resources.camps+1n);expect(reload(bought).civilization!.workers).toBe(after.workers);expect(advanceCivilization(bought,600).civilization!.workers).toBe(after.workers);return}
  state=advanceCivilization(state,10)
 }
 throw Error('Camp never became affordable')
})
test('seasonal paid outputs survive reload across every season',()=>{
 let state=huntingStart()
 const seen=new Set<string>()
 for(let n=0;n<7200;n++){
  state=advanceCivilization(state,1)
  const c=state.civilization!,season=civilizationSeason(c)
  for(const id of ['gathering','hunting'] as const){const job=c.activities[id];if(!job.active||job.progress>3)continue
   // Only newly admitted cycles: an earlier season keeps its own funded yield.
   expect(job.cycleReceipt!.outputs).toEqual(id==='gathering'?{food:{spring:4n,summer:3n,autumn:2n,winter:1n}[season],materials:{spring:3n,summer:5n,autumn:6n,winter:4n}[season]}:{food:{spring:6n,summer:3n,autumn:12n,winter:9n}[season],hides:{spring:2n,summer:1n,autumn:4n,winter:1n}[season]})
   seen.add(`${season}:${id}`)
  }
  if(n%600===0)state=reload(state)
 }
 expect(seen.size).toBe(8)
})

test('manual Hunting unlock costs one Tool once and preserves the production chain across reload',()=>{
 let state=advanceCivilization(fresh(),.001)
 expect(state.civilization!.resources).toEqual({...EMPTY_CIVILIZATION.resources,shelters:1n})
 const locked=advanceCivilization(state,1000)
 expect(locked.civilization!.activities.hunting).toMatchObject({active:false,completions:0n,workers:0n})
 expect(setCivilizationFocus(locked,'hunting')).toBeNull()
 const bought=buyCivilizationHunting(locked)!
 expect(bought.civilization!.resources.tools).toBe(locked.civilization!.resources.tools-1n)
 expect(buyCivilizationHunting(reload(bought))).toBeNull()
 const completed:string[]=[]
 for(let n=0;n<7200;n++){
  const before=state.civilization!;state=advanceCivilization(state,1);state=buyCivilizationHunting(state)??state;const c=state.civilization!
  for(const id of ['gathering','toolmaking','hunting','hideworking'])if(before.activities[id].completions===0n&&c.activities[id].completions>0n)completed.push(id)
  const working=Object.values(c.activities).filter(j=>j.workers>0n)
  expect(working.reduce((sum,job)=>sum+job.workers,0n)).toBe(3n)
  expect(c.workers).toBe(3n)
 }
 expect(completed).toEqual(['gathering','toolmaking','hunting','hideworking'])
 const produced=state.civilization!
 expect(produced.activities.hunting.completions).toBeGreaterThan(1n)
 expect(produced.resources.tools+4n*(produced.activities.hideworking.completions+BigInt(produced.activities.hideworking.active))).toBe(2n*produced.activities.toolmaking.completions-1n)
 const restored=advanceCivilization(reload(state),1000).civilization!
 expect(restored.resources.tools+4n*(restored.activities.hideworking.completions+BigInt(restored.activities.hideworking.active))).toBe(2n*restored.activities.toolmaking.completions-1n)
 expect(state.civilization!.resources.clothing).toBeGreaterThanOrEqual(2n)
 expect(buyCivilizationHousing(reload(state),'tent')!.civilization!.workers).toBe(5n)
 expect(setCivilizationFocus(state,'hunting')!.civilization!.priority).toBe('hunting')
})

test('legacy paid construction is refunded once; retained production and earned awards survive migration',()=>{
 const save=deserializeWebSave(readFileSync(new URL('../../test/fixtures/forager-v4-paid.websave.txt',import.meta.url),'utf8'))
 const raw=save.civilization as unknown as CivilizationState
 const loaded=hydrateGameState(PreparedSave.fromDecoded(save)).state,c=loaded.civilization!
 expect(c.foragerRulesVersion).toBe(2)
 expect(c.workers).toBe(raw.workers)
 expect(c.awardedCatalystMilestoneIds).toEqual(raw.awardedCatalystMilestoneIds)
 const removed=['shelterBuilding','campExpansion','foodPreservation','seasonalExpeditions','exchangeNetworks','campProvisioning','fishing','craftSpecialization']
 for(const resource of ['food','materials','tools','hides','clothing','provisions','shelters','camps'] as const){
  const refund=removed.reduce((n,id)=>n+(raw.activities[id].active?(raw.activities[id].cycleReceipt?.inputs[resource]??0n):0n),0n)
  expect(c.resources[resource]).toBe(raw.resources[resource]+refund)
 }
 expect(reload(loaded).civilization!.resources).toEqual(c.resources)
 expect(c.activities.gathering.active).toBe(true)
 for(const id of removed)expect(c.activities[id].active).toBe(false)
})

test('provisioning priority shares labour two to one even at three workers',()=>{
 for(const population of [3n,30n]){
  const base=population===3n?huntingStart():growForager(fresh(),population)
  const gathering=setCivilizationFocus(setCivilizationFocus(base,'hunting')!,'gathering')!
  const hunting=setCivilizationFocus(gathering,'hunting')!
  const rate=(state:typeof base,id:string)=>civilizationSpeed(state.civilization!,CIVILIZATION_ACTIVITIES.findIndex(a=>a.id===id),0)
  expect(rate(gathering,'gathering')).toBeCloseTo(2*rate(gathering,'hunting'))
  expect(rate(hunting,'hunting')).toBeCloseTo(2*rate(hunting,'gathering'))
  expect(rate(hunting,'hunting')).toBeGreaterThan(0)
  expect(rate(gathering,'toolmaking')).toBe(rate(hunting,'toolmaking'))
  const c=gathering.civilization!
  expect(Object.values(allocateCivilizationWorkers(c)).reduce((sum,n)=>sum+n,0n)).toBe(c.workers)
  const after=advanceCivilization(reload(hunting),10).civilization!
  for(const id of ['gathering','hunting'] as const)expect(Number(after.activities[id].completions)*CIVILIZATION_ACTIVITIES.find(a=>a.id===id)!.seconds*6+after.activities[id].progress).toBeGreaterThan(Number(c.activities[id].completions)*CIVILIZATION_ACTIVITIES.find(a=>a.id===id)!.seconds*6+c.activities[id].progress)
 }
})


test('Chieftain requires two retained camps, costs Tools and Game once and persists its toggle',()=>{
 const base=growForager(fresh(),30n),c=base.civilization!
 expect(buyCivilizationChieftain({...base,civilization:{...c,resources:{...c.resources,camps:1n}}})).toBeNull()
 const bought=buyCivilizationChieftain(base)!,after=bought.civilization!
 expect(after.workers).toBe(c.workers)
 expect(after.populationGranted).toBe(c.populationGranted)
 for(const [resource,cost] of [['tools',12n],['hides',6n]] as const){
  const inventory=(camp:CivilizationState)=>camp.resources[resource]+Object.values(camp.activities).reduce((sum,job)=>sum+(job.active?job.cycleReceipt?.inputs[resource]??0n:0n),0n)
  expect(inventory(after)).toBe(inventory(c)-cost)
 }
 expect(after.resources.camps).toBe(c.resources.camps)
 expect(after.awardedCatalystMilestoneIds).toEqual(c.awardedCatalystMilestoneIds)
 expect(buyCivilizationChieftain(reload(bought))).toBeNull()
 expect(setCivilizationFocus(bought,after.priority==='hunting'?'gathering':'hunting')).toBeNull()
 const off=setCivilizationChieftain(bought,false)!
 expect(reload(off).civilization!.chieftain?.enabled).toBe(false)
 const manual=setCivilizationFocus(off,after.priority==='hunting'?'gathering':'hunting')!
 expect(advanceCivilization(manual,700).civilization!.priority).toBe(manual.civilization!.priority)
 expect(setCivilizationChieftain(manual,true)!.civilization!.workers).toBe(after.workers)
})

test('Chieftain responds to growth shortages and seasonal food efficiency without buying housing',()=>{
 const base=growForager(fresh(),30n),c=base.civilization!
 for(const [season,missing,expected] of [[0,'materials','gathering'],[0,'hides','hunting'],[0,'tools','toolmaking'],[0,'clothing','hideworking'],[0,'food','gathering'],[1800,'food','hunting']] as const){
  const candidate={...base,civilization:{...c,elapsedSeconds:season,nextEquipmentSeconds:season,priority:expected==='hunting'?'gathering' as const:'hunting' as const,chieftain:{enabled:false,nextDecisionSeconds:season,costVersion:2 as const},activities:Object.fromEntries(Object.entries(c.activities).map(([id,job])=>[id,{...EMPTY_CIVILIZATION.activities[id],completions:job.completions}])),resources:{...c.resources,food:100000n,materials:100000n,tools:100000n,hides:100000n,clothing:100000n,[missing]:0n,...(missing==='materials'?{tools:0n,clothing:0n}:missing==='hides'||missing==='tools'?{clothing:0n}:{})}}}
  const result=setCivilizationChieftain(candidate,true)!
  expect(expected==='toolmaking'||expected==='hideworking'?result.civilization!.craftPriority:result.civilization!.priority).toBe(expected)
  expect(result.civilization!.resources.shelters).toBe(c.resources.shelters)
  expect(result.civilization!.resources.camps).toBe(c.resources.camps)
 }
})

test('Chieftain calendar decisions conserve production across split ticks and saved reloads',()=>{
 const base=buyCivilizationChieftain(growForager(fresh(),30n))!
 const whole=advanceCivilization(base,2400)
 let split=base
 for(let n=0;n<80;n++)split=reload(advanceCivilization(advanceCivilization(split,7),23))
 equivalent(split.civilization!,whole.civilization!)
 expect(split.civilization!.chieftain).toEqual(whole.civilization!.chieftain)
 expect(split.civilization!.priority).toBe(whole.civilization!.priority)
 expect(split.civilization!.craftPriority).toBe(whole.civilization!.craftPriority)
})


test('independent Provisioning and Craft priorities persist and conserve each groups labour',()=>{
 const base=growForager(fresh(),30n),c=base.civilization!
 let state={...base,civilization:{...c,resources:{...c.resources,food:10000n,materials:10000n,hides:10000n,tools:10000n}}}
 const rate=(id:string)=>civilizationSpeed(state.civilization,CIVILIZATION_ACTIVITIES.findIndex(a=>a.id===id),0)
 for(const selected of ['hunting','toolmaking','hideworking','gathering'] as const){
  state=setCivilizationFocus(state,selected)! as typeof state
  expect(rate(state.civilization.priority==='hunting'?'hunting':'gathering')).toBeCloseTo(2*rate(state.civilization.priority==='hunting'?'gathering':'hunting'))
  expect(rate(state.civilization.craftPriority??'hideworking')).toBeCloseTo(2*rate(state.civilization.craftPriority==='toolmaking'?'hideworking':'toolmaking'))
  expect(rate('gathering')+rate('hunting')).toBeCloseTo(Number(c.workers)/2)
  expect(rate('toolmaking')+rate('hideworking')).toBeCloseTo(Number(c.workers)/2)
  state=reload(state) as typeof state
  expect(selected==='toolmaking'||selected==='hideworking'?state.civilization.craftPriority:state.civilization.priority).toBe(selected)
 }
})

test('old population-priced Chieftain refunds three residents only once on reload',()=>{
 const owned=buyCivilizationChieftain(growForager(fresh(),30n))!,c=owned.civilization!
 const legacy={...owned,civilization:{...c,workers:c.workers-3n,populationGranted:c.populationGranted-3n,chieftain:{enabled:c.chieftain!.enabled,nextDecisionSeconds:c.chieftain!.nextDecisionSeconds}}}
 const preparedLegacy={...legacy,civilization:{...legacy.civilization,activities:Object.fromEntries(Object.entries(legacy.civilization.activities).map(([id,job])=>[id,{...job,workers:0n}]))}}
 const restored=reload(preparedLegacy)
 expect(restored.civilization!.workers).toBe(c.workers)
 expect(reload(restored).civilization!.workers).toBe(c.workers)
 expect(restored.civilization!.resources).toEqual(c.resources)
})
