// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import axe from 'axe-core'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type {
  FrontendCanonicalProgression,
  FrontendGameplayPreviews,
  FrontendSimulationsDerivedFacts,
} from '../../../application/frontendSnapshot'
import enCatalog from '../../i18n/catalogs/compiled/en.json'
import { PresentationIntlProvider } from '../../i18n/PresentationIntlProvider'
import type { SharedMessageCatalog } from '../../i18n/catalogs/types'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import {
  SIMULATION_FORMULAS_STORAGE_KEY,
  SimulationsSurface,
  type SimulationsSurfaceProps,
} from './SimulationsSurface'

const simulationStyles = readFileSync(
  join(process.cwd(), 'src', 'ui', 'gameplay', 'simulations', 'simulations.css'),
  'utf8',
)
const upgradeStyles = readFileSync(
  join(
    process.cwd(),
    'src',
    'ui',
    'gameplay',
    'simulations',
    'simulationUpgradeRegion.css',
  ),
  'utf8',
)
const baseUpgradeStyles = upgradeStyles.split('@media (max-width: 30rem)')[0]

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('SimulationsSurface', () => {
  test('uses the shared compact card rhythm at every viewport', () => {
    expect(baseUpgradeStyles).toMatch(
      /\.simulation-permanent-upgrades__content,[\s\S]*gap:\s*var\(--game-card-grid-gap\);/,
    )
    expect(baseUpgradeStyles).toMatch(
      /\.simulation-permanent-upgrade-category ol\s*\{[^}]*gap:\s*var\(--game-card-grid-gap\);/,
    )
    expect(simulationStyles).toMatch(
      /\.simulation-category ol\s*\{[^}]*gap:\s*var\(--ui-card-gap\);/,
    )
    expect(simulationStyles).toMatch(
      /\.ui-facility-card\.simulation-panel-card\s*\{[^}]*min-block-size:\s*0;[^}]*grid-template-columns:\s*minmax\(0, 1fr\) clamp\(6\.25rem, 27%, 6\.75rem\);[^}]*grid-template-rows:\s*auto auto auto minmax\(0, 1fr\) auto;[^}]*gap:\s*0\.05rem 0\.32rem;[^}]*padding:\s*0\.34rem 0\.38rem;/,
    )
    expect(simulationStyles).toMatch(
      /\.simulation-panel-card \.ui-facility-card__title\s*\{[^}]*padding:\s*0;[^}]*margin:\s*0;[^}]*font-size:\s*calc\(0\.9rem \* var\(--game-text-scale\)\);/,
    )
    expect(simulationStyles).toMatch(
      /\.simulation-panel-card \.ui-facility-card__description\s*\{[^}]*font-size:\s*calc\(0\.67rem \* var\(--game-text-scale\)\);/,
    )
    expect(simulationStyles).toMatch(
      /\.simulation-panel-card \.ui-facility-card__description\s*\{[^}]*grid-column:\s*1;[^}]*grid-row:\s*3;/,
    )
    expect(simulationStyles).toMatch(
      /\.simulation-panel-card \.ui-facility-card__progress\s*\{[^}]*grid-column:\s*1 \/ -1;[^}]*grid-row:\s*5;/,
    )
    expect(simulationStyles).toMatch(
      /\.simulation-panel-card--no-action \.ui-facility-card__description\s*\{[^}]*grid-column:\s*1 \/ -1;/,
    )
    expect(baseUpgradeStyles).toMatch(
      /\.simulation-permanent-upgrade-card\s*\{[^}]*min-block-size:\s*0;[^}]*grid-template-columns:\s*minmax\(0, 1fr\) 6rem;[\s\S]*\.simulation-permanent-upgrade-card h4\s*\{[^}]*font-size:\s*calc\(0\.8rem \* var\(--game-text-scale\)\);/,
    )
    expect(baseUpgradeStyles).toMatch(
      /\.simulation-permanent-upgrade-card\s*\{[^}]*border:[^}]*var\(--simulation-upgrade-action\)/,
    )
    expect(baseUpgradeStyles).toMatch(
      /\.simulation-permanent-upgrade-category\s*> \.ui-collapsible-section__heading\s*\{[^}]*border:\s*var\(--ui-panel-border-width\) solid var\(--simulation-upgrade-action\);/,
    )
    expect(baseUpgradeStyles).toMatch(
      /\.simulation-permanent-upgrade-category\s*\{[^}]*margin-inline:\s*0;/,
    )
    expect(baseUpgradeStyles).toMatch(
      /\.simulation-permanent-upgrades[^}]*[\s\S]*\.ui-collapsible-section__trigger\s*\{[^}]*font-size:\s*var\(--ui-text-section-title\);/,
    )
    expect(simulationStyles).toMatch(
      /\.ui-facility-card\.simulation-panel-card\s*\{[^}]*block-size:\s*auto;[^}]*border:[^}]*var\(--simulation-card-action\)/,
    )
    expect(simulationStyles).toMatch(
      /\.simulation-category\s*\{[^}]*--ui-collapsible-section-collapsed-rotation:\s*90deg;/,
    )
    expect(baseUpgradeStyles).not.toMatch(
      /\.ui-collapsible-section__chevron\s*\{[^}]*(?:border|background):/,
    )
  })

  test('renders canonical Foundational panels and dispatches purchases', async () => {
    const dispatchPlayer = vi.fn(accepted)
    const onPurchaseQuantityChange = vi.fn()
    renderSurface(
      dispatchPlayer,
      facts,
      progression,
      0,
      onPurchaseQuantityChange,
    )

    expect(screen.getByText('Foundational Era')).toBeInTheDocument()
    expect(screen.queryByText('Hunters')).not.toBeInTheDocument()
    expect(screen.queryByText('Simulation Upgrades')).not.toBeInTheDocument()
    expect(screen.queryByText('Counteract Meteor Storm')).not.toBeInTheDocument()

    const influenceBalance = screen.getByLabelText('Influence: 20.0')
    expect(influenceBalance).toHaveTextContent('20.0')
    expect(influenceBalance).not.toHaveTextContent('Influence')
    expect(
      influenceBalance.querySelector('[data-symbol="influence"]'),
    ).toHaveClass('ui-inline-image-symbol--tinted')
    expect(simulationStyles).toMatch(
      /\.simulations-surface__influence[\s\S]*> \.ui-inline-image-symbol\[data-symbol="influence"\]\s*\{[^}]*color:\s*var\(--simulation-value\);/,
    )
    expect(simulationStyles).toMatch(
      /\.simulations-surface__influence > span\s*\{[^}]*color:\s*var\(--simulation-value\);/,
    )

    const purchaseSettings = screen.getByRole('button', {
      name: 'Purchase settings',
    })
    expect(purchaseSettings).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('Simulation: 1')).toBeInTheDocument()
    expect(screen.queryByRole('group', { name: 'Purchase amount' }))
      .not.toBeInTheDocument()

    await userEvent.setup().click(purchaseSettings)
    expect(purchaseSettings).toHaveAttribute('aria-expanded', 'true')
    const purchaseAmount = screen.getByRole('group', {
      name: 'Purchase amount',
    })
    const buyMax = within(purchaseAmount).getByRole('button', {
      name: 'Buy Max',
    })
    await userEvent.setup().click(buyMax)
    expect(onPurchaseQuantityChange).toHaveBeenCalledWith('max')

    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Foundational Era' }),
    )
    expect(screen.getByText('Hunters')).toBeInTheDocument()
    expect(screen.getByText('Gatherers')).toBeInTheDocument()
    expect(screen.getAllByRole('progressbar')).toHaveLength(2)

    const purchaseButton = screen.getByRole('button', {
      name: '+1 4.00 Influence',
    })
    expect(purchaseButton).toHaveTextContent('+14.00')
    expect(purchaseButton).not.toHaveTextContent('Influence')
    expect(
      purchaseButton.querySelector('[data-symbol="influence"]'),
    ).toHaveClass('ui-inline-image-symbol--tinted')

    await userEvent.setup().click(purchaseButton)

    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'dream.purchase-foundational',
      purchase: 'hunters',
      quantity: 1,
    })
  })

  test('shows optional formulas inline without creating a player command', async () => {
    const dispatchPlayer = vi.fn(accepted)
    renderSurface(dispatchPlayer)

    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Foundational Era' }),
    )
    const hunters = screen.getByText('Hunters').closest('article')
    expect(within(hunters!).queryByRole('button', { name: 'Details' }))
      .not.toBeInTheDocument()
    expect(within(hunters!).queryByText('Speed multiplier'))
      .not.toBeInTheDocument()

    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Purchase settings' }),
    )
    const formulaToggle = screen.getByRole('checkbox', {
      name: 'Show formulas inline',
    })
    await userEvent.setup().click(formulaToggle)

    expect(within(hunters!).getByText('Speed multiplier')).toBeInTheDocument()
    expect(within(hunters!).getByText(/Log₁₀\(2\.00\)/)).toBeInTheDocument()
    expect(hunters).not.toHaveTextContent('Output')
    expect(hunters).not.toHaveTextContent('Base duration')
    expect(hunters).not.toHaveTextContent('Current rate')
    expect(hunters).toHaveTextContent(
      'Influence heroic hunters to gather meat for your communities.',
    )
    expect(localStorage.getItem(SIMULATION_FORMULAS_STORAGE_KEY)).toBe('true')
    expect(dispatchPlayer).not.toHaveBeenCalled()
  })

  test('shows a completion pulse and cycles per second for medium-speed production', async () => {
    renderSurface(accepted, fastFoundationalFacts, progression, 1)

    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Foundational Era' }),
    )
    const progress = screen.getByRole('progressbar', {
      name: 'Production progress',
    })
    expect(progress).toHaveAttribute('value', '1')
    expect(progress).toHaveAttribute('aria-valuetext', '1.33/s')
    expect(progress).toHaveTextContent('1.33/s')
    expect(progress.closest('.simulation-progress'))
      .toHaveAttribute('data-presentation', 'medium')
  })

  test('keeps percentage progress at the base simulation rate', async () => {
    renderSurface(accepted, thresholdInformationFacts)

    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Information Era' }),
    )
    const progress = screen.getByRole('progressbar', {
      name: 'Production progress',
    })
    expect(progress).toHaveAttribute('value', '0.5')
    expect(progress).toHaveTextContent('50%')
    expect(progress.closest('.simulation-progress'))
      .toHaveAttribute('data-presentation', 'slow')
  })

  test('uses normal, pulsing, and solid presentation at the slider boundaries', async () => {
    const view = renderSurface(accepted, thresholdInformationFacts)

    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Information Era' }),
    )
    const presentation = () => screen.getByRole('progressbar', {
      name: 'Production progress',
    }).closest('.simulation-progress')
    expect(presentation()).toHaveAttribute('data-presentation', 'slow')

    view.rerender(surfaceElement(
      accepted,
      thresholdInformationFacts,
      progression,
      1,
    ))
    await waitFor(() => expect(presentation())
      .toHaveAttribute('data-presentation', 'medium'))

    view.rerender(surfaceElement(
      accepted,
      thresholdInformationFacts,
      progression,
      7,
    ))
    await waitFor(() => expect(presentation())
      .toHaveAttribute('data-presentation', 'medium'))

    view.rerender(surfaceElement(
      accepted,
      thresholdInformationFacts,
      progression,
      8,
    ))
    await waitFor(() => expect(presentation())
      .toHaveAttribute('data-presentation', 'fast'))

    view.rerender(surfaceElement(
      accepted,
      thresholdInformationFacts,
      progression,
      10,
    ))
    await waitFor(() => expect(presentation())
      .toHaveAttribute('data-presentation', 'fast'))

    view.rerender(surfaceElement(
      accepted,
      thresholdInformationFacts,
      progression,
      0,
    ))
    await waitFor(() => expect(presentation())
      .toHaveAttribute('data-presentation', 'slow'))
  })

  test('themes Education panels from their canonical Information era', async () => {
    renderSurface(accepted, informationFacts)

    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Information Era' }),
    )

    expect(screen.getByText('Engineering').closest('article')).toHaveClass(
      'simulation-panel-card--information',
    )
  })

  test('shows Education effects and live progress directly on the card', async () => {
    renderSurface(accepted, activeInformationFacts)

    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Information Era' }),
    )
    const engineeringCard = screen.getByText('Engineering').closest('article')
    expect(engineeringCard).not.toBeNull()
    expect(within(engineeringCard!).getByText('Time remaining'))
      .toBeInTheDocument()
    expect(within(engineeringCard!).getByText('24s')).toBeInTheDocument()
    expect(within(engineeringCard!).getAllByRole('progressbar')).toHaveLength(1)
    expect(within(engineeringCard!).getByText(
      'Enables Cities to produce Factories.',
    )).toBeInTheDocument()
    expect(engineeringCard).toHaveTextContent('Researching')
    expect(within(engineeringCard!).queryByRole('button', { name: 'Details' }))
      .not.toBeInTheDocument()
  })

  test('collapses permanently completed Education and renders compact accurate cards', async () => {
    renderSurface(accepted, completedInformationFacts)

    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Information Era' }),
    )
    const education = screen.getByRole('button', { name: 'Education' })
    expect(education).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Engineering')).not.toBeInTheDocument()

    await userEvent.setup().click(education)
    const engineeringCard = screen.getByText('Engineering').closest('article')
    expect(engineeringCard).toHaveClass(
      'simulation-panel-card--complete',
      'simulation-panel-card--no-action',
    )
    expect(engineeringCard).toHaveTextContent(
      'Engineering·CompleteEnables Cities to produce Factories.',
    )
    expect(engineeringCard).not.toHaveTextContent('Research progress')
    expect(engineeringCard).not.toHaveTextContent(
      'Invest Influence to complete this research.',
    )

    expect(within(engineeringCard!).queryByRole('button', { name: 'Details' }))
      .not.toBeInTheDocument()
  })

  test('shows an active boost as a second timed progress bar', async () => {
    renderSurface(accepted, boostedCommunityFacts, boostedProgression)

    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Foundational Era' }),
    )
    const communityCard = screen.getByText('Community').closest('article')
    expect(communityCard).not.toBeNull()
    expect(communityCard).not.toHaveTextContent('Boost active:')
    expect(within(communityCard!).getByText('Boost remaining'))
      .toBeInTheDocument()
    const progressbars = within(communityCard!).getAllByRole('progressbar')
    expect(progressbars).toHaveLength(2)
    expect(progressbars[1]).toHaveAccessibleName('Boost remaining')
    expect(progressbars[1]).toHaveTextContent('10m 0s')
    expect(progressbars[1]).toHaveAttribute('value', '0.5')
  })

  test('renders the canonical Space Age reset reward and dispatches Black Hole intent', async () => {
    const dispatchPlayer = vi.fn(accepted)
    renderSurface(dispatchPlayer, spaceAgeFacts)

    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Space Age' }),
    )
    const blackHoleButton = screen.getByRole('button', {
        name: 'Black Hole +12.0 Strange Matter',
      })
    expect(blackHoleButton).not.toHaveTextContent('Strange Matter')
    expect(
      blackHoleButton.querySelector('[data-symbol="strange-matter"]'),
    ).toHaveClass('ui-inline-image-symbol--tinted')
    await userEvent.setup().click(blackHoleButton)

    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'dream.request-black-hole-reset',
    })
  })

  test('keeps a capped Black Hole available with a compact capped label', async () => {
    const dispatchPlayer = vi.fn(accepted)
    renderSurface(dispatchPlayer, {
      ...spaceAgeFacts,
      resets: {
        ...spaceAgeFacts.resets,
        blackHole: {
          eligible: true,
          requestedReward: 12,
          rewardCapped: true,
        },
      },
    } as FrontendSimulationsDerivedFacts)

    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Space Age' }),
    )
    const blackHoleButton = screen.getByRole('button', {
      name: 'Black Hole, Capped',
    })
    expect(blackHoleButton).toHaveTextContent('Black HoleCapped')
    expect(blackHoleButton).toBeEnabled()

    await userEvent.setup().click(blackHoleButton)
    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'dream.request-black-hole-reset',
    })
  })

  test('formats large Swarm and Black Hole values with game suffixes', async () => {
    const largeSwarm = 12_102_296_928_535_773n
    const largeReward = Number(largeSwarm)
    renderSurface(accepted, {
      ...spaceAgeFacts,
      live: {
        ...spaceAgeFacts.live,
        resources: {
          ...spaceAgeFacts.live.resources,
          swarmPanels: largeSwarm,
        },
      },
      resets: {
        ...spaceAgeFacts.resets,
        blackHole: { eligible: true, requestedReward: largeReward },
      },
    } as FrontendSimulationsDerivedFacts)

    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Space Age' }),
    )

    expect(screen.getByText('Swarm Stats').closest('article'))
      .toHaveTextContent('Swarm Stats12.1Qa')
    expect(screen.getByRole('button', {
      name: 'Black Hole +12.1Qa Strange Matter',
    })).toBeInTheDocument()
  })

  test('keeps Space Age counts and output metadata on the title line', async () => {
    renderSurface(accepted, spaceAgeFacts)

    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Space Age' }),
    )

    const swarmCard = screen.getByText('Swarm Stats').closest('article')
    expect(swarmCard).not.toBeNull()
    expect(
      swarmCard!.querySelector('.ui-facility-card__title'),
    ).toHaveTextContent('Swarm Stats20.0·5.00 W')
    expect(
      swarmCard!.querySelector('.ui-facility-card__production'),
    ).toBeEmptyDOMElement()
    expect(within(swarmCard!).queryByRole('button', { name: 'Details' }))
      .not.toBeInTheDocument()
  })

  test('uses Unity energy prefixes for Space Age watts and joules', async () => {
    renderSurface(accepted, energyFormattingFacts)

    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Space Age' }),
    )

    const solarCard = screen.getByText('Solar Panels').closest('article')
    const railgunCard = screen.getByText('Railguns').closest('article')
    const swarmCard = screen.getByText('Swarm Stats').closest('article')
    expect(solarCard).not.toBeNull()
    expect(railgunCard).not.toBeNull()
    expect(swarmCard).not.toBeNull()
    expect(within(solarCard!).queryByRole('button', { name: 'Details' }))
      .not.toBeInTheDocument()
    const fusionCard = screen.getByText('Fusion Generators').closest('article')
    expect(fusionCard).not.toBeNull()
    expect(within(fusionCard!).queryByRole('button', { name: 'Details' }))
      .not.toBeInTheDocument()
    expect(solarCard!.querySelector('.ui-facility-card__title'))
      .toHaveTextContent('Solar Panels274·109 KW')
    expect(
      [...solarCard!.querySelectorAll('.simulation-numeric-highlight')]
        .map((item) => item.textContent),
    ).toEqual(expect.arrayContaining(['274', '109']))
    expect(
      [...solarCard!.querySelectorAll('.simulation-numeric-highlight')]
        .some((item) => item.textContent?.includes('KW')),
    ).toBe(false)
    expect(screen.getByRole('button', { name: 'Space Age' }))
      .toHaveTextContent('Space Age124 GJ stored')
    expect(railgunCard!.querySelector('.ui-facility-card__title'))
      .toHaveTextContent('Railguns')
    expect(railgunCard!.querySelector('.ui-facility-card__title'))
      .not.toHaveTextContent('stored')
    expect(within(railgunCard!).getByRole('progressbar', {
      name: 'Railgun charge',
    })).toHaveTextContent('10.0 MJ / 25.0 MJ')
    expect(swarmCard!.querySelector('.ui-facility-card__title'))
      .toHaveTextContent('Swarm Stats20.0·51.2 MW')
  })

  test('shows rounds remaining as text without duplicating Railgun charge', async () => {
    renderSurface(accepted, inactiveRailgunFacts)

    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Space Age' }),
    )
    const railgunCard = screen.getByText('Railguns').closest('article')
    expect(railgunCard).not.toBeNull()
    const progressbars = within(railgunCard!).getAllByRole('progressbar')
    expect(progressbars).toHaveLength(1)
    expect(progressbars[0]).toHaveAccessibleName('Railgun charge')
    expect(within(railgunCard!).queryByRole('progressbar', {
      name: 'Volley remaining',
    })).not.toBeInTheDocument()
    expect(railgunCard).toHaveTextContent('Next volley10.0 rounds remaining')
    expect(within(railgunCard!).getByText('Railgun array')).toBeInTheDocument()
    expect(within(railgunCard!).getByText(/panels \/ round · .*rounds \/ volley/))
      .toBeInTheDocument()

    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Purchase settings' }),
    )
    await userEvent.setup().click(screen.getByRole('checkbox', {
      name: 'Show formulas inline',
    }))
    expect(within(railgunCard!).getAllByText('Railgun array')).toHaveLength(1)
  })

  test('updates the text-only rounds remaining during a volley', async () => {
    renderSurface(accepted, activeRailgunFacts)

    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Space Age' }),
    )
    const railgunCard = screen.getByText('Railguns').closest('article')
    expect(railgunCard).not.toBeNull()
    const progressbars = within(railgunCard!).getAllByRole('progressbar')
    expect(progressbars).toHaveLength(1)
    expect(progressbars[0]).toHaveAccessibleName('Railgun charge')
    expect(railgunCard).toHaveTextContent('7.00 rounds remaining')
  })

  test('keeps the rounds readout text-only at fast simulation rates', async () => {
    renderSurface(accepted, fastRailgunFacts)

    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Space Age' }),
    )
    const railgunCard = screen.getByText('Railguns').closest('article')
    expect(railgunCard).not.toBeNull()
    expect(within(railgunCard!).getAllByRole('progressbar')).toHaveLength(1)
    expect(within(railgunCard!).queryByRole('progressbar', {
      name: 'Railgun throughput',
    })).not.toBeInTheDocument()
    expect(railgunCard).toHaveTextContent('10.0 rounds remaining')
  })

  test('shows active Double Time overdrive without adding another bar', async () => {
    renderSurface(accepted, overdriveFacts)

    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Space Age' }),
    )
    const factoryCard = screen.getByText('Space Factories').closest('article')
    expect(factoryCard).not.toBeNull()
    expect(factoryCard!.querySelector('.ui-facility-card__title'))
      .not.toHaveTextContent('owned')
    expect(within(factoryCard!).getByText('Factory overdrive'))
      .toBeInTheDocument()
    expect(within(factoryCard!).getByText('Factory overdrive').closest('div'))
      .toHaveTextContent('Factory overdrive×16.8B · 25.0 MW consumed')
    expect(within(factoryCard!).getAllByRole('progressbar')).toHaveLength(2)
    expect(within(factoryCard!).getByText('Volley reserve').closest('div'))
      .toHaveAttribute('data-presentation', 'reservoir')
    expect(factoryCard).not.toHaveTextContent('Record stored')
    expect(within(factoryCard!).queryByRole('button', { name: 'Details' }))
      .not.toBeInTheDocument()
  })

  test('persists the inline formula preference across renders', async () => {
    const user = userEvent.setup()
    const view = renderSurface(accepted)
    await user.click(
      screen.getByRole('button', { name: 'Purchase settings' }),
    )
    await user.click(screen.getByRole('checkbox', {
      name: 'Show formulas inline',
    }))
    view.unmount()

    renderSurface(accepted)
    await user.click(screen.getByRole('button', { name: 'Foundational Era' }))
    const card = screen.getByText('Hunters').closest('article')
    expect(within(card!).getByText('Speed multiplier')).toBeInTheDocument()
    expect(localStorage.getItem(SIMULATION_FORMULAS_STORAGE_KEY)).toBe('true')
  })

  test('shows a solid bar and cycles per second for fast Space Factories', async () => {
    renderSurface(accepted, fastSpaceFactoryFacts, progression, 8)

    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Space Age' }),
    )
    const factoryCard = screen.getByText('Space Factories').closest('article')
    expect(factoryCard).not.toBeNull()
    const progress = within(factoryCard!).getByRole('progressbar', {
      name: 'Production progress',
    })
    expect(progress).toHaveAttribute('value', '1')
    expect(progress).toHaveAttribute('aria-valuetext', '10.0/s')
    expect(progress).toHaveTextContent('10.0/s')
    expect(progress.closest('.simulation-progress'))
      .toHaveAttribute('data-presentation', 'fast')
  })

  test('settles a stopped reservoir flow readout back to zero', async () => {
    const view = renderSurface(accepted, reservoirFacts(100n))

    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Space Age' }),
    )
    await new Promise((resolve) => window.setTimeout(resolve, 1_600))
    view.rerender(surfaceElement(accepted, reservoirFacts(110n)))

    const reserve = screen.getByRole('progressbar', { name: 'Volley reserve' })
    await waitFor(() => expect(reserve.getAttribute('aria-valuetext'))
      .toMatch(/[+−].*\/s/))
    await new Promise((resolve) => window.setTimeout(resolve, 600))
    expect(reserve.getAttribute('aria-valuetext')).toMatch(/[+−].*\/s/)
    await waitFor(() => expect(reserve)
      .toHaveAttribute('aria-valuetext', expect.stringMatching(/ · 0(?:\.0+)?\/s$/)), {
      timeout: 2_000,
    })
  })

  test('has no automated accessibility violations', async () => {
    const { container } = renderSurface()
    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Foundational Era' }),
    )
    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    })
    expect(results.violations).toEqual([])
  })
})

