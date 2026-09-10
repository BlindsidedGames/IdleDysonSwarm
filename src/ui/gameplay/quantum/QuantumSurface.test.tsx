// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, within } from '@testing-library/react'
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


afterEach(cleanup)

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
  return { state, dispatch, button: within(card).getByRole('button') as HTMLButtonElement }
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
