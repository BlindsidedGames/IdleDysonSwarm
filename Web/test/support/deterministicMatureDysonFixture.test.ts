import { describe, expect, test } from 'vitest'
import { validateCanonicalGameState } from '../../src/game-state/validate'
import {
  createDeterministicMatureDysonFixture,
  DETERMINISTIC_ALL_SKILL_IDS,
} from './deterministicMatureDysonFixture'

describe('deterministic mature Dyson fixture', () => {
  test('is a valid maximum-skill stress state', () => {
    const state = createDeterministicMatureDysonFixture({
      ownedSkillIds: 'all',
    })

    expect(validateCanonicalGameState(state)).toEqual({
      valid: true,
      errors: [],
    })
    expect(state.infinity.permanentSkillPoints).toBe(10n)
    expect(
      Object.values(state.skills.byId).filter((skill) => skill.owned),
    ).toHaveLength(DETERMINISTIC_ALL_SKILL_IDS.length)
  })
})
