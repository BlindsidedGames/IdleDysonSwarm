import { cloneCanonicalGameStateV2 } from '../game-state/cloneV2'
import type { CanonicalGameStateV2, DreamStateV2, DreamTimerId } from '../game-state/typesV2'
import { validateCanonicalGameStateV2 } from '../game-state/validateV2'
import {
  GAME_DECIMAL_ONE, GAME_DECIMAL_ZERO, addGameDecimals, ceilGameDecimal, cloneGameDecimal,
  compareGameDecimals, divideGameDecimals, equalGameDecimals, floorGameDecimal,
  gameDecimalFromNumber, gameDecimalToNumberChecked,
  isMaximumGameDecimal, isZeroGameDecimal, logGameDecimal, maxGameDecimal, minGameDecimal,
  multiplyGameDecimals, powGameDecimal, subtractGameDecimals, type GameDecimal,
} from '../math/gameDecimal'
import { DREAM_V2_CATALOG, type DreamUpgradeEffectV2, type DreamUpgradeIdV2 } from './dreamCatalogV2'
import { V2_FIXED_PRICE_BUY_MAX_BATCH_CAP, commitV2Purchase, quoteV2FixedPriceBuyMax, quoteV2Purchase, selectV2PurchaseBatches, type V2PurchaseMode, type V2PurchaseRejection } from './transactionsV2'

export const DREAM_V2_TIMER_DURATIONS = Object.freeze({
  hunterTimerProgress:3,gathererTimerProgress:3,communityTimerProgress:3,
  housingTimerProgress:20,villagesTimerProgress:12,workersTimerProgress:4,
  citiesTimerProgress:3,factoriesTimerProgress:30,botsTimerProgress:20,
  spaceFactoriesTimerProgress:2,
} satisfies Record<DreamTimerId,number>)
export const DREAM_V2_EDUCATION_IDS = Object.freeze(['engineering','shipping','worldTrade','worldPeace','mathematics','advancedPhysics'] as const)

export interface DreamV2AmountSummary { readonly community:GameDecimal;readonly housing:GameDecimal;readonly workers:GameDecimal;readonly factories:GameDecimal;readonly bots:GameDecimal;readonly rockets:GameDecimal }
export interface DreamV2AdvanceResult {readonly accepted:boolean;readonly changed:boolean;readonly state:CanonicalGameStateV2;readonly requested:DreamV2AmountSummary;readonly produced:DreamV2AmountSummary}
const ZERO_SUMMARY=summary({})

export interface DreamV2TimerPresentationFact {readonly timerId:DreamTimerId;readonly currentProgress:number;readonly durationSeconds:number;readonly progressPerSecond:GameDecimal;readonly cyclesPerSecond:GameDecimal;readonly secondsUntilNextCycle:number|null;readonly outputPerCycle:DreamV2AmountSummary;readonly outputPerSecond:DreamV2AmountSummary}
export interface DreamV2PresentationFacts {readonly foundationalInformation:{readonly production:{readonly timers:Readonly<Record<Exclude<DreamTimerId,'spaceFactoriesTimerProgress'>,DreamV2TimerPresentationFact>>;readonly productionPerSecond:DreamV2AmountSummary};readonly conversions:{readonly housingToVillages:GameDecimal;readonly villagesToCities:GameDecimal;readonly rocketsToSpaceFactories:GameDecimal}};readonly spaceAge:{readonly production:{readonly energy:{readonly solarPerSecond:GameDecimal;readonly fusionPerSecond:GameDecimal;readonly swarmPerSecond:GameDecimal;readonly beforeDoubleTimePerSecond:GameDecimal;readonly totalPerSecond:GameDecimal};readonly spaceFactory:{readonly active:boolean;readonly currentProgress:number;readonly durationSeconds:number;readonly progressPerSecond:GameDecimal;readonly cyclesPerSecond:GameDecimal;readonly secondsUntilNextCycle:number|null;readonly nominalPanelsPerSecond:GameDecimal;readonly overdriveMultiplier:GameDecimal;readonly overdriveEnergyPerSecond:GameDecimal}};readonly railgun:{readonly maximumCharge:GameDecimal;readonly mechanicalPayload:number;readonly payloadCapacity:number;readonly panelsPerShot:GameDecimal;readonly panelsPerVolley:GameDecimal;readonly shotsPerVolley:number;readonly factoryOverdriveMultiplier:GameDecimal;readonly factoryOverdriveEnergyPerSecond:GameDecimal;readonly factoryOverdriveActive:boolean}}}

/** No-time Dream presentation authority. Formula inputs are shared with the
 * V2 kernels below; no transition is executed and no positive interval is
 * probed. */
