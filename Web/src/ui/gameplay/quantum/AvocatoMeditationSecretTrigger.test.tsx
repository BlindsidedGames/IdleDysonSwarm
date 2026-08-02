// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import type { ComponentProps } from 'react'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import {
  AvocatoMeditationSecretTrigger,
} from './AvocatoMeditationSecretTrigger'
import {
  AVOCATO_MEDITATION_ROUTE_STEPS,
  type AvocatoMeditationPlacement,
} from './meditationTargets'

afterEach(() => {
  cleanup()
  document.querySelectorAll('[data-avotation-found-feedback]').forEach(
    (element) => element.remove(),
  )
  vi.useRealTimers()
})

describe('AvocatoMeditationSecretTrigger', () => {
  test('maps the seven authored Unity targets in their canonical order', () => {
    expect(AVOCATO_MEDITATION_ROUTE_STEPS).toEqual({
      quantum: 0,
      infinity: 1,
      bots: 2,
      skills: 3,
      settings: 4,
      research: 5,
      side: 6,
    })
  })

  test.each(
    Object.entries(AVOCATO_MEDITATION_ROUTE_STEPS) as [
      AvocatoMeditationPlacement,
      number,
    ][],
  )('dispatches the canonical %s target for step %i', async (placement, stepIndex) => {
    const dispatchPlayer = vi.fn(async () => accepted())
    const { container } = renderTrigger({ placement, requiredStepIndex: stepIndex, dispatchPlayer })

    const trigger = await waitFor(() => {
      const target = container.querySelector(
        `[data-avocato-secret-step="${stepIndex}"]`,
      )
      expect(target).not.toBeNull()
      return target as HTMLElement
    })
    expect(trigger).toHaveAttribute('data-avotation-target', placement)
    fireEvent.click(trigger)
    fireEvent.click(trigger)

    expect(dispatchPlayer).toHaveBeenCalledTimes(1)
    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'avocado.complete-meditation-step',
      requiredStepIndex: stepIndex,
    })
    await waitFor(() => {
      expect(document.querySelector('[data-avotation-found-feedback]')).toHaveAttribute(
        'src',
        expect.stringContaining('avotation-dabbing-avocado.png'),
      )
    })
  })

  test('only shows found feedback after the command is accepted', async () => {
    const dispatchPlayer = vi.fn(async (): Promise<UiRuntimePlayerCommandResult> => ({
      status: 'rejected',
      kind: 'transition',
      code: 'out-of-order',
      reason: 'The secret is not active.',
      stale: false,
      stateRevision: 2,
      activationRevision: { session: 1, state: 2 },
    }))
    const { container } = renderTrigger({ dispatchPlayer })
    const trigger = await waitFor(() => container.querySelector('[data-avocato-secret-step]'))

    fireEvent.click(trigger!)

    await waitFor(() => expect(dispatchPlayer).toHaveBeenCalledOnce())
    expect(document.querySelector('[data-avotation-found-feedback]')).not.toBeInTheDocument()
  })

  test('discovers the secret without blocking the panel normal action', async () => {
    const normalAction = vi.fn()
    const dispatchPlayer = vi.fn(async () => accepted())
    render(
      <>
        <AvocatoMeditationSecretTrigger
          placement="bots"
          requiredStepIndex={2}
          completed={false}
          routeAvailable
          dispatchPlayer={dispatchPlayer}
        />
        <button className="dyson-shell__production-summary" onClick={normalAction}>Open details</button>
      </>,
    )

    fireEvent.click(await waitFor(() => document.querySelector('[data-avocato-secret-step]')!))

    expect(normalAction).toHaveBeenCalledOnce()
    expect(dispatchPlayer).toHaveBeenCalledOnce()
  })

  test.each([
    { requiredStepIndex: 3, completed: false },
    { requiredStepIndex: null, completed: true },
  ])('leaves a transparent marker on a discovered panel', async (progress) => {
    const { container } = renderTrigger({
      placement: 'bots',
      routeAvailable: true,
      ...progress,
    })

    const marker = await waitFor(() => container.querySelector('[data-avotation-found-marker="bots"]'))
    expect(marker).toHaveAttribute(
      'src',
      expect.stringContaining('avotation-dabbing-avocado.png'),
    )
    expect(marker).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('[data-test-panel]')).not.toHaveAttribute('data-avotation-target')
  })

  test('keeps accepted feedback visible through the step transition, then removes it', async () => {
    vi.useFakeTimers()
    const dispatchPlayer = vi.fn(async () => accepted())
    const rendered = renderTrigger({ dispatchPlayer })

    await vi.waitFor(() => {
      expect(rendered.container.querySelector('[data-avocato-secret-step]')).toBeInTheDocument()
    })
    fireEvent.click(rendered.container.querySelector('[data-avocato-secret-step]')!)
    await vi.waitFor(() => {
      expect(document.querySelector('[data-avotation-found-feedback]')).toBeInTheDocument()
    })

    rendered.rerender(
      <>
        <AvocatoMeditationSecretTrigger
          placement="bots"
          requiredStepIndex={3}
          completed={false}
          routeAvailable
          dispatchPlayer={dispatchPlayer}
        />
        <TestPanel placement="bots" />
      </>,
    )
    expect(document.querySelector('[data-avotation-found-feedback]')).toBeInTheDocument()

    await vi.advanceTimersByTimeAsync(1_200)
    expect(document.querySelector('[data-avotation-found-feedback]')).not.toBeInTheDocument()
  })

  test('reopens completed meditation from the final menu control without dispatching again', async () => {
    const dispatchPlayer = vi.fn(async () => accepted())
    const onSequenceCompleted = vi.fn()
    render(
      <>
        <AvocatoMeditationSecretTrigger
          placement="side"
          requiredStepIndex={null}
          completed
          routeAvailable
          dispatchPlayer={dispatchPlayer}
          onSequenceCompleted={onSequenceCompleted}
        />
        <aside className="dyson-shell__side-panel">
          <header className="dyson-shell__side-heading">Menu</header>
          <button type="button">Bots</button>
        </aside>
      </>,
    )

    fireEvent.click(await waitFor(() => document.querySelector('.dyson-shell__side-heading')!))
    expect(onSequenceCompleted).toHaveBeenCalledOnce()
    expect(dispatchPlayer).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: 'Bots' }))
    expect(onSequenceCompleted).toHaveBeenCalledOnce()
  })

  test.each([
    { requiredStepIndex: 1, completed: false, routeAvailable: true },
    { requiredStepIndex: 2, completed: false, routeAvailable: false },
  ])('leaves wrong-order and unavailable targets inert', (overrides) => {
    const dispatchPlayer = vi.fn(async () => accepted())
    const { container } = renderTrigger({
      placement: 'bots',
      dispatchPlayer,
      ...overrides,
    })

    fireEvent.click(container.querySelector('[data-test-panel]')!)
    expect(container.querySelector('[data-avocato-secret-step]')).not.toBeInTheDocument()
    expect(dispatchPlayer).not.toHaveBeenCalled()
  })
})

