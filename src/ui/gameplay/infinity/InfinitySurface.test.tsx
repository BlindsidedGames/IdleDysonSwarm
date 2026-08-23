// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import axe from 'axe-core'
import { IntlProvider } from 'react-intl'
import {
  afterEach,
  describe,
  expect,
  test,
  vi,
} from 'vitest'
import type {
  FrontendInfinityShopPreview,
} from '../../../application/frontendSnapshot'
import {
  projectBreakInfinityPresentationControl,
  type InfinityProgressFacts,
} from '../../../simulation/infinityCycle'
import type {
  UiRuntimePlayerCommandResult,
} from '../../runtime'
import {
  InfinitySurface,
  type InfinitySurfaceProps,
} from './InfinitySurface'

const infinityStyles = readFileSync(
  join(process.cwd(), 'src', 'ui', 'gameplay', 'infinity', 'infinity.css'),
  'utf8',
)
const baseInfinityStyles = infinityStyles.split('@media (max-width: 30rem)')[0]

afterEach(cleanup)

describe('InfinitySurface', () => {
  test('uses the compact Research-scale card hierarchy at every width', () => {
    expect(baseInfinityStyles).toMatch(
      /\.infinity-surface__shop\s*\{[^}]*padding-block:\s*var\(--game-card-content-inset\);/,
    )
    expect(baseInfinityStyles).toMatch(
      /\.infinity-surface__grid\s*\{[^}]*gap:\s*var\(--game-card-grid-gap\);/,
    )
    expect(baseInfinityStyles).toMatch(
      /\.infinity-shop-card\s*\{[^}]*min-block-size:\s*0;[^}]*grid-template-columns:\s*minmax\(0, 1fr\) 6rem;/,
    )
    expect(baseInfinityStyles).toMatch(
      /\.infinity-shop-card h2\s*\{[^}]*font-size:\s*calc\(0\.8rem \* var\(--game-text-scale\)\);/,
    )
    expect(baseInfinityStyles).toMatch(
      /\.infinity-shop-card p\s*\{[^}]*font-size:\s*calc\(0\.67rem \* var\(--game-text-scale\)\);/,
    )
  })

  test('renders canonical shop order, counters, phrase and prerequisite state', () => {
    const shop = [
      preview('secret'),
      preview('permanent-skill-point'),
      preview('unlock-research-automation'),
      preview('unlock-bot-automation'),
      preview('retain-assembly-lines'),
      preview('retain-ai-managers', {
        eligible: false,
        code: 'prerequisite-not-met',
      }),
      preview('retain-servers'),
      preview('retain-data-centers'),
      preview('retain-planets'),
    ]

    const { container } = renderSurface({ shop, secrets: 5n })

    expect(screen.getByText('Infinity Points:')).toBeInTheDocument()
    expect(screen.getByText('8.00')).toBeInTheDocument()
    expect(screen.getByText('(2.00)')).toBeInTheDocument()
    expect(
      screen.getByText(
        'The meaning of life is: Love, ------- --- ------------',
      ),
    ).toBeInTheDocument()
    expect(infinityStyles).toMatch(
      /\.infinity-surface__secret\s*\{[^}]*font-size:\s*clamp\(\s*0\.7rem,\s*3\.1vw,\s*calc\(0\.92rem \* var\(--game-text-scale\)\)[\s\S]*white-space:\s*nowrap;/,
    )
    expect(
      screen.getAllByRole('article').map((card) =>
        card.querySelector('h2')?.textContent,
      ),
    ).toEqual([
      'Secret of the Universe',
      'Permanent Skill Point',
      'Automate Research',
      'Automate Bots',
      'Start with 10 Assembly Lines',
      'Start with 10 AI Managers',
      'Start with 10 Servers',
      'Start with 10 Data Centers',
      'Start with 10 Planets',
    ])
    expect(screen.getByText('Purchased: 5.00')).toBeInTheDocument()
    expect(screen.getByText('Purchased: 2.00')).toBeInTheDocument()
    expect(
      screen.getByText('Requires Start with 10 Assembly Lines'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: /Purchase Start with 10 AI Managers/,
      }),
    ).toBeDisabled()
    expect(
      container.querySelectorAll('[data-symbol="infinity-point"]'),
    ).toHaveLength(shop.length)
    expect(screen.queryByText(/\bIP\b/)).not.toBeInTheDocument()
  })

  test('dispatches one canonical shop purchase while pending', async () => {
    let settle:
      | ((result: UiRuntimePlayerCommandResult) => void)
      | undefined
    const dispatchPlayer = vi.fn(
      () =>
        new Promise<UiRuntimePlayerCommandResult>((resolve) => {
          settle = resolve
        }),
    )
    renderSurface({
      shop: [preview('secret')],
      dispatchPlayer,
    })

    const purchase = screen.getByRole('button', {
      name: /Purchase Secret of the Universe/,
    })
    fireEvent.click(purchase)
    fireEvent.click(purchase)

    expect(dispatchPlayer).toHaveBeenCalledTimes(1)
    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'infinity.purchase-shop-item',
      itemId: 'secret',
    })

    settle?.(accepted())
  })

  test('shows completed states without inventing an enabled action', () => {
    renderSurface({
      shop: [
        preview('secret', {
          eligible: false,
          code: 'maximum-reached',
        }),
        preview('unlock-bot-automation', {
          eligible: false,
          code: 'already-purchased',
        }),
      ],
    })

    expect(
      screen.getByRole('button', {
        name: /Secret of the Universe.*Maxed/,
      }),
    ).toBeDisabled()
    expect(
      screen.getByRole('button', {
        name: 'Automate Bots: Purchased',
      }),
    ).toBeDisabled()
  })

  test('commits an exact Break target through the coordinator', () => {
    const dispatchPlayer = vi.fn(async () => accepted())
    renderSurface({
      shop: [preview('secret')],
      derived: breakFacts(),
      dispatchPlayer,
    })

    fireEvent.click(screen.getByRole('button', {
      name: 'Infinity settings',
    }))

    const input = screen.getByRole('textbox', {
      name: 'Infinity Points before reset',
    })
    fireEvent.change(input, { target: { value: '1.5K' } })
    fireEvent.click(screen.getByRole('button', { name: 'Set target' }))

    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'infinity.set-break-target',
      target: 1_500n,
    })
    expect(screen.getByText('Target: 42.0 IP')).toBeInTheDocument()
    expect(infinityStyles).toMatch(
      /\.infinity-break-target__range\s*\{[^}]*grid-row:\s*1;[^}]*text-align:\s*end;/s,
    )
    expect(infinityStyles).toMatch(
      /\.infinity-break-target input\s*\{[^}]*grid-row:\s*2;/s,
    )
    expect(infinityStyles).toMatch(
      /\.infinity-break-target__submit\s*\{[^}]*background:\s*var\(--infinity-accent\);[^}]*color:\s*#100a18;/s,
    )
  })

  test('keeps Break efficiency guidance inside the expanded settings', () => {
    const { container } = renderSurface({
      shop: [preview('secret')],
      derived: {
        ...breakFacts(),
        currentIpPerMinute: 15,
        peakIpPerMinute: 21.3,
        peakReward: 47n,
      },
    })

    expect(screen.queryByText('Current: 15.0 IP/min')).not.toBeInTheDocument()
    expect(screen.queryByText('Peak: 21.3 IP/min at 47.0 IP')).not.toBeInTheDocument()
    expect(
      screen.getByText('Bots until next Infinity Point: 1.00Sp'),
    ).toHaveClass('ui-visually-hidden')
    expect(screen.getByText('Next in 1.00Sp')).toBeVisible()
    expect(
      container.querySelector('.infinity-surface__reward-progress [data-symbol="infinity-point"]'),
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Infinity settings' }))

    const currentRate = screen.getByText('Current: 15.0 IP/min')
    expect(currentRate).toBeInTheDocument()
    expect(screen.getByText('Peak: 21.3 IP/min at 47.0 IP')).toBeInTheDocument()
    expect(currentRate.closest('.infinity-automatic-reset__copy')).toBeInTheDocument()
    expect(infinityStyles).not.toMatch(
      /\.infinity-break-target\s*\{[^}]*border-block-start:/s,
    )
  })

  test('keeps the saved Break target after invalid input', () => {
    renderSurface({ shop: [preview('secret')], derived: breakFacts() })
    fireEvent.click(screen.getByRole('button', { name: 'Infinity settings' }))

    const input = screen.getByRole('textbox', {
      name: 'Infinity Points before reset',
    })
    fireEvent.change(input, { target: { value: 'not infinity' } })
    fireEvent.blur(input)

    expect(screen.getByRole('alert')).toHaveTextContent(
      'Enter a whole number from 1 to 2.14B IP.',
    )
    expect(screen.getByText('Target: 42.0 IP')).toBeInTheDocument()
  })

  test('keeps the Break target absent during ordinary Infinity', () => {
    renderSurface({ shop: [preview('secret')] })

    fireEvent.click(screen.getByRole('button', {
      name: 'Infinity settings',
    }))

    expect(
      screen.queryByRole('textbox', {
        name: 'Infinity Points before reset',
      }),
    ).not.toBeInTheDocument()
  })

  test('toggles Auto Infinity before Break Infinity', () => {
    const dispatchPlayer = vi.fn(async () => accepted())
    renderSurface({ shop: [preview('secret')], dispatchPlayer })

    fireEvent.click(screen.getByRole('button', {
      name: 'Infinity settings',
    }))
    fireEvent.click(screen.getByRole('button', {
      name: 'Auto Infinity: On',
    }))

    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'infinity.set-automatic-reset',
      enabled: false,
    })
  })

  test('offers and dispatches a manual Infinity only when a manual run is ready', () => {
    const dispatchPlayer = vi.fn(async () => accepted())
    renderSurface({
      shop: [preview('secret')],
      automaticResetEnabled: false,
      derived: {
        ...ordinaryFacts(),
        progressFraction: 1,
        botsRemainingToReset: 0,
      },
      dispatchPlayer,
    })

    const manualInfinity = screen.getByRole('button', { name: 'Infinity' })
    expect(manualInfinity).toBeEnabled()
    fireEvent.click(manualInfinity)
    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'infinity.request-reset',
    })
  })

  test('allows manual Break Infinity before the automatic target and shows its reward', () => {
    const dispatchPlayer = vi.fn(async () => accepted())
    renderSurface({
      shop: [preview('secret')],
      automaticResetEnabled: false,
      derived: {
        ...breakFacts(),
        currentReward: 12n,
        breakTargetProgress: {
          targetReward: 42n,
          currentReward: 12n,
          fraction: 12 / 42,
        },
      },
      dispatchPlayer,
    })

    const button = screen.getByRole('button', {
      name: 'Infinity for 12.0 IP',
    })
    expect(button).toBeEnabled()
    expect(
      button.querySelector('[data-symbol="infinity-point"]'),
    ).toBeInTheDocument()
    expect(button).not.toHaveTextContent('Infinity for')
    expect(button).toHaveTextContent('12.0')
    fireEvent.click(button)
    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'infinity.request-reset',
    })
  })

  test('reserves the manual Infinity action while it is not ready', () => {
    renderSurface({ shop: [preview('secret')] })

    expect(screen.getByRole('button', { name: 'Infinity' })).toBeDisabled()
  })

  test('keeps the manual action beside the progress track without changing the row', () => {
    const { container } = renderSurface({
      shop: [preview('secret')],
      automaticResetEnabled: false,
      derived: {
        ...ordinaryFacts(),
        progressFraction: 1,
        botsRemainingToReset: 0,
      },
    })

    const progress = container.querySelector(
      '.infinity-surface__progress--manual-action',
    )
    const track = progress?.querySelector(
      '.infinity-surface__progress-track',
    )
    const action = progress?.querySelector('.infinity-manual-reset')

    expect(track).toBeInTheDocument()
    expect(action).toBeInTheDocument()
    if (!track || !action) {
      throw new Error('Manual Infinity progress layout is incomplete.')
    }
    expect(
      track.compareDocumentPosition(action) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(baseInfinityStyles).toMatch(
      /\.infinity-surface__progress--manual-action \.infinity-manual-reset\s*\{[^}]*position:\s*absolute;[^}]*inset-block-start:\s*50%;[^}]*inset-inline-end:\s*calc\([\s\S]*var\(--infinity-action-edge-safety\)[\s\S]*var\(--infinity-summary-inline-padding\)[\s\S]*\);[^}]*translateY\(-50%\);/,
    )
    expect(baseInfinityStyles).toMatch(
      /\.infinity-manual-reset button::before\s*\{[^}]*inset-block:\s*0\.22rem;[^}]*inset-inline:\s*0\.14rem;/,
    )
  })

  test('has no automated accessibility violations', async () => {
    const { container } = renderSurface({
      shop: [
        preview('secret'),
        preview('retain-ai-managers', {
          eligible: false,
          code: 'prerequisite-not-met',
        }),
      ],
      derived: breakFacts(),
    })

    const results = await axe.run(container, {
      rules: {
        // jsdom does not calculate the rendered theme colors.
        'color-contrast': { enabled: false },
      },
    })

    expect(results.violations).toEqual([])
  })
})

