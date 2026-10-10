import { advanceFarming, finishForagerHandoff, validateFarming } from './farming'
import type { CanonicalGameStateV1, CivilizationState, CivilizationResource, CivilizationFocus, CivilizationActivityState } from '../game-state/types'
import { addDiscrete, DISCRETE_MAXIMUM, bitIncrement, bitDecrement } from './numeric'
import { permanentFractureCount } from './galvanization'
import { EMPTY_INFINITY_CHALLENGES } from './infinityChallenges'
import { getGameAssetsByKind } from '../game-data/catalog'
import { SKILL_DEFINITION_ASSET_KIND } from '../game-data/runtimeAssetKinds'
import { CIVILIZATION_TUNING, CIVILIZATION_STARTER_KIT, CIVILIZATION_FOCUS_TUNING } from './civilizationTuning'
export { CIVILIZATION_TUNING } from './civilizationTuning'
export type { CivilizationResource, CivilizationFocus } from '../game-state/types'
export type CivilizationRecipe = Partial<Record<CivilizationResource, bigint>>
export type CivilizationSection = 'provisioning' | 'craft' | 'settlement' | 'expeditions'
export type CivilizationActivityId = 'gathering'|'toolmaking'|'hunting'|'shelterBuilding'|'hideworking'|'foodPreservation'|'campExpansion'|'seasonalExpeditions'|'exchangeNetworks'|'campProvisioning'|'fishing'|'craftSpecialization'
interface Activity { id: CivilizationActivityId; section: CivilizationSection; seconds:number; inputs:CivilizationRecipe; outputs:CivilizationRecipe; requires:Readonly<Record<string,bigint>>; weight:bigint; populationDelta:bigint; retired?:boolean }
export const CIVILIZATION_ACTIVITIES: readonly Activity[] = [
  {id:'gathering',section:'provisioning',seconds:20,inputs:{},outputs:{food:1n,materials:3n},requires:{},weight:12n,populationDelta:0n},
  {id:'toolmaking',section:'craft',seconds:40,inputs:{materials:2n},outputs:{tools:2n},requires:{gathering:2n},weight:6n,populationDelta:0n},
  {id:'hunting',section:'provisioning',seconds:60,inputs:{},outputs:{food:10n,hides:2n},requires:{toolmaking:1n},weight:5n,populationDelta:0n},
  {id:'shelterBuilding',section:'settlement',seconds:30,inputs:{food:6n,materials:18n,hides:2n,tools:1n},outputs:{shelters:1n},requires:{gathering:1n},weight:5n,populationDelta:2n},
  {id:'hideworking',section:'craft',seconds:80,inputs:{hides:2n,materials:1n},outputs:{clothing:1n},requires:{hunting:2n,shelterBuilding:1n},weight:4n,populationDelta:0n},
  {id:'foodPreservation',section:'expeditions',seconds:60,inputs:{food:20n},outputs:{provisions:2n},requires:{hunting:2n,shelterBuilding:1n},weight:4n,populationDelta:0n},
  {id:'campExpansion',section:'settlement',seconds:60,inputs:{shelters:3n,food:12n,materials:72n,tools:2n},outputs:{camps:1n},requires:{shelterBuilding:3n,hideworking:1n},weight:4n,populationDelta:3n},
  {id:'seasonalExpeditions',section:'expeditions',seconds:180,inputs:{provisions:4n},outputs:{materials:4n,hides:6n},requires:{foodPreservation:2n,hideworking:2n,campExpansion:1n},weight:3n,populationDelta:0n},
  {id:'exchangeNetworks',section:'expeditions',seconds:240,inputs:{provisions:6n,clothing:1n,hides:12n},outputs:{materials:120n},requires:{seasonalExpeditions:2n,campExpansion:1n},weight:2n,populationDelta:0n},
  // Removed activities exist only to settle a previously paid receipt once.
  {id:'campProvisioning',section:'settlement',seconds:90,inputs:{food:8n},outputs:{},requires:{},weight:2n,populationDelta:1n,retired:true},
  {id:'fishing',section:'provisioning',seconds:60,inputs:{food:1n,tools:1n},outputs:{food:8n},requires:{},weight:2n,populationDelta:0n,retired:true},
  {id:'craftSpecialization',section:'craft',seconds:180,inputs:{provisions:1n,materials:4n},outputs:{tools:3n},requires:{},weight:4n,populationDelta:0n,retired:true},
]
export const CIVILIZATION_SECTIONS: readonly CivilizationSection[] = ['provisioning','settlement','craft','expeditions']
export const CIVILIZATION_FOCUSES: readonly CivilizationFocus[] = ['balanced','provisioning','settlement','expeditions']
export const CIVILIZATION_RESOURCES: readonly CivilizationResource[] = ['food','materials','tools','hides','clothing','provisions','shelters','camps']
export const CIVILIZATION_EQUIPMENT_COST: CivilizationRecipe = Object.freeze({tools:2n,clothing:1n})
export const CIVILIZATION_CATALYST_MILESTONES = [
  {id:'forager-catalyst-1',name:'firstHunt',requires:{hunting:1n}},
  {id:'forager-catalyst-2',name:'establishedCamp',requires:{hunting:1n,shelterBuilding:2n}},
  {id:'forager-catalyst-3',name:'establishedCamp',requires:{hideworking:2n,foodPreservation:2n}},
  {id:'forager-catalyst-4',name:'exchangeRoutes',requires:{campExpansion:1n,seasonalExpeditions:2n}},
  {id:'forager-catalyst-5',name:'exchangeRoutes',requires:{campExpansion:2n,exchangeNetworks:1n}},
  {id:'forager-catalyst-6',name:'exchangeRoutes',requires:{campExpansion:4n,seasonalExpeditions:8n,exchangeNetworks:5n}},
] as const
export interface CivilizationCatalystMilestone {readonly id:string;readonly name:'firstHunt'|'establishedCamp'|'exchangeRoutes'|'continuedDevelopment';readonly ordinal?:number;readonly requires:Readonly<Record<string,bigint>>}
// 65 awards are representable; the genuine next goal 66 exceeds Int64.
export function civilizationCatalystMilestone(ordinal:number):CivilizationCatalystMilestone {
  if(!Number.isInteger(ordinal)||ordinal<1||ordinal>66)throw Error('Invalid Civilization milestone ordinal.')
  if(ordinal<=6)return {...CIVILIZATION_CATALYST_MILESTONES[ordinal-1],ordinal}
  const factor=1n<<BigInt(ordinal-6)
  return {id:`forager-catalyst-${ordinal}`,name:'continuedDevelopment',ordinal,requires:{campExpansion:4n*factor,seasonalExpeditions:8n*factor,exchangeNetworks:5n*factor}}
}
const validAwardId=(id:string)=>/^forager-catalyst-([1-9]|[1-5][0-9]|6[0-5])$/.test(id)
const entries=(recipe:CivilizationRecipe)=>Object.entries(recipe) as [CivilizationResource,bigint][]
const requirementsMet=(c:Readonly<CivilizationState>,r:Readonly<Record<string,bigint>>)=>Object.entries(r).every(([id,n])=>c.activities[id].completions>=n)
export const EMPTY_CIVILIZATION:Readonly<CivilizationState>=Object.freeze({version:4,focusBalanceVersion:2,unlocked:false,focus:'balanced',workers:CIVILIZATION_TUNING.initialHousing,equippedWorkers:0n,populationBaseline:CIVILIZATION_TUNING.initialHousing,populationGranted:0n,elapsedSeconds:0,nextEquipmentSeconds:0,supplyHold:Object.freeze({}),
 activities:Object.freeze(Object.fromEntries(CIVILIZATION_ACTIVITIES.map(({id})=>[id,Object.freeze({completions:0n,progress:0,active:false,workers:0n})]))),resources:Object.freeze(Object.fromEntries(CIVILIZATION_RESOURCES.map(id=>[id,0n])) as Record<CivilizationResource,bigint>),awardedCatalystMilestoneIds:Object.freeze([])})