function renderTrigger(
  overrides: Partial<
    ComponentProps<typeof AvocatoMeditationSecretTrigger>
  > = {},
) {
  const placement = overrides.placement ?? 'bots'
  return render(
    <>
      <AvocatoMeditationSecretTrigger
        placement="bots"
        requiredStepIndex={2}
        completed={false}
        routeAvailable
        dispatchPlayer={vi.fn(async () => accepted())}
        {...overrides}
      />
      <TestPanel placement={placement} />
    </>,
  )
}

function TestPanel({ placement }: { readonly placement: AvocatoMeditationPlacement }) {
  if (placement === 'quantum') return <article data-test-panel data-quantum-upgrade-id="Secrets" />
  if (placement === 'infinity') return <header data-test-panel className="infinity-surface__summary" />
  if (placement === 'bots') return <div data-test-panel className="dyson-shell__production-summary" />
  if (placement === 'skills') return <div data-test-panel className="skill-settings__preset-row" />
  if (placement === 'settings') return <section data-test-panel className="settings-surface__panel--more" />
  if (placement === 'research') return <div data-test-panel className="research-surface__settings" />
  return <aside data-test-panel className="dyson-shell__side-panel" />
}

function accepted(): UiRuntimePlayerCommandResult {
  return {
    status: 'accepted',
    kind: 'transition',
    changed: true,
    stateRevision: 2,
    activationRevision: { session: 1, state: 2 },
  }
}