export function deriveDreamV2PresentationFacts(state:Readonly<CanonicalGameStateV2>,doubleTimeMultiplier:GameDecimal):Readonly<DreamV2PresentationFacts>{
  const r=state.dream.resources,p=state.dream.parameters,global=doubleTimeMultiplier
  const communityMultiplier=p.communityBoostClock>0?multiplyGameDecimals(global,gameDecimalFromNumber(2)):global
  const workerMultiplier=state.dream.upgrades.workerBoostAcivator&&!isZeroGameDecimal(r.workers)?multiplyGameDecimals(global,addGameDecimals(GAME_DECIMAL_ONE,logGameDecimal(r.workers,10))):global
  let factoryMultiplier=global;if(p.factoriesBoostClock>0)factoryMultiplier=multiplyGameDecimals(factoryMultiplier,gameDecimalFromNumber(2));if(state.dream.education.shipping.complete)factoryMultiplier=multiplyGameDecimals(factoryMultiplier,gameDecimalFromNumber(2));if(state.dream.education.worldTrade.complete)factoryMultiplier=multiplyGameDecimals(factoryMultiplier,gameDecimalFromNumber(2))
  let botBase=GAME_DECIMAL_ZERO;if(compareGameDecimals(r.bots,GAME_DECIMAL_ONE)>=0){botBase=addGameDecimals(GAME_DECIMAL_ONE,logGameDecimal(r.bots,10));if(compareGameDecimals(r.bots,gameDecimalFromNumber(100))<0)botBase=multiplyGameDecimals(botBase,divideGameDecimals(r.bots,gameDecimalFromNumber(100)))}let botMultiplier=global;if(state.dream.education.worldPeace.complete)botMultiplier=multiplyGameDecimals(botMultiplier,gameDecimalFromNumber(2));if(state.dream.upgrades.botsBoost1Activator)botMultiplier=multiplyGameDecimals(botMultiplier,gameDecimalFromNumber(2))
  const rates={hunterTimerProgress:standardRate(r.hunters,global),gathererTimerProgress:standardRate(r.gatherers,global),communityTimerProgress:standardRate(r.community,communityMultiplier),housingTimerProgress:standardRate(r.housing,global),villagesTimerProgress:standardRate(r.villages,global),workersTimerProgress:standardRate(r.workers,workerMultiplier),citiesTimerProgress:standardRate(r.cities,global),factoriesTimerProgress:standardRate(r.factories,factoryMultiplier),botsTimerProgress:multiplyGameDecimals(botBase,botMultiplier)} as const
  const yields={hunterTimerProgress:summary({community:GAME_DECIMAL_ONE}),gathererTimerProgress:summary({community:GAME_DECIMAL_ONE}),communityTimerProgress:summary({housing:GAME_DECIMAL_ONE}),housingTimerProgress:summary({workers:GAME_DECIMAL_ONE}),villagesTimerProgress:summary({workers:gameDecimalFromNumber(2)}),workersTimerProgress:summary({housing:GAME_DECIMAL_ONE}),citiesTimerProgress:summary({workers:gameDecimalFromNumber(5),factories:state.dream.education.engineering.complete?gameDecimalFromNumber(state.dream.upgrades.citiesBoostActivator?10:1):GAME_DECIMAL_ZERO}),factoriesTimerProgress:summary({bots:multiplyGameDecimals(r.factories,gameDecimalFromNumber(state.dream.upgrades.factoriesBoostActivator?9:1))}),botsTimerProgress:summary({rockets:gameDecimalFromNumber(state.dream.upgrades.botsBoost2Activator?2:1)})} as const
  const timers=Object.freeze(Object.fromEntries(Object.keys(rates).map(id=>{const key=id as keyof typeof rates,duration=DREAM_V2_TIMER_DURATIONS[key],progress=state.dream.timers[key],rate=rates[key],cycles=divideGameDecimals(rate,gameDecimalFromNumber(duration)),perCycle=yields[key];return[key,Object.freeze({timerId:key,currentProgress:progress,durationSeconds:duration,progressPerSecond:rate,cyclesPerSecond:cycles,secondsUntilNextCycle:isZeroGameDecimal(rate)?null:gameDecimalToNumberChecked(divideGameDecimals(gameDecimalFromNumber(duration-progress),rate),{minimum:0,maximum:Number.MAX_VALUE}),outputPerCycle:perCycle,outputPerSecond:scaleSummary(perCycle,cycles)})]}))) as unknown as DreamV2PresentationFacts['foundationalInformation']['production']['timers']
  let solar=multiplyGameDecimals(r.solarPanels,p.solarPanelGeneration);if(state.dream.education.mathematics.complete)solar=multiplyGameDecimals(solar,gameDecimalFromNumber(2));const fusion=multiplyGameDecimals(r.fusion,p.fusionGeneration),swarm=multiplyGameDecimals(r.swarmPanels,p.swarmPanelGeneration),before=addGameDecimals(addGameDecimals(solar,fusion),swarm),energy=multiplyGameDecimals(before,global)
  let baseProgress=GAME_DECIMAL_ZERO;if(compareGameDecimals(r.spaceFactories,GAME_DECIMAL_ONE)>=0){baseProgress=multiplyGameDecimals(addGameDecimals(GAME_DECIMAL_ONE,logGameDecimal(r.spaceFactories,10)),global);for(const key of ['sfActivator1','sfActivator2','sfActivator3'] as const)if(state.dream.upgrades[key])baseProgress=multiplyGameDecimals(baseProgress,gameDecimalFromNumber(2))}const throughput=deriveSpaceThroughputV2(state as CanonicalGameStateV2,divideGameDecimals(baseProgress,gameDecimalFromNumber(2)),global,energy),progressRate=multiplyGameDecimals(baseProgress,throughput.multiplier),cycles=divideGameDecimals(progressRate,gameDecimalFromNumber(2)),current=state.dream.timers.spaceFactoriesTimerProgress
  const conversions=conversionCountsV2(state)
  const maximumCharge=multiplyGameDecimals(p.railgunMaxCharge,gameDecimalFromNumber(throughput.mechanicalPayload)),panelsPerShot=gameDecimalFromNumber(throughput.mechanicalPayload)
  return Object.freeze({foundationalInformation:Object.freeze({production:Object.freeze({timers,productionPerSecond:sumTimerOutputs(timers)}),conversions}),spaceAge:Object.freeze({production:Object.freeze({energy:Object.freeze({solarPerSecond:solar,fusionPerSecond:fusion,swarmPerSecond:swarm,beforeDoubleTimePerSecond:before,totalPerSecond:energy}),spaceFactory:Object.freeze({active:compareGameDecimals(r.spaceFactories,GAME_DECIMAL_ONE)>=0,currentProgress:current,durationSeconds:2,progressPerSecond:progressRate,cyclesPerSecond:cycles,secondsUntilNextCycle:isZeroGameDecimal(progressRate)?null:gameDecimalToNumberChecked(divideGameDecimals(gameDecimalFromNumber(2-current),progressRate),{minimum:0,maximum:Number.MAX_VALUE}),nominalPanelsPerSecond:cycles,overdriveMultiplier:throughput.multiplier,overdriveEnergyPerSecond:throughput.overdriveEnergyPerSecond})}),railgun:Object.freeze({maximumCharge,mechanicalPayload:throughput.mechanicalPayload,payloadCapacity:throughput.mechanicalPayload,panelsPerShot,panelsPerVolley:multiplyGameDecimals(panelsPerShot,gameDecimalFromNumber(10)),shotsPerVolley:10,factoryOverdriveMultiplier:throughput.multiplier,factoryOverdriveEnergyPerSecond:throughput.overdriveEnergyPerSecond,factoryOverdriveActive:compareGameDecimals(throughput.multiplier,GAME_DECIMAL_ONE)>0})})})
}

function scaleSummary(value:DreamV2AmountSummary,multiplier:GameDecimal):DreamV2AmountSummary{return summary(Object.fromEntries(Object.entries(value).map(([key,amount])=>[key,multiplyGameDecimals(amount,multiplier)])) as Partial<DreamV2AmountSummary>)}
function sumTimerOutputs(timers:DreamV2PresentationFacts['foundationalInformation']['production']['timers']):DreamV2AmountSummary{const total={community:GAME_DECIMAL_ZERO,housing:GAME_DECIMAL_ZERO,workers:GAME_DECIMAL_ZERO,factories:GAME_DECIMAL_ZERO,bots:GAME_DECIMAL_ZERO,rockets:GAME_DECIMAL_ZERO};for(const timer of Object.values(timers))for(const key of Object.keys(total) as (keyof DreamV2AmountSummary)[])total[key]=addGameDecimals(total[key],timer.outputPerSecond[key]);return summary(total)}
function conversionCountsV2(state:Readonly<CanonicalGameStateV2>){const r=state.dream.resources,h=compareGameDecimals(r.housing,gameDecimalFromNumber(10))>=0?GAME_DECIMAL_ONE:GAME_DECIMAL_ZERO,v=compareGameDecimals(addGameDecimals(r.villages,h),gameDecimalFromNumber(25))>=0?GAME_DECIMAL_ONE:GAME_DECIMAL_ZERO,divisor=state.dream.parameters.rocketsPerSpaceFactory,rockets=isZeroGameDecimal(divisor)?GAME_DECIMAL_ZERO:minGameDecimal(floorGameDecimal(divideGameDecimals(r.rockets,divisor)),floorGameDecimal(r.factories));return Object.freeze({housingToVillages:h,villagesToCities:v,rocketsToSpaceFactories:rockets})}
const issuedCanonicalEventAuthorities=new WeakSet<object>(),issuedPreparedDreamStates=new WeakSet<object>()
export interface CanonicalDreamKernelAuthorityV2{readonly kind:'canonical-dream-kernel-v2'}
export function registerCanonicalDreamKernelAuthorityV2ForEventModel():Readonly<CanonicalDreamKernelAuthorityV2>{const authority=Object.freeze({kind:'canonical-dream-kernel-v2' as const});issuedCanonicalEventAuthorities.add(authority);return authority}
export function prepareCanonicalDreamKernelStateV2(authority:Readonly<CanonicalDreamKernelAuthorityV2>,state:CanonicalGameStateV2):CanonicalGameStateV2{if(!issuedCanonicalEventAuthorities.has(authority as object)||!Object.isFrozen(state))throw new TypeError('Prepared Dream kernel state requires event-model authority and a frozen admitted state.');issuedPreparedDreamStates.add(state);return state}