export function civilizationAvailable(state:Readonly<CanonicalGameStateV1>):boolean{return state!==undefined}
export function civilizationActivityUnlocked(c:Readonly<CivilizationState>,index:number):boolean {
 const a=CIVILIZATION_ACTIVITIES[index]
 return c.unlocked && (a.retired ? c.activities[a.id].active : (c.legacyUnlockedActivityIds?.includes(a.id)===true||requirementsMet(c,a.requires)))
}
export function civilizationAvailableWorkers(c:Readonly<CivilizationState>):bigint{return c.workers-Object.values(c.activities).reduce((n,a)=>n+a.workers,0n)}
export function civilizationHousing(c:Readonly<CivilizationState>):bigint {
 const reserved=c.activities.campExpansion.active?(c.activities.campExpansion.cycleReceipt?.inputs.shelters??c.activities.campExpansion.legacyCycle?.inputs.shelters??3n):0n
 return addDiscrete(c.populationBaseline,(c.resources.shelters+reserved)*CIVILIZATION_TUNING.shelterHousing+c.resources.camps*CIVILIZATION_TUNING.campHousing)
}
const boundedPrice=(value:number):bigint=>value>=Number(DISCRETE_MAXIMUM)?DISCRETE_MAXIMUM:BigInt(Math.ceil(value-1e-10))
export function civilizationActivityInputs(c:Readonly<CivilizationState>,index:number,ordinal?:bigint):CivilizationRecipe {
 const a=CIVILIZATION_ACTIVITIES[index],job=c.activities[a.id]
 if(ordinal===undefined && job.active)return civilizationCycle(c,index).inputs
 if(a.id!=='shelterBuilding'&&a.id!=='campExpansion')return a.inputs
 const factor=(1+(a.id==='shelterBuilding'?CIVILIZATION_TUNING.shelterSlope:CIVILIZATION_TUNING.campSlope)*Number(ordinal??job.completions))**CIVILIZATION_TUNING.pricePower
 return Object.fromEntries(entries(a.inputs).map(([id,n])=>[id,id==='shelters'?n:boundedPrice(Number(n)*(id==='tools'?Math.sqrt(factor):factor))]))
}
const workMultiplier=(c:Readonly<CivilizationState>)=>c.focusBalanceVersion===2?CIVILIZATION_FOCUS_TUNING.workMultiplier:CIVILIZATION_TUNING.workMultiplier
export function civilizationCycle(c:Readonly<CivilizationState>,index:number) {
 const a=CIVILIZATION_ACTIVITIES[index],job=c.activities[a.id]
 return job.cycleReceipt??(job.legacyCycle?{...job.legacyCycle,populationDelta:a.id==='campProvisioning'?1n:0n}:{...a,seconds:a.seconds*workMultiplier(c),inputs:civilizationActivityInputs(c,index,job.completions)})
}
export function nextCivilizationCatalyst(c:Readonly<CivilizationState>):CivilizationCatalystMilestone {
 let n=1;while(n<66&&c.awardedCatalystMilestoneIds.includes(`forager-catalyst-${n}`))n++;return civilizationCatalystMilestone(n)
}
export function civilizationOpeningComplete(c:Readonly<CivilizationState>):boolean{return requirementsMet(c,CIVILIZATION_CATALYST_MILESTONES[5].requires)}
export function civilizationExpeditionTarget(c:Readonly<CivilizationState>):bigint {const n=nextCivilizationCatalyst(c).requires.seasonalExpeditions??0n;return n>2n?n:2n}
const indexOf=(id:string)=>CIVILIZATION_ACTIVITIES.findIndex(a=>a.id===id)
function campPriority(c:Readonly<CivilizationState>):boolean{return civilizationActivityUnlocked(c,indexOf('campExpansion'))&&c.resources.shelters>=3n&&!c.activities.campExpansion.active}
function target(c:Readonly<CivilizationState>,id:string):bigint|undefined {
 const missing=c.workers/CIVILIZATION_TUNING.equipmentPopulationDivisor>c.equippedWorkers?c.workers/CIVILIZATION_TUNING.equipmentPopulationDivisor-c.equippedWorkers:0n
 if(id==='toolmaking')return civilizationActivityInputs(c,indexOf('shelterBuilding'),c.activities.shelterBuilding.completions+BigInt(c.activities.shelterBuilding.active)).tools!+civilizationActivityInputs(c,indexOf('campExpansion'),c.activities.campExpansion.completions+BigInt(c.activities.campExpansion.active)).tools!+2n*missing+4n
 if(id==='hideworking')return missing+3n
 if(id==='foodPreservation')return 20n
}
function updateHolds(c:MutableCivilization) {
 for(const [id,resource] of [['toolmaking','tools'],['hideworking','clothing'],['foodPreservation','provisions']] as const){const high=target(c,id)!;if(c.resources[resource]>=high)c.supplyHold[id]=true;else if(c.resources[resource]<=high*CIVILIZATION_TUNING.stockResumeNumerator/CIVILIZATION_TUNING.stockResumeDenominator)c.supplyHold[id]=false}
}
function eligibility(c:Readonly<CivilizationState>,index:number):{reason:'housing'|'inputs'|'range'|'running'|'demand';missing:readonly CivilizationResource[]} {
 const a=CIVILIZATION_ACTIVITIES[index],job=c.activities[a.id],cycle=civilizationCycle(c,index)
 if(job.active)return {reason:entries(cycle.outputs).some(([id,n])=>c.resources[id]>DISCRETE_MAXIMUM-n)||c.workers>DISCRETE_MAXIMUM-cycle.populationDelta?'range':'running',missing:[]}
 if(a.retired||c.supplyHold[a.id]||(a.id==='seasonalExpeditions'&&job.completions>=civilizationExpeditionTarget(c))||(a.id==='shelterBuilding'&&campPriority(c)))return {reason:'demand',missing:[]}
 const cost=civilizationActivityInputs(c,index),missing=entries(cost).filter(([id,n])=>c.resources[id]<n).map(([id])=>id)
 if(missing.length)return {reason:'inputs',missing}
 if(a.id==='foodPreservation'&&civilizationActivityUnlocked(c,indexOf('shelterBuilding'))){let floor=civilizationActivityInputs(c,indexOf('shelterBuilding'),c.activities.shelterBuilding.completions+BigInt(c.activities.shelterBuilding.active)).food!;if(campPriority(c)){const bill=civilizationActivityInputs(c,indexOf('campExpansion')).food!;if(bill>floor)floor=bill}if(c.resources.food-cost.food!<floor)return {reason:'housing',missing:[]}}
 const pending=Object.entries(c.activities).reduce((sum,[id,j])=>sum+(j.active?civilizationCycle(c,indexOf(id)).populationDelta:0n),0n)
 if(c.workers+pending>DISCRETE_MAXIMUM-a.populationDelta||entries(cycle.outputs).some(([id,n])=>c.resources[id]>DISCRETE_MAXIMUM-n)||job.completions===DISCRETE_MAXIMUM)return {reason:'range',missing:[]}
 return {reason:'running',missing:[]}
}
export function civilizationJobWaiting(c:Readonly<CivilizationState>,index:number) {
 const status=eligibility(c,index),a=CIVILIZATION_ACTIVITIES[index]
 if(status.reason!=='running')return status
 return c.activities[a.id].workers<(a.id==='campExpansion'?CIVILIZATION_TUNING.campMinimumCrew:1n)?{reason:'workers' as const,missing:[]}:status
}
const FOUNDATIONAL=['toolmaking','gathering','shelterBuilding','hunting','hideworking','foodPreservation','campExpansion','seasonalExpeditions','exchangeNetworks','campProvisioning','fishing','craftSpecialization']
const FOCUS_SUPPORT:Partial<Record<CivilizationFocus,readonly string[]>>={settlement:['gathering','hunting','toolmaking'],expeditions:['hunting','hideworking']}
export function allocateCivilizationWorkers(c:Readonly<CivilizationState>):Record<string,bigint> {
 const crews=Object.fromEntries(CIVILIZATION_ACTIVITIES.map(a=>[a.id,0n]));if(!c.unlocked)return crews
 const eligible=CIVILIZATION_ACTIVITIES.map((a,i)=>({a,i,weight:a.weight*(c.focus===a.section?4n:FOCUS_SUPPORT[c.focus]?.includes(a.id)?3n:2n)})).filter(({i,a})=>civilizationActivityUnlocked(c,i)&&(c.activities[a.id].active||(!c.farming&&eligibility(c,i).reason==='running')))
 let remaining=c.workers
 for(const id of FOUNDATIONAL){const need=id==='campExpansion'?CIVILIZATION_TUNING.campMinimumCrew:1n;if(remaining>=need&&eligible.some(r=>r.a.id===id)){crews[id]+=need;remaining-=need}}
 if(!remaining||!eligible.length)return crews
 const total=eligible.reduce((n,r)=>n+r.weight,0n),fractions=eligible.map(r=>{const numerator=remaining*r.weight;crews[r.a.id]+=numerator/total;return {...r,fraction:numerator%total}})
 let spare=c.workers-Object.values(crews).reduce((n,v)=>n+v,0n)
 fractions.sort((a,b)=>a.fraction===b.fraction?a.i-b.i:a.fraction>b.fraction?-1:1)
 for(const r of fractions)if(spare>0n){crews[r.a.id]++;spare--}return crews
}
export function civilizationEquipmentLabor(c:Readonly<CivilizationState>,index:number):number {
 const id=CIVILIZATION_ACTIVITIES[index].id;if(!['gathering','hunting','fishing'].includes(id)||!c.activities[id].active)return 0
 const field=['gathering','hunting','fishing'].reduce((n,id)=>n+(c.activities[id].active?c.activities[id].workers:0n),0n)
 return field?Number(c.equippedWorkers<field?c.equippedWorkers:field)*CIVILIZATION_TUNING.equipmentLabor*Number(c.activities[id].workers)/Number(field):0
}
export function civilizationSpeed(c:Readonly<CivilizationState>,index:number,fractures:number):number {
 const a=CIVILIZATION_ACTIVITIES[index],workers=c.activities[a.id].workers
 if(a.id==='campExpansion'&&workers<CIVILIZATION_TUNING.campMinimumCrew)return 0
 const historical=c.focusBalanceVersion!==2||c.activities[a.id].legacyCycle!==undefined||c.activities[a.id].cycleReceipt?.legacyWorkMultiplier===1
 const focusRate=historical?1:c.focus===a.section?CIVILIZATION_FOCUS_TUNING.selectedRate:FOCUS_SUPPORT[c.focus]?.includes(a.id)?CIVILIZATION_FOCUS_TUNING.supportRate:1
 return (Number(workers)+civilizationEquipmentLabor(c,index))*(1+fractures*CIVILIZATION_TUNING.speedPerFracture)*focusRate
}
export function civilizationLogProgress(current:number,target:number):number {if(!Number.isFinite(target)||target<=0||Number.isNaN(current)||current<=0)return 0;if(current>=target)return 1;return Math.max(0,Math.min(1,Math.log1p(current)/Math.log1p(target)))}
export function civilizationMilestoneProgress(c:Readonly<CivilizationState>,m:CivilizationCatalystMilestone) {
 const complete=requirementsMet(c,m.requires),steps=Object.entries(m.requires).map(([id,target])=>{const j=c.activities[id];return {id:id as CivilizationActivityId,target,current:Number(j.completions)+Math.min(1-1e-9,j.progress/civilizationCycle(c,indexOf(id)).seconds),completed:j.completions}})
 const progress=Math.min(...steps.map(s=>civilizationLogProgress(s.current,Number(s.target))))
 return {complete,progress:complete?1:Math.min(1-1e-9,progress),steps}
}
type MutableJob={-readonly [K in keyof CivilizationActivityState]:CivilizationActivityState[K]}
type MutableCivilization=Omit<CivilizationState,'activities'|'resources'|'supplyHold'|'awardedCatalystMilestoneIds'|'workers'|'equippedWorkers'|'elapsedSeconds'|'nextEquipmentSeconds'|'populationGranted'|'unlocked'> & {activities:Record<string,MutableJob>;resources:Record<CivilizationResource,bigint>;supplyHold:Record<string,boolean>;awardedCatalystMilestoneIds:string[];workers:bigint;equippedWorkers:bigint;elapsedSeconds:number;nextEquipmentSeconds:number;populationGranted:bigint;unlocked:boolean}
function clone(c:Readonly<CivilizationState>):MutableCivilization{return {...c,activities:Object.fromEntries(Object.entries(c.activities).map(([id,j])=>[id,{...j,...(j.cycleReceipt?{cycleReceipt:{...j.cycleReceipt}}:{})}])),resources:{...c.resources},supplyHold:{...c.supplyHold},awardedCatalystMilestoneIds:[...c.awardedCatalystMilestoneIds]}}
function normalize(c:MutableCivilization,state:CanonicalGameStateV1,fractures:number):CanonicalGameStateV1 {
 for(const [i,a] of CIVILIZATION_ACTIVITIES.entries()){
  const job=c.activities[a.id],r=job.cycleReceipt;if(!job.active||!r)continue
  if(r.finishAt!==undefined&&r.finishAt<=c.elapsedSeconds){job.progress=r.seconds;const settled={...r,rate:0,remainingWork:0};delete settled.finishAt;job.cycleReceipt=settled}
  else if(r.finishAt!==undefined)job.progress=Math.max(0,Math.min(bitDecrement(r.seconds),r.seconds-(r.finishAt-c.elapsedSeconds)*r.rate))
  if(job.progress<r.seconds||eligibility(c,i).reason==='range')continue
  for(const [id,n] of entries(r.outputs))c.resources[id]+=n
  c.workers+=r.populationDelta;c.populationGranted+=r.populationDelta;job.completions=addDiscrete(job.completions,1n);job.progress=0;job.active=false;delete job.cycleReceipt;delete job.legacyCycle
 }
 let challenges=state.challenges??EMPTY_INFINITY_CHALLENGES
 for(let n=1;n<=65;n++){const m=civilizationCatalystMilestone(n);if(n>6&&!requirementsMet(c,m.requires))break;if(!c.awardedCatalystMilestoneIds.includes(m.id)&&requirementsMet(c,m.requires)&&challenges.galvanizers<DISCRETE_MAXIMUM){c.awardedCatalystMilestoneIds.push(m.id);challenges={...challenges,galvanizers:challenges.galvanizers+1n,hasEarnedGalvanizer:true,unlocked:true}}}
 if(!c.farming&&c.elapsedSeconds>=c.nextEquipmentSeconds){const missing=c.workers/CIVILIZATION_TUNING.equipmentPopulationDivisor>c.equippedWorkers?c.workers/CIVILIZATION_TUNING.equipmentPopulationDivisor-c.equippedWorkers:0n,count=[missing,c.resources.tools/2n,c.resources.clothing].reduce((a,b)=>a<b?a:b);c.equippedWorkers+=count;c.resources.tools-=count*2n;c.resources.clothing-=count;c.nextEquipmentSeconds+=CIVILIZATION_TUNING.equipmentInterval}
 for(let pass=0;!c.farming&&pass<=CIVILIZATION_ACTIVITIES.length;pass++){
  updateHolds(c);const crews=allocateCivilizationWorkers(c);for(const [id,n] of Object.entries(crews))c.activities[id].workers=n
  let admitted=false
  for(const [i,a] of CIVILIZATION_ACTIVITIES.entries()){const j=c.activities[a.id];if(j.active||!civilizationActivityUnlocked(c,i)||civilizationJobWaiting(c,i).reason!=='running')continue
   const cost=civilizationActivityInputs(c,i);for(const [id,n] of entries(cost))c.resources[id]-=n
   j.active=true;j.cycleReceipt={seconds:a.seconds*workMultiplier(c),inputs:{...cost},outputs:{...a.outputs},populationDelta:a.populationDelta,rate:0,remainingWork:a.seconds*workMultiplier(c)};admitted=true
  }
  if(!admitted)break
 }
 const crews=allocateCivilizationWorkers(c);for(const [id,n] of Object.entries(crews))c.activities[id].workers=n
 for(const [i,a] of CIVILIZATION_ACTIVITIES.entries()){const j=c.activities[a.id],r=j.cycleReceipt;if(!j.active||!r||j.progress>=r.seconds)continue;const rate=civilizationSpeed(c,i,fractures);if(rate===r.rate)continue
  const remaining=r.finishAt!==undefined&&r.rate>0?(r.finishAt-c.elapsedSeconds)*r.rate:r.remainingWork
  const due=rate>0?c.elapsedSeconds+remaining/rate:undefined
  const paid={...r,remainingWork:remaining,rate};if(due===undefined)delete paid.finishAt;else paid.finishAt=due<=c.elapsedSeconds?bitIncrement(c.elapsedSeconds):due;j.cycleReceipt=paid
 }
 return {...state,civilization:c,challenges}
}
/** Transfer changes crew ownership without consuming time or admitting new work. */
export function settleForagerHandoff(state:CanonicalGameStateV1):CanonicalGameStateV1 {
 const c=clone(state.civilization!)
 const result=normalize(c,state,permanentFractureCount(state))
 return Object.values(c.activities).some(j=>j.active)?result:finishForagerHandoff(result)
}
/** Paid receipts and their absolute deadlines survive call partitions/reloads.
 * Every completion settles before awards, automatic kits and new admissions. */
