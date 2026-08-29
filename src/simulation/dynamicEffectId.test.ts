import { describe, expect, it } from 'vitest'
import { extractDynamicSkillId } from './dynamicEffectId'

describe('extractDynamicSkillId', () => {
  const suffix = '.money_multiplier'

  it('extracts the skill segment from a dynamic effect id', () => {
    expect(extractDynamicSkillId('effect.worker.money_multiplier', suffix)).toBe(
      'worker',
    )
  })

  it.each([
    ['missing prefix', 'worker.money_multiplier', suffix],
    ['missing suffix', 'effect.worker.science_multiplier', suffix],
    ['empty skill segment', 'effect..money_multiplier', suffix],
    ['empty suffix', 'effect.worker.money_multiplier', ''],
  ])('rejects %s', (_case, effectId, candidateSuffix) => {
    expect(extractDynamicSkillId(effectId, candidateSuffix)).toBeUndefined()
  })
})
