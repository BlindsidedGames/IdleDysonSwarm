// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
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
import {
  ResearchSurface,
  type ResearchSurfaceProps,
} from './ResearchSurface'
import {
  ResearchVisibilityPreferenceService,
  ResearchVisibilityProvider,
} from '../../research-visibility'

const researchStyles = readFileSync(
  join(
    process.cwd(),
    'src',
    'ui',
    'gameplay',
    'research',
    'research.css',
  ),
  'utf8',
)
const baseResearchStyles = researchStyles.split('@media (max-width: 720px)')[0]

afterEach(cleanup)

describe('ResearchSurface', () => {
  test('uses one checkbox size treatment for footer preferences', () => {
    expect(researchStyles).toMatch(
      /\.research-surface__rounded-bulk input,\s*\.research-surface__hide-completed input\s*\{[^}]*inline-size:\s*1\.25rem;[^}]*block-size:\s*1\.25rem;/,
    )
  })

  test('gives the mobile production summary more usable width', () => {
    expect(researchStyles).toMatch(
      /@media \(max-width: 720px\)[\s\S]*\.research-surface__summary p\s*\{[^}]*padding:\s*0\.25rem 0\.1rem;[^}]*font-size:\s*calc\(0\.88rem \* var\(--game-text-scale\)\);/,
    )
  })

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
    expect(articles[0]).toHaveTextContent('Boosting by 10% \u25b6 15%')
    const effectArrow = articles[0].querySelector(
      '.research-card__effect-arrow',
    )
    const effectValues = articles[0].querySelectorAll(
      '.research-card__value',
    )
    expect(effectArrow).toHaveTextContent('\u25b6')
    expect(researchStyles).toMatch(
      /\.research-card__effect-arrow\s*\{[^}]*color:\s*white;/s,
    )
    expect(effectValues.length).toBeGreaterThanOrEqual(2)
    expect(
      Array.from(effectValues).some((value) =>
        value.textContent?.includes('\u25b6'),
      ),
    ).toBe(false)
    expect(researchStyles).toMatch(
      /\.research-card__value\s*\{[^}]*color:\s*#00e1ff;/s,
    )
    expect(
      screen.getByLabelText(
        'Boosting increases from 10% to 15%',
      ),
    ).toBeInTheDocument()
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

  test('hides only maxed cards and explains when every available card is hidden', async () => {
    const user = userEvent.setup()
    const preference = new ResearchVisibilityPreferenceService({ storage: null })
    renderSurface([
      card({
        currentLevel: 1,
        maximumLevel: 1,
        maxed: true,
        eligible: false,
        code: 'already-maxed',
      }),
    ], undefined, preference)

    expect(screen.getByText('Purchased')).toBeInTheDocument()
    await user.click(screen.getByRole('button', {
      name: 'Research purchase settings',
    }))
    await user.click(screen.getByRole('checkbox', {
      name: 'Hide completed Research',
    }))

    expect(screen.queryByRole('article')).not.toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(
      'All currently available Research is completed and hidden.',
    )
  })

  test('moves focus to the next purchase when a completed card disappears', () => {
    const preference = new ResearchVisibilityPreferenceService({ storage: null })
    preference.setHideCompleted(true)
    const initialCards = [
      card({ researchId: 'research.assembly_line_upgrade' }),
      card({ researchId: 'research.ai_manager_upgrade' }),
    ]
    const view = renderSurface(initialCards, undefined, preference)
    const firstPurchase = screen.getByRole('button', {
      name: /Purchase Assembly Line boosts/,
    })
    firstPurchase.focus()
    expect(firstPurchase).toHaveFocus()

    view.rerender(surfaceElement([
      card({
        researchId: 'research.assembly_line_upgrade',
        currentLevel: 1,
        maximumLevel: 1,
        maxed: true,
        eligible: false,
        code: 'already-maxed',
      }),
      card({ researchId: 'research.ai_manager_upgrade' }),
    ], vi.fn(async () => accepted()), preference, initialCards.map(
      (entry) => entry.researchId,
    )))

    expect(screen.getByRole('button', {
      name: /Purchase AI Manager boosts/,
    })).toHaveFocus()
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
      document.querySelector('.ui-progress-controls-panel__summary p'),
    ).toHaveTextContent('2.00K Researchers producing 22.0/s')

    const settingsToggle = screen.getByRole('button', {
      name: 'Research purchase settings',
    })
    expect(
      settingsToggle.querySelector('[data-symbol="settings"]'),
    ).toBeInTheDocument()
    expect(settingsToggle).not.toHaveTextContent('⚙')
    await user.click(settingsToggle)
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

    await user.selectOptions(
      screen.getByRole('combobox', {
        name: 'Skill preset on opening Research',
      }),
      '1',
    )
    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'skill.set-tab-preset-automation',
      tab: 'research',
      slot: 1,
    })

    const automationToggle = screen.getByRole('checkbox', {
      name: 'AI Manager',
    })
    expect(automationToggle).toBeChecked()
    await user.click(automationToggle)
    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'research.set-automation',
      researchId: 'research.ai_manager_upgrade',
      enabled: false,
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

  test('communicates a saturated terminal price as maximum reached', () => {
    renderSurface([
      card({
        eligible: false,
        code: 'output-maxed',
        selectedQuantity: 1n,
        affordableQuantity: 0n,
        cost: Number.MAX_VALUE,
      }),
    ])

    expect(screen.getByRole('button', { name: /^Purchase / }))
      .toBeDisabled()
    expect(screen.getByRole('status')).toHaveTextContent('Maximum reached.')
    expect(screen.queryByText('Research was not purchased.'))
      .not.toBeInTheDocument()
  })

  test('toggles every visible automation setting toward one intended state', async () => {
    const user = userEvent.setup()
    const dispatchPlayer = vi.fn(async () => accepted())
    renderSurface(
      [
        card({
          researchId: 'research.assembly_line_upgrade',
          automationActive: true,
        }),
        card({
          researchId: 'research.ai_manager_upgrade',
          automationActive: false,
        }),
      ],
      dispatchPlayer,
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Research purchase settings',
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Toggle All' }))

    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'research.set-automation',
      researchId: 'research.assembly_line_upgrade',
      enabled: true,
    })
    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'research.set-automation',
      researchId: 'research.ai_manager_upgrade',
      enabled: true,
    })
    expect(dispatchPlayer).toHaveBeenCalledTimes(2)
  })

  test('keeps baseline research automation permanent and gates mega research by unlock', async () => {
    const user = userEvent.setup()
    const cards = [
      card({ researchId: 'research.assembly_line_upgrade', visible: false }),
      card({ researchId: 'research.planet_upgrade', visible: false }),
      card({ researchId: 'research.matrioshka_brains_upgrade', visible: false }),
      card({ researchId: 'research.birch_planets_upgrade', visible: false }),
    ]
    renderSurface(
      cards,
      vi.fn(async () => accepted()),
      new ResearchVisibilityPreferenceService({ storage: null }),
      [
        'research.assembly_line_upgrade',
        'research.planet_upgrade',
        'research.matrioshka_brains_upgrade',
      ],
    )

    await user.click(screen.getByRole('button', {
      name: 'Research purchase settings',
    }))

    expect(screen.getByRole('checkbox', { name: 'Assembly Line' })).toBeVisible()
    expect(screen.getByRole('checkbox', { name: 'Planet' })).toBeVisible()
    expect(screen.getByRole('checkbox', { name: 'Matrioshka Brains' })).toBeVisible()
    expect(screen.queryByRole('checkbox', { name: 'Birch Planets' }))
      .not.toBeInTheDocument()
  })

  test('keeps automation interactive and honors the latest intent while saving', async () => {
    const user = userEvent.setup()
    const settle: Array<(result: UiRuntimePlayerCommandResult) => void> = []
    const dispatchPlayer = vi.fn(
      () =>
        new Promise<UiRuntimePlayerCommandResult>((resolve) => {
          settle.push(resolve)
        }),
    )
    renderSurface(
      [
        card({ researchId: 'research.assembly_line_upgrade' }),
        card({ researchId: 'research.ai_manager_upgrade' }),
      ],
      dispatchPlayer,
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Research purchase settings',
      }),
    )
    const assembly = screen.getByRole('checkbox', {
      name: 'Assembly Line',
    })
    const aiManager = screen.getByRole('checkbox', {
      name: 'AI Manager',
    })

    await user.click(assembly)
    expect(assembly).toBeChecked()
    expect(aiManager).not.toBeDisabled()
    expect(screen.getByRole('button', { name: 'Toggle All' })).not.toBeDisabled()

    await user.click(assembly)
    expect(assembly).not.toBeChecked()
    expect(dispatchPlayer).toHaveBeenNthCalledWith(1, {
      kind: 'research.set-automation',
      researchId: 'research.assembly_line_upgrade',
      enabled: true,
    })
    expect(dispatchPlayer).toHaveBeenNthCalledWith(2, {
      kind: 'research.set-automation',
      researchId: 'research.assembly_line_upgrade',
      enabled: false,
    })

    settle[0]?.(accepted())
    expect(assembly).not.toBeChecked()
    settle[1]?.(accepted())
  })

  test('keeps the Research cards compact at every width without preventing text scaling', () => {
    expect(baseResearchStyles).toMatch(
      /\.research-surface__grid\s*\{[^}]*gap:\s*var\(--game-card-grid-gap\);/,
    )
    expect(baseResearchStyles).toMatch(
      /\.ui-facility-card\.research-card\s*\{[^}]*min-block-size:\s*0;[^}]*grid-template-columns:\s*minmax\(0, 1fr\)\s*clamp\(6\.25rem, 29%, 7rem\);/,
    )
    expect(baseResearchStyles).toMatch(
      /\.research-card \.ui-facility-card__title\s*\{[^}]*font-size:\s*var\(--ui-text-card-title\);[^}]*line-height:\s*1\.12;/,
    )
    expect(baseResearchStyles).toMatch(
      /\.research-card \.ui-facility-card__production\s*\{[^}]*font-size:\s*calc\(0\.8rem \* var\(--game-text-scale\)\);[^}]*line-height:\s*1\.1;/,
    )
    expect(baseResearchStyles).toMatch(
      /\.research-card \.ui-facility-card__description\s*\{[^}]*font-size:\s*calc\(0\.67rem \* var\(--game-text-scale\)\);[^}]*line-height:\s*1\.12;/,
    )
    expect(researchStyles).not.toMatch(
      /\.research-card \.ui-facility-card__(?:title|production|description)\s*\{[^}]*white-space:\s*nowrap;/,
    )
    expect(researchStyles).toMatch(
      /@container \(min-width: 50rem\)[\s\S]*grid-template-columns:\s*repeat\(2, minmax\(0, 1fr\)\);[^}]*grid-auto-rows:\s*1fr;[^}]*align-items:\s*stretch;/,
    )
    expect(researchStyles).toMatch(
      /@container \(min-width: 50rem\)[\s\S]*\.ui-facility-card\.research-card\s*\{[^}]*block-size:\s*100%;/,
    )
    expect(researchStyles).toMatch(
      /@container \(min-width: 80rem\)[\s\S]*grid-template-columns:\s*repeat\(3, minmax\(0, 1fr\)\);/,
    )
  })
})

