import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import { prepareIdb1Save } from '../save/prepare'
import { DREAM_UPGRADE_FLAGS } from '../game-state/types'
import { COMPLETION_UPGRADES, evaluateAchievements } from './evaluate'
const source = hydrateGameState(prepareIdb1Save(readFileSync(new URL('../../test/fixtures/schema-08-canonical-idb1-main-save.txt',import.meta.url),'utf8')).prepared).state
function empty() {
  const s = structuredClone(source)
  Object.assign(s.dyson,{bots:0,facilities:Object.fromEntries(Object.keys(s.dyson.facilities).map(id=>[id,[0,0]]))})
  Object.assign(s.infinity,{points:0n,spentPoints:0n,secretsOfTheUniverse:0n})
  Object.assign(s.quantum,{pointsEarned:0n,pointsSpent:0n,divisionsPurchased:0n,unlocks:Object.fromEntries(Object.keys(s.quantum.unlocks).map(id=>[id,false]))})
  Object.assign(s.avocado,{unlocked:false});Object.assign(s.reality,{influence:0})
  Object.assign(s.dream,{strangeMatter:0,upgrades:Object.fromEntries(DREAM_UPGRADE_FLAGS.map(id=>[id,false]))})
  Object.assign(s.secretProgress,{completed:false,step:0})
  Object.assign(s.skills,{byId:{}})
  return s
}
const cases: [string,(s:ReturnType<typeof empty>)=>void][] = [
 ['first_bot',s=>Object.assign(s.dyson,{bots:1})],
 ...([['first_assembly_line','assembly_lines'],['first_ai_manager','ai_managers'],['first_server','servers'],['first_data_center','data_centers'],['first_planet','planets']] as const).map(([id,f])=>[id,(s:ReturnType<typeof empty>)=>Object.assign(s.dyson.facilities,{[f]:[0,1]})] as [string,(s:ReturnType<typeof empty>)=>void]),
 ['first_influence',s=>Object.assign(s.reality,{influence:1})],
 ['first_infinity_point',s=>Object.assign(s.infinity,{points:1n})],
 ['first_quantum_shard',s=>Object.assign(s.quantum,{pointsEarned:1n})],
 ['first_strange_matter',s=>Object.assign(s.dream,{strangeMatter:1})],
 ['secrets_of_universe_maxed',s=>Object.assign(s.infinity,{secretsOfTheUniverse:27n})],
 ['divisions_complete',s=>Object.assign(s.quantum,{divisionsPurchased:19n})],
 ...(['terra','purity','power','stellar','paragade'] as const).map(id=>[`unlock_${id}`,(s:ReturnType<typeof empty>)=>Object.assign(s.quantum.unlocks,{[id]:true})] as [string,(s:ReturnType<typeof empty>)=>void]),
 ['unlock_avocato',s=>Object.assign(s.avocado,{unlocked:true})],
 ['counteractions_complete',s=>Object.assign(s.dream.upgrades,{counterMeteor:true,counterAi:true,counterGw:true})],
 ['speed_upgrades_complete',s=>Object.assign(s.dream.upgrades,Object.fromEntries(DREAM_UPGRADE_FLAGS.filter(k=>/^speed/.test(k)).map(k=>[k,true])))],
 ['translation_upgrades_complete',s=>Object.assign(s.dream.upgrades,Object.fromEntries(DREAM_UPGRADE_FLAGS.filter(k=>/^translation/.test(k)).map(k=>[k,true])))],
 ['simulation_upgrades_complete',s=>Object.assign(s.dream.upgrades,Object.fromEntries(COMPLETION_UPGRADES.map(k=>[k,true])))],
 ['avotation_secrets_complete',s=>Object.assign(s.secretProgress,{step:7})],
 ['avocados_skill',s=>Object.assign(s.skills,{byId:{avocados:{owned:true,level:1,timerSeconds:0,secondaryTimerSeconds:0}}})],
 ['bots_42qi',s=>Object.assign(s.dyson,{bots:4.2e19})],
 ['skill_points_42',s=>Object.assign(s.skills,{byId:Object.fromEntries(Object.keys(source.skills.byId).map(k=>[k,{owned:true,level:1,timerSeconds:0,secondaryTimerSeconds:0}]))})],
]
describe('provider-neutral achievement rules',()=>{
 test.each(cases)('%s evaluates canonical evidence without mutation',(id,mutate)=>{
   const s=empty();expect(evaluateAchievements(s,false).unlocked).not.toContain(`achievement.${id}`)
   mutate(s);const before=structuredClone(s)
   expect(evaluateAchievements(s,false).unlocked).toContain(`achievement.${id}`)
   expect(s).toEqual(before)
 })
 test('developer options require trusted ownership',()=>{
   expect(evaluateAchievements(empty(),false).unlocked).not.toContain('achievement.developer_options')
   expect(evaluateAchievements(empty(),true).unlocked).toContain('achievement.developer_options')
 })
 test('all 27 canonical identifiers have coverage',()=>expect(new Set([...cases.map(([id])=>id),'developer_options']).size).toBe(27))
 test('10 quintillion does not unlock 42 quintillion; exponent retains meaning',()=>{
   const s=empty();Object.assign(s.dyson,{bots:1e19})
   const facts=evaluateAchievements(s,false)
   expect(facts.unlocked).not.toContain('achievement.bots_42qi')
   expect(facts.statistics['stat.highest_bot_exponent']).toBe(19)
 })
 test('division and secret thresholds are exact',()=>{
   const s=empty();Object.assign(s.quantum,{divisionsPurchased:18n});Object.assign(s.infinity,{secretsOfTheUniverse:26n})
   const facts=evaluateAchievements(s,false)
   expect(facts.unlocked).not.toContain('achievement.divisions_complete');expect(facts.unlocked).not.toContain('achievement.secrets_of_universe_maxed')
 })
 test('simulation coverage excludes temporary activators and includes speed/translation',()=>{
   expect(COMPLETION_UPGRADES).toHaveLength(59)
   expect(new Set(COMPLETION_UPGRADES).size).toBe(59)
   expect(COMPLETION_UPGRADES.some(id=>/Activator|Acivator/.test(id))).toBe(false)
   const s=empty();Object.assign(s.dream.upgrades,Object.fromEntries(COMPLETION_UPGRADES.map(id=>[id,true])))
   for(const missing of COMPLETION_UPGRADES){Object.assign(s.dream.upgrades,{[missing]:false});expect(evaluateAchievements(s,false).unlocked).not.toContain('achievement.simulation_upgrades_complete');Object.assign(s.dream.upgrades,{[missing]:true})}
 })
})