export function advanceDreamFoundationalV2(state:CanonicalGameStateV2,seconds:number,doubleTimeMultiplier:GameDecimal):DreamV2AdvanceResult{
  if(!admit(state)||!validSeconds(seconds)||!authorizedMultiplier(state,seconds,doubleTimeMultiplier))return advanceFailure(state)
  if((state.dream.parameters.communityBoostClock>0&&seconds>state.dream.parameters.communityBoostClock)||(state.dream.parameters.factoriesBoostClock>0&&seconds>state.dream.parameters.factoriesBoostClock))return advanceFailure(state)
  if(seconds===0)return Object.freeze({accepted:true,changed:false,state,requested:ZERO_SUMMARY,produced:ZERO_SUMMARY})
  const start=state.dream.resources; const timers={...state.dream.timers}; const global=doubleTimeMultiplier,span=gameDecimalFromNumber(seconds)
  const communityMultiplier=state.dream.parameters.communityBoostClock>0?multiplyGameDecimals(global,gameDecimalFromNumber(2)):global
  const workerMultiplier=state.dream.upgrades.workerBoostAcivator&&!isZeroGameDecimal(start.workers)?multiplyGameDecimals(global,addGameDecimals(GAME_DECIMAL_ONE,logGameDecimal(start.workers,10))):global
  let factoryMultiplier=global
  if(state.dream.parameters.factoriesBoostClock>0)factoryMultiplier=multiplyGameDecimals(factoryMultiplier,gameDecimalFromNumber(2))
  if(state.dream.education.shipping.complete)factoryMultiplier=multiplyGameDecimals(factoryMultiplier,gameDecimalFromNumber(2))
  if(state.dream.education.worldTrade.complete)factoryMultiplier=multiplyGameDecimals(factoryMultiplier,gameDecimalFromNumber(2))
  let botBase=cloneGameDecimal(GAME_DECIMAL_ZERO)
  if(compareGameDecimals(start.bots,GAME_DECIMAL_ONE)>=0){botBase=addGameDecimals(GAME_DECIMAL_ONE,logGameDecimal(start.bots,10));if(compareGameDecimals(start.bots,gameDecimalFromNumber(100))<0)botBase=multiplyGameDecimals(botBase,divideGameDecimals(start.bots,gameDecimalFromNumber(100)))}
  let botMultiplier=global
  if(state.dream.education.worldPeace.complete)botMultiplier=multiplyGameDecimals(botMultiplier,gameDecimalFromNumber(2))
  if(state.dream.upgrades.botsBoost1Activator)botMultiplier=multiplyGameDecimals(botMultiplier,gameDecimalFromNumber(2))
  const advances={
    hunterTimerProgress:timer(timers.hunterTimerProgress,DREAM_V2_TIMER_DURATIONS.hunterTimerProgress,multiplyGameDecimals(standardRate(start.hunters,global),span)),
    gathererTimerProgress:timer(timers.gathererTimerProgress,DREAM_V2_TIMER_DURATIONS.gathererTimerProgress,multiplyGameDecimals(standardRate(start.gatherers,global),span)),
    communityTimerProgress:timer(timers.communityTimerProgress,DREAM_V2_TIMER_DURATIONS.communityTimerProgress,multiplyGameDecimals(standardRate(start.community,communityMultiplier),span)),
    housingTimerProgress:timer(timers.housingTimerProgress,DREAM_V2_TIMER_DURATIONS.housingTimerProgress,multiplyGameDecimals(standardRate(start.housing,global),span)),
    villagesTimerProgress:timer(timers.villagesTimerProgress,DREAM_V2_TIMER_DURATIONS.villagesTimerProgress,multiplyGameDecimals(standardRate(start.villages,global),span)),
    workersTimerProgress:timer(timers.workersTimerProgress,DREAM_V2_TIMER_DURATIONS.workersTimerProgress,multiplyGameDecimals(standardRate(start.workers,workerMultiplier),span)),
    citiesTimerProgress:timer(timers.citiesTimerProgress,DREAM_V2_TIMER_DURATIONS.citiesTimerProgress,multiplyGameDecimals(standardRate(start.cities,global),span)),
    factoriesTimerProgress:timer(timers.factoriesTimerProgress,DREAM_V2_TIMER_DURATIONS.factoriesTimerProgress,multiplyGameDecimals(standardRate(start.factories,factoryMultiplier),span)),
    botsTimerProgress:timer(timers.botsTimerProgress,DREAM_V2_TIMER_DURATIONS.botsTimerProgress,multiplyGameDecimals(multiplyGameDecimals(botBase,botMultiplier),span)),
  }
  for(const [id,value] of Object.entries(advances))timers[id as DreamTimerId]=value.progress
  const requested=summary({
    community:addGameDecimals(advances.hunterTimerProgress.cycles,advances.gathererTimerProgress.cycles),
    housing:addGameDecimals(advances.communityTimerProgress.cycles,advances.workersTimerProgress.cycles),
    workers:addGameDecimals(addGameDecimals(advances.housingTimerProgress.cycles,multiplyGameDecimals(advances.villagesTimerProgress.cycles,gameDecimalFromNumber(2))),multiplyGameDecimals(advances.citiesTimerProgress.cycles,gameDecimalFromNumber(5))),
    factories:state.dream.education.engineering.complete?multiplyGameDecimals(advances.citiesTimerProgress.cycles,gameDecimalFromNumber(state.dream.upgrades.citiesBoostActivator?10:1)):GAME_DECIMAL_ZERO,
    bots:multiplyGameDecimals(advances.factoriesTimerProgress.cycles,multiplyGameDecimals(start.factories,gameDecimalFromNumber(state.dream.upgrades.factoriesBoostActivator?9:1))),
    rockets:multiplyGameDecimals(advances.botsTimerProgress.cycles,gameDecimalFromNumber(state.dream.upgrades.botsBoost2Activator?2:1)),
  })
  let community=start.community,housing=start.housing,workers=start.workers,factories=start.factories,bots=start.bots,rockets=start.rockets
  const hunterCommunity=addRepresented(community,advances.hunterTimerProgress.cycles);community=hunterCommunity.value
  const gathererCommunity=addRepresented(community,advances.gathererTimerProgress.cycles);community=gathererCommunity.value
  const communityHousing=addRepresented(housing,advances.communityTimerProgress.cycles);housing=communityHousing.value
  const workerHousing=addRepresented(housing,advances.workersTimerProgress.cycles);housing=workerHousing.value
  const housingWorkers=addRepresented(workers,advances.housingTimerProgress.cycles);workers=housingWorkers.value
  const villageWorkers=addRepresented(workers,multiplyGameDecimals(advances.villagesTimerProgress.cycles,gameDecimalFromNumber(2)));workers=villageWorkers.value
  const cityWorkers=addRepresented(workers,multiplyGameDecimals(advances.citiesTimerProgress.cycles,gameDecimalFromNumber(5)));workers=cityWorkers.value
  const factoryArrival=addRepresented(factories,requested.factories);factories=factoryArrival.value
  const botArrival=addRepresented(bots,requested.bots);bots=botArrival.value
  const rocketArrival=addRepresented(rockets,requested.rockets);rockets=rocketArrival.value
  const produced=summary({
    community:addGameDecimals(hunterCommunity.delta,gathererCommunity.delta),
    housing:addGameDecimals(communityHousing.delta,workerHousing.delta),
    workers:addGameDecimals(addGameDecimals(housingWorkers.delta,villageWorkers.delta),cityWorkers.delta),
    factories:factoryArrival.delta,bots:botArrival.delta,rockets:rocketArrival.delta,
  })
  const resources={...start,community,housing,workers,factories,bots,rockets}
  const communityClock=decrement(state.dream.parameters.communityBoostClock,seconds),factoriesClock=decrement(state.dream.parameters.factoriesBoostClock,seconds)
  const timerChanged=Object.entries(advances).some(([id,value])=>state.dream.timers[id as DreamTimerId]!==value.progress)
  const changed=timerChanged||communityClock!==state.dream.parameters.communityBoostClock||factoriesClock!==state.dream.parameters.factoriesBoostClock||Object.values(produced).some(value=>!isZeroGameDecimal(value))
  const candidate=changed?publish({...state,dream:{...state.dream,resources,timers,parameters:{...state.dream.parameters,communityBoostClock:communityClock,factoriesBoostClock:factoriesClock}}},state):state
  return Object.freeze({accepted:true,changed,state:candidate,requested,produced})
}

