import { DEBUG_OVERFLOW_COST, qualifiesForDebug } from '../simulation/speedrunStatistics'
import type { DomainTransition } from '../core/contracts'
import {
  isFiniteNonNegativeNumber,
  isSafeNonNegativeInteger,
} from '../core/finiteNonNegativeNumber'
import { SKILL_DEFINITION_ASSET_KIND } from '../game-data/runtimeAssetKinds'
import { withCanonicalBotAllocation } from '../simulation/canonicalBotAllocation'
import {
  deriveCanonicalArtifactSkillPoints,
  type CanonicalEventTimeContext,
} from '../simulation/canonicalEventTimeModel'
import { runCanonicalSkillAutoAssignment } from '../simulation/canonicalSkillTransactions'
import {
  addContinuous,
  addDiscrete,
  DISCRETE_MAXIMUM,
} from '../simulation/numeric'
import { QUANTUM_CONSTANTS } from '../simulation/quantumUpgrades'
import { applyAwayTimeGrant } from '../simulation/timeResources'
import type { CanonicalRuntimeState } from './canonicalRuntimeSession'

/** Developer Options mutations; the application still owns admission and publication. */
export type CanonicalDevelopmentAction =
  | { readonly kind: 'add-cash'; readonly amount: number }
  | { readonly kind: 'add-bots'; readonly amount: number }
  | { readonly kind: 'add-skill-points'; readonly amount: bigint }
  | { readonly kind: 'add-infinity-points'; readonly amount: bigint }
  | { readonly kind: 'add-quantum-shards'; readonly amount: bigint }
  | { readonly kind: 'add-influence'; readonly amount: number }
  | { readonly kind: 'add-strange-matter'; readonly amount: number }
  | { readonly kind: 'add-offline-time'; readonly seconds: number }
  | { readonly kind: 'set-tinker-interval'; readonly seconds: 0 | 1 }
  | { readonly kind: 'recalculate-skill-points' }
  | { readonly kind: 'reset-secret-progress' }
  | { readonly kind: 'unlock-all-tabs' }
  | { readonly kind: 'lock-tabs' }
  | { readonly kind: 'purchase-debug-options' }
  | { readonly kind: 'enable-host-debug-options' }
  | { readonly kind: 'disable-debug-options' }

export function applyDevelopmentDysonBots(
  candidate: CanonicalRuntimeState,
  bots: number,
): DomainTransition {
  if (!isFiniteNonNegativeNumber(bots)) {
    return {
      accepted: false,
      code: 'CANONICAL-DEVELOPMENT-BOTS-INVALID',
      reason:
        'Development bot count must be finite and non-negative.',
    }
  }
  const synchronized = withCanonicalBotAllocation({
    ...candidate.gameState,
    dyson: {
      ...candidate.gameState.dyson,
      bots,
    },
  })
  const changed =
    synchronized.dyson.bots !==
      candidate.gameState.dyson.bots ||
    synchronized.dyson.workers !==
      candidate.gameState.dyson.workers ||
    synchronized.dyson.researchers !==
      candidate.gameState.dyson.researchers
  if (changed) {
    Object.assign(candidate, { gameState: synchronized })
  }
  return { accepted: true, changed }
}

export function applyDevelopmentRealityUnlock(
  candidate: CanonicalRuntimeState,
): DomainTransition {
  const requiredSecrets = QUANTUM_CONSTANTS.maximumSecrets
  const currentInfinity = candidate.gameState.infinity
  const nextSpentPoints =
    currentInfinity.spentPoints > requiredSecrets
      ? currentInfinity.spentPoints
      : requiredSecrets
  const nextPoints =
    currentInfinity.points > nextSpentPoints
      ? currentInfinity.points
      : nextSpentPoints
  const changed =
    currentInfinity.points !== nextPoints ||
    currentInfinity.spentPoints !== nextSpentPoints ||
    currentInfinity.secretsOfTheUniverse !== requiredSecrets
  if (changed) {
    Object.assign(candidate, {
      gameState: {
        ...candidate.gameState,
        infinity: {
          ...currentInfinity,
          points: nextPoints,
          spentPoints: nextSpentPoints,
          secretsOfTheUniverse: requiredSecrets,
        },
      },
    })
  }
  return { accepted: true, changed }
}

