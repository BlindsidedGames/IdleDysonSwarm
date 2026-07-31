// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
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
  breakInfinityTargetFromPresentationPosition,
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

afterEach(cleanup)

describe('InfinitySurface', () => {
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

    renderSurface({ shop, secrets: 5n })

    expect(screen.getByText('Infinity Points:')).toBeInTheDocument()
    expect(screen.getByText('8.00')).toBeInTheDocument()
    expect(screen.getByText('(2.00)')).toBeInTheDocument()
    expect(
      screen.getByText(
        'The meaning of life is: Love, ------- --- ------------',
      ),
    ).toBeInTheDocument()
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

  test('commits the logarithmic Break target through the coordinator', () => {
    const dispatchPlayer = vi.fn(async () => accepted())
    const position = Math.log10(1001)
    renderSurface({
      shop: [preview('secret')],
      derived: breakFacts(),
      dispatchPlayer,
    })

    const slider = screen.getByRole('slider', {
      name: 'Infinity Points before reset',
    })
    fireEvent.change(slider, { target: { value: String(position) } })
    fireEvent.pointerUp(slider)

    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'infinity.set-break-target',
      target: breakInfinityTargetFromPresentationPosition(position),
    })
    expect(
      screen.queryByRole('button', { name: 'Set target' }),
    ).not.toBeInTheDocument()
  })

  test('keeps the Break target absent during ordinary Infinity', () => {
    renderSurface({ shop: [preview('secret')] })

    expect(
      screen.queryByRole('slider', {
        name: 'Infinity Points before reset',
      }),
    ).not.toBeInTheDocument()
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
  readonly derived?: InfinityProgressFacts
  readonly dispatchPlayer?: InfinitySurfaceProps['dispatchPlayer']
}

function renderSurface({
  shop,
  secrets = 5n,
  derived = ordinaryFacts(),
  dispatchPlayer = vi.fn(async () => accepted()),
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
            infinity: { breakTarget: 42n },
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

function ordinaryFacts(): InfinityProgressFacts {
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

function breakFacts(): InfinityProgressFacts {
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
