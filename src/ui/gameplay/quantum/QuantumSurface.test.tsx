// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, within } from '@testing-library/react'
import { useState } from 'react'
import { IntlProvider } from 'react-intl'
import { afterEach, describe, expect, test, vi } from 'vitest'
import { CanonicalRuntimeSession } from '../../../application/canonicalRuntimeSession'
import { createUnityFirstRunPreparedSave } from '../../../application/firstRun/unityFirstRunSave'
import { selectFrontendGameplaySnapshot } from '../../../application/frontendSnapshot'
import { DISCRETE_MAXIMUM } from '../../../simulation/numeric'
import { purchaseQuantumUpgradeBulk } from '../../../simulation/quantumUpgrades'
import { QuantumSurface, type QuantumSurfaceProps } from './QuantumSurface'

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


afterEach(() => { cleanup(); vi.useRealTimers() })

function setup(quantity: QuantumSurfaceProps['purchaseQuantity'], headroom = 2n, balance = 100n) {
  const state = {
    ...runtime.gameState,
    quantum: {
      ...runtime.gameState.quantum,
      pointsEarned: DISCRETE_MAXIMUM + balance,
      pointsSpent: DISCRETE_MAXIMUM,
      cashBonusLevels: DISCRETE_MAXIMUM - headroom,
    },
  }
  const snapshot = gameplaySnapshot(state)
  const dispatch = vi.fn<QuantumSurfaceProps['dispatchPlayer']>().mockResolvedValue({ status: 'accepted' } as Awaited<ReturnType<QuantumSurfaceProps['dispatchPlayer']>>)
  const view = render(<IntlProvider locale="en" messages={{}}>
    <QuantumSurface locale="en" resources={snapshot.resources.quantum}
      availableInfinityPoints={0n} progression={snapshot.progression}
      previews={snapshot.previews.quantum} meditationPreview={snapshot.previews.avocado.meditation}
      commandAvailability={{ purchaseUpgrade: true, requestLeap: true, completeMeditationStep: true }}
      dispatchPlayer={dispatch} purchaseQuantity={quantity} />
  </IntlProvider>)
  const card = view.container.querySelector('[data-quantum-upgrade-id="CashBonus"]') as HTMLElement
  return { view, state, dispatch, button: within(card).getByRole('button') as HTMLButtonElement }
}

describe('Quantum purchase capacity UI', () => {
  test('Max labels the executable quantity and dispatches Max with a matching debit', async () => {
    const { button, dispatch, state } = setup('max')
    expect(button.disabled).toBe(false)
    expect(button.textContent).toContain('+2')
    expect(button.getAttribute('aria-label')).toMatch(/^Purchase 2 .* upgrades for 2 Quantum Shards$/)
    await act(async () => fireEvent.click(button))
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({ kind: 'quantum.purchase-upgrade', upgradeId: 'CashBonus', quantity: 'max' })
    const result = purchaseQuantumUpgradeBulk(state, 'CashBonus', 'max')
    expect(result.cost).toBe(2n)
    expect(result.state.quantum.cashBonusLevels).toBe(DISCRETE_MAXIMUM)
  })

  test('fixed quantities above capacity are disabled without dispatching', () => {
    const { button, dispatch } = setup(10)
    expect(button.disabled).toBe(true)
    fireEvent.click(button)
    expect(dispatch).not.toHaveBeenCalled()
  })

  test('a full booster renders Maxed and cannot be purchased', () => {
    const { button, dispatch } = setup('max', 0n)
    expect(button.textContent).toBe('Maxed')
    expect(button.disabled).toBe(true)
    fireEvent.click(button)
    expect(dispatch).not.toHaveBeenCalled()
  })

  test('an empty wallet disables Max without showing Maxed', () => {
    const { button } = setup('max', 2n, 0n)
    expect(button.disabled).toBe(true)
    expect(button.textContent).not.toContain('Maxed')
  })
})

