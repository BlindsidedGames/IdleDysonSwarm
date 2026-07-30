// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { IntlProvider } from 'react-intl'
import { afterEach, describe, expect, test, vi } from 'vitest'
import type { CanonicalSkillPresetSlot } from '../../../application/canonicalGameCommands'
import type {
  CanonicalSkillAvailabilityPreview,
  CanonicalSkillCatalogPreview,
} from '../../../simulation/canonicalSkillTransactions'
import { SkillsSurface, type SkillsSurfaceProps } from './SkillsSurface'

afterEach(cleanup)

const startSkill = {
  skillId: 'startHereTree',
  cost: 1n,
  owned: false,
  visible: true,
  unlocked: true,
  queued: false,
  visualState: 'root',
  fragment: false,
  intrinsicallyRefundable: true,
  requiredSkillIds: [],
  shadowRequiredSkillIds: [],
  exclusiveWithSkillIds: [],
  purchase: {
    eligible: true,
    code: 'purchasable',
    affectedSkillIds: ['startHereTree'],
  },
  refund: {
    eligible: false,
    code: 'not-owned',
    affectedSkillIds: [],
    pointsReturned: 0n,
    fragmentsRemoved: 0n,
  },
} as const

const catalog: CanonicalSkillCatalogPreview = {
  complete: true,
  definitionGap: null,
  skills: [startSkill],
}

const presets = [
  {
    name: 'Preset 1',
    skillIds: [],
    botDistribution: 0,
  },
  {
    name: 'Preset 2',
    skillIds: ['startHereTree'],
    botDistribution: 0.5,
  },
  {
    name: 'Preset 3',
    skillIds: [],
    botDistribution: 1,
  },
  {
    name: 'Preset 4',
    skillIds: [],
    botDistribution: 0,
  },
  {
    name: 'Preset 5',
    skillIds: [],
    botDistribution: 0,
  },
] as const

function createSkillElement(
  dispatchPlayer: SkillsSurfaceProps['dispatchPlayer'],
  botDistribution = 0.5,
  selectedPresetSlot: CanonicalSkillPresetSlot = 1,
  catalogOverride: CanonicalSkillCatalogPreview = catalog,
) {
  return (
    <IntlProvider locale="en" messages={{}}>
      <SkillsSurface
        locale="en"
        points={3n}
        fragments={0n}
        catalog={catalogOverride}
        presets={presets}
        selectedPresetSlot={selectedPresetSlot}
        botDistribution={botDistribution}
        autoAssignNonRefundable={false}
        commandAvailability={{
          purchase: true,
          refund: true,
          selectPreset: true,
          setAutoAssignNonRefundable: true,
          reset: true,
        }}
        dispatchPlayer={dispatchPlayer}
      />
    </IntlProvider>
  )
}

function createSkillPreview(
  skillId: string,
  overrides: Partial<CanonicalSkillAvailabilityPreview> = {},
): CanonicalSkillAvailabilityPreview {
  return {
    ...startSkill,
    skillId,
    purchase: {
      ...startSkill.purchase,
      affectedSkillIds: [skillId],
    },
    refund: {
      ...startSkill.refund,
      affectedSkillIds: [],
    },
    ...overrides,
  }
}

function createDispatchPlayer() {
  return vi.fn(async () => ({
    status: 'accepted' as const,
    kind: 'transition' as const,
    changed: true,
    stateRevision: 2,
    activationRevision: {
      session: 1,
      state: 2,
    },
  }))
}

function renderSkills(
  dispatchPlayer: SkillsSurfaceProps['dispatchPlayer'] =
    createDispatchPlayer(),
) {
  render(createSkillElement(dispatchPlayer))
  return dispatchPlayer
}

