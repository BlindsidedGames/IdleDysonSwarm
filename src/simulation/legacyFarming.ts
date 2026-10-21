import type { LegacyFarmingState as FarmingState, LegacyFarmingRecipe as FarmingRecipe, LegacyFarmingBuilding as FarmingBuilding, LegacyFarmingResource as FarmingResource } from '../game-state/types'

/** Approved Farming progression, including 10 October city-readiness projects. Work is worker-seconds, never a fixed timer. */
const T = Object.freeze({
  initialFoodCapacity: 80,
  granaryCapacity: 160,
  founders: 3,
  residentsPerHome: 2,
  homeBills: [
    [16,16,2,126], [100,90,6,420], [180,150,8,588],
    [280,220,10,756], [400,300,12,924], [550,400,14,1092],
  ] as const,
  buildings: {
    pasture: { inputs: { food:120,materials:120,tools:8 }, work:672 },
    kiln: { inputs: { materials:140,tools:10 }, work:840 },
    waterworks: { inputs: { materials:260,tools:18,goods:40 }, work:1344 },
    hall: { inputs: { materials:400,tools:24,goods:90 }, work:2016 },
    intensiveCultivation: { inputs: { materials:180,tools:12,goods:40 }, work:1260 },
    guildWorkshop: { inputs: { materials:250,tools:16,goods:60 }, work:1680 },
    townMarket: { inputs: { food:450,materials:320,tools:20,goods:80 }, work:2100 },
  },
  weights: {
    balanced: { food:1,materials:1,tools:.8,goods:.8,build:1.6,ship:1.3 },
    provisioning: { food:1.5,materials:1.5,tools:1.2,goods:1.2,build:1,ship:.8 },
    settlement: { food:.9,materials:.9,tools:.9,goods:.6,build:3,ship:.8 },
    expeditions: { food:.8,materials:.8,tools:.7,goods:.7,build:1,ship:3 },
  },
  weatherPerMinute: { balanced:-1,provisioning:2,settlement:-4,expeditions:4 },
  upkeep: { balanced:.15,provisioning:.04,settlement:.2,expeditions:.02 },
})

const FARMING_RESOURCES = ['food','materials','tools','goods'] as const
const FARMING_BUILDINGS = ['pasture','kiln','waterworks','hall','intensiveCultivation','guildWorkshop','townMarket'] as const
type FarmingRow = 'fields'|'woodlot'|'workshop'|'homes'|typeof FARMING_BUILDINGS[number]
type FarmingGoal = { kind:'home'|'repair'|'granary'|'ship'|FarmingBuilding; index?:number }
const has=(f:Readonly<FarmingState>,id:FarmingBuilding)=>f.completedBuildings.includes(id)
const farmingCapacity=(f:Readonly<FarmingState>)=>T.initialFoodCapacity+T.granaryCapacity*f.granaries
const farmingComplete=(f:Readonly<FarmingState>)=>has(f,'hall')&&has(f,'intensiveCultivation')&&has(f,'guildWorkshop')&&has(f,'townMarket')&&f.shipments>=6&&f.homes.length===6
function farmingGoal(f:Readonly<FarmingState>):FarmingGoal {
  if(f.lostHomes.length)return {kind:'repair',index:f.lostHomes[0]}
  if(f.homesBuilt===0)return {kind:'home',index:0}
  if(f.granaries===0)return {kind:'granary',index:0}
  if(f.focus==='settlement'&&f.homesBuilt<2)return {kind:'home',index:f.homesBuilt}
  const order:FarmingBuilding[]=f.focus==='provisioning'?['kiln','pasture']:['pasture','kiln']
  for(const id of order)if(!has(f,id))return {kind:id}
  if(f.homesBuilt<2)return {kind:'home',index:f.homesBuilt}
  if(!has(f,'waterworks'))return {kind:'waterworks'}
  if(!has(f,'intensiveCultivation'))return {kind:'intensiveCultivation'}
  if(f.homesBuilt<4)return {kind:T.homeBills[f.homesBuilt][0]>farmingCapacity(f)?'granary':'home',index:T.homeBills[f.homesBuilt][0]>farmingCapacity(f)?f.granaries:f.homesBuilt}
  if(!has(f,'hall'))return {kind:'hall'}
  if(f.homesBuilt>=5&&f.shipments>=3&&!has(f,'guildWorkshop'))return {kind:'guildWorkshop'}
  if(f.homesBuilt>=5&&f.shipments>=3&&!has(f,'townMarket'))return {kind:450>farmingCapacity(f)?'granary':'townMarket',index:f.granaries}
  if(f.homesBuilt<6){if(f.shipments<(f.homesBuilt===4?1:3))return {kind:'ship'};return {kind:T.homeBills[f.homesBuilt][0]>farmingCapacity(f)?'granary':'home',index:T.homeBills[f.homesBuilt][0]>farmingCapacity(f)?f.granaries:f.homesBuilt}}
  return {kind:'ship'}
}

