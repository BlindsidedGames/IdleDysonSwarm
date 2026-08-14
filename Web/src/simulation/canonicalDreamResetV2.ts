import { cloneCanonicalGameStateV2 } from '../game-state/cloneV2'
import { cloneCanonicalRuntimeSidecarV2, type CanonicalRuntimeSidecarV2 } from '../game-state/runtimeV2'
import type { CanonicalDreamResetCauseV2, CanonicalGameStateV2, DreamStateV2, SimulationStatisticsStateV2, SimulationTotalsStateV2, StatisticsWindowStateV2 } from '../game-state/typesV2'
import type { DreamUpgradeFlag } from '../game-state/types'
import { validateCanonicalGameStateV2 } from '../game-state/validateV2'
import { GAME_DECIMAL_ZERO, addGameDecimals, cloneGameDecimal, compareGameDecimals, gameDecimalFromBigInt, gameDecimalFromNumber, maxGameDecimal, multiplyGameDecimals, subtractGameDecimals, type GameDecimal } from '../math/gameDecimal'
import { DREAM_V2_CATALOG, DREAM_V2_UPGRADE_IDS, type DreamUpgradeEffectV2 } from './dreamCatalogV2'
import { deriveDysonV2FromCauses } from './dysonV2Derivation'
import { DISCRETE_MAXIMUM } from './numeric'

export interface CanonicalDreamResetPublicationV2 {readonly revision:number;readonly state:CanonicalGameStateV2;readonly runtime:CanonicalRuntimeSidecarV2}
export type CanonicalDreamResetRequestV2=Readonly<{kind:'automatic'}>|Readonly<{kind:'black-hole'}>
export interface CanonicalDreamResetQuoteV2 {readonly kind:'canonical-dream-reset-quote-v2';readonly accepted:boolean;readonly code:'ready'|'invalid-request'|'not-ready'|'reset-count-saturated'|'revision-exhausted';readonly sourceRevision:number;readonly cause:CanonicalDreamResetCauseV2|null;readonly requestedReward:GameDecimal;readonly effectiveReward:GameDecimal;readonly expectedPublication:Readonly<CanonicalDreamResetPublicationV2>|null}
export interface CanonicalDreamResetCommitV2 {readonly accepted:boolean;readonly changed:boolean;readonly code:'committed'|'quote-rejected'|'stale-publication';readonly publication:Readonly<CanonicalDreamResetPublicationV2>|null}
interface Issued{readonly source:Readonly<CanonicalDreamResetPublicationV2>;readonly candidate:Readonly<CanonicalDreamResetPublicationV2>;readonly preparedSource:object|null}
const issued=new WeakMap<object,Issued>(),consumed=new WeakSet<object>()
const issuedFastNormalizationAuthorities=new WeakSet<object>()
const issuedPreparedResetAuthorities=new WeakSet<object>()
export interface CanonicalFastDreamNormalizationAuthorityV2 {readonly policy:'stored-time-fast-v1'}
export interface CanonicalPreparedDreamResetAuthorityV2 {readonly owner:'canonical-event-time-v2'}
export interface CanonicalFastDreamNormalizationResultV2 {readonly publication:Readonly<CanonicalDreamResetPublicationV2>;readonly cause:Exclude<CanonicalDreamResetCauseV2,'BlackHole'>;readonly resetCount:bigint;readonly requestedReward:GameDecimal;readonly effectiveReward:GameDecimal}

export function registerCanonicalFastDreamNormalizationAuthorityV2ForWorker():Readonly<CanonicalFastDreamNormalizationAuthorityV2>{const authority=Object.freeze({policy:'stored-time-fast-v1' as const});issuedFastNormalizationAuthorities.add(authority);return authority}
export function registerCanonicalPreparedDreamResetAuthorityV2ForEventModel():Readonly<CanonicalPreparedDreamResetAuthorityV2>{const authority=Object.freeze({owner:'canonical-event-time-v2' as const});issuedPreparedResetAuthorities.add(authority);return authority}

/**
 * Applies the disclosed Fast-policy reset aggregate after the worker has
 * independently proved a stable post-reset cycle and advanced continuous time.
 * The q resets are one authored normalized operation, not Exact replay.
 */
