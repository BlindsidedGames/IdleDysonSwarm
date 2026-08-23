// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import axe from 'axe-core'
import { cleanup, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'react-intl'
import { afterEach, describe, expect, test, vi } from 'vitest'
import {
  WikiSurface,
  type WikiSurfaceProps,
} from './WikiSurface'
import {
  visibleWikiCategoryIds,
  visibleWikiLoreSectionIds,
  wikiProgressionFromResources,
  type WikiProgression,
} from './wikiProjection'

afterEach(cleanup)

describe('WikiSurface', () => {
  test('shows every always-available Unity reference topic', () => {
    renderWiki(progression())

    expect(screen.getByText('Wiki')).toBeVisible()
    expect(screen.queryByText(/Reference notes revealed/))
      .not.toBeInTheDocument()
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
    expect(within(navigation).getAllByRole('button').at(-1))
      .toHaveTextContent('Patch Notes')
    expect(screen.getByText('bots').closest('p'))
      .toHaveTextContent(/Build bots, then distribute them/)
    expect(screen.queryByRole('heading', { name: 'Building the swarm' }))
      .not.toBeInTheDocument()
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
      'lore',
      'reality',
      'quantum',
      'patch-notes',
    ])
  })

  test('navigates to goals and preserves the canonical ten-goal inventory', async () => {
    const user = userEvent.setup()
    renderWiki(progression())

    await user.click(topicButton(/Skill Tree/))
    expect(screen.getByText('104 skills').closest('p'))
      .toHaveTextContent(/contains 104 skills and three exclusivity areas/)
    expect(screen.getByText(/manually include or exclude individual skills/))
      .toBeVisible()
    expect(screen.getByText(/clears the live auto-assignment queue/))
      .toBeVisible()
    expect(screen.queryByRole('heading', { name: 'How skills work' }))
      .not.toBeInTheDocument()
    const goals = screen.getByRole('heading', { name: 'Goals' }).closest('section')
    expect(goals).not.toBeNull()
    expect(within(goals as HTMLElement).getAllByRole('listitem')).toHaveLength(10)
    expect(within(goals as HTMLElement).getByText('10 Bots').closest('li'))
      .toHaveTextContent('Create 10 Bots.')
    expect(within(goals as HTMLElement).getByText('1 trillion Panels').closest('li'))
      .toHaveTextContent('Decay 1 trillion Panels in total.')
    expect(within(goals as HTMLElement).getByText('100 Galaxies').closest('li'))
      .toHaveTextContent('Engulf 100 Galaxies.')
  })

  test('explains the canonical Infinity Point production magnitude', async () => {
    const user = userEvent.setup()
    renderWiki(progression())

    await user.click(topicButton(/Infinity/))
    expect(screen.getByText('42 quintillion bots').closest('p'))
      .toHaveTextContent(/initially 42 quintillion bots/)
    expect(screen.getByText('100% of base production').closest('p'))
      .toHaveTextContent(/adds 100% of base production/)
    expect(screen.getByText('500%').closest('p'))
      .toHaveTextContent(/Five total points add 500%/)
    expect(screen.queryByRole('heading', { name: 'Infinity Point scaling' }))
      .not.toBeInTheDocument()
    expect(screen.getByText('42 quintillion bots')).toHaveClass('wiki-surface__value')
    expect(screen.getAllByText('Infinity Point')[0]).toHaveClass('wiki-surface__value')
    expect(screen.getByText('500%')).toHaveClass('wiki-surface__value')
  })

  test('restores semantic term and value highlighting to flat Wiki copy and goals', async () => {
    const user = userEvent.setup()
    renderWiki(progression())

    expect(screen.getByText('Solar Panels')).toHaveClass('wiki-surface__value')
    expect(screen.getByText('20,000')).toHaveClass('wiki-surface__value')

    await user.click(topicButton(/Skill Tree/))
    expect(screen.getByText('104 skills')).toHaveClass('wiki-surface__value')
    expect(screen.getByText('Fragments')).toHaveClass('wiki-surface__value')
    expect(screen.getByText('20,000 active Panels')).toHaveClass('wiki-surface__value')
  })

  test('uses green inline links to change Wiki topics while regular highlights remain blue', async () => {
    const user = userEvent.setup()
    const onCategoryChange = vi.fn()
    renderWiki(progression(), { onCategoryChange })

    const article = screen.getByRole('article')
    const skillTreeLink = within(article).getByRole('button', { name: 'Skill Tree' })
    expect(skillTreeLink).toHaveClass('wiki-surface__topic-link')
    expect(screen.getByText('Solar Panels')).toHaveClass('wiki-surface__value')

    await user.click(skillTreeLink)
    expect(screen.getByRole('heading', { name: 'Goals' })).toBeVisible()
    expect(onCategoryChange).toHaveBeenCalledWith('skills')
  })

  test('does not link highlighted systems that have no matching Wiki topic', async () => {
    const user = userEvent.setup()
    renderWiki(progression())

    await user.click(topicButton(/Research/))
    expect(screen.getByText('research points')).toHaveClass('wiki-surface__value')
    expect(within(screen.getByRole('article')).queryByRole('button', {
      name: 'research points',
    })).not.toBeInTheDocument()

    await user.click(topicButton(/Other/))
    expect(screen.getByText('Offline Time')).toHaveClass('wiki-surface__value')
    expect(within(screen.getByRole('article')).queryByRole('button', {
      name: 'Offline Time',
    })).not.toBeInTheDocument()
  })

  test('offers the same topic navigation through the compact selector', async () => {
    const user = userEvent.setup()
    const onCategoryChange = vi.fn()
    renderWiki(progression(), { onCategoryChange })

    await user.selectOptions(
      screen.getByRole('combobox', { name: 'Topics' }),
      'skills',
    )

    expect(screen.getByRole('heading', { name: 'Goals' })).toBeVisible()
    expect(onCategoryChange).toHaveBeenCalledWith('skills')
  })

  test('restores a remembered topic and resets article scroll on navigation', async () => {
    const user = userEvent.setup()
    renderWiki(progression(), { initialCategory: 'lore' })

    expect(screen.getByRole('heading', { name: 'Existence' })).toBeVisible()
    const article = screen.getByRole('article')
    article.scrollTop = 200
    await user.click(topicButton(/Research/))
    expect(article.scrollTop).toBe(0)
  })

  test('keeps Patch Notes and earned Wiki Lore available before progression unlocks', async () => {
    const user = userEvent.setup()
    renderWiki(progression())

    await user.click(topicButton(/Patch Notes/))
    const mostRecent = screen.getByRole('heading', { name: 'Most Recent' })
      .closest('section')
    expect(mostRecent).not.toBeNull()
    expect(within(mostRecent!).getByRole('heading', { name: 'Version 3.1' })).toBeVisible()
    expect(within(mostRecent!).getAllByRole('listitem')).toHaveLength(14)
    expect(within(mostRecent!).getByText(/soundtrack and interface sounds/)).toBeVisible()
    expect(within(mostRecent!).getByText(/Corrected Skill effects/)).toBeVisible()
    expect(within(mostRecent!).getByText(/Supporter Cat Gallery/)).toBeVisible()
    expect(within(mostRecent!).getByText(/ten most recent Infinity runs/)).toBeVisible()
    expect(within(mostRecent!).getByText(/settling on the final galaxy field/)).toBeVisible()
    expect(within(mostRecent!).getByText(/older Unity-save migration/)).toBeVisible()
    expect(mostRecent).not.toHaveTextContent(
      /TypeScript|canonical simulation|architecture|context|projection|pipeline|catalog|\bported\b/i,
    )
    const previous = screen.getByRole('heading', { name: 'Previous' })
      .closest('section')
    expect(previous).not.toBeNull()
    expect(within(previous!).getByRole('heading', { name: 'Version 3' })).toBeVisible()
    expect(within(previous!).getAllByRole('listitem')).toHaveLength(13)
    expect(within(previous!).getByText(/available to play on the Web/)).toBeVisible()
    expect(within(previous!).getByText(/Offline Time with Stored Time/)).toBeVisible()
    expect(within(previous!).getByText(/three rotating backups/)).toBeVisible()
    expect(within(previous!).getByText(/installed as an app/)).toBeVisible()
    expect(within(previous!).getByText(/Web Store with five/)).toBeVisible()
    expect(within(previous!).getByText(/Expanded the Wiki/)).toBeVisible()
    expect(screen.queryByRole('heading', { name: '2.18.7' }))
      .not.toBeInTheDocument()
    expect(screen.getByText(/Began working on UI overhaul/)).toBeVisible()
    expect(screen.getByText(/2.15-2.16/)).toBeVisible()

    await user.click(topicButton(/^Lore/))
    expect(
      screen.getByText(/original Wiki chronicle/).closest('header'),
    ).toContainElement(screen.getByRole('heading', { name: 'Lore - Nuclearion Edition' }))
    expect(screen.getByRole('heading', { name: 'Existence' })).toBeVisible()
    expect(screen.queryByRole('heading', { name: 'Infinity Achieved' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Reality' })).not.toBeInTheDocument()
    const chapters = screen.getAllByText('Chapter 1')
    expect(chapters).toHaveLength(1)
    await user.click(chapters[0])
    expect(screen.getByText(/You always had a dream, a grand dream/)).toBeVisible()
  })

  test('reveals Nuclearion Lore sections with the matching route unlocks', () => {
    expect(visibleWikiLoreSectionIds(progression())).toEqual(['existence'])
    expect(visibleWikiLoreSectionIds(progression({ infinityAchieved: true }))).toEqual([
      'existence',
      'infinity-achieved',
    ])
    expect(visibleWikiLoreSectionIds(progression({
      infinityAchieved: true,
      realityUnlocked: true,
    }))).toEqual([
      'existence',
      'infinity-achieved',
      'reality',
    ])
  })

  test('reveals only earned Secrets and their progressive phrase', async () => {
    const user = userEvent.setup()
    renderWiki(progression({ secretsOfTheUniverse: 6n }))

    await user.click(topicButton(/Secrets of the Universe/))
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
    }, {
      infinity: { routeUnlocked: true },
      reality: {
        routeVisible: true,
        routeUnlocked: false,
        unlockProgress: {
          currentSecrets: 2n,
          requiredSecrets: 27n,
          fraction: 2 / 27,
        },
      },
    })).toEqual({
      infinityPoints: 50n,
      quantumPoints: 1n,
      secretsOfTheUniverse: 4n,
      infinityAchieved: true,
      realityUnlocked: false,
    })
  })

  test('reveals the final word from right to left like Unity', async () => {
    const user = userEvent.setup()
    renderWiki(progression({ secretsOfTheUniverse: 16n }))

    await user.click(topicButton(/Secrets of the Universe/))
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
    infinityAchieved: false,
    realityUnlocked: false,
    ...overrides,
  }
}

function renderWiki(
  value: WikiProgression,
  overrides: Partial<WikiSurfaceProps> = {},
) {
  return render(
    <IntlProvider locale="en" messages={{}} onError={() => undefined}>
      <WikiSurface locale="en" progression={value} {...overrides} />
    </IntlProvider>,
  )
}

function topicButton(name: RegExp) {
  return within(screen.getByRole('navigation', { name: 'Wiki topics' }))
    .getByRole('button', { name })
}