function farmingGranaryCost(f:Readonly<FarmingState>):FarmingRecipe{return {materials:Math.ceil(35*2**f.granaries),tools:Math.ceil(4*1.75**f.granaries)}}
function farmingGoalRecipe(f:Readonly<FarmingState>,goal=farmingGoal(f)):{inputs:FarmingRecipe;work:number} {
  if(goal.kind==='home'||goal.kind==='repair'){const [food,materials,tools,work]=T.homeBills[goal.index!];return {inputs:{materials,tools,...(goal.kind==='home'?{food}:{})},work}}
  if(goal.kind==='granary')return {inputs:farmingGranaryCost(f),work:0}
  if(goal.kind==='ship')return {inputs:{food:350,goods:35},work:has(f,'townMarket')?1512:1890}
  return T.buildings[goal.kind]
}

function farmingRowUnlocked(f:Readonly<FarmingState>,row:FarmingRow):boolean {
  if(row==='fields'||row==='woodlot')return true
  if(row==='workshop'||row==='homes')return f.firstHarvest
  if(row==='pasture'||row==='kiln')return f.granaries>0
  if(row==='waterworks')return has(f,'kiln')
  if(row==='intensiveCultivation')return has(f,'waterworks')
  if(row==='guildWorkshop')return has(f,'hall')&&f.homesBuilt>=5&&f.shipments>=3
  if(row==='townMarket')return has(f,'intensiveCultivation')&&has(f,'guildWorkshop')&&f.homesBuilt>=5&&f.shipments>=3
  return has(f,'hall')||(f.homesBuilt>=4&&has(f,'waterworks')&&has(f,'pasture'))
}

