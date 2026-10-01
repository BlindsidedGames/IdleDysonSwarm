// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { CanonicalRuntimeSession } from '../../../application/canonicalRuntimeSession'
import { selectFrontendGameplaySnapshot } from '../../../application/frontendSnapshot'
import { purchaseCanonicalInfinityShopItem } from '../../../simulation/canonicalInfinityShop'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, test, vi } from 'vitest'
import { hydrateGameState } from '../../../game-state/mapping'
import { createUnityFirstRunPreparedSave } from '../../../application/firstRun/unityFirstRunSave'
import { projectInfinityProgress } from '../../../simulation/infinityCycle'
import { InfinitySurface } from './InfinitySurface'

afterEach(() => { cleanup(); vi.useRealTimers() })
test('replaces unavailable IP progress with Overflow navigation', () => {
  const state = hydrateGameState(createUnityFirstRunPreparedSave({ startedAtUtc: '2026-09-06T00:00:00.000Z' })).state
  const open = vi.fn()
  render(<IntlProvider locale="en" messages={{}}><InfinitySurface locale="en"
    resources={{ ...state.infinity, availablePoints: 0n }}
    progression={{ infinity: { ...state.infinity, botCapTransitionPending: true } }}
    derived={projectInfinityProgress({ bots: 4e242, totalInfinityPoints: 0n,
      divisionsPurchased: 0n, breakTheLoop: true, breakTarget: 1n,
      permanentDoubleIp: false, quantumDoubleIp: false })}
    previews={{ shop: [], breakTarget: { minimum: 1n, maximum: 1100n, minimumPosition: 0, maximumPosition: 1099, currentPosition: 0 } }}
    commandAvailability={{ purchaseShopItem: true, setBreakTarget: true, setAutomaticReset: true, requestReset: false }}
    dispatchPlayer={vi.fn()} onViewOverflow={open} /> </IntlProvider>)
  expect(screen.getByText('Transcendence reached')).not.toBeNull()
  expect(screen.queryByRole('progressbar')).toBeNull()
  expect(screen.queryByRole('button', { name: /Infinity for/ })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'View Transcendence reset' }))
  expect(open).toHaveBeenCalledOnce()
})

const entitlements = Object.freeze({
  extraAnalysisPower: false,
  permanentDoubleIp: false,
})

const runtime = structuredClone(
  new CanonicalRuntimeSession(
    createUnityFirstRunPreparedSave({
      startedAtUtc: '2026-09-01T00:00:00.000Z',
    }),
    { entitlements },
  ).initialState,
)

function gameplaySnapshot(
  gameState: typeof runtime.gameState = runtime.gameState,
) {
  return selectFrontendGameplaySnapshot(gameState, {
    presentationEvents: [],
    compatibilityTuning: runtime.compatibilityTuning,
    evaluationSnapshot: runtime.evaluationSnapshot,
    entitlements: runtime.entitlements,
    tinker: runtime.tinker,
    realityWorkerTuning: {
      workerBatchSize: 128n,
      baseWorkerGenerationSpeed: 4,
    },
    quantumLeap: {
      eligible: false,
      code: 'not-ready',
      branch: null,
      artifactSkillPoints: null,
      definitionGap: null,
    },
    storedTimeCheater: runtime.storedTimeCheater,
    selectedSkillPresetSlot: runtime.selectedSkillPresetSlot,
    lastSkillPresetApplication: runtime.lastSkillPresetApplication,
  })
}

