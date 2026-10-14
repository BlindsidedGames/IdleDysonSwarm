import { simulationsAvailable } from './reworkChallenges'
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
  {id:'toolmaking',section:'craft',seconds:40,inputs:{materials:5n},outputs:{tools:2n},requires:{gathering:2n},weight:6n,populationDelta:0n},
  {id:'hunting',section:'provisioning',seconds:60,inputs:{tools:1n},outputs:{food:10n,hides:2n},requires:{toolmaking:1n},weight:5n,populationDelta:0n},
  {id:'shelterBuilding',section:'settlement',seconds:30,inputs:{food:6n,materials:18n,hides:2n,tools:1n},outputs:{shelters:1n},requires:{gathering:1n},weight:5n,populationDelta:2n},
  {id:'hideworking',section:'craft',seconds:80,inputs:{hides:2n,materials:1n,tools:10n},outputs:{clothing:1n},requires:{hunting:2n,shelterBuilding:1n},weight:4n,populationDelta:0n},
  {id:'foodPreservation',section:'expeditions',seconds:60,inputs:{food:20n},outputs:{provisions:2n},requires:{hunting:2n,shelterBuilding:1n},weight:4n,populationDelta:0n},
  {id:'campExpansion',section:'settlement',seconds:60,inputs:{shelters:3n,food:12n,materials:72n,tools:2n},outputs:{camps:1n},requires:{shelterBuilding:3n,hideworking:1n},weight:4n,populationDelta:3n},
  {id:'seasonalExpeditions',section:'expeditions',seconds:180,inputs:{provisions:4n},outputs:{materials:4n,hides:6n},requires:{foodPreservation:2n,hideworking:2n,campExpansion:1n},weight:3n,populationDelta:0n},
  {id:'exchangeNetworks',section:'expeditions',seconds:240,inputs:{provisions:6n,clothing:1n,hides:12n},outputs:{materials:120n},requires:{seasonalExpeditions:2n,campExpansion:1n},weight:2n,populationDelta:0n},
  // Removed activities exist only to settle a previously paid receipt once.
  {id:'campProvisioning',section:'settlement',seconds:90,inputs:{food:8n},outputs:{},requires:{},weight:2n,populationDelta:1n,retired:true},
  {id:'fishing',section:'provisioning',seconds:60,inputs:{food:1n,tools:1n},outputs:{food:8n},requires:{},weight:2n,populationDelta:0n,retired:true},
  {id:'craftSpecialization',section:'craft',seconds:180,inputs:{provisions:1n,materials:4n},outputs:{tools:3n},requires:{},weight:4n,populationDelta:0n,retired:true},
]
// Already funded cycles retain their original bill through this balance change.
const PREVIOUS_FORAGER_INPUTS: Partial<Record<CivilizationActivityId, CivilizationRecipe>> = { toolmaking: { materials: 2n }, hunting: {}, hideworking: { hides: 2n, materials: 1n } }
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
 return {id:`forager-catalyst-${ordinal}`,name:'continuedDevelopment',ordinal,requires:{population:5n*(1n<<BigInt(ordinal-1))}}
}
const validAwardId=(id:string)=>/^forager-catalyst-([1-9]|[1-5][0-9]|6[0-5])$/.test(id)
const entries=(recipe:CivilizationRecipe)=>Object.entries(recipe) as [CivilizationResource,bigint][]
const requirementsMet=(c:Readonly<CivilizationState>,r:Readonly<Record<string,bigint>>)=>Object.entries(r).every(([id,n])=>id==='population'?c.workers>=n:c.activities[id].completions>=n)
export const EMPTY_CIVILIZATION:Readonly<CivilizationState>=Object.freeze({version:4,focusBalanceVersion:2,foragerRulesVersion:2,priority:'gathering',unlocked:false,focus:'balanced',workers:CIVILIZATION_TUNING.initialHousing,equippedWorkers:0n,populationBaseline:CIVILIZATION_TUNING.initialHousing,populationGranted:0n,elapsedSeconds:0,nextEquipmentSeconds:0,supplyHold:Object.freeze({}),
 activities:Object.freeze(Object.fromEntries(CIVILIZATION_ACTIVITIES.map(({id})=>[id,Object.freeze({completions:0n,progress:0,active:false,workers:0n})]))),resources:Object.freeze(Object.fromEntries(CIVILIZATION_RESOURCES.map(id=>[id,0n])) as Record<CivilizationResource,bigint>),awardedCatalystMilestoneIds:Object.freeze([])})