export interface DreamV2ConversionResult{readonly accepted:boolean;readonly changed:boolean;readonly state:CanonicalGameStateV2;readonly housingToVillages:GameDecimal;readonly villagesToCities:GameDecimal;readonly rocketsToSpaceFactories:GameDecimal}
export function runDreamConversionsV2(state:CanonicalGameStateV2):DreamV2ConversionResult{
  if(!admit(state))return Object.freeze({accepted:false,changed:false,state,housingToVillages:GAME_DECIMAL_ZERO,villagesToCities:GAME_DECIMAL_ZERO,rocketsToSpaceFactories:GAME_DECIMAL_ZERO})
  const source=state.dream.resources;let housing=source.housing,villages=source.villages,cities=source.cities,rockets=source.rockets,factories=source.factories,spaceFactories=source.spaceFactories
  let h=GAME_DECIMAL_ZERO,v=GAME_DECIMAL_ZERO,r=GAME_DECIMAL_ZERO
  const ten=gameDecimalFromNumber(10),twentyFive=gameDecimalFromNumber(25)
  if(compareGameDecimals(housing,ten)>=0){const exchange=atomicConversion(Object.freeze([{balance:housing,cost:ten}]),villages,GAME_DECIMAL_ONE);if(exchange!==null){housing=exchange.sources[0]!;villages=exchange.target;h=GAME_DECIMAL_ONE}}
  if(compareGameDecimals(villages,twentyFive)>=0){const exchange=atomicConversion(Object.freeze([{balance:villages,cost:twentyFive}]),cities,GAME_DECIMAL_ONE);if(exchange!==null){villages=exchange.sources[0]!;cities=exchange.target;v=GAME_DECIMAL_ONE}}
  const divisor=state.dream.parameters.rocketsPerSpaceFactory
  if(!isZeroGameDecimal(divisor)){const conversions=minGameDecimal(floorGameDecimal(divideGameDecimals(rockets,divisor)),floorGameDecimal(factories));if(!isZeroGameDecimal(conversions)){const exchange=atomicConversion(Object.freeze([{balance:rockets,cost:multiplyGameDecimals(conversions,divisor)},{balance:factories,cost:conversions}]),spaceFactories,conversions);if(exchange!==null){rockets=exchange.sources[0]!;factories=exchange.sources[1]!;spaceFactories=exchange.target;r=conversions}}}
  const changed=!isZeroGameDecimal(h)||!isZeroGameDecimal(v)||!isZeroGameDecimal(r)
  const candidate=changed?publish({...state,dream:{...state.dream,resources:{...source,housing,villages,cities,rockets,factories,spaceFactories}}},state):state
  return Object.freeze({accepted:true,changed,state:candidate,housingToVillages:cloneGameDecimal(h),villagesToCities:cloneGameDecimal(v),rocketsToSpaceFactories:cloneGameDecimal(r)})
}

export interface DreamV2EducationResult{readonly accepted:boolean;readonly changed:boolean;readonly state:CanonicalGameStateV2;readonly completed:readonly string[]}
export function advanceDreamEducationV2(state:CanonicalGameStateV2,seconds:number,multiplier:GameDecimal):DreamV2EducationResult{
  if(!admit(state)||!validSeconds(seconds)||!authorizedMultiplier(state,seconds,multiplier))return Object.freeze({accepted:false,changed:false,state,completed:Object.freeze([])})
  const increment=multiplyGameDecimals(gameDecimalFromNumber(seconds),multiplier);const education={...state.dream.education};const completed:string[]=[];let changed=false
  for(const id of DREAM_V2_EDUCATION_IDS){const subject=education[id];if(!subject.active||subject.complete)continue;const progress=addGameDecimals(subject.progress,increment);const complete=compareGameDecimals(progress,gameDecimalFromNumber(subject.researchTime))>=0;education[id]={...subject,progress,complete};changed=changed||!equalGameDecimals(progress,subject.progress)||complete!==subject.complete;if(complete&&!subject.complete)completed.push(id)}
  if(!changed)return Object.freeze({accepted:true,changed:false,state,completed:Object.freeze(completed)})
  let candidate:CanonicalGameStateV2={...state,dream:{...state.dream,education}}
  if(completed.includes('mathematics'))candidate={...candidate,dream:{...candidate.dream,parameters:{...candidate.dream.parameters,solarPanelGeneration:maxGameDecimal(candidate.dream.parameters.solarPanelGeneration,gameDecimalFromNumber(200))}}}
  return Object.freeze({accepted:true,changed:true,state:publish(candidate,state),completed:Object.freeze(completed)})
}

export interface DreamV2SpaceAgeResult{readonly accepted:boolean;readonly changed:boolean;readonly state:CanonicalGameStateV2;readonly requestedEnergyGenerated:GameDecimal;readonly energyGenerated:GameDecimal;readonly overdriveEnergyConsumed:GameDecimal;readonly factoryCycles:GameDecimal;readonly panelsProduced:GameDecimal}
export function advanceDreamSpaceAgeV2(state:CanonicalGameStateV2,seconds:number,doubleTimeMultiplier:GameDecimal):DreamV2SpaceAgeResult{
  if(!admit(state)||!validSeconds(seconds)||!authorizedMultiplier(state,seconds,doubleTimeMultiplier))return spaceFailure(state)
  if(seconds===0)return Object.freeze({accepted:true,changed:false,state,requestedEnergyGenerated:GAME_DECIMAL_ZERO,energyGenerated:GAME_DECIMAL_ZERO,overdriveEnergyConsumed:GAME_DECIMAL_ZERO,factoryCycles:GAME_DECIMAL_ZERO,panelsProduced:GAME_DECIMAL_ZERO})
  const start=state.dream.resources;const span=gameDecimalFromNumber(seconds)
  let solarRate=multiplyGameDecimals(start.solarPanels,state.dream.parameters.solarPanelGeneration)
  if(state.dream.education.mathematics.complete)solarRate=multiplyGameDecimals(solarRate,gameDecimalFromNumber(2))
  const fusionRate=multiplyGameDecimals(start.fusion,state.dream.parameters.fusionGeneration)
  const swarmRate=multiplyGameDecimals(start.swarmPanels,state.dream.parameters.swarmPanelGeneration)
  const energyRate=multiplyGameDecimals(addGameDecimals(addGameDecimals(solarRate,fusionRate),swarmRate),doubleTimeMultiplier)
  const requestedEnergyGenerated=multiplyGameDecimals(energyRate,span)
  let baseProgressRate=GAME_DECIMAL_ZERO
  if(compareGameDecimals(start.spaceFactories,GAME_DECIMAL_ONE)>=0){baseProgressRate=multiplyGameDecimals(addGameDecimals(GAME_DECIMAL_ONE,logGameDecimal(start.spaceFactories,10)),doubleTimeMultiplier);for(const key of ['sfActivator1','sfActivator2','sfActivator3'] as const)if(state.dream.upgrades[key])baseProgressRate=multiplyGameDecimals(baseProgressRate,gameDecimalFromNumber(2))}
  const throughput=deriveSpaceThroughputV2(state,divideGameDecimals(baseProgressRate,gameDecimalFromNumber(2)),doubleTimeMultiplier,energyRate)
  const overdriveMultiplier=throughput.multiplier
  const requestedOverdrive=multiplyGameDecimals(throughput.overdriveEnergyPerSecond,span)
  const requestedConsumed=minGameDecimal(start.energy,requestedOverdrive),energyAfterOverdrive=subtractGameDecimals(start.energy,requestedConsumed),consumed=subtractGameDecimals(start.energy,energyAfterOverdrive)
  const deliveredMultiplier=isZeroGameDecimal(requestedOverdrive)?GAME_DECIMAL_ONE:addGameDecimals(GAME_DECIMAL_ONE,multiplyGameDecimals(subtractGameDecimals(overdriveMultiplier,GAME_DECIMAL_ONE),divideGameDecimals(consumed,requestedOverdrive)))
  const accumulated=addGameDecimals(gameDecimalFromNumber(state.dream.timers.spaceFactoriesTimerProgress),multiplyGameDecimals(multiplyGameDecimals(baseProgressRate,deliveredMultiplier),span))
  const cycles=floorGameDecimal(divideGameDecimals(accumulated,gameDecimalFromNumber(2)))
  const progress=subtractGameDecimals(accumulated,multiplyGameDecimals(cycles,gameDecimalFromNumber(2)))
  const nextPanels=addGameDecimals(start.dysonPanels,cycles);const representedPanels=subtractGameDecimals(nextPanels,start.dysonPanels)
  const nextEnergy=addGameDecimals(energyAfterOverdrive,requestedEnergyGenerated),energyGenerated=subtractGameDecimals(nextEnergy,energyAfterOverdrive)
  const nextProgress=gameDecimalToNumberChecked(progress,{minimum:0,maximum:2})
  const changed=!equalGameDecimals(start.energy,nextEnergy)||!isZeroGameDecimal(representedPanels)||state.dream.timers.spaceFactoriesTimerProgress!==nextProgress
  const candidate=changed?publish({...state,dream:{...state.dream,resources:{...start,energy:nextEnergy,dysonPanels:nextPanels},timers:{...state.dream.timers,spaceFactoriesTimerProgress:nextProgress},railgun:{...state.dream.railgun,highestStoredPanels:maxGameDecimal(state.dream.railgun.highestStoredPanels,nextPanels)}}},state):state
  return Object.freeze({accepted:true,changed,state:candidate,requestedEnergyGenerated,energyGenerated,overdriveEnergyConsumed:consumed,factoryCycles:cycles,panelsProduced:representedPanels})
}

