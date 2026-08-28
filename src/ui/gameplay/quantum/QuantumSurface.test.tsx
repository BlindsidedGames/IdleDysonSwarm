// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react'
import axe from 'axe-core'
import { IntlProvider } from 'react-intl'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type {
  FrontendQuantumUpgradePreview,
} from '../../../application/frontendSnapshot'
import {
  QUANTUM_UPGRADE_IDS,
  type QuantumUpgradeId,
  type QuantumUpgradeSectionPreview,
} from '../../../simulation/quantumUpgrades'
import type { UiRuntimePlayerCommandResult } from '../../runtime'
import {
  QuantumControlPanel,
  QuantumSurface,
  type QuantumSurfaceProps,
} from './QuantumSurface'

const quantumStyles = readFileSync(
  join(process.cwd(), 'src', 'ui', 'gameplay', 'quantum', 'quantum.css'),
  'utf8',
)

afterEach(() => {
  cleanup()
  vi.useRealTimers()
  localStorage.clear()
})

describe('QuantumSurface', () => {
  test('uses compact upgrade cards at every width', () => {
    expect(quantumStyles).toMatch(
      /\.quantum-surface__content,[\s\S]*container-type:\s*inline-size;/,
    )
    expect(quantumStyles).toMatch(
      /\.quantum-surface__grid\s*\{[^}]*gap:\s*var\(--game-card-grid-gap\);/,
    )
    expect(quantumStyles).toMatch(
      /\.quantum-surface__grid > li\s*\{[^}]*display:\s*grid;[^}]*min-inline-size:\s*0;/,
    )
    expect(quantumStyles).toMatch(
      /\.quantum-upgrade-card\s*\{[^}]*block-size:\s*100%;/,
    )
    expect(quantumStyles).toMatch(
      /@container \(min-width: 42rem\)[\s\S]*\.quantum-surface__grid,[\s\S]*repeat\(2, minmax\(0, 1fr\)\);/,
    )
    expect(quantumStyles).toMatch(
      /@container \(min-width: 76rem\)[\s\S]*\.quantum-surface__grid[^}]*repeat\(3, minmax\(0, 1fr\)\);/,
    )
    expect(quantumStyles).toMatch(
      /--quantum-action-width:\s*6rem;/,
    )
    expect(quantumStyles).toMatch(
      /--quantum-leap-action-width:\s*9\.5rem;/,
    )
    expect(quantumStyles).toMatch(
      /\.quantum-upgrade-card\s*\{[^}]*gap:\s*0\.22rem 0\.38rem;[^}]*padding:\s*0\.38rem;/,
    )
    expect(quantumStyles).toMatch(
      /\.quantum-upgrade-card h4\s*\{[^}]*font-size:\s*calc\(0\.8rem \* var\(--game-text-scale\)\);/,
    )
    expect(quantumStyles).toMatch(
      /\.quantum-surface__content\s*\{[^}]*display:\s*grid;[^}]*gap:\s*var\(--game-card-grid-gap\);/,
    )
    expect(quantumStyles).toMatch(
      /\.quantum-leap-card h2\s*\{[^}]*font-size:\s*calc\(0\.8rem \* var\(--game-text-scale\)\);/,
    )
    expect(quantumStyles).toMatch(
      /\.avocato-meditation\s*\{[^}]*gap:\s*var\(--game-card-grid-gap\);[^}]*padding:\s*0\.38rem;/,
    )
    expect(quantumStyles).toMatch(
      /\.avocato-meditation__complete\s*\{[^}]*font-size:\s*calc\(0\.67rem \* var\(--game-text-scale\)\);/,
    )
  })

  test('presents the authored Unity upgrade catalog and only the next mega-structure', () => {
    renderSurface({
      upgradeOverrides: {
        MatrioshkaBrains: { code: 'already-maxed', eligible: false },
        BirchPlanets: { code: 'purchased', eligible: true },
        GalacticBrains: { code: 'prerequisites-not-met', eligible: false },
      },
    })

    expect(screen.getByText('Quantum Shards')).toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Quantum' })).not.toBeInTheDocument()
    expect(screen.queryByText(/Artifact reward:/)).not.toBeInTheDocument()
    expect(screen.getByText('Bot Multitasking')).toBeInTheDocument()
    expect(screen.getByText('Secrets of the Universe')).toBeInTheDocument()
    expect(screen.queryByText(/Requires Double Infinity Points/)).not.toBeInTheDocument()
    expect(screen.getByText('Birch Planets')).toBeInTheDocument()
    expect(screen.queryByText('Matrioshka Brains')).not.toBeInTheDocument()
    expect(screen.queryByText('Galactic Brains')).not.toBeInTheDocument()
    const secretsPanel = screen.getByRole('heading', { name: 'Secrets' }).closest('section')
    const leapPanel = screen.getByRole('heading', { name: 'Quantum Leap' }).closest('article')
    expect(
      secretsPanel?.compareDocumentPosition(leapPanel as Node),
    ).toBe(Node.DOCUMENT_POSITION_FOLLOWING)
  })

  test('collapses unrevealed branches to one mystery card and keeps Core Quantum visible', () => {
    renderSurface({
      sections: sectionPreviews({
        'skill-paths': false,
        boosters: false,
        'cosmic-structures': false,
        avocato: false,
      }),
    })

    expect(screen.getByRole('heading', { name: 'Core Quantum' })).toBeVisible()
    expect(screen.getByText('Bot Multitasking')).toBeVisible()
    expect(screen.queryByText('Fragments')).not.toBeInTheDocument()
    expect(screen.queryByText('Avocato')).not.toBeInTheDocument()
    expect(screen.getAllByRole('heading', { name: '???' })).toHaveLength(4)
    expect(screen.getByText('Earn a total of 3.00 Quantum Shards to reveal this branch.')).toBeVisible()
    expect(screen.getByText('Unlock Break The Loop to reveal this branch.')).toBeVisible()
    expect(screen.getByText('Earn a total of 20.0 Quantum Shards to reveal this branch.')).toBeVisible()
  })

  test('offers the free Double IP claim and labels insufficient points as a purchase', () => {
    renderSurface({
      upgradeOverrides: {
        DoubleIP: { cost: 0n, code: 'purchased', eligible: true },
        Secrets: { cost: 1n, code: 'insufficient-points', eligible: false },
        Division: { cost: 2n, code: 'insufficient-points', eligible: false },
      },
    })

    expect(screen.getByRole('button', { name: 'Claim Double Infinity Points' }))
      .toHaveTextContent('Claim')
    expect(screen.getByRole('button', {
      name: 'Purchase Secrets of the Universe for 1.00 Quantum Shards',
    })).not.toHaveTextContent('Purchase')
    expect(screen.getByRole('button', {
      name: 'Purchase Division for 2.00 Quantum Shards',
    })).toHaveTextContent('2.00')
    expect(screen.queryByText('Unavailable')).not.toBeInTheDocument()
  })

  test('dispatches one canonical purchase while the action is pending', async () => {
    let settle: ((result: UiRuntimePlayerCommandResult) => void) | undefined
    const dispatchPlayer = vi.fn(() => new Promise<UiRuntimePlayerCommandResult>((resolve) => { settle = resolve }))
    renderSurface({ dispatchPlayer })

    const purchase = screen.getByRole('button', { name: 'Purchase Bot Multitasking for 1.00 Quantum Shards' })
    fireEvent.click(purchase)
    fireEvent.click(purchase)
    expect(dispatchPlayer).toHaveBeenCalledTimes(1)
    expect(dispatchPlayer).toHaveBeenCalledWith({ kind: 'quantum.purchase-upgrade', upgradeId: 'BotMultitasking' })

    settle?.(accepted())
    await screen.findByRole('button', { name: 'Purchase Bot Multitasking for 1.00 Quantum Shards' })
  })

  test.each([
    ['InfluenceSpeed', 'Influence Booster'],
    ['CashBonus', 'Cash Booster'],
    ['ScienceBonus', 'Science Booster'],
  ] as const)('repeats the %s purchase while its button remains held', async (upgradeId, name) => {
    vi.useFakeTimers()
    const dispatchPlayer = vi.fn(async () => accepted())
    renderSurface({ dispatchPlayer })
    const purchase = screen.getByRole('button', {
      name: `Purchase ${name} for 1.00 Quantum Shards`,
    })

    fireEvent.pointerDown(purchase)
    await act(async () => vi.advanceTimersByTimeAsync(600))
    expect(dispatchPlayer).toHaveBeenCalledTimes(3)
    expect(dispatchPlayer).toHaveBeenLastCalledWith({
      kind: 'quantum.purchase-upgrade',
      upgradeId,
    })

    fireEvent.pointerUp(purchase)
    fireEvent.click(purchase)
    await act(async () => vi.advanceTimersByTimeAsync(500))
    expect(dispatchPlayer).toHaveBeenCalledTimes(3)
  })

  test('supports keyboard hold repeat for the repeatable Quantum upgrades', async () => {
    vi.useFakeTimers()
    const dispatchPlayer = vi.fn(async () => accepted())
    renderSurface({ dispatchPlayer })
    const purchase = screen.getByRole('button', {
      name: 'Purchase Cash Booster for 1.00 Quantum Shards',
    })

    fireEvent.keyDown(purchase, { key: 'Enter' })
    await act(async () => vi.advanceTimersByTimeAsync(500))
    fireEvent.keyUp(purchase, { key: 'Enter' })
    fireEvent.click(purchase)

    expect(dispatchPlayer).toHaveBeenCalledTimes(2)
    expect(dispatchPlayer).toHaveBeenNthCalledWith(1, {
      kind: 'quantum.purchase-upgrade',
      upgradeId: 'CashBonus',
    })
  })

  test('does not hold-repeat one-time upgrades or overlap pending repeat purchases', async () => {
    vi.useFakeTimers()
    let settle: ((result: UiRuntimePlayerCommandResult) => void) | undefined
    const dispatchPlayer = vi.fn(() => new Promise<UiRuntimePlayerCommandResult>((resolve) => { settle = resolve }))
    renderSurface({ dispatchPlayer })

    const oneTime = screen.getByRole('button', {
      name: 'Purchase Bot Multitasking for 1.00 Quantum Shards',
    })
    fireEvent.pointerDown(oneTime)
    await act(async () => vi.advanceTimersByTimeAsync(1_000))
    fireEvent.pointerUp(oneTime)
    expect(dispatchPlayer).not.toHaveBeenCalled()

    const repeatable = screen.getByRole('button', {
      name: 'Purchase Science Booster for 1.00 Quantum Shards',
    })
    fireEvent.pointerDown(repeatable)
    await act(async () => vi.advanceTimersByTimeAsync(1_000))
    expect(dispatchPlayer).toHaveBeenCalledTimes(1)
    fireEvent.pointerUp(repeatable)

    settle?.(accepted())
    await act(async () => Promise.resolve())
  })

  test('ends a held repeat when pointer release occurs while its purchase is pending', async () => {
    vi.useFakeTimers()
    let settle: ((result: UiRuntimePlayerCommandResult) => void) | undefined
    const dispatchPlayer = vi.fn(() => new Promise<UiRuntimePlayerCommandResult>((resolve) => { settle = resolve }))
    renderSurface({ dispatchPlayer })
    const purchase = screen.getByRole('button', {
      name: 'Purchase Influence Booster for 1.00 Quantum Shards',
    })

    fireEvent.pointerDown(purchase)
    await act(async () => vi.advanceTimersByTimeAsync(400))
    expect(dispatchPlayer).toHaveBeenCalledTimes(1)
    expect(purchase).toBeDisabled()

    fireEvent.pointerUp(window)
    settle?.(accepted())
    await act(async () => {
      await Promise.resolve()
      await vi.advanceTimersByTimeAsync(1_000)
    })

    expect(dispatchPlayer).toHaveBeenCalledTimes(1)
  })

  test('requires confirmation for a resetting leap and dispatches the canonical request', async () => {
    const dispatchPlayer = vi.fn(async () => accepted())
    renderSurface({ dispatchPlayer, leapEligible: true })

    const engage = screen.getByRole('button', { name: 'Engage Quantum Leap' })
    expect(engage).toHaveClass('ui-button--primary')
    expect(engage).not.toHaveClass('ui-button--danger')
    fireEvent.click(engage)
    expect(dispatchPlayer).not.toHaveBeenCalled()
    const confirm = screen.getByRole('button', { name: 'Confirm Quantum Leap' })
    expect(confirm).toHaveClass('ui-button--primary')
    expect(confirm).not.toHaveClass('ui-button--danger')
    fireEvent.click(confirm)

    expect(dispatchPlayer).toHaveBeenCalledWith({ kind: 'quantum.request-leap' })
  })

  test('applies the selected quantity only to repeatable boosters', async () => {
    const dispatchPlayer = vi.fn(async () => accepted())
    renderSurface({ dispatchPlayer, purchaseQuantity: 10 })

    const bulk = screen.getByRole('button', {
      name: 'Purchase 10.0 Cash Booster upgrades for 10.0 Quantum Shards',
    })
    expect(bulk).toHaveTextContent('+10.0')
    expect(bulk).not.toHaveTextContent('Purchase')
    fireEvent.click(bulk)
    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'quantum.purchase-upgrade',
      upgradeId: 'CashBonus',
      quantity: 10n,
    })

    fireEvent.click(screen.getByRole('button', {
      name: 'Purchase Bot Multitasking for 1.00 Quantum Shards',
    }))
    expect(dispatchPlayer).toHaveBeenLastCalledWith({
      kind: 'quantum.purchase-upgrade',
      upgradeId: 'BotMultitasking',
    })
  })

  test('converts complete 42-point groups directly after Quantum Entanglement', async () => {
    const dispatchPlayer = vi.fn(async () => accepted())
    renderSurface({
      availableInfinityPoints: 100n,
      entangled: true,
      leapEligible: true,
      dispatchPlayer,
    })

    const leap = screen.getByRole('button', { name: 'Leap for 2.00 QS' })
    fireEvent.click(leap)
    expect(dispatchPlayer).toHaveBeenCalledWith({ kind: 'quantum.request-leap' })
    expect(screen.queryByRole('button', { name: 'Confirm Quantum Leap' })).not.toBeInTheDocument()
  })

  test('offers the Avocato destination after the one-time unlock', () => {
    const onOpenAvocato = vi.fn()
    renderSurface({
      onOpenAvocato,
      upgradeOverrides: { Avocado: { code: 'already-maxed', eligible: false } },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Visit Avocato' }))
    expect(onOpenAvocato).toHaveBeenCalledOnce()
  })

  test('labels completed purchases as maxed and hides them on request', () => {
    const { rerender } = renderSurface({
      hideMaxed: false,
      upgradeOverrides: {
        Automation: { code: 'already-maxed', eligible: false },
      },
    })

    expect(screen.getByRole('button', { name: 'Permanent Automation: Maxed' }))
      .toHaveTextContent('Maxed')

    rerenderSurface(rerender, {
      hideMaxed: true,
      upgradeOverrides: {
        Automation: { code: 'already-maxed', eligible: false },
      },
    })
    expect(screen.queryByRole('heading', { name: 'Automation' }))
      .not.toBeInTheDocument()
  })

  test('has no serious or critical accessibility violations', async () => {
    const { container } = renderSurface()
    const result = await axe.run(container)
    expect(result.violations.filter((violation) => violation.impact === 'serious' || violation.impact === 'critical')).toEqual([])
  })
})

