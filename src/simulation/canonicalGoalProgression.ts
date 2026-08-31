import type { CanonicalGameStateV1 } from '../game-state/types'
import { addDiscrete } from './numeric'
import { runCanonicalSkillAutoAssignment } from './canonicalSkillTransactions'
import { resolvePanelArea } from './stellarArithmetic'

const FINAL_REWARDED_GOAL_STAGE = 10n
const PANEL_COUNT_PER_STAR = 20_000
const STAR_COUNT_PER_GALAXY = 100_000_000_000

export interface CanonicalGoalDysonFacts {
  readonly panelsPerSecond: number
  readonly panelLifetimeSeconds: number
}

export type CanonicalGoalProgressionResult =
  | {
      readonly ok: true
      readonly state: CanonicalGameStateV1
      readonly completedStages: readonly bigint[]
      readonly awardedSkillPoints: bigint
    }
  | {
      readonly ok: false
      readonly state: CanonicalGameStateV1
      readonly code: 'CANONICAL_GOAL_PROGRESSION_REJECTED'
      readonly detail: string
    }

/**
 * Advances Unity's Dyson goal ladder and awards one Skill Point per completed
 * stage. The loop intentionally catches up imported or previously unprocessed
 * saves while `goalStage` makes every award idempotent.
 *
 * Derived panel facts are resolved again after each award because Unity invokes
 * skill auto-assignment immediately, and a newly assigned skill can change the
 * facts used by a later goal in the same catch-up pass.
 */
export function advanceCanonicalGoalProgression(
  source: CanonicalGameStateV1,
  deriveDysonFacts: (
    state: CanonicalGameStateV1,
  ) => Readonly<CanonicalGoalDysonFacts>,
): CanonicalGoalProgressionResult {
  let state = source
  const completedStages: bigint[] = []

  try {
    while (state.dyson.goalStage < FINAL_REWARDED_GOAL_STAGE) {
      const stage = state.dyson.goalStage
      if (!isGoalComplete(state, stage, deriveDysonFacts)) break

      state = {
        ...state,
        dyson: {
          ...state.dyson,
          goalStage: stage + 1n,
        },
        skills: {
          ...state.skills,
          points: addDiscrete(state.skills.points, 1n),
        },
      }
      completedStages.push(stage)

      const assignment = runCanonicalSkillAutoAssignment(state)
      if (!assignment.accepted) {
        throw new Error(
          `${assignment.code}: ${assignment.reason}`,
        )
      }
      state = assignment.state
    }
  } catch (error) {
    return {
      ok: false,
      state: source,
      code: 'CANONICAL_GOAL_PROGRESSION_REJECTED',
      detail:
        error instanceof Error ? error.message : String(error),
    }
  }

  return {
    ok: true,
    state,
    completedStages: Object.freeze([...completedStages]),
    awardedSkillPoints: BigInt(completedStages.length),
  }
}

function isGoalComplete(
  state: CanonicalGameStateV1,
  stage: bigint,
  deriveDysonFacts: (
    state: CanonicalGameStateV1,
  ) => Readonly<CanonicalGoalDysonFacts>,
): boolean {
  switch (stage) {
    case 0n:
      return state.dyson.bots >= 10
    case 1n:
      return state.dyson.facilities.assembly_lines[1] >= 5
    case 2n:
      return panelArea(state, deriveDysonFacts) >= 20_000
    case 3n: {
      const manualPlanetMultiplier =
        state.skills.byId.terraIrradiant?.owned === true ? 12 : 1
      const planets =
        state.dyson.facilities.planets[0] +
        state.dyson.facilities.planets[1] *
          manualPlanetMultiplier
      return planets >= 20
    }
    case 4n:
      return state.dyson.totalPanelsDecayed >= 1_000_000_000_000
    case 5n:
      return starsSurrounded(state, deriveDysonFacts) >= 1_000_000_000
    case 6n:
      return starsSurrounded(state, deriveDysonFacts) >= 10_000_000_000
    case 7n:
      return galaxiesEngulfed(state, deriveDysonFacts) > 1
    case 8n:
      return galaxiesEngulfed(state, deriveDysonFacts) > 10
    case 9n:
      return galaxiesEngulfed(state, deriveDysonFacts) > 100
    default:
      return false
  }
}

function panelArea(
  state: CanonicalGameStateV1,
  deriveDysonFacts: (
    state: CanonicalGameStateV1,
  ) => Readonly<CanonicalGoalDysonFacts>,
): number {
  const facts = deriveDysonFacts(state)
  validateFacts(facts)
  return resolvePanelArea(
    facts.panelsPerSecond,
    facts.panelLifetimeSeconds,
  )
}

function starsSurrounded(
  state: CanonicalGameStateV1,
  deriveDysonFacts: (
    state: CanonicalGameStateV1,
  ) => Readonly<CanonicalGoalDysonFacts>,
): number {
  return panelArea(state, deriveDysonFacts) / PANEL_COUNT_PER_STAR
}

function galaxiesEngulfed(
  state: CanonicalGameStateV1,
  deriveDysonFacts: (
    state: CanonicalGameStateV1,
  ) => Readonly<CanonicalGoalDysonFacts>,
): number {
  return (
    starsSurrounded(state, deriveDysonFacts) /
    STAR_COUNT_PER_GALAXY
  )
}

function validateFacts(
  facts: Readonly<CanonicalGoalDysonFacts>,
): void {
  if (
    !Number.isFinite(facts.panelsPerSecond) ||
    facts.panelsPerSecond < 0
  ) {
    throw new RangeError(
      'Goal panels per second must be finite and non-negative.',
    )
  }
  if (
    !Number.isFinite(facts.panelLifetimeSeconds) ||
    facts.panelLifetimeSeconds < 0
  ) {
    throw new RangeError(
      'Goal panel lifetime must be finite and non-negative.',
    )
  }
}