export function applyDevelopmentAction(
  candidate: CanonicalRuntimeState,
  action: CanonicalDevelopmentAction,
  context: Readonly<CanonicalEventTimeContext>,
): DomainTransition {
  const state = candidate.gameState
  switch (action.kind) {
    case 'unlock-all-tabs':
      return replaceDevelopmentRuntime(candidate, { unlockAllTabs: true })
    case 'lock-tabs':
      return replaceDevelopmentRuntime(candidate, { unlockAllTabs: false })
    case 'add-cash': {
      if (!Number.isFinite(action.amount)) {
        return invalidDevelopmentAction('Cash amount')
      }
      return replaceDevelopmentState(candidate, {
        ...state,
        dyson: {
          ...state.dyson,
          money: adjustDevelopmentContinuous(
            state.dyson.money,
            action.amount,
          ),
        },
      })
    }
    case 'add-bots': {
      if (!Number.isFinite(action.amount)) {
        return invalidDevelopmentAction('Bot amount')
      }
      const bots = adjustDevelopmentContinuous(
        state.dyson.bots,
        action.amount,
      )
      return applyDevelopmentDysonBots(candidate, bots)
    }
    case 'add-skill-points':
      if (!isDevelopmentDiscreteAmount(action.amount)) {
        return invalidDevelopmentAction('Skill point amount')
      }
      const awardedSkillState = {
        ...state,
        skills: {
          ...state.skills,
          points: adjustDevelopmentDiscrete(
            state.skills.points,
            action.amount,
          ),
        },
      }
      if (action.amount < 0n) {
        return replaceDevelopmentState(candidate, awardedSkillState)
      }
      const assignment = runCanonicalSkillAutoAssignment(
        awardedSkillState,
      )
      if (!assignment.accepted) {
        return {
          accepted: false,
          code: `CANONICAL-DEVELOPMENT-${assignment.code}`,
          reason: assignment.reason,
        }
      }
      return replaceDevelopmentState(
        candidate,
        assignment.state,
      )
    case 'add-infinity-points':
      if (!isDevelopmentDiscreteAmount(action.amount)) {
        return invalidDevelopmentAction('Infinity point amount')
      }
      return replaceDevelopmentState(candidate, {
        ...state,
        infinity: {
          ...state.infinity,
          points: adjustDevelopmentDiscrete(
            state.infinity.points,
            action.amount,
            state.infinity.spentPoints,
          ),
        },
      })
    case 'add-quantum-shards':
      if (!isDevelopmentDiscreteAmount(action.amount)) {
        return invalidDevelopmentAction('Quantum shard amount')
      }
      return replaceDevelopmentState(candidate, {
        ...state,
        quantum: {
          ...state.quantum,
          pointsEarned: adjustDevelopmentDiscrete(
            state.quantum.pointsEarned,
            action.amount,
            state.quantum.pointsSpent,
          ),
        },
      })
    case 'add-influence':
      if (!Number.isFinite(action.amount)) {
        return invalidDevelopmentAction('Influence amount')
      }
      return replaceDevelopmentState(candidate, {
        ...state,
        reality: {
          ...state.reality,
          influence: adjustDevelopmentContinuous(
            state.reality.influence,
            action.amount,
          ),
        },
      })
    case 'add-strange-matter':
      if (!Number.isFinite(action.amount)) {
        return invalidDevelopmentAction('Strange Matter amount')
      }
      return replaceDevelopmentState(candidate, {
        ...state,
        dream: {
          ...state.dream,
          strangeMatter: adjustDevelopmentContinuous(
            state.dream.strangeMatter,
            action.amount,
          ),
        },
      })
    case 'add-offline-time': {
      if (!Number.isFinite(action.seconds)) {
        return invalidDevelopmentAction('Offline-time amount')
      }
      if (action.seconds < 0) {
        return replaceDevelopmentState(candidate, {
          ...state,
          timeline: {
            ...state.timeline,
            storedTimeAvailableSeconds: adjustDevelopmentContinuous(
              state.timeline.storedTimeAvailableSeconds,
              action.seconds,
            ),
          },
        })
      }
      const grant = applyAwayTimeGrant({
        awaySeconds: action.seconds,
        bankSeconds: state.timeline.storedTimeAvailableSeconds,
        capacitySeconds: state.timeline.storedTimeCapacitySeconds,
        cheater: candidate.storedTimeCheater,
        dreamDoubleTimeBankSeconds:
          state.timeline.doubleTime.bankSeconds,
      })
      const next = {
        ...state,
        timeline: {
          ...state.timeline,
          storedTimeAvailableSeconds: grant.bankSeconds,
          storedTimeCapacitySeconds: grant.capacitySeconds,
          doubleTime: {
            ...state.timeline.doubleTime,
            bankSeconds: grant.dreamDoubleTimeBankSeconds,
          },
        },
      }
      const changed =
        grant.cheater !== candidate.storedTimeCheater ||
        grant.bankRepaired ||
        grant.capacityRepaired ||
        grant.storedTimeCreditedSeconds > 0 ||
        grant.dreamDoubleTimeBankSeconds !==
          state.timeline.doubleTime.bankSeconds
      if (changed) {
        Object.assign(candidate, {
          gameState: next,
          storedTimeCheater: grant.cheater,
        })
      }
      return { accepted: true, changed }
    }
    case 'set-tinker-interval':
      return replaceDevelopmentState(candidate, {
        ...state,
        dyson: {
          ...state.dyson,
          manualCreationIntervalSeconds: action.seconds,
        },
      })
    case 'recalculate-skill-points': {
      const artifact = deriveCanonicalArtifactSkillPoints(
        state,
        context.realityUpgradeDefinitions,
      )
      if (!artifact.ok) {
        return {
          accepted: false,
          code:
            artifact.issue?.code ??
            'CANONICAL-EVENT-REALITY-DEFINITION-MISSING',
          reason:
            artifact.issue?.detail ??
            'Reality artifact definitions are incomplete.',
        }
      }
      const earned = addDiscrete(
        addDiscrete(
          state.infinity.permanentSkillPoints,
          artifact.value,
        ),
        state.dyson.goalStage,
      )
      let spent = 0n
      for (const [id, skill] of Object.entries(state.skills.byId)) {
        if (!skill.owned) continue
        const definition = context.infinityResetAssetLookup(
          SKILL_DEFINITION_ASSET_KIND,
          id,
        )
        const cost = definition?.data.cost
        if (
          !isSafeNonNegativeInteger(cost)
        ) {
          return {
            accepted: false,
            code: 'CANONICAL-DEVELOPMENT-SKILL-DEFINITION-GAP',
            reason: `Skill '${id}' does not expose a valid cost.`,
          }
        }
        spent = addDiscrete(spent, BigInt(cost))
      }
      const points = earned > spent ? earned - spent : 0n
      return replaceDevelopmentState(candidate, {
        ...state,
        skills: { ...state.skills, points },
      })
    }
    case 'reset-secret-progress':
      return replaceDevelopmentState(candidate, {
        ...state,
        secretProgress: {
          completed: false,
          step: 0,
        },
      })
    case 'purchase-debug-options': {
      if (candidate.debugEntitlementPurchased) {
        return replaceDevelopmentRuntime(candidate, {
          debugOptionsEnabled: true,
        })
      }
      if (!qualifiesForDebug(state)) {
        return { accepted: false, code: 'CANONICAL-DEVELOPMENT-PURCHASE-UNAFFORDABLE',
          reason: 'Developer Options require 10 Overflow Points.' }
      }
      Object.assign(candidate, {
        gameState: {
          ...state,
          avocado: { ...state.avocado, overflowPoints: (state.avocado.overflowPoints ?? 0n) - DEBUG_OVERFLOW_COST },
        },
        debugOptionsEnabled: true,
        debugEntitlementPurchased: true,
      })
      return { accepted: true, changed: true }
    }
    case 'enable-host-debug-options':
      return replaceDevelopmentRuntime(candidate, {
        debugOptionsEnabled: true,
      })
    case 'disable-debug-options':
      return replaceDevelopmentRuntime(candidate, {
        debugOptionsEnabled: false,
        unlockAllTabs: false,
      })
  }
}