export interface DreamV2RailgunResult{readonly accepted:boolean;readonly changed:boolean;readonly state:CanonicalGameStateV2;readonly chargeTransferred:GameDecimal;readonly roundsFired:number;readonly panelsLaunched:GameDecimal}
export function advanceDreamRailgunV2(state:CanonicalGameStateV2,seconds:number,timeMultiplier:GameDecimal):DreamV2RailgunResult{
  if(!admit(state)||!validSeconds(seconds)||seconds===0||seconds>1||!authorizedMultiplier(state,seconds,timeMultiplier))return railgunFailure(state)
  const source=state.dream.resources,rail=state.dream.railgun,maxPerRailgun=state.dream.parameters.railgunMaxCharge
  if(isZeroGameDecimal(maxPerRailgun)||rail.fireProgress>=.1)return railgunFailure(state)
  let energy=source.energy,charge=source.railgunCharge,dyson=source.dysonPanels,swarm=source.swarmPanels,reserved=rail.reservedPanels
  let firing=rail.firing,shots=rail.shotsRemaining,active=rail.activeRailguns,progress=rail.fireProgress,transferred=GAME_DECIMAL_ZERO
  progress+=gameDecimalToNumberChecked(multiplyGameDecimals(gameDecimalFromNumber(seconds),timeMultiplier),{minimum:0,maximum:11})
  let rounds=0,launched=GAME_DECIMAL_ZERO
  for(let boundary=0;boundary<112;boundary+=1){
    if(!firing){
      if(!isZeroGameDecimal(reserved)){const release=atomicMove(reserved,dyson,reserved);if(release===null)break;reserved=release.source;dyson=release.target}
      const throughput=deriveCurrentSpaceThroughputV2(state,Object.freeze({...source,energy,railgunCharge:charge,dysonPanels:dyson,swarmPanels:swarm}),timeMultiplier)
      const target=throughput.mechanicalPayload,targetMaximum=multiplyGameDecimals(maxPerRailgun,gameDecimalFromNumber(target))
      if(compareGameDecimals(charge,targetMaximum)>0){const refund=atomicMove(charge,energy,subtractGameDecimals(charge,targetMaximum));if(refund!==null){charge=refund.source;energy=refund.target}}
      if(compareGameDecimals(charge,targetMaximum)<0){const room=subtractGameDecimals(targetMaximum,charge),transfer=atomicMove(energy,charge,minGameDecimal(energy,room));if(transfer!==null){energy=transfer.source;charge=transfer.target;transferred=addGameDecimals(transferred,transfer.amount)}}
      const payload=minGameDecimal(gameDecimalFromNumber(target),minGameDecimal(floorGameDecimal(divideGameDecimals(dyson,gameDecimalFromNumber(10))),floorGameDecimal(divideGameDecimals(charge,maxPerRailgun))))
      if(isZeroGameDecimal(payload)){progress=0;break}
      const requestedReserve=multiplyGameDecimals(payload,gameDecimalFromNumber(10)),reservation=atomicMove(dyson,reserved,requestedReserve)
      if(reservation===null||!equalGameDecimals(reservation.amount,requestedReserve)){progress=0;break}
      dyson=reservation.source;reserved=reservation.target;active=checkedPayload(payload);firing=true;shots=10
    }
    const due=Math.min(shots,Math.floor((progress+Number.EPSILON*8)/.1));if(due<=0)break
    const perRound=gameDecimalFromNumber(active),chargePerRound=divideGameDecimals(multiplyGameDecimals(maxPerRailgun,perRound),gameDecimalFromNumber(10)),supportedCharge=boundedRounds(floorGameDecimal(divideGameDecimals(charge,chargePerRound))),supportedPanels=boundedRounds(floorGameDecimal(divideGameDecimals(reserved,perRound))),settled=Math.min(due,supportedCharge,supportedPanels)
    if(settled<=0)break
    const panelDebit=multiplyGameDecimals(perRound,gameDecimalFromNumber(settled)),chargeDebit=multiplyGameDecimals(chargePerRound,gameDecimalFromNumber(settled)),nextCharge=subtractGameDecimals(charge,chargeDebit),panelMove=atomicMove(reserved,swarm,panelDebit)
    if(!equalGameDecimals(subtractGameDecimals(charge,nextCharge),chargeDebit)||panelMove===null||!equalGameDecimals(panelMove.amount,panelDebit))break
    charge=nextCharge;reserved=panelMove.source;swarm=panelMove.target;rounds+=settled;launched=addGameDecimals(launched,panelMove.amount);shots-=settled;progress-=settled*.1
    if(shots===0){if(!isZeroGameDecimal(reserved))break;firing=false;active=0;progress=Math.max(0,progress)}
  }
  if(!firing){shots=0;active=0;reserved=GAME_DECIMAL_ZERO;if(progress<.1)progress=0}
  const changed=!equalGameDecimals(energy,source.energy)||!equalGameDecimals(charge,source.railgunCharge)||!equalGameDecimals(dyson,source.dysonPanels)||!isZeroGameDecimal(launched)||firing!==rail.firing||progress!==rail.fireProgress
  const candidate=changed?publish({...state,dream:{...state.dream,resources:{...source,energy,railgunCharge:charge,dysonPanels:dyson,swarmPanels:swarm},railgun:{...rail,firing,fireProgress:progress,shotsRemaining:shots,activeRailguns:active,reservedPanels:reserved,lastRoundsFired:rounds,lastPanelsLaunched:launched}}},state):state
  return Object.freeze({accepted:true,changed,state:candidate,chargeTransferred:transferred,roundsFired:rounds,panelsLaunched:launched})
}

export function applyDreamUpgradeEffectsV2(state:CanonicalGameStateV2,id:DreamUpgradeIdV2):CanonicalGameStateV2|null{
  if(!admit(state)||typeof id!=='string'||!Object.hasOwn(DREAM_V2_CATALOG,id))return null;const definition=DREAM_V2_CATALOG[id];if(state.dream.upgrades[id]||definition.prerequisites.some(p=>state.dream.upgrades[p.key]!==p.mustBeOwned)||isMaximumGameDecimal(definition.cost)||compareGameDecimals(state.dream.strangeMatter,definition.cost)<0)return null
  let candidate:CanonicalGameStateV2=state;for(const effect of definition.effects)candidate=applyEffect(candidate,effect)
  const strangeMatter=subtractGameDecimals(candidate.dream.strangeMatter,definition.cost);if(!purchaseDebitAllowed(candidate.dream.strangeMatter,strangeMatter,definition.cost))return null;candidate={...candidate,dream:{...candidate.dream,strangeMatter}};return publish(candidate,state)
}

