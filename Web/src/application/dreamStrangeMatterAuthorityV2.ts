import { cloneCanonicalGameStateV2 } from '../game-state/cloneV2'
import { cloneCanonicalRuntimeSidecarV2, type CanonicalRuntimeSidecarV2 } from '../game-state/runtimeV2'
import type { CanonicalGameStateV2, DreamStateV2 } from '../game-state/typesV2'
import { validateCanonicalGameStateV2 } from '../game-state/validateV2'
import { GAME_DECIMAL_ONE, GAME_DECIMAL_ZERO, cloneGameDecimal, subtractGameDecimals, type GameDecimal } from '../math/gameDecimal'
import { DREAM_V2_CATALOG, type DreamUpgradeIdV2 } from '../simulation/dreamCatalogV2'
import { activateDreamBoostV2, applyDreamUpgradeEffectsV2, purchaseDreamInfluenceV2, startDreamEducationV2, type DreamInfluencePurchaseIdV2 } from '../simulation/dreamV2'
import { commitRealityUpgradeV2, quoteRealityUpgradeV2 } from '../simulation/realityV2'
import { deriveDysonV2FromCauses } from '../simulation/dysonV2Derivation'
import type { V2PurchaseMode } from '../simulation/transactionsV2'
import { issueRealityStrangeMatterAccountV2ForApplication } from './realityStrangeMatterAuthorityV2'

export interface DreamPublicationV2 {readonly revision:number;readonly state:CanonicalGameStateV2;readonly runtime:CanonicalRuntimeSidecarV2}
export type DreamCommandV2=
  |Readonly<{kind:'dream-upgrade';upgradeId:DreamUpgradeIdV2}>
  |Readonly<{kind:'reality-upgrade';upgradeId:string}>
  |Readonly<{kind:'influence-purchase';purchaseId:DreamInfluencePurchaseIdV2;mode:V2PurchaseMode}>
  |Readonly<{kind:'education-start';educationId:keyof DreamStateV2['education']}>
  |Readonly<{kind:'boost';boostId:'community'|'factories'}>
export interface DreamCommandQuoteV2 {readonly kind:'dream-command-quote-v2';readonly accepted:boolean;readonly code:'ready'|'invalid-request'|'rejected'|'revision-exhausted';readonly sourceRevision:number;readonly commandKind:DreamCommandV2['kind'];readonly commandId:string;readonly requestedMode:V2PurchaseMode|null;readonly currencyPath:string;readonly batches:GameDecimal;readonly unitsGranted:GameDecimal;readonly quotedCost:GameDecimal;readonly debitedStrangeMatter:GameDecimal;readonly expectedPublication:Readonly<DreamPublicationV2>|null}
export interface DreamCommandCommitV2 {readonly accepted:boolean;readonly changed:boolean;readonly code:'committed'|'quote-rejected'|'stale-publication';readonly publication:Readonly<DreamPublicationV2>|null}
interface Issued{readonly source:Readonly<DreamPublicationV2>;readonly candidate:Readonly<DreamPublicationV2>;readonly changed:boolean}
const issued=new WeakMap<object,Issued>();const consumed=new WeakSet<object>()

