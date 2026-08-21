import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { hydrateGameState } from '../game-state/mapping'
import type { CanonicalGameStateV1 } from '../game-state/types'
import { prepareIdb1Save } from '../save/prepare'
import {
  AVOCADO_MEDITATION_SKILL_POINT_REWARD,
  AVOCADO_MEDITATION_TOTAL_STEPS,
  completeCanonicalAvocadoMeditationStep,
} from './avocadoMeditation'
import { DISCRETE_MAXIMUM } from './numeric'

const fixtureText = readFileSync(
  new URL(
    '../../test/fixtures/schema-08-canonical-idb1-main-save.txt',
    import.meta.url,
  ),
  'utf8',
)

function meditationState(
  step = 0,
  completed = false,
  skillPoints = 3n,
): CanonicalGameStateV1 {
  const source = hydrateGameState(
    prepareIdb1Save(fixtureText).prepared,
  ).state
  return {
    ...source,
    skills: {
      ...source.skills,
      points: skillPoints,
    },
    secretProgress: { completed, step },
  }
}

describe('canonical Avocado meditation', () => {
  test('advances the seven secrets in order and grants four points atomically', () => {
    const original = deepFreeze(meditationState())
    let current = original

    for (
      let step = 0;
      step < AVOCADO_MEDITATION_TOTAL_STEPS;
      step += 1
    ) {
      const result = completeCanonicalAvocadoMeditationStep(
        current,
        step,
      )
      expect(result.accepted).toBe(true)
      expect(result.changed).toBe(true)
      expect(result.completedStepIndex).toBe(step)
      if (step < AVOCADO_MEDITATION_TOTAL_STEPS - 1) {
        expect(result).toMatchObject({
          code: 'step-completed',
          nextRequiredStepIndex: step + 1,
          skillPointsGranted: 0n,
          state: {
            secretProgress: {
              completed: false,
              step: step + 1,
            },
            skills: { points: 3n },
          },
        })
      } else {
        expect(result).toMatchObject({
          code: 'sequence-completed',
          nextRequiredStepIndex: null,
          skillPointsGranted:
            AVOCADO_MEDITATION_SKILL_POINT_REWARD,
          state: {
            secretProgress: {
              completed: true,
              step: AVOCADO_MEDITATION_TOTAL_STEPS,
            },
            skills: {
              points:
                3n +
                AVOCADO_MEDITATION_SKILL_POINT_REWARD,
            },
          },
        })
      }
      current = result.state
    }

    expect(original.secretProgress).toEqual({
      completed: false,
      step: 0,
    })
    expect(original.skills.points).toBe(3n)
  })

  test('rejects out-of-order and invalid step requests with exact state identity', () => {
    const original = deepFreeze(meditationState(2))
    for (const step of [1, 3, -1, 7, 1.5]) {
      const result = completeCanonicalAvocadoMeditationStep(
        original,
        step,
      )
      expect(result.accepted).toBe(false)
      expect(result.changed).toBe(false)
      expect(result.state).toBe(original)
      expect(result.skillPointsGranted).toBe(0n)
    }
    expect(
      completeCanonicalAvocadoMeditationStep(original, 1).code,
    ).toBe('out-of-order')
    expect(
      completeCanonicalAvocadoMeditationStep(original, 7).code,
    ).toBe('invalid-step')
  })

  test('never grants the completion reward twice', () => {
    const completed = deepFreeze(
      meditationState(
        AVOCADO_MEDITATION_TOTAL_STEPS,
        true,
        7n,
      ),
    )
    const result = completeCanonicalAvocadoMeditationStep(
      completed,
      AVOCADO_MEDITATION_TOTAL_STEPS - 1,
    )

    expect(result).toMatchObject({
      accepted: false,
      changed: false,
      code: 'already-completed',
      skillPointsGranted: 0n,
    })
    expect(result.state).toBe(completed)
    expect(result.state.skills.points).toBe(7n)
  })

  test('matches Unity saturation while still completing the sequence', () => {
    const original = deepFreeze(
      meditationState(
        AVOCADO_MEDITATION_TOTAL_STEPS - 1,
        false,
        DISCRETE_MAXIMUM - 2n,
      ),
    )
    const result = completeCanonicalAvocadoMeditationStep(
      original,
      AVOCADO_MEDITATION_TOTAL_STEPS - 1,
    )

    expect(result).toMatchObject({
      accepted: true,
      changed: true,
      code: 'sequence-completed',
      skillPointsGranted: 2n,
      state: {
        secretProgress: {
          completed: true,
          step: AVOCADO_MEDITATION_TOTAL_STEPS,
        },
        skills: { points: DISCRETE_MAXIMUM },
      },
    })
  })

  test('fails closed for invalid persisted progress or skill-point state', () => {
    const badStep = meditationState(8)
    const badPoints = meditationState(0, false, -1n)

    const stepResult = completeCanonicalAvocadoMeditationStep(
      badStep,
      0,
    )
    const pointsResult = completeCanonicalAvocadoMeditationStep(
      badPoints,
      0,
    )

    expect(stepResult.code).toBe('invalid-state')
    expect(stepResult.state).toBe(badStep)
    expect(pointsResult.code).toBe('invalid-state')
    expect(pointsResult.state).toBe(badPoints)
  })
})

function deepFreeze<T>(value: T): T {
  if (
    value !== null &&
    typeof value === 'object' &&
    !Object.isFrozen(value)
  ) {
    Object.freeze(value)
    for (const child of Object.values(value)) {
      deepFreeze(child)
    }
  }
  return value
}
