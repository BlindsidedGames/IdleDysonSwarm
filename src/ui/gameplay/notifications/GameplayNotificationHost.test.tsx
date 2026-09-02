// @vitest-environment jsdom

import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type { CanonicalRuntimePresentationEvent } from '../../../application/canonicalRuntimeSession'
import { GameplayNotificationHost } from './GameplayNotificationHost'

afterEach(() => {
  cleanup()
  vi.useRealTimers()
})

describe('GameplayNotificationHost', () => {
  test('shows the first disaster as an era-specific accessible dialog and navigates deliberately', async () => {
    const onViewReality = vi.fn()
    renderHost([
      disaster({ sequence: 1, firstLifetimeOccurrence: true, preResetEra: 'space-age' }),
    ], onViewReality)

    const dialog = await screen.findByRole('dialog', { name: 'Meteor Storm' })
    expect(dialog.getAttribute('data-simulation-era')).toBe('space-age')
    expect(screen.getByText(/Reality tab/)).not.toBeNull()
    expect(document.activeElement).toBe(
      screen.getByRole('button', { name: 'Continue' }),
    )
    expect(
      screen.getByRole('button', { name: 'Previous focus', hidden: true })
        .inert,
    ).toBe(true)

    fireEvent.click(screen.getByRole('button', { name: 'View Countermeasures' }))
    expect(onViewReality).toHaveBeenCalledTimes(1)
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  test('coalesces adjacent repeat disasters and queues different causes', async () => {
    renderHost([
      disaster({ sequence: 1, firstLifetimeOccurrence: false }),
      disaster({ sequence: 2, firstLifetimeOccurrence: false, strangeMatterGranted: 3 }),
      disaster({ sequence: 3, firstLifetimeOccurrence: false, cause: 'GlobalWarming' }),
    ])

    const first = await screen.findByRole('button', {
      name: 'Meteor Storm reset 2 Simulations · +5.00 Strange Matter',
    })
    fireEvent.click(first)
    expect(await screen.findByRole('button', {
      name: 'Global Warming reset the Simulation · +2.00 Strange Matter',
    })).not.toBeNull()
  })

  test('dismisses the modal with Escape and restores focus', async () => {
    const view = renderHost([])
    const previous = screen.getByRole('button', { name: 'Previous focus' })
    previous.focus()
    view.rerender(hostTree([
      disaster({ sequence: 1, firstLifetimeOccurrence: true }),
    ]))

    const dialog = await screen.findByRole('dialog')
    fireEvent.keyDown(dialog, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(document.activeElement).toBe(previous)
  })

  test('uses the shared six-second dismiss timer without stealing focus', async () => {
    vi.useFakeTimers()
    const focusTarget = document.createElement('button')
    document.body.append(focusTarget)
    focusTarget.focus()
    renderHost([disaster({ sequence: 1, firstLifetimeOccurrence: false })])

    expect(screen.getByRole('status')).not.toBeNull()
    expect(document.activeElement).toBe(focusTarget)
    act(() => vi.advanceTimersByTime(6_000))
    expect(screen.queryByRole('status')).toBeNull()
    focusTarget.remove()
  })

  test('does not replay a dismissed sequence on ordinary snapshot publication', async () => {
    const first = presetConflict(4)
    const view = renderHost([first])
    const banner = await screen.findByRole('button', {
      name: /Conflict preset was partially applied/,
    })
    fireEvent.click(banner)

    view.rerender(hostTree([first]))
    expect(screen.queryByRole('status')).toBeNull()

    view.rerender(hostTree([first, presetConflict(5)]))
    expect(await screen.findByRole('status')).not.toBeNull()
  })

  test('presents a released Stored Time discovery as a dialog and never replays it', async () => {
    const storedTimeDiscovery = disaster({
      sequence: -9,
      firstLifetimeOccurrence: true,
      preResetEra: 'information',
    })
    const view = renderHost([], vi.fn(), [storedTimeDiscovery])

    const dialog = await screen.findByRole('dialog', { name: 'Meteor Storm' })
    expect(dialog.getAttribute('data-simulation-era')).toBe('information')
    expect(screen.queryByRole('status')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))

    view.rerender(hostTree([], vi.fn(), [storedTimeDiscovery]))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.queryByRole('status')).toBeNull()
  })
})

function renderHost(
  events: readonly CanonicalRuntimePresentationEvent[],
  onViewReality = vi.fn(),
  storedTimeFirstDisasterEvents: readonly ReturnType<typeof disaster>[] = [],
) {
  return render(
    hostTree(events, onViewReality, storedTimeFirstDisasterEvents),
  )
}

function hostTree(
  events: readonly CanonicalRuntimePresentationEvent[],
  onViewReality = vi.fn(),
  storedTimeFirstDisasterEvents: readonly ReturnType<typeof disaster>[] = [],
) {
  return (
    <IntlProvider locale="en" messages={{}} onError={() => undefined}>
      <main className="dyson-shell__main">
        <div className="dyson-shell__content">
          <button type="button">Previous focus</button>
          <div className="dyson-shell__notifications">
            <GameplayNotificationHost
              sessionRevision={1}
              events={events}
              storedTimeFirstDisasterEvents={storedTimeFirstDisasterEvents}
              locale="en"
              showPresetApplicationNotices
              onViewReality={onViewReality}
            />
          </div>
        </div>
      </main>
    </IntlProvider>
  )
}

function presetConflict(sequence: number): CanonicalRuntimePresentationEvent {
  return {
    kind: 'skill-preset-conflict',
    sequence,
    presetName: 'Conflict preset',
    application: {
      applicationSequence: sequence,
      slot: 2,
      trigger: 'automatic',
      retainedSkillIds: ['retained'],
      assignedSkillIds: [],
      pendingSkillIds: ['blocked'],
      blockedByRetainedSkillIds: ['blocked'],
    },
  }
}

function disaster(
  overrides: Partial<Extract<
    CanonicalRuntimePresentationEvent,
    { readonly kind: 'automatic-dream-disaster' }
  >>,
): Extract<
  CanonicalRuntimePresentationEvent,
  { readonly kind: 'automatic-dream-disaster' }
> {
  return {
    kind: 'automatic-dream-disaster',
    sequence: 1,
    cause: 'Meteor',
    strangeMatterGranted: 2,
    resetCount: 1n,
    firstLifetimeOccurrence: false,
    preResetEra: 'foundational',
    ...overrides,
  }
}