interface RenderOptions {
  readonly shop: readonly FrontendInfinityShopPreview[]
  readonly secrets?: bigint
  readonly derived?: InfinitySurfaceProps['derived']
  readonly dispatchPlayer?: InfinitySurfaceProps['dispatchPlayer']
  readonly automaticResetEnabled?: boolean
}

function renderSurface({
  shop,
  secrets = 5n,
  derived = ordinaryFacts(),
  dispatchPlayer = vi.fn(async () => accepted()),
  automaticResetEnabled = true,
}: RenderOptions) {
  return render(
    <IntlProvider locale="en">
      <InfinitySurface
        locale="en"
        resources={{
          points: 10n,
          spentPoints: 2n,
          availablePoints: 8n,
          secretsOfTheUniverse: secrets,
          permanentSkillPoints: 2n,
        }}
        progression={
          {
            infinity: {
              breakTarget: 42n,
              automaticResetEnabled,
            },
          } as InfinitySurfaceProps['progression']
        }
        derived={derived}
        previews={{
          shop,
          breakTarget: projectBreakInfinityPresentationControl(42n),
        }}
        commandAvailability={{
          purchaseShopItem: true,
          setBreakTarget: true,
          setAutomaticReset: true,
          requestReset: true,
        }}
        dispatchPlayer={dispatchPlayer}
      />
    </IntlProvider>,
  )
}

