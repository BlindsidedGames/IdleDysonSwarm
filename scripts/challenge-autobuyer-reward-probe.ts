/** Synthetic structural probe; sticky ownership is a proposal, not game code. */
import {readFileSync,writeFileSync} from 'node:fs'
import {hydrateGameState} from '../src/game-state/mapping'
import {prepareIdb1Save} from '../src/save/prepare'
import {applyCanonicalOverflowReset} from '../src/simulation/canonicalOverflowReset'
import {restartInfinityChallenge} from '../src/simulation/canonicalInfinityChallengeRestart'
import {OVERFLOW_BOT_CAP} from '../src/simulation/overflowBoundary'
import {EMPTY_INFINITY_CHALLENGES,isResearchDisabledByChallenge,challengeAllowsFacilityPurchase} from '../src/simulation/infinityChallenges'
import {replacementSkillPoints} from '../src/simulation/reworkChallenges'
import {validateCanonicalGameState} from '../src/game-state/validate'
import type {CanonicalGameStateV1,ReworkChallengeId} from '../src/game-state/types'

const original=hydrateGameState(prepareIdb1Save(readFileSync('test/fixtures/schema-08-canonical-idb1-main-save.txt','utf8')).prepared).state
function seed(ids:ReworkChallengeId[]):CanonicalGameStateV1{return {...original,meta:{...original.meta,reworkMigrationChoice:'keep',firstInfinityComplete:true},dyson:{...original.dyson,bots:OVERFLOW_BOT_CAP},infinity:{...original.infinity,points:64n,spentPoints:0n,automationUnlocked:{research:true,bots:true}},challenges:{...EMPTY_INFINITY_CHALLENGES,unlocked:true,noScienceCompleted:true,completedQuantumChallenges:['built-by-hand','no-science'],replacement:{version:1,active:null,completedIds:ids,earnedIp:0n,infinities:0,paidPurchases:0,paidFacilityIds:[],savedAutoAssignment:[],savedBreakTarget:1n,savedBotDistribution:0}}}}
function proposedSticky(s:CanonicalGameStateV1):CanonicalGameStateV1{
 const ids=s.challenges?.replacement?.completedIds??[]
 return {...s,infinity:{...s.infinity,automationUnlocked:{bots:s.infinity.automationUnlocked.bots||ids.includes('built-by-hand'),research:s.infinity.automationUnlocked.research||ids.includes('no-science')}}}
}
function snapshot(s:CanonicalGameStateV1){return {automation:s.infinity.automationUnlocked,receiptSp:String(replacementSkillPoints(s.challenges)),availableSp:String(s.skills.points),completed:s.challenges?.replacement?.completedIds,validation:validateCanonicalGameState(s)}}
const outputs=[]
for(const ids of [[],['built-by-hand','no-science']] as ReworkChallengeId[][]){
 const input=seed(ids), reset=applyCanonicalOverflowReset(input);if(!reset.ok)throw Error(reset.code)
 const proposed=proposedSticky(reset.state)
 outputs.push({newReceiptIds:ids,before:snapshot(input),currentAfterTranscendence:snapshot(reset.state),proposedAfterTranscendence:snapshot(proposed)})
}
const enterSeed={...seed(['built-by-hand','no-science']),dyson:{...original.dyson,bots:1},quantum:{...original.quantum,unlocks:{...original.quantum.unlocks,breakTheLoop:true}}}
for(const id of ['hands-off','no-science'] as const){const entered=restartInfinityChallenge(enterSeed,'enter',0n,id);if(!entered.ok)throw Error(entered.code);outputs.push({challenge:id,automation:entered.state.infinity.automationUnlocked,facilityPurchasesAllowed:challengeAllowsFacilityPurchase(entered.state,'assembly_lines'),researchDisabled:isResearchDisabledByChallenge(entered.state)})}
writeFileSync('output/challenges/research-autobuyer-reward.json',JSON.stringify({model:'Checkpoint b888fc87; proposal is post-reset ownership overlay only; synthetic state, no save writes',outputs},null,2))
console.log(JSON.stringify(outputs,null,2))