interface RenderOptions {
  readonly availableInfinityPoints?: bigint
  readonly entangled?: boolean
  readonly leapEligible?: boolean
  readonly dispatchPlayer?: QuantumSurfaceProps['dispatchPlayer']
  readonly onOpenAvocato?: () => void
  readonly upgradeOverrides?: Partial<Record<QuantumUpgradeId, Partial<FrontendQuantumUpgradePreview>>>
  readonly purchaseQuantity?: QuantumSurfaceProps['purchaseQuantity']
  readonly hideMaxed?: boolean
  readonly sections?: readonly QuantumUpgradeSectionPreview[]
}

function surfaceProps(options: RenderOptions = {}): QuantumSurfaceProps {
  const entangled = options.entangled ?? false
  return {
    locale: 'en',
    resources: {
      pointsEarned: 50n,
      pointsSpent: 2n,
      availablePoints: 48n,
      permanentSecrets: 6n,
      influenceSpeedBonus: 8n,
      cashBonusLevels: 3n,
      scienceBonusLevels: 4n,
    },
    infinityPoints: options.availableInfinityPoints ?? 41n,
    availableInfinityPoints: options.availableInfinityPoints ?? 41n,
    progression: {
      quantum: {
        divisionsPurchased: 1n,
        unlocks: {
          botMultitasking: false,
          doubleInfinityPoints: false,
          breakTheLoop: false,
          quantumEntanglement: entangled,
          automation: false,
          fragments: false,
          purity: false,
          terra: false,
          power: false,
          paragade: false,
          stellar: false,
          matrioshkaBrains: false,
          birchPlanets: false,
          galacticBrains: false,
        },
      },
      avocado: { unlocked: false },
      secretProgress: { step: 2, completed: false },
    },
    previews: {
      upgrades: QUANTUM_UPGRADE_IDS.map((id) => preview(id, options.upgradeOverrides?.[id])),
      sections: options.sections ?? sectionPreviews(),
      leap: {
        eligible: options.leapEligible ?? false,
        code: options.leapEligible ? 'ready' : 'insufficient-infinity-points',
        branch: entangled ? 'entanglement' : 'reset',
        artifactSkillPoints: entangled ? null : 3n,
        definitionGap: null,
      },
    },
    meditationPreview: {
      eligible: true,
      requiredStepIndex: 2,
      code: 'step-completed',
      skillPointReward: 4n,
    },
    commandAvailability: {
      purchaseUpgrade: true,
      requestLeap: true,
      completeMeditationStep: true,
    },
    dispatchPlayer: options.dispatchPlayer ?? vi.fn(async () => accepted()),
    onOpenAvocato: options.onOpenAvocato,
    purchaseQuantity: options.purchaseQuantity,
    hideMaxed: options.hideMaxed,
  }
}