export type DreamInfluencePurchaseIdV2='hunters'|'gatherers'|'solar'|'fusion'
export interface DreamInfluencePurchaseResultV2{readonly accepted:boolean;readonly changed:boolean;readonly state:CanonicalGameStateV2;readonly purchaseId:DreamInfluencePurchaseIdV2;readonly requestedMode:V2PurchaseMode;readonly rejection:V2PurchaseRejection;readonly batches:GameDecimal;readonly unitsGranted:GameDecimal;readonly quotedCost:GameDecimal;readonly debited:GameDecimal;readonly buyMaxBatchCap:GameDecimal|null;readonly reachedBuyMaxBatchCap:boolean}
export function purchaseDreamInfluenceV2(state:CanonicalGameStateV2,id:DreamInfluencePurchaseIdV2,mode:V2PurchaseMode):DreamInfluencePurchaseResultV2{
  if(!admit(state)||!['hunters','gatherers','solar','fusion'].includes(id)||!['buy-1','buy-10','buy-50','buy-100','buy-max'].includes(mode))return influenceFailure(state,id,mode)
  const resource=id==='hunters'?'hunters':id==='gatherers'?'gatherers':id==='solar'?'solarPanels':'fusion';const price=id==='hunters'?state.dream.parameters.hunterCost:id==='gatherers'?state.dream.parameters.gathererCost:id==='solar'?state.dream.parameters.solarCost:state.dream.parameters.fusionCost;const units=id==='hunters'?state.dream.huntersPerPurchase:id==='gatherers'?state.dream.gatherersPerPurchase:GAME_DECIMAL_ONE
  if(isZeroGameDecimal(price)||isZeroGameDecimal(units))return influenceFailure(state,id,mode)
  const common={currencyPath:'$.reality.influence',sourceRevision:0,balance:state.reality.influence,balanceSemantic:'integer' as const,output:state.dream.resources[resource],outputSemantic:'integer' as const,unitsPerPurchase:units,integerCost:true,negligibleDebitPolicy:'allow-for-purchase' as const}
  const quote=mode==='buy-max'?quoteV2FixedPriceBuyMax({...common,pricePerBatch:price}):quoteV2Purchase({...common,requestedMode:mode,batches:selectV2PurchaseBatches({mode,rounded:false,currentOwned:floorGameDecimal(divideGameDecimals(common.output,units)),affordable:floorGameDecimal(divideGameDecimals(common.balance,price))}),quotedCost:multiplyGameDecimals(price,selectV2PurchaseBatches({mode,rounded:false,currentOwned:floorGameDecimal(divideGameDecimals(common.output,units)),affordable:floorGameDecimal(divideGameDecimals(common.balance,price))}))})
  if(!quote.accepted)return influenceFailure(state,id,mode,quote.rejection,quote.quotedCost)
  const committed=commitV2Purchase(quote,{revision:0,balance:state.reality.influence,output:state.dream.resources[resource]});if(!committed.accepted)return influenceFailure(state,id,mode,committed.rejection,committed.quotedCost)
  const candidate=committed.changed?publish({...state,reality:{...state.reality,influence:committed.balance},dream:{...state.dream,resources:{...state.dream.resources,[resource]:committed.output}}},state):state
  return Object.freeze({accepted:true,changed:committed.changed,state:candidate,purchaseId:id,requestedMode:mode,rejection:'none' as const,batches:quote.batches,unitsGranted:quote.unitsGranted,quotedCost:quote.quotedCost,debited:committed.debitedAmount,buyMaxBatchCap:mode==='buy-max'?V2_FIXED_PRICE_BUY_MAX_BATCH_CAP:null,reachedBuyMaxBatchCap:mode==='buy-max'&&equalGameDecimals(quote.batches,V2_FIXED_PRICE_BUY_MAX_BATCH_CAP)})
}

export const DREAM_INFLUENCE_PURCHASE_MODES_V2=Object.freeze(['buy-1','buy-10','buy-50','buy-100','buy-max'] as const satisfies readonly V2PurchaseMode[])
export type DreamInfluencePurchasePreviewV2 = Readonly<Pick<
  DreamInfluencePurchaseResultV2,
  | 'accepted'
  | 'purchaseId'
  | 'requestedMode'
  | 'rejection'
  | 'batches'
  | 'unitsGranted'
  | 'quotedCost'
  | 'buyMaxBatchCap'
  | 'reachedBuyMaxBatchCap'
>>

export function previewDreamInfluencePurchaseModesV2(
  state: CanonicalGameStateV2,
  id: DreamInfluencePurchaseIdV2,
): readonly DreamInfluencePurchasePreviewV2[] {
  if (!admit(state) || !['hunters','gatherers','solar','fusion'].includes(id)) {
    return Object.freeze([])
  }
  return Object.freeze(DREAM_INFLUENCE_PURCHASE_MODES_V2.map((mode) =>
    previewDreamInfluencePurchaseModeAdmitted(state, id, mode),
  ))
}

function previewDreamInfluencePurchaseModeAdmitted(
  state: CanonicalGameStateV2,
  id: DreamInfluencePurchaseIdV2,
  mode: V2PurchaseMode,
): DreamInfluencePurchasePreviewV2 {
  const resource=id==='hunters'?'hunters':id==='gatherers'?'gatherers':id==='solar'?'solarPanels':'fusion'
  const price=id==='hunters'?state.dream.parameters.hunterCost:id==='gatherers'?state.dream.parameters.gathererCost:id==='solar'?state.dream.parameters.solarCost:state.dream.parameters.fusionCost
  const units=id==='hunters'?state.dream.huntersPerPurchase:id==='gatherers'?state.dream.gatherersPerPurchase:GAME_DECIMAL_ONE
  const failed = (): DreamInfluencePurchasePreviewV2 => Object.freeze({
    accepted:false,purchaseId:id,requestedMode:mode,rejection:'invalid-request',batches:GAME_DECIMAL_ZERO,
    unitsGranted:GAME_DECIMAL_ZERO,quotedCost:GAME_DECIMAL_ZERO,
    buyMaxBatchCap:mode==='buy-max'?V2_FIXED_PRICE_BUY_MAX_BATCH_CAP:null,
    reachedBuyMaxBatchCap:false,
  })
  if(isZeroGameDecimal(price)||isZeroGameDecimal(units))return failed()
  const common={currencyPath:'$.reality.influence',sourceRevision:0,balance:state.reality.influence,balanceSemantic:'integer' as const,output:state.dream.resources[resource],outputSemantic:'integer' as const,unitsPerPurchase:units,integerCost:true,negligibleDebitPolicy:'allow-for-purchase' as const}
  const affordable=floorGameDecimal(divideGameDecimals(common.balance,price))
  const currentOwned=floorGameDecimal(divideGameDecimals(common.output,units))
  const batches=selectV2PurchaseBatches({mode,rounded:false,currentOwned,affordable})
  const quote=mode==='buy-max'?quoteV2FixedPriceBuyMax({...common,pricePerBatch:price}):quoteV2Purchase({...common,requestedMode:mode,batches,quotedCost:multiplyGameDecimals(price,batches)})
  if(!quote.accepted)return Object.freeze({
    ...failed(),rejection:quote.rejection,quotedCost:quote.quotedCost,
  })
  return Object.freeze({
    accepted:true,purchaseId:id,requestedMode:mode,rejection:'none' as const,batches:quote.batches,
    unitsGranted:quote.unitsGranted,quotedCost:quote.quotedCost,
    buyMaxBatchCap:mode==='buy-max'?V2_FIXED_PRICE_BUY_MAX_BATCH_CAP:null,
    reachedBuyMaxBatchCap:mode==='buy-max'&&equalGameDecimals(quote.batches,V2_FIXED_PRICE_BUY_MAX_BATCH_CAP),
  })
}

export function startDreamEducationV2(state:CanonicalGameStateV2,id:keyof DreamStateV2['education']):CanonicalGameStateV2|null{
  if(!admit(state)||!DREAM_V2_EDUCATION_IDS.includes(id as never))return null;const subject=state.dream.education[id];if(subject.active||isMaximumGameDecimal(subject.cost)||compareGameDecimals(state.reality.influence,subject.cost)<0)return null;const influence=subtractGameDecimals(state.reality.influence,subject.cost);if(!purchaseDebitAllowed(state.reality.influence,influence,subject.cost))return null;return publish({...state,reality:{...state.reality,influence},dream:{...state.dream,education:{...state.dream.education,[id]:{...subject,active:true}}}},state)
}

export function activateDreamBoostV2(state:CanonicalGameStateV2,id:'community'|'factories'):CanonicalGameStateV2|null{
  if(!admit(state)||(id!=='community'&&id!=='factories'))return null;const p=state.dream.parameters;const community=id==='community';const clock=community?p.communityBoostClock:p.factoriesBoostClock;if(clock>=10)return null;const unlocked=community?compareGameDecimals(state.dream.resources.hunters,GAME_DECIMAL_ONE)>=0||compareGameDecimals(state.dream.resources.gatherers,GAME_DECIMAL_ONE)>=0:compareGameDecimals(state.dream.resources.cities,GAME_DECIMAL_ONE)>=0&&state.dream.education.engineering.complete;if(!unlocked)return null;const free=community&&p.communityBoostIsFree;const cost=community?p.communityBoostCost:p.factoriesBoostCost;if(!free&&(isMaximumGameDecimal(cost)||compareGameDecimals(state.reality.influence,cost)<0))return null;const influence=free?state.reality.influence:subtractGameDecimals(state.reality.influence,cost);if(!free&&!purchaseDebitAllowed(state.reality.influence,influence,cost))return null;const parameters=community?{...p,communityBoostClock:p.communityBoostDuration}:{...p,factoriesBoostClock:p.factoriesBoostDuration};return publish({...state,reality:{...state.reality,influence},dream:{...state.dream,parameters}},state)
}

