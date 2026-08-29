import { describe, expect, test } from 'vitest'
import {
  deriveSecretBuffs,
  isSecretResearchCoefficientId,
  SECRET_RESEARCH_COEFFICIENT_IDS,
} from './secretBuffs'

describe('Secret buff research coefficients', () => {
  test('keeps the characterized coefficient identities and level-14 values', () => {
    expect(SECRET_RESEARCH_COEFFICIENT_IDS).toEqual([
      'research.assembly_line_upgrade',
      'research.ai_manager_upgrade',
      'research.server_upgrade',
      'research.planet_upgrade',
    ])
    expect(
      SECRET_RESEARCH_COEFFICIENT_IDS.every(
        isSecretResearchCoefficientId,
      ),
    ).toBe(true)
    expect(isSecretResearchCoefficientId('research.data_center_upgrade'))
      .toBe(false)
    expect(deriveSecretBuffs(14n).researchCoefficientOverrides).toEqual({
      'research.assembly_line_upgrade': Math.fround(0.12),
      'research.ai_manager_upgrade': Math.fround(0.09),
      'research.server_upgrade': Math.fround(0.09),
      'research.planet_upgrade': Math.fround(0.09),
    })
  })
})
