// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, test, vi } from 'vitest'
import { hydrateGameState } from '../../../game-state/mapping'
import { prepareIdb1Save } from '../../../save/prepare'
import { previewCanonicalSkillCatalog } from '../../../simulation/canonicalSkillTransactions'
import { SkillsSurface } from './SkillsSurface'
import fixture from '../../../../test/fixtures/schema-08-canonical-idb1-main-save.txt?raw'

afterEach(cleanup)

test('available augments highlight their parent only after galvanization, without assignment', () => {
  const source = hydrateGameState(prepareIdb1Save(fixture).prepared).state
  const view = (galvanized: boolean) => {
    const state = {
      ...source,
      meta: { ...source.meta, firstInfinityComplete: true },
      skills: { ...source.skills, byId: {}, activeAutoAssignment: [] },
      challenges: {
        unlocked: true, active: null, blankSlateCompleted: true,
        galvanizers: 0n, hasEarnedGalvanizer: true,
        galvanizedSkillIds: galvanized ? ['startHereTree'] : [],
      },
    }
    return <IntlProvider locale="en" messages={{}}>
      <SkillsSurface locale="en" points={state.skills.points} fragments={state.skills.fragments}
        catalog={previewCanonicalSkillCatalog(state)} presets={state.skills.presets}
        selectedPresetSlot={1} botDistribution={0} autoAssignNonRefundable={false}
        commandAvailability={{ purchase: true, refund: true, selectPreset: true,
          setPresetColor: true, setAutoAssignNonRefundable: true, reset: true }}
        showPresetApplicationNotifications={true}
        onShowPresetApplicationNotificationsChange={() => {}}
        dispatchPlayer={vi.fn()} />
    </IntlProvider>
  }
  const { container, rerender } = render(view(false))
  const parent = () => container.querySelector('[data-skill-id="startHereTree"]')!
  const search = (value: string) => fireEvent.change(screen.getByRole('searchbox', { name: 'Search skills' }), { target: { value } })
  search('panel')
  expect(parent().getAttribute('data-match')).toBeNull()
  rerender(view(true))
  expect(parent().getAttribute('data-match')).toBe('true')
  search('decayed')
  expect(parent().getAttribute('data-match')).toBe('true')
  search('production')
  expect(parent().getAttribute('data-match')).toBe('true')
  rerender(view(false))
  search('decayed')
  expect(parent().getAttribute('data-match')).toBeNull()
  search('Cash')
  expect(parent().getAttribute('data-match')).toBe('true')
})
