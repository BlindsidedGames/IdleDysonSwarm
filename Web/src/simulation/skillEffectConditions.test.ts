import { describe, expect, test } from 'vitest'
import type {
  CanonicalFacilityId,
  CanonicalOwnedPair,
} from '../game-state/types'
import { evaluateSkillEffectCondition } from './skillEffectConditions'

const empty = Object.freeze(
  Object.fromEntries(
    [
      'assembly_lines',
      'ai_managers',
      'servers',
      'data_centers',
      'planets',
      'matrioshka_brains',
      'birch_planets',
      'galactic_brains',
    ].map((id) => [id, [0, 0] as const]),
  ) as Record<CanonicalFacilityId, CanonicalOwnedPair>,
)

function withFacility(
  id: CanonicalFacilityId,
  owned: CanonicalOwnedPair,
): Record<CanonicalFacilityId, CanonicalOwnedPair> {
  return { ...empty, [id]: owned }
}

describe('skill effect conditions', () => {
  test.each([
    ['condition.assembly_lines_69', 'assembly_lines'],
    ['condition.ai_managers_69', 'ai_managers'],
    ['condition.servers_69', 'servers'],
    ['condition.data_centers_69', 'data_centers'],
    ['condition.planets_69', 'planets'],
  ] as const)(
    'evaluates linked manual-count condition %s',
    (assetId, facilityId) => {
      expect(
        evaluateSkillEffectCondition(
          { assetId, legacyId: 'deliberately_unsupported' },
          { facilities: withFacility(facilityId, [1, 68]) },
        ),
      ).toBe(false)
      expect(
        evaluateSkillEffectCondition(
          { assetId, legacyId: 'deliberately_unsupported' },
          { facilities: withFacility(facilityId, [0, 69]) },
        ),
      ).toBe(true)
    },
  )

  test('uses legacy condition only when no linked asset exists', () => {
    expect(
      evaluateSkillEffectCondition(
        { assetId: null, legacyId: 'servers_69' },
        { facilities: withFacility('servers', [0, 69]) },
      ),
    ).toBe(true)
  })

  test('fails closed for unknown condition assets and legacy IDs', () => {
    expect(() =>
      evaluateSkillEffectCondition(
        { assetId: 'condition.unknown', legacyId: null },
        { facilities: empty },
      ),
    ).toThrow("missing condition 'condition.unknown'")
    expect(() =>
      evaluateSkillEffectCondition(
        { assetId: null, legacyId: 'unknown' },
        { facilities: empty },
      ),
    ).toThrow("Unsupported legacy skill-effect condition 'unknown'")
  })
})
