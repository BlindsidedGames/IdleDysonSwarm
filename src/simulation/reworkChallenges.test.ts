import { readFileSync } from 'node:fs'
import { expect, test } from 'vitest'
import { hydrateGameState, dehydrateGameState } from '../game-state/mapping'
import { validateCanonicalGameState } from '../game-state/validate'
import { prepareIdb1Save } from '../save/prepare'
import type { CanonicalGameStateV1, ReworkChallengeId } from '../game-state/types'
import { restartInfinityChallenge } from './canonicalInfinityChallengeRestart'
import { applyCanonicalInfinityReset } from './canonicalInfinityReset'
import { advanceCanonicalGoalProgression } from './canonicalGoalProgression'
import { EMPTY_INFINITY_CHALLENGES, validateInfinityChallenges } from './infinityChallenges'
import { REWORK_CHALLENGES, replacementSkillPoints, recordChallengePurchases } from './reworkChallenges'
import { purchaseCanonicalSkill, refundCanonicalSkill, runCanonicalSkillAutoAssignment } from './canonicalSkillTransactions'
import { galvanizedSkillIds } from './galvanization'
import { deriveDysonProduction } from './canonicalDysonDerivation'
import { withoutRetiredChallengeRun } from './gameplayRework'
const session = () => hydrateGameState(prepareIdb1Save(readFileSync(new URL('../../test/fixtures/schema-08-canonical-idb1-main-save.txt', import.meta.url), 'utf8')).prepared)
function seed(): CanonicalGameStateV1 {
 const state = session().state
 return { ...state, meta: { ...state.meta, firstInfinityComplete: true, reworkMigrationChoice: 'keep' },
  challenges: { ...EMPTY_INFINITY_CHALLENGES, unlocked: true, blankSlateCompleted: true, trialAndErrorCompleted: true, noScienceCompleted: true, completedQuantumChallenges: ['no-science'], galvanizers: 16n },
  infinity: { ...state.infinity, points: 1000000n, spentPoints: 999000n, permanentSkillPoints: 10n, breakTarget: 1n },
  quantum: { ...state.quantum, divisionsPurchased: 19n, unlocks: { ...state.quantum.unlocks, breakTheLoop: true, doubleInfinityPoints: true } },
  discovery: { unlocked: true, completions: 2000n, progress: 0.5, startingPower: 2n, speedUpgrades: 1n },
  skills: { ...state.skills, byId: {}, points: 0n, activeAutoAssignment: [], autoAssignNonRefundable: false },
 }
}
function enter(id: ReworkChallengeId, source=seed()) {
 const result=restartInfinityChallenge(source,'enter',0n,id)
 if(!result.ok) throw Error(result.code)
 return result.state
}
function finishInfinity(source: CanonicalGameStateV1, reward=1n) {
 const result=applyCanonicalInfinityReset({ ...source, dyson: { ...source.dyson, bots: 1e99 } }, { breakInfinity: !['blank-slate','built-by-hand'].includes(source.challenges?.replacement?.active ?? ''), requestedReward: reward, artifactSkillPoints: replacementSkillPoints(source.challenges) })
 if(!result.ok)throw Error(JSON.stringify(result.issues))
 return result.state
}
test.each(REWORK_CHALLENGES)('$name starts with fresh attempt counters, preserves history, round-trips and pays its new reward only once', c=>{
 let state=enter(c.id)
 expect(state.challenges?.replacement?.earnedIp).toBe(0n)
 expect(state.infinity.points).toBe(1000000n)
 expect(state.challenges?.galvanizers).toBe(16n)
 expect(replacementSkillPoints(state.challenges)).toBe(0n)
 expect(withoutRetiredChallengeRun(state).challenges?.replacement?.active).toBe(c.id)
 expect(validateCanonicalGameState(state)).toEqual({valid:true,errors:[]})
 state=hydrateGameState(dehydrateGameState(session(),state)).state
 if(c.id==='supply-shortage') state=recordChallengePurchases(state,[{facilityId:'assembly_lines',purchased:true,quantity:8n,cost:100},{facilityId:'ai_managers',purchased:true,quantity:1n,cost:100},{facilityId:'servers',purchased:true,quantity:1n,cost:100}])
 state=finishInfinity(state,c.target)
 expect(state.challenges?.replacement?.active).toBeNull()
 expect(replacementSkillPoints(state.challenges)).toBe(c.reward)
 expect(state.skills.points).toBe(10n+c.reward)
 expect(state.discovery).toEqual(seed().discovery)
 expect(state.challenges?.galvanizers).toBe(16n)
 const repeated=finishInfinity(enter(c.id,state),c.target)
 expect(replacementSkillPoints(repeated.challenges)).toBe(c.reward)
 expect(validateInfinityChallenges(repeated.challenges)).toBeNull()
})
test('earned progress survives spending and Infinity but restarts on abandonment; old wins are not SP receipts',()=>{
 let state=finishInfinity(enter('no-science'),1n)
 expect(state.challenges?.replacement?.active).toBe('no-science')
 expect(state.challenges?.replacement?.earnedIp).toBe(1n)
 state={...state,infinity:{...state.infinity,spentPoints:state.infinity.points}}
 expect(state.challenges?.replacement?.earnedIp).toBe(1n)
 const abandon=restartInfinityChallenge(state,'abandon',0n)
 if(!abandon.ok)throw Error(abandon.code)
 expect(replacementSkillPoints(abandon.state.challenges)).toBe(0n)
 expect(enter('no-science',abandon.state).challenges?.replacement?.earnedIp).toBe(0n)
 expect(restartInfinityChallenge(seed(),'enter',0n,'trial-and-error').ok).toBe(false)
})
test('Hands Off supplies a viable generation build and Manual Labour works without owned fractures',()=>{
 const hands=enter('hands-off')
 expect(hands.dyson.facilities.assembly_lines).toEqual([1,0])
 expect(hands.skills.byId.scientificPlanets?.owned).toBe(true)
 const runtime=session()
 const derived=deriveDysonProduction({...hands,dyson:{...hands.dyson,bots:100,workers:50,researchers:50,botDistribution:0.5}},runtime.compatibilityTuning,{permanentDoubleIp:false},runtime.skillEffectEvaluationSnapshot)
 if(!derived.ok)throw Error(JSON.stringify(derived.issues))
 expect(derived.value.rates.bots).toBeGreaterThan(0)
 expect(derived.value.productionArrivalRates.planets).toBeGreaterThan(0)
 const manual=enter('built-by-hand')
 expect(manual.skills.byId.manualLabour?.owned).toBe(true)
 expect(manual.challenges?.galvanizedSkillIds).toEqual([])
 expect(galvanizedSkillIds(manual)).toEqual([])
 expect(Object.values(manual.dyson.facilities).every(pair=>pair[0]+pair[1]===0)).toBe(true)
})
test('Grounded can pass its replacement goal without forbidden Planets',()=>{
 const state=enter('grounded')
 const next=advanceCanonicalGoalProgression({...state,dyson:{...state.dyson,goalStage:3n,totalPanelsDecayed:0,facilities:{...state.dyson.facilities,data_centers:[0,100]}}},()=>({panelsPerSecond:0,panelLifetimeSeconds:10}))
 expect(next.ok&&next.awardedSkillPoints).toBe(1n)
})
test('Lean Build counts prerequisite costs; Commitment retains assignments and refund lock across Infinity',()=>{
 let state=enter('lean-build')
 for(const id of ['startHereTree','assemblyLineTree','aiManagerTree','serverTree']){
  const result=purchaseCanonicalSkill(state,id)
  if(!result.accepted)throw Error(result.reason)
  state=result.state
 }
 const queued = runCanonicalSkillAutoAssignment({...state,skills:{...state.skills,points:20n,activeAutoAssignment:['dataCenterTree']}})
 expect(queued.accepted && queued.state.skills.byId.dataCenterTree?.owned === true).toBe(false)
 expect(purchaseCanonicalSkill({...state,skills:{...state.skills,points:20n}},'dataCenterTree').code).toBe('SKILL-CHALLENGE-BUDGET')
 const bought=purchaseCanonicalSkill(enter('commitment-issues'),'startHereTree')
 if(!bought.accepted)throw Error(bought.reason)
 const reset=finishInfinity(bought.state)
 expect(reset.skills.byId.startHereTree.owned).toBe(true)
 expect(refundCanonicalSkill(reset,'startHereTree').accepted).toBe(false)
})
test('Supply Shortage cannot finish by IP alone or count free facilities as paid purchases',()=>{
 let state=recordChallengePurchases(enter('supply-shortage'),[{facilityId:'assembly_lines',purchased:true,quantity:100n,cost:0}])
 state=finishInfinity(state,64n)
 expect(state.challenges?.replacement?.active).toBe('supply-shortage')
 expect(state.challenges?.replacement?.paidPurchases).toBe(0)
})
test('all nine receipts supply exactly 20 SP after Infinity and persist through Transcendence', async()=>{
 let state=seed()
 for(const c of REWORK_CHALLENGES){
  state=enter(c.id,state)
  if(c.id==='supply-shortage')state=recordChallengePurchases(state,[{facilityId:'assembly_lines',purchased:true,quantity:8n,cost:100},{facilityId:'ai_managers',purchased:true,quantity:1n,cost:100},{facilityId:'servers',purchased:true,quantity:1n,cost:100}])
  state=finishInfinity(state,c.target)
 }
 expect(state.skills.points).toBe(30n)
 expect(replacementSkillPoints(state.challenges)).toBe(20n)
 const {applyCanonicalOverflowReset}=await import('./canonicalOverflowReset')
 const reset=applyCanonicalOverflowReset({...state,dyson:{...state.dyson,bots:4e242}})
 if(!reset.ok)throw Error(reset.code)
 expect(replacementSkillPoints(reset.state.challenges)).toBe(20n)
 expect(reset.state.skills.points).toBe(20n)
 expect(validateCanonicalGameState(reset.state).valid).toBe(true)
})
test('No Science excludes Science and restored Discovery cannot leak into the attempt; Short Circuit and Division use challenge limits',()=>{
 const runtime=session()
 const noScience=enter('no-science')
 const noResult=deriveDysonProduction({...noScience,dyson:{...noScience.dyson,bots:100,botDistribution:0.5}},runtime.compatibilityTuning,{permanentDoubleIp:false},runtime.skillEffectEvaluationSnapshot)
 if(!noResult.ok)throw Error(JSON.stringify(noResult.issues))
 expect(noScience.discovery?.unlocked).toBe(false)
 expect(noResult.value.rates.science).toBe(0)
 const short=deriveDysonProduction(enter('short-circuit'),runtime.compatibilityTuning,{permanentDoubleIp:false},runtime.skillEffectEvaluationSnapshot)
 if(!short.ok)throw Error(JSON.stringify(short.issues))
 expect(short.value.globals.panelLifetimeSeconds).toBe(2)
 expect(short.value.facilityModifiers.assembly_lines).toBe(1)
 expect(enter('blank-slate').dyson.bots).toBe(1)
})