describe('SkillsSurface', () => {
  test('renders the canonical resource strip and authored starting node', () => {
    renderSkills()

    expect(screen.getByText('Skill Points: 3.00')).toBeInTheDocument()
    expect(screen.queryByText(/Fragments:/)).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Cash & Science. Cost: 1 Skill Points',
      }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
  })

  test('places a labelled automatic-assignment marker at the queued node corner', () => {
    const queuedCatalog: CanonicalSkillCatalogPreview = {
      ...catalog,
      skills: [createSkillPreview('startHereTree', { queued: true })],
    }
    const { container } = render(
      createSkillElement(
        createDispatchPlayer(),
        0.5,
        1,
        queuedCatalog,
      ),
    )

    const marker = container.querySelector('.skill-tree-node__queue')
    expect(marker).toHaveTextContent('+')
    expect(marker).toHaveAccessibleName(
      'Queued for automatic assignment',
    )
  })

  test('shows canonical multi-skill prerequisite progress and selected paths', async () => {
    const user = userEvent.setup()
    const multiRequirementCatalog: CanonicalSkillCatalogPreview = {
      ...catalog,
      skills: [
        createSkillPreview('startHereTree', {
          requiredSkillIds: [
            'assemblyLineTree',
            'aiManagerTree',
            'serverTree',
          ],
          purchase: {
            ...startSkill.purchase,
            eligible: false,
            code: 'prerequisites-not-met',
            affectedSkillIds: [],
          },
        }),
        createSkillPreview('assemblyLineTree', {
          owned: true,
          visualState: 'owned',
          purchase: {
            ...startSkill.purchase,
            eligible: false,
            code: 'already-owned',
            affectedSkillIds: [],
          },
        }),
        createSkillPreview('aiManagerTree'),
        createSkillPreview('serverTree'),
        createSkillPreview('parallelComputation'),
      ],
    }
    const { container } = render(
      createSkillElement(
        createDispatchPlayer(),
        0.5,
        1,
        multiRequirementCatalog,
      ),
    )

    const target = screen.getByRole('button', {
      name: /Cash & Science\. Cost: 1 Skill Points/,
    })
    expect(
      target.querySelector('.skill-tree-node__requirements'),
    ).toHaveTextContent('1/3')
    expect(
      target.querySelector('.skill-tree-node__requirements'),
    ).toHaveAccessibleName('Requirements: 1/3 complete')

    await user.click(target)

    expect(target).toHaveAttribute('data-selected', 'true')
    expect(
      screen.getByRole('button', { name: /Assembly Lines/ }),
    ).toHaveAttribute('data-selection-related', 'true')
    expect(
      screen.getByRole('button', { name: /Parallel Computation/ }),
    ).toHaveAttribute('data-selection-dimmed', 'true')
    expect(
      container.querySelectorAll(
        '.skill-tree-viewport__connections line[data-selected-path="true"]',
      ),
    ).toHaveLength(3)
    expect(
      container.querySelector(
        '.skill-tree-viewport__connections line[data-source-owned="true"]',
      ),
    ).toBeInTheDocument()
    expect(
      container.querySelector(
        '.skill-tree-viewport__connections line[marker-end]',
      ),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Requirements: 1/3 complete'),
    ).toBeInTheDocument()
    expect(
      screen.getByText('Missing: AI Managers, Servers'),
    ).toBeInTheDocument()
  })

  test('keeps an owned multi-prerequisite node free of requirement counters', () => {
    const ownedCatalog: CanonicalSkillCatalogPreview = {
      ...catalog,
      skills: [
        createSkillPreview('startHereTree', {
          owned: true,
          visualState: 'owned',
          requiredSkillIds: ['assemblyLineTree', 'aiManagerTree'],
        }),
        createSkillPreview('assemblyLineTree', {
          owned: true,
          visualState: 'owned',
        }),
        createSkillPreview('aiManagerTree', {
          owned: true,
          visualState: 'owned',
        }),
      ],
    }
    const { container } = render(
      createSkillElement(
        createDispatchPlayer(),
        0.5,
        1,
        ownedCatalog,
      ),
    )

    expect(
      container.querySelector('.skill-tree-node__requirements'),
    ).not.toBeInTheDocument()
    expect(
      container.querySelector('.skill-tree-node__cost'),
    ).toHaveTextContent('1')
  })

  test('searches authored copy and highlights matching nodes in place', async () => {
    const user = userEvent.setup()
    renderSkills()

    await user.type(
      screen.getByRole('searchbox', { name: 'Search skills' }),
      'cash',
    )

    expect(screen.getByText('1 match')).toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Cash & Science. Cost: 1 Skill Points',
      }),
    ).toHaveAttribute('data-match', 'true')
  })

  test('focuses a searched skill without scrolling the transformed viewport', async () => {
    const user = userEvent.setup()
    renderSkills()
    const skill = screen.getByRole('button', {
      name: 'Cash & Science. Cost: 1 Skill Points',
    })
    const focus = vi.spyOn(skill, 'focus')

    await user.type(
      screen.getByRole('searchbox', { name: 'Search skills' }),
      'cash{Enter}',
    )

    await vi.waitFor(() =>
      expect(focus).toHaveBeenCalledWith({ preventScroll: true }),
    )
  })

  test('opens skill details without turning a skill tap into a pan', () => {
    renderSkills()
    const skill = screen.getByRole('button', {
      name: 'Cash & Science. Cost: 1 Skill Points',
    })

    fireEvent.pointerDown(skill, {
      pointerId: 1,
      clientX: 100,
      clientY: 100,
    })
    fireEvent.pointerMove(skill, {
      pointerId: 1,
      clientX: 125,
      clientY: 125,
    })
    fireEvent.pointerUp(skill, {
      pointerId: 1,
      clientX: 125,
      clientY: 125,
    })
    fireEvent.click(skill)

    expect(
      screen.getByRole('dialog', { name: 'Cash & Science' }),
    ).toBeInTheDocument()
    expect(
      document.querySelector(
        '.skill-details-dialog[data-palette="normal"]',
      ),
    ).toBeInTheDocument()
  })

  test('traps the skill dialog entry on its compact close control and restores focus', async () => {
    const user = userEvent.setup()
    renderSkills()
    const skill = screen.getByRole('button', {
      name: 'Cash & Science. Cost: 1 Skill Points',
    })
    const focus = vi.spyOn(skill, 'focus')

    await user.click(skill)
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
    focus.mockClear()

    await user.keyboard('{Escape}')
    expect(
      screen.queryByRole('dialog', { name: 'Cash & Science' }),
    ).not.toBeInTheDocument()
    expect(skill).toHaveFocus()
    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
  })

  test('shows fragment balance only inside a fragment skill dialog', async () => {
    const user = userEvent.setup()
    const fragmentCatalog: CanonicalSkillCatalogPreview = {
      ...catalog,
      skills: [
        {
          ...startSkill,
          fragment: true,
          visualState: 'fragment',
        },
      ],
    }
    render(
      <IntlProvider locale="en" messages={{}}>
        <SkillsSurface
          locale="en"
          points={3n}
          fragments={2n}
          catalog={fragmentCatalog}
          presets={presets}
          selectedPresetSlot={1}
          botDistribution={0.5}
          autoAssignNonRefundable={false}
          commandAvailability={{
            purchase: true,
            refund: true,
            selectPreset: true,
            setAutoAssignNonRefundable: true,
            reset: true,
          }}
          dispatchPlayer={createDispatchPlayer()}
        />
      </IntlProvider>,
    )

    expect(screen.queryByText(/Fragments:/)).not.toBeInTheDocument()
    await user.click(
      screen.getByRole('button', {
        name: /Cash & Science\. Cost: 1 Skill Points/,
      }),
    )

    expect(
      screen.getByText('Fragments owned: 2.00 (+1)'),
    ).toBeInTheDocument()
    expect(
      document.querySelector(
        '.skill-details-dialog[data-palette="fragment"]',
      ),
    ).toBeInTheDocument()
  })

  test('uses the authored non-refundable palette for permanent skills', async () => {
    const user = userEvent.setup()
    const permanentCatalog: CanonicalSkillCatalogPreview = {
      ...catalog,
      skills: [
        {
          ...startSkill,
          visualState: 'non-refundable',
          intrinsicallyRefundable: false,
        },
      ],
    }
    render(
      <IntlProvider locale="en" messages={{}}>
        <SkillsSurface
          locale="en"
          points={3n}
          fragments={0n}
          catalog={permanentCatalog}
          presets={presets}
          selectedPresetSlot={1}
          botDistribution={0.5}
          autoAssignNonRefundable={false}
          commandAvailability={{
            purchase: true,
            refund: true,
            selectPreset: true,
            setAutoAssignNonRefundable: true,
            reset: true,
          }}
          dispatchPlayer={createDispatchPlayer()}
        />
      </IntlProvider>,
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Cash & Science. Cost: 1 Skill Points',
      }),
    )

    expect(
      document.querySelector(
        '.skill-details-dialog[data-palette="non-refundable"]',
      ),
    ).toBeInTheDocument()
  })

  test('uses the disabled action itself without redundant unavailable filler', async () => {
    const user = userEvent.setup()
    const unavailableCatalog: CanonicalSkillCatalogPreview = {
      ...catalog,
      skills: [
        {
          ...startSkill,
          purchase: {
            ...startSkill.purchase,
            eligible: false,
            code: 'insufficient-points',
          },
        },
      ],
    }
    render(
      <IntlProvider locale="en" messages={{}}>
        <SkillsSurface
          locale="en"
          points={0n}
          fragments={0n}
          catalog={unavailableCatalog}
          presets={presets}
          selectedPresetSlot={1}
          botDistribution={0.5}
          autoAssignNonRefundable={false}
          commandAvailability={{
            purchase: true,
            refund: true,
            selectPreset: true,
            setAutoAssignNonRefundable: true,
            reset: true,
          }}
          dispatchPlayer={createDispatchPlayer()}
        />
      </IntlProvider>,
    )

    await user.click(
      screen.getByRole('button', {
        name: /Cash & Science\. Cost: 1 Skill Points/,
      }),
    )
    const assign = screen.getByRole('button', { name: 'Assign Skill' })

    expect(assign).toBeDisabled()
    expect(
      screen.queryByText('This action is not currently available.'),
    ).not.toBeInTheDocument()
  })

  test('cleans up an interrupted pan before the next skill click', () => {
    renderSkills()
    const tree = screen.getByRole('region', { name: 'Skill tree' })
    const skill = screen.getByRole('button', {
      name: 'Cash & Science. Cost: 1 Skill Points',
    })

    fireEvent.pointerDown(tree, {
      pointerId: 2,
      clientX: 20,
      clientY: 20,
    })
    fireEvent.pointerMove(tree, {
      pointerId: 2,
      clientX: 80,
      clientY: 80,
    })
    fireEvent.lostPointerCapture(tree, { pointerId: 2 })
    fireEvent.click(skill)

    expect(
      screen.getByRole('dialog', { name: 'Cash & Science' }),
    ).toBeInTheDocument()
  })

  test('keeps zoom controls clickable instead of starting a pan', () => {
    const { container } = render(
      createSkillElement(createDispatchPlayer()),
    )
    const canvas = container.querySelector(
      '.skill-tree-viewport__canvas',
    )
    const zoomIn = screen.getByRole('button', { name: 'Zoom in' })

    fireEvent.pointerDown(zoomIn, {
      pointerId: 3,
      clientX: 100,
      clientY: 100,
    })
    fireEvent.click(zoomIn)

    expect(canvas?.getAttribute('style')).toContain('scale(0.9)')
  })

  test('dispatches purchase intent without changing gameplay locally', async () => {
    const user = userEvent.setup()
    const dispatchPlayer = renderSkills()

    await user.click(
      screen.getByRole('button', {
        name: 'Cash & Science. Cost: 1 Skill Points',
      }),
    )
    expect(
      screen.getByRole('dialog', { name: 'Cash & Science' }),
    ).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Assign Skill' }),
    )

    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'skill.purchase',
      skillId: 'startHereTree',
    })
    expect(
      screen.getByRole('dialog', { name: 'Cash & Science' }),
    ).toBeInTheDocument()
  })

  test('dispatches the selected canonical preset from settings', async () => {
    const user = userEvent.setup()
    const dispatchPlayer = renderSkills()

    await user.click(
      screen.getByRole('button', {
        name: 'Skill presets and reset',
      }),
    )
    const currentPreset = screen.getByRole('button', {
      name: /Load Preset 1/,
    })
    expect(currentPreset).toHaveAttribute('aria-pressed', 'true')
    expect(within(currentPreset).getByText('Current')).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', {
        name: /Load Preset 2/,
      }),
    )

    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'skill.select-preset',
      slot: 2,
    })
  })

  test('shows the reset explanation once, only while confirming', async () => {
    const user = userEvent.setup()
    renderSkills()

    await user.click(
      screen.getByRole('button', {
        name: 'Skill presets and reset',
      }),
    )
    expect(
      screen.queryByText(
        'Refunds all currently refundable skills and clears automatic assignment.',
      ),
    ).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Reset refundable skills' }),
    )
    expect(
      screen.getAllByText(
        'Refunds all currently refundable skills and clears automatic assignment.',
      ),
    ).toHaveLength(1)
  })

  test('releases a completed preset command before bot distribution reconciliation', async () => {
    const user = userEvent.setup()
    const dispatchPlayer = createDispatchPlayer()
    const view = render(createSkillElement(dispatchPlayer, 0))

    await user.click(
      screen.getByRole('button', {
        name: 'Skill presets and reset',
      }),
    )
    await user.click(
      screen.getByRole('button', {
        name: /Load Preset 2/,
      }),
    )

    expect(
      screen.getByRole('button', { name: /Load Preset 2/ }),
    ).toBeEnabled()

    view.rerender(createSkillElement(dispatchPlayer, 0.5, 2))

    expect(
      screen.getByRole('button', { name: /Load Preset 2/ }),
    ).toBeEnabled()
  })

  test('releases a completed preset command before selected-slot reconciliation', async () => {
    const user = userEvent.setup()
    const dispatchPlayer = createDispatchPlayer()
    const view = render(
      createSkillElement(dispatchPlayer, 0.5, 1),
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Skill presets and reset',
      }),
    )
    await user.click(
      screen.getByRole('button', {
        name: /Load Preset 2/,
      }),
    )

    expect(
      screen.getByRole('button', { name: /Load Preset 2/ }),
    ).toBeEnabled()

    view.rerender(createSkillElement(dispatchPlayer, 0.5, 2))

    expect(
      screen.getByRole('button', { name: /Load Preset 2/ }),
    ).toBeEnabled()
    expect(
      screen.getByRole('button', { name: /Load Preset 2/ }),
    ).toHaveAttribute('aria-pressed', 'true')
    expect(
      within(
        screen.getByRole('button', { name: /Load Preset 2/ }),
      ).getByText('Current'),
    ).toBeInTheDocument()
  })

  test('keeps the automatic-assignment toggle available while a preset command is pending', async () => {
    const user = userEvent.setup()
    const dispatchPlayer: SkillsSurfaceProps['dispatchPlayer'] =
      vi.fn(async () => await new Promise<never>(() => undefined))
    renderSkills(dispatchPlayer)

    await user.click(
      screen.getByRole('button', {
        name: 'Skill presets and reset',
      }),
    )
    await user.click(
      screen.getByRole('button', {
        name: /Load Preset 2/,
      }),
    )

    expect(
      screen.getByRole('checkbox', {
        name: 'Allow automatic assignment of non-refundable skills',
      }),
    ).toBeEnabled()
    expect(
      screen.getByRole('button', { name: /Load Preset 1/ }),
    ).toBeDisabled()
  })

  test('does not reconcile the already-selected preset before its command completes', async () => {
    const user = userEvent.setup()
    const dispatchPlayer: SkillsSurfaceProps['dispatchPlayer'] =
      vi.fn(async () => await new Promise<never>(() => undefined))
    renderSkills(dispatchPlayer)

    await user.click(
      screen.getByRole('button', {
        name: 'Skill presets and reset',
      }),
    )
    await user.click(
      screen.getByRole('button', {
        name: /Load Preset 1/,
      }),
    )

    expect(
      screen.getByRole('button', { name: /Load Preset 1/ }),
    ).toBeDisabled()
  })

  test('releases an already-selected preset after its command completes', async () => {
    const user = userEvent.setup()
    renderSkills()

    await user.click(
      screen.getByRole('button', {
        name: 'Skill presets and reset',
      }),
    )
    await user.click(
      screen.getByRole('button', {
        name: /Load Preset 1/,
      }),
    )

    expect(
      screen.getByRole('button', { name: /Load Preset 1/ }),
    ).toBeEnabled()
    expect(
      screen.getByRole('button', { name: /Load Preset 2/ }),
    ).toBeEnabled()
  })

  test('keeps preset controls available while automatic assignment is pending', async () => {
    const user = userEvent.setup()
    const dispatchPlayer: SkillsSurfaceProps['dispatchPlayer'] =
      vi.fn(async () => await new Promise<never>(() => undefined))
    renderSkills(dispatchPlayer)

    await user.click(
      screen.getByRole('button', {
        name: 'Skill presets and reset',
      }),
    )
    await user.click(
      screen.getByRole('checkbox', {
        name: 'Allow automatic assignment of non-refundable skills',
      }),
    )

    expect(
      screen.getByRole('button', { name: /Load Preset 2/ }),
    ).toBeEnabled()
    expect(
      screen.getByRole('checkbox', {
        name: 'Allow automatic assignment of non-refundable skills',
      }),
    ).toBeDisabled()
  })
})
