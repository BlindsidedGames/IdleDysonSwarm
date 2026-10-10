/** Isolated synthetic research only. Target overrides exist in this process;
 * no game file, external save, account or production service is read/written.
 * Feature definitions/rewards are restored after every job. */
import {readFileSync, writeFileSync} from 'node:fs'
import {hydrateGameState} from '../src/game-state/mapping'
import {prepareIdb1Save} from '../src/save/prepare'
import {gameDataCatalog} from '../src/game-data/catalog'
import {restartInfinityChallenge} from '../src/simulation/canonicalInfinityChallengeRestart'
import {CanonicalEventTimeModel,createCapturedInfinityAssetLookup} from '../src/simulation/canonicalEventTimeModel'
import {createCanonicalTinkerRuntimeState} from '../src/simulation/canonicalTinker'
import {advanceGame} from '../src/simulation/gameStep'
import {SIMULATION_UPGRADE_DEFINITIONS} from '../src/simulation/dreamEducationUpgrades'
import {REALITY_UPGRADE_DEFINITIONS} from '../src/simulation/realityUpgrades'
import {EMPTY_INFINITY_CHALLENGES} from '../src/simulation/infinityChallenges'
import {REWORK_CHALLENGES} from '../src/simulation/reworkChallenges'
import {runCanonicalSkillAutoAssignment} from '../src/simulation/canonicalSkillTransactions'
import {galvanizeCanonicalSkill} from '../src/simulation/canonicalSkillTransactions'
import {applyCanonicalSkillPresetLayout} from '../src/simulation/canonicalSkillTransactions'
import {purchaseCanonicalInfinityShopItem} from '../src/simulation/canonicalInfinityShop'
import {advanceCivilization} from '../src/simulation/civilization'
import {tryPurchaseCanonicalFacility} from '../src/simulation/canonicalDysonCommands'
import {purchaseCanonicalResearch,UNITY_RESEARCH_PRESENTATION_ORDER} from '../src/simulation/researchAutomation'
import {createSimulationSummary} from '../src/simulation/types'
import {validateCanonicalGameState} from '../src/game-state/validate'
import {MANUAL_LABOUR_AUGMENTS} from '../src/simulation/skillSubskills'
import type {CanonicalGameStateV1, ReworkChallengeId} from '../src/game-state/types'

