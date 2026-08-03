// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import axe from 'axe-core'
import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type {
  FrontendGameplayDerivedFacts,
  FrontendGameplayPreviews,
  FrontendSimulationsDerivedFacts,
} from '../../../application/frontendSnapshot'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import enCatalog from '../../i18n/catalogs/compiled/en.json'
import type {
  SharedMessageCatalog,
} from '../../i18n/catalogs/types'
import { PresentationIntlProvider } from '../../i18n/PresentationIntlProvider'
import {
  RealitySurface,
  type RealitySurfaceProps,
} from './RealitySurface'

const realityStyles = readFileSync(
  join(process.cwd(), 'src', 'ui', 'gameplay', 'reality', 'reality.css'),
  'utf8',
)
const baseRealityStyles = realityStyles.split('@media (max-width: 30rem)')[0]

afterEach(() => {
  cleanup()
  localStorage.clear()
})

const derived = {
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
} as const satisfies FrontendGameplayDerivedFacts['reality']

const gatherPreview = {
  eligible: true,
  amount: 128n,
  code: 'success',
} as const satisfies FrontendGameplayPreviews['reality']['gatherInfluence']

const upgrades = [
  {
    upgradeId: 'translation1',
    eligible: true,
    cost: 8n,
    code: 'purchasable',
    definitionGap: null,
  },
  {
    upgradeId: 'translation2',
    eligible: false,
    cost: 16n,
    code: 'prerequisites_not_met',
    definitionGap: null,
  },
  {
    upgradeId: 'speed1',
    eligible: false,
    cost: 2048n,
    code: 'insufficient_strange_matter',
    definitionGap: null,
  },
  {
    upgradeId: 'doubleTimeOwned',
    eligible: true,
    cost: 5n,
    code: 'purchasable',
    definitionGap: null,
  },
] as const satisfies FrontendGameplayPreviews['reality']['upgrades']

test('uses the shared compact mobile upgrade hierarchy', () => {
  expect(baseRealityStyles).toMatch(
    /\.reality-surface__content\s*\{[^}]*gap:\s*var\(--game-card-grid-gap\);[^}]*padding-block:\s*var\(--game-card-content-inset\);/,
  )
  expect(baseRealityStyles).toMatch(
    /\.reality-upgrade-category ol,[\s\S]*gap:\s*var\(--game-card-grid-gap\);/,
  )
  expect(realityStyles).toMatch(
    /@media \(max-width: 30rem\)[\s\S]*\.reality-upgrades[^}]*[\s\S]*\.ui-collapsible-section__trigger\s*\{[^}]*min-block-size:\s*var\(--target-minimum\);[^}]*font-size:\s*calc\(0\.82rem \* var\(--game-text-scale\)\);/,
  )
  expect(baseRealityStyles).toMatch(
    /\.reality-upgrade-category > \.ui-collapsible-section__heading,[\s\S]*border-inline-start:\s*0\.22rem solid var\(--reality-upgrade-header\);/,
  )
  expect(baseRealityStyles).toMatch(
    /\.reality-upgrade-category,[\s\S]*\.reality-upgrade-subcategory\s*\{[^}]*margin-inline:\s*0\.18rem;/,
  )
  expect(baseRealityStyles).toMatch(
    /\.reality-upgrades[^}]*[\s\S]*\.ui-collapsible-section__trigger\s*\{[^}]*font-size:\s*calc\(1\.03rem \* var\(--game-text-scale\)\);/,
  )
  expect(baseRealityStyles).toMatch(
    /\.reality-upgrade-card\s*\{[^}]*min-block-size:\s*0;[^}]*grid-template-columns:\s*minmax\(0, 1fr\) 6rem;[\s\S]*\.reality-upgrade-card h4\s*\{[^}]*font-size:\s*calc\(0\.8rem \* var\(--game-text-scale\)\);/,
  )
})

const realityUpgradeSections = {
  translation: ['translation1'],
  speed: ['speed1'],
  qualityOfLife: ['doubleTimeOwned'],
} as const satisfies FrontendSimulationsDerivedFacts[
  'permanentUpgrades'
]['reality']

const simulationUpgrades = [
  {
    upgradeId: 'counterMeteor',
    eligible: true,
    cost: 3n,
    code: 'purchasable',
    definitionGap: null,
  },
] as const satisfies FrontendGameplayPreviews['dream']['upgrades']

const simulationUpgradeSections = {
  countermeasures: ['counterMeteor'],
  education: [],
  foundational: [],
  information: [],
  spaceAge: [],
} as const satisfies FrontendSimulationsDerivedFacts[
  'permanentUpgrades'
]['simulation']

