import { describe, expect, test } from 'vitest'
import fixture from '../../test/parity/dyson-no-skills-two-ticks.json'
import { BasicDysonSimulationModel, createBasicDysonState, type BasicDysonStateInput } from './dysonModel'

const initial = fixture.initialState as BasicDysonStateInput

describe('basic Dyson model clone ownership', () => {
  test.each([false, true])('detaches externally supplied effects (outer frozen: %s)', (freezeOuter) => {
    const effect = { id: 'external', operation: 'multiply' as const, value: 2, order: 0 }
    const effects = [effect]
    const external = { test: effects }
    if (freezeOuter) Object.freeze(external)
    const state = createBasicDysonState({ ...initial, skillEffectsByStat: external })
    effect.value = 9
    effects.push({ ...effect })
    expect(state.skillEffectsByStat?.test).toEqual([{ ...effect, value: 2 }])
    expect(Object.isFrozen(state.skillEffectsByStat)).toBe(true)
    expect(Object.isFrozen(state.skillEffectsByStat?.test)).toBe(true)
    expect(Object.isFrozen(state.skillEffectsByStat?.test[0])).toBe(true)
    const model = new BasicDysonSimulationModel(state)
    const clone = model.clone()
    expect(clone.state.skillEffectsByStat).toBe(state.skillEffectsByStat)
    clone.state.facilities.planets[0] += 1
    clone.state.modifiers.planets += 1
    clone.state.ownedSkills.push('independent')
    clone.state.automation.enabledFacilities.push('planets')
    clone.state.rates.bots += 1
    clone.state.infinity.points += 1n
    expect(model.state).toEqual(state)
  })

  test('detaches a replacement external map when cloning an existing model', () => {
    const model = new BasicDysonSimulationModel(createBasicDysonState(initial))
    const effect = { id: 'replacement', operation: 'add' as const, value: 3, order: 0 }
    model.state.skillEffectsByStat = { test: [effect] }
    const clone = model.clone()
    effect.value = 99
    expect(clone.state.skillEffectsByStat?.test[0]?.value).toBe(3)
  })
})