function applyEffect(state:CanonicalGameStateV2,e:DreamUpgradeEffectV2):CanonicalGameStateV2{
  if(e.effectType===0||e.effectType===1)return {...state,dream:{...state.dream,upgrades:{...state.dream.upgrades,[e.targetKey]:e.boolValue}}}
  if(e.effectType===3){const id=educationId(e.targetKey,'Complete');return {...state,dream:{...state.dream,education:{...state.dream.education,[id]:{...state.dream.education[id],complete:e.boolValue}}}}}
  if(e.effectType===4){if(e.targetKey==='rocketsPerSpaceFactory')return {...state,dream:{...state.dream,parameters:{...state.dream.parameters,rocketsPerSpaceFactory:gameDecimalFromNumber(e.numericValue)}}};const id=educationId(e.targetKey,'ResearchTime');return {...state,dream:{...state.dream,education:{...state.dream.education,[id]:{...state.dream.education[id],researchTime:e.numericValue}}}}}
  if(e.effectType===5)return {...state,dream:{...state.dream,[e.targetKey]:gameDecimalFromNumber(e.numericValue)}}
  if(e.effectType===7)return {...state,dream:{...state.dream,[e.targetKey]:maxGameDecimal(state.dream[e.targetKey as 'huntersPerPurchase'|'gatherersPerPurchase'],gameDecimalFromNumber(e.numericValue))}}
  if(e.effectType===6){if(e.targetKey==='solarPanelGeneration')return {...state,dream:{...state.dream,parameters:{...state.dream.parameters,solarPanelGeneration:maxGameDecimal(state.dream.parameters.solarPanelGeneration,gameDecimalFromNumber(e.numericValue))}}};const key=e.targetKey as 'hunters'|'gatherers';return {...state,dream:{...state.dream,resources:{...state.dream.resources,[key]:maxGameDecimal(state.dream.resources[key],gameDecimalFromNumber(e.numericValue))}}}}
  if(e.effectType===8)return {...state,dream:{...state.dream,disasterStage:BigInt(e.numericValue)}}
  throw new RangeError('Unsupported Dream V2 catalog effect.')
}