export function civilizationAvailable(state:Readonly<CanonicalGameStateV1>):boolean{return state!==undefined}
/** Existing paid/completed hunts retain ownership without another purchase. */
export function civilizationHuntingUnlocked(c:Readonly<CivilizationState>):boolean {
 return c.huntingUnlocked===true||c.activities.hunting.active||c.activities.hunting.completions>0n
}
export function civilizationActivityUnlocked(c:Readonly<CivilizationState>,index:number):boolean {
 const a=CIVILIZATION_ACTIVITIES[index]
 if(c.foragerRulesVersion===2&&a.id==='hunting')return c.unlocked&&civilizationHuntingUnlocked(c)
 if(c.foragerRulesVersion===2){const requires:Partial<Record<CivilizationActivityId,Readonly<Record<string,bigint>>>>={toolmaking:{gathering:1n},hunting:{toolmaking:1n},hideworking:{hunting:1n},shelterBuilding:{hideworking:1n},campExpansion:{hideworking:1n}};if(requires[a.id])return c.unlocked&&(c.legacyUnlockedActivityIds?.includes(a.id)===true||requirementsMet(c,requires[a.id]!))}
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
 const inputs=c.foragerRulesVersion===2?(a.id==='hunting'?{}:a.id==='hideworking'?{hides:2n,tools:4n}:a.id==='shelterBuilding'?{food:40n,clothing:2n,tools:1n}:a.id==='campExpansion'?{shelters:3n,food:100n,clothing:4n,tools:2n}:a.inputs):a.inputs
 if(a.id!=='shelterBuilding'&&a.id!=='campExpansion')return inputs
 const factor=(1+(a.id==='shelterBuilding'?CIVILIZATION_TUNING.shelterSlope:CIVILIZATION_TUNING.campSlope)*Number(ordinal??job.completions))**CIVILIZATION_TUNING.pricePower
 return Object.fromEntries(entries(inputs).map(([id,n])=>[id,id==='shelters'?n:boundedPrice(Number(n)*(id==='tools'?Math.sqrt(factor):factor))]))
}
const workMultiplier=(c:Readonly<CivilizationState>)=>c.focusBalanceVersion===2?CIVILIZATION_FOCUS_TUNING.workMultiplier:CIVILIZATION_TUNING.workMultiplier
export function civilizationCycle(c:Readonly<CivilizationState>,index:number) {
 const a=CIVILIZATION_ACTIVITIES[index],job=c.activities[a.id]
 return job.cycleReceipt??(job.legacyCycle?{...job.legacyCycle,populationDelta:a.id==='campProvisioning'?1n:0n}:{...a,outputs:civilizationSeasonOutputs(c,a.id),seconds:a.seconds*workMultiplier(c),inputs:civilizationActivityInputs(c,index,job.completions)})
}
export function nextCivilizationCatalyst(c:Readonly<CivilizationState>):CivilizationCatalystMilestone {
 let n=1;while(n<66&&c.awardedCatalystMilestoneIds.includes(`forager-catalyst-${n}`))n++;return civilizationCatalystMilestone(n)
}
export function civilizationOpeningComplete(c:Readonly<CivilizationState>):boolean{return c.farming!==undefined||c.awardedCatalystMilestoneIds.includes('forager-catalyst-6')}
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
 if(a.retired||(c.foragerRulesVersion===undefined&&c.supplyHold[a.id])||(a.id==='seasonalExpeditions'&&job.completions>=civilizationExpeditionTarget(c))||(a.id==='shelterBuilding'&&campPriority(c)))return {reason:'demand',missing:[]}
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
 return civilizationEffectiveWorkers(c,index)<(a.id==='campExpansion'?Number(CIVILIZATION_TUNING.campMinimumCrew):Number.MIN_VALUE)?{reason:'workers' as const,missing:[]}:status
}
const FOUNDATIONAL=['toolmaking','gathering','shelterBuilding','hunting','hideworking','foodPreservation','campExpansion','seasonalExpeditions','exchangeNetworks','campProvisioning','fishing','craftSpecialization']
const FOCUS_SUPPORT:Partial<Record<CivilizationFocus,readonly string[]>>={settlement:['gathering','hunting','toolmaking'],expeditions:['hunting','hideworking']}
type CivilizationPriority=NonNullable<CivilizationState['priority']>
function foragerEligibleActivities(c:Readonly<CivilizationState>):CivilizationPriority[] {
 if(!c.unlocked)return []
 const chiefReserve=c.resources.camps>=2n&&!c.chieftain
 const housingReserve=(['shelterBuilding','campExpansion'] as const).reduce((reserve,id)=>{const bill=civilizationActivityInputs(c,indexOf(id));return c.resources.clothing>=(bill.clothing??DISCRETE_MAXIMUM)&&(id!=='campExpansion'||c.resources.shelters>=3n)?(bill.tools!>reserve?bill.tools!:reserve):reserve},0n)
 return (['gathering','hunting','toolmaking','hideworking'] as const).filter(id=>{
  const i=indexOf(id),job=c.activities[id]
  return civilizationActivityUnlocked(c,i)&&(job.active||(eligibility(c,i).reason==='running'&&(id!=='hideworking'||(c.resources.tools>=4n+housingReserve+(chiefReserve?12n:0n)&&c.resources.hides>=2n+(chiefReserve?6n:0n)))))
 })
}
function foragerWeights(c:Readonly<CivilizationState>) {
 const eligible=foragerEligibleActivities(c)
 return eligible.map(id=>{
  const craft=id==='toolmaking'||id==='hideworking'
  const partner=id==='gathering'?'hunting':id==='hunting'?'gathering':id==='toolmaking'?'hideworking':'toolmaking'
  const preferred=craft?(c.craftPriority??'hideworking'):(c.priority??'gathering')
  return {id,weight:eligible.includes(partner)?(id===preferred?4n:2n):3n}
 })
}
export function allocateCivilizationWorkers(c:Readonly<CivilizationState>):Record<string,bigint> {
 const crews=Object.fromEntries(CIVILIZATION_ACTIVITIES.map(a=>[a.id,0n]));if(!c.unlocked)return crews
 if(c.foragerRulesVersion===2&&!c.farming){
  const eligible=foragerWeights(c)
  const remaining=c.workers
  if(!eligible.length)return crews
  const total=eligible.reduce((sum,job)=>sum+job.weight,0n)
  const fractions=eligible.map(job=>{const share=remaining*job.weight;crews[job.id]+=share/total;return {...job,remainder:share%total}})
  let spare=c.workers-Object.values(crews).reduce((sum,n)=>sum+n,0n)
  fractions.sort((a,b)=>a.remainder===b.remainder?(a.weight>b.weight?-1:1):a.remainder>b.remainder?-1:1)
  for(const {id} of fractions)if(spare>0n){crews[id]++;spare--}
  return crews
 }
 const eligible=CIVILIZATION_ACTIVITIES.filter(a=>c.foragerRulesVersion===undefined||FORAGER_AUTOMATIC.includes(a.id)).map(a=>({a,i:indexOf(a.id),weight:a.weight*(c.foragerRulesVersion!==undefined?(a.id===(c.priority??'gathering')?4n:1n):(c.focus===a.section?4n:FOCUS_SUPPORT[c.focus]?.includes(a.id)?3n:2n))})).filter(({i,a})=>civilizationActivityUnlocked(c,i)&&(c.activities[a.id].active||(!c.farming&&eligibility(c,i).reason==='running')))
 let remaining=c.workers
 for(const id of FOUNDATIONAL){const need=id==='campExpansion'?CIVILIZATION_TUNING.campMinimumCrew:1n;if(remaining>=need&&eligible.some(r=>r.a.id===id)){crews[id]+=need;remaining-=need}}
 if(!remaining||!eligible.length)return crews
 const total=eligible.reduce((n,r)=>n+r.weight,0n),fractions=eligible.map(r=>{const numerator=remaining*r.weight;crews[r.a.id]+=numerator/total;return {...r,fraction:numerator%total}})
 let spare=c.workers-Object.values(crews).reduce((n,v)=>n+v,0n)
 fractions.sort((a,b)=>a.fraction===b.fraction?a.i-b.i:a.fraction>b.fraction?-1:1)
 for(const r of fractions)if(spare>0n){crews[r.a.id]++;spare--}return crews
}
export function civilizationEquipmentLabor(c:Readonly<CivilizationState>,index:number):number {
 if(c.foragerRulesVersion===2)return 0
 const id=CIVILIZATION_ACTIVITIES[index].id;if(!['gathering','hunting','fishing'].includes(id)||!c.activities[id].active)return 0
 const field=['gathering','hunting','fishing'].reduce((n,id)=>n+(c.activities[id].active?c.activities[id].workers:0n),0n)
 return field?Number(c.equippedWorkers<field?c.equippedWorkers:field)*CIVILIZATION_TUNING.equipmentLabor*Number(c.activities[id].workers)/Number(field):0
}
/** Each pair shares its labour two to one without taking time from the other pair. */
export function civilizationEffectiveWorkers(c:Readonly<CivilizationState>,index:number):number {
 const id=CIVILIZATION_ACTIVITIES[index].id
 if(c.foragerRulesVersion===2&&!c.farming){
  const weights=foragerWeights(c),job=weights.find(job=>job.id===id)
  return job?Number(c.workers)*Number(job.weight)/Number(weights.reduce((sum,job)=>sum+job.weight,0n)):0
 }
 return Number(c.activities[id].workers)
}
export function civilizationSpeed(c:Readonly<CivilizationState>,index:number,fractures:number):number {
 const a=CIVILIZATION_ACTIVITIES[index],workers=c.activities[a.id].workers
 if(a.id==='campExpansion'&&workers<CIVILIZATION_TUNING.campMinimumCrew)return 0
 const historical=c.focusBalanceVersion!==2||c.activities[a.id].legacyCycle!==undefined||c.activities[a.id].cycleReceipt?.legacyWorkMultiplier===1
 const focusRate=c.foragerRulesVersion!==undefined?1:historical?1:c.focus===a.section?CIVILIZATION_FOCUS_TUNING.selectedRate:FOCUS_SUPPORT[c.focus]?.includes(a.id)?CIVILIZATION_FOCUS_TUNING.supportRate:1
 return (civilizationEffectiveWorkers(c,index)+civilizationEquipmentLabor(c,index))*(1+fractures*CIVILIZATION_TUNING.speedPerFracture)*focusRate
}
export function civilizationLogProgress(current:number,target:number):number {if(!Number.isFinite(target)||target<=0||Number.isNaN(current)||current<=0)return 0;if(current>=target)return 1;return Math.max(0,Math.min(1,Math.log1p(current)/Math.log1p(target)))}
export function civilizationMilestoneProgress(c:Readonly<CivilizationState>,m:CivilizationCatalystMilestone) {
 const complete=requirementsMet(c,m.requires),steps=Object.entries(m.requires).map(([id,target])=>{const j=c.activities[id];return {id:id as CivilizationActivityId,target,current:id==='population'?Number(c.workers):Number(j.completions)+Math.min(1-1e-9,j.progress/civilizationCycle(c,indexOf(id)).seconds),completed:id==='population'?c.workers:j.completions}})
 const progress=Math.min(...steps.map(s=>Math.min(1,s.current/Number(s.target))))
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
 if(c.chieftain?.enabled&&!c.farming&&c.elapsedSeconds>=c.chieftain.nextDecisionSeconds){
  Object.assign(c,{...chieftainPriorities(c),chieftain:{...c.chieftain,enabled:true,nextDecisionSeconds:c.elapsedSeconds+30}})
 }
 let challenges=state.challenges??EMPTY_INFINITY_CHALLENGES
 for(let n=1;n<=65;n++){const m=civilizationCatalystMilestone(n);if(n>6&&!requirementsMet(c,m.requires))break;if(!c.awardedCatalystMilestoneIds.includes(m.id)&&requirementsMet(c,m.requires)&&challenges.galvanizers<DISCRETE_MAXIMUM){c.awardedCatalystMilestoneIds.push(m.id);challenges={...challenges,galvanizers:challenges.galvanizers+1n,hasEarnedGalvanizer:true,unlocked:true}}}
 if(c.foragerRulesVersion===2)c.nextEquipmentSeconds=c.elapsedSeconds
 if(c.foragerRulesVersion!==2&&!c.farming&&c.elapsedSeconds>=c.nextEquipmentSeconds){const missing=c.workers/CIVILIZATION_TUNING.equipmentPopulationDivisor>c.equippedWorkers?c.workers/CIVILIZATION_TUNING.equipmentPopulationDivisor-c.equippedWorkers:0n,count=[missing,c.resources.tools/2n,c.resources.clothing].reduce((a,b)=>a<b?a:b);c.equippedWorkers+=count;c.resources.tools-=count*2n;c.resources.clothing-=count;c.nextEquipmentSeconds+=CIVILIZATION_TUNING.equipmentInterval}
 for(let pass=0;!c.farming&&pass<=CIVILIZATION_ACTIVITIES.length;pass++){
  if(c.foragerRulesVersion===undefined)updateHolds(c);const crews=allocateCivilizationWorkers(c);for(const [id,n] of Object.entries(crews))c.activities[id].workers=n
  let admitted=false
  for(const [i,a] of CIVILIZATION_ACTIVITIES.entries()){const j=c.activities[a.id];if((c.foragerRulesVersion!==undefined&&!FORAGER_AUTOMATIC.includes(a.id))||j.active||!civilizationActivityUnlocked(c,i)||civilizationJobWaiting(c,i).reason!=='running')continue
   const cost=civilizationActivityInputs(c,i);for(const [id,n] of entries(cost))c.resources[id]-=n
   j.active=true;j.cycleReceipt={seconds:a.seconds*workMultiplier(c),inputs:{...cost},outputs:{...civilizationSeasonOutputs(c,a.id)},populationDelta:a.populationDelta,rate:0,remainingWork:a.seconds*workMultiplier(c)};admitted=true
  }
  if(!admitted)break
 }
 const crews=allocateCivilizationWorkers(c);for(const [id,n] of Object.entries(crews))c.activities[id].workers=n
 for(const [i,a] of CIVILIZATION_ACTIVITIES.entries()){const j=c.activities[a.id],r=j.cycleReceipt;if(!j.active||!r||j.progress>=r.seconds)continue;const rate=civilizationSpeed(c,i,fractures);if(rate===r.rate)continue
  const remaining=Math.max(0,Math.min(r.seconds,r.finishAt!==undefined&&r.rate>0?(r.finishAt-c.elapsedSeconds)*r.rate:r.remainingWork))
  const due=rate>0?c.elapsedSeconds+remaining/rate:undefined
  const paid={...r,remainingWork:remaining,rate};if(due===undefined)delete paid.finishAt;else paid.finishAt=due<=c.elapsedSeconds?bitIncrement(c.elapsedSeconds):due;j.cycleReceipt=paid
 }
 return {...state,civilization:c,challenges}
}
/** Finish already-paid Forager work at age entry without advancing its clock. */
export function settleForagerHandoff(state:CanonicalGameStateV1):CanonicalGameStateV1 {
 if(state.civilization?.farming?.phase!=='settling-forager')return state
 const c=clone(state.civilization!)
 for(const job of Object.values(c.activities)){
  const receipt=job.cycleReceipt;if(!job.active||!receipt)continue
  job.progress=receipt.seconds
  const completed={...receipt,rate:0,remainingWork:0};delete completed.finishAt
  job.cycleReceipt=completed
 }
 // Normal settlement owns receipt outputs, population and one-time awards.
 // Numeric-range guards still retain an output that cannot be represented.
 const result=normalize(c,state,permanentFractureCount(state))
 return Object.values(c.activities).some(j=>j.active)?result:finishForagerHandoff(result)
}
/** Paid receipts and their absolute deadlines survive call partitions/reloads.
 * Every completion settles before awards, automatic kits and new admissions. */