function renderSurface(
  dispatchPlayer: SimulationsSurfaceProps['dispatchPlayer'] = accepted,
  renderedFacts: FrontendSimulationsDerivedFacts = facts,
  renderedProgression: FrontendCanonicalProgression['dream'] = progression,
  activeDoubleTimeRate = 0,
  onSpaceAgePurchaseQuantityChange: NonNullable<
    SimulationsSurfaceProps['onSpaceAgePurchaseQuantityChange']
  > = () => undefined,
) {
  return render(surfaceElement(
    dispatchPlayer,
    renderedFacts,
    renderedProgression,
    activeDoubleTimeRate,
    onSpaceAgePurchaseQuantityChange,
  ))
}

function surfaceElement(
  dispatchPlayer: SimulationsSurfaceProps['dispatchPlayer'] = accepted,
  renderedFacts: FrontendSimulationsDerivedFacts = facts,
  renderedProgression: FrontendCanonicalProgression['dream'] = progression,
  activeDoubleTimeRate = 0,
  onSpaceAgePurchaseQuantityChange: NonNullable<
    SimulationsSurfaceProps['onSpaceAgePurchaseQuantityChange']
  > = () => undefined,
) {
  return (
    <PresentationIntlProvider
      locale="en"
      messages={enCatalog as unknown as SharedMessageCatalog}
    >
      <SimulationsSurface
        locale="en"
        facts={renderedFacts}
        progression={renderedProgression}
        previews={previews}
        influence={20}
        activeDoubleTimeRate={activeDoubleTimeRate}
        spaceAgePurchaseQuantity={1}
        onSpaceAgePurchaseQuantityChange={onSpaceAgePurchaseQuantityChange}
        commandAvailability={{
          purchaseFoundational: true,
          purchaseSpaceAge: true,
          startEducation: true,
          blackHoleReset: true,
        }}
        dispatchPlayer={dispatchPlayer}
      />
    </PresentationIntlProvider>
  )
}