export function normalizeCanonicalFastDreamResetsV2(
  authority:Readonly<CanonicalFastDreamNormalizationAuthorityV2>,
  publication:Readonly<CanonicalDreamResetPublicationV2>,
  request:Readonly<{cycles:bigint;cycleSeconds:number;firstCycleElapsedSeconds:number}>,
):Readonly<CanonicalFastDreamNormalizationResultV2>{
  if(!issuedFastNormalizationAuthorities.has(authority as object))throw new TypeError('Fast Dream normalization authority was not issued.')
  const source=admitPublication(publication),captured=captureFastNormalizationRequest(request)
  if(source===null||captured===null)throw new TypeError('Fast Dream normalization input is invalid.')
  const cause=automaticCauseForStage(source.state.dream.disasterStage)
  if(cause===null)throw new RangeError('Fast Dream normalization has no automatic reset cause.')
  if(source.state.dream.resetCount>DISCRETE_MAXIMUM-captured.cycles)throw new RangeError('Fast Dream normalization exceeds reset-count headroom.')
  const nominalReward=rewardForCause(cause),requestedReward=multiplyGameDecimals(nominalReward,gameDecimalFromBigInt(captured.cycles))
  const strangeMatter=addGameDecimals(source.state.dream.strangeMatter,requestedReward),effectiveReward=subtractGameDecimals(strangeMatter,source.state.dream.strangeMatter)
  const candidate:CanonicalGameStateV2={...source.state,dream:{...source.state.dream,resetCount:source.state.dream.resetCount+captured.cycles,strangeMatter},statistics:recordNormalizedFastResets(source.state.statistics,cause,captured.cycles,nominalReward,effectiveReward,captured.firstCycleElapsedSeconds,captured.cycleSeconds)}
  const state=cloneCanonicalGameStateV2(candidate),derived=deriveDysonV2FromCauses(state,source.runtime),runtime=cloneCanonicalRuntimeSidecarV2(Object.freeze({dysonEvaluationSnapshot:derived.nextEvaluationSnapshot,dysonTuningProfile:source.runtime.dysonTuningProfile}))
  return Object.freeze({publication:Object.freeze({revision:source.revision,state,runtime}),cause,resetCount:captured.cycles,requestedReward:cloneGameDecimal(requestedReward),effectiveReward:cloneGameDecimal(effectiveReward)})
}

export function normalizePreparedCanonicalFastDreamResetsV2(
  authority:Readonly<CanonicalFastDreamNormalizationAuthorityV2>,
  preparedAuthority:Readonly<CanonicalPreparedDreamResetAuthorityV2>,
  publication:Readonly<CanonicalDreamResetPublicationV2>,
  request:Readonly<{cycles:bigint;cycleSeconds:number;firstCycleElapsedSeconds:number}>,
):Readonly<CanonicalFastDreamNormalizationResultV2>{
  if(!issuedFastNormalizationAuthorities.has(authority as object)||!issuedPreparedResetAuthorities.has(preparedAuthority as object)||!preparedPublication(publication))throw new TypeError('Prepared Fast Dream normalization authority or publication is invalid.')
  const captured=captureFastNormalizationRequest(request);if(captured===null)throw new TypeError('Prepared Fast Dream normalization request is invalid.')
  const cause=automaticCauseForStage(publication.state.dream.disasterStage);if(cause===null)throw new RangeError('Prepared Fast Dream normalization has no automatic reset cause.')
  if(publication.state.dream.resetCount>DISCRETE_MAXIMUM-captured.cycles)throw new RangeError('Prepared Fast Dream normalization exceeds reset-count headroom.')
  const nominalReward=rewardForCause(cause),requestedReward=multiplyGameDecimals(nominalReward,gameDecimalFromBigInt(captured.cycles)),strangeMatter=addGameDecimals(publication.state.dream.strangeMatter,requestedReward),effectiveReward=subtractGameDecimals(strangeMatter,publication.state.dream.strangeMatter)
  const dream=Object.freeze({...publication.state.dream,resetCount:publication.state.dream.resetCount+captured.cycles,strangeMatter})
  const statistics=freezeInternalTree(recordNormalizedFastResets(publication.state.statistics,cause,captured.cycles,nominalReward,effectiveReward,captured.firstCycleElapsedSeconds,captured.cycleSeconds))
  const state=Object.freeze({...publication.state,dream,statistics}) as CanonicalGameStateV2
  const derived=deriveDysonV2FromCauses(state,publication.runtime),runtime=cloneCanonicalRuntimeSidecarV2(Object.freeze({dysonEvaluationSnapshot:derived.nextEvaluationSnapshot,dysonTuningProfile:publication.runtime.dysonTuningProfile}))
  return Object.freeze({publication:Object.freeze({revision:publication.revision,state,runtime}),cause,resetCount:captured.cycles,requestedReward,effectiveReward})
}

