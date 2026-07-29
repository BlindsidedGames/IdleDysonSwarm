// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import axe from 'axe-core'
import {
  act,
  cleanup,
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
  type BasicFacilityRegionProps,
  type EarlyBasicFacilityId,
} from './BasicFacilityRegion'

afterEach(cleanup)

const facilityFacts: BasicFacilityRegionProps['facilityFacts'] = {
  assembly_lines: {
    owned: [0, 0],
    productionPerSecond: 0,
  },
  ai_managers: {
    owned: [0, 0],
    productionPerSecond: 0,
  },
  servers: {
    owned: [0, 0],
    productionPerSecond: 0,
  },
  data_centers: {
    owned: [0, 0],
    productionPerSecond: 0,
  },
  planets: {
    owned: [0, 0],
    productionPerSecond: 0,
  },
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
    renderRegion({
      visibleBasicFacilityIds: ['assembly_lines'],
      showNextTierTeaser: true,
    })

    const articles = screen.getAllByRole('article')
    expect(articles).toHaveLength(1)
    expect(articles[0]).toHaveAccessibleName(
      'Assembly Lines 0(0)',
    )
    expect(within(articles[0]).getByText(
      'Purchase an Assembly Line',
    )).toBeInTheDocument()
    expect(screen.queryByText('AI Managers')).not.toBeInTheDocument()
    const items = screen.getAllByRole('listitem')
    expect(items).toHaveLength(2)
    expect(items[0]).toContainElement(articles[0])
    expect(items[1]).toContainElement(screen.getByText('????'))
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
        assembly_lines: {
          owned: [7, 5],
          productionPerSecond: 4.25,
        },
        ai_managers: {
          owned: [2, 3],
          productionPerSecond: 0.5,
        },
      },
    })

    const articles = screen.getAllByRole('article')
    expect(articles.map((article) =>
      article.getAttribute('aria-label') ??
      article.getAttribute('aria-labelledby'),
    )).toHaveLength(2)
    expect(articles[0]).toHaveAccessibleName(
      'Assembly Lines 12(5)',
    )
    expect(articles[1]).toHaveAccessibleName(
      'AI Managers 5(3)',
    )
    const assembly = within(articles[0])
    expect(assembly.getByText('Assembly Lines 12(5)'))
      .toHaveAttribute('title', 'Assembly Lines 12(5)')
    expect(assembly.getByText('Producing 4.25 Bots /s'))
      .toBeInTheDocument()
    expect(
      within(articles[1]).getByText(
        'Generating 1 Assembly Line /2s',
      ),
    ).toBeInTheDocument()
    expect(assembly.getByText('+38').closest('data'))
      .toHaveAttribute('value', '38')
    expect(
      assembly.getByText('$869,008.0130797025').closest('data'),
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
      'Assembly Lines 0(0)',
    )
    expect(articles[1]).toHaveAccessibleName(
      'AI Managers 0(0)',
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
})

interface RenderOptions
  extends Partial<Omit<BasicFacilityRegionProps, 'dispatchPlayer'>> {
  readonly direction?: 'ltr' | 'rtl'
  readonly dispatchPlayer?: BasicFacilityRegionProps['dispatchPlayer']
}

function renderRegion(options: RenderOptions = {}) {
  const props = regionProps(options)
  return render(
    <div dir={options.direction ?? 'ltr'}>
      <IntlProvider locale="en" onError={() => undefined}>
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
      <IntlProvider locale="en" onError={() => undefined}>
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
