// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, test, vi } from 'vitest'
import { hydrateGameState } from '../../../game-state/mapping'
import type { CanonicalGameStateV1 } from '../../../game-state/types'
import { prepareIdb1Save } from '../../../save/prepare'
import { previewCanonicalSkillCatalog, purchaseCanonicalSkill } from '../../../simulation/canonicalSkillTransactions'
import { SkillsSurface, type SkillsSurfaceProps } from './SkillsSurface'
import fixture from '../../../../test/fixtures/schema-08-canonical-idb1-main-save.txt?raw'

afterEach(() => {
  cleanup()
  window.localStorage.removeItem('idle-dyson-swarm:show-skill-production-comparisons')
})

test('Scientific Planets reviews all eight prerequisites before assigning nine points from an empty tree', async () => {
  window.localStorage.setItem('idle-dyson-swarm:show-skill-production-comparisons', 'false')
  const source = hydrateGameState(prepareIdb1Save(fixture).prepared).state
  const initial: CanonicalGameStateV1 = {
    ...source,
    meta: { ...source.meta, firstInfinityComplete: true },
    skills: { ...source.skills, points: 24n, byId: {}, activeAutoAssignment: [] },
  }
  let current = initial
  const dispatch = vi.fn<SkillsSurfaceProps['dispatchPlayer']>()
  function Harness() {
    const [state, setState] = useState(initial)
    dispatch.mockImplementation(async command => {
      if (command.kind !== 'skill.purchase') throw new Error('Unexpected command')
      const result = purchaseCanonicalSkill(state, command.skillId)
      if (!result.accepted) throw new Error(result.reason)
      current = result.state
      setState(result.state)
      return { status: 'accepted', kind: 'transition', changed: true,
        stateRevision: 1, activationRevision: { session: 1, state: 1 } }
    })
    return <IntlProvider locale="en" messages={{}}>
      <SkillsSurface locale="en" points={state.skills.points} fragments={state.skills.fragments}
        catalog={previewCanonicalSkillCatalog(state)} presets={state.skills.presets}
        selectedPresetSlot={1} botDistribution={0} autoAssignNonRefundable={false}
        commandAvailability={{ purchase: true, refund: true, selectPreset: true,
          setPresetColor: true, setAutoAssignNonRefundable: true, reset: true }}
        showPresetApplicationNotifications={true}
        onShowPresetApplicationNotificationsChange={() => {}}
        dispatchPlayer={dispatch} />
    </IntlProvider>
  }
  render(<Harness />)
  fireEvent.click(screen.getByRole('button', { name: 'Scientific Planets. Cost: 1 Skill Points' }))
  fireEvent.click(screen.getByRole('button', { name: 'Assign Skill. Will cost 9 Skill Points' }))
  const confirmation = screen.getByRole('group', { name: 'Confirm skill change' })
  expect(document.activeElement).toBe(confirmation)
  const required = within(confirmation).getByRole('list', { name: 'Skills affected by this change' })
  expect(within(required).getAllByRole('listitem').map(item => item.textContent)).toEqual([
    'Cash & Science', 'Planets', 'Servers', 'AI Managers', 'Assembly Lines',
    'Parallel Processing', 'Data Centers', 'Pocket Dimensions',
  ])
  expect(dispatch).not.toHaveBeenCalled()
  fireEvent.click(within(confirmation).getByRole('button', { name: 'Cancel' }))
  expect(dispatch).not.toHaveBeenCalled()
  expect(current.skills.points).toBe(24n)
  fireEvent.click(screen.getByRole('button', { name: 'Assign Skill. Will cost 9 Skill Points' }))
  fireEvent.click(within(screen.getByRole('group', { name: 'Confirm skill change' }))
    .getByRole('button', { name: 'Confirm' }))
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
  expect(dispatch).toHaveBeenCalledExactlyOnceWith({ kind: 'skill.purchase', skillId: 'scientificPlanets' })
  expect(current.skills.points).toBe(15n)
  expect(current.skills.byId.scientificPlanets?.owned).toBe(true)
  expect(Object.values(current.skills.byId).filter(skill => skill.owned)).toHaveLength(9)
})


test.each([true, false])('production comparison preference %s controls preview work and confirmation', (showComparisons) => {
  vi.useFakeTimers()
  try {
    const source = hydrateGameState(prepareIdb1Save(fixture).prepared).state
    const state = { ...source, skills: { ...source.skills, points: 24n, byId: {}, activeAutoAssignment: [] } }
    const dispatch = vi.fn().mockResolvedValue({ status: 'accepted' })
    let after = 7
    const query = vi.fn(() => ({ projected: true,
      rows: [{ id: 'money' as const, before: 1, after, changed: true }] }))
    render(<IntlProvider locale="en" messages={{}}>
      <SkillsSurface locale="en" points={24n} fragments={state.skills.fragments}
        catalog={previewCanonicalSkillCatalog(state)} presets={state.skills.presets}
        selectedPresetSlot={1} botDistribution={0} autoAssignNonRefundable={false}
        commandAvailability={{ purchase: true, refund: true, selectPreset: true,
          setPresetColor: true, setAutoAssignNonRefundable: true, reset: true }}
        showPresetApplicationNotifications={true} onShowPresetApplicationNotificationsChange={() => {}}
        presetActions={{ previewProduction: query } as unknown as NonNullable<SkillsSurfaceProps['presetActions']>}
        dispatchPlayer={dispatch} />
    </IntlProvider>)
    if (!showComparisons) {
      fireEvent.click(screen.getByRole('button', { name: 'Skill presets and reset' }))
      fireEvent.click(screen.getByRole('checkbox', { name: 'Show production comparisons' }))
      expect(window.localStorage.getItem('idle-dyson-swarm:show-skill-production-comparisons')).toBe('false')
      fireEvent.click(screen.getByRole('button', { name: 'Skill presets and reset' }))
    }
    fireEvent.click(screen.getByRole('button', { name: 'Cash & Science. Cost: 1 Skill Points' }))
    expect(query).not.toHaveBeenCalled()
    fireEvent.click(screen.getByRole('button', { name: 'Assign Skill. Will cost 1 Skill Points' }))
    expect(screen.queryByText('Also assign these required skills:')).toBeNull()
    if (!showComparisons) {
      expect(query).not.toHaveBeenCalled()
      expect(screen.queryByRole('group', { name: 'Confirm skill change' })).toBeNull()
      expect(dispatch).toHaveBeenCalledExactlyOnceWith({ kind: 'skill.purchase', skillId: 'startHereTree' })
      return
    }
    expect(screen.getByText(/^7(?:\.0+)?\/s \(10m\)$/)).not.toBeNull()
    const calls = query.mock.calls.length
    after = 8
    act(() => vi.advanceTimersByTime(1000))
    expect(query).toHaveBeenCalledTimes(calls + 1)
    expect(screen.getByText(/^8(?:\.0+)?\/s \(10m\)$/)).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    act(() => vi.advanceTimersByTime(3000))
    expect(query).toHaveBeenCalledTimes(calls + 1)
    expect(dispatch).not.toHaveBeenCalled()
  } finally {
    cleanup()
    vi.useRealTimers()
  }
})