export function isCanonicalAutomaticDreamResetReadyV2(state:Readonly<CanonicalGameStateV2>):boolean{try{return validateCanonicalGameStateV2(state).valid&&state.dream.resetCount<DISCRETE_MAXIMUM&&deriveOutcome(state as CanonicalGameStateV2,Object.freeze({kind:'automatic'}))!==null}catch{return false}}
export function previewCanonicalDreamResetV2(state:Readonly<CanonicalGameStateV2>,request:CanonicalDreamResetRequestV2):Readonly<{eligible:boolean;code:'ready'|'not-ready'|'reset-count-saturated';cause:CanonicalDreamResetCauseV2|null;requestedReward:GameDecimal}>{const outcome=deriveOutcome(state as CanonicalGameStateV2,request);if(outcome===null)return Object.freeze({eligible:false,code:'not-ready',cause:null,requestedReward:cloneGameDecimal(GAME_DECIMAL_ZERO)});if(state.dream.resetCount===DISCRETE_MAXIMUM)return Object.freeze({eligible:false,code:'reset-count-saturated',cause:outcome.cause,requestedReward:cloneGameDecimal(outcome.reward)});return Object.freeze({eligible:true,code:'ready',cause:outcome.cause,requestedReward:cloneGameDecimal(outcome.reward)})}

export function quoteCanonicalDreamResetV2(publication:Readonly<CanonicalDreamResetPublicationV2>,request:CanonicalDreamResetRequestV2):Readonly<CanonicalDreamResetQuoteV2>{try{return quoteInternal(publication,request)}catch{return failureQuote('invalid-request')}}
function quoteInternal(publication:Readonly<CanonicalDreamResetPublicationV2>,request:CanonicalDreamResetRequestV2):Readonly<CanonicalDreamResetQuoteV2>{
  const source=admitPublication(publication),captured=captureRequest(request);if(source===null||captured===null)return failureQuote('invalid-request')
  if(source.revision===Number.MAX_SAFE_INTEGER)return failureQuote('revision-exhausted',source.revision)
  const outcome=deriveOutcome(source.state,captured);if(outcome===null)return failureQuote('not-ready',source.revision)
  if(source.state.dream.resetCount===DISCRETE_MAXIMUM)return failureQuote('reset-count-saturated',source.revision,outcome.cause)
  const nextMatter=addGameDecimals(source.state.dream.strangeMatter,outcome.reward),effectiveReward=subtractGameDecimals(nextMatter,source.state.dream.strangeMatter)
  let candidate:CanonicalGameStateV2={...source.state,dream:createResetDream(source.state.dream,source.state.dream.resetCount+1n,nextMatter),statistics:recordReset(source.state.statistics,outcome.cause,effectiveReward)}
  candidate=replayOwnedUpgrades(candidate)
  candidate={...candidate,dream:{...candidate.dream,disasterStage:disasterStage(candidate.dream.upgrades)}}
  const state=cloneCanonicalGameStateV2(candidate),derived=deriveDysonV2FromCauses(state,source.runtime),runtime=cloneCanonicalRuntimeSidecarV2(Object.freeze({dysonEvaluationSnapshot:derived.nextEvaluationSnapshot,dysonTuningProfile:source.runtime.dysonTuningProfile})),expected=Object.freeze({revision:source.revision+1,state,runtime})
  const quote=Object.freeze({kind:'canonical-dream-reset-quote-v2' as const,accepted:true,code:'ready' as const,sourceRevision:source.revision,cause:outcome.cause,requestedReward:cloneGameDecimal(outcome.reward),effectiveReward:cloneGameDecimal(effectiveReward),expectedPublication:expected});issued.set(quote,Object.freeze({source,candidate:expected,preparedSource:null}));return quote
}

export function commitCanonicalDreamResetV2(quote:Readonly<CanonicalDreamResetQuoteV2>,publication:Readonly<CanonicalDreamResetPublicationV2>):Readonly<CanonicalDreamResetCommitV2>{try{if(quote===null||typeof quote!=='object'||consumed.has(quote as object))return commitFailure('quote-rejected');const record=issued.get(quote as object);if(record===undefined||record.preparedSource!==null)return commitFailure('quote-rejected');consumed.add(quote as object);const current=admitPublication(publication);if(current===null||!equalTree(current,record.source))return commitFailure('stale-publication');return Object.freeze({accepted:true,changed:true,code:'committed' as const,publication:record.candidate})}catch{return commitFailure('quote-rejected')}}

