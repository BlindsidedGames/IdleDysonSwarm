import type { CanonicalGameStateV1, CivilizationFocus, FarmingState, FarmingResource, FarmingJob, FarmingBuilding, FarmingRecipe } from '../game-state/types'
import { CIVILIZATION_ACTIVITIES, advanceCivilization, civilizationOpeningComplete, settleForagerHandoff } from './civilization'
import { CIVILIZATION_TUNING } from './civilizationTuning'
import { permanentFractureCount } from './galvanization'
import { eligibleCanonicalFractureIds } from './canonicalSkillTransactions'
import { DISCRETE_MAXIMUM } from './numeric'
import { EMPTY_INFINITY_CHALLENGES } from './infinityChallenges'
import { FARMING_TUNING as T } from './farmingTuning'
export { FARMING_TUNING } from './farmingTuning'
export const FARMING_RESOURCES: readonly FarmingResource[] = ['food','materials','tools','goods']
export const FARMING_BUILDINGS: readonly FarmingBuilding[] = ['pasture','kiln','waterworks','hall']
export const FARMING_ROWS = ['fields','woodlot','workshop','homes','pasture','kiln','waterworks','hall'] as const
export type FarmingRow = typeof FARMING_ROWS[number]
export type FarmingGoal = { kind:'home'|'repair'|'granary'|'ship'|FarmingBuilding; index?:number }
type MutableFarming = { -readonly [K in keyof FarmingState]: FarmingState[K] } & {
  resources:Record<FarmingResource,number>; jobs:Record<string,FarmingJob>;
  homes:number[]; lostHomes:number[]; completedBuildings:FarmingBuilding[];
  awardedCatalystIds:string[]; targets:Record<FarmingResource,number>;
}
const clone=(f:Readonly<FarmingState>):MutableFarming=>({...f,resources:{...f.resources},targets:{...f.targets},jobs:Object.fromEntries(Object.entries(f.jobs).map(([id,j])=>[id,{...j,inputs:{...j.inputs}}])),homes:[...f.homes],lostHomes:[...f.lostHomes],completedBuildings:[...f.completedBuildings],awardedCatalystIds:[...f.awardedCatalystIds]})
const has=(f:Readonly<FarmingState>,id:FarmingBuilding)=>f.completedBuildings.includes(id)
export const farmingCapacity=(f:Readonly<FarmingState>)=>T.initialFoodCapacity+T.granaryCapacity*f.granaries
export const farmingWorkers=(f:Readonly<FarmingState>)=>T.founders+T.residentsPerHome*f.homes.length
export const farmingEffectiveFocus=(f:Readonly<FarmingState>):CivilizationFocus=>f.focus==='expeditions'&&!has(f,'hall')?'balanced':f.focus
export const farmingComplete=(f:Readonly<FarmingState>)=>has(f,'hall')&&f.shipments>=6&&f.homes.length===6
export function farmingGoal(f:Readonly<FarmingState>):FarmingGoal {
  if(f.lostHomes.length)return {kind:'repair',index:f.lostHomes[0]}
  if(f.homesBuilt===0)return {kind:'home',index:0}
  if(f.granaries===0)return {kind:'granary',index:0}
  if(f.focus==='settlement'&&f.homesBuilt<2)return {kind:'home',index:f.homesBuilt}
  const order:FarmingBuilding[]=f.focus==='provisioning'?['kiln','pasture']:['pasture','kiln']
  for(const id of order)if(!has(f,id))return {kind:id}
  if(f.homesBuilt<2)return {kind:'home',index:f.homesBuilt}
  if(!has(f,'waterworks'))return {kind:'waterworks'}
  if(f.homesBuilt<4)return {kind:T.homeBills[f.homesBuilt][0]>farmingCapacity(f)?'granary':'home',index:T.homeBills[f.homesBuilt][0]>farmingCapacity(f)?f.granaries:f.homesBuilt}
  if(!has(f,'hall'))return {kind:'hall'}
  if(f.homesBuilt<6){if(f.shipments<(f.homesBuilt===4?1:3))return {kind:'ship'};return {kind:T.homeBills[f.homesBuilt][0]>farmingCapacity(f)?'granary':'home',index:T.homeBills[f.homesBuilt][0]>farmingCapacity(f)?f.granaries:f.homesBuilt}}
  return {kind:'ship'}
}
export function farmingGranaryCost(f:Readonly<FarmingState>):FarmingRecipe{return {materials:Math.ceil(35*2**f.granaries),tools:Math.ceil(4*1.75**f.granaries)}}
export function farmingGoalRecipe(f:Readonly<FarmingState>,goal=farmingGoal(f)):{inputs:FarmingRecipe;work:number} {
  if(goal.kind==='home'||goal.kind==='repair'){const [food,materials,tools,work]=T.homeBills[goal.index!];return {inputs:{materials,tools,...(goal.kind==='home'?{food}:{})},work}}
  if(goal.kind==='granary')return {inputs:farmingGranaryCost(f),work:0}
  if(goal.kind==='ship')return {inputs:{food:350,goods:35},work:1890}
  return T.buildings[goal.kind]
}
const affordable=(f:Readonly<FarmingState>,cost:FarmingRecipe)=>Object.entries(cost).every(([id,n])=>f.resources[id as FarmingResource]+1e-8>=n!)
function pay(f:MutableFarming,cost:FarmingRecipe):boolean {if(!affordable(f,cost))return false;for(const [id,n]of Object.entries(cost))f.resources[id as FarmingResource]=Math.max(0,f.resources[id as FarmingResource]-n!);return true}
function repairReserve(f:Readonly<FarmingState>):FarmingRecipe {
  const active=f.jobs.build?.kind==='repair'?f.jobs.build.index:undefined
  const index=f.lostHomes.find(n=>n!==active)
  return index===undefined?{}:farmingGoalRecipe(f,{kind:'repair',index}).inputs
}
export function farmingGranaryPurchaseStatus(f:Readonly<FarmingState>):'ready'|'inactive'|'firstHome'|'maximum'|'inputs'|'repairReserve' {
  if(f.phase!=='farming')return 'inactive'
  if(f.homesBuilt<1)return 'firstHome'
  if(f.granaries>=40)return 'maximum'
  const cost=farmingGranaryCost(f),reserve=repairReserve(f)
  if(!affordable(f,cost))return 'inputs'
  return FARMING_RESOURCES.every(id=>f.resources[id]+1e-8>=(cost[id]??0)+(reserve[id]??0))?'ready':'repairReserve'
}
export const farmingCanBuyGranary=(f:Readonly<FarmingState>):boolean=>farmingGranaryPurchaseStatus(f)==='ready'
export const farmingManualGate=(f:Readonly<FarmingState>):boolean=>f.phase==='farming'&&(farmingComplete(f)||(farmingGoal(f).kind==='granary'&&farmingCanBuyGranary(f)))
export function startFarming(state:CanonicalGameStateV1):CanonicalGameStateV1|null {
  const c=state.civilization
  if(!c||c.farming||!civilizationOpeningComplete(c)||state.meta.reworkMigrationChoice===undefined||c.workers<3n)return null
  const baseline=c.populationBaseline<3n?c.populationBaseline:3n,workers=c.workers-3n,kits=c.equippedWorkers>workers?c.equippedWorkers-workers:0n
  const f:FarmingState={version:1,phase:'settling-forager',focus:'balanced',elapsedSeconds:0,tickRemainder:0,resources:{food:0,materials:0,tools:0,goods:0},targets:{food:0,materials:80,tools:0,goods:0},jobs:{},homes:[],lostHomes:[],homesBuilt:0,granaries:0,shipments:0,weathering:0,firstHarvest:false,completedBuildings:[],awardedCatalystIds:[],inheritedFoodPerMinute:0,inheritedMaterialsPerMinute:0,transferredWorkers:3n,transferredEquippedWorkers:kits,skillRewardPending:false}
  return settleForagerHandoff({...state,civilization:{...c,version:5,workers,populationBaseline:c.populationBaseline-baseline,populationGranted:c.populationGranted-(3n-baseline),equippedWorkers:c.equippedWorkers-kits,farming:f}})
}
/** The retained workforce becomes one no-input Gathering generator. Old stocks
 * remain owned by that camp; they are not a second village starter inventory. */
