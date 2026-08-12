import { cloneCanonicalGameStateV2 } from '../game-state/cloneV2'
import { cloneCanonicalRuntimeSidecarV2, type CanonicalRuntimeSidecarV2 } from '../game-state/runtimeV2'
import type { CanonicalGameStateV2 } from '../game-state/typesV2'
import { validateCanonicalGameStateV2 } from '../game-state/validateV2'
import { cloneGameDecimal,compareGameDecimals,gameDecimalFromNumber,subtractGameDecimals,type GameDecimal } from '../math/gameDecimal'
import { deriveDysonV2FromCauses } from '../simulation/dysonV2Derivation'

export interface DeveloperOptionsPlatformStateV2 {readonly developerOptionsPurchased:boolean;readonly developerOptionsEnabled:boolean}
export interface DeveloperOptionsPublicationV2 {readonly revision:number;readonly state:CanonicalGameStateV2;readonly runtime:CanonicalRuntimeSidecarV2;readonly platform:DeveloperOptionsPlatformStateV2}
export interface DeveloperOptionsPersistenceCandidateV2 extends DeveloperOptionsPublicationV2 {readonly kind:'developer-options-persistence-candidate-v2'}
export interface DeveloperOptionsTransactionPortV2 {
  readonly invalidateAndBlockStoredTimeJob:(expectedRevision:number)=>boolean|Promise<boolean>
  readonly persist:(candidate:Readonly<DeveloperOptionsPersistenceCandidateV2>)=>void|Promise<void>
  readonly readBack:()=>Readonly<DeveloperOptionsPersistenceCandidateV2>|null|Promise<Readonly<DeveloperOptionsPersistenceCandidateV2>|null>
  readonly releaseStoredTimeBlock:()=>void|Promise<void>
}
export interface DeveloperOptionsReceiverAuthorityV2 {readonly kind:'developer-options-receiver-authority-v2';readonly platform:DeveloperOptionsPlatformStateV2}
export interface DeveloperOptionsQuoteV2 {readonly kind:'developer-options-quote-v2';readonly accepted:boolean;readonly code:'ready'|'invalid-request'|'already-owned'|'unaffordable'|'revision-exhausted';readonly sourceRevision:number;readonly operation:'purchase'|'enable'|null;readonly quotedShardCost:GameDecimal;readonly quotedStrangeMatterCost:GameDecimal;readonly debitedShards:GameDecimal;readonly debitedStrangeMatter:GameDecimal;readonly expectedCandidate:Readonly<DeveloperOptionsPersistenceCandidateV2>|null}
export interface DeveloperOptionsCommitV2 {readonly accepted:boolean;readonly changed:boolean;readonly code:'committed'|'committed-fenced'|'quote-rejected'|'stale-publication'|'busy'|'stored-time-block-failed'|'persistence-failed'|'indeterminate';readonly publication:Readonly<DeveloperOptionsPublicationV2>}
interface Issued {readonly source:Readonly<DeveloperOptionsPublicationV2>;readonly candidate:Readonly<DeveloperOptionsPersistenceCandidateV2>}
const SHARD_COST=gameDecimalFromNumber(100_000),MATTER_COST=gameDecimalFromNumber(500_000)
const issuedReceiverAuthorities=new WeakMap<object,Readonly<{platform:Readonly<DeveloperOptionsPlatformStateV2>;port:Readonly<DeveloperOptionsTransactionPortV2>}>>()

/** @internal Issued only by the receiver-local application persistence owner. */
export function registerDeveloperOptionsReceiverAuthorityV2(platform:Readonly<DeveloperOptionsPlatformStateV2>,port:Readonly<DeveloperOptionsTransactionPortV2>):Readonly<DeveloperOptionsReceiverAuthorityV2>{const capturedPlatform=capturePlatform(platform);if(capturedPlatform===null)throw new TypeError('Developer Options receiver platform state is invalid.');const capturedPort=capturePort(port),authority=Object.freeze({kind:'developer-options-receiver-authority-v2' as const,platform:capturedPlatform});issuedReceiverAuthorities.set(authority,Object.freeze({platform:capturedPlatform,port:capturedPort}));return authority}