export function quotePreparedCanonicalAutomaticDreamResetV2(authority:Readonly<CanonicalPreparedDreamResetAuthorityV2>,publication:Readonly<CanonicalDreamResetPublicationV2>):Readonly<CanonicalDreamResetQuoteV2>{
  try{return quotePreparedInternal(authority,publication)}catch{return failureQuote('invalid-request')}
}
function quotePreparedInternal(authority:Readonly<CanonicalPreparedDreamResetAuthorityV2>,publication:Readonly<CanonicalDreamResetPublicationV2>):Readonly<CanonicalDreamResetQuoteV2>{
  if(!issuedPreparedResetAuthorities.has(authority as object)||!preparedPublication(publication))return failureQuote('invalid-request')
  if(publication.revision===Number.MAX_SAFE_INTEGER)return failureQuote('revision-exhausted',publication.revision)
  const outcome=deriveOutcome(publication.state,Object.freeze({kind:'automatic'}));if(outcome===null)return failureQuote('not-ready',publication.revision)
  if(publication.state.dream.resetCount===DISCRETE_MAXIMUM)return failureQuote('reset-count-saturated',publication.revision,outcome.cause)
  const nextMatter=addGameDecimals(publication.state.dream.strangeMatter,outcome.reward),effectiveReward=subtractGameDecimals(nextMatter,publication.state.dream.strangeMatter)
  let candidate:CanonicalGameStateV2={...publication.state,dream:createResetDream(publication.state.dream,publication.state.dream.resetCount+1n,nextMatter),statistics:recordReset(publication.state.statistics,outcome.cause,effectiveReward)}
  candidate=replayOwnedUpgrades(candidate)
  const dream=freezeInternalTree({...candidate.dream,disasterStage:disasterStage(candidate.dream.upgrades)})
  const statistics=freezeInternalTree(candidate.statistics)
  const state=Object.freeze({...publication.state,dream,statistics}) as CanonicalGameStateV2
  const derived=deriveDysonV2FromCauses(state,publication.runtime)
  const runtime=cloneCanonicalRuntimeSidecarV2(Object.freeze({dysonEvaluationSnapshot:derived.nextEvaluationSnapshot,dysonTuningProfile:publication.runtime.dysonTuningProfile}))
  const expected=Object.freeze({revision:publication.revision+1,state,runtime})
  const quote=Object.freeze({kind:'canonical-dream-reset-quote-v2' as const,accepted:true,code:'ready' as const,sourceRevision:publication.revision,cause:outcome.cause,requestedReward:outcome.reward,effectiveReward,expectedPublication:expected})
  issued.set(quote,Object.freeze({source:publication,candidate:expected,preparedSource:publication as object}))
  return quote
}

export function commitPreparedCanonicalDreamResetV2(authority:Readonly<CanonicalPreparedDreamResetAuthorityV2>,quote:Readonly<CanonicalDreamResetQuoteV2>,publication:Readonly<CanonicalDreamResetPublicationV2>):Readonly<CanonicalDreamResetCommitV2>{
  if(!issuedPreparedResetAuthorities.has(authority as object)||quote===null||typeof quote!=='object'||consumed.has(quote as object))return commitFailure('quote-rejected')
  const record=issued.get(quote as object);if(record===undefined||record.preparedSource===null)return commitFailure('quote-rejected')
  consumed.add(quote as object)
  if(record.preparedSource!==publication)return commitFailure('stale-publication')
  return Object.freeze({accepted:true,changed:true,code:'committed' as const,publication:record.candidate})
}

function deriveOutcome(state:CanonicalGameStateV2,request:CanonicalDreamResetRequestV2):Readonly<{cause:CanonicalDreamResetCauseV2;reward:GameDecimal}>|null{if(request.kind==='black-hole')return Object.freeze({cause:'BlackHole',reward:state.dream.resources.swarmPanels});const stage=state.dream.disasterStage;if((stage===0n||stage===1n)&&compareGameDecimals(state.dream.resources.cities,gameDecimalFromNumber(1))>=0)return Object.freeze({cause:'Meteor',reward:gameDecimalFromNumber(1)});if(stage===2n&&compareGameDecimals(state.dream.resources.bots,gameDecimalFromNumber(100))>=0)return Object.freeze({cause:'ArtificialIntelligence',reward:gameDecimalFromNumber(10)});if(stage===3n&&compareGameDecimals(state.dream.resources.spaceFactories,gameDecimalFromNumber(5))>=0)return Object.freeze({cause:'GlobalWarming',reward:gameDecimalFromNumber(20)});return null}

