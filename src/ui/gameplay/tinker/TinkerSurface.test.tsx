// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, test, vi } from 'vitest'
import { createUnityFirstRunPreparedSave } from '../../../application/firstRun/unityFirstRunSave'
import { hydrateGameState } from '../../../game-state/mapping'
import { createCanonicalTinkerRuntimeState, selectCanonicalTinkerUiFacts } from '../../../simulation/canonicalTinker'
import { EMPTY_INFINITY_CHALLENGES } from '../../../simulation/infinityChallenges'
import { TinkerSurface } from './TinkerSurface'

afterEach(() => { cleanup(); vi.useRealTimers() })

function fixture(manualLabour: boolean, builtByHand: boolean) {
  const state = hydrateGameState(createUnityFirstRunPreparedSave({ startedAtUtc: '2026-09-27T00:00:00Z' })).state
  return { ...state, challenges: { ...EMPTY_INFINITY_CHALLENGES, unlocked: true,
    active: builtByHand ? 'built-by-hand' as const : null,
    galvanizedSkillIds: manualLabour ? ['manualLabour'] : [],
  }, skills: { ...state.skills, byId: { ...state.skills.byId,
    manualLabour: { owned: manualLabour, level: 1, timerSeconds: 0, secondaryTimerSeconds: 0 },
  } } }
}

test.each([false, true])('Built by Hand uses Bot-only wording and preserves existing repeat availability with Manual Labour %s', async manualLabour => {
  vi.useFakeTimers()
  const state = fixture(manualLabour, true)
  const facts = selectCanonicalTinkerUiFacts(state, createCanonicalTinkerRuntimeState(), 500)
  expect(facts.facilitiesDisabled).toBe(true)
  expect(facts.presentationMode).toBe(manualLabour ? 'manual-labour-blocked' : 'default')
  expect(facts.stats.botYield).toBe(1)
  expect(facts.stats.cooldownSeconds).toBe(state.dyson.manualCreationIntervalSeconds)
  const dispatch = vi.fn().mockResolvedValue({ status: 'accepted' })
  render(<IntlProvider locale="en" messages={{}}><TinkerSurface facts={facts} dispatch={dispatch} /></IntlProvider>)
  const button = screen.getByRole('button')
  expect(button.textContent).toMatch(/Build [\d.]+ Bots by hand/)
  expect(button.textContent).not.toMatch(/AI Manager|Tip:|assembly lines/)
  expect(screen.queryByText('Long press to repeat...') !== null).toBe(manualLabour)
  fireEvent.keyDown(button, { key: ' ' })
  await act(async () => { vi.advanceTimersByTime(600) })
  expect(dispatch).toHaveBeenCalledWith({ kind: 'tinker.start', repeat: false })
  expect(dispatch.mock.calls.some(([command]) => command.repeat === true)).toBe(manualLabour)
})

test.each([false, true])('ordinary Tinker retains existing facility advice with Manual Labour %s', manualLabour => {
  const facts = selectCanonicalTinkerUiFacts(fixture(manualLabour, false), createCanonicalTinkerRuntimeState(), 500)
  expect(facts.facilitiesDisabled).toBe(false)
  render(<IntlProvider locale="en" messages={{}}><TinkerSurface facts={facts} dispatch={vi.fn()} /></IntlProvider>)
  expect(screen.getByRole('button').textContent).toContain(manualLabour ? 'Get 1 AI Manager' : 'Tip:')
})


test('combined facility summary retains the Bot reward before the first Manager purchase', () => {
  const state = fixture(true, false)
  const facts = selectCanonicalTinkerUiFacts(state, createCanonicalTinkerRuntimeState(), 0, 1, { servers: 2 })
  render(<IntlProvider locale="en" messages={{}}><TinkerSurface facts={facts} dispatch={vi.fn()} /></IntlProvider>)
  const button = screen.getByRole('button')
  expect(button.textContent).toMatch(/Build [\d.]+ Bots by hand/)
  expect(button.textContent).toContain('Servers: 2')
})