describe('RealitySurface', () => {
  test('presents Unity worker facts and collapsed Reality_Content upgrade groups', async () => {
    const { container } = renderSurface()

    expect(
      screen.getByText('Universe Designation: 4'),
    ).toBeInTheDocument()
    const influenceBalance = screen.getByLabelText('Influence: 42.0')
    expect(influenceBalance).toHaveTextContent('42.0')
    expect(influenceBalance).not.toHaveTextContent('Influence')
    expect(
      influenceBalance.querySelector('[data-symbol="influence"]'),
    ).toHaveClass('ui-inline-image-symbol--tinted')
    const summary = container.querySelector('.reality-surface__summary')
    expect(summary).not.toBeNull()
    const summaryQueries = within(summary as HTMLElement)
    const strangeMatterBalance = summaryQueries.getByLabelText(
      'Strange Matter: 4.09K',
    )
    expect(
      strangeMatterBalance.querySelector('[data-symbol="strange-matter"]'),
    ).toHaveClass('ui-inline-image-symbol--tinted')
    expect(
      Array.from(
        summary?.querySelector('.reality-surface__balances')?.children ?? [],
      ),
    ).toEqual([strangeMatterBalance, influenceBalance])
    expect(
      screen.getByRole('button', { name: 'Simulation Upgrades' }),
    ).not.toHaveTextContent('4.09K')
    expect(
      screen.getByRole('button', { name: 'Reality Upgrades' }),
    ).not.toHaveTextContent('4.09K')
    const consumptionStatus = screen.getByText('Consumption Halted')
    expect(consumptionStatus).toBeInTheDocument()
    expect(
      consumptionStatus.querySelector('[data-symbol="influence"]'),
    ).not.toBeInTheDocument()
    expect(
      screen.queryByRole('progressbar', {
        name: 'Worker generation',
      }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('progressbar', {
        name: 'Workers ready',
      }),
    ).toHaveAttribute(
      'aria-valuetext',
      '128 of 128 workers ready',
    )
    expect(
      screen.getByText((_, element) =>
        element?.tagName === 'STRONG' &&
        element.textContent === '128/128',
      ),
    ).toBeInTheDocument()
    expect(
      screen
        .getByLabelText('128 of 128 workers ready')
        .querySelector('[data-symbol="influence"]'),
    ).toHaveClass('ui-inline-image-symbol--tinted')
    const simulationGroup = screen.getByRole('button', {
      name: /^Simulation Upgrades/,
    })
    const realityGroup = screen.getByRole('button', {
      name: /^Reality Upgrades/,
    })
    expect(simulationGroup).toHaveAttribute('aria-expanded', 'false')
    expect(realityGroup).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByText('Translation I')).not.toBeInTheDocument()

    await userEvent.setup().click(simulationGroup)
    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Countermeasures' }),
    )
    expect(screen.getByText('Counteract Meteor Storm')).toBeInTheDocument()

    await userEvent.setup().click(realityGroup)
    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Anomaly' }),
    )
    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Translation' }),
    )
    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Speed Reduction' }),
    )
    await userEvent.setup().click(
      screen.getByRole('button', { name: 'Quality of Life' }),
    )
    expect(screen.getByText('Translation I')).toBeInTheDocument()
    expect(
      screen.getByText('Enable Time Multiplier'),
    ).toBeInTheDocument()
    expect(screen.getByText('Speed Reduction I')).toBeInTheDocument()
    expect(screen.queryByText('Translation II')).not.toBeInTheDocument()
    expect(screen.queryByText('Quantum')).not.toBeInTheDocument()
  })

  test('dispatches Gather Influence only through the injected player command', async () => {
    const dispatchPlayer = vi.fn(accepted)
    renderSurface({ dispatchPlayer })

    await userEvent.setup().click(
      screen.getByRole('button', {
        name: 'Gather 128 Influence',
      }),
    )

    expect(dispatchPlayer).toHaveBeenCalledTimes(1)
    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'reality.gather-influence',
    })
  })

  test('blocks duplicate Gather commands while the first command is pending', () => {
    const pending = deferredResult()
    const dispatchPlayer = vi.fn(() => pending.promise)
    renderSurface({ dispatchPlayer })
    const gather = screen.getByRole('button', {
      name: 'Gather 128 Influence',
    })

    fireEvent.click(gather)
    fireEvent.click(gather)

    expect(dispatchPlayer).toHaveBeenCalledTimes(1)
    void accepted().then(pending.resolve)
  })

  test('announces a rejected Gather command without exposing private detail', async () => {
    const dispatchPlayer = vi.fn(async () => rejected())
    renderSurface({ dispatchPlayer })

    await userEvent.setup().click(
      screen.getByRole('button', {
        name: 'Gather 128 Influence',
      }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Influence was not gathered. Try again.',
    )
    expect(screen.queryByText('Private rejection detail.')).not.toBeInTheDocument()
  })

  test('disables Gather when its lifecycle route is unavailable', () => {
    renderSurface({ gatherRouteAvailable: false })

    expect(
      screen.getByRole('button', {
        name: 'Gather 128 Influence',
      }),
    ).toBeDisabled()
  })

  test('renders a concise failure state when Reality facts are invalid', () => {
    renderSurface({
      derived: {
        ...derived,
        status: 'invalid-state',
      },
    })

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Reality is temporarily unavailable.',
    )
    expect(
      screen.queryByRole('button', {
        name: 'Gather 128 Influence',
      }),
    ).not.toBeInTheDocument()
  })

  test('keeps gathering disabled until the canonical preview permits it', () => {
    renderSurface({
      derived: {
        ...derived,
        workerGenerationFillFraction: 0.5,
        workerBatchFillFraction: 0.5,
        consumptionStatus: 'running',
      },
      gatherPreview: {
        eligible: false,
        amount: 0n,
        code: 'insufficient-workers',
      },
      resources: {
        universeDesignationCount: 3n,
        workersReady: 64n,
        workerGenerationProgress: 0.5,
        influence: 42n,
      },
    })

    expect(
      screen.getByRole('button', {
        name: 'Gather 0.00 Influence',
      }),
    ).toBeDisabled()
    expect(screen.getByText('Consuming')).toBeInTheDocument()
    expect(
      screen.getByRole('progressbar', {
        name: 'Workers ready',
      }),
    ).toHaveAttribute('aria-valuenow', '50')
  })

  test('does not expose manual gathering while automatic gathering owns conversion', () => {
    renderSurface({
      derived: {
        ...derived,
        consumptionStatus: 'running',
        workerBatchFillFraction: 0.5,
        autoGatherEnabled: true,
      },
    })

    expect(
      screen.queryByRole('button', {
        name: 'Gather 128 Influence',
      }),
    ).not.toBeInTheDocument()
    expect(screen.getByText('Consuming')).toBeInTheDocument()
    expect(
      screen.getByRole('progressbar', {
        name: 'Workers ready',
      }),
    ).toHaveAttribute('aria-valuenow', '50')
  })

  test('renders the initial artifact speed as a solid fixed-step bar', () => {
    vi.useFakeTimers()
    try {
      const { container } = renderSurface()
      const artifact = container.querySelector<HTMLElement>(
        '.reality-artifact',
      )

      expect(artifact).not.toBeNull()
      expect(
        artifact?.style.getPropertyValue(
          '--reality-artifact-progress',
        ),
      ).toBe('1')

      act(() => vi.advanceTimersByTime(100))

      expect(
        artifact?.style.getPropertyValue(
          '--reality-artifact-progress',
        ),
      ).toBe('1')
    } finally {
      vi.useRealTimers()
    }
  })

  test('reveals slower artifact progress in Unity-style discrete steps', () => {
    vi.useFakeTimers()
    try {
      const { container } = renderSurface({
        derived: {
          ...derived,
          artifact: {
            ...derived.artifact,
            scrambleIntervalSeconds: 1 / 30,
          },
        },
      })
      const artifact = container.querySelector<HTMLElement>(
        '.reality-artifact',
      )
      const progress = () => artifact?.style.getPropertyValue(
        '--reality-artifact-progress',
      )

      expect(progress()).toBe('0.5')

      act(() => vi.advanceTimersByTime(17))
      expect(progress()).toBe('1')

      act(() => vi.advanceTimersByTime(17))
      expect(progress()).toBe('0.5')
    } finally {
      vi.useRealTimers()
    }
  })

  test('stops and empties the artifact bar after the final speed upgrade', () => {
    vi.useFakeTimers()
    try {
      const { container } = renderSurface({
        derived: {
          ...derived,
          artifact: {
            replacements: [],
            progressLabel: 'cpu-time',
            scrambleIntervalSeconds: null,
          },
        },
      })
      const artifact = container.querySelector<HTMLElement>(
        '.reality-artifact',
      )

      expect(screen.getByText('CPU Time')).toBeInTheDocument()
      expect(
        artifact?.style.getPropertyValue(
          '--reality-artifact-progress',
        ),
      ).toBe('0')

      act(() => vi.advanceTimersByTime(1_000))
      expect(
        artifact?.style.getPropertyValue(
          '--reality-artifact-progress',
        ),
      ).toBe('0')
    } finally {
      vi.useRealTimers()
    }
  })

  test('has no automated accessibility violations', async () => {
    const { container } = renderSurface()
    const user = userEvent.setup()
    await user.click(
      screen.getByRole('button', { name: /^Simulation Upgrades/ }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Countermeasures' }),
    )
    await user.click(
      screen.getByRole('button', { name: /^Reality Upgrades/ }),
    )
    await user.click(screen.getByRole('button', { name: 'Anomaly' }))
    await user.click(screen.getByRole('button', { name: 'Translation' }))
    await user.click(screen.getByRole('button', { name: 'Speed Reduction' }))
    await user.click(screen.getByRole('button', { name: 'Quality of Life' }))
    const results = await axe.run(container, {
      rules: {
        'color-contrast': { enabled: false },
      },
    })
    expect(results.violations).toEqual([])
  })

  test('dispatches upgrade purchases through the lifecycle command', async () => {
    const dispatchPlayer = vi.fn(accepted)
    renderSurface({ dispatchPlayer })

    const user = userEvent.setup()
    await user.click(
      screen.getByRole('button', { name: /^Reality Upgrades/ }),
    )
    await user.click(screen.getByRole('button', { name: 'Anomaly' }))
    await user.click(screen.getByRole('button', { name: 'Translation' }))
    const purchaseButton = screen.getByRole('button', {
        name: 'Purchase Translation I for 8.00 Strange Matter',
      })
    expect(
      purchaseButton.querySelector('[data-symbol="strange-matter"]'),
    ).toHaveClass('ui-inline-image-symbol--tinted')
    await user.click(purchaseButton)

    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'reality.purchase-upgrade',
      upgradeId: 'translation1',
    })
  })

  test('omits Reality Upgrades when every Reality upgrade is owned', () => {
    renderSurface({ upgrades: [] })

    expect(
      screen.queryByRole('button', { name: 'Reality Upgrades' }),
    ).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Simulation Upgrades' }),
    ).toBeInTheDocument()
  })

  test('dispatches permanent Simulation upgrades from Reality through the lifecycle command', async () => {
    const dispatchPlayer = vi.fn(accepted)
    renderSurface({ dispatchPlayer })

    const user = userEvent.setup()
    await user.click(
      screen.getByRole('button', { name: /^Simulation Upgrades/ }),
    )
    await user.click(
      screen.getByRole('button', { name: 'Countermeasures' }),
    )
    const purchaseButton = screen.getByRole('button', {
        name: 'Purchase Counteract Meteor Storm for 3.00 Strange Matter',
      })
    expect(
      purchaseButton.querySelector('[data-symbol="strange-matter"]'),
    ).toHaveClass('ui-inline-image-symbol--tinted')
    await user.click(purchaseButton)

    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'dream.purchase-upgrade',
      upgradeId: 'counterMeteor',
    })
  })

})