const facts = {
  currentEra: 'foundational',
  eras: {
    foundational: {
      visible: true,
      visiblePanelIds: ['hunters', 'gatherers'],
    },
    information: { visible: false, visiblePanelIds: [] },
    spaceAge: { visible: false, visiblePanelIds: [] },
  },
  live: {
    resources: { hunters: 2, gatherers: 3 },
    education: {},
    timers: {},
    railgun: {},
    dysonPanelCapacity: 1_000n,
    production: {
      ok: true,
      value: {
        foundationalInformation: {
          production: {
            timers: {
              hunterTimerProgress: {
                timerId: 'hunterTimerProgress',
                currentProgress: 1.5,
                durationSeconds: 3,
                progressPerSecond: 2,
                sourceCount: 2,
                baseMultiplier: 1.3010299956639813,
                globalMultiplier: 1.537244063880556,
                multiplierFormula: 'logarithmic-source',
                cyclesPerSecond: 2 / 3,
                secondsUntilNextCycle: 0.75,
                advanceEnabled: true,
                outputPerCycle: {
                  community: 1,
                  housing: 0,
                  workers: 0,
                  factories: 0,
                  bots: 0,
                  rockets: 0,
                },
                outputPerSecond: {
                  community: 2 / 3,
                  housing: 0,
                  workers: 0,
                  factories: 0,
                  bots: 0,
                  rockets: 0,
                },
              },
              gathererTimerProgress: {
                timerId: 'gathererTimerProgress',
                currentProgress: 0.75,
                durationSeconds: 3,
                progressPerSecond: 3,
                sourceCount: 3,
                baseMultiplier: 1.4771212547196624,
                globalMultiplier: 2.030979752305429,
                multiplierFormula: 'logarithmic-source',
                cyclesPerSecond: 1,
                secondsUntilNextCycle: 0.75,
                advanceEnabled: true,
                outputPerCycle: {
                  community: 1,
                  housing: 0,
                  workers: 0,
                  factories: 0,
                  bots: 0,
                  rockets: 0,
                },
                outputPerSecond: {
                  community: 1,
                  housing: 0,
                  workers: 0,
                  factories: 0,
                  bots: 0,
                  rockets: 0,
                },
              },
            },
          },
          conversions: {},
        },
      },
    },
  },
  resets: {
    count: 1n,
    disasterStage: 0n,
    automatic: { eligible: false, requestedReward: 0 },
    blackHole: { eligible: false, requestedReward: 0 },
  },
  permanentUpgrades: {
    simulationCategoryVisible: true,
    simulation: {
      countermeasures: ['counterMeteor'],
      education: [],
      foundational: [],
      information: [],
      spaceAge: [],
    },
    realityCategoryVisible: false,
    anomalyCategoryVisible: false,
    reality: { translation: [], speed: [], qualityOfLife: [] },
  },
} as unknown as FrontendSimulationsDerivedFacts

