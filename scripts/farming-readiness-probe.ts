import {mkdirSync,writeFileSync,readFileSync} from 'node:fs'
import {prepareIdb1Save} from '../src/save/prepare'
import {hydrateGameState,dehydrateGameState} from '../src/game-state/mapping'
import {advanceCivilization,validateCivilization} from '../src/simulation/civilization'
import {startFarming,farmingGoal,farmingCanBuyGranary,buyFarmingGranary,farmingComplete,setFarmingFocus,completeFarmingAge} from '../src/simulation/farming'
import {serializeWebSave} from '../src/save/serialization'
const output='output/farming-readiness',session=hydrateGameState(prepareIdb1Save(readFileSync('src/application/firstRun/generated/first-run-schema-12.idb1.txt','utf8')).prepared)
mkdirSync(output,{recursive:true})
const opening=advanceCivilization({...session.state,meta:{...session.state.meta,reworkMigrationChoice:'keep'}},7043),results=[]
for(const policy of ['balanced','provisioning','settlement','expeditions','switching']){
 let state=startFarming(opening)!
 while(state.civilization!.farming!.phase==='settling-forager')state=advanceCivilization(state,1)
 const seen=new Set<string>(),upgrades:unknown[]=[],rewards:unknown[]=[],retainedGoods:unknown[]=[]
 function capture(id:string){const prepared=dehydrateGameState(session,state);writeFileSync(`${output}/${id}.txt`,serializeWebSave(prepared.copyValidatedState()))}
 for(let n=0;n<20000&&!farmingComplete(state.civilization!.farming!);n++){
  let f=state.civilization!.farming!
  if(farmingGoal(f).kind==='granary'&&farmingCanBuyGranary(f)){state=buyFarmingGranary(state)!;f=state.civilization!.farming!}
  const focus=policy==='switching'?(f.jobs.ship?'expeditions':f.jobs.build?'settlement':'provisioning'):policy
  state=setFarmingFocus(state,focus)??state
  state=advanceCivilization(state,1)
  f=state.civilization!.farming!
  const invalid=validateCivilization(state.civilization);if(invalid)throw Error(policy+': '+invalid)
  for(const id of f.completedBuildings)if(!seen.has('done-'+id)){seen.add('done-'+id);upgrades.push({id,minute:f.elapsedSeconds/60})}
  for(const id of f.awardedCatalystIds)if(!seen.has(id)){seen.add(id);rewards.push({id,minute:f.elapsedSeconds/60})}
  if(f.completedBuildings.includes('guildWorkshop')&&f.jobs.goods?.output===2&&!seen.has('retained-goods')){seen.add('retained-goods');retainedGoods.push({receipt:f.jobs.goods,minute:f.elapsedSeconds/60});if(policy==='balanced')capture('guild-paid-goods-retained')}
  if(policy==='balanced'){
   const job=f.jobs.build;if(job&&['intensiveCultivation','guildWorkshop','townMarket'].includes(job.kind)&&!seen.has('paid-'+job.kind)){seen.add('paid-'+job.kind);capture('paid-'+job.kind)}
   if(f.completedBuildings.includes('townMarket')&&!seen.has('upgrades-complete')){seen.add('upgrades-complete');capture('upgrades-complete')}
  }
 }
 const f=state.civilization!.farming!;if(!farmingComplete(f))throw Error(policy+': deadlock')
 if(policy==='balanced'){capture('ready-to-finish');state=completeFarmingAge(state)!;while(state.civilization!.farming!.phase!=='complete')state=advanceCivilization(state,1);capture('complete')}
 results.push({policy,minutes:f.elapsedSeconds/60,homes:f.homes.length,shipments:f.shipments,upgrades,rewards,retainedGoods})
}
writeFileSync(`${output}/domain-results.json`,JSON.stringify({openingSeconds:7043,permanentFractures:0,results,limits:['Synthetic state, immediate required Granary purchases, one-second ticks.','No player saves, native game, accounts or remote writes.','Seventh Forager placement and Farming award banking remain unchanged.']},null,2)+'\n')
console.log(JSON.stringify(results.map(({policy,minutes,rewards})=>({policy,minutes,rewards:rewards.length}))))