export function advanceCivilization(state:CanonicalGameStateV1,seconds:number):CanonicalGameStateV1 {
 if(!simulationsAvailable(state))return state
 if(state.meta.reworkMigrationChoice===undefined||!Number.isFinite(seconds)||seconds<0)return state
 if(state.civilization?.farming?.phase==='settling-forager')state=settleForagerHandoff(state)
 if(seconds===0)return state
 if(state.civilization?.farming&&state.civilization.farming.phase!=='settling-forager')return advanceFarming(state,seconds)
 const source=migrateForager(state.civilization??EMPTY_CIVILIZATION),c=clone(source)
 let end=c.elapsedSeconds+seconds
 if(!Number.isFinite(end)||end<=c.elapsedSeconds)return state
 if(!c.unlocked){for(const [id,n] of entries(CIVILIZATION_STARTER_KIT))c.resources[id]+=n;c.unlocked=true}
 const fractures=permanentFractureCount(state)
 let result=normalize(c,state,fractures)
 while(c.elapsedSeconds<end){if(c.farming&&!Object.values(c.activities).some(j=>j.active))return advanceFarming(finishForagerHandoff(result),end-c.elapsedSeconds);const due=Object.values(c.activities).filter(j=>j.active&&j.progress<j.cycleReceipt!.seconds).map(j=>j.cycleReceipt!.finishAt??Infinity)
  // Detached decimal ticks can finish a few floating-point units short of a
  // funded deadline. Settle that roundoff without changing Farming's clock.
  if(!c.farming&&c.focusBalanceVersion===2){const tolerance=256*Number.EPSILON*Math.max(1,Math.abs(end));const near=[...due,...(c.foragerRulesVersion===2?[]:[c.nextEquipmentSeconds])].filter(t=>t>end&&t-end<=tolerance);if(near.length)end=Math.min(...near)}
  const next=Math.min(end,c.chieftain?.enabled&&!c.farming?c.chieftain.nextDecisionSeconds:Infinity,c.farming||c.foragerRulesVersion===2?Infinity:c.nextEquipmentSeconds,c.foragerRulesVersion!==undefined&&!c.farming?(Math.floor(c.elapsedSeconds/600)+1)*600:Infinity,...due);if(next<=c.elapsedSeconds)throw Error('Civilization clock precision exhausted.');c.elapsedSeconds=next;result=normalize(c,result,fractures)}
 return c.farming&&!Object.values(c.activities).some(j=>j.active)?finishForagerHandoff(result):result
}
export function setCivilizationFocus(state:CanonicalGameStateV1,focus:string):CanonicalGameStateV1|null {
 if(state.civilization?.farming||!['gathering','hunting','toolmaking','hideworking'].includes(focus)||state.meta.reworkMigrationChoice===undefined)return null
 const source=migrateForager(state.civilization??EMPTY_CIVILIZATION)
 const craft=focus==='toolmaking'||focus==='hideworking'
 if(!civilizationHuntingUnlocked(source)||source.chieftain?.enabled||(craft?(source.craftPriority??'hideworking'):source.priority)===focus||!civilizationActivityUnlocked(source,indexOf(focus)))return null
 const c=clone({...source,...(craft?{craftPriority:focus as 'toolmaking'|'hideworking'}:{priority:focus as 'gathering'|'hunting'})})
 return c.unlocked?normalize(c,state,permanentFractureCount(state)):{...state,civilization:c}
}
export function buyCivilizationChieftain(state:CanonicalGameStateV1):CanonicalGameStateV1|null {
 const c=state.civilization
 if(state.meta.reworkMigrationChoice===undefined||!c||c.farming||c.foragerRulesVersion!==2||!c.unlocked||c.chieftain||c.resources.camps<2n||c.resources.tools<12n||c.resources.hides<6n||!civilizationHuntingUnlocked(c))return null
 const next=clone({...c,chieftain:{enabled:true,nextDecisionSeconds:c.elapsedSeconds,costVersion:2}})
 next.resources.tools-=12n;next.resources.hides-=6n
 return normalize(next,state,permanentFractureCount(state))
}
export function setCivilizationChieftain(state:CanonicalGameStateV1,enabled:boolean):CanonicalGameStateV1|null {
 const c=state.civilization
 if(state.meta.reworkMigrationChoice===undefined||!c||c.farming||!c.chieftain||typeof enabled!=='boolean'||c.chieftain.enabled===enabled)return null
 return normalize(clone({...c,chieftain:{...c.chieftain,enabled,nextDecisionSeconds:c.elapsedSeconds}}),state,permanentFractureCount(state))
}
/** The next affordable conversion takes precedence; otherwise prepare another tent. */
export function civilizationGrowthTarget(c:Readonly<CivilizationState>):'tent'|'camp' {
 return c.resources.shelters>=3n?'camp':'tent'
}
function chieftainPriorities(c:Readonly<CivilizationState>):{priority:'gathering'|'hunting';craftPriority:'toolmaking'|'hideworking'} {
 // Count already-funded outputs so a nearly finished batch is not ordered twice.
 const stock=(id:CivilizationResource)=>Number(c.resources[id])+Object.values(c.activities).reduce((sum,job)=>sum+(job.active?Number(job.cycleReceipt?.outputs[id]??0n):0),0)
 const bill=civilizationActivityInputs(c,indexOf(civilizationGrowthTarget(c)==='camp'?'campExpansion':'shelterBuilding'))
 const leather=Math.max(0,Number(bill.clothing??0n)-stock('clothing'))
 const tools=Math.max(0,leather*4+Number(bill.tools??0n)-stock('tools'))
 let materials=Math.max(0,Math.ceil(tools/2)*5-stock('materials'))
 let game=Math.max(0,leather*2-stock('hides'))
 const food=Math.max(0,Number(bill.food??0n)-stock('food'))
 const gather=civilizationSeasonOutputs(c,'gathering'),hunt=civilizationSeasonOutputs(c,'hunting')
 if(materials===0&&game===0&&food===0&&tools===0&&leather===0){
  // One additional housing bill of buffer: autumn is the last rich Game season
  // before winter. Other seasons replenish the material-to-tool supply chain.
  if(civilizationSeason(c)==='autumn')game=Math.max(0,Number(bill.clothing??0n)*2-stock('hides'))
  else materials=Math.max(0,Math.ceil((Number(bill.clothing??0n)*4+Number(bill.tools??0n))/2)*5-stock('materials'))
 }
 const eligible=foragerEligibleActivities(c)
 const work:Record<CivilizationPriority,number>={
  gathering:materials/Number(gather.materials)*CIVILIZATION_ACTIVITIES[indexOf('gathering')].seconds,
  hunting:game/Number(hunt.hides)*CIVILIZATION_ACTIVITIES[indexOf('hunting')].seconds,
  toolmaking:Math.ceil(tools/2)*CIVILIZATION_ACTIVITIES[indexOf('toolmaking')].seconds,
  hideworking:leather*CIVILIZATION_ACTIVITIES[indexOf('hideworking')].seconds,
 }
 const priority=c.priority==='hunting'?'hunting':'gathering',craftPriority=c.craftPriority??'hideworking'
 const estimateProvisioning=(preferred:'gathering'|'hunting')=>{
  const g=preferred==='gathering'?2/3:1/3,h=1-g
  const foodRate=g*Number(gather.food)/CIVILIZATION_ACTIVITIES[indexOf('gathering')].seconds+h*Number(hunt.food)/CIVILIZATION_ACTIVITIES[indexOf('hunting')].seconds
  return Math.max(work.gathering/g,work.hunting/h,food/foodRate)
 }
 const estimateCraft=(preferred:'toolmaking'|'hideworking')=>{
  const jobs=eligible.filter(id=>id==='toolmaking'||id==='hideworking')
  return Math.max(0,...jobs.map(id=>work[id]/(jobs.length===1?1:id===preferred?2/3:1/3)))
 }
 const other=priority==='gathering'?'hunting':'gathering',otherCraft=craftPriority==='toolmaking'?'hideworking':'toolmaking'
 return {priority:estimateProvisioning(other)<estimateProvisioning(priority)*.9?other:priority,craftPriority:(!eligible.includes(craftPriority)&&eligible.includes(otherCraft)&&work[otherCraft]>0)||estimateCraft(otherCraft)<estimateCraft(craftPriority)*.9?otherCraft:craftPriority}

}
export function buyCivilizationHunting(state:CanonicalGameStateV1):CanonicalGameStateV1|null {
 if(state.meta.reworkMigrationChoice===undefined||state.civilization?.farming)return null
 const source=migrateForager(state.civilization??EMPTY_CIVILIZATION)
 if(!source.unlocked||civilizationHuntingUnlocked(source)||source.activities.toolmaking.completions<1n||source.resources.tools<1n)return null
 const c=clone({...source,huntingUnlocked:true})
 c.resources.tools--
 return normalize(c,state,permanentFractureCount(state))
}
export function buyCivilizationHousing(state:CanonicalGameStateV1,building:'tent'|'camp'):CanonicalGameStateV1|null {
 if(!simulationsAvailable(state))return null
 if(state.meta.reworkMigrationChoice===undefined||state.civilization?.farming)return null
 const c=clone(migrateForager(state.civilization??EMPTY_CIVILIZATION))
 if(!c.unlocked){for(const [r,n] of entries(CIVILIZATION_STARTER_KIT))c.resources[r]+=n;c.unlocked=true}
 const prepared={...state,civilization:c}
 const id=building==='tent'?'shelterBuilding':'campExpansion',i=indexOf(id),a=CIVILIZATION_ACTIVITIES[i]
 const cost=civilizationActivityInputs(c,i)
 if(!civilizationActivityUnlocked(c,i)||entries(cost).some(([r,n])=>c.resources[r]<n)||c.workers>DISCRETE_MAXIMUM-a.populationDelta||c.activities[id].completions===DISCRETE_MAXIMUM||entries(a.outputs).some(([r,n])=>c.resources[r]>DISCRETE_MAXIMUM-n))return null
 for(const [r,n] of entries(cost))c.resources[r]-=n
 for(const [r,n] of entries(a.outputs))c.resources[r]+=n
 c.workers+=a.populationDelta;c.populationGranted+=a.populationDelta;c.activities[id].completions++
 return normalize(c,prepared,permanentFractureCount(prepared))
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
 if((c.foragerRulesVersion!==undefined&&c.foragerRulesVersion!==1&&c.foragerRulesVersion!==2)||(c.priority!==undefined&&!['gathering','hunting','toolmaking','hideworking'].includes(c.priority)))return 'Invalid Forager rules or priority.'
 if(c.craftPriority!==undefined&&!['toolmaking','hideworking'].includes(c.craftPriority))return 'Invalid Craft priority.'
 if(c.chieftain!==undefined&&(!c.chieftain||typeof c.chieftain!=='object'||typeof c.chieftain.enabled!=='boolean'||(c.chieftain.costVersion!==undefined&&c.chieftain.costVersion!==2)||!Number.isFinite(c.chieftain.nextDecisionSeconds)||c.chieftain.nextDecisionSeconds<0||!c.unlocked||c.foragerRulesVersion!==2||!civilizationHuntingUnlocked(c)))return 'Invalid Chieftain.'
 if(c.huntingUnlocked!==undefined&&(typeof c.huntingUnlocked!=='boolean'||c.huntingUnlocked&&!c.unlocked))return 'Invalid Hunting unlock.'
 if(c.farming!==undefined){const failure=validateFarming(c.farming);if(failure)return failure}
 if((c.focusBalanceVersion!==undefined&&c.focusBalanceVersion!==2)||(c.version!==4&&c.version!==5)||(c.version===5)!==(c.farming!==undefined)||!CIVILIZATION_FOCUSES.includes(c.focus)||typeof c.unlocked!=='boolean'||!discrete(c.workers)||c.workers<1n||!discrete(c.equippedWorkers)||c.equippedWorkers>c.workers||!discrete(c.populationBaseline)||c.populationBaseline<(c.farming?0n:1n)||!discrete(c.populationGranted)||c.workers!==c.populationBaseline+c.populationGranted||!Number.isFinite(c.elapsedSeconds)||c.elapsedSeconds<0||!Number.isFinite(c.nextEquipmentSeconds)||(c.foragerRulesVersion!==2&&!c.farming&&(c.nextEquipmentSeconds<c.elapsedSeconds||c.nextEquipmentSeconds>c.elapsedSeconds+CIVILIZATION_TUNING.equipmentInterval))||!c.supplyHold||Object.entries(c.supplyHold).some(([id,v])=>!['toolmaking','hideworking','foodPreservation'].includes(id)||typeof v!=='boolean')||!c.resources||Object.keys(c.resources).length!==8||!CIVILIZATION_RESOURCES.every(id=>discrete(c.resources[id]))||!c.activities||Object.keys(c.activities).length!==12||!Array.isArray(c.awardedCatalystMilestoneIds)||new Set(c.awardedCatalystMilestoneIds).size!==c.awardedCatalystMilestoneIds.length||c.awardedCatalystMilestoneIds.some(id=>typeof id!=='string'||!validAwardId(id))||(c.legacyKnowledge!==undefined&&!discrete(c.legacyKnowledge))||(c.legacyUnlockedActivityIds!==undefined&&(!Array.isArray(c.legacyUnlockedActivityIds)||new Set(c.legacyUnlockedActivityIds).size!==c.legacyUnlockedActivityIds.length||c.legacyUnlockedActivityIds.some(id=>indexOf(id)<0))))return 'Invalid civilization resources, population, focus or milestones.'
 for(const [i,a] of CIVILIZATION_ACTIVITIES.entries()){
  const j=c.activities[a.id];if(!j||!discrete(j.completions)||!discrete(j.workers)||typeof j.active!=='boolean'||!Number.isFinite(j.progress)||j.progress<0||(!j.active&&(j.progress!==0||j.cycleReceipt!==undefined||j.legacyCycle!==undefined)))return 'Invalid civilization activity or reserved work.'
  if(c.foragerRulesVersion!==undefined&&!FORAGER_AUTOMATIC.includes(a.id)&&(j.active||j.workers>0n))return 'Removed Forager queues cannot run.'
  if(j.active){const r=j.cycleReceipt;if(!r||(r.legacyWorkMultiplier!==undefined&&r.legacyWorkMultiplier!==1)||!Number.isFinite(r.seconds)||r.seconds<=0||!recipeValid(r.inputs)||!recipeValid(r.outputs)||!discrete(r.populationDelta)||r.populationDelta>3n||!Number.isFinite(r.rate)||r.rate<0||!Number.isFinite(r.remainingWork)||r.remainingWork<0||r.remainingWork>r.seconds||j.progress>r.seconds||(r.finishAt!==undefined&&(!Number.isFinite(r.finishAt)||r.finishAt<c.elapsedSeconds))||(r.rate>0&&j.progress<r.seconds&&r.finishAt===undefined))return 'Invalid paid cycle receipt.'
   if(j.legacyCycle){if(!knownLegacyCycle(a.id,j.legacyCycle)||!recipeEqual(r.inputs,j.legacyCycle.inputs)||!recipeEqual(r.outputs,j.legacyCycle.outputs)||r.seconds!==j.legacyCycle.seconds||r.populationDelta!==(a.id==='campProvisioning'?1n:0n))return 'Invalid retained paid cycle.'}
   else if(a.retired||r.seconds!==a.seconds*(r.legacyWorkMultiplier??workMultiplier(c))||!(recipeEqual(r.outputs,a.outputs)||((a.id==='gathering'&&[{food:4n,materials:3n},{food:1n,materials:6n}].some(old=>recipeEqual(r.outputs,old)))||(a.id==='hunting'&&[{food:3n,hides:2n},{food:12n,hides:2n}].some(old=>recipeEqual(r.outputs,old))))||(c.foragerRulesVersion!==undefined&&[0,600,1200,1800].some(elapsedSeconds=>recipeEqual(r.outputs,civilizationSeasonOutputs({...c,elapsedSeconds},a.id)))))||!(recipeEqual(r.inputs,civilizationActivityInputs(c,i,j.completions))||recipeEqual(r.inputs,a.inputs)||(a.id==='hideworking'&&recipeEqual(r.inputs,{hides:2n,tools:10n}))||(PREVIOUS_FORAGER_INPUTS[a.id]!==undefined&&recipeEqual(r.inputs,PREVIOUS_FORAGER_INPUTS[a.id]!)))||r.populationDelta!==a.populationDelta)return 'Invalid current paid recipe.'
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
function hydrateLegacyCivilization(value:unknown):CivilizationState|undefined {
 if(value===undefined)return undefined
 const old=value as LegacyState
 if(old.version===5||old.version===4&&old.focusBalanceVersion===2)return old as CivilizationState
 if(old.version===4)return {...old,focusBalanceVersion:2,activities:Object.fromEntries(Object.entries(old.activities).map(([id,j])=>[id,{...j,...(j.cycleReceipt&&!j.legacyCycle?{cycleReceipt:{...j.cycleReceipt,legacyWorkMultiplier:1 as const}}:{})}]))} as CivilizationState
 const modern=old.version===2||old.version===3,workers=modern?old.workers:3n
 const c: CivilizationState={...EMPTY_CIVILIZATION,foragerRulesVersion:undefined,unlocked:old.unlocked,focus:old.version===3&&CIVILIZATION_FOCUSES.includes(old.focus as CivilizationFocus)?old.focus as CivilizationFocus:'balanced',workers,populationBaseline:workers,equippedWorkers:modern?old.equippedWorkers:0n,resources:modern?{...old.resources}:{...EMPTY_CIVILIZATION.resources,food:old.resources.food,materials:old.resources.materials},awardedCatalystMilestoneIds:[...(old.awardedCatalystMilestoneIds??old.claimedCatalystOfferIds??[])],legacyUnlockedActivityIds:OLD_IDS.filter((id,i)=>old.unlocked&&!CIVILIZATION_ACTIVITIES[indexOf(id)].retired&&(old.legacyUnlockedActivityIds?.includes(id)||old.activities[id].completions>0n||old.activities[id].active||(old.version===3?Object.entries(V3_REQUIREMENTS[i]).every(([key,n])=>old.activities[key].completions>=n):i===0||old.activities[OLD_IDS[i-1]].completions>=(i===1||i===8?2n:1n)))),...(old.legacyKnowledge===undefined?(modern?{}:{legacyKnowledge:(old.resources as unknown as {knowledge:bigint}).knowledge}):{legacyKnowledge:old.legacyKnowledge}),activities:Object.fromEntries(OLD_IDS.map((id,i)=>{
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

export const FORAGER_AUTOMATIC:readonly CivilizationActivityId[]=['gathering','hunting','toolmaking','hideworking']
export const FORAGER_STOCKS:readonly CivilizationResource[]=['food','materials','tools','hides','clothing','shelters','camps']
export function civilizationSeason(c:Readonly<CivilizationState>):'spring'|'summer'|'autumn'|'winter' {
 return (['spring','summer','autumn','winter'] as const)[Math.floor(c.elapsedSeconds/600)%4]
}
export function civilizationSeasonOutputs(c:Readonly<CivilizationState>,id:CivilizationActivityId):CivilizationRecipe {
 const a=CIVILIZATION_ACTIVITIES[indexOf(id)]
 if(c.foragerRulesVersion===undefined)return a.outputs
 const season=Math.floor(c.elapsedSeconds/600)%4
 if(id==='gathering')return {food:[4n,3n,2n,1n][season],materials:[3n,5n,6n,4n][season]}
 if(id==='hunting')return {food:[6n,3n,12n,9n][season],hides:[2n,1n,4n,1n][season]}
 return a.outputs
}
function migrateForager(source:Readonly<CivilizationState>):CivilizationState {
 if(source.priority==='toolmaking'||source.priority==='hideworking')source={...source,craftPriority:source.priority,priority:'gathering'}
 if(source.chieftain&&source.chieftain.costVersion===undefined){
  // Refund the old population price once; existing ownership needs no new payment.
  const refund=DISCRETE_MAXIMUM-source.workers<3n?DISCRETE_MAXIMUM-source.workers:3n
  source={...source,workers:source.workers+refund,populationGranted:source.populationGranted+refund,chieftain:{...source.chieftain,costVersion:2}}
 }

 if(source.foragerRulesVersion===2||source.farming)return source as CivilizationState
 const c=clone({...source,foragerRulesVersion:2,priority:'gathering',legacyUnlockedActivityIds:CIVILIZATION_ACTIVITIES.filter((_,i)=>civilizationActivityUnlocked(source,i)).map(a=>a.id)})
 if(c.unlocked&&c.resources.shelters===0n&&c.resources.camps===0n)c.resources.shelters=1n
 // Preserve previous unlocks and paid recipes through the chain change.
 // Cancel removed queues and return their paid inputs once. Keep all stocks,
 // population, completed purchases and previously earned Catalyst IDs.
 for(const [id,j] of Object.entries(c.activities))if(!FORAGER_AUTOMATIC.includes(id as CivilizationActivityId)){
  if(j.active&&j.cycleReceipt)for(const [r,n] of entries(j.cycleReceipt.inputs))c.resources[r]=addDiscrete(c.resources[r],n)
  c.activities[id]={completions:j.completions,progress:0,active:false,workers:0n}
 }
 return c
}
export function hydrateCivilization(value:unknown):CivilizationState|undefined {
 const c=hydrateLegacyCivilization(value)
 return c===undefined?undefined:migrateForager(c)
}