function statefulPurchase(quantity: NonNullable<QuantumSurfaceProps['purchaseQuantity']>, balance: bigint, headroom = 10000n) {
  let latest = {
    ...runtime.gameState,
    quantum: { ...runtime.gameState.quantum, pointsEarned: 100000n + balance, pointsSpent: 100000n, cashBonusLevels: DISCRETE_MAXIMUM - headroom },
  }
  const dispatch = vi.fn()
  function Harness() {
    const [state, setState] = useState(latest)
    const snapshot = gameplaySnapshot(state)
    dispatch.mockImplementation(async (command) => {
      const result = purchaseQuantumUpgradeBulk(latest, command.upgradeId, command.quantity ?? 1n)
      latest = result.state as typeof latest
      setState(latest)
      return { status: result.accepted ? 'accepted' : 'rejected' }
    })
    return <IntlProvider locale="en" messages={{}}><QuantumSurface locale="en"
      resources={snapshot.resources.quantum} progression={snapshot.progression}
      previews={snapshot.previews.quantum} meditationPreview={snapshot.previews.avocado.meditation}
      availableInfinityPoints={0n} commandAvailability={{ purchaseUpgrade: true, requestLeap: true, completeMeditationStep: true }}
      dispatchPlayer={dispatch} purchaseQuantity={quantity} /></IntlProvider>
  }
  const view = render(<Harness />)
  const button = view.container.querySelector('[data-quantum-upgrade-id="CashBonus"] button') as HTMLButtonElement
  return { button, dispatch, read: () => latest }
}

async function elapse(ms: number) {
  await act(async () => { await vi.advanceTimersByTimeAsync(ms) })
}