function purchaseHarness(itemId: 'secret' | 'permanent-skill-point' | 'retain-assembly-lines', balance = 20n, delayDispatch = false, outcome: 'accepted' | 'rejected' | 'throw' = 'accepted') {
  let latest = { ...runtime.gameState, skills: { ...runtime.gameState.skills, points: runtime.gameState.skills.points + 4n }, infinity: { ...runtime.gameState.infinity,
    points: 688n + balance, spentPoints: 688n, secretsOfTheUniverse: 25n, permanentSkillPoints: 4n } }
  const dispatch = vi.fn()
  let resolve: (() => void) | undefined
  function Harness() {
    const [state, setState] = useState(latest)
    const snapshot = gameplaySnapshot(state)
    dispatch.mockImplementation(async (command) => {
      if (delayDispatch) await new Promise<void>(r => { resolve = r })
      if (outcome === 'throw') throw new Error('Purchase unavailable')
      if (outcome === 'rejected') return { status: 'rejected' }
      const result = purchaseCanonicalInfinityShopItem(latest, command.itemId)
      latest = result.state as typeof latest
      setState(latest)
      return { status: result.accepted ? 'accepted' : 'rejected' }
    })
    return <IntlProvider locale="en" messages={{}}><InfinitySurface locale="en"
      resources={snapshot.resources.infinity} progression={snapshot.progression}
      derived={snapshot.derived.infinity} previews={snapshot.previews.infinity}
      commandAvailability={{ purchaseShopItem: true, setBreakTarget: true, setAutomaticReset: true, requestReset: true }}
      dispatchPlayer={dispatch} /></IntlProvider>
  }
  const view = render(<Harness />)
  const button = screen.getByRole('button', { name: itemId === 'secret' ? /Purchase Secret/ : itemId === 'retain-assembly-lines' ? /Purchase Start with 10 Assembly Lines/ : /Purchase Permanent Skill Point/ })
  return { button, dispatch, view, state: () => latest, resolve: () => resolve?.() }
}

for (const itemId of ['secret', 'permanent-skill-point'] as const) {
  test(`${itemId}: holding buys to the canonical cap and stops without an extra release debit`, async () => {
    vi.useFakeTimers()
    const h = purchaseHarness(itemId)
    fireEvent.pointerDown(h.button)
    for (let i = 0; i < 8; i++) await act(async () => { await vi.advanceTimersByTimeAsync(i === 0 ? 400 : 100) })
    const count = itemId === 'secret' ? h.state().infinity.secretsOfTheUniverse : h.state().infinity.permanentSkillPoints
    expect(count).toBe(itemId === 'secret' ? 27n : 10n)
    const spent = h.state().infinity.spentPoints
    fireEvent.pointerUp(window); fireEvent.click(h.button)
    await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
    expect(h.state().infinity.spentPoints).toBe(spent)
    expect((h.button as HTMLButtonElement).disabled).toBe(true)
  })
}

test('release while affordable ends repeat without adding a click purchase; a new tap still buys once', async () => {
  vi.useFakeTimers()
  const h = purchaseHarness('permanent-skill-point')
  fireEvent.pointerDown(h.button)
  await act(async () => { await vi.advanceTimersByTimeAsync(400) })
  await act(async () => { await vi.advanceTimersByTimeAsync(100) })
  expect(h.state().infinity.permanentSkillPoints).toBe(6n)
  fireEvent.pointerUp(window); fireEvent.click(h.button)
  await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
  expect(h.state().infinity.permanentSkillPoints).toBe(6n)
  fireEvent.pointerDown(h.button); fireEvent.pointerUp(h.button)
  await act(async () => fireEvent.click(h.button))
  expect(h.state().infinity.permanentSkillPoints).toBe(7n)
})

test.each([
  ['secret', 1],
  ['secret', 2],
  ['permanent-skill-point', 1],
  ['permanent-skill-point', 2],
] as const)('%s ignores a hold with mouse button %s', async (itemId, button) => {
  vi.useFakeTimers()
  const h = purchaseHarness(itemId)
  fireEvent.pointerDown(h.button, { button, pointerType: 'mouse' })
  if (button === 2) fireEvent.contextMenu(h.button)
  await act(async () => { await vi.advanceTimersByTimeAsync(1400) })
  fireEvent.pointerUp(window, { button, pointerType: 'mouse' })
  expect(h.state().infinity.spentPoints).toBe(688n)
  expect(h.state().infinity.secretsOfTheUniverse).toBe(25n)
  expect(h.state().infinity.permanentSkillPoints).toBe(4n)
  expect(h.dispatch).not.toHaveBeenCalled()
})

