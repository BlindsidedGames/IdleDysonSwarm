// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import axe from 'axe-core'
import { cleanup, render, screen, within } from '@testing-library/react'
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
  SimulationTimeControl,
  SimulationsSurface,
  type SimulationsSurfaceProps,
} from './SimulationsSurface'

afterEach(() => {
  cleanup()
  localStorage.clear()
})

describe('SimulationsSurface', () => {
  test('renders canonical Foundational panels and dispatches purchases', async () => {
    const dispatchPlayer = vi.fn(accepted)
    renderSurface(dispatchPlayer)

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
    })
  })

  test('opens compact panel details without creating a player command', async () => {
    const dispatchPlayer = vi.fn(accepted)
    renderSurface(dispatchPlayer)

    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Foundational Era' }),
    )
    const details = screen.getAllByRole('button', { name: 'Details' })
    await userEvent.setup().click(details[0])

    const dialog = screen.getByRole('dialog', { name: 'Hunters' })
    expect(dialog).toHaveClass('simulation-details--foundational')
    expect(within(dialog).getByText('Output')).toBeInTheDocument()
    expect(within(dialog).getByText('1.00 Community / cycle')).toBeInTheDocument()
    expect(within(dialog).getByText('Base duration')).toBeInTheDocument()
    expect(within(dialog).getByText('3.00 seconds')).toBeInTheDocument()
    expect(within(dialog).getByText('Speed multiplier')).toBeInTheDocument()
    expect(within(dialog).getByText(/Log₁₀\(2\.00\)/)).toBeInTheDocument()
    expect(within(dialog).getByText('Current rate')).toBeInTheDocument()
    expect(within(dialog).getByText('0.66 Community / s')).toBeInTheDocument()
    expect(dialog).not.toHaveTextContent(
      'Influence heroic hunters to gather meat for your communities.',
    )
    expect(dispatchPlayer).not.toHaveBeenCalled()
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

  test('shows the live remaining duration in Education details', async () => {
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
    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Details' }),
    )

    const dialog = screen.getByRole('dialog', { name: 'Engineering' })
    expect(
      [...dialog.querySelectorAll('dt')].map((item) => item.textContent),
    ).toEqual([
      'Base duration',
      'Remaining duration',
      'Current progress',
    ])
    expect(within(dialog).getByText('Base duration')).toBeInTheDocument()
    expect(within(dialog).getByText('30s')).toBeInTheDocument()
    expect(within(dialog).getByText('Current progress')).toBeInTheDocument()
    expect(within(dialog).getByText('20%')).toBeInTheDocument()
    expect(within(dialog).getByText('Remaining duration')).toBeInTheDocument()
    expect(within(dialog).getByText('24s')).toBeInTheDocument()
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
  })

  test('keeps Railgun firing progress visible between volleys', async () => {
    renderSurface(accepted, inactiveRailgunFacts)

    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Space Age' }),
    )
    const railgunCard = screen.getByText('Railguns').closest('article')
    expect(railgunCard).not.toBeNull()
    const progressbars = within(railgunCard!).getAllByRole('progressbar')
    expect(progressbars).toHaveLength(2)
    expect(progressbars[0]).toHaveAccessibleName('Railgun charge')
    expect(progressbars[1]).toHaveAccessibleName(
      'Railgun firing progress',
    )
    expect(progressbars[1]).toHaveAttribute('value', '0')
    expect(progressbars[1]).toHaveTextContent('0.00 shots remaining')
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

describe('SimulationTimeControl', () => {
  test('describes the selected rate as additional Simulation speed', () => {
    const dispatchPlayer = vi.fn(accepted)
    const { rerender } = renderTimeControl(0, dispatchPlayer)

    expect(
      screen.getByText('Simulation speed increased by 0%'),
    ).toBeInTheDocument()
    expect(screen.queryByText('0x')).not.toBeInTheDocument()

    rerender(timeControl(3, dispatchPlayer))
    expect(
      screen.getByText('Simulation speed increased by 300%'),
    ).toBeInTheDocument()
  })
})

function renderTimeControl(
  rate: number,
  dispatchPlayer: SimulationsSurfaceProps['dispatchPlayer'],
) {
  return render(timeControl(rate, dispatchPlayer))
}

function timeControl(
  rate: number,
  dispatchPlayer: SimulationsSurfaceProps['dispatchPlayer'],
) {
  return (
    <PresentationIntlProvider
      locale="en"
      messages={enCatalog as unknown as SharedMessageCatalog}
    >
      <SimulationTimeControl
        locale="en"
        bankSeconds={60}
        rate={rate}
        enabled
        available
        spaceAgeAvailable
        purchaseSettingsOpen={false}
        spaceAgePurchaseQuantity={1}
        onPurchaseSettingsOpenChange={vi.fn()}
        onSpaceAgePurchaseQuantityChange={vi.fn()}
        dispatchPlayer={dispatchPlayer}
      />
    </PresentationIntlProvider>
  )
}

function renderSurface(
  dispatchPlayer: SimulationsSurfaceProps['dispatchPlayer'] = accepted,
  renderedFacts: FrontendSimulationsDerivedFacts = facts,
  renderedProgression: FrontendCanonicalProgression['dream'] = progression,
) {
  return render(
    <PresentationIntlProvider
      locale="en"
      messages={enCatalog as unknown as SharedMessageCatalog}
    >
      <SimulationsSurface
        locale="en"
        facts={renderedFacts}
        progression={renderedProgression}
        previews={previews}
        influence={20n}
        spaceAgePurchaseQuantity={1}
        commandAvailability={{
          purchaseFoundational: true,
          purchaseSpaceAge: true,
          startEducation: true,
          blackHoleReset: true,
        }}
        dispatchPlayer={dispatchPlayer}
      />
    </PresentationIntlProvider>,
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
    automatic: { eligible: false, requestedReward: 0n },
    blackHole: { eligible: false, requestedReward: 0n },
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
      cost: 3n,
      code: 'purchasable',
      definitionGap: null,
    },
  ],
} as unknown as FrontendGameplayPreviews['dream']

if (!facts.live.production.ok) {
  throw new Error('Simulation test facts require canonical production data.')
}
const foundationalProduction = facts.live.production.value

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
    blackHole: { eligible: true, requestedReward: 12n },
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
            maximumCharge: 25,
            shotIntervalSeconds: 2,
          },
        },
      },
    },
  },
} as unknown as FrontendSimulationsDerivedFacts

async function accepted(): Promise<UiRuntimePlayerCommandResult> {
  return {
    status: 'accepted',
    kind: 'transition',
    changed: true,
    activationRevision: { session: 1, state: 1 },
    stateRevision: 2,
  }
}
