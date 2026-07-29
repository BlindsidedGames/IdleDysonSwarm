// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import axe from 'axe-core'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { createIntl, createIntlCache } from 'react-intl'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type {
  FrontendApplicationSnapshot,
} from '../../../application/frontendSnapshot'
import type {
  CanonicalPlayerCommand,
} from '../../../application/canonicalPlayerCommands'
import arXbCatalog from '../../i18n/catalogs/compiled/ar-XB.json'
import enCatalog from '../../i18n/catalogs/compiled/en.json'
import enXaCatalog from '../../i18n/catalogs/compiled/en-XA.json'
import type {
  SharedMessageCatalog,
} from '../../i18n/catalogs/types'
import type { EnabledLocale } from '../../i18n/localeRegistry'
import { PresentationIntlProvider } from '../../i18n/PresentationIntlProvider'
import type {
  BrowserUiRuntimeFoundation,
  UiRuntimePlayerCommandResult,
} from '../../runtime'
import {
  FIRST_SLICE_COMMIT_PROBE_MARKER,
  type FirstSliceCommitProbeSample,
} from '../../performance/firstSliceCommitProbe'
import { basicFacilityMessages } from '../facilities/messages'
import {
  ProbedReadyDysonRuntimeHost,
  ReadyDysonSlice,
} from './ReadyDysonSlice'

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const compiledCatalogs = {
  en: enCatalog,
  'en-XA': enXaCatalog,
  'ar-XB': arXbCatalog,
} as const