function timer(current:number,duration:number,advance:GameDecimal):{cycles:GameDecimal;progress:number}{const total=addGameDecimals(gameDecimalFromNumber(current),advance),period=gameDecimalFromNumber(duration);let cycles=floorGameDecimal(divideGameDecimals(total,period)),represented=multiplyGameDecimals(cycles,period);if(compareGameDecimals(represented,total)>0&&compareGameDecimals(cycles,GAME_DECIMAL_ZERO)>0){cycles=subtractGameDecimals(cycles,GAME_DECIMAL_ONE);represented=multiplyGameDecimals(cycles,period)}const remainder=subtractGameDecimals(total,represented);if(compareGameDecimals(remainder,period)>=0)throw new RangeError('Dream V2 timer quotient/remainder correction failed closed.');return {cycles,progress:gameDecimalToNumberChecked(remainder,{minimum:0,maximum:duration})}}
function standardRate(count:GameDecimal,span:GameDecimal):GameDecimal{return compareGameDecimals(count,GAME_DECIMAL_ONE)<0?GAME_DECIMAL_ZERO:multiplyGameDecimals(addGameDecimals(GAME_DECIMAL_ONE,logGameDecimal(count,10)),span)}
function summary(values:Partial<DreamV2AmountSummary>):DreamV2AmountSummary{return Object.freeze({community:cloneGameDecimal(values.community??GAME_DECIMAL_ZERO),housing:cloneGameDecimal(values.housing??GAME_DECIMAL_ZERO),workers:cloneGameDecimal(values.workers??GAME_DECIMAL_ZERO),factories:cloneGameDecimal(values.factories??GAME_DECIMAL_ZERO),bots:cloneGameDecimal(values.bots??GAME_DECIMAL_ZERO),rockets:cloneGameDecimal(values.rockets??GAME_DECIMAL_ZERO)})}
function advanceFailure(state:CanonicalGameStateV2):DreamV2AdvanceResult{return Object.freeze({accepted:false,changed:false,state,requested:ZERO_SUMMARY,produced:ZERO_SUMMARY})}
function spaceFailure(state:CanonicalGameStateV2):DreamV2SpaceAgeResult{return Object.freeze({accepted:false,changed:false,state,requestedEnergyGenerated:GAME_DECIMAL_ZERO,energyGenerated:GAME_DECIMAL_ZERO,overdriveEnergyConsumed:GAME_DECIMAL_ZERO,factoryCycles:GAME_DECIMAL_ZERO,panelsProduced:GAME_DECIMAL_ZERO})}
function railgunFailure(state:CanonicalGameStateV2):DreamV2RailgunResult{return Object.freeze({accepted:false,changed:false,state,chargeTransferred:GAME_DECIMAL_ZERO,roundsFired:0,panelsLaunched:GAME_DECIMAL_ZERO})}
function influenceFailure(state:CanonicalGameStateV2,id:DreamInfluencePurchaseIdV2,mode:V2PurchaseMode,rejection:V2PurchaseRejection='invalid-request',quotedCost:GameDecimal=GAME_DECIMAL_ZERO):DreamInfluencePurchaseResultV2{return Object.freeze({accepted:false,changed:false,state,purchaseId:id,requestedMode:mode,rejection,batches:GAME_DECIMAL_ZERO,unitsGranted:GAME_DECIMAL_ZERO,quotedCost,debited:GAME_DECIMAL_ZERO,buyMaxBatchCap:mode==='buy-max'?V2_FIXED_PRICE_BUY_MAX_BATCH_CAP:null,reachedBuyMaxBatchCap:false})}
function publish(state:CanonicalGameStateV2,preparedSource?:CanonicalGameStateV2):CanonicalGameStateV2{const published=preparedSource!==undefined&&issuedPreparedDreamStates.has(preparedSource)?freezePreparedState(state):cloneCanonicalGameStateV2(state);issuedPreparedDreamStates.add(published);return published}
function freezePreparedState(state:CanonicalGameStateV2):CanonicalGameStateV2{for(const branch of [state.dream,state.reality] as const)freezePreparedTree(branch);return Object.freeze(state)}
function freezePreparedTree<T>(value:T):T{if(value===null||typeof value!=='object'||Object.isFrozen(value))return value;for(const descriptor of Object.values(Object.getOwnPropertyDescriptors(value)))if('value'in descriptor)freezePreparedTree(descriptor.value);return Object.freeze(value)}
function admit(state:unknown):state is CanonicalGameStateV2{return typeof state==='object'&&state!==null&&issuedPreparedDreamStates.has(state)||validateCanonicalGameStateV2(state).valid}
function validSeconds(value:number):boolean{return typeof value==='number'&&Number.isFinite(value)&&value>=0&&!Object.is(value,-0)}
function validMultiplier(value:unknown):value is GameDecimal{return typeof value==='object'&&value!==null&&compareSafe(value)}
function compareSafe(value:object):boolean{try{return compareGameDecimals(value as GameDecimal,GAME_DECIMAL_ZERO)>=0}catch{return false}}
function authorizedMultiplier(state:CanonicalGameStateV2,seconds:number,value:unknown):value is GameDecimal{if(!validMultiplier(value))return false;const double=state.timeline.doubleTime,active=seconds>0&&double.unlocked&&double.bankSeconds>0&&double.rate>0,consumed=active?Math.min(double.bankSeconds,double.rate*seconds):0,expected=active?1+consumed/seconds:1;return equalGameDecimals(value,gameDecimalFromNumber(expected))}
function decrement(value:number,seconds:number):number{return value<=0?0:Math.max(0,value-seconds)}
function educationId(target:string,suffix:'Complete'|'ResearchTime'):keyof DreamStateV2['education']{const prefix=target.slice(0,-suffix.length);const id=(prefix[0]?.toLowerCase()??'')+prefix.slice(1);if(!DREAM_V2_EDUCATION_IDS.includes(id as never))throw new RangeError('Invalid Dream education effect.');return id as keyof DreamStateV2['education']}
function checkedPayload(value:GameDecimal):number{if(compareGameDecimals(value,gameDecimalFromNumber(Number.MAX_SAFE_INTEGER))>0)return Number.MAX_SAFE_INTEGER;const result=gameDecimalToNumberChecked(value,{minimum:1,maximum:Number.MAX_SAFE_INTEGER});if(!Number.isSafeInteger(result))throw new RangeError('Dream payload must be integral.');return result}
function boundedRounds(value:GameDecimal):number{if(compareGameDecimals(value,gameDecimalFromNumber(10))>=0)return 10;const result=gameDecimalToNumberChecked(value,{minimum:0,maximum:10});if(!Number.isSafeInteger(result))throw new RangeError('Dream rounds must be integral.');return result}
function atomicMove(source:GameDecimal,target:GameDecimal,requested:GameDecimal):Readonly<{source:GameDecimal;target:GameDecimal;amount:GameDecimal}>|null{if(isZeroGameDecimal(requested))return null;const nextSource=subtractGameDecimals(source,requested),debited=subtractGameDecimals(source,nextSource);if(isZeroGameDecimal(debited))return null;const nextTarget=addGameDecimals(target,debited),credited=subtractGameDecimals(nextTarget,target);if(!equalGameDecimals(debited,credited))return null;return Object.freeze({source:nextSource,target:nextTarget,amount:debited})}
function atomicConversion(sources:readonly Readonly<{balance:GameDecimal;cost:GameDecimal}>[],target:GameDecimal,credit:GameDecimal):Readonly<{sources:readonly GameDecimal[];target:GameDecimal}>|null{const nextSources:GameDecimal[]=[];for(const source of sources){const next=subtractGameDecimals(source.balance,source.cost);if(!equalGameDecimals(subtractGameDecimals(source.balance,next),source.cost))return null;nextSources.push(next)}const nextTarget=addGameDecimals(target,credit);if(!equalGameDecimals(subtractGameDecimals(nextTarget,target),credit))return null;return Object.freeze({sources:Object.freeze(nextSources),target:nextTarget})}
function addRepresented(target:GameDecimal,requested:GameDecimal):Readonly<{value:GameDecimal;delta:GameDecimal}>{const value=addGameDecimals(target,requested);return Object.freeze({value,delta:subtractGameDecimals(value,target)})}
function purchaseDebitAllowed(before:GameDecimal,after:GameDecimal,cost:GameDecimal):boolean{const debit=subtractGameDecimals(before,after);return isZeroGameDecimal(debit)||equalGameDecimals(debit,cost)}
interface SpaceThroughputV2{readonly multiplier:GameDecimal;readonly overdriveEnergyPerSecond:GameDecimal;readonly mechanicalPayload:number;readonly sustainable:boolean}
function deriveCurrentSpaceThroughputV2(state:CanonicalGameStateV2,resources:CanonicalGameStateV2['dream']['resources'],timeMultiplier:GameDecimal):SpaceThroughputV2{let solar=multiplyGameDecimals(resources.solarPanels,state.dream.parameters.solarPanelGeneration);if(state.dream.education.mathematics.complete)solar=multiplyGameDecimals(solar,gameDecimalFromNumber(2));const energy=multiplyGameDecimals(addGameDecimals(addGameDecimals(solar,multiplyGameDecimals(resources.fusion,state.dream.parameters.fusionGeneration)),multiplyGameDecimals(resources.swarmPanels,state.dream.parameters.swarmPanelGeneration)),timeMultiplier);let base=GAME_DECIMAL_ZERO;if(compareGameDecimals(resources.spaceFactories,GAME_DECIMAL_ONE)>=0){base=multiplyGameDecimals(addGameDecimals(GAME_DECIMAL_ONE,logGameDecimal(resources.spaceFactories,10)),timeMultiplier);for(const key of ['sfActivator1','sfActivator2','sfActivator3'] as const)if(state.dream.upgrades[key])base=multiplyGameDecimals(base,gameDecimalFromNumber(2))}return deriveSpaceThroughputV2(state,divideGameDecimals(base,gameDecimalFromNumber(2)),timeMultiplier,energy)}
function deriveSpaceThroughputV2(state:CanonicalGameStateV2,basePanelsPerSecond:GameDecimal,timeMultiplier:GameDecimal,energyPerSecond:GameDecimal):SpaceThroughputV2{
  const maxCharge=state.dream.parameters.railgunMaxCharge;if(isZeroGameDecimal(maxCharge))return Object.freeze({multiplier:GAME_DECIMAL_ONE,overdriveEnergyPerSecond:GAME_DECIMAL_ZERO,mechanicalPayload:1,sustainable:true})
  const preparedTime=maxGameDecimal(GAME_DECIMAL_ONE,timeMultiplier),chargeUnit=multiplyGameDecimals(maxCharge,preparedTime),sustainableUnits=divideGameDecimals(energyPerSecond,chargeUnit),payloadCapacity=payloadAllowZero(floorGameDecimal(sustainableUnits))
  if(isZeroGameDecimal(basePanelsPerSecond))return Object.freeze({multiplier:GAME_DECIMAL_ONE,overdriveEnergyPerSecond:GAME_DECIMAL_ZERO,mechanicalPayload:Math.max(1,Math.min(payloadCapacity,payloadAllowZero(floorGameDecimal(sustainableUnits)))),sustainable:true})
  const plan=(multiplier:GameDecimal):SpaceThroughputV2=>{const panels=multiplyGameDecimals(basePanelsPerSecond,multiplier),requested=ceilGameDecimal(divideGameDecimals(multiplyGameDecimals(panels,gameDecimalFromNumber(1.1)),multiplyGameDecimals(gameDecimalFromNumber(10),preparedTime))),mechanical=Math.min(payloadCapacity,Math.max(1,payloadAllowZero(requested))),launch=multiplyGameDecimals(multiplyGameDecimals(gameDecimalFromNumber(mechanical),gameDecimalFromNumber(10)),preparedTime),keepsUp=compareGameDecimals(launch,multiplyGameDecimals(panels,gameDecimalFromNumber(1.1)))>=0,overdrive=multiplyGameDecimals(subtractGameDecimals(multiplier,GAME_DECIMAL_ONE),chargeUnit),railgun=multiplyGameDecimals(chargeUnit,gameDecimalFromNumber(mechanical));return Object.freeze({multiplier,overdriveEnergyPerSecond:overdrive,mechanicalPayload:mechanical,sustainable:keepsUp&&compareGameDecimals(addGameDecimals(overdrive,railgun),energyPerSecond)<=0})}
  const basePlan=plan(GAME_DECIMAL_ONE);if(!basePlan.sustainable)return Object.freeze({...basePlan,mechanicalPayload:Math.max(1,Math.min(payloadCapacity,payloadAllowZero(floorGameDecimal(sustainableUnits))))})
  const raw=addGameDecimals(GAME_DECIMAL_ONE,sustainableUnits),energyUpper=compareGameDecimals(raw,gameDecimalFromNumber(10))<=0?raw:addGameDecimals(gameDecimalFromNumber(9),powGameDecimal(subtractGameDecimals(raw,gameDecimalFromNumber(9)),.85)),maximumLaunch=multiplyGameDecimals(multiplyGameDecimals(gameDecimalFromNumber(payloadCapacity),gameDecimalFromNumber(10)),preparedTime),throughputUpper=divideGameDecimals(maximumLaunch,multiplyGameDecimals(basePanelsPerSecond,gameDecimalFromNumber(1.1)));let lower=GAME_DECIMAL_ONE,upper=maxGameDecimal(GAME_DECIMAL_ONE,minGameDecimal(energyUpper,throughputUpper))
  for(let index=0;index<80;index+=1){const candidate=divideGameDecimals(addGameDecimals(lower,upper),gameDecimalFromNumber(2));if(plan(candidate).sustainable)lower=candidate;else upper=candidate}return plan(lower)
}
function payloadAllowZero(value:GameDecimal):number{if(compareGameDecimals(value,gameDecimalFromNumber(Number.MAX_SAFE_INTEGER))>0)return Number.MAX_SAFE_INTEGER;const result=gameDecimalToNumberChecked(value,{minimum:0,maximum:Number.MAX_SAFE_INTEGER});if(!Number.isSafeInteger(result))throw new RangeError('Dream payload must be integral.');return result}