const informationFacts = {
  ...facts,
  currentEra: 'information',
  eras: {
    ...facts.eras,
    information: { visible: true, visiblePanelIds: ['engineering'] },
  },
  live: {
    ...facts.live,
    education: {
      engineering: {
        active: false,
        complete: false,
        progress: 0,
        researchTime: 30,
        cost: 1_000,
      },
    },
  },
} as unknown as FrontendSimulationsDerivedFacts

const activeInformationFacts = {
  ...informationFacts,
  live: {
    ...informationFacts.live,
    education: {
      engineering: {
        ...informationFacts.live.education.engineering,
        active: true,
        progress: 6,
      },
    },
  },
} as unknown as FrontendSimulationsDerivedFacts

const completedEducation = {
  engineering: {
    active: false,
    complete: true,
    progress: 0,
    researchTime: 30,
    cost: 1_000,
  },
  shipping: {
    active: false,
    complete: true,
    progress: 0,
    researchTime: 60,
    cost: 5_000,
  },
  worldTrade: {
    active: false,
    complete: true,
    progress: 0,
    researchTime: 90,
    cost: 7_000,
  },
  worldPeace: {
    active: false,
    complete: true,
    progress: 0,
    researchTime: 120,
    cost: 8_000,
  },
  mathematics: {
    active: false,
    complete: true,
    progress: 0,
    researchTime: 150,
    cost: 10_000,
  },
  advancedPhysics: {
    active: false,
    complete: true,
    progress: 0,
    researchTime: 180,
    cost: 11_000,
  },
}

