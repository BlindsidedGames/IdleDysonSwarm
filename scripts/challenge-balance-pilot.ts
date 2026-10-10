import {readFileSync,writeFileSync} from 'node:fs'
import {hydrateGameState,dehydrateGameState} from '../src/game-state/mapping'
import {prepareIdb1Save} from '../src/save/prepare'
import {serializeSharedWebSave} from '../src/save/serialization'
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
import {MANUAL_LABOUR_AUGMENTS} from '../src/simulation/skillSubskills'
import type {CanonicalGameStateV1} from '../src/game-state/types'
const session=hydrateGameState(prepareIdb1Save(readFileSync('test/fixtures/schema-08-canonical-idb1-main-save.txt','utf8')).prepared)
const context={mode:'active' as const,automationIntervalSeconds:1,realityWorkerTuning:{workerBatchSize:128n,baseWorkerGenerationSpeed:4},dreamResetDefinitions:SIMULATION_UPGRADE_DEFINITIONS,realityUpgradeDefinitions:REALITY_UPGRADE_DEFINITIONS,infinityResetAssetLookup:createCapturedInfinityAssetLookup(gameDataCatalog.assets)}
function seed():CanonicalGameStateV1{
 const s=session.state
 return {...s,civilization:undefined,meta:{...s.meta,firstInfinityComplete:true,reworkMigrationChoice:'keep'},challenges:{...EMPTY_INFINITY_CHALLENGES,unlocked:true},
 infinity:{...s.infinity,points:128n,spentPoints:0n,permanentSkillPoints:10n,secretsOfTheUniverse:27n,breakTarget:1n,automaticResetEnabled:true,automationUnlocked:{research:true,bots:true}},
 quantum:{...s.quantum,cashBonusLevels:0n,scienceBonusLevels:0n,divisionsPurchased:0n,unlocks:{...s.quantum.unlocks,breakTheLoop:true,doubleInfinityPoints:false,botMultitasking:false,fragments:false,purity:false,terra:false,power:false,paragade:false,stellar:false,matrioshkaBrains:false,birchPlanets:false,galacticBrains:false}},
 skills:{...s.skills,byId:{},activeAutoAssignment:[],points:0n,autoAssignNonRefundable:false},timeline:{...s.timeline,doubleTime:{...s.timeline.doubleTime,unlocked:false}}}
}
const initial=seed()
writeFileSync('output/challenges/preview-save.txt',serializeSharedWebSave(dehydrateGameState(session,initial).copyValidatedState()))
const output=process.env.CHALLENGE_OUTPUT??'balance-results.json'
const outcomes=[]
for(const c of REWORK_CHALLENGES.filter(c=>!process.env.CHALLENGE_IDS||process.env.CHALLENGE_IDS.split(',').includes(c.id))){
 const entered=restartInfinityChallenge(initial,'enter',0n,c.id)
 if(!entered.ok)throw Error(entered.code)
 let game=entered.state
 const normalQueue=['startHereTree','assemblyLineTree','aiManagerTree','serverTree','dataCenterTree','planetsTree','workerEfficiencyTree','panelLifetime20Tree','scientificPlanets','androids']
 const queue=c.id==='lean-build'&&process.env.CHALLENGE_BUILD==='planet-generation'?['scientificPlanets']:c.id==='built-by-hand'?Object.values(MANUAL_LABOUR_AUGMENTS):c.id==='hands-off'?['scientificPlanets',...normalQueue]:normalQueue
 game={...game,dyson:{...game.dyson,botDistribution:c.id==='no-science'||c.id==='built-by-hand'?0:0.5,automation:{...game.dyson.automation,buyMode:'buy-max',enabledFacilities:Object.fromEntries(Object.keys(game.dyson.facilities).map(id=>[id,true])) as typeof game.dyson.automation.enabledFacilities}},skills:{...game.skills,activeAutoAssignment:queue},research:{...game.research,automation:{...game.research.automation,buyMode:'buy-max'}}}
 const assignment=runCanonicalSkillAutoAssignment(game);if(!assignment.accepted)throw Error(assignment.reason);game=assignment.state
 let carrier={gameState:game,compatibilityTuning:session.compatibilityTuning,evaluationSnapshot:session.skillEffectEvaluationSnapshot,entitlements:{permanentDoubleIp:false},tinker:createCanonicalTinkerRuntimeState()}
 let elapsed=0,issue:string|undefined
 const checkpoints=[]
 const cycleTimes:number[]=[]
 let previousInfinities=0
 const maximum=Number(process.env.CHALLENGE_MAX_SECONDS??7200)
 while(carrier.gameState.challenges?.replacement?.active && elapsed<maximum){
  if(c.id==='built-by-hand'&&!carrier.tinker.running){const model=new CanonicalEventTimeModel(carrier,context);model.startTinker(true);carrier=model.takeState()}
  const step=advanceGame(carrier,{source:'active',baseSeconds:c.id==='built-by-hand'?1:30,automation:'enabled'},context,1/60)
  carrier=step.state;elapsed+=step.baseSecondsConsumed;issue=step.issue
  const count=carrier.gameState.challenges?.replacement?.infinities??0
  if(count>previousInfinities){cycleTimes.push(elapsed);previousInfinities=count}
  if(issue||step.baseSecondsConsumed===0)break
  if(process.env.CHALLENGE_TRACE&&elapsed%300===0)console.log('TRACE',c.id,elapsed,String(carrier.gameState.challenges?.replacement?.earnedIp),carrier.gameState.dyson.bots)
  if(elapsed%300===0)checkpoints.push({seconds:elapsed,bots:carrier.gameState.dyson.bots,ip:String(carrier.gameState.challenges?.replacement?.earnedIp),goal:String(carrier.gameState.dyson.goalStage)})
 }
 const r=carrier.gameState.challenges?.replacement
 const outcome={id:c.id,build:process.env.CHALLENGE_BUILD??'standard-priority',target:String(c.target),seconds:elapsed,completed:r?.active===null,earnedIp:String(r?.earnedIp),infinities:r?.infinities,paidPurchases:r?.paidPurchases,paidTypes:r?.paidFacilityIds.length,bots:carrier.gameState.dyson.bots,goalStage:String(carrier.gameState.dyson.goalStage),issue,cycleTimes,checkpoints}
 outcomes.push(outcome);writeFileSync('output/challenges/'+output,JSON.stringify({profile:'No paid boosts; 27 Secrets; 10 shop SP; standard automation; zero Division/Discovery/fractures; declared static skill priority; Thirty-second active batches with automation purchases at each batch boundary; manual play uses one-second batches. Coarse ticks make these duration estimates, not live-play timing. This is a strategy probe, not optimal play.',maximum,outcomes},null,2));console.log(JSON.stringify(outcome))
}
