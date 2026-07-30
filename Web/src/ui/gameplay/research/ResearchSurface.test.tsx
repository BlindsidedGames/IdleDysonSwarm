// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import axe from 'axe-core'
import { IntlProvider } from 'react-intl'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type {
  FrontendResearchCardPreview,
} from '../../../application/frontendSnapshot'
import type {
  UiRuntimePlayerCommandResult,
} from '../../runtime'
import { ResearchSurface } from './ResearchSurface'

afterEach(cleanup)

describe('ResearchSurface', () => {
  test('renders visible cards in canonical array order without facility-only controls', () => {
    renderSurface([
      card({
        researchId: 'research.science_boost',
        currentLevel: 2,
        currentEffect: 10,
        projectedEffect: 15,
      }),
      card({
        researchId: 'research.panel_lifetime_1',
        effectKind: 'panel-lifetime-seconds',
        perLevelEffect: 1,
      }),
      card({
        researchId: 'research.money_multiplier',
        visible: false,
      }),
      card({
        researchId: 'research.panel_lifetime_2',
        effectKind: 'panel-lifetime-seconds',
        perLevelEffect: 2,
        currentLevel: 1,
        maximumLevel: 1,
        selectedQuantity: 0n,
        affordableQuantity: 0n,
        eligible: false,
        code: 'already-maxed',
        maxed: true,
      }),
    ])

    const articles = screen.getAllByRole('article')
    expect(articles).toHaveLength(3)
    expect(articles[0]).toHaveTextContent('Science boosts 2.00')
    expect(articles[0]).toHaveTextContent('Boosting by 10% -> 15%')
    expect(articles[1]).toHaveTextContent('Durability Upgrade')
    expect(articles[1]).toHaveTextContent(
      'Increases Panel Lifetime by 1s',
    )
    expect(screen.queryByText('Cash boosts')).not.toBeInTheDocument()
    expect(
      screen.queryByRole('button', { name: 'Details' }),
    ).not.toBeInTheDocument()
    expect(document.querySelector('progress')).not.toBeInTheDocument()
    expect(screen.queryByText('????')).not.toBeInTheDocument()
    expect(screen.getByText('Purchased')).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Durability Upgrade is purchased',
      }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', {
        name: /Purchase Science boosts 2.00/,
      }),
    ).toHaveClass('ui-button--full-width')
    expect(
      articles[0].querySelector('[data-symbol="research-cost"]'),
    ).toBeInTheDocument()
    expect(
      articles[0].querySelector('[data-symbol="science"]'),
    ).not.toBeInTheDocument()
  })

  test('dispatches one ordinary canonical purchase while an activation is pending', async () => {
    let settle: ((result: UiRuntimePlayerCommandResult) => void) | undefined
    const dispatchPlayer = vi.fn(
      () =>
        new Promise<UiRuntimePlayerCommandResult>((resolve) => {
          settle = resolve
        }),
    )
    renderSurface(
      [card({ researchId: 'research.assembly_line_upgrade' })],
      dispatchPlayer,
    )

    const purchase = screen.getByRole('button', {
      name: /Purchase Assembly Line boosts 0.00/,
    })
    fireEvent.click(purchase)
    fireEvent.click(purchase)

    expect(dispatchPlayer).toHaveBeenCalledTimes(1)
    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'research.purchase',
      researchId: 'research.assembly_line_upgrade',
    })

    settle?.(accepted())
  })

  test('shows automatic state and routes footer buy settings canonically', async () => {
    const user = userEvent.setup()
    const dispatchPlayer = vi.fn(async () => accepted())
    renderSurface(
      [
        card({
          researchId: 'research.ai_manager_upgrade',
          automationActive: true,
        }),
      ],
      dispatchPlayer,
    )

    expect(screen.getByRole('button', {
      name: 'AI Manager boosts 0.00 is purchased automatically',
    })).toBeDisabled()
    expect(screen.getByText('Auto')).toBeInTheDocument()
    expect(
      document.querySelector('.research-surface__summary p'),
    ).toHaveTextContent('2.00K Researchers producing 22.0/s')

    await user.click(
      screen.getByRole('button', {
        name: 'Research purchase settings',
      }),
    )
    await user.click(screen.getByRole('button', { name: 'x10' }))
    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'research.set-buy-mode',
      buyMode: 'buy-10',
    })

    await user.click(
      screen.getByRole('checkbox', {
        name: 'Round bulk purchases to the next milestone',
      }),
    )
    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'research.set-rounded-bulk-buy',
      enabled: true,
    })
  })

  test('has no automated accessibility violations', async () => {
    const { container } = renderSurface([
      card(),
      card({
        researchId: 'research.science_boost',
        eligible: false,
        code: 'insufficient-science',
        affordableQuantity: 0n,
      }),
    ])

    const results = await axe.run(container, {
      rules: {
        // jsdom does not calculate the rendered theme colors.
        'color-contrast': { enabled: false },
      },
    })

    expect(results.violations).toEqual([])
  })
})

function renderSurface(
  cards: readonly FrontendResearchCardPreview[],
  dispatchPlayer = vi.fn(async () => accepted()),
) {
  return render(
    <IntlProvider locale="en">
      <ResearchSurface
        locale="en"
        cards={cards}
        researchers={2000}
        sciencePerSecond={22}
        buyMode="buy-1"
        roundedBulkBuy={false}
        purchaseRouteAvailable
        buyModeRouteAvailable
        roundedBulkRouteAvailable
        dispatchPlayer={dispatchPlayer}
      />
    </IntlProvider>,
  )
}

function card(
  overrides: Partial<FrontendResearchCardPreview> = {},
): FrontendResearchCardPreview {
  return {
    researchId: 'research.assembly_line_upgrade',
    eligible: true,
    code: 'purchasable',
    currentLevel: 0,
    maximumLevel: null,
    selectedQuantity: 1n,
    affordableQuantity: 1n,
    cost: 50000,
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
    ...overrides,
  }
}

function accepted(): UiRuntimePlayerCommandResult {
  return {
    status: 'accepted',
    kind: 'transition',
    changed: true,
    activationRevision: { session: 1, state: 1 },
    stateRevision: 2,
  }
}