function renderSurface(options: RenderOptions = {}) {
  return render(<IntlProvider locale="en"><QuantumSurface {...surfaceProps(options)} /></IntlProvider>)
}

function rerenderSurface(
  rerender: ReturnType<typeof render>['rerender'],
  options: RenderOptions,
) {
  rerender(<IntlProvider locale="en"><QuantumSurface {...surfaceProps(options)} /></IntlProvider>)
}

describe('QuantumControlPanel', () => {
  test('shows capped leap progress and expands quantity settings', () => {
    const onOpenChange = vi.fn()
    const onQuantityChange = vi.fn()
    const { rerender } = render(
      <IntlProvider locale="en">
        <QuantumControlPanel
          locale="en"
          infinityPoints={41n}
          purchaseSettingsOpen={false}
          purchaseQuantity={1}
          hideMaxed={false}
          onPurchaseSettingsOpenChange={onOpenChange}
          onPurchaseQuantityChange={onQuantityChange}
          onHideMaxedChange={vi.fn()}
        />
      </IntlProvider>,
    )
    expect(screen.getByText('41.0 / 42.0 Infinity Points')).toBeInTheDocument()
    const settingsToggle = screen.getByRole('button', {
      name: 'Purchase settings',
    })
    expect(
      settingsToggle.querySelector('[data-symbol="settings"]'),
    ).toBeInTheDocument()
    expect(settingsToggle).not.toHaveTextContent('⚙')
    fireEvent.click(settingsToggle)
    expect(onOpenChange).toHaveBeenCalledWith(true)

    rerender(
      <IntlProvider locale="en">
        <QuantumControlPanel
          locale="en"
          infinityPoints={100n}
          purchaseSettingsOpen
          purchaseQuantity={1}
          hideMaxed={false}
          onPurchaseSettingsOpenChange={onOpenChange}
          onPurchaseQuantityChange={onQuantityChange}
          onHideMaxedChange={vi.fn()}
        />
      </IntlProvider>,
    )
    expect(screen.queryByText('Quantum Leap Available')).not.toBeInTheDocument()
    expect(
      screen.getByText('Progress to Quantum Leap')
        .closest('.ui-progress-controls-panel__collapsed'),
    ).toContainElement(
      screen.getByRole('button', { name: 'Purchase settings' }),
    )
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '42')
    fireEvent.click(screen.getByRole('button', { name: 'Buy 10' }))
    expect(onQuantityChange).toHaveBeenCalledWith(10)
  })

  test('keeps the hide-maxed preference inside the expanded settings panel', () => {
    const onHideMaxedChange = vi.fn()
    render(
      <IntlProvider locale="en">
        <QuantumControlPanel
          locale="en"
          infinityPoints={42n}
          purchaseSettingsOpen
          purchaseQuantity={1}
          hideMaxed={false}
          onPurchaseSettingsOpenChange={vi.fn()}
          onPurchaseQuantityChange={vi.fn()}
          onHideMaxedChange={onHideMaxedChange}
        />
      </IntlProvider>,
    )

    const toggle = screen.getByRole('checkbox', { name: 'Hide maxed upgrades' })
    expect(toggle.closest('.ui-progress-controls-panel__body')).not.toBeNull()
    expect(toggle).not.toBeChecked()
    fireEvent.click(toggle)
    expect(onHideMaxedChange).toHaveBeenCalledWith(true)
  })
})