function createResetDream(source:DreamStateV2,resetCount:bigint,strangeMatter:GameDecimal):DreamStateV2{return {
  resources:{hunters:GAME_DECIMAL_ZERO,gatherers:GAME_DECIMAL_ZERO,community:GAME_DECIMAL_ZERO,housing:GAME_DECIMAL_ZERO,villages:GAME_DECIMAL_ZERO,workers:GAME_DECIMAL_ZERO,cities:GAME_DECIMAL_ZERO,factories:GAME_DECIMAL_ZERO,bots:GAME_DECIMAL_ZERO,rockets:GAME_DECIMAL_ZERO,energy:GAME_DECIMAL_ZERO,spaceFactories:GAME_DECIMAL_ZERO,dysonPanels:GAME_DECIMAL_ZERO,railgunCharge:GAME_DECIMAL_ZERO,solarPanels:GAME_DECIMAL_ZERO,fusion:GAME_DECIMAL_ZERO,swarmPanels:GAME_DECIMAL_ZERO},
  parameters:{hunterCost:gameDecimalFromNumber(100),gathererCost:gameDecimalFromNumber(100),communityBoostCost:GAME_DECIMAL_ZERO,communityBoostIsFree:true,communityBoostClock:0,communityBoostDuration:1200,factoriesBoostCost:gameDecimalFromNumber(5000),factoriesBoostClock:0,factoriesBoostDuration:1200,rocketsPerSpaceFactory:gameDecimalFromNumber(10),railgunMaxCharge:gameDecimalFromNumber(25_000_000),solarCost:gameDecimalFromNumber(50),solarPanelGeneration:gameDecimalFromNumber(100),fusionCost:gameDecimalFromNumber(100_000),fusionGeneration:gameDecimalFromNumber(1_250_000),swarmPanelGeneration:gameDecimalFromNumber(3212)},
  education:{engineering:education(600,1000),shipping:education(1800,5000),worldTrade:education(3600,7000),worldPeace:education(7200,8000),mathematics:education(3600,10000),advancedPhysics:education(7200,11000)},
  timers:{hunterTimerProgress:0,gathererTimerProgress:0,communityTimerProgress:0,housingTimerProgress:0,villagesTimerProgress:0,workersTimerProgress:0,citiesTimerProgress:0,factoriesTimerProgress:0,botsTimerProgress:0,spaceFactoriesTimerProgress:0},
  railgun:{firing:false,fireProgress:0,pendingBaseSeconds:0,pendingDreamSeconds:0,shotsRemaining:0,activeRailguns:0,reservedPanels:GAME_DECIMAL_ZERO,highestStoredPanels:GAME_DECIMAL_ZERO,lastRoundsFired:0,lastPanelsLaunched:GAME_DECIMAL_ZERO},resetCount,strangeMatter,disasterStage:0n,upgrades:source.upgrades,huntersPerPurchase:source.huntersPerPurchase,gatherersPerPurchase:source.gatherersPerPurchase,
}}
function education(researchTime:number,cost:number):DreamStateV2['education']['engineering']{return Object.freeze({active:false,complete:false,progress:GAME_DECIMAL_ZERO,researchTime,cost:gameDecimalFromNumber(cost)})}