const completedInformationFacts = {
  ...informationFacts,
  eras: {
    ...informationFacts.eras,
    information: {
      visible: true,
      visiblePanelIds: [
        'engineering',
        'shipping',
        'world-trade',
        'world-peace',
        'mathematics',
        'advanced-physics',
      ],
    },
  },
  live: {
    ...informationFacts.live,
    education: completedEducation,
  },
} as unknown as FrontendSimulationsDerivedFacts

const progression = {
  huntersPerPurchase: 1,
  gatherersPerPurchase: 1,
  parameters: {
    communityBoostClock: 0,
    factoriesBoostClock: 0,
  },
} as unknown as FrontendCanonicalProgression['dream']

const boostedProgression = {
  ...progression,
  parameters: {
    ...progression.parameters,
    communityBoostClock: 600,
    communityBoostDuration: 1_200,
    factoriesBoostClock: 0,
    factoriesBoostDuration: 1_200,
  },
} as unknown as FrontendCanonicalProgression['dream']

const previews = {
  foundational: [
    { purchase: 'hunters', eligible: true, cost: 4n },
    { purchase: 'gatherers', eligible: true, cost: 5n },
  ],
  education: [],
  spaceAge: [],
  upgrades: [
    {
      upgradeId: 'counterMeteor',
      eligible: true,
      cost: 3,
      code: 'purchasable',
      definitionGap: null,
    },
  ],
} as unknown as FrontendGameplayPreviews['dream']