function preview(upgradeId: QuantumUpgradeId, overrides: Partial<FrontendQuantumUpgradePreview> = {}): FrontendQuantumUpgradePreview {
  return {
    upgradeId,
    eligible: true,
    cost: upgradeId === 'DoubleIP'
      ? 0n
      : upgradeId === 'Division'
        ? 2n
        : upgradeId === 'Avocado'
          ? 42n
          : 1n,
    code: 'purchased',
    definitionGap: null,
    ...overrides,
  }
}

function sectionPreviews(
  revealed: Partial<Record<QuantumUpgradeSectionPreview['sectionId'], boolean>> = {},
): readonly QuantumUpgradeSectionPreview[] {
  return [
    { sectionId: 'core', upgradeIds: ['DoubleIP', 'BotMultitasking', 'Automation', 'BreakTheLoop', 'Secrets', 'Division', 'QuantumEntanglement'], revealed: revealed.core ?? true, revealRequirement: null },
    { sectionId: 'skill-paths', upgradeIds: ['Fragments', 'Purity', 'Terra', 'Power', 'Paragade', 'Stellar'], revealed: revealed['skill-paths'] ?? true, revealRequirement: { kind: 'points-earned', value: 3n } },
    { sectionId: 'boosters', upgradeIds: ['InfluenceSpeed', 'CashBonus', 'ScienceBonus'], revealed: revealed.boosters ?? true, revealRequirement: { kind: 'points-earned', value: 6n } },
    { sectionId: 'cosmic-structures', upgradeIds: ['MatrioshkaBrains', 'BirchPlanets', 'GalacticBrains'], revealed: revealed['cosmic-structures'] ?? true, revealRequirement: { kind: 'upgrade-owned', upgradeId: 'BreakTheLoop' } },
    { sectionId: 'avocato', upgradeIds: ['Avocado'], revealed: revealed.avocato ?? true, revealRequirement: { kind: 'points-earned', value: 20n } },
  ]
}

function accepted(): UiRuntimePlayerCommandResult {
  return {
    status: 'accepted',
    kind: 'transition',
    changed: true,
    stateRevision: 2,
    activationRevision: { session: 1, state: 2 },
  }
}
