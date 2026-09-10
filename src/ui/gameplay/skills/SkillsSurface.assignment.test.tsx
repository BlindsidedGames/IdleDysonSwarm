// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, test, vi } from 'vitest'
import { hydrateGameState } from '../../../game-state/mapping'
import type { CanonicalGameStateV1 } from '../../../game-state/types'
import { prepareIdb1Save } from '../../../save/prepare'
import { previewCanonicalSkillCatalog, purchaseCanonicalSkill } from '../../../simulation/canonicalSkillTransactions'
import { SkillsSurface, type SkillsSurfaceProps } from './SkillsSurface'
import fixture from '../../../../test/fixtures/schema-08-canonical-idb1-main-save.txt?raw'

afterEach(cleanup)

test('Scientific Planets reviews all eight prerequisites before assigning nine points from an empty tree', async () => {
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