export function quoteDreamCommandV2(publication:Readonly<DreamPublicationV2>,request:DreamCommandV2):Readonly<DreamCommandQuoteV2>{
  try{return quoteDreamCommandInternal(publication,request)}catch{return quoteFailure('invalid-request')}
}
function quoteDreamCommandInternal(publication:Readonly<DreamPublicationV2>,request:DreamCommandV2):Readonly<DreamCommandQuoteV2>{
  const admitted=admitPublication(publication);const captured=captureRequest(request)
  if(admitted===null||captured===null)return quoteFailure('invalid-request')
  if(admitted.revision===Number.MAX_SAFE_INTEGER)return quoteFailure('revision-exhausted',captured.kind,admitted.revision)
  const source=admitted.state;let candidate:CanonicalGameStateV2|null=null,batches=GAME_DECIMAL_ZERO,units=GAME_DECIMAL_ZERO,cost=GAME_DECIMAL_ZERO
  if(captured.kind==='dream-upgrade'){candidate=applyDreamUpgradeEffectsV2(source,captured.upgradeId);if(candidate!==null){cost=DREAM_V2_CATALOG[captured.upgradeId].cost;batches=GAME_DECIMAL_ONE;units=GAME_DECIMAL_ONE}}
  else if(captured.kind==='influence-purchase'){const result=purchaseDreamInfluenceV2(source,captured.purchaseId,captured.mode);if(result.accepted){candidate=result.state;batches=result.batches;units=result.unitsGranted;cost=result.quotedCost}}
  else if(captured.kind==='education-start'){candidate=startDreamEducationV2(source,captured.educationId);if(candidate!==null){cost=source.dream.education[captured.educationId].cost;batches=GAME_DECIMAL_ONE;units=GAME_DECIMAL_ONE}}
  else if(captured.kind==='boost'){candidate=activateDreamBoostV2(source,captured.boostId);if(candidate!==null){const free=captured.boostId==='community'&&source.dream.parameters.communityBoostIsFree;cost=free?GAME_DECIMAL_ZERO:captured.boostId==='community'?source.dream.parameters.communityBoostCost:source.dream.parameters.factoriesBoostCost;batches=GAME_DECIMAL_ONE;units=GAME_DECIMAL_ONE}}
  else{
    try{const account=issueRealityStrangeMatterAccountV2ForApplication(source,Object.freeze({accountId:'stage6:dream.strangeMatter',revision:admitted.revision}));const realityQuote=quoteRealityUpgradeV2(source,account,captured.upgradeId);if(realityQuote.accepted){const result=commitRealityUpgradeV2(realityQuote,source,account);if(result.accepted){candidate=cloneCanonicalGameStateV2({...result.state,dream:{...result.state.dream,strangeMatter:result.account.balance}});cost=realityQuote.cost;batches=GAME_DECIMAL_ONE;units=GAME_DECIMAL_ONE}}}catch{candidate=null}
  }
  if(candidate===null)return quoteFailure('rejected',captured.kind,admitted.revision)
  const changed=!equalTree(candidate,source);let candidateRuntime:Readonly<CanonicalRuntimeSidecarV2>;try{candidateRuntime=changed?deriveRuntime(candidate,admitted.runtime):admitted.runtime}catch{return quoteFailure('rejected',captured.kind,admitted.revision)}const candidatePublication=Object.freeze({revision:changed?admitted.revision+1:admitted.revision,state:candidate,runtime:candidateRuntime})
  const quote=Object.freeze({kind:'dream-command-quote-v2' as const,accepted:true,code:'ready' as const,sourceRevision:admitted.revision,commandKind:captured.kind,commandId:commandIdentifier(captured),requestedMode:captured.kind==='influence-purchase'?captured.mode:null,currencyPath:captured.kind==='dream-upgrade'||captured.kind==='reality-upgrade'?'$.dream.strangeMatter':'$.reality.influence',batches:cloneGameDecimal(batches),unitsGranted:cloneGameDecimal(units),quotedCost:cloneGameDecimal(cost),debitedStrangeMatter:subtractForReport(source.dream.strangeMatter,candidate.dream.strangeMatter),expectedPublication:candidatePublication})
  issued.set(quote,Object.freeze({source:admitted,candidate:candidatePublication,changed}));return quote
}

export function commitDreamCommandV2(quote:Readonly<DreamCommandQuoteV2>,publication:Readonly<DreamPublicationV2>):Readonly<DreamCommandCommitV2>{
  try{return commitDreamCommandInternal(quote,publication)}catch{return commitFailure('quote-rejected')}
}
function commitDreamCommandInternal(quote:Readonly<DreamCommandQuoteV2>,publication:Readonly<DreamPublicationV2>):Readonly<DreamCommandCommitV2>{
  if(quote===null||typeof quote!=='object'||consumed.has(quote as object))return commitFailure('quote-rejected')
  const descriptor=issued.get(quote as object);if(descriptor===undefined)return commitFailure('quote-rejected');consumed.add(quote as object)
  const admitted=admitPublication(publication);if(admitted===null||!equalTree(admitted,descriptor.source))return commitFailure('stale-publication')
  return Object.freeze({accepted:true,changed:descriptor.changed,code:'committed' as const,publication:descriptor.candidate})
}