if (!facts.live.production.ok) {
  throw new Error('Simulation test facts require canonical production data.')
}
const foundationalProduction = facts.live.production.value

const fastFoundationalFacts = {
  ...facts,
  eras: {
    ...facts.eras,
    foundational: { visible: true, visiblePanelIds: ['hunters'] },
  },
  live: {
    ...facts.live,
    production: {
      ok: true,
      value: {
        ...foundationalProduction,
        foundationalInformation: {
          ...foundationalProduction.foundationalInformation,
          production: {
            ...foundationalProduction.foundationalInformation.production,
            timers: {
              hunterTimerProgress: {
                ...foundationalProduction.foundationalInformation.production
                  .timers.hunterTimerProgress,
                progressPerSecond: 4,
                cyclesPerSecond: 4 / 3,
              },
            },
          },
        },
      },
    },
  },
} as unknown as FrontendSimulationsDerivedFacts

const thresholdInformationFacts = {
  ...facts,
  currentEra: 'information',
  eras: {
    foundational: { visible: true, visiblePanelIds: [] },
    information: { visible: true, visiblePanelIds: ['factories'] },
    spaceAge: { visible: false, visiblePanelIds: [] },
  },
  live: {
    ...facts.live,
    resources: { ...facts.live.resources, factories: 1 },
    production: {
      ok: true,
      value: {
        ...foundationalProduction,
        foundationalInformation: {
          ...foundationalProduction.foundationalInformation,
          production: {
            ...foundationalProduction.foundationalInformation.production,
            timers: {
              factoriesTimerProgress: {
                ...foundationalProduction.foundationalInformation.production
                  .timers.hunterTimerProgress,
                timerId: 'factoriesTimerProgress',
                currentProgress: 1.5,
                durationSeconds: 3,
                progressPerSecond: 3.75,
                cyclesPerSecond: 1.25,
              },
            },
          },
        },
      },
    },
  },
} as unknown as FrontendSimulationsDerivedFacts

