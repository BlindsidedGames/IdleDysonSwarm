import { enterReplacementChallenge } from '../../../../test/support/replacementChallengeFixture'
// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import type { UiRuntimePlayerCommandResult, UiRuntimeStoredTimeControls } from '../../runtime'
import type { StoredTimeJobStatus } from '../../../workers/storedTime/storedTimeProtocol'
import type { TinkerPlayerCommand } from './useTinkerPressController'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, test, vi } from 'vitest'
import { createUnityFirstRunPreparedSave } from '../../../application/firstRun/unityFirstRunSave'
import { hydrateGameState } from '../../../game-state/mapping'
import { createCanonicalTinkerRuntimeState, selectCanonicalTinkerUiFacts, startCanonicalTinker, setCanonicalTinkerRepeat } from '../../../simulation/canonicalTinker'
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

test('Hands Off does not display a usable Tinker or misleading rewards', () => {
  const source = fixture(true, false)
  const state = enterReplacementChallenge(source, 'hands-off')
  const facts = selectCanonicalTinkerUiFacts(state, createCanonicalTinkerRuntimeState(), 500)
  render(<IntlProvider locale="en" messages={{}}><TinkerSurface facts={facts} dispatch={vi.fn()} /></IntlProvider>)
  expect(screen.queryByRole('button')).toBeNull()
})

// The rendered control owns input/worker-lifecycle ordering; canonical Tinker
// owns admission and repeat state. Pending dispatches expose real interleavings.
function lifecycleHarness(delay: 'none' | 'first' | 'repeat' = 'none') {
  let state = fixture(true, false)
  let runtime = createCanonicalTinkerRuntimeState()
  let status: StoredTimeJobStatus = { kind: 'idle' }
  const listeners = new Set<() => void>()
  let settle: (() => void) | undefined
  let didDelay = false
  let update: (() => void) | undefined
  const admitted: TinkerPlayerCommand[] = []
  const storedTime: UiRuntimeStoredTimeControls = {
    status: () => status,
    subscribe: listener => { listeners.add(listener); return () => { listeners.delete(listener) } },
    cancel: () => undefined,
  }
  async function dispatch(command: TinkerPlayerCommand): Promise<UiRuntimePlayerCommandResult> {
    if (!didDelay && command.kind === 'tinker.start' &&
      (delay === 'first' || (delay === 'repeat' && command.repeat))) {
      didDelay = true
      await new Promise<void>(resolve => { settle = resolve })
    }
    admitted.push(command)
    const stats = selectCanonicalTinkerUiFacts(state, runtime, 500).stats
    const result = command.kind === 'tinker.start'
      ? startCanonicalTinker(state, runtime, stats, command.repeat)
      : setCanonicalTinkerRepeat(state, runtime, command.enabled)
    state = result.state as typeof state
    runtime = result.runtime
    update?.()
    return { status: 'accepted', kind: 'transition', changed: true, stateRevision: admitted.length, activationRevision: { session: 0, state: admitted.length } }
  }
  function Harness() {
    const [, setRevision] = useState(0)
    update = () => setRevision(value => value + 1)
    return <IntlProvider locale="en" messages={{}}><TinkerSurface
      facts={selectCanonicalTinkerUiFacts(state, runtime, 500)}
      dispatch={dispatch} storedTime={storedTime} /></IntlProvider>
  }
  render(<Harness />)
  const button = screen.getByRole('button') as HTMLButtonElement
  return {
    button, admitted, runtime: () => runtime,
    resolve: () => settle?.(),
    job: (kind: StoredTimeJobStatus['kind']) => {
      status = kind === 'idle' ? { kind } : { kind, jobId: 'offline-one', requestedSeconds: 3600,
        computedSeconds: 1800, fraction: 0.5, elapsedMilliseconds: 10,
        estimatedRemainingMilliseconds: 10, maximumChunkMilliseconds: 5 }
      listeners.forEach(listener => listener())
    },
  }
}