export function finishForagerHandoff(state:CanonicalGameStateV1):CanonicalGameStateV1 {
  const c=state.civilization!,f=c.farming!,gather=CIVILIZATION_ACTIVITIES.find(a=>a.id==='gathering')!
  const labor=Number(c.workers)+Number(c.equippedWorkers)*CIVILIZATION_TUNING.equipmentLabor
  const rate=(resource:'food'|'materials',units:number)=>Math.min(T.maximumExportPerMinute,labor*Number(gather.outputs[resource]??0n)*60/gather.seconds/units)
  return {...state,civilization:{...c,activities:Object.fromEntries(Object.entries(c.activities).map(([id,j])=>[id,{...j,workers:0n}])),farming:{...f,phase:'farming',inheritedFoodPerMinute:rate('food',T.exportFoodUnits),inheritedMaterialsPerMinute:rate('materials',T.exportMaterialUnits)}}}
}
export function buyFarmingGranary(state:CanonicalGameStateV1):CanonicalGameStateV1|null {
  const source=state.civilization?.farming;if(!source||!farmingCanBuyGranary(source))return null
  const f=clone(source);if(!pay(f,farmingGranaryCost(f)))return null;f.granaries++
  return {...state,civilization:{...state.civilization!,farming:f}}
}
export function setFarmingFocus(state:CanonicalGameStateV1,focus:string):CanonicalGameStateV1|null {
  const f=state.civilization?.farming
  if(!f||f.phase!=='farming'||!['balanced','provisioning','settlement','expeditions'].includes(focus)||focus===f.focus)return null
  return {...state,civilization:{...state.civilization!,farming:{...f,focus:focus as CivilizationFocus}}}
}
export function completeFarmingAge(state:CanonicalGameStateV1):CanonicalGameStateV1|null {
  const f=state.civilization?.farming;if(!f||f.phase!=='farming'||!farmingComplete(f))return null
  return {...state,civilization:{...state.civilization!,farming:{...f,phase:Object.keys(f.jobs).length?'settling-village':'complete'}}}
}
export function farmingRowUnlocked(f:Readonly<FarmingState>,row:FarmingRow):boolean {
  if(row==='fields'||row==='woodlot')return true
  if(row==='workshop'||row==='homes')return f.firstHarvest
  if(row==='pasture'||row==='kiln')return f.granaries>0
  if(row==='waterworks')return has(f,'kiln')
  return has(f,'hall')||(f.homesBuilt>=4&&has(f,'waterworks')&&has(f,'pasture'))
}
export function farmingJobForRow(f:Readonly<FarmingState>,row:FarmingRow):FarmingJob|undefined {
  if(row==='fields')return f.jobs.food
  if(row==='woodlot')return f.jobs.materials
  if(row==='workshop')return f.jobs.tools
  if(row==='homes')return ['home','repair'].includes(f.jobs.build?.kind??'')?f.jobs.build:undefined
  if(row==='kiln')return f.jobs.build?.kind==='kiln'?f.jobs.build:f.jobs.goods
  if(row==='hall')return f.jobs.build?.kind==='hall'?f.jobs.build:f.jobs.ship
  return f.jobs.build?.kind===row?f.jobs.build:undefined
}
export function farmingLaborShares(f:Readonly<FarmingState>):Record<string,number> {
  const focus=farmingEffectiveFocus(f),weights=T.weights[focus],total=Object.keys(f.jobs).reduce((sum,id)=>sum+weights[id as keyof typeof weights],0)
  return Object.fromEntries(Object.keys(f.jobs).map(id=>[id,total?farmingWorkers(f)*(1-T.upkeep[focus])*weights[id as keyof typeof weights]/total:0]))
}
function admit(f:MutableFarming) {
  const goal=farmingGoal(f),recipe=farmingGoalRecipe(f,goal)
  if(goal.kind!=='granary'&&!f.jobs.build&&!f.jobs.ship&&(goal.kind!=='home'||f.firstHarvest)&&pay(f,recipe.inputs)){
    const key=goal.kind==='ship'?'ship':'build'
    f.jobs[key]={kind:goal.kind,...(goal.index===undefined?{}:{index:goal.index}),work:recipe.work,remainingWork:recipe.work,inputs:{...recipe.inputs},output:0}
  }
  const target:Record<FarmingResource,number>={food:recipe.inputs.food??0,materials:recipe.inputs.materials??0,tools:recipe.inputs.tools??0,goods:recipe.inputs.goods??0}
  if(f.jobs.build||f.jobs.ship){target.food=Math.min(farmingCapacity(f),100);target.materials=80;target.tools=8;target.goods=has(f,'kiln')?20:0}
  target.materials+=3*Math.max(0,target.tools-f.resources.tools)+2*Math.max(0,target.goods-f.resources.goods)
  f.targets=target
  for(const id of FARMING_RESOURCES){if(f.jobs[id]||f.resources[id]>=target[id]-1e-8||id==='tools'&&!f.firstHarvest||id==='goods'&&!has(f,'kiln'))continue
    const inputs:FarmingRecipe=id==='tools'?{materials:6}:id==='goods'?{materials:4}:{}
    const work=id==='goods'?63:42
    const output=id==='food'?Math.min(12*(has(f,'pasture')?1.5:1)*(has(f,'waterworks')?1.25:1),Math.max(0,farmingCapacity(f)-f.resources.food)):id==='materials'?8:2
    if(output<=1e-8||!pay(f,inputs))continue
    f.jobs[id]={kind:id,work,remainingWork:work,inputs,output}
  }
}
function finishJob(f:MutableFarming,key:string) {
  const j=f.jobs[key];delete f.jobs[key]
  if(FARMING_RESOURCES.includes(j.kind as FarmingResource)){f.resources[j.kind as FarmingResource]+=j.output;if(j.kind==='food')f.firstHarvest=true}
  else if(j.kind==='home'){f.homes.push(j.index!);f.homesBuilt++}
  else if(j.kind==='repair'){f.homes.push(j.index!);f.lostHomes=f.lostHomes.filter(n=>n!==j.index)}
  else if(j.kind==='ship'){f.shipments++;f.resources.materials+=80}
  else f.completedBuildings.push(j.kind as FarmingBuilding)
}
function tick(f:MutableFarming,speed:number) {
  const dt=1/60,focus=farmingEffectiveFocus(f)
  if(f.phase==='farming'){
    const reserved=f.jobs.food?.output??0
    f.resources.food+=Math.max(0,Math.min(farmingCapacity(f)-f.resources.food-reserved,f.inheritedFoodPerMinute*dt*speed))
    f.resources.materials+=Math.max(0,Math.min(f.targets.materials-f.resources.materials,f.inheritedMaterialsPerMinute*dt*speed))
    const slope=T.weatherPerMinute[focus]
    f.weathering=Math.max(0,f.weathering+slope*dt*(slope>0&&has(f,'waterworks') ? .6 : 1))
    if(f.weathering>=100){const home=f.homes.pop();if(home!==undefined)f.lostHomes.push(home);f.weathering=40}
    if(!farmingComplete(f))admit(f)
  }
  const shares=farmingLaborShares(f)
  for(const key of Object.keys(f.jobs)){
    const j=f.jobs[key],remaining=j.remainingWork-(shares[key]??0)*speed
    f.jobs[key]={...j,remainingWork:Math.max(0,remaining)}
    if(remaining<=1e-9)finishJob(f,key)
  }
  if(f.phase==='settling-village'&&!Object.keys(f.jobs).length)f.phase='complete'
}
export function farmingMilestoneFlags(f:Readonly<FarmingState>):readonly boolean[]{return [f.homesBuilt>=1,has(f,'pasture')||has(f,'kiln'),has(f,'waterworks'),has(f,'hall'),f.shipments>=3,farmingComplete(f)]}
export function advanceFarming(state:CanonicalGameStateV1,seconds:number,stopAtManualGate=false):CanonicalGameStateV1 {
  const source=state.civilization?.farming;if(!source||source.phase==='settling-forager'||!Number.isFinite(seconds)||seconds<=0)return state
  const f=clone(source),speed=1+permanentFractureCount(state)*CIVILIZATION_TUNING.speedPerFracture
  const total=f.tickRemainder+(f.phase==='complete'?0:seconds),steps=Math.floor(total+1e-9)
  let advanced=0
  for(let n=0;n<steps;n++){if(stopAtManualGate&&farmingManualGate(f))break;if(f.phase==='complete')break;tick(f,speed);advanced++;f.elapsedSeconds++}
  f.tickRemainder=advanced===steps?Math.max(0,total-steps):0
  if(f.tickRemainder>=1)f.tickRemainder=0
  let challenges=state.challenges??EMPTY_INFINITY_CHALLENGES
  const flags=farmingMilestoneFlags(f),owed=flags.some((yes,i)=>yes&&!f.awardedCatalystIds.includes(`farming-catalyst-${i+1}`))
  const eligible=owed?eligibleCanonicalFractureIds(state).length:1
  f.skillRewardPending=owed&&(eligible===0||challenges.galvanizers===DISCRETE_MAXIMUM)
  if(eligible>0)for(const [i,yes]of flags.entries()){const id=`farming-catalyst-${i+1}`;if(yes&&!f.awardedCatalystIds.includes(id)&&challenges.galvanizers<DISCRETE_MAXIMUM){f.awardedCatalystIds.push(id);challenges={...challenges,galvanizers:challenges.galvanizers+1n,hasEarnedGalvanizer:true,unlocked:true}}}
  return {...state,civilization:{...state.civilization!,farming:f},challenges}
}
/** Preview only this owned economy, never a real save. Admission stays atomic:
 * the existing worker receives a smaller complete request and charges it once. */