const boostedCommunityFacts = {
  ...facts,
  eras: {
    ...facts.eras,
    foundational: { visible: true, visiblePanelIds: ['community'] },
  },
  live: {
    ...facts.live,
    resources: {
      ...facts.live.resources,
      community: 10,
    },
    production: {
      ok: true,
      value: {
        ...foundationalProduction,
        foundationalInformation: {
          ...foundationalProduction.foundationalInformation,
          production: {
            ...foundationalProduction.foundationalInformation.production,
            timers: {
              communityTimerProgress: {
                ...foundationalProduction.foundationalInformation.production
                  .timers.hunterTimerProgress,
                timerId: 'communityTimerProgress',
              },
            },
          },
        },
      },
    },
  },
} as unknown as FrontendSimulationsDerivedFacts

const spaceAgeFacts = {
  ...facts,
  currentEra: 'space-age',
  eras: {
    foundational: { visible: true, visiblePanelIds: [] },
    information: { visible: true, visiblePanelIds: [] },
    spaceAge: { visible: true, visiblePanelIds: ['swarm-stats'] },
  },
  live: {
    ...facts.live,
    resources: {
      ...facts.live.resources,
      energy: 100,
      swarmPanels: 20n,
    },
    production: {
      ok: true,
      value: {
        ...foundationalProduction,
        spaceAge: {
          production: {
            energy: { swarmPerSecond: 5 },
          },
        },
      },
    },
  },
  resets: {
    ...facts.resets,
    blackHole: { eligible: true, requestedReward: 12 },
  },
} as unknown as FrontendSimulationsDerivedFacts

const inactiveRailgunFacts = {
  ...spaceAgeFacts,
  eras: {
    ...spaceAgeFacts.eras,
    spaceAge: { visible: true, visiblePanelIds: ['railguns'] },
  },
  live: {
    ...spaceAgeFacts.live,
    resources: {
      ...spaceAgeFacts.live.resources,
      railgunCharge: 10,
    },
    railgun: {
      firing: false,
      fireProgress: 0,
      shotsRemaining: 0,
    },
    production: {
      ok: true,
      value: {
        ...foundationalProduction,
        spaceAge: {
          production: {
            energy: { swarmPerSecond: 5 },
          },
          railgun: {
            baseMaximumCharge: 25,
            maximumCharge: 25,
            totalFireTimeSeconds: 1,
            timeMultiplier: 1,
            shotIntervalSeconds: 2,
            shotsPerVolley: 10,
            mechanicalPayload: 1,
            payloadCapacity: 100,
            panelsPerShot: 1n,
            panelsPerVolley: 10n,
          },
        },
      },
    },
  },
} as unknown as FrontendSimulationsDerivedFacts