describe('Quantum hold purchases', () => {
  test.each([1, 10, 50, 100] as const)('holding %s repeats full affordable batches and stops without a release charge', async quantity => {
    vi.useFakeTimers()
    const { button, dispatch, read } = statefulPurchase(quantity, BigInt(quantity * 2 + (quantity === 1 ? 0 : 1)))
    fireEvent.pointerDown(button)
    await elapse(400)
    await elapse(100)
    await elapse(1000)
    expect(dispatch).toHaveBeenCalledTimes(2)
    expect(read().quantum.pointsSpent - 100000n).toBe(BigInt(quantity * 2))
    expect(button.disabled).toBe(true)
    fireEvent.pointerUp(window)
    fireEvent.click(button)
    expect(read().quantum.pointsSpent - 100000n).toBe(BigInt(quantity * 2))
  })

  test.each([1, 10, 50, 100, 'max'] as const)('%s respects the ownership cap', async quantity => {
    vi.useFakeTimers()
    const cap = quantity === 'max' ? 7n : BigInt(quantity)
    const { button, dispatch, read } = statefulPurchase(quantity, 1000n, cap)
    if (quantity === 'max') await act(async () => fireEvent.click(button))
    else fireEvent.pointerDown(button)
    await elapse(400)
    await elapse(500)
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(read().quantum.cashBonusLevels).toBe(DISCRETE_MAXIMUM)
    expect(read().quantum.pointsSpent - 100000n).toBe(cap)
  })

  test.each(['pointerUp', 'pointerCancel', 'pointerLeave', 'blur', 'hidden', 'unmount'] as const)('%s while dispatch is pending prevents repeat restart', async cancellation => {
    vi.useFakeTimers()
    const { view, button, dispatch } = setup(10, 100n, 100n)
    let resolve!: (result: Awaited<ReturnType<QuantumSurfaceProps['dispatchPlayer']>>) => void
    dispatch.mockImplementation(() => new Promise(done => { resolve = done }))
    fireEvent.pointerDown(button)
    await elapse(400)
    expect(dispatch).toHaveBeenCalledTimes(1)
    if (cancellation === 'unmount') view.unmount()
    else if (cancellation === 'hidden') {
      const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true)
      fireEvent(document, new Event('visibilitychange'))
      hidden.mockRestore()
    }
    else if (cancellation === 'blur') fireEvent.blur(window)
    else fireEvent[cancellation](cancellation === 'pointerLeave' ? button : window)
    await act(async () => resolve({ status: 'accepted' } as Awaited<ReturnType<QuantumSurfaceProps['dispatchPlayer']>>))
    await elapse(1000)
    expect(dispatch).toHaveBeenCalledTimes(1)
    if (cancellation !== 'unmount') {
      fireEvent.click(button)
      expect(dispatch).toHaveBeenCalledTimes(1)
    }
  })

  test('a rejected transaction ends the hold', async () => {
    vi.useFakeTimers()
    const { button, dispatch } = setup(10, 100n, 100n)
    dispatch.mockResolvedValue({ status: 'rejected' } as Awaited<ReturnType<QuantumSurfaceProps['dispatchPlayer']>>)
    fireEvent.pointerDown(button)
    await elapse(400)
    await elapse(1000)
    expect(dispatch).toHaveBeenCalledTimes(1)
  })

  test('Max spends only the available wallet and stops before the ownership cap', async () => {
    vi.useFakeTimers()
    const { button, dispatch, read } = statefulPurchase('max', 7n, 1000n)
    await act(async () => fireEvent.click(button))
    await elapse(400)
    await elapse(1000)
    expect(dispatch).toHaveBeenCalledTimes(1)
    expect(read().quantum.pointsSpent - 100000n).toBe(7n)
    expect(read().quantum.cashBonusLevels).toBe(DISCRETE_MAXIMUM - 993n)
  })

  test('holding Max does not purchase until click and never repeats', async () => {
    vi.useFakeTimers()
    const { button, dispatch } = setup('max', 100n, 100n)
    fireEvent.pointerDown(button)
    await elapse(1500)
    expect(dispatch).not.toHaveBeenCalled()
    fireEvent.pointerUp(button)
    await act(async () => fireEvent.click(button))
    await elapse(1500)
    expect(dispatch).toHaveBeenCalledExactlyOnceWith({
      kind: 'quantum.purchase-upgrade', upgradeId: 'CashBonus', quantity: 'max',
    })
  })

  test('keyboard release outside the disabled button ends repetition', async () => {
    vi.useFakeTimers()
    const { button, dispatch } = setup(50, 1000n, 1000n)
    expect(fireEvent.keyDown(button, { key: ' ' })).toBe(false)
    await elapse(400)
    expect(fireEvent.keyUp(document.body, { key: ' ' })).toBe(false)
    await elapse(500)
    expect(dispatch).toHaveBeenCalledTimes(1)
  })
})


test.each([1, 10, 50, 100, 'max'] as const)('keyboard tap for %s activates once on release', async quantity => {
  vi.useFakeTimers()
  const { button, dispatch } = setup(quantity, 1000n, 1000n)
  expect(fireEvent.keyDown(button, { key: 'Enter' })).toBe(false)
  expect(fireEvent.keyDown(button, { key: 'Enter', repeat: true })).toBe(false)
  await elapse(100)
  expect(dispatch).not.toHaveBeenCalled()
  await act(async () => { expect(fireEvent.keyUp(button, { key: 'Enter' })).toBe(false) })
  await elapse(1000)
  expect(dispatch).toHaveBeenCalledTimes(1)
})

test('holding Enter on Max stays single-shot and a subsequent pointer click still works', async () => {
  vi.useFakeTimers()
  const { button, dispatch } = setup('max', 1000n, 1000n)
  fireEvent.keyDown(button, { key: 'Enter' })
  await elapse(1500)
  expect(dispatch).not.toHaveBeenCalled()
  await act(async () => { fireEvent.keyUp(button, { key: 'Enter' }) })
  await elapse(500)
  expect(dispatch).toHaveBeenCalledTimes(1)
  fireEvent.pointerDown(button)
  fireEvent.pointerUp(button)
  await act(async () => { fireEvent.click(button) })
  expect(dispatch).toHaveBeenCalledTimes(2)
})
