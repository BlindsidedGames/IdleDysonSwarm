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
import type { ReleasePlatformServices } from '../../../platform/releaseFoundation'
import {
  CANONICAL_STORE_PRODUCTS,
  type HostEntitlementOwnership,
} from '../../../store/contracts'
import {
  FIRST_SLICE_COMMIT_PROBE_MARKER,
  type FirstSliceCommitProbeSample,
} from '../../performance/firstSliceCommitProbe'
import { basicFacilityMessages } from '../facilities/messages'
import { navigationAssets } from '../shell'
import {
  ProbedReadyDysonRuntimeHost,
  ReadyDysonSlice,
  SWARM_VISUALIZATION_STORAGE_KEY,
} from './ReadyDysonSlice'

afterEach(() => {
  cleanup()
  localStorage.clear()
  vi.unstubAllGlobals()
})

const compiledCatalogs = {
  en: enCatalog,
  'en-XA': enXaCatalog,
  'ar-XB': arXbCatalog,
} as const

describe('ReadyDysonSlice', () => {
  test('renders fresh authoritative visibility without named hidden cards', async () => {
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
    expect(await screen.findByText('????')).toBeInTheDocument()
    expect(
      screen.getByText('Hold anywhere to repeat...'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: /repeat/i }),
    ).not.toBeInTheDocument()
    expect(screen.getByText(/^Tip: The tinker panel/)).toBeInTheDocument()
    expect(screen.queryByText(/auto tinker/i)).not.toBeInTheDocument()
    expect(screen.queryByText(/owned/i)).not.toBeInTheDocument()
    expect(screen.getAllByRole('navigation')).toHaveLength(1)
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
        name: 'Assembly Lines 0.00(0.00)',
      }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('article', {
        name: 'AI Managers 0.00(0.00)',
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
    expect(resourceSummary).toHaveTextContent('Cash$123$11.0 /s')
    expect(resourceSummary).toHaveTextContent('Total Bots456')
    expect(resourceSummary).toHaveTextContent('Science78922.0 /s')
    expect(
      screen.getByRole('region', { name: 'Production summary' }),
    ).toHaveTextContent('1.00K Worker Bots producing 0.00 Panels /s')
    expect(
      screen.queryByText(/Science Bots producing/),
    ).not.toBeInTheDocument()

    const expected = [
      ['Assembly Lines 5.00(3.00)', 'Producing 33.0 Bots /s'],
      ['AI Managers 9.00(5.00)', 'Generating 44.0 Assembly Lines /s'],
      ['Servers 13.0(7.00)', 'Training 55.0 AI Managers /s'],
      ['Data Centers 17.0(9.00)', 'Deploying 66.0 Servers /s'],
      ['Planets 21.0(11.0)', 'Creating 77.0 Data Centers /s'],
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

  test('switches to the green Settings route without unmounting the ready game host', async () => {
    const user = userEvent.setup()
    const onRouteChange = vi.fn()
    render(
      provider(
        <ReadyDysonSlice
          snapshot={snapshot()}
          locale="en"
          dispatchPlayer={acceptedDispatch}
          route="settings"
          onRouteChange={onRouteChange}
        />,
      ),
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'Settings' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('heading', { level: 2, name: 'Settings' }),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByText('Tinker in your garage'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('slider', { name: 'Bot Distribution' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Bots' }))
    expect(onRouteChange).toHaveBeenCalledWith('bots')
  })

  test('enables the dedicated Debug Options page for development runtimes', () => {
    render(
      provider(
        <ReadyDysonSlice
          snapshot={snapshot()}
          locale="en"
          dispatchPlayer={acceptedDispatch}
          route="debug"
          development={{
            status: () => ({ enabled: true, entitled: true, quantumShards: 0n, strangeMatter: 0n }),
            setDysonBots: vi.fn(),
            unlockReality: vi.fn(),
            apply: vi.fn(),
            simulateOfflineTime: vi.fn(),
          }}
        />,
      ),
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'Debug Options' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('combobox', { name: 'Bot count' }),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Save data'),
    ).not.toBeInTheDocument()
  })

  test('switches to the teal Research route and renders canonical cards', async () => {
    const user = userEvent.setup()
    const onRouteChange = vi.fn()
    const dispatchPlayer = vi.fn(acceptedDispatch)
    render(
      provider(
        <ReadyDysonSlice
          snapshot={snapshot()}
          locale="en"
          dispatchPlayer={dispatchPlayer}
          route="research"
          onRouteChange={onRouteChange}
        />,
      ),
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'Research' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('article', {
        name: 'Assembly Line boosts 0.00',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('Tinker in your garage'),
    ).not.toBeInTheDocument()

    const distribution = screen.getByRole('slider', {
      name: 'Bot Distribution',
    })
    expect(distribution).toBeInTheDocument()
    fireEvent.change(distribution, { target: { value: '75' } })
    fireEvent.pointerUp(distribution, { pointerId: 17 })
    fireEvent.blur(distribution)
    await waitFor(() => {
      expect(dispatchPlayer).toHaveBeenCalledWith({
        kind: 'dyson.set-bot-distribution',
        distribution: 0.75,
      })
    })

    await user.click(screen.getByRole('button', { name: 'Bots' }))
    expect(onRouteChange).toHaveBeenCalledWith('bots')
  })

  test('applies a configured preset once when its gameplay tab opens', async () => {
    const dispatchPlayer = vi.fn(acceptedDispatch)
    const rendered = render(
      provider(
        <ReadyDysonSlice
          snapshot={snapshot({ researchPresetAutomation: 2 })}
          locale="en"
          dispatchPlayer={dispatchPlayer}
          route="research"
        />,
      ),
    )

    await waitFor(() => {
      expect(dispatchPlayer).toHaveBeenCalledWith({
        kind: 'skill.apply-tab-preset-automation',
        tab: 'research',
      })
    })
    expect(dispatchPlayer).toHaveBeenCalledTimes(1)

    rendered.rerender(
      provider(
        <ReadyDysonSlice
          snapshot={snapshot({ researchPresetAutomation: 2 })}
          locale="en"
          dispatchPlayer={dispatchPlayer}
          route="research"
        />,
      ),
    )
    expect(dispatchPlayer).toHaveBeenCalledTimes(1)
  })

  test('switches to the authored Skills tree only when canonical visibility unlocks it', async () => {
    render(
      provider(
        <ReadyDysonSlice
          snapshot={snapshot({ skillsRouteUnlocked: true })}
          locale="en"
          dispatchPlayer={acceptedDispatch}
          route="skills"
        />,
      ),
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'Skills' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByRole('button', {
        name: 'Cash & Science. Cost: 1 Skill Points',
      }),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('slider', { name: 'Bot Distribution' }),
    ).not.toBeInTheDocument()
  })

  test('opens Infinity only when canonical visibility unlocks it', async () => {
    const onRouteChange = vi.fn()
    const user = userEvent.setup()
    const rendered = render(
      provider(
        <ReadyDysonSlice
          snapshot={snapshot()}
          locale="en"
          dispatchPlayer={acceptedDispatch}
          onRouteChange={onRouteChange}
        />,
      ),
    )

    expect(
      screen.getByRole('button', { name: 'Infinity' }),
    ).toBeDisabled()

    rendered.rerender(
      provider(
        <ReadyDysonSlice
          snapshot={snapshot({ infinityRouteUnlocked: true })}
          locale="en"
          dispatchPlayer={acceptedDispatch}
          route="infinity"
          onRouteChange={onRouteChange}
        />,
      ),
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'Infinity' }),
    ).toBeInTheDocument()
    expect(
      await screen.findByText('Infinity Points:'),
    ).toBeInTheDocument()
    expect(
      screen.queryByRole('slider', { name: 'Bot Distribution' }),
    ).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Bots' }))
    expect(onRouteChange).toHaveBeenCalledWith('bots')
  })

  test('shows Reality unlock progress, guards stale routes, and renders when unlocked', async () => {
    const onRouteChange = vi.fn()
    const rendered = render(
      provider(
        <ReadyDysonSlice
          snapshot={snapshot({
            realityRouteVisible: true,
            realitySecrets: 13n,
          })}
          locale="en"
          dispatchPlayer={acceptedDispatch}
          route="reality"
          onRouteChange={onRouteChange}
        />,
      ),
    )

    expect(
      screen.getAllByRole('button', {
        name: 'Reality, 13.0 of 27.0 Secrets of the Universe',
      })[0],
    ).toBeDisabled()
    await waitFor(() => {
      expect(onRouteChange).toHaveBeenCalledWith('bots')
    })

    rendered.rerender(
      provider(
        <ReadyDysonSlice
          snapshot={snapshot({
            realityRouteVisible: true,
            realityRouteUnlocked: true,
            realitySecrets: 27n,
          })}
          locale="en"
          dispatchPlayer={acceptedDispatch}
          route="reality"
          onRouteChange={onRouteChange}
        />,
      ),
    )

    expect(
      await screen.findByText('Universe Designation: 4'),
    ).toBeInTheDocument()
    expect(
      rendered.container.querySelector('.dyson-resource-header'),
    ).not.toBeInTheDocument()
    const user = userEvent.setup()
    await user.click(
      screen.getByRole('button', { name: 'Reality Upgrades' }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Anomaly' }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Translation' }),
    )
    expect(screen.getByText('Translation I')).toBeInTheDocument()
  })

  test('hides the shared resource header on Simulations', async () => {
    const rendered = render(
      provider(
        <ReadyDysonSlice
          snapshot={snapshot({
            realityRouteVisible: true,
            realityRouteUnlocked: true,
          })}
          locale="en"
          dispatchPlayer={acceptedDispatch}
          route="simulations"
        />,
      ),
    )

    await waitFor(() => {
      expect(
        rendered.container.querySelector('.simulations-surface'),
      ).toBeInTheDocument()
    })
    expect(
      rendered.container.querySelector('.dyson-resource-header'),
    ).not.toBeInTheDocument()
  })

  test('reveals locked Quantum progress at one IP and opens the route at 42 IP', async () => {
    const onRouteChange = vi.fn()
    const rendered = render(
      provider(
        <ReadyDysonSlice
          snapshot={snapshot({ infinityPoints: 1n })}
          locale="en"
          dispatchPlayer={acceptedDispatch}
          route="quantum"
          onRouteChange={onRouteChange}
        />,
      ),
    )

    expect(
      screen.getAllByRole('button', {
        name: 'Quantum, 1.00 of 42.0 Infinity Points',
      })[0],
    ).toBeDisabled()
    await waitFor(() => {
      expect(onRouteChange).toHaveBeenCalledWith('bots')
    })

    rendered.rerender(
      provider(
        <ReadyDysonSlice
          snapshot={snapshot({ infinityPoints: 42n })}
          locale="en"
          dispatchPlayer={acceptedDispatch}
          route="quantum"
          onRouteChange={onRouteChange}
        />,
      ),
    )

    expect(
      screen.getByRole('heading', { level: 1, name: 'Quantum' }),
    ).toBeInTheDocument()
    expect(await screen.findByText('Quantum Shards')).toBeInTheDocument()
    expect(
      screen.getAllByRole('region', { name: 'Quantum' }),
    ).toHaveLength(1)
    expect(
      screen.queryByRole('heading', { level: 2, name: 'Quantum' }),
    ).not.toBeInTheDocument()
    expect(rendered.container.querySelector('.dyson-shell')).toHaveAttribute(
      'data-route-theme',
      'quantum',
    )
  })

  test('keeps Avocato subordinate to Quantum and exposes it through Reality', async () => {
    const user = userEvent.setup()
    const onRouteChange = vi.fn()
    const rendered = render(
      provider(
        <ReadyDysonSlice
          snapshot={snapshot({
            quantumPoints: 1n,
            avocatoUnlocked: true,
            realityRouteVisible: true,
            realityRouteUnlocked: true,
          })}
          locale="en"
          dispatchPlayer={acceptedDispatch}
          route="reality"
          onRouteChange={onRouteChange}
        />,
      ),
    )

    expect(
      screen.queryByRole('button', { name: 'Avocato' }),
    ).not.toBeInTheDocument()
    await user.click(
      await screen.findByRole('button', { name: 'Visit Avocato' }),
    )
    expect(onRouteChange).toHaveBeenCalledWith('avocato')

    rendered.rerender(
      provider(
        <ReadyDysonSlice
          snapshot={snapshot({
            quantumPoints: 1n,
            avocatoUnlocked: true,
          })}
          locale="en"
          dispatchPlayer={acceptedDispatch}
          route="avocato"
          onRouteChange={onRouteChange}
        />,
      ),
    )
    expect(
      await screen.findByRole('region', { name: 'Avocato' }),
    ).toBeInTheDocument()
    expect(
      rendered.container.querySelector('.avocato-meditation'),
    ).not.toBeInTheDocument()
    expect(
      screen.getAllByRole('heading', { level: 1, name: 'Avocato' }),
    ).toHaveLength(1)
    expect(
      screen.queryByRole('heading', { level: 2, name: 'Avocato' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getAllByRole('region', { name: 'Avocato' }),
    ).toHaveLength(1)
    expect(
      screen.queryByText('Total boost to Cash, Science, and Buildings'),
    ).not.toBeInTheDocument()
  })

  test.each([
    ['quantum', 0, { quantumPoints: 1n }],
    ['infinity', 1, { infinityRouteUnlocked: true }],
    ['bots', 2, {}],
    ['skills', 3, { skillsRouteUnlocked: true }],
    ['settings', 4, {}],
    ['research', 5, {}],
  ] as const)(
    'mounts the %s route target only for Avocato meditation secret %i',
    async (route, secretStep, routeOptions) => {
      const dispatchPlayer = vi.fn(acceptedDispatch)
      const rendered = render(
        provider(
          <ReadyDysonSlice
            snapshot={snapshot({ ...routeOptions, secretStep })}
            locale="en"
            dispatchPlayer={dispatchPlayer}
            route={route}
          />,
        ),
      )

      if (route === 'skills') {
        fireEvent.click(
          await screen.findByRole('button', {
            name: 'Skill presets and reset',
          }),
        )
      }
      if (route === 'research') {
        fireEvent.click(
          await screen.findByRole('button', {
            name: 'Research purchase settings',
          }),
        )
      }
      const trigger = await waitFor(() => {
        const target = rendered.container.querySelector(
          `[data-avocato-secret-step="${secretStep}"]`,
        )
        expect(target).not.toBeNull()
        return target as HTMLElement
      })
      expect(trigger).toHaveAttribute(
        'data-avocato-secret-step',
        String(secretStep),
      )
      expect(trigger).toHaveAttribute('data-avotation-target', route)
      expect(
        rendered.container.querySelectorAll(
          '[data-avocato-secret-step]',
        ),
      ).toHaveLength(1)
      fireEvent.click(trigger)
      expect(dispatchPlayer).toHaveBeenCalledWith({
        kind: 'avocado.complete-meditation-step',
        requiredStepIndex: secretStep,
      })
    },
  )

  test('shows the Store route only when native host services are injected', async () => {
    const browserRouteChange = vi.fn()
    const browser = render(
      provider(
        <ReadyDysonSlice
          snapshot={snapshot()}
          locale="en"
          dispatchPlayer={acceptedDispatch}
          route="store"
          onRouteChange={browserRouteChange}
          releasePlatformServices={platformServices('browser')}
        />,
      ),
    )
    expect(
      browser.container.querySelector('[data-navigation-id="store"]'),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Bots' }),
    ).toBeInTheDocument()
    expect(browserRouteChange).toHaveBeenCalledWith('bots')
    cleanup()

    const native = render(
      provider(
        <ReadyDysonSlice
          snapshot={snapshot()}
          locale="en"
          dispatchPlayer={acceptedDispatch}
          route="store"
          releasePlatformServices={platformServices('desktop-native')}
        />,
      ),
    )
    await waitFor(() => {
      expect(native.container.querySelector('.store-surface'))
        .toBeInTheDocument()
    })
    expect(
      native.container.querySelector('[data-navigation-id="store"]'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Store' }),
    ).toBeInTheDocument()
  })

  test('keeps optional pages in the menu while respecting shortcut preferences', () => {
    const { container } = renderSlice(
      snapshot({
        navigationVisibility: {
          story: false,
          wiki: true,
          statistics: false,
        },
      }),
    )
    const drawer = container.querySelector('[data-placement="drawer"]')
    const bottom = container.querySelector('[data-placement="bottom"]')

    expect(drawer?.querySelector('[data-navigation-id="story"]')).not.toBeNull()
    expect(drawer?.querySelector('[data-navigation-id="wiki"]')).not.toBeNull()
    expect(drawer?.querySelector('[data-navigation-id="statistics"]')).not.toBeNull()
    expect(bottom?.querySelector('[data-navigation-id="story"]')).toBeNull()
    expect(bottom?.querySelector('[data-navigation-id="wiki"]')).not.toBeNull()
    expect(bottom?.querySelector('[data-navigation-id="statistics"]')).toBeNull()
  })

  test('mounts the seventh Avocato meditation secret in the persistent side area', async () => {
    const rendered = render(
      provider(
        <ReadyDysonSlice
          snapshot={snapshot({ secretStep: 6 })}
          locale="en"
          dispatchPlayer={acceptedDispatch}
          route="bots"
        />,
      ),
    )

    const trigger = await waitFor(() => {
      const target = rendered.container.querySelector(
        '[data-avocato-secret-step="6"]',
      )
      expect(target).not.toBeNull()
      return target as HTMLElement
    })
    expect(trigger).toHaveAttribute('data-avotation-target', 'side')
    expect(trigger).toHaveAttribute('data-avocato-secret-step', '6')
    expect(
      rendered.container.querySelectorAll('[data-avocato-secret-step]'),
    ).toHaveLength(1)
  })

  test('keeps out-of-order panels inert and marks completed discoveries', async () => {
    const rendered = render(
      provider(
        <ReadyDysonSlice
          snapshot={snapshot({ secretStep: 0 })}
          locale="en"
          dispatchPlayer={acceptedDispatch}
          route="bots"
        />,
      ),
    )
    expect(
      rendered.container.querySelector('[data-avocato-secret-step]'),
    ).not.toBeInTheDocument()
    expect(
      rendered.container.querySelector('[data-avotation-found-marker]'),
    ).not.toBeInTheDocument()

    rendered.rerender(
      provider(
        <ReadyDysonSlice
          snapshot={snapshot({ secretStep: 6, secretCompleted: true })}
          locale="en"
          dispatchPlayer={acceptedDispatch}
          route="bots"
        />,
      ),
    )
    expect(
      rendered.container.querySelector('[data-avocato-secret-step]'),
    ).not.toBeInTheDocument()
    await waitFor(() => {
      expect(
        rendered.container.querySelectorAll('[data-avotation-found-marker]'),
      ).toHaveLength(2)
    })
  })

  test.each([
    ['offline-time', 'Offline Time', '.offline-time-surface'],
    ['statistics', 'Statistics', '.statistics-surface'],
    ['story', 'Story', '.story-surface'],
    ['wiki', 'Wiki', '.wiki-surface'],
  ] as const)(
    'opens the globally available %s destination',
    async (route, heading, selector) => {
      const rendered = render(
        provider(
          <ReadyDysonSlice
            snapshot={snapshot()}
            locale="en"
            dispatchPlayer={acceptedDispatch}
            route={route}
          />,
        ),
      )

      await waitFor(() => {
        expect(rendered.container.querySelector(selector)).toBeInTheDocument()
      })
      expect(
        screen.getAllByRole('heading', { level: 1, name: heading }),
      ).toHaveLength(1)
      expect(
        screen.queryByRole('heading', { level: 2, name: heading }),
      ).not.toBeInTheDocument()
      expect(
        screen.getAllByRole('region', { name: heading }),
      ).toHaveLength(1)
      expect(rendered.container.querySelector('.dyson-shell')).toHaveAttribute(
        'data-route-theme',
        route,
      )
    },
  )

  test('uses dedicated full-size navigation artwork for new routes', () => {
    const rendered = render(
      provider(
        <ReadyDysonSlice
          snapshot={snapshot({ infinityPoints: 42n })}
          locale="en"
          dispatchPlayer={acceptedDispatch}
          development={{
            status: () => ({ enabled: true, entitled: true, quantumShards: 0n, strangeMatter: 0n }),
            setDysonBots: vi.fn(),
            unlockReality: vi.fn(),
            apply: vi.fn(),
            simulateOfflineTime: vi.fn(),
          }}
        />,
      ),
    )
    const drawer = rendered.container.querySelector('[data-placement="drawer"]')
    expect(drawer).not.toBeNull()
    const expectedIcons = [
      ['quantum', navigationAssets.quantum],
      ['statistics', navigationAssets.statistics],
      ['debug', navigationAssets.debug],
    ] as const
    for (const [route, source] of expectedIcons) {
      expect(
        drawer?.querySelector(
          `[data-navigation-id="${route}"] img`,
        ),
      ).toHaveAttribute('src', source)
    }
  })

  test('persists the visualization toggle and reclaims its playfield row', async () => {
    const user = userEvent.setup()
    const rendered = render(
      provider(
        <ReadyDysonSlice
          snapshot={snapshot()}
          locale="en"
          dispatchPlayer={acceptedDispatch}
          route="settings"
        />,
      ),
    )

    await user.click(
      screen.getByRole('checkbox', {
        name: 'Show visualization',
      }),
    )
    expect(
      localStorage.getItem(SWARM_VISUALIZATION_STORAGE_KEY),
    ).toBe('hidden')

    rendered.rerender(
      provider(
        <ReadyDysonSlice
          snapshot={snapshot()}
          locale="en"
          dispatchPlayer={acceptedDispatch}
          route="bots"
        />,
      ),
    )
    expect(
      rendered.container.querySelector('.dyson-swarm-visual'),
    ).not.toBeInTheDocument()
    expect(
      rendered.container.querySelector('.dyson-shell__playfield'),
    ).toHaveAttribute('data-has-swarm', 'false')
  })

  test('shows the compact Bots facts and expands canonical purchase settings', async () => {
    const dispatchPlayer = vi.fn(acceptedDispatch)
    const user = userEvent.setup()
    renderSlice(
      snapshot({
        botsAutomationUnlocked: true,
        visibleBasicFacilityIds: ['assembly_lines', 'ai_managers'],
        enabledFacilities: {
          assembly_lines: true,
          ai_managers: false,
        },
      }),
      dispatchPlayer,
    )

    const infoRegion = screen.getByRole('region', { name: 'Info' })
    expect(infoRegion).toHaveTextContent('Active: 0.00')
    expect(infoRegion).toHaveTextContent('Lifetime: 10.0s')
    expect(infoRegion).toHaveTextContent('Decayed: 0.00')
    expect(infoRegion).toHaveTextContent('Goal: 10.0 Bots')
    expect(
      within(infoRegion).queryByRole('button', { name: 'Info' }),
    ).not.toBeInTheDocument()
    expect(
      within(infoRegion).queryByRole('button', { name: 'x1' }),
    ).not.toBeInTheDocument()

    const settingsToggle = within(infoRegion).getByRole('button', {
      name: 'Purchase settings',
    })
    expect(
      settingsToggle.querySelector('[data-symbol="settings"]'),
    ).toBeInTheDocument()
    expect(settingsToggle).not.toHaveTextContent('⚙')
    await user.click(settingsToggle)
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
    await user.click(
      within(infoRegion).getByRole('button', { name: 'Toggle All' }),
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
      expect(dispatchPlayer).toHaveBeenCalledWith({
        kind: 'dyson.set-facility-automation',
        facilityId: 'assembly_lines',
        enabled: true,
      })
      expect(dispatchPlayer).toHaveBeenCalledWith({
        kind: 'dyson.set-facility-automation',
        facilityId: 'ai_managers',
        enabled: true,
      })
    })
    expect(dispatchPlayer).toHaveBeenCalledTimes(4)
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
    expect(screen.getByText(/\?\?\?\?/)).toBeInTheDocument()
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
      { total: '5.00', manual: '3.00' },
    )
    const expectedManagerIdentity = intl.formatMessage(
      basicFacilityMessages.aiManagersIdentity,
      { total: '9.00', manual: '5.00' },
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
    const details = screen.getByRole('button', { name: 'Details' })
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
      purchase,
      details,
      tinker,
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
  readonly skillsRouteUnlocked?: boolean
  readonly infinityRouteUnlocked?: boolean
  readonly realityRouteVisible?: boolean
  readonly realityRouteUnlocked?: boolean
  readonly realitySecrets?: bigint
  readonly infinityPoints?: bigint
  readonly quantumPoints?: bigint
  readonly avocatoUnlocked?: boolean
  readonly avocatoEntryVisible?: boolean
  readonly navigationVisibility?: {
    readonly story: boolean
    readonly wiki: boolean
    readonly statistics: boolean
  }
  readonly secretStep?: number
  readonly secretCompleted?: boolean
  readonly botsPresetAutomation?: 0 | 1 | 2 | 3 | 4 | 5
  readonly researchPresetAutomation?: 0 | 1 | 2 | 3 | 4 | 5
  readonly botsAutomationUnlocked?: boolean
  readonly researchAutomationUnlocked?: boolean
  readonly enabledFacilities?: Partial<Record<FacilityId, boolean>>
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
  const productionRates = {
    assembly_lines: 33,
    ai_managers: 44,
    servers: 55,
    data_centers: 66,
    planets: 77,
  } as const
  const outputFacilities = {
    assembly_lines: 'bots',
    ai_managers: 'assembly_lines',
    servers: 'ai_managers',
    data_centers: 'servers',
    planets: 'data_centers',
  } as const
  const facilityFacts = Object.fromEntries(
    Object.keys(productionRates).map((facilityId) => {
      const typedFacilityId =
        facilityId as keyof typeof productionRates
      const [automatic, manual] = facilities[typedFacilityId]
      const perSecond = productionRates[typedFacilityId]
      return [
        typedFacilityId,
        {
          facilityId: typedFacilityId,
          ownership: {
            automatic,
            manual,
            total: automatic + manual,
          },
          production: {
            outputFacilityId: outputFacilities[typedFacilityId],
            perSecond,
            secondsPerUnit: 1 / perSecond,
          },
          productionProgress: {
            visible: true,
            normalized: 0.25,
          },
        },
      ]
    }),
  )

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
        skills: {
          points: 1n,
          fragments: 0n,
        },
        infinity: {
          points: options.infinityPoints ?? 0n,
          spentPoints: 0n,
          availablePoints: 0n,
          secretsOfTheUniverse: 0n,
          permanentSkillPoints: 0n,
        },
        quantum: {
          pointsEarned: options.quantumPoints ?? 0n,
          pointsSpent: 0n,
          availablePoints: 0n,
          permanentSecrets: 0n,
          influenceSpeedBonus: 0n,
          cashBonusLevels: 0n,
          scienceBonusLevels: 0n,
        },
        reality: {
          universeDesignationCount: 3n,
          workersReady: 128n,
          workerGenerationProgress: 0.25,
          influence: 42n,
        },
        avocado: {
          infinityPoints: 0,
          influence: 0,
          strangeMatter: 0,
          overflowMultiplier: 0,
        },
        dream: {
          strangeMatter: 4096n,
        },
        time: {
          storedTimeAvailableSeconds: 600,
          storedTimeCapacitySeconds: 3600,
          doubleTimeBankSeconds: 0,
        },
      },
      progression: {
        meta: {
          createdAtLegacyText: null,
          tutorialComplete: false,
          firstInfinityComplete: false,
          navigationVisibility:
            options.navigationVisibility ?? {
              story: false,
              wiki: false,
              statistics: true,
            },
        },
        dyson: {
          facilities,
          totalPanelsDecayed: 0,
          botDistribution: 0,
          automation: {
            buyMode: 'buy-1',
            roundedBulkBuy: false,
            enabledFacilities: {
              assembly_lines: false,
              ai_managers: false,
              servers: false,
              data_centers: false,
              planets: false,
              matrioshka_brains: false,
              birch_planets: false,
              galactic_brains: false,
              ...options.enabledFacilities,
            },
          },
        },
        research: {
          levelsById: {},
          progressById: {},
          automation: {
            buyMode: 'buy-1',
            roundedBulkBuy: false,
            enabledById: {},
          },
        },
        skills: {
          byId: {},
          activeAutoAssignment: [],
          presets: [
            { name: 'Preset 1', skillIds: [], botDistribution: 0, colorId: 'cyan' },
            { name: 'Preset 2', skillIds: [], botDistribution: 0, colorId: 'orange' },
            { name: 'Preset 3', skillIds: [], botDistribution: 0, colorId: 'gold' },
            { name: 'Preset 4', skillIds: [], botDistribution: 0, colorId: 'rose' },
            { name: 'Preset 5', skillIds: [], botDistribution: 0, colorId: 'pink' },
          ],
          autoAssignNonRefundable: false,
          tabPresetAutomation: {
            bots: options.botsPresetAutomation ?? 0,
            research: options.researchPresetAutomation ?? 0,
          },
        },
        quantum: {
          divisionsPurchased: 0n,
          unlocks: {
            botMultitasking: false,
            breakTheLoop: false,
            quantumEntanglement: false,
          },
        },
        avocado: {
          unlocked: options.avocatoUnlocked ?? false,
        },
        secretProgress: {
          completed: options.secretCompleted ?? false,
          step: options.secretStep ?? 0,
        },
        infinity: {
          breakTarget: 1n,
          inProgress: false,
          botCapTransitionPending: false,
          botCapRewardsGranted: false,
          lastCycleDurationSeconds: 0,
          lastPointsGained: 0,
          storedTimeUsedThisCycleSeconds: 0,
          storedTimeUsedPreviousCycleSeconds: 0,
          retainedFacilities: {
            assembly_lines: false,
            ai_managers: false,
            servers: false,
            data_centers: false,
            planets: false,
          },
          automationUnlocked: {
            research: options.researchAutomationUnlocked ?? false,
            bots: options.botsAutomationUnlocked ?? false,
          },
        },
        dream: {
          upgrades: {
            translation1: false,
            translation2: false,
            translation3: false,
            translation4: false,
            translation5: false,
            translation6: false,
            translation7: false,
            translation8: false,
            speed1: false,
            speed2: false,
            speed3: false,
            speed4: false,
            speed5: false,
            speed6: false,
            speed7: false,
            speed8: false,
            doubleTimeOwned: false,
            workerAutoConvert: false,
          },
        },
        timeline: {
          doubleTime: {
            unlocked: false,
            enabled: false,
            rate: 0,
          },
        },
        statistics: emptyStatistics(),
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
              swarmVisualization: {
                phase: 'stellar-swarm',
                activePanels: 0,
                completion: 0,
              },
              currentGoal: {
                kind: 'create-bots',
                target: 10,
              },
              facilities: facilityFacts,
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
        infinity: {
          mode: 'ordinary',
          currentReward: 0n,
          navigationReward: null,
          progressFraction: 0,
          resetThresholdBots: 4.2e19,
          botsRemainingToReset: 4.2e19,
          currentRewardThresholdBots: null,
          nextRewardThresholdBots: null,
          botsRemainingToNextReward: null,
          breakTargetProgress: null,
          showRealityWarning: false,
        },
        reality: {
          status: 'success',
          generationPerSecond: 1,
          workerGenerationFillFraction: 0.25,
          workerBatchSize: 128n,
          nextUniverseDesignation: 4n,
          workerBatchFillFraction: 1,
          consumptionStatus: 'halted',
          autoGatherEnabled: false,
          artifact: {
            replacements: [],
            progressLabel: 'undefined',
            scrambleIntervalSeconds: 1 / 60,
          },
        },
        simulations: {
          currentEra: 'foundational',
          eras: {
            foundational: {
              visible: true,
              visiblePanelIds: [],
            },
            information: {
              visible: false,
              visiblePanelIds: [],
            },
            spaceAge: {
              visible: false,
              visiblePanelIds: [],
            },
          },
          live: {
            production: {
              ok: false,
            },
          },
          resets: {
            count: 0n,
          },
          permanentUpgrades: {
            simulationCategoryVisible: false,
            simulation: {
              countermeasures: [],
              education: [],
              foundational: [],
              information: [],
              spaceAge: [],
            },
            realityCategoryVisible: true,
            anomalyCategoryVisible: true,
            reality: {
              translation: ['translation1'],
              speed: ['speed1'],
              qualityOfLife: [],
            },
          },
        },
        story: {
          visibleChapterIds:
            options.avocatoEntryVisible || options.avocatoUnlocked
              ? ['chapter-1', 'chapter-3']
              : ['chapter-1'],
          visiblePassageIds: ['chapter-1-intro'],
          avocatoEntryVisible:
            options.avocatoEntryVisible ??
            options.avocatoUnlocked ??
            false,
        },
        avocado: {
          infinityPoints: 1,
          influence: 1,
          strangeMatter: 1,
          overflow: 1,
          total: 1,
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
        skills: {
          routeUnlocked: options.skillsRouteUnlocked ?? false,
        },
        infinity: {
          routeUnlocked:
            options.infinityRouteUnlocked ?? false,
        },
        reality: {
          routeVisible: options.realityRouteVisible ?? false,
          routeUnlocked: options.realityRouteUnlocked ?? false,
          unlockProgress: {
            currentSecrets: options.realitySecrets ?? 0n,
            requiredSecrets: 27n,
            fraction: Number(options.realitySecrets ?? 0n) / 27,
          },
        },
        simulations: {
          routeUnlocked: options.realityRouteUnlocked ?? false,
        },
      },
      runtime: {
        storedTimeCheater: false,
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
          'dyson.set-facility-automation': {
            routeAvailable: true,
          },
          'research.purchase': {
            routeAvailable: true,
          },
          'research.set-buy-mode': {
            routeAvailable: true,
          },
          'research.set-rounded-bulk-buy': {
            routeAvailable: true,
          },
          'research.set-automation': {
            routeAvailable: true,
          },
          'skill.purchase': {
            routeAvailable: true,
          },
          'skill.refund': {
            routeAvailable: true,
          },
          'skill.select-preset': {
            routeAvailable: true,
          },
          'skill.set-preset-color': {
            routeAvailable: true,
          },
          'skill.set-auto-assign-non-refundable': {
            routeAvailable: true,
          },
          'skill.set-tab-preset-automation': {
            routeAvailable: true,
          },
          'skill.reset': {
            routeAvailable: true,
          },
          'infinity.purchase-shop-item': {
            routeAvailable: true,
          },
          'infinity.set-break-target': {
            routeAvailable: true,
          },
          'reality.gather-influence': {
            routeAvailable: true,
          },
          'reality.purchase-upgrade': {
            routeAvailable: true,
          },
          'dream.purchase-upgrade': {
            routeAvailable: true,
          },
          'dream.purchase-foundational': {
            routeAvailable: true,
          },
          'dream.purchase-space-age': {
            routeAvailable: true,
          },
          'dream.start-education': {
            routeAvailable: true,
          },
          'dream.request-black-hole-reset': {
            routeAvailable: true,
          },
          'time.set-double-time-rate': {
            routeAvailable: true,
          },
          'quantum.purchase-upgrade': {
            routeAvailable: true,
          },
          'quantum.request-leap': {
            routeAvailable: true,
          },
          'avocado.feed': {
            routeAvailable: true,
          },
          'avocado.complete-meditation-step': {
            routeAvailable: true,
          },
          'time.upgrade-stored-capacity': {
            routeAvailable: true,
          },
          'time.request-stored-time-spend': {
            routeAvailable: true,
          },
        },
      },
      previews: {
        dyson: { basicFacilities },
        research: {
          complete: true,
          issue: null,
          purchases: [],
          cards: [
            {
              researchId: 'research.assembly_line_upgrade',
              eligible: true,
              code: 'purchasable',
              currentLevel: 0,
              maximumLevel: null,
              selectedQuantity: 1n,
              affordableQuantity: 1n,
              cost: 50_000,
              issue: null,
              prerequisitesMet: true,
              visible: true,
              maxed: false,
              automationActive: false,
              effectKind: 'percentage',
              perLevelEffect: 5,
              currentEffect: 0,
              projectedEffect: 5,
              passiveProgress: 0,
            },
          ],
        },
        skills: {
          complete: true,
          definitionGap: null,
          skills: [
            {
              skillId: 'startHereTree',
              cost: 1n,
              owned: false,
              visible: true,
              unlocked: true,
              queued: false,
              visualState: 'root',
              fragment: false,
              intrinsicallyRefundable: true,
              requiredSkillIds: [],
              shadowRequiredSkillIds: [],
              exclusiveWithSkillIds: [],
              purchase: {
                eligible: true,
                code: 'purchasable',
                affectedSkillIds: ['startHereTree'],
                pointsRequired: 1n,
              },
              refund: {
                eligible: false,
                code: 'not-owned',
                affectedSkillIds: [],
                pointsReturned: 0n,
                fragmentsRemoved: 0n,
              },
            },
          ],
        },
        infinity: {
          shop: [],
          breakTarget: {
            minimum: 1n,
            maximum: 1100n,
            minimumPosition: Math.log10(2),
            maximumPosition: Math.log10(1101),
            currentPosition: Math.log10(2),
          },
        },
        reality: {
          gatherInfluence: {
            eligible: true,
            amount: 128n,
            code: 'success',
          },
          upgrades: [
            {
              upgradeId: 'translation1',
              eligible: true,
              cost: 8n,
              code: 'purchasable',
              definitionGap: null,
            },
          ],
        },
        dream: {
          upgrades: [],
          foundational: [],
          education: [],
          spaceAge: [],
        },
        quantum: {
          upgrades: [
            {
              upgradeId: 'Secrets',
              eligible: true,
              cost: 1n,
              code: 'purchased',
              definitionGap: null,
            },
          ],
          sections: [
            {
              sectionId: 'core',
              upgradeIds: ['Secrets'],
              revealed: true,
              revealRequirement: null,
            },
          ],
          leap: {
            eligible: false,
            code: 'threshold-not-met',
            branch: null,
            artifactSkillPoints: null,
            definitionGap: null,
          },
        },
        avocado: {
          feeds: [],
          meditation: {
            eligible: false,
            requiredStepIndex: 0,
            code: 'not-ready',
            skillPointReward: 1n,
          },
        },
        time: {
          doubleTimeRate: {
            minimum: 0,
            maximum: 10,
            current: 0,
          },
          storedCapacity: {
            eligible: true,
            code: 'upgradable',
            currentCapacitySeconds: 3600,
            nextCapacitySeconds: 7200,
            consumesStoredSeconds: 0,
          },
          storedSpend: {
            maximumSeconds: 600,
            commitFirstRequired: true,
          },
        },
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

function emptyStatistics() {
  const totals = {
    ordinaryInfinityCount: 0n,
    breakInfinityCount: 0n,
    ordinaryInfinityPoints: 0n,
    breakInfinityPoints: 0n,
    botCapInfinityPoints: 0n,
    botCapOverflowRewards: 0n,
    meteorDreamResets: 0n,
    aiDreamResets: 0n,
    globalWarmingDreamResets: 0n,
    blackHoleDreamResets: 0n,
    strangeMatter: 0n,
    realityWorkers: 0n,
    automaticInfluence: 0n,
    manualInfluence: 0n,
    realityCapacityStallSeconds: 0,
    simulatedSeconds: 0,
  }
  return {
    trackedSinceUpdate: true,
    trackingStartedMarker: '',
    trackedSimulatedSeconds: 0,
    lifetime: totals,
    currentQuantumRun: totals,
    recentProcessedSegment: totals,
    lastCompletedCycle: {
      valid: false,
      breakInfinity: false,
      durationSeconds: 0,
      reward: 0n,
      dreamCause: null,
    },
    minuteWindows: [],
    halfHourWindows: [],
    dailyWindows: [],
  }
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

function platformServices(
  hostKind: ReleasePlatformServices['hostKind'],
): ReleasePlatformServices {
  const emptyOwnership: HostEntitlementOwnership = {
    doubleInfinityPoints: false,
    developerOptions: false,
  }
  return {
    hostKind,
    metadata: {
      metadata: async () => ({
        hostKind,
        applicationId: 'com.blindsidedgames.idledysonswarm',
        applicationVersion: 'test',
        supportsNativeFilesystemMigration: hostKind !== 'browser',
      }),
    },
    nativeFilesystemMigration: { discoverCandidates: async () => [] },
    entitlements: {
      readOwnership: async () => emptyOwnership,
      refreshOwnership: async () => emptyOwnership,
    },
    store: {
      products: async () => CANONICAL_STORE_PRODUCTS.map((product) => ({
        productId: product.id,
        localizedPrice: null,
        available: false,
      })),
      purchase: async (productId) => ({
        accepted: false,
        productId,
        code: 'store-unavailable',
      }),
      restorePurchases: async () => ({ restoredProductIds: [] }),
    },
    diagnostics: {
      export: async () => ({
        exported: false,
        code: 'export-unavailable',
      }),
    },
  }
}
