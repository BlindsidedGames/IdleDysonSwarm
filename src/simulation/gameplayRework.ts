import { hasCompletedQuantum } from './quantumMilestone'
import { getGameAssetsByKind } from '../game-data/catalog'
import { SKILL_DEFINITION_ASSET_KIND } from '../game-data/runtimeAssetKinds'
import { addDiscrete } from './numeric'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { SKILL_AUGMENTS } from './skillSubskills'

export type ReworkMigrationChoice = 'keep' | 'fresh'

/** This is a migration transaction, never an Infinity or Transcendence reset. */
export function chooseGameplayReworkMigration(
  state: CanonicalGameStateV1,
  choice: ReworkMigrationChoice,
): CanonicalGameStateV1 {
  if (state.meta.reworkMigrationChoice !== undefined) return state
  const stripped: CanonicalGameStateV1 = {
    ...state,
    meta: { ...state.meta, firstQuantumComplete: hasCompletedQuantum(state), reworkMigrationChoice: choice },
    quantum: { ...state.quantum, pointsEarned: 0n, pointsSpent: 0n,
      influenceSpeedBonus: 0n, permanentSecrets: 0n,
      unlocks: { ...state.quantum.unlocks, quantumEntanglement: false, automation: false } },
    infinity: { ...state.infinity,
      secretsOfTheUniverse: choice === 'keep' && state.quantum.permanentSecrets > state.infinity.secretsOfTheUniverse
        ? state.quantum.permanentSecrets : state.infinity.secretsOfTheUniverse,
      automationUnlocked: { research: state.infinity.automationUnlocked.research || (choice === 'keep' && state.quantum.unlocks.automation),
        bots: state.infinity.automationUnlocked.bots || (choice === 'keep' && state.quantum.unlocks.automation) },
    },
    reality: { ...state.reality, autoGather: false },
    avocado: { ...state.avocado, unlocked: false, infinityPoints: 0, influence: 0,
      strangeMatter: 0, overflowMultiplier: 0 },
    ...(state.challenges ? { challenges: { ...state.challenges, active: null } } : {}),
  }
  if (choice === 'keep') return stripped
  const augments = new Map(SKILL_AUGMENTS.map(definition => [definition.id, definition]))
  const bases = new Map(getGameAssetsByKind(SKILL_DEFINITION_ASSET_KIND).map(asset => [asset.id, asset.data]))
  const formerFractures = new Set(stripped.challenges?.galvanizedSkillIds ?? [])
  const affectedBases = new Set(formerFractures)
  // Paid descendants whose required ancestor is being removed become pending
  // allocations again. Refund their ordinary cost, never the free fractured base.
  let changed = true
  while (changed) {
    changed = false
    for (const [id, definition] of bases) {
      if (affectedBases.has(id) || stripped.skills.byId[id]?.owned !== true) continue
      const requirements = [...(definition.requiredSkillIds as string[] ?? []), ...(definition.shadowRequirementIds as string[] ?? [])]
      if (requirements.some(required => affectedBases.has(required))) {
        affectedBases.add(id)
        changed = true
      }
    }
  }
  let refund = 0n
  let fragments = stripped.skills.fragments
  const byId = Object.fromEntries(Object.entries(stripped.skills.byId).map(([id, runtime]) => {
    const augment = augments.get(id)
    if (!runtime.owned || (!augment && !affectedBases.has(id))) return [id, runtime]
    const base = bases.get(id)
    if (augment) refund += BigInt(augment.cost)
    else if (!formerFractures.has(id)) refund += BigInt(base?.cost as number ?? 0)
    if ((augment?.fragment || base?.isFragment === true || base?.isFragment === 1) && fragments > 0n) fragments -= 1n
    return [id, { ...runtime, owned: false, level: 0, timerSeconds: 0, secondaryTimerSeconds: 0 }]
  }))
  const withoutAugments = (ids: readonly string[]) => ids.filter(id => !augments.has(id))
  return {
    ...stripped,
    // Useful rewards can now be earned with IP. Base production, IP, TP,
    // Discovery, unaffected ordinary skill ownership and purchased entitlements survive.
    quantum: { ...stripped.quantum, divisionsPurchased: 0n, permanentSecrets: 0n,
      cashBonusLevels: 0n, scienceBonusLevels: 0n,
      unlocks: Object.fromEntries(Object.keys(stripped.quantum.unlocks).map(key => [key, false])) as CanonicalGameStateV1['quantum']['unlocks'] },
    ...(stripped.timeline.doubleTime.unlocked ? {
      infinity: { ...stripped.infinity, currentCyclePeakIpPerMinute: 0, currentCyclePeakReward: 0n,
        manualPeakIpPerMinute: 0, manualPeakReward: 0n, manualCalibrationObservedActiveSeconds: 0,
        activeAutomaticThroughputCycleEligible: false },
      statistics: { ...stripped.statistics, recentActiveAutomaticInfinityCycles: [] },
    } : {}),
    timeline: { ...stripped.timeline, doubleTime: { ...stripped.timeline.doubleTime, unlocked: false } },
    ...(stripped.challenges ? { challenges: { ...stripped.challenges, galvanizedSkillIds: [] } } : {}),
    skills: { ...stripped.skills, byId, fragments, points: addDiscrete(stripped.skills.points, refund),
      activeAutoAssignment: withoutAugments(stripped.skills.activeAutoAssignment),
      presets: stripped.skills.presets.map(preset => ({ ...preset, skillIds: withoutAugments(preset.skillIds) })) },
  }
}

/** Old layers remain readable for compatibility, but cannot impose challenge rules. */
export function withoutRetiredChallengeRun(state: CanonicalGameStateV1): CanonicalGameStateV1 {
  return state.challenges?.active == null || state.challenges?.replacement?.active === state.challenges?.active ? state
    : { ...state, challenges: { ...state.challenges, active: null } }
}

export function hasRetiredGameplayProgress(state: Readonly<CanonicalGameStateV1>): boolean {
  return state.quantum.pointsEarned > 0n || state.quantum.divisionsPurchased > 0n ||
    state.quantum.permanentSecrets > 0n || state.quantum.cashBonusLevels > 0n ||
    state.quantum.scienceBonusLevels > 0n || Object.values(state.quantum.unlocks).some(Boolean) ||
    state.timeline.doubleTime.unlocked || state.reality.autoGather ||
    state.reality.universeDesignationCount > 0n || state.reality.influence > 0 ||
    state.reality.workersReady > 0n || state.dream.resetCount > 0n ||
    state.dream.strangeMatter > 0 || Object.values(state.dream.resources).some(value => value > 0) ||
    Object.values(state.dream.upgrades).some(Boolean) ||
    state.avocado.unlocked || state.avocado.infinityPoints > 0 || state.avocado.influence > 0 ||
    state.avocado.strangeMatter > 0 || (state.avocado.overflowPoints ?? 0n) > 0n ||
    (state.challenges?.galvanizedSkillIds?.length ?? 0) > 0
}

/** Saves without retired rewards need no compensation decision. */
export function initializeGameplayRework(state: CanonicalGameStateV1): CanonicalGameStateV1 {
  const inactive = withoutRetiredChallengeRun(state)
  return inactive.meta.reworkMigrationChoice === undefined && !hasRetiredGameplayProgress(inactive)
    ? { ...inactive, meta: { ...inactive.meta, reworkMigrationChoice: 'keep' } } : inactive
}