function isDevelopmentDiscreteAmount(amount: bigint): boolean {
  return amount >= -DISCRETE_MAXIMUM && amount <= DISCRETE_MAXIMUM
}

function adjustDevelopmentContinuous(
  current: number,
  amount: number,
): number {
  if (amount >= 0) return addContinuous(current, amount)
  return -amount >= current ? 0 : current + amount
}

function adjustDevelopmentDiscrete(
  current: bigint,
  amount: bigint,
  minimum: bigint = 0n,
): bigint {
  if (amount >= 0n) return addDiscrete(current, amount)
  const removable = current > minimum ? current - minimum : 0n
  const requested = -amount
  return requested >= removable ? minimum : current - requested
}

function replaceDevelopmentRuntime(
  candidate: CanonicalRuntimeState,
  replacement: Partial<
    Pick<
      CanonicalRuntimeState,
      'debugOptionsEnabled' | 'debugEntitlementPurchased' | 'unlockAllTabs'
    >
  >,
): DomainTransition {
  const changed = Object.entries(replacement).some(
    ([key, value]) =>
      candidate[key as keyof CanonicalRuntimeState] !== value,
  )
  if (changed) Object.assign(candidate, replacement)
  return { accepted: true, changed }
}

function replaceDevelopmentState(
  candidate: CanonicalRuntimeState,
  next: CanonicalRuntimeState['gameState'],
): DomainTransition {
  const changed = !Object.is(next, candidate.gameState)
  if (changed) Object.assign(candidate, { gameState: next })
  return { accepted: true, changed }
}

function invalidDevelopmentAction(label: string): DomainTransition {
  return {
    accepted: false,
    code: 'CANONICAL-DEVELOPMENT-ACTION-INVALID',
    reason: `${label} must be finite and within the supported range.`,
  }
}
