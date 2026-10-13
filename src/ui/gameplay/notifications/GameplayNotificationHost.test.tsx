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
  test('acknowledges UI acceptance while retaining the first-discovery dialog after source draining', async () => {
    const accepted = vi.fn()
    const props = { sessionRevision: 1, locale: 'en' as const, showPresetApplicationNotices: true,
      onViewReality: vi.fn(), onEventsAccepted: accepted }
    const view = render(<IntlProvider locale="en"><GameplayNotificationHost {...props}
      events={[disaster({ sequence: 1, firstLifetimeOccurrence: true })]} /></IntlProvider>)
    expect(await screen.findByRole('dialog', { name: 'Meteor Storm' })).toBeTruthy()
    expect(accepted).toHaveBeenCalledWith(1, 1)
    view.rerender(<IntlProvider locale="en"><GameplayNotificationHost {...props} events={[]} /></IntlProvider>)
    expect(screen.getByRole('dialog', { name: 'Meteor Storm' })).toBeTruthy()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  test('sidebar burst disaster is interactive outside an inert compact-menu main and restores it on dismissal', async () => {
    render(<div className="dyson-shell">
      <aside className="dyson-shell__side-panel"><button>Sidebar burst</button></aside>
      <div inert>{hostTree([], vi.fn(), [disaster({ sequence: -1, firstLifetimeOccurrence: true })])}</div>
    </div>)
    const dialog = await screen.findByRole('dialog', { name: 'Meteor Storm' })
    expect(dialog.closest('[inert]')).toBeNull()
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(screen.getByRole('button', { name: 'Sidebar burst' }).closest('[inert]')).toBeNull()
    expect(screen.getByRole('button', { name: 'Previous focus' }).closest('[inert]')).not.toBeNull()
  })

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

    view.rerender(hostTree([first, { ...presetConflict(5), application: { ...presetConflict(5).application, slot: 3 } }]))
    expect(await screen.findByRole('status')).not.toBeNull()
  })

  test('repeated automatic route applications share one notice even after it is dismissed', () => {
    vi.useFakeTimers()
    const accepted = vi.fn()
    const props = { sessionRevision: 1, locale: 'en' as const, showPresetApplicationNotices: true,
      onViewReality: vi.fn(), onEventsAccepted: accepted }
    const tree = (events: readonly CanonicalRuntimePresentationEvent[]) =>
      <IntlProvider locale="en"><GameplayNotificationHost {...props} events={events} /></IntlProvider>
    const view = render(tree([presetConflict(1)]))
    for (let sequence = 2; sequence <= 8; sequence++) {
      act(() => vi.advanceTimersByTime(500))
      view.rerender(tree([{ ...presetConflict(sequence), presetName: 'Renamed preset', application: {
        ...presetConflict(sequence).application, retainedSkillIds: ['retained'],
      } }]))
    }
    expect(accepted).toHaveBeenCalledTimes(8)
    act(() => vi.advanceTimersByTime(2500))
    expect(screen.queryByRole('status')).toBeNull()
    view.rerender(tree([presetConflict(9)]))
    expect(screen.queryByRole('status')).toBeNull()
    expect(accepted).toHaveBeenLastCalledWith(1, 9)
  })

  test('a resolution clears only its automatic conflict and permits a later identical conflict in the same batch', () => {
    const other = { ...presetConflict(2), presetName: 'Other preset', application: { ...presetConflict(2).application, slot: 3 as const } }
    const manual = { ...presetConflict(3), presetName: 'Manual preset', application: { ...presetConflict(3).application, trigger: 'manual' as const } }
    const view = renderHost([presetConflict(1), other, manual, { ...manual, sequence: 4 }])
    view.rerender(hostTree([resolvedPreset(5), presetConflict(6)]))
    fireEvent.click(screen.getByRole('button', { name: /Other preset was partially applied/ }))
    fireEvent.click(screen.getByRole('button', { name: /Manual preset was partially applied/ }))
    fireEvent.click(screen.getByRole('button', { name: /Manual preset was partially applied/ }))
    fireEvent.click(screen.getByRole('button', { name: /Conflict preset was partially applied/ }))
    expect(screen.queryByRole('status')).toBeNull()
  })

  test('disabling notices clears queued conflicts without replaying acknowledged events on re-enable', () => {
    const props = { sessionRevision: 1, locale: 'en' as const, onViewReality: vi.fn() }
    const tree = (events: readonly CanonicalRuntimePresentationEvent[], show: boolean) =>
      <IntlProvider locale="en"><GameplayNotificationHost {...props} events={events} showPresetApplicationNotices={show} /></IntlProvider>
    const view = render(tree([presetConflict(1), disaster({ sequence: 2, firstLifetimeOccurrence: false })], true))
    view.rerender(tree([presetConflict(3)], false))
    fireEvent.click(screen.getByRole('button', { name: /Meteor Storm reset the Simulation/ }))
    expect(screen.queryByRole('status')).toBeNull()
    view.rerender(tree([presetConflict(3)], true))
    expect(screen.queryByRole('status')).toBeNull()
    view.rerender(tree([presetConflict(4)], true))
    expect(screen.queryByRole('status')).not.toBeNull()
  })

  test('a new session clears ongoing conflict identities and the previous queue', () => {
    const props = { locale: 'en' as const, showPresetApplicationNotices: true, onViewReality: vi.fn() }
    const tree = (session: number, events: readonly CanonicalRuntimePresentationEvent[]) =>
      <IntlProvider locale="en"><GameplayNotificationHost {...props} sessionRevision={session} events={events} /></IntlProvider>
    const view = render(tree(1, [presetConflict(1), disaster({ sequence: 2, firstLifetimeOccurrence: false })]))
    fireEvent.click(screen.getByRole('button', { name: /Conflict preset was partially applied/ }))
    view.rerender(tree(2, [presetConflict(1)]))
    fireEvent.click(screen.getByRole('button', { name: /Conflict preset was partially applied/ }))
    expect(screen.queryByRole('status')).toBeNull()
  })

  test('conflict identity uses slot and unordered retained/blocked sets while preserving different conflicts', () => {
    const first = { ...presetConflict(1), application: { ...presetConflict(1).application, retainedSkillIds: ['a', 'b'], blockedByRetainedSkillIds: ['x', 'y'] } }
    const reordered = { ...first, sequence: 2, presetName: 'Renamed', application: { ...first.application, applicationSequence: 2, retainedSkillIds: ['b', 'a'], blockedByRetainedSkillIds: ['y', 'x'] } }
    const distinct = { ...presetConflict(3), presetName: 'Changed conflict', application: { ...presetConflict(3).application, retainedSkillIds: ['c'] } }
    renderHost([first, reordered, distinct])
    fireEvent.click(screen.getByRole('button', { name: /Conflict preset was partially applied/ }))
    fireEvent.click(screen.getByRole('button', { name: /Changed conflict was partially applied/ }))
    expect(screen.queryByRole('status')).toBeNull()
  })

  test('resolution preserves the first-disaster modal, repeat coalescing and remaining queue order', () => {
    const view = renderHost([disaster({ sequence: 1, firstLifetimeOccurrence: true }), presetConflict(2),
      disaster({ sequence: 3, firstLifetimeOccurrence: false }), disaster({ sequence: 4, firstLifetimeOccurrence: false }),
      disaster({ sequence: 5, firstLifetimeOccurrence: false, cause: 'GlobalWarming' })])
    view.rerender(hostTree([resolvedPreset(6)]))
    expect(screen.getByRole('dialog', { name: 'Meteor Storm' })).not.toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Continue' }))
    fireEvent.click(screen.getByRole('button', { name: 'Meteor Storm reset 2 Simulations · +4.00 Strange Matter' }))
    fireEvent.click(screen.getByRole('button', { name: 'Global Warming reset the Simulation · +2.00 Strange Matter' }))
    expect(screen.queryByRole('status')).toBeNull()
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  test('a silent resolution between repeat disasters preserves their batch coalescing', () => {
    renderHost([disaster({ sequence: 1, firstLifetimeOccurrence: false }), resolvedPreset(2),
      disaster({ sequence: 3, firstLifetimeOccurrence: false })])
    fireEvent.click(screen.getByRole('button', { name: 'Meteor Storm reset 2 Simulations · +4.00 Strange Matter' }))
    expect(screen.queryByRole('status')).toBeNull()
  })

  test.each(['preset-edited', 'retained-ownership-removed'] as const)('%s clears stale automatic feedback without needing another preset application', cause => {
    const skills = { presets: [{ skillIds: [] }, { skillIds: ['blocked'] }], byId: { retained: { owned: true } } }
    const props = { sessionRevision: 1, locale: 'en' as const, showPresetApplicationNotices: true, onViewReality: vi.fn() }
    const tree = (skillState: typeof skills, events: readonly CanonicalRuntimePresentationEvent[]) =>
      <IntlProvider locale="en"><GameplayNotificationHost {...props} skillState={skillState} events={events} /></IntlProvider>
    const view = render(tree(skills, [presetConflict(1)]))
    expect(screen.queryByRole('status')).not.toBeNull()
    const changed = cause === 'preset-edited' ? { ...skills, presets: [{ skillIds: [] }, { skillIds: [] }] }
      : { ...skills, byId: { retained: { owned: false } } }
    view.rerender(tree(changed, []))
    expect(screen.queryByRole('status')).toBeNull()
    view.rerender(tree(skills, [presetConflict(2)]))
    expect(screen.queryByRole('status')).not.toBeNull()
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

function presetConflict(sequence: number): Extract<CanonicalRuntimePresentationEvent, { kind: 'skill-preset-conflict' }> {
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

function resolvedPreset(sequence: number): CanonicalRuntimePresentationEvent {
  return { kind: 'skill-preset-conflict-resolved', sequence, slot: 2 }
}