for (const kind of ['running', 'cancelling', 'committing'] as const) {
  test(`Offline Time ${kind} blocks Tinker re-entry until idle; a fresh hold and outside click still work`, async () => {
    vi.useFakeTimers()
    const h = lifecycleHarness()
    act(() => h.job(kind))
    expect(h.button.disabled).toBe(true)
    fireEvent.keyDown(h.button, { key: ' ' })
    await act(async () => { await vi.advanceTimersByTimeAsync(700) })
    expect(h.runtime().running).toBe(false)
    expect(screen.queryByText('Repeating')).toBeNull()
    act(() => h.job('idle'))
    expect(h.button.disabled).toBe(false)
    await act(async () => { await vi.advanceTimersByTimeAsync(700) })
    expect(h.runtime().repeat).toBe(false)
    fireEvent.keyDown(h.button, { key: ' ' })
    await act(async () => { await vi.advanceTimersByTimeAsync(600) })
    fireEvent.keyUp(h.button, { key: ' ' })
    expect(h.runtime().repeat).toBe(true)
    expect(screen.getByText('Repeating')).not.toBeNull()
    await act(async () => { fireEvent.pointerDown(document.body) })
    expect(h.runtime().repeat).toBe(false)
    expect(screen.queryByText('Repeating')).toBeNull()
  })
}

test.each([200, 600])('starting Offline Time after %sms of holding clears repeat and requires a new press after completion', async elapsed => {
  vi.useFakeTimers()
  const h = lifecycleHarness()
  fireEvent.keyDown(h.button, { key: ' ' })
  await act(async () => { await vi.advanceTimersByTimeAsync(elapsed) })
  act(() => h.job('running'))
  await act(async () => { await vi.advanceTimersByTimeAsync(600) })
  expect(h.runtime().repeat).toBe(false)
  expect(h.button.disabled).toBe(true)
  expect(screen.queryByText('Repeating')).toBeNull()
  act(() => h.job('idle'))
  fireEvent.keyUp(h.button, { key: ' ' })
  await act(async () => { await vi.advanceTimersByTimeAsync(600) })
  expect(h.runtime().repeat).toBe(false)
  fireEvent.keyDown(h.button, { key: ' ' })
  await act(async () => { await vi.advanceTimersByTimeAsync(600) })
  expect(h.runtime().repeat).toBe(true)
})

test('Repeating is shown only after the canonical repeat command settles', async () => {
  vi.useFakeTimers()
  const h = lifecycleHarness('repeat')
  fireEvent.keyDown(h.button, { key: ' ' })
  await act(async () => { await vi.advanceTimersByTimeAsync(600) })
  expect(h.runtime().repeat).toBe(false)
  expect(screen.queryByText('Repeating')).toBeNull()
  await act(async () => { h.resolve() })
  expect(h.runtime().repeat).toBe(true)
  expect(screen.getByText('Repeating')).not.toBeNull()
})

for (const cancel of ['outside click', 'Offline Time'] as const) {
  test(`delayed Tinker dispatch cannot admit a queued repeat after ${cancel}`, async () => {
    vi.useFakeTimers()
    const h = lifecycleHarness('first')
    fireEvent.keyDown(h.button, { key: ' ' })
    await act(async () => { await vi.advanceTimersByTimeAsync(600) })
    if (cancel === 'outside click') fireEvent.pointerDown(document.body)
    else { act(() => h.job('running')); act(() => h.job('idle')) }
    await act(async () => { h.resolve(); await vi.advanceTimersByTimeAsync(700) })
    expect(h.runtime().repeat).toBe(false)
    expect(h.admitted.some(command => command.kind === 'tinker.start' && command.repeat)).toBe(false)
    expect(screen.queryByText('Repeating')).toBeNull()
    fireEvent.keyUp(h.button, { key: ' ' })
    fireEvent.keyDown(h.button, { key: ' ' })
    await act(async () => { await vi.advanceTimersByTimeAsync(600) })
    expect(h.runtime().repeat).toBe(true)
    expect(screen.getByText('Repeating')).not.toBeNull()
  })
}

test('a repeat command already awaiting dispatch cannot restore the canceled UI when it settles', async () => {
  vi.useFakeTimers()
  const h = lifecycleHarness('repeat')
  fireEvent.keyDown(h.button, { key: ' ' })
  await act(async () => { await vi.advanceTimersByTimeAsync(600) })
  fireEvent.pointerDown(document.body)
  await act(async () => { h.resolve(); await vi.advanceTimersByTimeAsync(700) })
  expect(h.runtime().repeat).toBe(false)
  expect(screen.queryByText('Repeating')).toBeNull()
  expect(h.button.dataset.gestureActive).toBe('false')
  fireEvent.keyUp(h.button, { key: ' ' })
  fireEvent.keyDown(h.button, { key: ' ' })
  await act(async () => { await vi.advanceTimersByTimeAsync(600) })
  expect(h.runtime().repeat).toBe(true)
  expect(screen.getByText('Repeating')).not.toBeNull()
})