const energyFormattingFacts = {
  ...inactiveRailgunFacts,
  eras: {
    ...inactiveRailgunFacts.eras,
    spaceAge: {
      visible: true,
      visiblePanelIds: ['solar', 'fusion', 'railguns', 'swarm-stats'],
    },
  },
  live: {
    ...inactiveRailgunFacts.live,
    resources: {
      ...inactiveRailgunFacts.live.resources,
      energy: 124_000_000_000,
      solarPanels: 274,
      railgunCharge: 10_000_000,
    },
    production: {
      ok: true,
      value: {
        ...foundationalProduction,
        spaceAge: {
          production: {
            energy: {
              solarPerSecond: 109_000,
              fusionPerSecond: 0,
              swarmPerSecond: 51_290_000,
            },
          },
          railgun: {
            baseMaximumCharge: 25_000_000,
            maximumCharge: 25_000_000,
            totalFireTimeSeconds: 1,
            timeMultiplier: 1,
            shotIntervalSeconds: 2,
            shotsPerVolley: 10,
            mechanicalPayload: 1,
            payloadCapacity: 100,
            panelsPerShot: 1n,
            panelsPerVolley: 10n,
          },
        },
      },
    },
  },
} as unknown as FrontendSimulationsDerivedFacts

const activeRailgunFacts = {
  ...inactiveRailgunFacts,
  live: {
    ...inactiveRailgunFacts.live,
    railgun: {
      firing: true,
      fireProgress: 0.05,
      shotsRemaining: 7,
    },
    production: {
      ok: true,
      value: {
        ...foundationalProduction,
        spaceAge: {
          production: {
            energy: { swarmPerSecond: 5 },
          },
          railgun: {
            baseMaximumCharge: 25,
            maximumCharge: 25,
            totalFireTimeSeconds: 1,
            timeMultiplier: 1,
            shotIntervalSeconds: 0.1,
            shotsPerVolley: 10,
            mechanicalPayload: 1,
            payloadCapacity: 100,
            panelsPerShot: 1n,
            panelsPerVolley: 10n,
          },
        },
      },
    },
  },
} as unknown as FrontendSimulationsDerivedFacts

const fastRailgunFacts = {
  ...activeRailgunFacts,
  live: {
    ...activeRailgunFacts.live,
    railgun: {
      ...activeRailgunFacts.live.railgun,
      firing: true,
      fireProgress: 0,
      shotsRemaining: 10,
      lastRoundsFired: 0,
      lastPanelsLaunched: 0n,
    },
    production: {
      ok: true,
      value: {
        ...foundationalProduction,
        spaceAge: {
          production: { energy: { swarmPerSecond: 5 } },
          railgun: {
            baseMaximumCharge: 25,
            maximumCharge: 25,
            totalFireTimeSeconds: 1,
            timeMultiplier: 10,
            shotIntervalSeconds: 0.1,
            shotsPerVolley: 10,
            mechanicalPayload: 100,
            payloadCapacity: 100,
            panelsPerShot: 100n,
            panelsPerVolley: 1_000n,
          },
        },
      },
    },
  },
} as unknown as FrontendSimulationsDerivedFacts

const overdriveFacts = {
  ...spaceAgeFacts,
  eras: {
    ...spaceAgeFacts.eras,
    spaceAge: { visible: true, visiblePanelIds: ['space-factories'] },
  },
  live: {
    ...spaceAgeFacts.live,
    resources: {
      ...spaceAgeFacts.live.resources,
      spaceFactories: 10,
      dysonPanels: 5n,
    },
    dysonPanelCapacity: 1_000n,
    production: {
      ok: true,
      value: {
        ...foundationalProduction,
        spaceAge: {
          production: {
            energy: { swarmPerSecond: 5 },
            spaceFactory: {
              currentProgress: 1,
              durationSeconds: 2,
              progressPerSecond: 2,
              cyclesPerSecond: 1,
              overdriveActive: true,
              overdriveMultiplier: 4,
              overdriveEnergyPerSecond: 75_000_000,
            },
          },
          railgun: {
            factoryOverdriveActive: true,
            factoryOverdriveMultiplier: 16_843_845_313.7,
            factoryOverdriveEnergyPerSecond: 25_000_000,
          },
        },
      },
    },
  },
} as unknown as FrontendSimulationsDerivedFacts

if (!overdriveFacts.live.production.ok) {
  throw new Error('Overdrive test facts require canonical production data.')
}
const overdriveProduction = overdriveFacts.live.production.value

const fastSpaceFactoryFacts = {
  ...overdriveFacts,
  live: {
    ...overdriveFacts.live,
    production: {
      ok: true,
      value: {
        ...overdriveProduction,
        spaceAge: {
          ...overdriveProduction.spaceAge,
          production: {
            ...overdriveProduction.spaceAge.production,
            spaceFactory: {
              ...overdriveProduction.spaceAge.production.spaceFactory,
              progressPerSecond: 20,
              cyclesPerSecond: 10,
            },
          },
        },
      },
    },
  },
} as unknown as FrontendSimulationsDerivedFacts

function reservoirFacts(
  dysonPanels: bigint,
): FrontendSimulationsDerivedFacts {
  if (!overdriveFacts.live.production.ok) {
    throw new Error('Reservoir facts require production.')
  }
  const production = overdriveFacts.live.production.value
  return {
    ...overdriveFacts,
    live: {
      ...overdriveFacts.live,
      resources: {
        ...overdriveFacts.live.resources,
        dysonPanels,
      },
      production: {
        ok: true,
        value: {
          ...production,
          spaceAge: {
            ...production.spaceAge,
            production: {
              ...production.spaceAge.production,
              spaceFactory: {
                ...production.spaceAge.production.spaceFactory,
                progressPerSecond: 1.25,
                cyclesPerSecond: 0.625,
              },
            },
          },
        },
      },
    },
  } as FrontendSimulationsDerivedFacts
}

async function accepted(): Promise<UiRuntimePlayerCommandResult> {
  return {
    status: 'accepted',
    kind: 'transition',
    changed: true,
    activationRevision: { session: 1, state: 1 },
    stateRevision: 2,
  }
}