function admitPublication(value:unknown):Readonly<DreamPublicationV2>|null{const record=closed(value,['revision','state','runtime']);if(record===null||typeof record.revision!=='number'||!Number.isSafeInteger(record.revision)||record.revision<0||Object.is(record.revision,-0)||!validateCanonicalGameStateV2(record.state).valid)return null;try{return Object.freeze({revision:record.revision,state:cloneCanonicalGameStateV2(record.state as CanonicalGameStateV2),runtime:cloneCanonicalRuntimeSidecarV2(record.runtime as CanonicalRuntimeSidecarV2)})}catch{return null}}
function captureRequest(value:unknown):DreamCommandV2|null{const kindRecord=closed(value,['kind']);if(kindRecord!==null)return null;if(value===null||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)return null;const descriptors=Object.getOwnPropertyDescriptors(value);const kind=descriptors.kind;if(kind===undefined||!('value'in kind)||typeof kind.value!=='string')return null;const keys=kind.value==='influence-purchase'?['kind','purchaseId','mode']:kind.value==='education-start'?['kind','educationId']:kind.value==='boost'?['kind','boostId']:['kind','upgradeId'];const record=closed(value,keys);if(record===null)return null
  if(record.kind==='dream-upgrade'&&typeof record.upgradeId==='string')return Object.freeze({kind:'dream-upgrade',upgradeId:record.upgradeId as DreamUpgradeIdV2})
  if(record.kind==='reality-upgrade'&&typeof record.upgradeId==='string')return Object.freeze({kind:'reality-upgrade',upgradeId:record.upgradeId})
  if(record.kind==='influence-purchase'&&['hunters','gatherers','solar','fusion'].includes(record.purchaseId as string)&&['buy-1','buy-10','buy-50','buy-100','buy-max'].includes(record.mode as string))return Object.freeze({kind:'influence-purchase',purchaseId:record.purchaseId as DreamInfluencePurchaseIdV2,mode:record.mode as V2PurchaseMode})
  if(record.kind==='education-start'&&['engineering','shipping','worldTrade','worldPeace','mathematics','advancedPhysics'].includes(record.educationId as string))return Object.freeze({kind:'education-start',educationId:record.educationId as keyof DreamStateV2['education']})
  if(record.kind==='boost'&&(record.boostId==='community'||record.boostId==='factories'))return Object.freeze({kind:'boost',boostId:record.boostId})
  return null}
function closed(value:unknown,keys:readonly string[]):Readonly<Record<string,unknown>>|null{if(value===null||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)return null;const d=Object.getOwnPropertyDescriptors(value),actual=Reflect.ownKeys(d);if(actual.length!==keys.length||actual.some(k=>typeof k!=='string'||!keys.includes(k))||keys.some(k=>d[k]===undefined||!d[k]!.enumerable||!('value'in d[k]!)))return null;return Object.freeze(Object.fromEntries(keys.map(k=>[k,d[k]!.value])))}
function equalTree(a:unknown,b:unknown):boolean{if(Object.is(a,b))return true;if(a===null||b===null||typeof a!=='object'||typeof b!=='object'||Object.getPrototypeOf(a)!==Object.getPrototypeOf(b))return false;const ak=Reflect.ownKeys(a),bk=Reflect.ownKeys(b);if(ak.length!==bk.length||ak.some(k=>!bk.includes(k)))return false;return ak.every(k=>{const x=Object.getOwnPropertyDescriptor(a,k),y=Object.getOwnPropertyDescriptor(b,k);return x!==undefined&&y!==undefined&&'value'in x&&'value'in y&&equalTree(x.value,y.value)})}
function quoteFailure(code:DreamCommandQuoteV2['code'],kind:DreamCommandV2['kind']='dream-upgrade',revision=0):Readonly<DreamCommandQuoteV2>{return Object.freeze({kind:'dream-command-quote-v2',accepted:false,code,sourceRevision:revision,commandKind:kind,commandId:'',requestedMode:null,currencyPath:'',batches:cloneGameDecimal(GAME_DECIMAL_ZERO),unitsGranted:cloneGameDecimal(GAME_DECIMAL_ZERO),quotedCost:cloneGameDecimal(GAME_DECIMAL_ZERO),debitedStrangeMatter:cloneGameDecimal(GAME_DECIMAL_ZERO),expectedPublication:null})}
function commitFailure(code:DreamCommandCommitV2['code']):Readonly<DreamCommandCommitV2>{return Object.freeze({accepted:false,changed:false,code,publication:null})}
function subtractForReport(before:GameDecimal,after:GameDecimal):GameDecimal{try{return subtractGameDecimals(before,after)}catch{return cloneGameDecimal(GAME_DECIMAL_ZERO)}}
function deriveRuntime(state:CanonicalGameStateV2,runtime:CanonicalRuntimeSidecarV2):Readonly<CanonicalRuntimeSidecarV2>{const derived=deriveDysonV2FromCauses(state,runtime);return cloneCanonicalRuntimeSidecarV2(Object.freeze({dysonEvaluationSnapshot:derived.nextEvaluationSnapshot,dysonTuningProfile:runtime.dysonTuningProfile}))}
function commandIdentifier(command:DreamCommandV2):string{return command.kind==='dream-upgrade'||command.kind==='reality-upgrade'?command.upgradeId:command.kind==='influence-purchase'?command.purchaseId:command.kind==='education-start'?command.educationId:command.boostId}