function replayOwnedUpgrades(source:CanonicalGameStateV2):CanonicalGameStateV2{let state=source;for(const id of DREAM_V2_UPGRADE_IDS){if(!source.dream.upgrades[id])continue;for(const effect of DREAM_V2_CATALOG[id].effects)state=applyEffect(state,effect)}return state}
function applyEffect(state:CanonicalGameStateV2,e:DreamUpgradeEffectV2):CanonicalGameStateV2{if(e.effectType===2)return state;if(e.effectType===0||e.effectType===1)return {...state,dream:{...state.dream,upgrades:{...state.dream.upgrades,[e.targetKey]:e.boolValue}}};if(e.effectType===3){const id=educationId(e.targetKey,'Complete');return {...state,dream:{...state.dream,education:{...state.dream.education,[id]:{...state.dream.education[id],complete:e.boolValue}}}}};if(e.effectType===4){if(e.targetKey==='rocketsPerSpaceFactory')return {...state,dream:{...state.dream,parameters:{...state.dream.parameters,rocketsPerSpaceFactory:gameDecimalFromNumber(e.numericValue)}}};const id=educationId(e.targetKey,'ResearchTime');return {...state,dream:{...state.dream,education:{...state.dream.education,[id]:{...state.dream.education[id],researchTime:e.numericValue}}}}};if(e.effectType===5){const key=e.targetKey as 'huntersPerPurchase'|'gatherersPerPurchase';return {...state,dream:{...state.dream,[key]:gameDecimalFromNumber(e.numericValue)}}};if(e.effectType===7){const key=e.targetKey as 'huntersPerPurchase'|'gatherersPerPurchase';return {...state,dream:{...state.dream,[key]:maxGameDecimal(state.dream[key],gameDecimalFromNumber(e.numericValue))}}};if(e.effectType===6){if(e.targetKey==='solarPanelGeneration')return {...state,dream:{...state.dream,parameters:{...state.dream.parameters,solarPanelGeneration:maxGameDecimal(state.dream.parameters.solarPanelGeneration,gameDecimalFromNumber(e.numericValue))}}};const key=e.targetKey as 'hunters'|'gatherers';return {...state,dream:{...state.dream,resources:{...state.dream.resources,[key]:maxGameDecimal(state.dream.resources[key],gameDecimalFromNumber(e.numericValue))}}}};if(e.effectType===8)return {...state,dream:{...state.dream,disasterStage:BigInt(e.numericValue)}};throw new TypeError('Unsupported Dream reset effect.')}
function educationId(target:string,suffix:'Complete'|'ResearchTime'):keyof DreamStateV2['education']{const prefix=target.slice(0,-suffix.length),id=((prefix[0]?.toLowerCase()??'')+prefix.slice(1)) as keyof DreamStateV2['education'];if(!['engineering','shipping','worldTrade','worldPeace','mathematics','advancedPhysics'].includes(id))throw new TypeError('Invalid Dream education reset effect.');return id}
function disasterStage(upgrades:Readonly<Record<DreamUpgradeFlag,boolean>>):bigint{return !upgrades.counterMeteor?1n:!upgrades.counterAi?2n:!upgrades.counterGw?3n:42n}

function recordReset(source:SimulationStatisticsStateV2,cause:CanonicalDreamResetCauseV2,reward:GameDecimal):SimulationStatisticsStateV2{return {...source,trackedSinceUpdate:true,trackingStartedMarker:source.trackedSinceUpdate?source.trackingStartedMarker:'tracked-since-update',lifetime:addTotals(source.lifetime,cause,reward),currentQuantumRun:addTotals(source.currentQuantumRun,cause,reward),recentProcessedSegment:addTotals(source.recentProcessedSegment,cause,reward),lastCompletedCycle:{valid:true,breakInfinity:false,durationSeconds:0,reward,dreamCause:cause},minuteWindows:addWindow(source.minuteWindows,60,60,source.trackedSimulatedSeconds,reward),halfHourWindows:addWindow(source.halfHourWindows,48,1800,source.trackedSimulatedSeconds,reward),dailyWindows:addWindow(source.dailyWindows,30,86400,source.trackedSimulatedSeconds,reward)}}
function recordNormalizedFastResets(source:SimulationStatisticsStateV2,cause:Exclude<CanonicalDreamResetCauseV2,'BlackHole'>,cycles:bigint,_nominalReward:GameDecimal,effectiveReward:GameDecimal,firstCycleElapsedSeconds:number,cycleSeconds:number):SimulationStatisticsStateV2{return {...source,trackedSinceUpdate:true,trackingStartedMarker:source.trackedSinceUpdate?source.trackingStartedMarker:'tracked-since-update',lifetime:addNormalizedTotals(source.lifetime,cause,cycles,effectiveReward),currentQuantumRun:addNormalizedTotals(source.currentQuantumRun,cause,cycles,effectiveReward),recentProcessedSegment:addNormalizedTotals(source.recentProcessedSegment,cause,cycles,effectiveReward),lastCompletedCycle:{valid:true,breakInfinity:false,durationSeconds:0,reward:effectiveReward,dreamCause:cause},minuteWindows:normalizeFastResetWindows(source.minuteWindows,60,60,cause,cycles,effectiveReward,firstCycleElapsedSeconds,cycleSeconds),halfHourWindows:normalizeFastResetWindows(source.halfHourWindows,48,1800,cause,cycles,effectiveReward,firstCycleElapsedSeconds,cycleSeconds),dailyWindows:normalizeFastResetWindows(source.dailyWindows,30,86400,cause,cycles,effectiveReward,firstCycleElapsedSeconds,cycleSeconds)}}
function addTotals(source:SimulationTotalsStateV2,cause:CanonicalDreamResetCauseV2,reward:GameDecimal):SimulationTotalsStateV2{return {...source,meteorDreamResets:addCount(source.meteorDreamResets,cause==='Meteor'),aiDreamResets:addCount(source.aiDreamResets,cause==='ArtificialIntelligence'),globalWarmingDreamResets:addCount(source.globalWarmingDreamResets,cause==='GlobalWarming'),blackHoleDreamResets:addCount(source.blackHoleDreamResets,cause==='BlackHole'),strangeMatter:addGameDecimals(source.strangeMatter,reward)}}
function addNormalizedTotals(source:SimulationTotalsStateV2,cause:Exclude<CanonicalDreamResetCauseV2,'BlackHole'>,cycles:bigint,reward:GameDecimal):SimulationTotalsStateV2{return {...source,meteorDreamResets:addBoundedCount(source.meteorDreamResets,cause==='Meteor'?cycles:0n),aiDreamResets:addBoundedCount(source.aiDreamResets,cause==='ArtificialIntelligence'?cycles:0n),globalWarmingDreamResets:addBoundedCount(source.globalWarmingDreamResets,cause==='GlobalWarming'?cycles:0n),strangeMatter:addGameDecimals(source.strangeMatter,reward)}}
function addCount(value:bigint,increment:boolean):bigint{return !increment||value===DISCRETE_MAXIMUM?value:value+1n}
function addBoundedCount(value:bigint,increment:bigint):bigint{return increment===0n?value:value>DISCRETE_MAXIMUM-increment?DISCRETE_MAXIMUM:value+increment}
function addWindow(source:readonly StatisticsWindowStateV2[],length:number,width:number,elapsed:number,reward:GameDecimal):readonly StatisticsWindowStateV2[]{const sequence=BigInt(Math.floor(elapsed/width)),index=Number(sequence%BigInt(length)),windows=source.length===length?[...source]:Array.from({length},()=>emptyWindow(0n)),current=windows[index]!,bucket=current.sequence===sequence?current:emptyWindow(sequence);windows[index]={...bucket,dreamResetCount:addCount(bucket.dreamResetCount,true),strangeMatter:addGameDecimals(bucket.strangeMatter,reward)};return Object.freeze(windows)}
function emptyWindow(sequence:bigint):StatisticsWindowStateV2{return Object.freeze({sequence,simulatedSeconds:0,infinityCount:0n,infinityPoints:GAME_DECIMAL_ZERO,dreamResetCount:0n,strangeMatter:GAME_DECIMAL_ZERO,realityWorkers:GAME_DECIMAL_ZERO})}