/** Dormant state+receiver-platform transaction owner. */
export class DeveloperOptionsTransactionOwnerV2 {
  #publication:Readonly<DeveloperOptionsPublicationV2>
  readonly #port:Readonly<DeveloperOptionsTransactionPortV2>
  readonly #issued=new WeakMap<object,Issued>()
  readonly #consumed=new WeakSet<object>()
  #busy=false
  #indeterminate=false

  constructor(initial:Readonly<DeveloperOptionsPublicationV2>,authority:Readonly<DeveloperOptionsReceiverAuthorityV2>){this.#publication=admitPublication(initial)??invalid('Invalid Developer Options publication.');const issued=authority!==null&&typeof authority==='object'?issuedReceiverAuthorities.get(authority as object):undefined;if(issued===undefined||!equalTree(this.#publication.platform,issued.platform))throw new TypeError('Developer Options receiver authority is invalid.');this.#port=issued.port}
  snapshot():Readonly<DeveloperOptionsPublicationV2>{return this.#publication}
  quote(request:Readonly<{kind:'purchase-developer-options'}>):Readonly<DeveloperOptionsQuoteV2>{
    try{
      if(captureRequest(request)===null)return quoteFailure('invalid-request',this.#publication.revision)
      if(this.#publication.platform.developerOptionsEnabled)return quoteFailure('already-owned',this.#publication.revision)
      if(this.#publication.revision===Number.MAX_SAFE_INTEGER)return quoteFailure('revision-exhausted',this.#publication.revision)
      const state=this.#publication.state
      const operation=this.#publication.platform.developerOptionsPurchased?'enable' as const:'purchase' as const
      if(operation==='purchase'&&(compareGameDecimals(state.quantum.availableShards,SHARD_COST)<0||compareGameDecimals(state.dream.strangeMatter,MATTER_COST)<0))return quoteFailure('unaffordable',this.#publication.revision)
      const nextShards=operation==='purchase'?subtractGameDecimals(state.quantum.availableShards,SHARD_COST):state.quantum.availableShards,nextMatter=operation==='purchase'?subtractGameDecimals(state.dream.strangeMatter,MATTER_COST):state.dream.strangeMatter
      const candidateState=cloneCanonicalGameStateV2({...state,quantum:{...state.quantum,availableShards:nextShards},dream:{...state.dream,strangeMatter:nextMatter}})
      const derived=deriveDysonV2FromCauses(candidateState,this.#publication.runtime),runtime=cloneCanonicalRuntimeSidecarV2(Object.freeze({dysonEvaluationSnapshot:derived.nextEvaluationSnapshot,dysonTuningProfile:this.#publication.runtime.dysonTuningProfile}))
      const candidate=Object.freeze({kind:'developer-options-persistence-candidate-v2' as const,revision:this.#publication.revision+1,state:candidateState,runtime,platform:Object.freeze({developerOptionsPurchased:true,developerOptionsEnabled:true})})
      const quote=Object.freeze({kind:'developer-options-quote-v2' as const,accepted:true,code:'ready' as const,sourceRevision:this.#publication.revision,operation,quotedShardCost:operation==='purchase'?cloneGameDecimal(SHARD_COST):gameDecimalFromNumber(0),quotedStrangeMatterCost:operation==='purchase'?cloneGameDecimal(MATTER_COST):gameDecimalFromNumber(0),debitedShards:subtractGameDecimals(state.quantum.availableShards,nextShards),debitedStrangeMatter:subtractGameDecimals(state.dream.strangeMatter,nextMatter),expectedCandidate:candidate})
      this.#issued.set(quote,Object.freeze({source:this.#publication,candidate}));return quote
    }catch{return quoteFailure('invalid-request',this.#publication.revision)}
  }
  async commit(quote:Readonly<DeveloperOptionsQuoteV2>):Promise<Readonly<DeveloperOptionsCommitV2>>{
    if(this.#indeterminate)return commitResult('indeterminate',this.#publication)
    if(this.#busy)return commitResult('busy',this.#publication)
    this.#busy=true
    try{
      if(quote===null||typeof quote!=='object'||this.#consumed.has(quote as object))return commitResult('quote-rejected',this.#publication)
      const issued=this.#issued.get(quote as object);if(issued===undefined)return commitResult('quote-rejected',this.#publication)
      this.#consumed.add(quote as object)
      if(!equalTree(this.#publication,issued.source))return commitResult('stale-publication',this.#publication)
      let blocked:boolean
      try{blocked=await this.#port.invalidateAndBlockStoredTimeJob(this.#publication.revision)}catch{return commitResult('stored-time-block-failed',this.#publication)}
      if(!blocked)return commitResult('stored-time-block-failed',this.#publication)
      try{await this.#port.persist(issued.candidate)}catch{/* Exact readback below resolves before-write versus after-write failure. */}
      let readBack:Readonly<DeveloperOptionsPersistenceCandidateV2>|null
      try{readBack=admitCandidate(await this.#port.readBack())}catch{readBack=null}
      if(readBack===null){this.#indeterminate=true;return commitResult('indeterminate',this.#publication)}
      if(!equalTree(readBack,issued.candidate)){
        if(equalTree(readBack,persistenceCandidate(issued.source))){try{await this.#port.releaseStoredTimeBlock()}catch{this.#indeterminate=true;return commitResult('indeterminate',this.#publication)}return commitResult('persistence-failed',this.#publication)}
        this.#indeterminate=true;return commitResult('indeterminate',this.#publication)
      }
      this.#publication=Object.freeze({revision:readBack.revision,state:readBack.state,runtime:readBack.runtime,platform:readBack.platform})
      try{await this.#port.releaseStoredTimeBlock()}catch{this.#indeterminate=true;return Object.freeze({accepted:true,changed:true,code:'committed-fenced' as const,publication:this.#publication})}
      return Object.freeze({accepted:true,changed:true,code:'committed' as const,publication:this.#publication})
    }finally{this.#busy=false}
  }
}

function capturePort(value:unknown):Readonly<DeveloperOptionsTransactionPortV2>{const record=closed(value,['invalidateAndBlockStoredTimeJob','persist','readBack','releaseStoredTimeBlock']);if(record===null)throw new TypeError('Developer Options transaction port is invalid.');for(const key of Object.keys(record))if(typeof record[key]!=='function')throw new TypeError('Developer Options transaction port is invalid.');return Object.freeze({invalidateAndBlockStoredTimeJob:(record.invalidateAndBlockStoredTimeJob as DeveloperOptionsTransactionPortV2['invalidateAndBlockStoredTimeJob']).bind(value),persist:(record.persist as DeveloperOptionsTransactionPortV2['persist']).bind(value),readBack:(record.readBack as DeveloperOptionsTransactionPortV2['readBack']).bind(value),releaseStoredTimeBlock:(record.releaseStoredTimeBlock as DeveloperOptionsTransactionPortV2['releaseStoredTimeBlock']).bind(value)})}
function captureRequest(value:unknown):Readonly<{kind:'purchase-developer-options'}>|null{const record=closed(value,['kind']);return record?.kind==='purchase-developer-options'?Object.freeze({kind:'purchase-developer-options'}):null}
function admitPublication(value:unknown):Readonly<DeveloperOptionsPublicationV2>|null{const record=closed(value,['revision','state','runtime','platform']);if(record===null||!validRevision(record.revision)||!validateCanonicalGameStateV2(record.state).valid)return null;const platform=capturePlatform(record.platform);if(platform===null)return null;try{return Object.freeze({revision:record.revision as number,state:cloneCanonicalGameStateV2(record.state as CanonicalGameStateV2),runtime:cloneCanonicalRuntimeSidecarV2(record.runtime as CanonicalRuntimeSidecarV2),platform})}catch{return null}}
function admitCandidate(value:unknown):Readonly<DeveloperOptionsPersistenceCandidateV2>|null{const record=closed(value,['kind','revision','state','runtime','platform']);if(record?.kind!=='developer-options-persistence-candidate-v2')return null;const publication=admitPublication(Object.freeze({revision:record.revision,state:record.state,runtime:record.runtime,platform:record.platform}));return publication===null?null:Object.freeze({kind:'developer-options-persistence-candidate-v2',...publication})}
function capturePlatform(value:unknown):Readonly<DeveloperOptionsPlatformStateV2>|null{const record=closed(value,['developerOptionsPurchased','developerOptionsEnabled']);return record!==null&&typeof record.developerOptionsPurchased==='boolean'&&typeof record.developerOptionsEnabled==='boolean'&&(!record.developerOptionsEnabled||record.developerOptionsPurchased)?Object.freeze({developerOptionsPurchased:record.developerOptionsPurchased,developerOptionsEnabled:record.developerOptionsEnabled}):null}
function validRevision(value:unknown):value is number{return typeof value==='number'&&Number.isSafeInteger(value)&&value>=0&&!Object.is(value,-0)}
function closed(value:unknown,keys:readonly string[]):Readonly<Record<string,unknown>>|null{if(value===null||typeof value!=='object'||Array.isArray(value)||Object.getPrototypeOf(value)!==Object.prototype)return null;const descriptors=Object.getOwnPropertyDescriptors(value),actual=Reflect.ownKeys(descriptors);if(actual.length!==keys.length||actual.some(key=>typeof key!=='string'||!keys.includes(key))||keys.some(key=>descriptors[key]===undefined||!descriptors[key]!.enumerable||!('value'in descriptors[key]!)))return null;return Object.freeze(Object.fromEntries(keys.map(key=>[key,descriptors[key]!.value]))) }
function equalTree(a:unknown,b:unknown):boolean{if(Object.is(a,b))return true;if(a===null||b===null||typeof a!=='object'||typeof b!=='object'||Object.getPrototypeOf(a)!==Object.getPrototypeOf(b))return false;const ak=Reflect.ownKeys(a),bk=Reflect.ownKeys(b);return ak.length===bk.length&&ak.every(key=>bk.includes(key)&&equalTree(Object.getOwnPropertyDescriptor(a,key)?.value,Object.getOwnPropertyDescriptor(b,key)?.value))}
function persistenceCandidate(publication:Readonly<DeveloperOptionsPublicationV2>):Readonly<DeveloperOptionsPersistenceCandidateV2>{return Object.freeze({kind:'developer-options-persistence-candidate-v2',revision:publication.revision,state:publication.state,runtime:publication.runtime,platform:publication.platform})}
function quoteFailure(code:DeveloperOptionsQuoteV2['code'],revision:number):Readonly<DeveloperOptionsQuoteV2>{return Object.freeze({kind:'developer-options-quote-v2',accepted:false,code,sourceRevision:revision,operation:null,quotedShardCost:cloneGameDecimal(SHARD_COST),quotedStrangeMatterCost:cloneGameDecimal(MATTER_COST),debitedShards:gameDecimalFromNumber(0),debitedStrangeMatter:gameDecimalFromNumber(0),expectedCandidate:null})}
function commitResult(code:DeveloperOptionsCommitV2['code'],publication:Readonly<DeveloperOptionsPublicationV2>):Readonly<DeveloperOptionsCommitV2>{return Object.freeze({accepted:false,changed:false,code,publication})}
function invalid(message:string):never{throw new TypeError(message)}
