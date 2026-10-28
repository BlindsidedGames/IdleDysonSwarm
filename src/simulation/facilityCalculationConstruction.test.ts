import { describe, expect, test } from 'vitest'
import fixture from '../../test/parity/dyson-no-skills-two-ticks.json'
import {
  BasicDysonSimulationModel,
  createBasicDysonState,
  createBasicDysonStateWithFacilityCalculations,
  type BasicDysonStateInput,
} from './dysonModel'

const initial = fixture.initialState as BasicDysonStateInput

describe('facility calculation construction snapshots', () => {
  test.each([
    { modifier: 1, expected: undefined },
    { modifier: 1 + 0.5e-12, expected: undefined },
    { modifier: 1 + 2e-12, expected: 1 + 2e-12 },
    { modifier: 1 - 0.5e-12, expected: undefined },
    { modifier: 1 - 2e-12, expected: 1 - 2e-12 },
  ])(
    'preserves modifier cutoff at $modifier', ({ modifier, expected }) => {
      const input = { ...initial, modifierEffectsApplied: true, modifiers: { ...initial.modifiers, assembly_lines: modifier } }
      const captured = createBasicDysonStateWithFacilityCalculations(input)
      expect(captured.state).toEqual(createBasicDysonState(input))
      const row = captured.facilityCalculations.assembly_lines.effects.find((effect) => effect.id === 'assembly_lines.modifier')
      expect(row?.value).toBe(expected)
      expect(captured.facilityCalculations.assembly_lines.rate).toBe(captured.state.rates.bots)
    },
  )

  test('retains equal-order effects and their clamped result', () => {
    const captured = createBasicDysonStateWithFacilityCalculations({
      ...initial,
      skillEffectsByStat: {
        'Facility.AssemblyLine.Production': [
          { id: 'first', operation: 'override', value: Number.MAX_VALUE, order: 20 },
          { id: 'second', operation: 'multiply', value: 2, order: 20 },
        ],
      },
    })
    const calculation = captured.facilityCalculations.assembly_lines
    expect(calculation.effects.map((effect) => effect.id)).toEqual(['assembly_lines.count', 'first', 'second'])
    expect(calculation.rate).toBe(Number.MAX_VALUE)
    expect(captured.state.rates.bots).toBe(Number.MAX_VALUE)
  })

  test('recalculation observes state changes without altering captured construction results', () => {
    const captured = createBasicDysonStateWithFacilityCalculations(initial)
    const originalRate = captured.facilityCalculations.assembly_lines.rate
    const model = new BasicDysonSimulationModel(captured.state)
    model.state.facilities.assembly_lines = [0, 0]
    model.applyDerivedTimersAndDoubleTime()
    expect(model.state.rates.bots).toBe(0)
    expect(captured.facilityCalculations.assembly_lines.rate).toBe(originalRate)
    expect(originalRate).toBeGreaterThan(0)
    expect(Object.keys(captured.state)).toEqual(Object.keys(createBasicDysonState(initial)))
    expect(Object.isFrozen(captured.facilityCalculations)).toBe(true)
    expect(Object.isFrozen(captured.facilityCalculations.assembly_lines)).toBe(true)
  })
})