test('wallet saturation still counts earned IP, while a premature single-Infinity reset cannot pay SP', () => {
 const capped = enter('no-science', { ...seed(), infinity: { ...seed().infinity, points: 9223372036854775807n } })
 const completed = finishInfinity(capped, 32n)
 expect(completed.infinity.points).toBe(9223372036854775807n)
 expect(replacementSkillPoints(completed.challenges)).toBe(2n)
 const blank = enter('blank-slate')
 expect(applyCanonicalInfinityReset(blank, { requestedReward: 1n, breakInfinity: false, artifactSkillPoints: 0n }).ok).toBe(false)
 expect(applyCanonicalInfinityReset({ ...blank, dyson: { ...blank.dyson, bots: 1e99 } }, { requestedReward: 1n, breakInfinity: true, artifactSkillPoints: 0n }).ok).toBe(false)
})

test('mandatory Transcendence safely discards an unfinished attempt without SP and resets restored Discovery', async () => {
 const { applyCanonicalOverflowReset } = await import('./canonicalOverflowReset')
 const active = finishInfinity(enter('no-science'), 1n)
 expect(applyCanonicalOverflowReset(active).ok).toBe(false)
 const reset = applyCanonicalOverflowReset({ ...active, dyson: { ...active.dyson, bots: 4e242 } })
 if (!reset.ok) throw Error(reset.code)
 expect(reset.state.challenges?.replacement?.active).toBeNull()
 expect(reset.state.challenges?.replacement?.earnedIp).toBe(0n)
 expect(replacementSkillPoints(reset.state.challenges)).toBe(0n)
 expect(reset.state.discovery?.unlocked).toBe(true)
 expect(reset.state.discovery?.completions).toBe(0n)
 expect(reset.state.discovery?.startingPower).toBe(2n)
 expect(reset.state.challenges?.galvanizers).toBe(16n)
 expect(validateCanonicalGameState(reset.state)).toEqual({ valid: true, errors: [] })
})
