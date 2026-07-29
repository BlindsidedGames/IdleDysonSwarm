import { readFileSync } from 'node:fs'
import { describe, expect, test } from 'vitest'
import { loadFrozenFirstDysonSliceFixture } from './firstDysonSliceFixture'

describe('first-slice fixture consumer boundary', () => {
  test('consumes detached facts without gameplay-domain imports', () => {
    const fixture = loadFrozenFirstDysonSliceFixture()

    expect(fixture.initial.resources.money).toBe(1_000_000)
    expect(fixture.initial.tinker.value.canStart).toBe(true)
    expect(fixture.initial.basicFacilityPreviews[0]?.facilityId)
      .toBe('assembly_lines')
    expect(fixture.outcomes.tinkerCompletion.transition.revision).toBe(3)
    expect(fixture.outcomes.staleFacility.transition.code)
      .toBe('SIM-STALE-REVISION')
  })

  test('fixture consumer module stays detached from simulation mutators', () => {
    const consumer = readFileSync(
      new URL('./firstDysonSliceFixtureConsumer.test.ts', import.meta.url),
      'utf8',
    )

    expect(consumer).not.toMatch(
      /from ['"][^'"]*(simulation|game-state|canonicalGameCommands)[^'"]*['"]/,
    )
  })
})