describe('ReadyDysonSlice', () => {
  test('renders fresh authoritative visibility without named hidden cards', () => {
    renderSlice(snapshot())

    expect(
      screen.getByRole('heading', { level: 1, name: 'Bots' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('article', {
        name: /Assembly Lines|AI Managers|Servers/,
      }),
    ).not.toBeInTheDocument()
    expect(screen.queryByText('AI Managers')).not.toBeInTheDocument()
    expect(screen.queryByText('????')).not.toBeInTheDocument()
    expect(
      screen.getByText('Hold anywhere to repeat...'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /repeat/i }),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/^Tip: The tinker panel/)).toBeInTheDocument()
    expect(screen.queryByText(/auto tinker/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/owned/i)).not.toBeInTheDocument()
    expect(screen.getAllByRole('navigation')).toHaveLength(2)
    expect(
      screen.getByRole('slider', { name: 'Bot Distribution' }),
    ).toBeInTheDocument()
  })

  test('uses published visibility even when ownership contradicts it', async () => {
    const hidden = snapshot({
      facilities: {
        assembly_lines: [100, 100],
        ai_managers: [100, 100],
      },
      visibleBasicFacilityIds: [],
    })
    const { rerender } = renderSlice(hidden)
    expect(screen.queryByRole('article')).not.toBeInTheDocument()

    rerender(
      provider(
        <ReadyDysonSlice
          snapshot={snapshot({
            facilities: {
              assembly_lines: [0, 0],
              ai_managers: [0, 0],
            },
            visibleBasicFacilityIds: [
              'assembly_lines',
              'ai_managers',
            ],
          })}
          locale="en"
          dispatchPlayer={acceptedDispatch}
        />,
      ),
    )
    expect(
      await screen.findByRole('article', {
        name: 'Assembly Lines 0(0)',
      }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('article', {
        name: 'AI Managers 0(0)',
      }),
    ).toBeInTheDocument()
  })

  test('omits the teaser when the authoritative fact is false with no visible facilities', () => {
    renderSlice(snapshot({ showNextTierTeaser: false }))

    expect(screen.queryByText('????')).not.toBeInTheDocument()
    expect(screen.getByRole('region', {
      name: 'Facilities',
    })).toBeEmptyDOMElement()
  })

  test('maps current resources and producer output rates exactly', async () => {
    renderSlice(
      snapshot({
        visibleBasicFacilityIds: [
          'assembly_lines',
          'ai_managers',
          'servers',
          'data_centers',
          'planets',
        ],
      }),
    )

    const resourceSummary = screen.getByRole('region', {
      name: 'Resources',
    })
    expect(resourceSummary).toHaveTextContent('Cash$123$11 /s')
    expect(resourceSummary).toHaveTextContent('Total Bots456')
    expect(resourceSummary).toHaveTextContent('Science78922 /s')
    expect(
      screen.getByRole('region', { name: 'Production summary' }),
    ).toHaveTextContent('1,000 Worker Bots producing 0 Panels /s')
    expect(
      screen.queryByText(/Science Bots producing/),
    ).not.toBeInTheDocument()

    const expected = [
      ['Assembly Lines 5(3)', 'Producing 33 Bots /s'],
      ['AI Managers 9(5)', 'Generating 44 Assembly Lines /s'],
      ['Servers 13(7)', 'Training 55 AI Managers /s'],
      ['Data Centers 17(9)', 'Deploying 66 Servers /s'],
      ['Planets 21(11)', 'Creating 77 Data Centers /s'],
    ] as const
    for (const [name, production] of expected) {
      expect(
        within(
          await screen.findByRole('article', { name }),
        ).getByText(production),
      ).toBeInTheDocument()
    }
  })

  test('routes Tinker, facilities, and distribution through the injected runtime dispatcher', async () => {
    const dispatchPlayer = vi.fn(acceptedDispatch)
    renderSlice(
      snapshot({
        visibleBasicFacilityIds: ['assembly_lines'],
      }),
      dispatchPlayer,
    )

    fireEvent.pointerDown(
      screen.getByRole('button', {
        name:
          /Manually put together a new bot from parts in your shed/,
      }),
      { button: 0, pointerId: 7 },
    )
    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'tinker.start',
      repeat: false,
    })

    const user = userEvent.setup()
    await user.click(
      await screen.findByRole('button', {
        name: /^Purchase an Assembly Line:/,
      }),
    )
    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'dyson.purchase-basic-facility',
      facilityId: 'assembly_lines',
    })

    const distribution = screen.getByRole('slider', {
      name: 'Bot Distribution',
    })
    fireEvent.change(distribution, { target: { value: '75' } })
    fireEvent.pointerUp(distribution, { pointerId: 11 })
    fireEvent.blur(distribution)

    await waitFor(() => {
      expect(dispatchPlayer).toHaveBeenCalledWith({
        kind: 'dyson.set-bot-distribution',
        distribution: 0.75,
      })
    })
    expect(dispatchPlayer).toHaveBeenCalledTimes(3)
  })

  test('keeps Info facts together and routes buy settings through canonical commands', async () => {
    const dispatchPlayer = vi.fn(acceptedDispatch)
    const user = userEvent.setup()
    renderSlice(snapshot(), dispatchPlayer)

    const infoRegion = screen.getByRole('region', { name: 'Info' })
    expect(infoRegion).toHaveTextContent('Goal: Create 10 Bots')
    expect(infoRegion).not.toHaveTextContent('Active panels: 0')
    expect(infoRegion).not.toHaveTextContent('Panel lifetime: 10 seconds')
    expect(infoRegion).not.toHaveTextContent('Total panels decayed: 0')

    await user.click(
      within(infoRegion).getByRole('button', { name: 'Info' }),
    )
    expect(infoRegion).toHaveTextContent('Active panels: 0')
    expect(infoRegion).toHaveTextContent('Panel lifetime: 10 seconds')
    expect(infoRegion).toHaveTextContent('Total panels decayed: 0')

    await user.click(
      within(infoRegion).getByRole('button', {
        name: 'Purchase settings',
      }),
    )
    expect(
      within(infoRegion).getByRole('button', { name: 'x1' }),
    ).toHaveAttribute('aria-pressed', 'true')

    await user.click(
      within(infoRegion).getByRole('button', { name: 'x10' }),
    )
    await user.click(
      within(infoRegion).getByRole('checkbox', {
        name: 'Round bulk purchases to the next milestone',
      }),
    )

    await waitFor(() => {
      expect(dispatchPlayer).toHaveBeenCalledWith({
        kind: 'dyson.set-buy-mode',
        buyMode: 'buy-10',
      })
      expect(dispatchPlayer).toHaveBeenCalledWith({
        kind: 'dyson.set-rounded-bulk-buy',
        enabled: true,
      })
    })
    expect(dispatchPlayer).toHaveBeenCalledTimes(2)
  })

  test('does not create commands or active-time work while merely rendered', () => {
    vi.useFakeTimers()
    const dispatchPlayer = vi.fn(acceptedDispatch)
    renderSlice(snapshot(), dispatchPlayer)

    vi.advanceTimersByTime(60_000)
    expect(dispatchPlayer).not.toHaveBeenCalled()
    vi.useRealTimers()
  })

  test('performance host records one exact sample for one committed revision under StrictMode', () => {
    const samples: FirstSliceCommitProbeSample[] = []
    vi.stubGlobal(FIRST_SLICE_COMMIT_PROBE_MARKER, {
      record(sample: FirstSliceCommitProbeSample) {
        samples.push(sample)
      },
    })
    let current: ReadySnapshot = snapshot()
    const listeners = new Set<() => void>()
    const runtime = {
      snapshot: () => current,
      subscribeSnapshot(listener: () => void) {
        listeners.add(listener)
        return () => listeners.delete(listener)
      },
      dispatchPlayer: vi.fn(acceptedDispatch),
    } as unknown as BrowserUiRuntimeFoundation
    const view = render(
      provider(
        <StrictMode>
          <ProbedReadyDysonRuntimeHost
            runtime={runtime}
            locale="en"
          />
        </StrictMode>,
      ),
    )

    expect(samples).toEqual([])
    act(() => {
      current = {
        ...current,
        revision: {
          ...current.revision,
          state: current.revision.state + 1,
        },
      }
      for (const listener of listeners) listener()
    })
    expect(samples).toHaveLength(1)
    expect(samples[0]).toMatchObject({
      revision: { session: 1, state: 2 },
    })

    view.rerender(
      provider(
        <StrictMode>
          <ProbedReadyDysonRuntimeHost
            runtime={runtime}
            locale="en"
          />
        </StrictMode>,
      ),
    )
    expect(samples).toHaveLength(1)
  })

  test('keeps active-time and gameplay-rule authorities out of the composition source', () => {
    const source = readFileSync(
      resolve(
        process.cwd(),
        'src/ui/gameplay/dyson/ReadyDysonSlice.tsx',
      ),
      'utf8',
    )
    for (const forbidden of [
      'advanceActive',
      'advanceAway',
      'requestAnimationFrame',
      'setInterval',
      'LifecycleCoordinator',
      'canonicalGameCommands',
      'canonicalDysonDerivation',
    ]) {
      expect(source).not.toContain(forbidden)
    }
  })

  test('renders the expanded LTR pseudo-locale across the full playable slice', async () => {
    const { container, intlErrors } = renderSlice(
      snapshot({
        visibleBasicFacilityIds: ['assembly_lines'],
      }),
      acceptedDispatch,
      'en-XA',
    )

    await screen.findByRole('article')
    const shell = container.querySelector('.dyson-shell')
    const route = screen.getByRole('heading', { level: 1 })
    expect(shell).toHaveAttribute('dir', 'ltr')
    expect(route).not.toHaveTextContent(/^Bots$/)
    expect(route.textContent?.length).toBeGreaterThan('Bots'.length)
    expect(screen.getByRole('slider')).toBeInTheDocument()
    expect(screen.queryByText(/\?\?\?\?/)).not.toBeInTheDocument()
    expect(intlErrors).toEqual([])
  })

  test('mirrors the full slice in RTL without changing canonical source order', async () => {
    const { container, intlErrors } = renderSlice(
      snapshot({
        visibleBasicFacilityIds: [
          'assembly_lines',
          'ai_managers',
        ],
      }),
      acceptedDispatch,
      'ar-XB',
    )

    await screen.findAllByRole('article')
    const expectedIdentityErrors: unknown[] = []
    const intl = createIntl(
      {
        locale: 'ar-XB',
        messages: arXbCatalog,
        onError: (error) => expectedIdentityErrors.push(error),
      },
      createIntlCache(),
    )
    const expectedAssemblyIdentity = intl.formatMessage(
      basicFacilityMessages.assemblyLinesIdentity,
      { total: '5', manual: '3' },
    )
    const expectedManagerIdentity = intl.formatMessage(
      basicFacilityMessages.aiManagersIdentity,
      { total: '9', manual: '5' },
    )
    const shell = container.querySelector('.dyson-shell')
    const resources = container.querySelector('.dyson-resource-header')
    const resourceItems = Array.from(
      container.querySelectorAll('[data-resource]'),
      (item) => item.getAttribute('data-resource'),
    )
    const facilities = screen.getAllByRole('article')
    expect(shell).toHaveAttribute('dir', 'rtl')
    expect(resources).toHaveAttribute('dir', 'ltr')
    expect(
      Array.from(
        container.querySelectorAll('[data-resource]'),
        (item) => item.getAttribute('dir'),
      ),
    ).toEqual(['rtl', 'rtl', 'rtl'])
    expect(resourceItems).toEqual(['cash', 'total-bots', 'science'])
    expect(facilities).toHaveLength(2)
    expect(facilities[0]).toHaveAccessibleName(
      expectedAssemblyIdentity,
    )
    expect(facilities[1]).toHaveAccessibleName(
      expectedManagerIdentity,
    )
    expect(expectedIdentityErrors).toEqual([])
    expect(intlErrors).toEqual([])
  })

  test('keeps keyboard focus in visual and source order through the full slice', async () => {
    const user = userEvent.setup()
    const { container } = renderSlice(
      snapshot({
        visibleBasicFacilityIds: ['assembly_lines'],
      }),
    )

    const purchase = await screen.findByRole('button', {
      name: /^Purchase an Assembly Line:/,
    })
    const resources = Array.from(
      container.querySelectorAll<HTMLElement>(
        '.ui-resource-value__value[tabindex="0"]',
      ),
    )
    const tinker = screen.getByRole('button', {
      name:
        /Manually put together a new bot from parts in your shed/,
    })
    const expected = [
      screen.getByRole('link', { name: 'Skip to game' }),
      ...resources,
      tinker,
      purchase,
    ]
    for (const target of expected) {
      await user.tab()
      expect(target).toHaveFocus()
    }
    expect(
      container.querySelectorAll('[aria-current="page"]'),
    ).toHaveLength(2)
  })

  test.each([
    {
      name: 'English Fresh',
      locale: 'en' as const,
      visibleBasicFacilityIds: [] as const,
    },
    {
      name: 'expanded LTR Assembly',
      locale: 'en-XA' as const,
      visibleBasicFacilityIds: ['assembly_lines'] as const,
    },
    {
      name: 'mirrored RTL later progression',
      locale: 'ar-XB' as const,
      visibleBasicFacilityIds: [
        'assembly_lines',
        'ai_managers',
      ] as const,
    },
  ])('has no automated full-slice accessibility violations in $name', async ({
    locale,
    visibleBasicFacilityIds,
  }) => {
    const { container, intlErrors } = renderSlice(
      snapshot({ visibleBasicFacilityIds }),
      acceptedDispatch,
      locale,
    )
    if (visibleBasicFacilityIds.length > 0) {
      await screen.findAllByRole('article')
    }

    const results = await axe.run(container, {
      rules: {
        // jsdom has no rendered color values. Contrast remains covered by
        // semantic-token tests and real-browser Wave 4 evidence.
        'color-contrast': { enabled: false },
      },
    })
    expect(results.violations).toEqual([])
    expect(intlErrors).toEqual([])
  })
})