export function validateLegacyFarming(value:unknown,version:1|2|3=3):string|null {
  if(!value||typeof value!=='object'||Array.isArray(value))return 'Invalid Farming state.'
  if(version!==1&&version!==2&&version!==3)return 'Unknown Farming version.'
  const f=value as FarmingState,n=(x:unknown)=>typeof x==='number'&&Number.isFinite(x)&&x>=0,integer=(x:unknown,max=Number.MAX_SAFE_INTEGER)=>n(x)&&Number.isInteger(x)&&Number(x)<=max
  const clockValid=version===1?integer(f.elapsedSeconds):n(f.elapsedSeconds)
  const phases=version===3?['farming','complete']:['settling-forager','farming','settling-village','complete']
  if(f.version!==version||!phases.includes(f.phase)||!['balanced','provisioning','settlement','expeditions'].includes(f.focus)||!clockValid||!n(f.tickRemainder)||f.tickRemainder>=1||!n(f.weathering)||f.weathering>=100||!integer(f.homesBuilt,6)||!integer(f.granaries,40)||!integer(f.shipments,6)||typeof f.firstHarvest!=='boolean'||typeof f.skillRewardPending!=='boolean')return 'Invalid Farming clock, population or focus.'
  const legacy=value as Record<string,unknown>,retired=['inheritedFoodPerMinute','inheritedMaterialsPerMinute','transferredWorkers','transferredEquippedWorkers']
  if(version<3&&(legacy.transferredWorkers!==3n||typeof legacy.transferredEquippedWorkers!=='bigint'||legacy.transferredEquippedWorkers<0n||legacy.transferredEquippedWorkers>3n||!n(legacy.inheritedFoodPerMinute)||Number(legacy.inheritedFoodPerMinute)>2.7||!n(legacy.inheritedMaterialsPerMinute)||Number(legacy.inheritedMaterialsPerMinute)>2.7))return 'Invalid legacy Farming transfer.'
  if(version===3&&retired.some(key=>key in legacy))return 'Farming cannot retain a previous-era income source.'
  if(f.cityReadinessReached!==undefined&&typeof f.cityReadinessReached!=='boolean')return 'Invalid Farming readiness history.'
  if(f.jobSequence!==undefined&&!integer(f.jobSequence))return 'Invalid Farming cycle identity.'
  if(f.continuous&&(!n(f.continuous.since)||f.continuous.since>f.elapsedSeconds||!n(f.continuous.weathering)||typeof f.continuous.signature!=='string'||!f.continuous.resources||!FARMING_RESOURCES.every(id=>n(f.continuous!.resources[id]))||!f.continuous.jobs||Object.values(f.continuous.jobs).some(x=>!n(x))))return 'Invalid Farming continuous clock.'
  for(const values of [f.resources,f.targets])if(!values||Object.keys(values).length!==4||!FARMING_RESOURCES.every(id=>n(values[id])))return 'Invalid Farming stock or demand.'
  if(f.resources.food+(f.jobs?.food?.output??0)>farmingCapacity(f)+1e-6)return 'Food exceeds unreserved storage.'
  if(!Array.isArray(f.homes)||!Array.isArray(f.lostHomes)||f.homes.length+f.lostHomes.length!==f.homesBuilt||new Set([...f.homes,...f.lostHomes]).size!==f.homesBuilt||[...f.homes,...f.lostHomes].some(x=>!integer(x,5)||x>=f.homesBuilt)||!Array.isArray(f.completedBuildings)||new Set(f.completedBuildings).size!==f.completedBuildings.length||f.completedBuildings.some(id=>!FARMING_BUILDINGS.includes(id))||!Array.isArray(f.awardedCatalystIds)||new Set(f.awardedCatalystIds).size!==f.awardedCatalystIds.length||f.awardedCatalystIds.some(id=>!/^farming-catalyst-[1-6]$/.test(id)))return 'Invalid Farming housing, facilities or rewards.'
  if(!f.jobs||Object.keys(f.jobs).some(id=>!['food','materials','tools','goods','build','ship'].includes(id))||Object.values(f.jobs).some(j=>!j||!['food','materials','tools','goods','home','repair',...FARMING_BUILDINGS,'ship'].includes(j.kind)||j.cycle!==undefined&&!integer(j.cycle)||!n(j.work)||j.work<=0||!n(j.remainingWork)||j.remainingWork>j.work||!n(j.output)||!j.inputs||Object.entries(j.inputs).some(([id,x])=>!FARMING_RESOURCES.includes(id as FarmingResource)||!n(x))||(['home','repair'].includes(j.kind)&&!integer(j.index,5))))return 'Invalid funded Farming work.'
  const sameRecipe=(a:FarmingRecipe,b:FarmingRecipe)=>Object.keys(a).length===Object.keys(b).length&&Object.entries(a).every(([id,n])=>b[id as FarmingResource]===n)
  for(const [key,j] of Object.entries(f.jobs)){
    let expected:{inputs:FarmingRecipe;work:number}
    if(key==='build'){
      if(!['home','repair',...FARMING_BUILDINGS].includes(j.kind))return 'Invalid construction receipt.'
      if(j.kind==='home'&&(j.index!==f.homesBuilt||!f.firstHarvest))return 'Invalid new Home receipt.'
      if(j.kind==='repair'&&!f.lostHomes.includes(j.index!))return 'Invalid repair receipt.'
      if(FARMING_BUILDINGS.includes(j.kind as FarmingBuilding)&&f.completedBuildings.includes(j.kind as FarmingBuilding))return 'Facility cannot be funded twice.'
      if(['intensiveCultivation','guildWorkshop','townMarket'].includes(j.kind)&&!farmingRowUnlocked(f,j.kind as FarmingRow))return 'City-readiness prerequisites are not established.'
      expected=farmingGoalRecipe(f,{kind:j.kind as FarmingGoal['kind'],index:j.index})
      if(j.output!==0)return 'Construction cannot carry inventory output.'
    }else if(key==='ship'){
      if(j.kind!=='ship'||!has(f,'hall')||f.shipments>=6||j.output!==(has(f,'townMarket')?100:80))return 'Invalid shipment receipt.'
      expected=farmingGoalRecipe(f,{kind:'ship'})
    }else{
      if(j.kind!==key||key==='tools'&&!f.firstHarvest||key==='goods'&&!has(f,'kiln'))return 'Locked or mismatched production receipt.'
      // A paid Goods cycle keeps its original bill/output when Guild finishes.
      const guildBatch=key==='goods'&&j.output===3&&has(f,'guildWorkshop')
      expected={inputs:key==='tools'?{materials:6}:key==='goods'?{materials:guildBatch?6:4}:{},work:key==='goods'?63:42}
      const max=key==='food'?12*(has(f,'pasture')?1.5:1)*(has(f,'waterworks')?1.25:1)*(has(f,'intensiveCultivation')?1.2:1):key==='materials'?8:key==='goods'&&guildBatch?3:2
      if(j.output<=0||j.output>max||key!=='food'&&j.output!==max)return 'Invalid reserved production output.'
    }
    if(j.work!==expected.work||!sameRecipe(j.inputs,expected.inputs))return 'Unknown funded Farming bill.'
  }
  if((legacy.phase==='settling-forager'||f.phase==='complete')&&Object.keys(f.jobs).length)return 'Inactive village cannot own unfinished work.'
  if(f.phase==='complete'&&!farmingComplete(f))return 'Village completion requires city-readiness upgrades, six supported Homes and connections.'
  return null
}
