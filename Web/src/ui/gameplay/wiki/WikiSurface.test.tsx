// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import axe from 'axe-core'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'react-intl'
import { afterEach, describe, expect, test } from 'vitest'
import {
  WikiSurface,
} from './WikiSurface'
import {
  visibleWikiCategoryIds,
  wikiProgressionFromResources,
  type WikiProgression,
} from './wikiProjection'

afterEach(cleanup)

describe('WikiSurface', () => {
  test('shows every always-available Unity reference topic', () => {
    renderWiki(progression())

    expect(screen.getByText('Wiki')).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Wiki' })).not.toBeInTheDocument()
    expect(screen.queryByRole('region', { name: 'Wiki' })).not.toBeInTheDocument()
    const navigation = screen.getByRole('navigation', { name: 'Wiki topics' })
    expect(within(navigation).getByRole('button', { name: /Bots/ })).toHaveAttribute('aria-current', 'page')
    expect(within(navigation).getByRole('button', { name: /Research/ })).toBeVisible()
    expect(within(navigation).getByRole('button', { name: /Skill Tree/ })).toBeVisible()
    expect(within(navigation).getByRole('button', { name: /Infinity/ })).toBeVisible()
    expect(within(navigation).getByRole('button', { name: /Other/ })).toBeVisible()
    expect(within(navigation).getByRole('button', { name: /Patch Notes/ })).toBeVisible()
    expect(within(navigation).getByRole('button', { name: /Lore/ })).toBeVisible()
    expect(within(navigation).queryByRole('button', { name: /Reality/ })).not.toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Building the swarm' })).toBeVisible()
  })

  test('reveals Reality at 42 Infinity Points and Quantum after a Leap', () => {
    expect(visibleWikiCategoryIds(progression({ infinityPoints: 41n }))).not.toContain('reality')
    expect(visibleWikiCategoryIds(progression({ infinityPoints: 42n }))).toContain('reality')
    expect(visibleWikiCategoryIds(progression({ quantumPoints: 1n }))).toEqual([
      'bots',
      'research',
      'skills',
      'infinity',
      'other',
      'patch-notes',
      'lore',
      'reality',
      'quantum',
    ])
  })

  test('navigates to goals and preserves the canonical ten-goal inventory', async () => {
    const user = userEvent.setup()
    renderWiki(progression())

    await user.click(screen.getByRole('button', { name: /Skill Tree/ }))
    const goals = screen.getByRole('heading', { name: 'Goals' }).closest('section')
    expect(goals).not.toBeNull()
    expect(within(goals as HTMLElement).getAllByRole('listitem')).toHaveLength(10)
    expect(within(goals as HTMLElement).getByText('Create 10 Bots.')).toBeVisible()
    expect(within(goals as HTMLElement).getByText('Decay 1 trillion Panels in total.')).toBeVisible()
    expect(within(goals as HTMLElement).getByText('Engulf 100 Galaxies.')).toBeVisible()
  })

  test('keeps authored Patch Notes and Wiki Lore available before progression unlocks', async () => {
    const user = userEvent.setup()
    renderWiki(progression())

    await user.click(screen.getByRole('button', { name: /Patch Notes/ }))
    expect(screen.getByRole('heading', { name: '2.18.7' })).toBeVisible()
    expect(screen.getByText(/Began working on UI overhaul/)).toBeVisible()
    expect(screen.getByRole('heading', { name: '2.15-2.16 through 1.00' })).toBeVisible()

    await user.click(screen.getByRole('button', { name: /^Lore/ }))
    expect(screen.getByRole('heading', { name: 'Existence' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Infinity Achieved' })).toBeVisible()
    expect(screen.getByRole('heading', { name: 'Reality' })).toBeVisible()
    const chapters = screen.getAllByText('Chapter 1')
    expect(chapters).toHaveLength(3)
    await user.click(chapters[0])
    expect(screen.getByText(/You always had a dream, a grand dream/)).toBeVisible()
  })

  test('reveals only earned Secrets and their progressive phrase', async () => {
    const user = userEvent.setup()
    renderWiki(progression({ secretsOfTheUniverse: 6n }))

    await user.click(screen.getByRole('button', { name: /Secrets of the Universe/ }))
    expect(screen.getByText('6 of 27 Secrets revealed')).toBeVisible()
    expect(screen.getByText('Meaning so far: Love, F------ --- ------------')).toBeVisible()
    expect(screen.getAllByRole('listitem')).toHaveLength(6)
    expect(screen.getAllByText('×1 → ×2')).toHaveLength(2)
    expect(screen.queryByText('Secret 7')).not.toBeInTheDocument()
  })

  test('uses total Infinity Points and preserves permanent Secrets in its integration projection', () => {
    expect(wikiProgressionFromResources({
      infinity: {
        points: 50n,
        spentPoints: 12n,
        availablePoints: 38n,
        secretsOfTheUniverse: 2n,
        permanentSkillPoints: 0n,
      },
      quantum: {
        pointsEarned: 1n,
        pointsSpent: 0n,
        availablePoints: 1n,
        permanentSecrets: 4n,
        influenceSpeedBonus: 0n,
        cashBonusLevels: 0n,
        scienceBonusLevels: 0n,
      },
    })).toEqual({
      infinityPoints: 50n,
      quantumPoints: 1n,
      secretsOfTheUniverse: 4n,
    })
  })

  test('reveals the final word from right to left like Unity', async () => {
    const user = userEvent.setup()
    renderWiki(progression({ secretsOfTheUniverse: 16n }))

    await user.click(screen.getByRole('button', { name: /Secrets of the Universe/ }))
    expect(screen.getByText('Meaning so far: Love, Family, and -----------s')).toBeVisible()
  })

  test('passes an accessibility scan with every category unlocked', async () => {
    const { container } = renderWiki(progression({
      infinityPoints: 42n,
      quantumPoints: 1n,
      secretsOfTheUniverse: 27n,
    }))
    const results = await axe.run(container, {
      rules: { 'color-contrast': { enabled: false } },
    })
    expect(results.violations).toEqual([])
  })
})

function progression(overrides: Partial<WikiProgression> = {}): WikiProgression {
  return {
    infinityPoints: 0n,
    quantumPoints: 0n,
    secretsOfTheUniverse: 0n,
    ...overrides,
  }
}

function renderWiki(value: WikiProgression) {
  return render(
    <IntlProvider locale="en" messages={{}} onError={() => undefined}>
      <WikiSurface locale="en" progression={value} />
    </IntlProvider>,
  )
}
