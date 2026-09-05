import type { DeepReadonly } from '../core/contracts'
import { DREAM_UPGRADE_FLAGS, type CanonicalGameStateV1, type DreamUpgradeFlag } from '../game-state/types'
import { getGameAssetsByKind } from '../game-data/catalog'
import { SKILL_DEFINITION_ASSET_KIND } from '../game-data/runtimeAssetKinds'
import { SIMULATION_UPGRADE_DEFINITIONS } from '../simulation/dreamEducationUpgrades'
import { QUANTUM_CONSTANTS } from '../simulation/quantumUpgrades'
import { avocadoDysonMultiplier } from '../simulation/dysonPrestigeEffects'
import type { AchievementFacts } from './contracts'

let cachedSkillCosts: Map<string, bigint> | undefined
const readSkillCosts = () => cachedSkillCosts ??= new Map(getGameAssetsByKind(SKILL_DEFINITION_ASSET_KIND).map(asset => {
  const cost = asset.data.cost
  if (typeof cost !== 'number' || !Number.isSafeInteger(cost) || cost < 0) {
    throw new Error(`Invalid achievement skill cost: ${asset.id}`)
  }
  return [asset.id, BigInt(cost)] as const
}))
const speed = DREAM_UPGRADE_FLAGS.filter(id => /^speed[1-8]$/.test(id))
const translation = DREAM_UPGRADE_FLAGS.filter(id => /^translation[1-8]$/.test(id))
export const COMPLETION_UPGRADES = Object.freeze([...SIMULATION_UPGRADE_DEFINITIONS.keys(), ...speed, ...translation])
const exponent = (value: number) => value >= 1 && Number.isFinite(value) ? Math.floor(Math.log10(value)) : 0
const int = (value: bigint) => Number(value > 2147483647n ? 2147483647n : value < 0n ? 0n : value)

/** Read-only facts: no SDK, save mutations, provider ownership or renderer state. */
export function evaluateAchievements(state: DeepReadonly<CanonicalGameStateV1>, developerOptions: boolean): AchievementFacts {
  const unlocked: string[] = []
  const reach = (id: string, met: boolean) => { if (met) unlocked.push(`achievement.${id}`) }
  reach('first_bot', state.dyson.bots >= 1)
  for (const [id, facility] of [
    ['first_assembly_line', 'assembly_lines'], ['first_ai_manager', 'ai_managers'],
    ['first_server', 'servers'], ['first_data_center', 'data_centers'], ['first_planet', 'planets'],
  ] as const) {
    const [automatic, manual] = state.dyson.facilities[facility]
    reach(id, automatic >= 1 || manual >= 1 || automatic + manual >= 1)
  }
  reach('first_influence', state.reality.influence >= 1)
  reach('first_infinity_point', state.infinity.points + state.infinity.spentPoints >= 1n)
  reach('first_quantum_shard', state.quantum.pointsEarned >= 1n)
  reach('first_strange_matter', state.dream.strangeMatter >= 1)
  reach('secrets_of_universe_maxed', state.infinity.secretsOfTheUniverse >= QUANTUM_CONSTANTS.maximumSecrets)
  reach('divisions_complete', state.quantum.divisionsPurchased >= QUANTUM_CONSTANTS.maximumDivisions)
  for (const line of ['terra', 'purity', 'power', 'stellar', 'paragade'] as const) reach(`unlock_${line}`, state.quantum.unlocks[line])
  reach('unlock_avocato', state.avocado.unlocked)
  const all = (ids: readonly DreamUpgradeFlag[]) => ids.length > 0 && ids.every(id => state.dream.upgrades[id])
  reach('counteractions_complete', all(['counterMeteor', 'counterAi', 'counterGw']))
  reach('speed_upgrades_complete', speed.length === 8 && all(speed))
  reach('translation_upgrades_complete', translation.length === 8 && all(translation))
  reach('simulation_upgrades_complete', all(COMPLETION_UPGRADES))
  reach('developer_options', developerOptions)
  const secrets = state.secretProgress.completed ? 7 : Math.max(0, Math.min(7, state.secretProgress.step))
  reach('avotation_secrets_complete', secrets >= 7)
  reach('avocados_skill', state.skills.byId.avocados?.owned === true)
  reach('bots_42qi', state.dyson.bots >= 4.2e19)
  const skillCosts = readSkillCosts()
  let assigned = 0n
  for (const [id, skill] of Object.entries(state.skills.byId)) if (skill.owned) assigned += skillCosts.get(id) ?? 0n
  reach('skill_points_42', assigned >= 42n)
  const statistics = Object.freeze({
    'stat.highest_bot_exponent': exponent(state.dyson.bots),
    'stat.highest_influence_exponent': exponent(state.reality.influence),
    'stat.skill_points_assigned': int(assigned),
    'stat.avotation_secrets_found': secrets,
    'stat.secrets_of_universe': int(state.infinity.secretsOfTheUniverse),
  })
  const tier = state.avocado.unlocked ? 'Avocado' : state.quantum.pointsEarned > 0n ? 'Quantum' : state.infinity.points + state.infinity.spentPoints > 0n ? 'Infinity' : 'Building bots'
  return Object.freeze({ unlocked: Object.freeze(unlocked), statistics, presence: tier, progression: {bots:state.dyson.bots,infinityPoints:String(state.infinity.points),quantumPoints:String(state.quantum.pointsEarned-state.quantum.pointsSpent),avocadoMultiplier:avocadoDysonMultiplier(state.avocado),realityUnlocked:state.quantum.pointsEarned-state.quantum.pointsSpent>=1n||state.infinity.secretsOfTheUniverse>=27n,avocadoUnlocked:state.avocado.unlocked} })
}

/** Retains proven milestones while current-allocation statistics remain current. */
export function mergeAchievementFacts(previous: AchievementFacts | undefined, current: AchievementFacts): AchievementFacts {
  if (previous === undefined) return current
  const statistics = {...previous.statistics, ...current.statistics}
  for (const [id,value] of Object.entries(previous.statistics)) {
    if (id !== 'stat.skill_points_assigned') statistics[id]=Math.max(value,current.statistics[id] ?? 0)
  }
  return {unlocked:[...new Set([...previous.unlocked,...current.unlocked])],statistics,presence:current.presence,progression:current.progression}
}