export function advanceCivilization(state:CanonicalGameStateV1,seconds:number):CanonicalGameStateV1 {
 if(state.meta.reworkMigrationChoice===undefined||!Number.isFinite(seconds)||seconds<=0)return state
 if(state.civilization?.farming&&state.civilization.farming.phase!=='settling-forager')return advanceFarming(state,seconds)
 const source=state.civilization??EMPTY_CIVILIZATION,c=clone(source)
 let end=c.elapsedSeconds+seconds
 if(!Number.isFinite(end)||end<=c.elapsedSeconds)return state
 if(!c.unlocked){for(const [id,n] of entries(CIVILIZATION_STARTER_KIT))c.resources[id]+=n;c.unlocked=true}
 const fractures=permanentFractureCount(state)
 let result=normalize(c,state,fractures)
 while(c.elapsedSeconds<end){if(c.farming&&!Object.values(c.activities).some(j=>j.active))return advanceFarming(finishForagerHandoff(result),end-c.elapsedSeconds);const due=Object.values(c.activities).filter(j=>j.active&&j.progress<j.cycleReceipt!.seconds).map(j=>j.cycleReceipt!.finishAt??Infinity)
  // Detached decimal ticks can finish a few floating-point units short of a
  // funded deadline. Settle that roundoff without changing Farming's clock.
  if(!c.farming&&c.focusBalanceVersion===2){const tolerance=256*Number.EPSILON*Math.max(1,Math.abs(end));const near=[...due,c.nextEquipmentSeconds].filter(t=>t>end&&t-end<=tolerance);if(near.length)end=Math.min(...near)}
  const next=Math.min(end,c.farming?Infinity:c.nextEquipmentSeconds,...due);if(next<=c.elapsedSeconds)throw Error('Civilization clock precision exhausted.');c.elapsedSeconds=next;result=normalize(c,result,fractures)}
 return c.farming&&!Object.values(c.activities).some(j=>j.active)?finishForagerHandoff(result):result
}
export function setCivilizationFocus(state:CanonicalGameStateV1,focus:string):CanonicalGameStateV1|null {
 if(state.civilization?.farming||!CIVILIZATION_FOCUSES.includes(focus as CivilizationFocus)||state.meta.reworkMigrationChoice===undefined)return null
 const source=state.civilization??EMPTY_CIVILIZATION;if(source.focus===focus)return null
 const c=clone({...source,focus:focus as CivilizationFocus})
 return c.unlocked?normalize(c,state,permanentFractureCount(state)):{...state,civilization:c}
}
export function civilizationEquippableWorkers(c:Readonly<CivilizationState>):bigint {const missing=c.workers/CIVILIZATION_TUNING.equipmentPopulationDivisor>c.equippedWorkers?c.workers/CIVILIZATION_TUNING.equipmentPopulationDivisor-c.equippedWorkers:0n;return [missing,c.resources.tools/2n,c.resources.clothing].reduce((a,b)=>a<b?a:b)}
/** Old clients cannot buy extra kits outside the automatic equipment calendar. */
export function equipCivilizationWorkers(_state:CanonicalGameStateV1,_count:bigint=1n):CanonicalGameStateV1|null{return null}
const discrete=(v:unknown):v is bigint=>typeof v==='bigint'&&v>=0n&&v<=DISCRETE_MAXIMUM
const recipeValid=(r:unknown):r is CivilizationRecipe=>!!r&&typeof r==='object'&&!Array.isArray(r)&&Object.entries(r).every(([id,n])=>CIVILIZATION_RESOURCES.includes(id as CivilizationResource)&&discrete(n))
const OLD_IDS=['gathering','toolmaking','hunting','campProvisioning','shelterBuilding','hideworking','fishing','foodPreservation','seasonalExpeditions','campExpansion','craftSpecialization','exchangeNetworks'] as const
const OLD_SECONDS=[20,40,60,90,120,80,60,70,180,240,100,180]
const V3_REQUIREMENTS:Readonly<Record<string,bigint>>[]=[{},{gathering:2n},{toolmaking:1n},{hunting:1n},{campProvisioning:1n},{hunting:2n,toolmaking:3n},{toolmaking:4n,gathering:12n},{hunting:3n,campProvisioning:1n},{foodPreservation:3n,hideworking:2n,shelterBuilding:1n},{shelterBuilding:3n,campProvisioning:4n},{toolmaking:12n,hideworking:3n},{seasonalExpeditions:3n,campExpansion:2n,craftSpecialization:3n}]
const V3_SECONDS=[20,40,60,90,180,100,60,100,300,360,180,480]
const OLD_INPUTS:CivilizationRecipe[]=[{},{food:2n,materials:2n},{food:1n,tools:1n},{food:8n},{food:6n,materials:6n,tools:2n},{food:2n,hides:3n,tools:1n},{food:1n,tools:1n},{food:6n},{provisions:2n,clothing:1n,tools:2n},{food:12n,materials:8n,shelters:3n,tools:3n},{provisions:1n,materials:4n},{food:10n,hides:2n,clothing:1n}]
const OLD_OUTPUTS:CivilizationRecipe[]=[{food:4n,materials:2n},{tools:1n},{food:10n,hides:2n},{},{shelters:1n},{clothing:1n},{food:8n},{provisions:1n},{materials:12n,hides:6n},{camps:1n},{tools:3n},{provisions:3n,tools:1n}]
const V3_INPUTS=OLD_INPUTS.map(r=>({...r}));V3_INPUTS[1]={food:3n,materials:2n};V3_INPUTS[7]={food:10n}
const V3_OUTPUTS=OLD_OUTPUTS.map(r=>({...r}));V3_OUTPUTS[1]={tools:2n};V3_OUTPUTS[7]={provisions:2n}
const recipeEqual=(a:CivilizationRecipe,b:CivilizationRecipe)=>Object.keys(a).length===Object.keys(b).length&&entries(a).every(([id,n])=>b[id]===n)
function knownLegacyCycle(id:string,r:{seconds:number;inputs:CivilizationRecipe;outputs:CivilizationRecipe}) {const i=OLD_IDS.indexOf(id as typeof OLD_IDS[number]);return i>=0&&((r.seconds===OLD_SECONDS[i]&&recipeEqual(r.inputs,OLD_INPUTS[i])&&recipeEqual(r.outputs,OLD_OUTPUTS[i]))||(r.seconds===V3_SECONDS[i]&&recipeEqual(r.outputs,V3_OUTPUTS[i])&&(id==='campProvisioning'?Object.keys(r.inputs).length===1&&discrete(r.inputs.food)&&r.inputs.food>=8n:recipeEqual(r.inputs,V3_INPUTS[i]))))}
export function validateCivilization(value:unknown):string|null {
 if(value===undefined)return null
 if(!value||typeof value!=='object'||Array.isArray(value))return 'Invalid civilization state.'
 const c=value as CivilizationState
 if(c.farming!==undefined){const failure=validateFarming(c.farming);if(failure)return failure}
 if((c.focusBalanceVersion!==undefined&&c.focusBalanceVersion!==2)||(c.version!==4&&c.version!==5)||(c.version===5)!==(c.farming!==undefined)||!CIVILIZATION_FOCUSES.includes(c.focus)||typeof c.unlocked!=='boolean'||!discrete(c.workers)||c.workers<1n||!discrete(c.equippedWorkers)||c.equippedWorkers>c.workers||!discrete(c.populationBaseline)||c.populationBaseline<(c.farming?0n:1n)||!discrete(c.populationGranted)||c.workers!==c.populationBaseline+c.populationGranted||!Number.isFinite(c.elapsedSeconds)||c.elapsedSeconds<0||!Number.isFinite(c.nextEquipmentSeconds)||(!c.farming&&(c.nextEquipmentSeconds<c.elapsedSeconds||c.nextEquipmentSeconds>c.elapsedSeconds+CIVILIZATION_TUNING.equipmentInterval))||!c.supplyHold||Object.entries(c.supplyHold).some(([id,v])=>!['toolmaking','hideworking','foodPreservation'].includes(id)||typeof v!=='boolean')||!c.resources||Object.keys(c.resources).length!==8||!CIVILIZATION_RESOURCES.every(id=>discrete(c.resources[id]))||!c.activities||Object.keys(c.activities).length!==12||!Array.isArray(c.awardedCatalystMilestoneIds)||new Set(c.awardedCatalystMilestoneIds).size!==c.awardedCatalystMilestoneIds.length||c.awardedCatalystMilestoneIds.some(id=>typeof id!=='string'||!validAwardId(id))||(c.legacyKnowledge!==undefined&&!discrete(c.legacyKnowledge))||(c.legacyUnlockedActivityIds!==undefined&&(!Array.isArray(c.legacyUnlockedActivityIds)||new Set(c.legacyUnlockedActivityIds).size!==c.legacyUnlockedActivityIds.length||c.legacyUnlockedActivityIds.some(id=>indexOf(id)<0))))return 'Invalid civilization resources, population, focus or milestones.'
 for(const [i,a] of CIVILIZATION_ACTIVITIES.entries()){
  const j=c.activities[a.id];if(!j||!discrete(j.completions)||!discrete(j.workers)||typeof j.active!=='boolean'||!Number.isFinite(j.progress)||j.progress<0||(!j.active&&(j.progress!==0||j.cycleReceipt!==undefined||j.legacyCycle!==undefined)))return 'Invalid civilization activity or reserved work.'
  if(j.active){const r=j.cycleReceipt;if(!r||(r.legacyWorkMultiplier!==undefined&&r.legacyWorkMultiplier!==1)||!Number.isFinite(r.seconds)||r.seconds<=0||!recipeValid(r.inputs)||!recipeValid(r.outputs)||!discrete(r.populationDelta)||r.populationDelta>3n||!Number.isFinite(r.rate)||r.rate<0||!Number.isFinite(r.remainingWork)||r.remainingWork<0||r.remainingWork>r.seconds||j.progress>r.seconds||(r.finishAt!==undefined&&(!Number.isFinite(r.finishAt)||r.finishAt<c.elapsedSeconds))||(r.rate>0&&j.progress<r.seconds&&r.finishAt===undefined))return 'Invalid paid cycle receipt.'
   if(j.legacyCycle){if(!knownLegacyCycle(a.id,j.legacyCycle)||!recipeEqual(r.inputs,j.legacyCycle.inputs)||!recipeEqual(r.outputs,j.legacyCycle.outputs)||r.seconds!==j.legacyCycle.seconds||r.populationDelta!==(a.id==='campProvisioning'?1n:0n))return 'Invalid retained paid cycle.'}
   else if(a.retired||r.seconds!==a.seconds*(r.legacyWorkMultiplier??workMultiplier(c))||!recipeEqual(r.outputs,a.outputs)||!recipeEqual(r.inputs,civilizationActivityInputs(c,i,j.completions))||r.populationDelta!==a.populationDelta)return 'Invalid current paid recipe.'
  }
  if(!a.retired&&!civilizationActivityUnlocked(c,i)&&(j.active||j.workers>0n||j.completions>0n))return 'Locked activity cannot produce.'
 }
 if(c.farming&&c.farming.phase!=='settling-forager'&&Object.values(c.activities).some(j=>j.active||j.workers>0n))return 'Retained camp cannot retain a second active job queue.'
 if(civilizationAvailableWorkers(c)<0n)return 'Workers cannot be assigned to multiple jobs.'
 if(!c.unlocked&&(c.awardedCatalystMilestoneIds.length||Object.values(c.resources).some(v=>v>0n)||Object.values(c.activities).some(j=>j.active||j.workers>0n)))return 'Locked civilization cannot hold active production.'
 return null
}
type LegacyState=Omit<CivilizationState,'version'|'focus'> & {version?:number;focus?:string;claimedCatalystOfferIds?:string[]}
/** Old population/gear are grandfathered; old completed housing never recruits
 * retroactively. A paid old recipe keeps its original work and output once. */