type ReadySnapshot = Extract<
  FrontendApplicationSnapshot,
  { readonly phase: 'ready' }
>

type FacilityId =
  ReadySnapshot['gameplay']['visibility']['dyson']['visibleBasicFacilityIds'][number]

interface SnapshotOptions {
  readonly visibleBasicFacilityIds?: readonly FacilityId[]
  readonly showNextTierTeaser?: boolean
  readonly facilities?: Partial<
    Record<FacilityId, readonly [number, number]>
  >
}

function snapshot(options: SnapshotOptions = {}): ReadySnapshot {
  const facilities = {
    assembly_lines: [2, 3],
    ai_managers: [4, 5],
    servers: [6, 7],
    data_centers: [8, 9],
    planets: [10, 11],
    matrioshka_brains: [0, 0],
    birch_planets: [0, 0],
    galactic_brains: [0, 0],
    ...options.facilities,
  }
  const basicFacilities = [
    'assembly_lines',
    'ai_managers',
    'servers',
    'data_centers',
    'planets',
  ].map((facilityId) => ({
    facilityId,
    eligible: true,
    selectedQuantity: 1n,
    affordableQuantity: 1n,
    cost: 10,
    status: 'purchased',
  }))

  return {
    version: 1,
    phase: 'ready',
    source: 'primary',
    revision: { session: 1, state: 1, durable: 1 },
    checkpoint: { kind: 'clean', durableRevision: 1 },
    operation: { kind: 'none' },
    gameplay: {
      resources: {
        dyson: {
          money: 123,
          science: 789,
          bots: 456,
          workers: 1000,
          researchers: 2000,
        },
      },
      progression: {
        dyson: {
          facilities,
          totalPanelsDecayed: 0,
          botDistribution: 0,
          automation: {
            buyMode: 'buy-1',
            roundedBulkBuy: false,
          },
        },
        quantum: {
          unlocks: {
            botMultitasking: false,
          },
        },
      },
      derived: {
        dyson: {
          status: 'ready',
          value: {
            globals: {
              moneyMultiplier: 1,
              scienceMultiplier: 1,
              panelsPerSecond: 0,
              panelLifetimeSeconds: 10,
            },
            presentation: {
              activePanelMetric: {
                kind: 'active-panels',
                value: 0,
              },
              currentGoal: {
                kind: 'create-bots',
                target: 10,
              },
            },
            rates: {
              money: 11,
              science: 22,
              panels: 0,
              bots: 33,
              assembly_lines: 44,
              ai_managers: 55,
              servers: 66,
              data_centers: 77,
              planets: 88,
            },
          },
        },
        dysonBotDistribution: {
          workersFraction: 1,
          scientistsFraction: 0,
        },
      },
      visibility: {
        dyson: {
          showTinker: true,
          visibleBasicFacilityIds:
            options.visibleBasicFacilityIds ?? [],
          showNextTierTeaser:
            options.showNextTierTeaser ?? true,
        },
      },
      runtime: {
        tinker: {
          status: 'ready',
          value: {
            runtime: {
              running: false,
              repeat: false,
              elapsedSeconds: 0,
              effectiveManualLabour: false,
              cooldownSeconds: 0.2,
            },
            stats: {
              botYield: 1,
              assemblyYield: 0,
              cooldownSeconds: 0.2,
            },
            presentationMode: 'default',
            canStart: true,
            eligibility: 'available',
            timeToCompletionSeconds: null,
          },
        },
      },
      commands: {
        byKind: {
          'dyson.purchase-basic-facility': {
            routeAvailable: true,
          },
          'dyson.set-bot-distribution': {
            routeAvailable: true,
          },
          'dyson.set-buy-mode': {
            routeAvailable: true,
          },
          'dyson.set-rounded-bulk-buy': {
            routeAvailable: true,
          },
        },
      },
      previews: {
        dyson: { basicFacilities },
      },
    },
  } as unknown as ReadySnapshot
}

function renderSlice(
  value: ReadySnapshot,
  dispatchPlayer = acceptedDispatch,
  locale: EnabledLocale = 'en',
) {
  const intlErrors: unknown[] = []
  const rendered = render(
    provider(
      <ReadyDysonSlice
        snapshot={value}
        locale={locale}
        dispatchPlayer={dispatchPlayer}
      />,
      locale,
      (error) => intlErrors.push(error),
    ),
  )
  return { ...rendered, intlErrors }
}

function provider(
  node: React.ReactNode,
  locale: EnabledLocale = 'en',
  onError: (error: unknown) => void = (error) => {
    throw error
  },
) {
  return (
    <PresentationIntlProvider
      locale={locale}
      messages={
        compiledCatalogs[locale] as unknown as SharedMessageCatalog
      }
      onError={onError}
    >
      {node}
    </PresentationIntlProvider>
  )
}

async function acceptedDispatch(
  command: CanonicalPlayerCommand,
): Promise<UiRuntimePlayerCommandResult> {
  return {
    status: 'accepted',
    kind: 'transition',
    changed: command.kind.length > 0,
    activationRevision: { session: 1, state: 1 },
    stateRevision: 2,
  }
}