function normalizeFastResetWindows(source:readonly StatisticsWindowStateV2[],length:number,width:number,cause:Exclude<CanonicalDreamResetCauseV2,'BlackHole'>,cycles:bigint,effectiveReward:GameDecimal,firstCycleElapsedSeconds:number,cycleSeconds:number):readonly StatisticsWindowStateV2[]{
  const count=Number(cycles);if(!Number.isSafeInteger(count)||count<1||count>4096)throw new RangeError('Fast Dream normalization cycle count exceeds its bounded policy.')
  const finalElapsed=firstCycleElapsedSeconds+(count-1)*cycleSeconds;if(!Number.isFinite(finalElapsed))throw new RangeError('Fast Dream normalization window horizon overflowed.')
  const finalSequence=BigInt(Math.floor(finalElapsed/width)),windows:StatisticsWindowStateV2[]=source.length===length?[...source]:Array.from({length},()=>emptyWindow(0n)),retained=finalSequence<BigInt(length)?Number(finalSequence)+1:length,finalOffset=((finalElapsed%width)+width)%width
  for(let offset=retained-1;offset>=0;offset-=1){const sequence=finalSequence-BigInt(offset),index=Number(sequence%BigInt(length)),current=windows[index]!,prior=current.sequence===sequence?current:emptyWindow(sequence),minimum=Math.max(0,Math.floor((finalOffset+(offset-1)*width)/cycleSeconds)+1),maximum=Math.min(count-1,Math.floor((finalOffset+offset*width)/cycleSeconds)),bucketCount=maximum>=minimum?BigInt(maximum-minimum+1):0n,reward=offset===0?effectiveReward:GAME_DECIMAL_ZERO;windows[index]=Object.freeze({...prior,sequence,dreamResetCount:addBoundedCount(prior.dreamResetCount,bucketCount),strangeMatter:addGameDecimals(prior.strangeMatter,reward)})}
  void cause
  return Object.freeze(windows)
}