export function hydrateCivilization(value:unknown):CivilizationState|undefined {
 if(value===undefined)return undefined
 const old=value as LegacyState
 if(old.version===5||old.version===4&&old.focusBalanceVersion===2)return old as CivilizationState
 if(old.version===4)return {...old,focusBalanceVersion:2,activities:Object.fromEntries(Object.entries(old.activities).map(([id,j])=>[id,{...j,...(j.cycleReceipt&&!j.legacyCycle?{cycleReceipt:{...j.cycleReceipt,legacyWorkMultiplier:1 as const}}:{})}]))} as CivilizationState
 const modern=old.version===2||old.version===3,workers=modern?old.workers:3n
 const c: CivilizationState={...EMPTY_CIVILIZATION,unlocked:old.unlocked,focus:old.version===3&&CIVILIZATION_FOCUSES.includes(old.focus as CivilizationFocus)?old.focus as CivilizationFocus:'balanced',workers,populationBaseline:workers,equippedWorkers:modern?old.equippedWorkers:0n,resources:modern?{...old.resources}:{...EMPTY_CIVILIZATION.resources,food:old.resources.food,materials:old.resources.materials},awardedCatalystMilestoneIds:[...(old.awardedCatalystMilestoneIds??old.claimedCatalystOfferIds??[])],legacyUnlockedActivityIds:OLD_IDS.filter((id,i)=>old.unlocked&&!CIVILIZATION_ACTIVITIES[indexOf(id)].retired&&(old.legacyUnlockedActivityIds?.includes(id)||old.activities[id].completions>0n||old.activities[id].active||(old.version===3?Object.entries(V3_REQUIREMENTS[i]).every(([key,n])=>old.activities[key].completions>=n):i===0||old.activities[OLD_IDS[i-1]].completions>=(i===1||i===8?2n:1n)))),...(old.legacyKnowledge===undefined?(modern?{}:{legacyKnowledge:(old.resources as unknown as {knowledge:bigint}).knowledge}):{legacyKnowledge:old.legacyKnowledge}),activities:Object.fromEntries(OLD_IDS.map((id,i)=>{
  const j=old.activities[id],active=modern&&j.active
  const legacy=j.legacyCycle??{seconds:old.version===3?V3_SECONDS[i]:OLD_SECONDS[i],inputs:old.version===3?(id==='campProvisioning'?{food:addDiscrete(8n,(workers>3n?workers-3n:0n)*2n)}:V3_INPUTS[i]):OLD_INPUTS[i],outputs:old.version===3?V3_OUTPUTS[i]:OLD_OUTPUTS[i]}
  return [id,{completions:j.completions,workers:0n,progress:active?j.progress:0,active,...(active?{legacyCycle:legacy,cycleReceipt:{...legacy,populationDelta:id==='campProvisioning'?1n:0n,rate:0,remainingWork:legacy.seconds-j.progress}}:{})}]
 }))}
 const crews=allocateCivilizationWorkers(c)
 return {...c,activities:Object.fromEntries(Object.entries(c.activities).map(([id,j])=>[id,{...j,workers:crews[id]}]))}
}
export function validateCivilizationSave(value:unknown):string|null {
 if(value===undefined)return null
 if(!value||typeof value!=='object'||Array.isArray(value))return 'Invalid civilization save.'
 const old=value as LegacyState;if(old.version===4||old.version===5)return validateCivilization(value)
 if(old.version!==undefined&&old.version!==2&&old.version!==3)return 'Unknown civilization version.'
 if(old.version===3&&!['balanced','provisioning','craft','settlement','expeditions'].includes(old.focus??''))return 'Invalid legacy focus.'
 const modern=old.version===2||old.version===3,ids=modern?CIVILIZATION_RESOURCES:['food','materials','knowledge'],awards=old.awardedCatalystMilestoneIds??old.claimedCatalystOfferIds
 if(typeof old.unlocked!=='boolean'||!old.resources||Object.keys(old.resources).length!==ids.length||!ids.every(id=>discrete((old.resources as unknown as Record<string,unknown>)[id]))||!old.activities||Object.keys(old.activities).length!==12||!Array.isArray(awards)||new Set(awards).size!==awards.length||awards.some(id=>typeof id!=='string'||!(old.version===3?/^forager-catalyst-([1-9]|[1-5][0-9]|6[0-3])$/:/^forager-catalyst-[1-3]$/).test(id))||(modern&&(!discrete(old.workers)||old.workers<1n||!discrete(old.equippedWorkers)||old.equippedWorkers>old.workers)))return 'Invalid legacy civilization save.'
 for(const [i,id] of OLD_IDS.entries()){const j=old.activities[id],seconds=j?.legacyCycle?.seconds??(old.version===3?V3_SECONDS[i]:old.version===2?OLD_SECONDS[i]:[30,60,90,120,180,240,300,420,600,900,1200,1800][i]);if(!j||!discrete(j.completions)||!Number.isFinite(j.progress)||j.progress<0||j.progress>seconds||(modern&&(!discrete(j.workers)||typeof j.active!=='boolean'||(!j.active&&j.progress!==0)))||(old.version===2&&typeof (j as unknown as {autoAssign:unknown}).autoAssign!=='boolean')||(j.legacyCycle&&(!j.active||!recipeValid(j.legacyCycle.inputs)||!recipeValid(j.legacyCycle.outputs)||!knownLegacyCycle(id,j.legacyCycle))))return 'Invalid legacy activity.'}
 if(old.legacyUnlockedActivityIds!==undefined&&(!Array.isArray(old.legacyUnlockedActivityIds)||new Set(old.legacyUnlockedActivityIds).size!==old.legacyUnlockedActivityIds.length||old.legacyUnlockedActivityIds.some(id=>indexOf(id)<0)))return 'Invalid legacy unlocks.'
 if(modern&&old.workers>6n+(old.resources.shelters+(old.activities.campExpansion.active?3n:0n))*2n+old.resources.camps*8n)return 'Legacy population exceeds housing.'
 if(modern&&Object.values(old.activities).reduce((n,j)=>n+j.workers,0n)>old.workers)return 'Legacy workers cannot be assigned to multiple jobs.'
 return validateCivilization(hydrateCivilization(old))
}
export function validateLegacyFractures(value:unknown):string|null {
 if(value===undefined)return null
 if(!value||typeof value!=='object'||Array.isArray(value))return 'Invalid legacy fracture progress.'
 const f=value as {catalysts:unknown;skillIds:unknown},bases=new Set(getGameAssetsByKind(SKILL_DEFINITION_ASSET_KIND).map(a=>a.id))
 return !discrete(f.catalysts)||!Array.isArray(f.skillIds)||f.skillIds.some(id=>typeof id!=='string'||!bases.has(id))||new Set(f.skillIds).size!==f.skillIds.length?'Invalid legacy Catalyst balance or skill ownership.':null
}
