import { isFiniteNonNegativeNumber } from '../core/finiteNonNegativeNumber'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { OVERFLOW_BOT_CAP } from './overflowBoundary'

export type BotCapCheckpointName = 'invalid-bot-repair' | 'pending'

export type BotCapCheckpointAction =
  | { readonly kind: 'continue' }
  | {
      readonly kind: 'persist'
      readonly checkpoint: BotCapCheckpointName
      /** Unmodified state retained when persistence rejects the candidate. */
      readonly rollbackState: CanonicalGameStateV1
    }

export interface BotCapCheckpointResult {
  readonly action: BotCapCheckpointAction
  /** A persistence candidate cannot become visible before its save succeeds. */
  readonly candidateState: CanonicalGameStateV1
}

export function selectBotCapCheckpointToPersist(
  action: BotCapCheckpointAction,
): BotCapCheckpointName | undefined {
  return action.kind === 'persist' ? action.checkpoint : undefined
}

/** Persists eligibility only. The voluntary Overflow command owns the reward/reset. */
export function evaluateCanonicalBotCapCheckpoint(
  state: Readonly<CanonicalGameStateV1>,
): BotCapCheckpointResult {
  const bots = state.dyson.bots
  if (!isFiniteNonNegativeNumber(bots)) {
    return {
      action: { kind: 'persist', checkpoint: 'invalid-bot-repair', rollbackState: state },
      candidateState: {
        ...state,
        dyson: { ...state.dyson, bots: 0 },
        infinity: {
          ...state.infinity,
          botCapTransitionPending: false,
          botCapRewardsGranted: false,
          inProgress: false,
        },
      },
    }
  }
  if (bots < OVERFLOW_BOT_CAP || state.infinity.botCapTransitionPending) {
    return { action: { kind: 'continue' }, candidateState: state }
  }
  return {
    action: { kind: 'persist', checkpoint: 'pending', rollbackState: state },
    candidateState: {
      ...state,
      dyson: { ...state.dyson, bots: OVERFLOW_BOT_CAP },
      infinity: {
        ...state.infinity,
        botCapTransitionPending: true,
        botCapRewardsGranted: false,
        inProgress: false,
      },
      avocado: { ...state.avocado, unlocked: true },
    },
  }
}