export function farmingStoredTimeBudget(state:CanonicalGameStateV1,baseSeconds:number):number {
  if(!state.civilization?.farming||!Number.isFinite(baseSeconds)||baseSeconds<=0)return baseSeconds
  const gameSpeed=state.timeline.doubleTime.unlocked?2:1
  let candidate=state,used=0,limit=baseSeconds*gameSpeed
  while(candidate.civilization!.farming!.phase==='settling-forager'&&used<limit){const dt=Math.min(1,limit-used);candidate=advanceCivilization(candidate,dt);used+=dt}
  const f=candidate.civilization!.farming!
  if(f.phase==='complete'||farmingManualGate(f))return used/gameSpeed
  const before=f.elapsedSeconds,after=advanceFarming(candidate,limit-used,true).civilization!.farming!
  if(farmingManualGate(after)||after.phase==='complete')return Math.min(baseSeconds,(used+Math.max(0,after.elapsedSeconds-before-f.tickRemainder))/gameSpeed)
  return baseSeconds
}
export function validateFarming(value:unknown):string|null {
  if(!value||typeof value!=='object'||Array.isArray(value))return 'Invalid Farming state.'
  const f=value as FarmingState,n=(x:unknown)=>typeof x==='number'&&Number.isFinite(x)&&x>=0,integer=(x:unknown,max=Number.MAX_SAFE_INTEGER)=>n(x)&&Number.isInteger(x)&&Number(x)<=max
  if(f.version!==1||!['settling-forager','farming','settling-village','complete'].includes(f.phase)||!['balanced','provisioning','settlement','expeditions'].includes(f.focus)||!integer(f.elapsedSeconds)||!n(f.tickRemainder)||f.tickRemainder>=1||!n(f.weathering)||f.weathering>=100||!integer(f.homesBuilt,6)||!integer(f.granaries,40)||!integer(f.shipments,6)||typeof f.firstHarvest!=='boolean'||typeof f.skillRewardPending!=='boolean'||f.transferredWorkers!==3n||typeof f.transferredEquippedWorkers!=='bigint'||f.transferredEquippedWorkers<0n||f.transferredEquippedWorkers>3n||!n(f.inheritedFoodPerMinute)||f.inheritedFoodPerMinute>T.maximumExportPerMinute||!n(f.inheritedMaterialsPerMinute)||f.inheritedMaterialsPerMinute>T.maximumExportPerMinute)return 'Invalid Farming clock, population, focus or transfer.'
  for(const values of [f.resources,f.targets])if(!values||Object.keys(values).length!==4||!FARMING_RESOURCES.every(id=>n(values[id])))return 'Invalid Farming stock or demand.'
  if(f.resources.food+(f.jobs?.food?.output??0)>farmingCapacity(f)+1e-6)return 'Food exceeds unreserved storage.'
  if(!Array.isArray(f.homes)||!Array.isArray(f.lostHomes)||f.homes.length+f.lostHomes.length!==f.homesBuilt||new Set([...f.homes,...f.lostHomes]).size!==f.homesBuilt||[...f.homes,...f.lostHomes].some(x=>!integer(x,5)||x>=f.homesBuilt)||!Array.isArray(f.completedBuildings)||new Set(f.completedBuildings).size!==f.completedBuildings.length||f.completedBuildings.some(id=>!FARMING_BUILDINGS.includes(id))||!Array.isArray(f.awardedCatalystIds)||new Set(f.awardedCatalystIds).size!==f.awardedCatalystIds.length||f.awardedCatalystIds.some(id=>!/^farming-catalyst-[1-6]$/.test(id)))return 'Invalid Farming housing, facilities or rewards.'
  if(!f.jobs||Object.keys(f.jobs).some(id=>!['food','materials','tools','goods','build','ship'].includes(id))||Object.values(f.jobs).some(j=>!j||!['food','materials','tools','goods','home','repair','pasture','kiln','waterworks','hall','ship'].includes(j.kind)||!n(j.work)||j.work<=0||!n(j.remainingWork)||j.remainingWork>j.work||!n(j.output)||!j.inputs||Object.entries(j.inputs).some(([id,x])=>!FARMING_RESOURCES.includes(id as FarmingResource)||!n(x))||(['home','repair'].includes(j.kind)&&!integer(j.index,5))))return 'Invalid funded Farming work.'
  const sameRecipe=(a:FarmingRecipe,b:FarmingRecipe)=>Object.keys(a).length===Object.keys(b).length&&Object.entries(a).every(([id,n])=>b[id as FarmingResource]===n)
  for(const [key,j] of Object.entries(f.jobs)){
    let expected:{inputs:FarmingRecipe;work:number}
    if(key==='build'){
      if(!['home','repair',...FARMING_BUILDINGS].includes(j.kind))return 'Invalid construction receipt.'
      if(j.kind==='home'&&(j.index!==f.homesBuilt||!f.firstHarvest))return 'Invalid new Home receipt.'
      if(j.kind==='repair'&&!f.lostHomes.includes(j.index!))return 'Invalid repair receipt.'
      if(FARMING_BUILDINGS.includes(j.kind as FarmingBuilding)&&f.completedBuildings.includes(j.kind as FarmingBuilding))return 'Facility cannot be funded twice.'
      expected=farmingGoalRecipe(f,{kind:j.kind as FarmingGoal['kind'],index:j.index})
      if(j.output!==0)return 'Construction cannot carry inventory output.'
    }else if(key==='ship'){
      if(j.kind!=='ship'||!has(f,'hall')||f.shipments>=6||j.output!==0)return 'Invalid shipment receipt.'
      expected={inputs:{food:350,goods:35},work:1890}
    }else{
      if(j.kind!==key||key==='tools'&&!f.firstHarvest||key==='goods'&&!has(f,'kiln'))return 'Locked or mismatched production receipt.'
      expected={inputs:key==='tools'?{materials:6}:key==='goods'?{materials:4}:{},work:key==='goods'?63:42}
      const max=key==='food'?12*(has(f,'pasture')?1.5:1)*(has(f,'waterworks')?1.25:1):key==='materials'?8:2
      if(j.output<=0||j.output>max||key!=='food'&&j.output!==max)return 'Invalid reserved production output.'
    }
    if(j.work!==expected.work||!sameRecipe(j.inputs,expected.inputs))return 'Unknown funded Farming bill.'
  }
  if((f.phase==='settling-forager'||f.phase==='complete')&&Object.keys(f.jobs).length)return 'Inactive village cannot own unfinished work.'
  if(f.phase==='complete'&&!farmingComplete(f))return 'Village completion requires six supported Homes and connections.'
  return null
}
