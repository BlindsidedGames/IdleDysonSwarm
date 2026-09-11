// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { useState } from 'react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, test, vi } from 'vitest'
import { hydrateGameState } from '../../../game-state/mapping'
import type { CanonicalGameStateV1 } from '../../../game-state/types'
import { prepareIdb1Save } from '../../../save/prepare'
import { previewCanonicalSkillCatalog, purchaseCanonicalSkill, refundCanonicalSkill } from '../../../simulation/canonicalSkillTransactions'
import { CASH_SCIENCE_SUBSKILLS } from '../../../simulation/skillSubskills'
import { SkillsSurface, type SkillsSurfaceProps } from './SkillsSurface'
import fixture from '../../../../test/fixtures/schema-08-canonical-idb1-main-save.txt?raw'

afterEach(cleanup)

function setup(galvanized = true) {
  const source = hydrateGameState(prepareIdb1Save(fixture).prepared).state
  let current: CanonicalGameStateV1 = {
    ...source,
    meta: { ...source.meta, firstInfinityComplete: true },
    skills: { ...source.skills, points: 3n, byId: {
      startHereTree: { owned: true, level: 1, timerSeconds: 0, secondaryTimerSeconds: 0 },
    }, activeAutoAssignment: [] },
    challenges: { unlocked: true, active: null, blankSlateCompleted: true,
      galvanizers: 0n, hasEarnedGalvanizer: true,
      galvanizedSkillIds: galvanized ? ['startHereTree'] : [] },
  }
  const dispatch = vi.fn<SkillsSurfaceProps['dispatchPlayer']>()
  function Harness() {
    const [state, setState] = useState(current)
    dispatch.mockImplementation(async command => {
      const result = command.kind === 'skill.purchase'
        ? purchaseCanonicalSkill(state, command.skillId)
        : command.kind === 'skill.refund'
          ? refundCanonicalSkill(state, command.skillId) : null
      if (!result?.accepted) throw new Error('Unexpected/rejected command')
      current = result.state
      setState(current)
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
  const rendered = render(<Harness />)
  return { ...rendered, dispatch, state: () => current }
}

function openRoot() {
  const root = screen.getByRole('button', { name: /^Cash & Science\./ })
  root.focus()
  fireEvent.click(root)
  return root
}

test('assigning and refunding augments returns to the tree and updates real ownership', async () => {
  const { state, dispatch } = setup()
  const root = openRoot()
  expect(screen.getByRole('button', { name: 'Back to skill tree' })).toBeTruthy()
  expect(screen.queryByRole('dialog')).toBeNull()
  for (const [id, name] of [
    [CASH_SCIENCE_SUBSKILLS.lifetime, 'Extended Warranty'],
    [CASH_SCIENCE_SUBSKILLS.decay, 'Supermassive Panels'],
    [CASH_SCIENCE_SUBSKILLS.production, 'Double Standards'],
  ]) {
    fireEvent.click(screen.getByRole('button', { name: `${name}. Cost: 1 Skill Points` }))
    const details = screen.getByRole('dialog', { name })
    expect(details.textContent).toContain(`Effect: ${id === CASH_SCIENCE_SUBSKILLS.decay ? 'Each decayed panel counts as 10' : id === CASH_SCIENCE_SUBSKILLS.lifetime ? '+5 seconds Panel Lifetime' : '2× Cash and Science production'}`)
    expect(within(details).queryByText(/Increase Cash and Science by 20%/)).toBeNull()
    fireEvent.click(within(details).getByRole('button', { name: 'Assign Skill. Will cost 1 Skill Points' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(state().skills.byId[id]?.owned).toBe(true)
  }
  expect(state().skills.points).toBe(0n)
  expect(root.getAttribute('aria-label')).toContain('Assigned augments: 3/3')
  fireEvent.click(screen.getByRole('button', { name: /^Extended Warranty\. Owned/ }))
  fireEvent.click(screen.getByRole('button', { name: 'Unassign Skill. Will refund 1 Skill Points' }))
  await waitFor(() => expect(root.getAttribute('aria-label')).toContain('Assigned augments: 2/3'))
  expect(state().skills.points).toBe(1n)
  expect(state().challenges?.galvanizedSkillIds).toEqual(['startHereTree'])
  expect(dispatch).toHaveBeenCalledTimes(4)
  fireEvent.click(screen.getByRole('button', { name: 'Back to skill tree' }))
  expect(screen.queryByRole('dialog')).toBeNull()
  expect(document.activeElement).toBe(root)
})

test('root coordinates and camera stay fixed on entry; Escape returns one level', () => {
  const { container } = setup()
  const viewport = container.querySelector('.skill-tree-viewport')
  const originalRoot = screen.getByRole('button', { name: /^Cash & Science\./ })
  const rootStyle = originalRoot.getAttribute('style')
  const canvas = container.querySelector('.skill-tree-viewport__canvas')!
  const camera = canvas.getAttribute('style')
  const root = openRoot()
  expect(root).toBe(originalRoot)
  expect(root.getAttribute('style')).toBe(rootStyle)
  expect(canvas.getAttribute('style')).toBe(camera)
  const lifetime = screen.getByRole('button', { name: 'Extended Warranty. Cost: 1 Skill Points' })
  fireEvent.click(lifetime)
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.getByRole('button', { name: 'Back to skill tree' })).toBeTruthy()
  expect(document.activeElement).toBe(lifetime)
  fireEvent.keyDown(lifetime, { key: 'Escape' })
  expect(screen.queryByRole('button', { name: 'Back to skill tree' })).toBeNull()
  expect(container.querySelector('.skill-tree-viewport')).toBe(viewport)
  expect(canvas.getAttribute('style')).toBe(camera)
  expect(root.getAttribute('style')).toBe(rootStyle)
  expect(document.activeElement).toBe(root)
})

test('ordinary skills still open their details without an augment tree', () => {
  setup(false)
  openRoot()
  expect(screen.getByRole('dialog', { name: 'Cash & Science' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Back to skill tree' })).toBeNull()
})