test.each(['mouse', 'touch'])('%s primary holds still repeat and release without an extra purchase', async pointerType => {
  vi.useFakeTimers()
  const h = purchaseHarness('permanent-skill-point')
  fireEvent.pointerDown(h.button, { button: 0, pointerType })
  await act(async () => { await vi.advanceTimersByTimeAsync(400) })
  await act(async () => { await vi.advanceTimersByTimeAsync(100) })
  expect(h.state().infinity.permanentSkillPoints).toBe(6n)
  expect(h.state().infinity.spentPoints).toBe(690n)
  fireEvent.pointerUp(window, { button: 0, pointerType })
  await act(async () => { fireEvent.click(h.button); await vi.advanceTimersByTimeAsync(1000) })
  expect(h.state().infinity.permanentSkillPoints).toBe(6n)
  expect(h.state().infinity.spentPoints).toBe(690n)
})

for (const cancel of ['pointerup', 'pointercancel', 'pointerleave', 'blur', 'hidden', 'unmount']) {
  test(`pending Infinity repeat stays serial and cannot restart after ${cancel}`, async () => {
    vi.useFakeTimers()
    const h = purchaseHarness('permanent-skill-point', 20n, true)
    fireEvent.pointerDown(h.button)
    await act(async () => { await vi.advanceTimersByTimeAsync(1400) })
    expect(h.dispatch).toHaveBeenCalledTimes(1)
    if (cancel === 'unmount') h.view.unmount()
    else if (cancel === 'hidden') {
      const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
      fireEvent(document, new Event('visibilitychange')); hidden.mockRestore()
    } else if (cancel === 'pointerleave') fireEvent.pointerLeave(h.button)
    else fireEvent(window, new Event(cancel, { bubbles: true }))
    await act(async () => { h.resolve(); await vi.advanceTimersByTimeAsync(1000) })
    expect(h.state().infinity.permanentSkillPoints).toBe(5n)
    expect(h.dispatch).toHaveBeenCalledTimes(1)
  })
}

for (const key of ['Enter', ' ']) {
  test(`Infinity ${key} hold repeats and body keyup does not charge again`, async () => {
    vi.useFakeTimers()
    const h = purchaseHarness('permanent-skill-point')
    fireEvent.keyDown(h.button, { key })
    await act(async () => { await vi.advanceTimersByTimeAsync(400) })
    expect(h.state().infinity.permanentSkillPoints).toBe(5n)
    fireEvent.keyUp(document.body, { key })
    await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
    expect(h.state().infinity.permanentSkillPoints).toBe(5n)
    fireEvent.keyDown(h.button, { key })
    await act(async () => fireEvent.keyUp(document.body, { key }))
    expect(h.state().infinity.permanentSkillPoints).toBe(6n)
  })
}

test('Infinity hold exhausts only the available wallet', async () => {
  vi.useFakeTimers()
  const h = purchaseHarness('permanent-skill-point', 1n)
  fireEvent.pointerDown(h.button)
  await act(async () => { await vi.advanceTimersByTimeAsync(400) })
  await act(async () => { await vi.advanceTimersByTimeAsync(1000) })
  expect(h.state().infinity.permanentSkillPoints).toBe(5n)
  expect(h.state().infinity.spentPoints).toBe(689n)
  expect(h.dispatch).toHaveBeenCalledTimes(1)
})


for (const outcome of ['rejected', 'throw'] as const) {
  test(`Infinity ${outcome} stops a hold without a debit or release retry`, async () => {
    vi.useFakeTimers()
    const h = purchaseHarness('permanent-skill-point', 20n, false, outcome)
    fireEvent.pointerDown(h.button)
    await act(async () => { await vi.advanceTimersByTimeAsync(1400) })
    fireEvent.pointerUp(window)
    await act(async () => fireEvent.click(h.button))
    expect(h.dispatch).toHaveBeenCalledTimes(1)
    expect(h.state().infinity.permanentSkillPoints).toBe(4n)
    expect(h.state().infinity.spentPoints).toBe(688n)
  })
}

test('one-time Infinity upgrades retain a single release purchase', async () => {
  vi.useFakeTimers()
  const h = purchaseHarness('retain-assembly-lines')
  fireEvent.pointerDown(h.button)
  await act(async () => { await vi.advanceTimersByTimeAsync(1400) })
  expect(h.dispatch).not.toHaveBeenCalled()
  fireEvent.pointerUp(h.button)
  await act(async () => fireEvent.click(h.button))
  expect(h.dispatch).toHaveBeenCalledTimes(1)
  expect(h.state().infinity.spentPoints).toBe(689n)
})
