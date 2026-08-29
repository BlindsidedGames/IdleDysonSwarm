import { isNonNegativeInteger } from '../core/finiteNonNegativeNumber'
import type { CanonicalGameStateV1 } from '../game-state/types'
import {
  addDiscrete,
  DISCRETE_MAXIMUM,
} from './numeric'

export const AVOCADO_MEDITATION_TOTAL_STEPS = 7
export const AVOCADO_MEDITATION_SKILL_POINT_REWARD = 4n

export type AvocadoMeditationCode =
  | 'step-completed'
  | 'sequence-completed'
  | 'already-completed'
  | 'out-of-order'
  | 'invalid-step'
  | 'invalid-state'

export interface AvocadoMeditationResult {
  readonly accepted: boolean
  readonly changed: boolean
  readonly code: AvocadoMeditationCode
  readonly state: CanonicalGameStateV1
  readonly completedStepIndex: number | null
  readonly nextRequiredStepIndex: number | null
  readonly skillPointsGranted: bigint
}

/**
 * Completes one ordered Avocado meditation secret.
 *
 * Help activation and its countdown are presentation state. Once the player
 * selects or skips the currently required secret, both the seventh step and
 * Unity's four-point reward publish in this single canonical transaction.
 */
export function completeCanonicalAvocadoMeditationStep(
  state: CanonicalGameStateV1,
  requiredStepIndex: number,
): AvocadoMeditationResult {
  if (
    !isNonNegativeInteger(requiredStepIndex) ||
    requiredStepIndex >= AVOCADO_MEDITATION_TOTAL_STEPS
  ) {
    return rejected(state, 'invalid-step')
  }
  if (!hasValidMeditationState(state)) {
    return rejected(state, 'invalid-state')
  }
  if (state.secretProgress.completed) {
    return rejected(state, 'already-completed')
  }
  if (state.secretProgress.step !== requiredStepIndex) {
    return rejected(state, 'out-of-order')
  }

  const nextStep = requiredStepIndex + 1
  if (nextStep < AVOCADO_MEDITATION_TOTAL_STEPS) {
    return {
      accepted: true,
      changed: true,
      code: 'step-completed',
      state: {
        ...state,
        secretProgress: {
          completed: false,
          step: nextStep,
        },
      },
      completedStepIndex: requiredStepIndex,
      nextRequiredStepIndex: nextStep,
      skillPointsGranted: 0n,
    }
  }

  const nextPoints = addDiscrete(
    state.skills.points,
    AVOCADO_MEDITATION_SKILL_POINT_REWARD,
  )
  return {
    accepted: true,
    changed: true,
    code: 'sequence-completed',
    state: {
      ...state,
      skills: {
        ...state.skills,
        points: nextPoints,
      },
      secretProgress: {
        completed: true,
        step: AVOCADO_MEDITATION_TOTAL_STEPS,
      },
    },
    completedStepIndex: requiredStepIndex,
    nextRequiredStepIndex: null,
    skillPointsGranted: nextPoints - state.skills.points,
  }
}

function hasValidMeditationState(
  state: Readonly<CanonicalGameStateV1>,
): boolean {
  return (
    isNonNegativeInteger(state.secretProgress.step) &&
    state.secretProgress.step <=
      AVOCADO_MEDITATION_TOTAL_STEPS &&
    state.skills.points >= 0n &&
    state.skills.points <= DISCRETE_MAXIMUM
  )
}

function rejected(
  state: CanonicalGameStateV1,
  code: Exclude<
    AvocadoMeditationCode,
    'step-completed' | 'sequence-completed'
  >,
): AvocadoMeditationResult {
  return {
    accepted: false,
    changed: false,
    code,
    state,
    completedStepIndex: null,
    nextRequiredStepIndex: state.secretProgress.completed
      ? null
      : state.secretProgress.step,
    skillPointsGranted: 0n,
  }
}