type Job={id:ReworkChallengeId; profile?:'early'|'previous'|'mature'; progression?:'first'|'entry'|'developed'|'legacy'; budgetOverride?:number; plan?:'division'|'first-secret'; giftAuto?:'bots'; build?:string; adaptive?:boolean; target?:number; tick?:number; max?:number; tinker?:boolean; bootstrap?:boolean; breakTarget?:number; distribution?:number; stopFirst?:boolean; botGoal?:number; noFractures?:boolean}
const jobs:Job[]=JSON.parse(process.env.CHALLENGE_JOBS??'[]')
const output=process.env.CHALLENGE_OUTPUT??'investigation-results.json'
const session=hydrateGameState(prepareIdb1Save(readFileSync('test/fixtures/schema-08-canonical-idb1-main-save.txt','utf8')).prepared)
const context={mode:'active' as const,automationIntervalSeconds:1,realityWorkerTuning:{workerBatchSize:128n,baseWorkerGenerationSpeed:4},dreamResetDefinitions:SIMULATION_UPGRADE_DEFINITIONS,realityUpgradeDefinitions:REALITY_UPGRADE_DEFINITIONS,infinityResetAssetLookup:createCapturedInfinityAssetLookup(gameDataCatalog.assets)}
const industrial=['startHereTree','assemblyLineTree','aiManagerTree','serverTree','dataCenterTree','planetsTree','workerEfficiencyTree','panelLifetime20Tree','scientificPlanets','androids']
const builds:Record<string,string[]>={
 industrial,
 generation:['scientificPlanets','shouldersOfGiants','superRadiantScattering','androids','workerBoost','rudimentarySingularity','planetAssembly','stellarSacrifices','stellarDominance','doubleScienceTree','producedAsScienceTree'],
 panels:['androids','workerBoost','assemblyLineTree','aiManagerTree','serverTree','dataCenterTree','parallelProcessing','planetsTree','pocketDimensions','stayingPower','rudimentarySingularity','agressiveAlgorithms'],
 'ground-generation':['rudimentarySingularity','androids','workerBoost','dataCenterTree','agressiveAlgorithms','stayingPower'],
 'no-science-srs':['superRadiantScattering','androids','workerBoost','rudimentarySingularity','agressiveAlgorithms','dataCenterTree','stayingPower'],
 'ground-srs':['shouldersOfGiants','superRadiantScattering','rudimentarySingularity','workerBoost','agressiveAlgorithms','dataCenterTree','stayingPower'],
 'hands-generation':['shouldersOfGiants','superRadiantScattering','rudimentarySingularity','planetAssembly','doubleScienceTree','producedAsScienceTree'],
 'manual-start':['manualLabour','scientificPlanets','shouldersOfGiants','superRadiantScattering','androids','workerBoost'],
 'lean-panels':['startHereTree','workerEfficiencyTree','panelLifetime20Tree','artificiallyEnhancedPanels'],
 'lean-cash':['startHereTree','workerEfficiencyTree','workerBoost','assemblyLineTree'],
 'lean-worthy':['worthySacrifice','dysonSubsidies'],
 'lean-science':['startHereTree','doubleScienceTree','producedAsScienceTree','workerEfficiencyTree'],
 'lean-generation':['scientificPlanets'],
}
function seed(job:Job):CanonicalGameStateV1{
 const s=session.state, mature=job.profile==='mature', early=job.profile==='early'
 const unlock=REWORK_CHALLENGES.find(c=>c.id===job.id)!.unlockIp
 return {...s,civilization:undefined,meta:{...s.meta,firstInfinityComplete:true,reworkMigrationChoice:'keep',botBoost:undefined},challenges:{...EMPTY_INFINITY_CHALLENGES,unlocked:true},
 infinity:{...s.infinity,points:mature?512n:early?(unlock>16n?unlock:16n):128n,spentPoints:0n,permanentSkillPoints:early?2n:10n,secretsOfTheUniverse:early?8n:27n,breakTarget:1n,automaticResetEnabled:true,automationUnlocked:{research:true,bots:true}},
 quantum:{...s.quantum,cashBonusLevels:mature?8n:0n,scienceBonusLevels:mature?8n:0n,divisionsPurchased:0n,unlocks:{...Object.fromEntries(Object.keys(s.quantum.unlocks).map(k=>[k,false])) as typeof s.quantum.unlocks,breakTheLoop:true,botMultitasking:mature,fragments:mature,purity:mature,terra:mature,power:mature,paragade:mature,stellar:mature,matrioshkaBrains:mature,birchPlanets:mature,galacticBrains:mature}},
 skills:{...s.skills,byId:{},fragments:0n,activeAutoAssignment:[],points:0n,autoAssignNonRefundable:false},timeline:{...s.timeline,storedTimeAvailableSeconds:0,offlineBoost:undefined,doubleTime:{...s.timeline.doubleTime,unlocked:mature}}}
}
let profileAudit:unknown
function progressionSeed(job:Job):CanonicalGameStateV1{
 const stage=job.progression!, budget=job.budgetOverride!==undefined?BigInt(job.budgetOverride):stage==='first'?1n:stage==='entry'?(REWORK_CHALLENGES.find(c=>c.id===job.id)!.unlockIp<=16n?16n:32n):stage==='developed'?64n:512n
 const s=seed({...job,profile:'early'})
 let state:CanonicalGameStateV1={...s,meta:{...s.meta,firstQuantumComplete:stage==='legacy'},quantum:{...s.quantum,cashBonusLevels:0n,scienceBonusLevels:0n,permanentSecrets:0n,pointsEarned:0n,pointsSpent:0n,unlocks:{...Object.fromEntries(Object.keys(s.quantum.unlocks).map(k=>[k,false])) as typeof s.quantum.unlocks}},infinity:{...s.infinity,points:budget,spentPoints:0n,secretsOfTheUniverse:0n,permanentSkillPoints:0n,automaticResetEnabled:false,retainedFacilities:Object.fromEntries(Object.keys(s.infinity.retainedFacilities).map(k=>[k,false])) as typeof s.infinity.retainedFacilities,automationUnlocked:{research:false,bots:false}},skills:{...s.skills,points:0n},timeline:{...s.timeline,doubleTime:{...s.timeline.doubleTime,unlocked:false}}}
 const purchased:string[]=[],failed:unknown[]=[]
 const buy=(id:string,count=1)=>{for(let i=0;i<count;i++){const r=purchaseCanonicalInfinityShopItem(state,id);if(!r.accepted){failed.push({id,code:r.code,cost:String(r.cost)});break}state=r.state;purchased.push(id)}}
 if(job.giftAuto==='bots')state={...state,infinity:{...state.infinity,automationUnlocked:{...state.infinity.automationUnlocked,bots:true}}}
 if(stage==='first')buy(job.plan==='first-secret'?'secret':'permanent-skill-point')
 else if(stage==='entry'&&budget===16n){
  if(!state.infinity.automationUnlocked.bots)buy('unlock-bot-automation')
  if(job.plan==='division'){if(job.id==='no-science'){buy('permanent-skill-point',job.giftAuto==='bots'?8:5);buy('rework-Division');buy('secret',3)}else{buy('unlock-research-automation');buy('rework-Division');buy('secret',5)}}
  else {buy('unlock-research-automation');buy('permanent-skill-point',job.giftAuto==='bots'?7:4);buy('secret',6)}
 }
 else if(stage==='entry'){buy('unlock-bot-automation');buy('unlock-research-automation');buy('permanent-skill-point',8);buy('secret',10);buy('rework-Division');buy('rework-DoubleIP')}
 else {buy('unlock-bot-automation');buy('unlock-research-automation');buy('permanent-skill-point',10);buy('secret',27);buy('rework-BreakTheLoop');buy('rework-BotMultitasking');buy('rework-DoubleIP');buy('rework-Division',stage==='legacy'?6:1)
  if(stage==='legacy'){for(const id of ['retain-assembly-lines','retain-ai-managers','retain-servers','retain-data-centers','retain-planets','rework-DoubleTime','rework-Fragments','rework-Purity','rework-Terra','rework-Power','rework-Paragade','rework-Stellar','rework-MatrioshkaBrains','rework-BirchPlanets','rework-CashBonus','rework-ScienceBonus'])buy(id)}
 }
 const prior=(stage==='first'?(job.id==='blank-slate'?['built-by-hand']:[]):stage==='entry'?(budget===16n?['built-by-hand']:['built-by-hand','no-science']):REWORK_CHALLENGES.map(c=>c.id).filter(id=>stage==='legacy'||!['short-circuit','supply-shortage'].includes(id))).filter(id=>id!==job.id)
 state={...state,challenges:{...state.challenges!,replacement:{version:1,active:null,completedIds:prior as ReworkChallengeId[],earnedIp:0n,infinities:0,paidPurchases:0,paidFacilityIds:[],savedDiscovery:undefined,savedAutoAssignment:[],savedBreakTarget:1n,savedBotDistribution:0}}}
 const fractureOrder=['scientificPlanets','androids','shouldersOfGiants','rudimentarySingularity','superRadiantScattering','workerBoost','planetAssembly','stellarSacrifices','stellarDominance','purityOfSEssence','purityOfMind','productionScaling']
 const desired=job.noFractures?0:stage==='first'?1:stage==='entry'?(budget===16n?1:2):stage==='developed'?6:12
 let foragerSeconds=0
 if(stage==='legacy')state={...state,challenges:{...state.challenges!,blankSlateCompleted:true,trialAndErrorCompleted:true,noScienceCompleted:true,completedQuantumChallenges:['no-science','short-circuit','grounded','built-by-hand','hands-off','commitment-issues','supply-shortage'],galvanizers:16n,hasEarnedGalvanizer:true}}
 else while((state.challenges?.galvanizers??0n)<BigInt(desired)&&foragerSeconds<1e7){state=advanceCivilization(state,60);foragerSeconds+=60}
 for(const id of fractureOrder.slice(0,desired)){const r=galvanizeCanonicalSkill(state,id);if(!r.accepted)throw Error('Fracture '+id+': '+r.reason);state=r.state}
 profileAudit={stage,budget:String(budget),spent:String(state.infinity.spentPoints),unspent:String(state.infinity.points-state.infinity.spentPoints),shopSp:String(state.infinity.permanentSkillPoints),secrets:String(state.infinity.secretsOfTheUniverse),division:String(state.quantum.divisionsPurchased),doubleIp:state.quantum.unlocks.doubleInfinityPoints,doubleTime:state.timeline.doubleTime.unlocked,botMultitasking:state.quantum.unlocks.botMultitasking,retainedFacilities:state.infinity.retainedFacilities,automation:state.infinity.automationUnlocked,priorChallengeReceipts:prior,fracturedIds:state.challenges?.galvanizedSkillIds,remainingCatalysts:String(state.challenges?.galvanizers),foragerSeconds,foragerMilestones:state.civilization?.awardedCatalystMilestoneIds,purchased,failed}
 // Retain the authentic Forager snapshot. New Catalysts may be earned during
 // the attempt, but current challenge commands prohibit spending them then.
 return state
}
const outcomes:unknown[]=[]
for(const job of jobs){
 const c=REWORK_CHALLENGES.find(c=>c.id===job.id)!, originalTarget=c.target
 if(job.target!==undefined)Object.assign(c,{target:BigInt(job.target)})
 try{
  profileAudit=undefined
  const initial=job.progression?progressionSeed(job):seed(job), entered=restartInfinityChallenge(initial,'enter',0n,job.id)
  if(!entered.ok)throw Error(entered.code)
  let game=entered.state
  const build=job.build??(job.id==='hands-off'?'generation':job.id==='lean-build'?'lean-panels':job.id==='no-science'?'panels':job.id==='grounded'?'ground-generation':'generation')
  const queue=job.id==='built-by-hand'?Object.values(MANUAL_LABOUR_AUGMENTS):builds[build]
  if(!queue)throw Error('Unknown build '+build)
  game={...game,dyson:{...game.dyson,botDistribution:job.distribution??(job.id==='no-science'||job.id==='built-by-hand'?0:0.5),automation:{...game.dyson.automation,buyMode:'buy-max',enabledFacilities:Object.fromEntries(Object.keys(game.dyson.facilities).map(id=>[id,true])) as typeof game.dyson.automation.enabledFacilities}},skills:{...game.skills,activeAutoAssignment:queue,autoAssignNonRefundable:build==='generation'||build==='manual-start'},research:{...game.research,automation:{...game.research.automation,buyMode:'buy-max'}},infinity:{...game.infinity,breakTarget:BigInt(job.breakTarget??1)}}
  if(job.bootstrap)game={...game,dyson:{...game.dyson,bots:10,facilities:{...game.dyson.facilities,assembly_lines:[10,0],ai_managers:[10,0],servers:[10,0],data_centers:[10,0],...(job.id==='grounded'?{}:{planets:[10,0]})}}}
  const assigned=runCanonicalSkillAutoAssignment(game);if(!assigned.accepted)throw Error(assigned.reason);game=assigned.state
  const entryValidation=validateCanonicalGameState(game)
  const initialOwned=Object.entries(game.skills.byId).filter(([,s])=>s.owned).map(([id])=>id)
  let carrier={gameState:game,compatibilityTuning:session.compatibilityTuning,evaluationSnapshot:session.skillEffectEvaluationSnapshot,entitlements:{permanentDoubleIp:false},tinker:createCanonicalTinkerRuntimeState()}
  let elapsed=0,issue:string|undefined,previousInfinities=0,paidThresholdTime:number|undefined,objectiveReached=false,respecCount=0
  let selectedPhase='initial'
  const cycleTimes:number[]=[],milestones:unknown[]=[],checkpoints:unknown[]=[]
  const tick=job.tick??30, maximum=job.max??21600
  const started=Date.now()
  while(carrier.gameState.challenges?.replacement?.active&&elapsed<maximum){
   if(job.adaptive){
    const phase=carrier.gameState.dyson.bots<1e8?'cash':'production'
    if(phase!==selectedPhase){const r=applyCanonicalSkillPresetLayout(carrier.gameState,phase==='cash'?builds['lean-cash']:builds[build]);if(!r.accepted)throw Error(r.reason);carrier={...carrier,gameState:r.state};selectedPhase=phase;respecCount++}
   }
   if((job.tinker||job.id==='built-by-hand')&&job.id!=='hands-off'&&!carrier.tinker.running){const model=new CanonicalEventTimeModel(carrier,context);model.startTinker(true);carrier=model.takeState()}
   const step=advanceGame(carrier,{source:'active',baseSeconds:Math.min(tick,maximum-elapsed),automation:'enabled'},context,1/60)
   carrier=step.state;elapsed+=step.baseSecondsConsumed;issue=step.issue
   if(job.progression){
    // Ideal active assistance uses actual manual commands only where owned
    // automation is absent; it does not grant automation ownership.
    let assisted=carrier.gameState
    if(!assisted.infinity.automationUnlocked.bots)for(const id of Object.keys(assisted.dyson.facilities)){assisted=tryPurchaseCanonicalFacility(assisted,id as keyof typeof assisted.dyson.facilities).state}
    if(!assisted.infinity.automationUnlocked.research)for(const id of UNITY_RESEARCH_PRESENTATION_ORDER){const r=purchaseCanonicalResearch(assisted,session.compatibilityTuning,id);if(r.accepted)assisted=r.state}
    carrier={...carrier,gameState:assisted}
    const model=new CanonicalEventTimeModel(carrier,context);model.applyInfinityReset(1/60,createSimulationSummary(),true,false);carrier=model.takeState()
   }
   if(job.botGoal!==undefined&&carrier.gameState.dyson.bots>=job.botGoal){objectiveReached=true;break}
   const progress=carrier.gameState.challenges?.replacement,count=progress?.infinities??0
   if(paidThresholdTime===undefined&&(progress?.paidPurchases??0)>=10&&(progress?.paidFacilityIds.length??0)>=3)paidThresholdTime=elapsed
   if(count>previousInfinities){cycleTimes.push(elapsed);milestones.push({seconds:elapsed,ip:String(progress?.earnedIp),infinities:count});previousInfinities=count;if(job.stopFirst)break}
   if(issue||step.baseSecondsConsumed===0)break
   if(Math.floor(elapsed/tick)%Math.max(1,Math.round(300/tick))===0)checkpoints.push({seconds:elapsed,bots:carrier.gameState.dyson.bots,ip:String(progress?.earnedIp),goal:String(carrier.gameState.dyson.goalStage),facilities:carrier.gameState.dyson.facilities})
  }
  const r=carrier.gameState.challenges?.replacement
  const outcome={job,profileAudit,entryValidation,finalValidation:validateCanonicalGameState(carrier.gameState),originalTarget:String(originalTarget),target:String(c.target),build,initialOwned,respecCount,seconds:elapsed,wallSeconds:(Date.now()-started)/1000,completed:r?.active===null,objectiveReached,earnedIp:String(r?.earnedIp),infinities:r?.infinities,paidPurchases:r?.paidPurchases,paidTypes:r?.paidFacilityIds.length,paidThresholdTime,bots:carrier.gameState.dyson.bots,goalStage:String(carrier.gameState.dyson.goalStage),owned:Object.entries(carrier.gameState.skills.byId).filter(([,s])=>s.owned).map(([id])=>id),issue,cycleTimes,milestones,checkpoints}
  outcomes.push(outcome)
  writeFileSync('output/challenges/'+output,JSON.stringify({modelDirectory:process.cwd(),limits:'Synthetic fixture only; no real saves; process-local candidate target overrides; no paid entitlements, stored time or ad boosts. Automation/continuous production once per declared active tick. Progression profiles buy upgrades with actual transactions and a finite ledger; existing receipts/fractures are recorded. Ideal active assistance supplies manual purchases only when automation is absent and attempts legal manual Infinity resets. Bootstrap is an explicitly artificial one-time start grant, not current behavior. Build prerequisite ownership recorded; queues are strategies, not optimality proofs.',approvedRewards:REWORK_CHALLENGES.map(c=>({id:c.id,reward:String(c.reward)})),outcomes},null,2))
  console.log(JSON.stringify({...outcome,checkpoints:undefined,owned:undefined}))
 }finally{Object.assign(c,{target:originalTarget})}
}
