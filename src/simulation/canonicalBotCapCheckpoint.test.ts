import { describe, expect, it } from 'vitest'
import type { CanonicalGameStateV1 } from '../game-state/types'
import {
  selectBotCapCheckpointToPersist,
  type BotCapCheckpointAction,
  type BotCapCheckpointName,
} from './canonicalBotCapCheckpoint'

describe('selectBotCapCheckpointToPersist', () => {
  it.each<BotCapCheckpointName>([
    'invalid-bot-repair',
    'pending',
  ])('selects the %s persistence checkpoint', (checkpoint) => {
    const action: BotCapCheckpointAction = {
      kind: 'persist',
      checkpoint,
      rollbackState: {} as CanonicalGameStateV1,
    }

    expect(selectBotCapCheckpointToPersist(action)).toBe(checkpoint)
  })

  it.each<BotCapCheckpointAction>([
    { kind: 'continue' },
  ])('does not select a checkpoint for $kind', (action) => {
    expect(selectBotCapCheckpointToPersist(action)).toBeUndefined()
  })
})