function automaticCauseForStage(stage:bigint):Exclude<CanonicalDreamResetCauseV2,'BlackHole'>|null{return stage===0n||stage===1n?'Meteor':stage===2n?'ArtificialIntelligence':stage===3n?'GlobalWarming':null}
function rewardForCause(cause:Exclude<CanonicalDreamResetCauseV2,'BlackHole'>):GameDecimal{return gameDecimalFromNumber(cause==='Meteor'?1:cause==='ArtificialIntelligence'?10:20)}
function captureFastNormalizationRequest(value:unknown):Readonly<{cycles:bigint;cycleSeconds:number;firstCycleElapsedSeconds:number}>|null{const record=closed(value,['cycles','cycleSeconds','firstCycleElapsedSeconds']);if(record===null||typeof record.cycles!=='bigint'||record.cycles<1n||record.cycles>4096n||typeof record.cycleSeconds!=='number'||!Number.isFinite(record.cycleSeconds)||record.cycleSeconds<=0||typeof record.firstCycleElapsedSeconds!=='number'||!Number.isFinite(record.firstCycleElapsedSeconds)||record.firstCycleElapsedSeconds<0)return null;return Object.freeze({cycles:record.cycles,cycleSeconds:record.cycleSeconds,firstCycleElapsedSeconds:record.firstCycleElapsedSeconds})}

function captureRequest(value:unknown):CanonicalDreamResetRequestV2|null{const record=closed(value,['kind']);return record?.kind==='automatic'?Object.freeze({kind:'automatic'}):record?.kind==='black-hole'?Object.freeze({kind:'black-hole'}):null}
function preparedPublication(value:unknown):value is Readonly<CanonicalDreamResetPublicationV2>{try{const record=closed(value,['revision','state','runtime']);return record!==null&&typeof record.revision==='number'&&Number.isSafeInteger(record.revision)&&record.revision>=0&&!Object.is(record.revision,-0)&&record.state!==null&&typeof record.state==='object'&&Object.isFrozen(record.state)&&record.runtime!==null&&typeof record.runtime==='object'&&Object.isFrozen(record.runtime)}catch{return false}}
function freezeInternalTree<T>(value:T):T{if(value===null||typeof value!=='object'||Object.isFrozen(value))return value;for(const descriptor of Object.values(Object.getOwnPropertyDescriptors(value))){if('value'in descriptor)freezeInternalTree(descriptor.value)}return Object.freeze(value)}
function admitPublication(value:unknown):Readonly<CanonicalDreamResetPublicationV2>|null{const record=closed(value,['revision','state','runtime']);if(record===null||typeof record.revision!=='number'||!Number.isSafeInteger(record.revision)||record.revision<0||Object.is(record.revision,-0)||!validateCanonicalGameStateV2(record.state).valid)return null;try{return Object.freeze({revision:record.revision,state:cloneCanonicalGameStateV2(record.state as CanonicalGameStateV2),runtime:cloneCanonicalRuntimeSidecarV2(record.runtime as CanonicalRuntimeSidecarV2)})}catch{return null}}
function closed(value:unknown,keys:readonly string[]):Readonly<Record<string,unknown>>|null{if(value===null||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)return null;const descriptors=Object.getOwnPropertyDescriptors(value),actual=Reflect.ownKeys(descriptors);if(actual.length!==keys.length||actual.some(key=>typeof key!=='string'||!keys.includes(key))||keys.some(key=>descriptors[key]===undefined||!descriptors[key]!.enumerable||!('value'in descriptors[key]!)))return null;return Object.freeze(Object.fromEntries(keys.map(key=>[key,descriptors[key]!.value])))}
function equalTree(a:unknown,b:unknown):boolean{if(Object.is(a,b))return true;if(a===null||b===null||typeof a!=='object'||typeof b!=='object'||Object.getPrototypeOf(a)!==Object.getPrototypeOf(b))return false;const ak=Reflect.ownKeys(a),bk=Reflect.ownKeys(b);return ak.length===bk.length&&ak.every(key=>bk.includes(key)&&equalTree(Object.getOwnPropertyDescriptor(a,key)?.value,Object.getOwnPropertyDescriptor(b,key)?.value))}
function failureQuote(code:CanonicalDreamResetQuoteV2['code'],revision=0,cause:CanonicalDreamResetCauseV2|null=null):Readonly<CanonicalDreamResetQuoteV2>{return Object.freeze({kind:'canonical-dream-reset-quote-v2',accepted:false,code,sourceRevision:revision,cause,requestedReward:cloneGameDecimal(GAME_DECIMAL_ZERO),effectiveReward:cloneGameDecimal(GAME_DECIMAL_ZERO),expectedPublication:null})}
function commitFailure(code:CanonicalDreamResetCommitV2['code']):Readonly<CanonicalDreamResetCommitV2>{return Object.freeze({accepted:false,changed:false,code,publication:null})}