function preview(
  itemId: FrontendInfinityShopPreview['itemId'],
  overrides: Partial<FrontendInfinityShopPreview> = {},
): FrontendInfinityShopPreview {
  return {
    itemId,
    eligible: true,
    cost:
      itemId === 'unlock-bot-automation' ||
      itemId === 'unlock-research-automation'
        ? 3n
        : 1n,
    code: 'purchasable',
    definitionGap: null,
    ...overrides,
  }
}

function ordinaryFacts(): Extract<InfinityProgressFacts, { mode: 'ordinary' }> {
  return {
    mode: 'ordinary',
    currentReward: 1n,
    navigationReward: null,
    progressFraction: 0.5,
    resetThresholdBots: 4.2e19,
    botsRemainingToReset: 2.1e19,
    currentRewardThresholdBots: null,
    nextRewardThresholdBots: null,
    botsRemainingToNextReward: null,
    breakTargetProgress: null,
    showRealityWarning: false,
  }
}

function breakFacts(): Extract<InfinityProgressFacts, { mode: 'break' }> {
  return {
    mode: 'break',
    currentReward: 12n,
    navigationReward: 13n,
    progressFraction: 0.5,
    resetThresholdBots: 1e25,
    botsRemainingToReset: 5e24,
    currentRewardThresholdBots: 8e24,
    nextRewardThresholdBots: 9e24,
    botsRemainingToNextReward: 1e24,
    breakTargetProgress: {
      targetReward: 42n,
      currentReward: 12n,
      fraction: 12 / 42,
    },
    showRealityWarning: false,
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