function renderSurface(
  cards: readonly FrontendResearchCardPreview[],
  dispatchPlayer = vi.fn(async () => accepted()),
  preference = new ResearchVisibilityPreferenceService({ storage: null }),
  automationResearchIds = cards.map((entry) => entry.researchId),
) {
  return render(surfaceElement(
    cards,
    dispatchPlayer,
    preference,
    automationResearchIds,
  ))
}

function surfaceElement(
  cards: readonly FrontendResearchCardPreview[],
  dispatchPlayer: ResearchSurfaceProps['dispatchPlayer'],
  preference: ResearchVisibilityPreferenceService,
  automationResearchIds: readonly string[],
) {
  return (
    <IntlProvider locale="en">
      <ResearchVisibilityProvider preference={preference}>
        <ResearchSurface
          locale="en"
          cards={cards}
          researchers={2000}
          sciencePerSecond={22}
          buyMode="buy-1"
          roundedBulkBuy={false}
          presets={[
            { name: 'Preset 1', skillIds: [], botDistribution: 0.5, colorId: 'cyan' },
            { name: 'Preset 2', skillIds: [], botDistribution: 0.5, colorId: 'orange' },
            { name: 'Preset 3', skillIds: [], botDistribution: 0.5, colorId: 'gold' },
            { name: 'Preset 4', skillIds: [], botDistribution: 0.5, colorId: 'rose' },
            { name: 'Preset 5', skillIds: [], botDistribution: 0.5, colorId: 'pink' },
          ]}
          presetAutomationSlot={0}
          automationUnlocked
          automationEnabledById={Object.fromEntries(
            cards.map((entry) => [entry.researchId, entry.automationActive]),
          )}
          automationResearchIds={automationResearchIds}
          purchaseRouteAvailable
          buyModeRouteAvailable
          roundedBulkRouteAvailable
          presetAutomationRouteAvailable
          automationRouteAvailable
          dispatchPlayer={dispatchPlayer}
        />
      </ResearchVisibilityProvider>
    </IntlProvider>
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