interface RenderOptions {
  readonly resources?: {
    readonly universeDesignationCount: bigint
    readonly workersReady: bigint
    readonly workerGenerationProgress: number
    readonly influence: bigint
  }
  readonly derived?: FrontendGameplayDerivedFacts['reality']
  readonly gatherPreview?:
    FrontendGameplayPreviews['reality']['gatherInfluence']
  readonly upgrades?: FrontendGameplayPreviews['reality']['upgrades']
  readonly simulationUpgrades?: FrontendGameplayPreviews['dream']['upgrades']
  readonly gatherRouteAvailable?: boolean
  readonly purchaseRouteAvailable?: boolean
  readonly dispatchPlayer?: RealitySurfaceProps['dispatchPlayer']
}

function renderSurface(options: RenderOptions = {}) {
  return render(
    <PresentationIntlProvider
      locale="en"
      messages={
        enCatalog as unknown as SharedMessageCatalog
      }
    >
      <RealitySurface
        locale="en"
        resources={
          options.resources ?? {
            universeDesignationCount: 3n,
            workersReady: 128n,
            workerGenerationProgress: 0.25,
            influence: 42n,
          }
        }
        derived={options.derived ?? derived}
        gatherPreview={options.gatherPreview ?? gatherPreview}
        upgrades={options.upgrades ?? upgrades}
        upgradeSections={realityUpgradeSections}
        simulationUpgrades={options.simulationUpgrades ?? simulationUpgrades}
        simulationUpgradeSections={simulationUpgradeSections}
        strangeMatter={4096n}
        gatherRouteAvailable={options.gatherRouteAvailable ?? true}
        purchaseRouteAvailable={
          options.purchaseRouteAvailable ?? true
        }
        simulationPurchaseRouteAvailable={true}
        avocatoUnlocked={false}
        onOpenAvocato={vi.fn()}
        dispatchPlayer={options.dispatchPlayer ?? accepted}
      />
    </PresentationIntlProvider>,
  )
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

function rejected(): UiRuntimePlayerCommandResult {
  return {
    status: 'rejected',
    kind: 'transition',
    code: 'REALITY-NOT-READY',
    reason: 'Private rejection detail.',
    stale: false,
    activationRevision: { session: 1, state: 1 },
    stateRevision: 2,
  }
}

function deferredResult() {
  let resolve!: (value: UiRuntimePlayerCommandResult) => void
  const promise = new Promise<UiRuntimePlayerCommandResult>(
    (fulfill) => {
      resolve = fulfill
    },
  )
  return { promise, resolve }
}
