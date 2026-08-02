// @vitest-environment jsdom
/// <reference types="node" />

import '@testing-library/jest-dom/vitest'
import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
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
import { IntlProvider } from 'react-intl'
import {
  afterEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import {
  BasicFacilityRegion,
  type BasicFacilityCanonicalFact,
  type BasicFacilityRegionProps,
  type EarlyBasicFacilityId,
} from './BasicFacilityRegion'
import { interpolatePublishedFacilityProgress } from './progressInterpolation'

const facilitiesCss = readFileSync(
  resolve(process.cwd(), 'src/ui/gameplay/facilities/facilities.css'),
  'utf8',
)
const facilitySource = readFileSync(
  resolve(
    process.cwd(),
    'src/ui/gameplay/facilities/BasicFacilityRegion.tsx',
  ),
  'utf8',
)

afterEach(() => {
  cleanup()
  vi.unstubAllGlobals()
})

const outputByFacility = {
  assembly_lines: 'bots',
  ai_managers: 'assembly_lines',
  servers: 'ai_managers',
  data_centers: 'servers',
  planets: 'data_centers',
} as const

function facilityFact(
  facilityId: EarlyBasicFacilityId,
  automatic = 0,
  manual = 0,
  perSecond = 0,
  progress = 0,
): BasicFacilityCanonicalFact {
  return {
    facilityId,
    ownership: {
      automatic,
      manual,
      total: automatic + manual,
    },
    production: {
      outputFacilityId: outputByFacility[facilityId],
      perSecond,
      secondsPerUnit: perSecond > 0 ? 1 / perSecond : null,
    },
    productionProgress: {
      visible: perSecond > 0,
      normalized: progress,
    },
    details: {
      baseProductionPerSecond: 0.1,
      effectiveProducerCount: automatic + manual,
      modifier: 1,
      contributions: [
        {
          sourceId: 'base',
          displayRole: 'base',
          operation: 'override',
          value: 0.1,
          delta: 0.1,
          runningTotal: 0.1,
        },
        {
          sourceId: 'facility-count',
          displayRole: 'producer-count',
          operation: 'multiply',
          value: automatic + manual,
          delta: automatic + manual - 0.1,
          runningTotal: automatic + manual,
          automaticManualTuple: [automatic, manual],
        },
      ],
      upstreamSources:
        facilityId === 'assembly_lines'
          ? [
              {
                sourceFacilityId: 'ai_managers',
                contributionPerSecond: 0.05,
              },
            ]
          : [],
    },
  }
}

const facilityFacts: BasicFacilityRegionProps['facilityFacts'] = {
  assembly_lines: facilityFact('assembly_lines'),
  ai_managers: facilityFact('ai_managers'),
  servers: facilityFact('servers'),
  data_centers: facilityFact('data_centers'),
  planets: facilityFact('planets'),
}

const purchasePreviews: BasicFacilityRegionProps['purchasePreviews'] = [
  {
    facilityId: 'assembly_lines',
    eligible: true,
    selectedQuantity: 38n,
    affordableQuantity: 38n,
    cost: 869_008.0130797025,
    status: 'success',
  },
  {
    facilityId: 'ai_managers',
    eligible: true,
    selectedQuantity: 47n,
    affordableQuantity: 47n,
    cost: 365_389_924.8540463,
    status: 'success',
  },
  {
    facilityId: 'servers',
    eligible: false,
    selectedQuantity: 0n,
    affordableQuantity: 0n,
    cost: 0,
    status: 'locked',
  },
  {
    facilityId: 'data_centers',
    eligible: false,
    selectedQuantity: 0n,
    affordableQuantity: 0n,
    cost: 0,
    status: 'locked',
  },
  {
    facilityId: 'planets',
    eligible: false,
    selectedQuantity: 0n,
    affordableQuantity: 0n,
    cost: 0,
    status: 'locked',
  },
]

const defaultRevision = {
  session: 1,
  state: 3,
}

describe('BasicFacilityRegion', () => {
  it('continuously extrapolates from the latest published progress', () => {
    expect(
      interpolatePublishedFacilityProgress(0.2, 1, 50),
    ).toBeCloseTo(0.25)
    expect(
      interpolatePublishedFacilityProgress(0.98, 0.5, 100),
    ).toBeCloseTo(0.03)
    expect(
      interpolatePublishedFacilityProgress(0.2, 1, 500),
    ).toBeCloseTo(0.7)
    expect(
      interpolatePublishedFacilityProgress(1, 50, 100),
    ).toBe(1)
  })

  it('renders the canonical Fresh collection as no named cards plus one teaser', () => {
    renderRegion({
      visibleBasicFacilityIds: [],
      showNextTierTeaser: true,
    })

    expect(screen.getByRole('heading', {
      name: 'Facilities',
      level: 2,
    })).toHaveClass('basic-facility-region__heading')
    expect(screen.queryAllByRole('article')).toHaveLength(0)
    expect(screen.getByText('????')).toBeInTheDocument()
    expect(screen.queryByText('Assembly Lines')).not.toBeInTheDocument()
    expect(screen.queryByText('AI Managers')).not.toBeInTheDocument()
  })

  it('renders the 10-bot projection as Assembly Lines only followed by the teaser', () => {
    const { container } = renderRegion({
      visibleBasicFacilityIds: ['assembly_lines'],
      showNextTierTeaser: true,
    })

    const articles = screen.getAllByRole('article')
    expect(articles).toHaveLength(1)
    expect(articles[0]).toHaveAccessibleName(
      'Assembly Lines 0.00(0.00)',
    )
    expect(within(articles[0]).getByText(
      'Purchase an Assembly Line',
    )).toBeInTheDocument()
    const purchase = within(articles[0]).getByRole('button', {
      name: /^Purchase an Assembly Line:/,
    })
    expect(
      purchase.querySelector(
        '.basic-facility-card__purchase-quantity',
      ),
    ).toHaveTextContent('+38.0')
    expect(
      purchase.querySelector(
        '.basic-facility-card__purchase-cost',
      ),
    ).toHaveTextContent('$869K')
    expect(
      purchase.querySelector(
        '.basic-facility-card__purchase-cost',
      ),
    ).toHaveAttribute('title', '869,008.0130797025')
    expect(screen.queryByText('AI Managers')).not.toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toContainElement(articles[0])
    expect(items[1]).toContainElement(screen.getByText('????'))
    expect(container.querySelector('.basic-facility-region'))
      .toHaveAttribute('data-visible-facility-count', '1')
  })

  it('preserves checkpoint order and exact canonical card values', () => {
    renderRegion({
      visibleBasicFacilityIds: [
        'assembly_lines',
        'ai_managers',
      ],
      showNextTierTeaser: true,
      facilityFacts: {
        ...facilityFacts,
        assembly_lines: facilityFact(
          'assembly_lines',
          7,
          5,
          4.25,
        ),
        ai_managers: facilityFact('ai_managers', 2, 3, 0.5),
      },
    })

    const articles = screen.getAllByRole('article')
    expect(articles.map((article) =>
      article.getAttribute('aria-label') ??
      article.getAttribute('aria-labelledby'),
    )).toHaveLength(2)
    expect(articles[0]).toHaveAccessibleName(
      'Assembly Lines 12.0(5.00)',
    )
    expect(articles[1]).toHaveAccessibleName(
      'AI Managers 5.00(3.00)',
    )
    const assembly = within(articles[0])
    const identity = assembly.getByTitle(
      'Assembly Lines 12.0(5.00)',
    )
    expect(identity).toHaveTextContent(
      'Assembly Lines 12.0(5.00)',
    )
    expect(identity.querySelector('.basic-facility-card__name'))
      .toHaveTextContent('Assembly Lines')
    expect(identity.querySelector('.basic-facility-card__total'))
      .toHaveTextContent('12.0')
    expect(identity.querySelector('.basic-facility-card__total'))
      .toHaveAttribute('value', '12')
    expect(identity.querySelector('.basic-facility-card__manual'))
      .toHaveTextContent('(5.00)')
    expect(identity.querySelector('.basic-facility-card__manual'))
      .toHaveAttribute('value', '5')
    expect(assembly.getByText('Producing 4.25 Bots /s'))
      .toBeInTheDocument()
    expect(
      within(articles[1]).getByText(
        'Generating 1 Assembly Line /2.00s',
      ),
    ).toBeInTheDocument()
    expect(assembly.getByText('+38.0').closest('data'))
      .toHaveAttribute('value', '38')
    expect(
      assembly.getByText('$869K').closest('data'),
    ).toHaveAttribute('value', '869008.0130797025')
    for (const rejectedLabel of [
      'Facilities',
      'Owned',
      'Selected quantity',
      'Affordable quantity',
      'Cost',
      'Available',
      'Unavailable',
    ]) {
      expect(
        within(articles[0]).queryByText(rejectedLabel),
      ).not.toBeInTheDocument()
    }
  })

  it('renders canonical production progress without deriving it in the card', () => {
    renderRegion({
      visibleBasicFacilityIds: [
        'assembly_lines',
        'ai_managers',
      ],
      facilityFacts: {
        ...facilityFacts,
        assembly_lines: facilityFact(
          'assembly_lines',
          1,
          0,
          0.1,
          0.625,
        ),
        ai_managers: facilityFact('ai_managers'),
      },
    })

    expect(screen.getByRole('progressbar', {
      name: 'Assembly Lines production',
    })).toHaveAttribute('value', '0.625')
    expect(screen.getAllByRole('progressbar')).toHaveLength(1)
    expect(
      document.querySelectorAll(
        '.basic-facility-card__progress-track',
      ),
    ).toHaveLength(2)
  })

  it('holds published progress when reduced motion is requested', () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({
      matches: true,
      media: '(prefers-reduced-motion: reduce)',
      onchange: null,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })))
    renderRegion({
      visibleBasicFacilityIds: ['assembly_lines'],
      facilityFacts: {
        ...facilityFacts,
        assembly_lines: facilityFact(
          'assembly_lines',
          1,
          0,
          1,
          0.2,
        ),
      },
    })

    expect(screen.getByRole('progressbar', {
      name: 'Assembly Lines production',
    })).toHaveAttribute('value', '0.2')
  })

  it('traps modal focus, isolates background, and restores focus on every close path', async () => {
    const user = userEvent.setup()
    const assemblyFact = facilityFact(
      'assembly_lines',
      1,
      1,
      0.1,
    )
    const { container } = renderRegion({
      visibleBasicFacilityIds: ['assembly_lines'],
      facilityFacts: {
        ...facilityFacts,
        assembly_lines: {
          ...assemblyFact,
          details: {
            ...assemblyFact.details,
            contributions: [
              ...(assemblyFact.details.contributions ?? []),
              {
                sourceId: 'facility-modifier',
                displayRole: 'modifier',
                operation: 'multiply',
                value: 1.5,
                delta: 1,
                runningTotal: 3,
                conditionIdentifier: 'skill.unlocked',
              },
              {
                sourceId: 'effect.additive',
                displayRole: 'output-adjustments',
                operation: 'add',
                value: 2,
                delta: 2,
                runningTotal: 5,
                condition: 'Unlocked label',
              },
              {
                sourceId: 'effect.power',
                displayRole: 'output-adjustments',
                operation: 'power',
                value: 2,
                delta: 20,
                runningTotal: 25,
              },
              {
                sourceId: 'effect.minimum',
                displayRole: 'output-adjustments',
                operation: 'clamp-min',
                value: 0,
                delta: 0,
                runningTotal: 25,
              },
              {
                sourceId: 'effect.maximum',
                displayRole: 'output-adjustments',
                operation: 'clamp-max',
                value: 10,
                delta: -15,
                runningTotal: 10,
              },
            ],
          },
        },
      },
    })

    const detailsButton = screen.getByRole('button', {
      name: 'Details',
    })
    await user.click(detailsButton)

    const dialog = screen.getByRole('dialog', {
      name: 'Assembly Lines',
    })
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(within(dialog).getByText('Base')).toBeInTheDocument()
    expect(within(dialog).getByText('Assembly Lines Count'))
      .toBeInTheDocument()
    expect(within(dialog).getByText(
      'Automatic 1.00, manually purchased 1.00',
    ))
      .toBeInTheDocument()
    expect(within(dialog).getByText('Facility modifier'))
      .toBeInTheDocument()
    expect(within(dialog).getByText('×1.50'))
      .toBeInTheDocument()
    expect(within(dialog).getByText('+1.00'))
      .toBeInTheDocument()
    expect(within(dialog).getByText('3.00'))
      .toBeInTheDocument()
    expect(within(dialog).getByText(
      'Condition identifier: skill.unlocked',
    ))
      .toBeInTheDocument()
    expect(within(dialog).getByText('Condition: Unlocked label'))
      .toBeInTheDocument()
    expect(
      Array.from(
        dialog.querySelectorAll(
          '.facility-details-dialog__operation',
        ),
        (element) => element.textContent,
      ),
    ).toEqual([
      '=0.10',
      '×2.00',
      '×1.50',
      '+2.00',
      '^2.00',
      '≥0.00',
      '≤10.0',
    ])
    expect(within(dialog).getByText('effect.additive'))
      .toBeInTheDocument()
    expect(within(dialog).getByText('Upstream Sources'))
      .toBeInTheDocument()
    expect(
      within(dialog).getByText('Produced by AI Managers (0.05)'),
    ).toBeInTheDocument()
    expect(within(dialog).getByLabelText(
      'Effect, Value, positive or negative Delta, Total',
    )).toBeInTheDocument()
    expect(screen.getAllByRole('dialog')).toHaveLength(1)
    expect(screen.getByRole('button', { name: 'Close' }))
      .toHaveFocus()
    expect(container).toHaveAttribute('inert')

    await user.tab()
    expect(screen.getByRole('button', { name: 'Close' }))
      .toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'Close' }))
      .toHaveFocus()

    expect((
      await axe.run(dialog, {
        rules: {
          'color-contrast': { enabled: false },
          region: { enabled: false },
        },
      })
    ).violations).toEqual([])

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(detailsButton).toHaveFocus()
    expect(container).not.toHaveAttribute('inert')

    await user.click(detailsButton)
    const backdrop = document.querySelector(
      '.facility-details-dialog__backdrop',
    )
    expect(backdrop).not.toBeNull()
    fireEvent.pointerDown(backdrop!)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(detailsButton).toHaveFocus()
    expect(container).not.toHaveAttribute('inert')
  })

  it('keeps every backend-hidden facility absent from the accessibility tree', () => {
    renderRegion({
      visibleBasicFacilityIds: ['assembly_lines'],
      showNextTierTeaser: false,
    })

    for (const hiddenName of [
      'AI Managers',
      'Servers',
      'Data Centers',
      'Planets',
    ]) {
      expect(
        screen.queryByRole('article', { name: hiddenName }),
      ).not.toBeInTheDocument()
      expect(screen.queryByText(hiddenName)).not.toBeInTheDocument()
    }
    expect(screen.queryByText('????')).not.toBeInTheDocument()
  })

  it('fails the snapshot invariant when a visible facility has no canonical preview', () => {
    const missingAssemblyPreview = purchasePreviews.filter(
      (preview) => preview.facilityId !== 'assembly_lines',
    )

    expect(() =>
      renderRegion({
        visibleBasicFacilityIds: ['assembly_lines'],
        purchasePreviews: missingAssemblyPreview,
      }),
    ).toThrow(
      "Basic facility presentation invariant failed: visible 'assembly_lines' has no purchase preview.",
    )
    expect(
      screen.queryByRole('article', { name: /Assembly Lines/ }),
    ).not.toBeInTheDocument()
  })

  it('uses canonical eligibility and exposes only a hidden localized reason', () => {
    const ineligiblePreviews = purchasePreviews.map((preview) =>
      preview.facilityId === 'assembly_lines'
        ? {
            ...preview,
            eligible: false,
            status: 'insufficient-funds' as const,
          }
        : preview,
    )
    const { rerender } = renderRegion({
      visibleBasicFacilityIds: ['assembly_lines'],
      purchasePreviews: ineligiblePreviews,
    })

    const disabledButton = screen.getByRole('button', {
      name: /^Purchase an Assembly Line:/,
    })
    expect(disabledButton).toBeDisabled()
    const reason = screen.getByText(
      'Not enough Cash for this purchase. Affordable quantity: 38.',
    )
    expect(reason).toHaveClass(
      'basic-facility-card__availability',
    )
    expect(disabledButton).toHaveAccessibleDescription(
      'Not enough Cash for this purchase. Affordable quantity: 38.',
    )

    rerenderRegion(rerender, {
      visibleBasicFacilityIds: ['assembly_lines'],
      purchaseRouteAvailable: false,
    })
    expect(screen.getByRole('button', {
      name: /^Purchase an Assembly Line:/,
    })).toBeDisabled()
    expect(screen.getByRole('button', {
      name: /^Purchase an Assembly Line:/,
    })).toHaveAccessibleDescription('Purchase unavailable.')
  })

  it('does not publish feedback from an older in-flight revision', async () => {
    const pending = deferred<UiRuntimePlayerCommandResult>()
    const { rerender } = renderRegion({
      visibleBasicFacilityIds: ['assembly_lines'],
      dispatchPlayer: vi.fn(() => pending.promise),
    })
    const user = userEvent.setup()
    await user.click(screen.getByRole('button', {
      name: /^Purchase an Assembly Line:/,
    }))

    rerenderRegion(rerender, {
      visibleBasicFacilityIds: ['assembly_lines'],
      revision: { session: 1, state: 9 },
      dispatchPlayer: vi.fn(() => pending.promise),
    })
    await act(async () => {
      pending.resolve(acceptedResult(4))
      await pending.promise
    })

    expect(
      screen.queryByText('Purchase completed.'),
    ).not.toBeInTheDocument()
  })

  it('appends exactly one non-interactive teaser after the final visible card', () => {
    const { rerender } = renderRegion({
      visibleBasicFacilityIds: [
        'assembly_lines',
        'ai_managers',
      ],
      showNextTierTeaser: true,
    })

    const list = screen.getByRole('list')
    const items = within(list).getAllByRole('listitem')
    const teaser = screen.getByTestId(
      'basic-facility-next-tier-teaser',
    )
    expect(screen.getAllByText('????')).toHaveLength(1)
    expect(items.at(-1)).toBe(teaser)
    expect(within(teaser).queryByRole('button')).not.toBeInTheDocument()
    expect(teaser).not.toHaveAttribute('tabindex')

    rerenderRegion(rerender, {
      visibleBasicFacilityIds: ['assembly_lines'],
      showNextTierTeaser: false,
    })
    expect(screen.queryByText('????')).not.toBeInTheDocument()
  })

  it('dispatches the public purchase command once and gives immediate pending feedback', async () => {
    const pending = deferred<UiRuntimePlayerCommandResult>()
    const dispatchPlayer = vi.fn(() => pending.promise)
    const user = userEvent.setup()
    renderRegion({
      visibleBasicFacilityIds: ['assembly_lines'],
      dispatchPlayer,
    })

    const button = screen.getByRole('button', {
      name: /^Purchase an Assembly Line:/,
    })
    await user.click(button)
    expect(dispatchPlayer).toHaveBeenCalledTimes(1)
    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'dyson.purchase-basic-facility',
      facilityId: 'assembly_lines',
    })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(screen.getByRole('status')).toHaveTextContent(
      'Purchase pending…',
    )

    await user.click(button)
    expect(dispatchPlayer).toHaveBeenCalledTimes(1)

    await act(async () => {
      pending.resolve(acceptedResult(4))
      await pending.promise
    })
    expect(screen.getByRole('status')).toHaveTextContent(
      'Purchase completed.',
    )
  })

  it('allows distinct safe purchases to queue independently', async () => {
    const assembly = deferred<UiRuntimePlayerCommandResult>()
    const manager = deferred<UiRuntimePlayerCommandResult>()
    const dispatchPlayer = vi.fn(
      (command: { facilityId: EarlyBasicFacilityId }) =>
        command.facilityId === 'assembly_lines'
          ? assembly.promise
          : manager.promise,
    )
    const user = userEvent.setup()
    renderRegion({
      visibleBasicFacilityIds: [
        'assembly_lines',
        'ai_managers',
      ],
      dispatchPlayer,
    })

    await user.click(screen.getByRole('button', {
      name: /^Purchase an Assembly Line:/,
    }))
    await user.click(screen.getByRole('button', {
      name: /^Purchase an AI Manager:/,
    }))

    expect(dispatchPlayer).toHaveBeenCalledTimes(2)
    expect(screen.getAllByText('Purchase pending…')).toHaveLength(2)

    await act(async () => {
      assembly.resolve(acceptedResult(4))
      manager.resolve(acceptedResult(5))
      await Promise.all([assembly.promise, manager.promise])
    })
  })

  it.each([
    {
      name: 'stale',
      result: rejectedResult(true, 'private stale detail'),
      message: 'Values changed. Review and try again.',
    },
    {
      name: 'rejected',
      result: rejectedResult(false, 'private rejection detail'),
      message: 'Purchase not completed.',
    },
    {
      name: 'runtime failure',
      result: failedResult('private runtime detail'),
      message: 'Purchase unavailable.',
    },
  ])('shows safe $name feedback without private reasons', async ({
    result,
    message,
  }) => {
    const user = userEvent.setup()
    renderRegion({
      visibleBasicFacilityIds: ['assembly_lines'],
      dispatchPlayer: vi.fn().mockResolvedValue(result),
    })

    await user.click(screen.getByRole('button', {
      name: /^Purchase an Assembly Line:/,
    }))
    expect(screen.getByRole(
      result.status === 'rejected' && result.stale
        ? 'status'
        : 'alert',
    )).toHaveTextContent(message)
    expect(screen.queryByText(/private/i)).not.toBeInTheDocument()
  })

  it('clears settled feedback when its authoritative revision is replaced', async () => {
    const user = userEvent.setup()
    const { rerender } = renderRegion({
      visibleBasicFacilityIds: ['assembly_lines'],
      dispatchPlayer: vi.fn().mockResolvedValue(acceptedResult(4)),
    })

    await user.click(screen.getByRole('button', {
      name: /^Purchase an Assembly Line:/,
    }))
    expect(screen.getByText('Purchase completed.')).toBeInTheDocument()

    rerenderRegion(rerender, {
      visibleBasicFacilityIds: ['assembly_lines'],
      revision: { session: 1, state: 4 },
    })
    expect(screen.getByText('Purchase completed.')).toBeInTheDocument()

    rerenderRegion(rerender, {
      visibleBasicFacilityIds: ['assembly_lines'],
      revision: { session: 1, state: 5 },
    })
    expect(
      screen.queryByText('Purchase completed.'),
    ).not.toBeInTheDocument()
  })

  it('supports RTL source order, native keyboard activation, and axe basics', async () => {
    const dispatchPlayer = vi.fn().mockResolvedValue(acceptedResult(4))
    const user = userEvent.setup()
    const { container } = renderRegion({
      visibleBasicFacilityIds: [
        'assembly_lines',
        'ai_managers',
      ],
      showNextTierTeaser: true,
      dispatchPlayer,
      direction: 'rtl',
    })

    const articles = screen.getAllByRole('article')
    expect(articles[0]).toHaveAccessibleName(
      'Assembly Lines 0.00(0.00)',
    )
    expect(articles[1]).toHaveAccessibleName(
      'AI Managers 0.00(0.00)',
    )

    await user.tab()
    expect(screen.getByRole('button', {
      name: /^Purchase an Assembly Line:/,
    })).toHaveFocus()
    await user.keyboard('{Enter}')
    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'dyson.purchase-basic-facility',
      facilityId: 'assembly_lines',
    })

    const results = await axe.run(container, {
      rules: {
        'color-contrast': { enabled: false },
        region: { enabled: false },
      },
    })
    expect(results.violations).toEqual([])
  })

  it('keeps canonical order while allowing the ultra-wide Unity grid', () => {
    const { container, rerender } = renderRegion({
      visibleBasicFacilityIds: ['assembly_lines'],
    })
    const region = container.querySelector('.basic-facility-region')
    expect(region).toHaveAttribute('data-visible-facility-count', '1')

    rerenderRegion(rerender, {
      visibleBasicFacilityIds: [
        'assembly_lines',
        'ai_managers',
      ],
    })
    expect(region).toHaveAttribute('data-visible-facility-count', '2')
    expect(facilitySource).toContain(
      'data-visible-facility-count={visibleBasicFacilityIds.length}',
    )
    expect(facilitiesCss).toMatch(
      /\.basic-facility-region__grid\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\);/,
    )
    expect(facilitiesCss).toMatch(
      /@media \(min-width: 1600px\)[\s\S]*grid-template-columns:\s*repeat\(2,\s*minmax\(0,\s*1fr\)\);/,
    )
    expect(facilitiesCss).toMatch(
      /@media \(max-width: 359px\)[\s\S]*\.basic-facility-card\s*\{[\s\S]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*6\.25rem;/,
    )
    expect(facilitiesCss).not.toMatch(
      /@media \(max-width: 359px\)[\s\S]*\.ui-facility-card__action\s*\{[\s\S]*grid-row:\s*5;/,
    )
    expect(facilitiesCss).toMatch(
      /\.basic-facility-card__details-button:focus-visible,[\s\S]*\.facility-details-dialog__close:focus-visible\s*\{[\s\S]*outline:\s*3px solid var\(--color-focus\);/,
    )
    expect(facilitiesCss).toMatch(
      /\.basic-facility-card \.ui-button\s*\{[\s\S]*background:\s*#d1b6d7;/,
    )
    expect(facilitiesCss).toMatch(
      /\.basic-facility-card \.ui-button:disabled\s*\{[\s\S]*background:\s*#82618a;[\s\S]*color:\s*#0b080c;/,
    )
  })

  it('keeps localized visual pieces separate from the full accessible identity', () => {
    const { container } = renderRegion({
      visibleBasicFacilityIds: ['assembly_lines'],
      facilityFacts: {
        ...facilityFacts,
        assembly_lines: facilityFact(
          'assembly_lines',
          7,
          5,
          4.25,
        ),
      },
      messages: {
        'dyson.facilities.assembly-lines.name':
          '[Expanded Assembly Name]',
        'dyson.facilities.assembly-lines.identity':
          '[Assembly identity: manual {manual}; total {total}]',
      },
      direction: 'rtl',
    })

    const article = screen.getByRole('article')
    expect(article).toHaveAccessibleName(
      '[Assembly identity: manual 5.00; total 12.0]',
    )
    expect(within(article).getByText('[Expanded Assembly Name]'))
      .toHaveClass('basic-facility-card__name')
    expect(
      container.querySelector('.basic-facility-card__total'),
    ).toHaveTextContent('12.0')
    expect(
      container.querySelector('.basic-facility-card__manual'),
    ).toHaveTextContent('(5.00)')
    expect(article).not.toHaveAccessibleName(
      '[Expanded Assembly Name] 12(5)',
    )
    expect(facilitiesCss).toMatch(
      /\.basic-facility-card__total\s*\{[\s\S]*?color:\s*var\(--color-accent-value\);/,
    )
    expect(facilitiesCss).toMatch(
      /\.basic-facility-card__manual\s*\{[\s\S]*?color:\s*var\(--color-positive\);/,
    )
  })
})

interface RenderOptions
  extends Partial<Omit<BasicFacilityRegionProps, 'dispatchPlayer'>> {
  readonly direction?: 'ltr' | 'rtl'
  readonly messages?: Readonly<Record<string, string>>
  readonly dispatchPlayer?: BasicFacilityRegionProps['dispatchPlayer']
}

function renderRegion(options: RenderOptions = {}) {
  const props = regionProps(options)
  return render(
    <div dir={options.direction ?? 'ltr'}>
      <IntlProvider
        locale="en"
        messages={options.messages}
        onError={() => undefined}
      >
        <BasicFacilityRegion {...props} />
      </IntlProvider>
    </div>,
  )
}

function rerenderRegion(
  rerender: ReturnType<typeof render>['rerender'],
  options: RenderOptions,
) {
  const props = regionProps(options)
  rerender(
    <div dir={options.direction ?? 'ltr'}>
      <IntlProvider
        locale="en"
        messages={options.messages}
        onError={() => undefined}
      >
        <BasicFacilityRegion {...props} />
      </IntlProvider>
    </div>,
  )
}

function regionProps(
  options: RenderOptions,
): BasicFacilityRegionProps {
  return {
    locale: options.locale ?? 'en',
    visibleBasicFacilityIds:
      options.visibleBasicFacilityIds ?? [],
    showNextTierTeaser: options.showNextTierTeaser ?? false,
    facilityFacts: options.facilityFacts ?? facilityFacts,
    purchasePreviews:
      options.purchasePreviews ?? purchasePreviews,
    purchaseRouteAvailable:
      options.purchaseRouteAvailable ?? true,
    revision: options.revision ?? defaultRevision,
    dispatchPlayer:
      options.dispatchPlayer ??
      vi.fn().mockResolvedValue(acceptedResult(4)),
    headingLevel: options.headingLevel,
  }
}

function acceptedResult(
  stateRevision: number,
): UiRuntimePlayerCommandResult {
  return {
    status: 'accepted',
    kind: 'transition',
    changed: true,
    stateRevision,
    activationRevision: {
      session: 1,
      state: 3,
    },
  }
}

function rejectedResult(
  stale: boolean,
  reason: string,
): UiRuntimePlayerCommandResult {
  return {
    status: 'rejected',
    kind: 'transition',
    code: stale ? 'SIM-STALE-REVISION' : 'dyson-basic:locked',
    reason,
    stale,
    stateRevision: 4,
    activationRevision: {
      session: 1,
      state: 3,
    },
  }
}

function failedResult(reason: string): UiRuntimePlayerCommandResult {
  return {
    status: 'failed',
    kind: 'runtime',
    code: 'RUNTIME-PLAYER-DISPATCH-FAILED',
    reason,
    retryable: false,
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((fulfill) => {
    resolve = fulfill
  })
  return { promise, resolve }
}
