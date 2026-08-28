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
import { afterEach, describe, expect, test, vi } from 'vitest'
import type { CanonicalSkillPresetSlot } from '../../../application/canonicalGameCommands'
import type {
  CanonicalSkillAvailabilityPreview,
  CanonicalSkillCatalogPreview,
} from '../../../simulation/canonicalSkillTransactions'
import {
  SkillsSurface,
  type SkillPresetActions,
  type SkillTreeViewState,
  type SkillsSurfaceProps,
} from './SkillsSurface'

const skillsCss = readFileSync(
  resolve(process.cwd(), 'src/ui/gameplay/skills/skills.css'),
  'utf8',
)

afterEach(() => {
  vi.useRealTimers()
  window.localStorage.clear()
  cleanup()
  vi.unstubAllGlobals()
  vi.restoreAllMocks()
})

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
    pointsRequired: 1n,
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
  reset: {
    refundableSkillIds: [],
    retainedSkillIds: [],
    queuedSkillIds: [],
  },
}

const presets = [
  {
    name: 'Preset 1',
    skillIds: [],
    botDistribution: 0,
    colorId: 'cyan',
  },
  {
    name: 'Preset 2',
    skillIds: ['startHereTree'],
    botDistribution: 0.5,
    colorId: 'orange',
  },
  {
    name: 'Preset 3',
    skillIds: [],
    botDistribution: 1,
    colorId: 'gold',
  },
  {
    name: 'Preset 4',
    skillIds: [],
    botDistribution: 0,
    colorId: 'rose',
  },
  {
    name: 'Preset 5',
    skillIds: [],
    botDistribution: 0,
    colorId: 'pink',
  },
] as const

function createSkillElement(
  dispatchPlayer: SkillsSurfaceProps['dispatchPlayer'],
  botDistribution = 0.5,
  selectedPresetSlot: CanonicalSkillPresetSlot = 1,
  catalogOverride: CanonicalSkillCatalogPreview = catalog,
  presetActions?: SkillPresetActions,
  treeView?: {
    readonly initialTreeView?: SkillTreeViewState | null
    readonly onTreeViewChange?: (view: SkillTreeViewState) => void
  },
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
          setPresetColor: true,
          setAutoAssignNonRefundable: true,
          reset: true,
        }}
        presetActions={presetActions}
        dispatchPlayer={dispatchPlayer}
        {...treeView}
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

function createPresetActions(
  overrides: Partial<SkillPresetActions> = {},
): SkillPresetActions {
  return {
    previewQueueChange: vi.fn(async () => ({
      affectedSkillIds: [],
      confirmationRequired: false,
    })),
    applyQueueChange: vi.fn(async () => true),
    exportPreset: vi.fn(async () => 'IDS-PRESET-1'),
    previewImportPreset: vi.fn(async () => ({
      name: 'Science',
      queuedSkillCount: 3,
      workerPercent: 20,
      colorId: 'pink' as const,
    })),
    importPreset: vi.fn(async () => true),
    ...overrides,
  }
}

function renderSkills(
  dispatchPlayer: SkillsSurfaceProps['dispatchPlayer'] =
    createDispatchPlayer(),
) {
  render(createSkillElement(dispatchPlayer))
  return dispatchPlayer
}

function readCanvasTransform(element: Element | null) {
  const style = element?.getAttribute('style') ?? ''
  const match = style.match(
    /translate3d\((-?[\d.]+)px, (-?[\d.]+)px, 0\) scale\((-?[\d.]+)\)/,
  )
  if (match === null) throw new Error(`Missing canvas transform: ${style}`)
  return {
    x: Number(match[1]),
    y: Number(match[2]),
    scale: Number(match[3]),
  }
}

describe('SkillsSurface', () => {
  test('has no serious or critical automated accessibility violations', async () => {
    const { container } = render(createSkillElement(createDispatchPlayer()))
    const results = await axe.run(container, {
      rules: {
        'color-contrast': { enabled: false },
      },
    })

    expect(
      results.violations.filter((violation) =>
        violation.impact === 'serious' || violation.impact === 'critical',
      ),
    ).toEqual([])
  })

  test('renders the canonical resource strip and authored starting node', () => {
    const { container } = render(createSkillElement(createDispatchPlayer()))

    expect(screen.getByText('Skill Points')).toHaveClass(
      'skills-surface__visually-hidden',
    )
    expect(
      container.querySelector('.skills-surface__resources strong'),
    ).toHaveTextContent('3')
    expect(
      container.querySelector('.skills-surface__resources img'),
    ).toHaveAttribute('src', expect.stringContaining('nav-skills'))
    expect(screen.queryByText(/Fragments:/)).not.toBeInTheDocument()
    expect(
      screen.getByRole('button', {
        name: 'Cash & Science. Cost: 1 Skill Points',
      }),
    ).toBeInTheDocument()
    expect(screen.queryByRole('slider')).not.toBeInTheDocument()
  })

  test('offers compact preset switching above the tree search', async () => {
    const dispatchPlayer = createDispatchPlayer()
    const { container } = render(createSkillElement(dispatchPlayer))

    const switcher = container.querySelector(
      '.skills-surface__quick-presets',
    )
    const search = container.querySelector('.skills-surface__search')
    expect(switcher).not.toBeNull()
    expect(search).not.toBeNull()
    if (switcher === null || search === null) {
      throw new Error('Expected quick presets and search controls')
    }
    expect(
      switcher.compareDocumentPosition(search) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy()
    expect(screen.getByRole('button', {
      name: 'Switch to Preset 1',
    })).toHaveAttribute('aria-pressed', 'true')

    fireEvent.click(screen.getByRole('button', {
      name: 'Switch to Preset 2',
    }))

    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'skill.select-preset',
      slot: 2,
    })
    expect(skillsCss).toMatch(
      /\.skills-surface__viewport-controls\s*\{[^}]*display:\s*contents;/,
    )
    expect(skillsCss).toMatch(
      /\.skills-surface__quick-presets\s*\{[^}]*grid-column:\s*1 \/ -1;[^}]*grid-row:\s*1;/,
    )
    expect(skillsCss).toMatch(
      /\.skill-tree-viewport__controls \.skills-surface__search\s*\{[^}]*grid-column:\s*1;[^}]*grid-row:\s*2;/,
    )
    expect(skillsCss).toMatch(
      /\.skill-tree-viewport__controls\s*\{[^}]*grid-template-columns:\s*minmax\(0, 1fr\)\s*repeat\(3, var\(--target-minimum\)\);[^}]*grid-template-rows:\s*auto var\(--target-minimum\);/,
    )
    expect(skillsCss).toMatch(
      /\.skill-tree-viewport__controls > button\s*\{[^}]*grid-row:\s*2;[^}]*inline-size:\s*var\(--target-minimum\);[^}]*block-size:\s*var\(--target-minimum\);/,
    )
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

    fireEvent.click(target, { detail: 0 })

    expect(target).toHaveAttribute('data-selected', 'true')
    expect(
      screen.getByRole('button', { name: /Assembly Lines/ }),
    ).toHaveAttribute('data-selection-related', 'true')
    expect(
      screen.getByRole('button', { name: /Parallel Computation/ }),
    ).toHaveAttribute('data-selection-dimmed', 'true')
    expect(
      container.querySelectorAll(
        '.skill-tree-viewport__connections .skill-tree-connection:not(.skill-tree-connection-arrow)[data-selected-path="true"]',
      ),
    ).toHaveLength(3)
    expect(
      container.querySelector(
        '.skill-tree-viewport__connections path.skill-tree-connection--met[data-source-owned="true"]',
      ),
    ).toBeInTheDocument()
    expect(
      container.querySelector(
        '.skill-tree-viewport__connections path.skill-tree-connection--unmet:not([marker-end])',
      ),
    ).toBeInTheDocument()
    expect(
      container.querySelector(
        '.skill-tree-viewport__connections path.skill-tree-connection-arrow',
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

    await user.click(
      screen.getByRole('button', { name: 'Clear skill search' }),
    )
    expect(
      screen.getByRole('searchbox', { name: 'Search skills' }),
    ).toHaveValue('')
    expect(screen.queryByText('1 match')).not.toBeInTheDocument()
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

  test('opens skill details when movement stays below the drag threshold', async () => {
    renderSkills()
    const skill = screen.getByRole('button', {
      name: 'Cash & Science. Cost: 1 Skill Points',
    })
    const tree = screen.getByRole('region', { name: 'Skill tree' })
    const capturePointer = vi.fn()
    Object.defineProperty(tree, 'setPointerCapture', {
      configurable: true,
      value: capturePointer,
    })
    const canvas = document.querySelector(
      '.skill-tree-viewport__canvas',
    )
    const before = canvas?.getAttribute('style')

    fireEvent.pointerDown(skill, {
      pointerId: 1,
      clientX: 100,
      clientY: 100,
    })
    fireEvent.pointerMove(skill, {
      pointerId: 1,
      clientX: 103,
      clientY: 104,
    })
    fireEvent.pointerUp(skill, {
      pointerId: 1,
      clientX: 103,
      clientY: 104,
    })
    fireEvent.click(skill)

    expect(canvas?.getAttribute('style')).toBe(before)
    expect(capturePointer).not.toHaveBeenCalled()
    expect(
      await screen.findByRole('dialog', { name: 'Cash & Science' }),
    ).toBeInTheDocument()
    expect(
      document.querySelector(
        '.skill-details-dialog[data-palette="normal"]',
      ),
    ).toBeInTheDocument()
  })

  test('pans from a skill icon after the drag threshold and suppresses its click', () => {
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        frames.push(callback)
        return frames.length
      }),
    )
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    const { container } = render(
      createSkillElement(createDispatchPlayer()),
    )
    const skill = screen.getByRole('button', {
      name: 'Cash & Science. Cost: 1 Skill Points',
    })
    const tree = screen.getByRole('region', { name: 'Skill tree' })
    const capturePointer = vi.fn()
    Object.defineProperty(tree, 'setPointerCapture', {
      configurable: true,
      value: capturePointer,
    })
    const canvas = container.querySelector(
      '.skill-tree-viewport__canvas',
    )
    const before = readCanvasTransform(canvas)

    fireEvent.pointerDown(skill, {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 100,
      clientY: 100,
    })
    fireEvent.pointerMove(skill, {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 125,
      clientY: 130,
    })
    fireEvent.lostPointerCapture(skill, { pointerId: 2 })
    fireEvent.pointerMove(tree, {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 140,
      clientY: 150,
    })
    fireEvent.pointerUp(tree, {
      pointerId: 2,
      pointerType: 'touch',
      clientX: 140,
      clientY: 150,
    })
    fireEvent.click(skill, { detail: 1 })

    act(() => frames[0]?.(0))
    const after = readCanvasTransform(canvas)
    expect(capturePointer).toHaveBeenCalledWith(2)
    expect(after.x).toBe(before.x + 40)
    expect(after.y).toBe(before.y + 50)
    expect(
      screen.queryByRole('dialog', { name: 'Cash & Science' }),
    ).not.toBeInTheDocument()
  })

  test('restores the remembered graph centre and zoom after remounting', () => {
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect')
      .mockReturnValue({
        bottom: 300,
        height: 300,
        left: 0,
        right: 400,
        top: 0,
        width: 400,
        x: 0,
        y: 0,
        toJSON: () => ({}),
      })
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        frames.push(callback)
        return frames.length
      }),
    )
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    const remembered: { current: SkillTreeViewState | null } = {
      current: null,
    }
    const remember = (view: SkillTreeViewState) => {
      remembered.current = view
    }
    const first = render(
      createSkillElement(
        createDispatchPlayer(),
        0.5,
        1,
        catalog,
        undefined,
        { onTreeViewChange: remember },
      ),
    )
    const tree = screen.getByRole('region', { name: 'Skill tree' })
    const canvas = first.container.querySelector(
      '.skill-tree-viewport__canvas',
    )
    const initial = readCanvasTransform(canvas)

    fireEvent.pointerDown(tree, {
      pointerId: 21,
      clientX: 10,
      clientY: 10,
    })
    fireEvent.pointerMove(tree, {
      pointerId: 21,
      clientX: 45,
      clientY: 55,
    })
    fireEvent.pointerUp(tree, {
      pointerId: 21,
      clientX: 45,
      clientY: 55,
    })
    act(() => frames.shift()?.(0))
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))
    const moved = readCanvasTransform(canvas)
    expect(moved).not.toEqual(initial)
    expect(remembered.current?.scale).toBeCloseTo(0.9)

    first.unmount()
    const second = render(
      createSkillElement(
        createDispatchPlayer(),
        0.5,
        1,
        catalog,
        undefined,
        {
          initialTreeView: remembered.current,
          onTreeViewChange: remember,
        },
      ),
    )
    expect(
      readCanvasTransform(
        second.container.querySelector('.skill-tree-viewport__canvas'),
      ),
    ).toEqual(moved)
  })

  test('keeps keyboard skill activation available after a drag', () => {
    renderSkills()
    const skill = screen.getByRole('button', {
      name: 'Cash & Science. Cost: 1 Skill Points',
    })

    fireEvent.pointerDown(skill, {
      pointerId: 3,
      clientX: 100,
      clientY: 100,
    })
    fireEvent.pointerMove(skill, {
      pointerId: 3,
      clientX: 125,
      clientY: 125,
    })
    fireEvent.pointerUp(skill, {
      pointerId: 3,
      clientX: 125,
      clientY: 125,
    })
    fireEvent.click(skill, { detail: 0 })

    expect(
      screen.getByRole('dialog', { name: 'Cash & Science' }),
    ).toBeInTheDocument()
  })

  test('assigns an eligible skill on a second tap without opening details', () => {
    vi.useFakeTimers()
    window.localStorage.setItem(
      'idle-dyson-swarm:skill-double-click-assignment',
      'true',
    )
    const dispatchPlayer = renderSkills()
    const skill = screen.getByRole('button', {
      name: 'Cash & Science. Cost: 1 Skill Points',
    })
    const tap = (pointerId: number) => {
      fireEvent.pointerDown(skill, {
        pointerId,
        pointerType: 'touch',
        clientX: 100,
        clientY: 100,
      })
      fireEvent.pointerUp(skill, {
        pointerId,
        pointerType: 'touch',
        clientX: 100,
        clientY: 100,
      })
      fireEvent.click(skill, { detail: 1 })
    }

    tap(31)
    act(() => vi.advanceTimersByTime(200))
    tap(32)

    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'skill.purchase',
      skillId: 'startHereTree',
    })
    expect(screen.queryByRole('dialog', { name: 'Cash & Science' }))
      .not.toBeInTheDocument()
  })

  test('opens details after one tap waits beyond the double-tap window', () => {
    vi.useFakeTimers()
    window.localStorage.setItem(
      'idle-dyson-swarm:skill-double-click-assignment',
      'true',
    )
    renderSkills()
    const skill = screen.getByRole('button', {
      name: 'Cash & Science. Cost: 1 Skill Points',
    })

    fireEvent.pointerDown(skill, {
      pointerId: 33,
      pointerType: 'mouse',
      clientX: 100,
      clientY: 100,
    })
    fireEvent.pointerUp(skill, {
      pointerId: 33,
      pointerType: 'mouse',
      clientX: 100,
      clientY: 100,
    })
    fireEvent.click(skill, { detail: 1 })
    expect(screen.queryByRole('dialog', { name: 'Cash & Science' }))
      .not.toBeInTheDocument()

    act(() => vi.advanceTimersByTime(360))
    expect(screen.getByRole('dialog', { name: 'Cash & Science' }))
      .toBeInTheDocument()
  })

  test('assigns an eligible skill on a mouse double click', () => {
    vi.useFakeTimers()
    window.localStorage.setItem(
      'idle-dyson-swarm:skill-double-click-assignment',
      'true',
    )
    const dispatchPlayer = createDispatchPlayer()
    renderSkills(dispatchPlayer)
    const skill = screen.getByRole('button', {
      name: 'Cash & Science. Cost: 1 Skill Points',
    })

    fireEvent.click(skill, { detail: 1 })
    fireEvent.click(skill, { detail: 2 })

    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'skill.purchase',
      skillId: 'startHereTree',
    })
    expect(screen.queryByRole('dialog', { name: 'Cash & Science' }))
      .not.toBeInTheDocument()
  })

  test('assigns an eligible Purity skill with projected production impact on a mouse double click', () => {
    vi.useFakeTimers()
    window.localStorage.setItem(
      'idle-dyson-swarm:skill-double-click-assignment',
      'true',
    )
    const dispatchPlayer = createDispatchPlayer()
    const purityCatalog: CanonicalSkillCatalogPreview = {
      ...catalog,
      skills: [
        createSkillPreview('startHereTree', {
          purchase: {
            ...startSkill.purchase,
            productionImpact: {
              pointsBefore: 4n,
              pointsAfter: 2n,
              purity: {
                cashScienceBefore: 16,
                cashScienceAfter: 4,
                botsBefore: 8,
                botsAfter: 2,
                everythingBefore: 2,
                everythingAfter: 1,
              },
            },
          },
        }),
      ],
    }
    render(createSkillElement(dispatchPlayer, 0.5, 1, purityCatalog))
    const skill = screen.getByRole('button', {
      name: 'Cash & Science. Cost: 1 Skill Points',
    })

    fireEvent.click(skill, { detail: 1 })
    fireEvent.click(skill, { detail: 2 })

    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'skill.purchase',
      skillId: 'startHereTree',
    })
    expect(screen.queryByRole('dialog', { name: 'Cash & Science' }))
      .not.toBeInTheDocument()
  })

  test('opens details immediately until double-click assignment is enabled', () => {
    renderSkills()
    const skill = screen.getByRole('button', {
      name: 'Cash & Science. Cost: 1 Skill Points',
    })

    fireEvent.click(skill, { detail: 1 })

    expect(screen.getByRole('dialog', { name: 'Cash & Science' }))
      .toBeInTheDocument()
  })

  test('persists the double-click assignment toggle in expanded settings', () => {
    renderSkills()

    fireEvent.click(screen.getByRole('button', {
      name: 'Skill presets and reset',
    }))
    const toggle = screen.getByRole('checkbox', {
      name: 'Double-click to assign skills',
    })
    expect(toggle).not.toBeChecked()

    fireEvent.click(toggle)

    expect(toggle).toBeChecked()
    expect(window.localStorage.getItem(
      'idle-dyson-swarm:skill-double-click-assignment',
    )).toBe('true')
  })

  test('traps the skill dialog entry on its compact close control and restores focus', async () => {
    const user = userEvent.setup()
    renderSkills()
    const skill = screen.getByRole('button', {
      name: 'Cash & Science. Cost: 1 Skill Points',
    })
    const focus = vi.spyOn(skill, 'focus')

    skill.focus()
    fireEvent.click(skill, { detail: 0 })
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
    const results = await axe.run(document.body, {
      rules: { 'color-contrast': { enabled: false } },
    })
    expect(
      results.violations.filter((violation) =>
        violation.impact === 'serious' || violation.impact === 'critical',
      ),
    ).toEqual([])
    focus.mockClear()

    await user.keyboard('{Escape}')
    expect(
      screen.queryByRole('dialog', { name: 'Cash & Science' }),
    ).not.toBeInTheDocument()
    expect(skill).toHaveFocus()
    expect(focus).toHaveBeenCalledWith({ preventScroll: true })
  })

  test('shows fragment balance only inside a fragment skill dialog', async () => {
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
            setPresetColor: true,
            setAutoAssignNonRefundable: true,
            reset: true,
          }}
          dispatchPlayer={createDispatchPlayer()}
        />
      </IntlProvider>,
    )

    expect(screen.queryByText(/Fragments:/)).not.toBeInTheDocument()
    fireEvent.click(
      screen.getByRole('button', {
        name: /Cash & Science\. Cost: 1 Skill Points/,
      }),
      { detail: 0 },
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
            setPresetColor: true,
            setAutoAssignNonRefundable: true,
            reset: true,
          }}
          dispatchPlayer={createDispatchPlayer()}
        />
      </IntlProvider>,
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Cash & Science. Cost: 1 Skill Points',
      }),
      { detail: 0 },
    )

    expect(
      document.querySelector(
        '.skill-details-dialog[data-palette="non-refundable"]',
      ),
    ).toBeInTheDocument()
  })

  test('uses the disabled action itself without redundant unavailable filler', async () => {
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
            setPresetColor: true,
            setAutoAssignNonRefundable: true,
            reset: true,
          }}
          dispatchPlayer={createDispatchPlayer()}
        />
      </IntlProvider>,
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: /Cash & Science\. Cost: 1 Skill Points/,
      }),
      { detail: 0 },
    )
    const assign = screen.getByRole('button', {
      name: 'Assign Skill. Will cost 1 Skill Points',
    })

    expect(assign).toBeDisabled()
    expect(
      screen.getByText('Will cost 1 Skill Points'),
    ).toBeInTheDocument()
    expect(
      screen.queryByText('This action is not currently available.'),
    ).not.toBeInTheDocument()
  })

  test('formats projected Purity multipliers with the active game notation', async () => {
    const user = userEvent.setup()
    const purityCatalog: CanonicalSkillCatalogPreview = {
      ...catalog,
      skills: [
        createSkillPreview('startHereTree', {
          purchase: {
            ...startSkill.purchase,
            productionImpact: {
              pointsBefore: 33n,
              pointsAfter: 26n,
              purity: {
                cashScienceBefore: 1,
                cashScienceAfter: 345_040_194.0680835,
                botsBefore: 1,
                botsAfter: 3_014_097.468136991,
                everythingBefore: 1,
                everythingAfter: 9_109.550630164726,
              },
            },
          },
        }),
      ],
    }
    render(
      createSkillElement(
        createDispatchPlayer(),
        0.5,
        1,
        purityCatalog,
      ),
    )

    fireEvent.click(screen.getByRole('button', {
      name: 'Cash & Science. Cost: 1 Skill Points',
    }), { detail: 0 })
    await user.click(screen.getByRole('button', {
      name: 'Assign Skill. Will cost 1 Skill Points',
    }))

    expect(screen.getByRole('group', {
      name: 'Confirm skill change',
    })).toBeInTheDocument()

    const impact = document.querySelector(
      '.skill-details__production-impact',
    )
    expect(impact).toHaveTextContent('Skill Points33to▶26')
    expect(impact).toHaveTextContent('Cash & Science×1.00to▶×345M')
    expect(impact).toHaveTextContent('Bots×1.00to▶×3.01M')
    expect(impact).toHaveTextContent('Everything×1.00to▶×9.10K')
    expect(impact?.querySelectorAll('.skill-details__impact-row')).toHaveLength(4)
    expect(impact?.querySelectorAll('.skill-details__impact-arrow')).toHaveLength(4)
    expect(impact).not.toHaveTextContent('0680835')
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

  test('coalesces rapid pan updates into one animation-frame transform', () => {
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        frames.push(callback)
        return frames.length
      }),
    )
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    const { container } = render(
      createSkillElement(createDispatchPlayer()),
    )
    const tree = screen.getByRole('region', { name: 'Skill tree' })
    const canvas = container.querySelector(
      '.skill-tree-viewport__canvas',
    )
    const before = canvas?.getAttribute('style') ?? ''
    const beforeMatch = before.match(
      /translate3d\((-?[\d.]+)px, (-?[\d.]+)px, 0\)/,
    )
    expect(beforeMatch).not.toBeNull()

    fireEvent.pointerDown(tree, {
      pointerId: 7,
      clientX: 10,
      clientY: 15,
    })
    fireEvent.pointerMove(tree, {
      pointerId: 7,
      clientX: 20,
      clientY: 25,
    })
    fireEvent.pointerMove(tree, {
      pointerId: 7,
      clientX: 40,
      clientY: 55,
    })

    expect(requestAnimationFrame).toHaveBeenCalledTimes(1)
    act(() => frames[0]?.(0))
    const after = canvas?.getAttribute('style') ?? ''
    const expectedX = Number(beforeMatch?.[1]) + 30
    const expectedY = Number(beforeMatch?.[2]) + 40
    expect(after).toContain(
      `translate3d(${expectedX}px, ${expectedY}px, 0)`,
    )
  })

  test('applies pending pan before immediate centre and zoom controls', () => {
    const frames: FrameRequestCallback[] = []
    const cancelFrame = vi.fn()
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        frames.push(callback)
        return frames.length
      }),
    )
    vi.stubGlobal('cancelAnimationFrame', cancelFrame)
    const { container } = render(
      createSkillElement(createDispatchPlayer()),
    )
    const tree = screen.getByRole('region', { name: 'Skill tree' })
    const canvas = container.querySelector(
      '.skill-tree-viewport__canvas',
    )
    const initial = readCanvasTransform(canvas)

    fireEvent.pointerDown(tree, {
      pointerId: 8,
      clientX: 10,
      clientY: 10,
    })
    fireEvent.pointerMove(tree, {
      pointerId: 8,
      clientX: 30,
      clientY: 40,
    })
    fireEvent.click(
      screen.getByRole('button', { name: 'Centre on starting skill' }),
    )

    expect(readCanvasTransform(canvas)).toEqual(initial)
    expect(cancelFrame).toHaveBeenCalledTimes(1)
    act(() => frames[0]?.(0))
    expect(readCanvasTransform(canvas)).toEqual(initial)

    fireEvent.pointerMove(tree, {
      pointerId: 8,
      clientX: 40,
      clientY: 50,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))

    const zoomed = readCanvasTransform(canvas)
    expect(zoomed.scale).toBeCloseTo(0.9)
    expect(zoomed.x).toBeCloseTo((initial.x + 10) * (0.9 / 0.8))
    expect(zoomed.y).toBeCloseTo((initial.y + 10) * (0.9 / 0.8))
    act(() => frames[1]?.(0))
    expect(readCanvasTransform(canvas)).toEqual(zoomed)
  })

  test('orders pending pan before resize and cancels queued work on unmount', () => {
    const frames: FrameRequestCallback[] = []
    const cancelFrame = vi.fn()
    let resize: ResizeObserverCallback | undefined
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        frames.push(callback)
        return frames.length
      }),
    )
    vi.stubGlobal('cancelAnimationFrame', cancelFrame)
    vi.stubGlobal(
      'ResizeObserver',
      class {
        constructor(callback: ResizeObserverCallback) {
          resize = callback
        }
        observe() {}
        disconnect() {}
      },
    )
    const rendered = render(createSkillElement(createDispatchPlayer()))
    const tree = screen.getByRole('region', { name: 'Skill tree' })
    const canvas = rendered.container.querySelector(
      '.skill-tree-viewport__canvas',
    )
    const initial = readCanvasTransform(canvas)
    const resizeEntry = (width: number, height: number) => ({
      contentRect: { width, height },
    }) as ResizeObserverEntry
    act(() => resize?.([resizeEntry(100, 100)], {} as ResizeObserver))

    fireEvent.pointerDown(tree, {
      pointerId: 9,
      clientX: 10,
      clientY: 10,
    })
    fireEvent.pointerMove(tree, {
      pointerId: 9,
      clientX: 30,
      clientY: 40,
    })
    act(() => resize?.([resizeEntry(120, 140)], {} as ResizeObserver))

    const resized = readCanvasTransform(canvas)
    expect(resized.x).toBeCloseTo(initial.x + 30)
    expect(resized.y).toBeCloseTo(initial.y + 50)
    act(() => frames[0]?.(0))
    expect(readCanvasTransform(canvas)).toEqual(resized)

    fireEvent.pointerMove(tree, {
      pointerId: 9,
      clientX: 35,
      clientY: 45,
    })
    const beforeUnmount = readCanvasTransform(canvas)
    rendered.unmount()
    expect(cancelFrame).toHaveBeenCalledTimes(2)
    act(() => frames[1]?.(0))
    expect(readCanvasTransform(canvas)).toEqual(beforeUnmount)
  })

  test('applies relative zoom controls after a queued pinch scale', () => {
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        frames.push(callback)
        return frames.length
      }),
    )
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    const { container } = render(
      createSkillElement(createDispatchPlayer()),
    )
    const tree = screen.getByRole('region', { name: 'Skill tree' })
    const canvas = container.querySelector(
      '.skill-tree-viewport__canvas',
    )

    fireEvent.pointerDown(tree, {
      pointerId: 10,
      clientX: 0,
      clientY: 0,
    })
    fireEvent.pointerDown(tree, {
      pointerId: 11,
      clientX: 100,
      clientY: 0,
    })
    fireEvent.pointerMove(tree, {
      pointerId: 11,
      clientX: 150,
      clientY: 0,
    })
    fireEvent.click(screen.getByRole('button', { name: 'Zoom in' }))

    const zoomed = readCanvasTransform(canvas)
    expect(zoomed.scale).toBeCloseTo(1.3)
    act(() => frames[0]?.(0))
    expect(readCanvasTransform(canvas)).toEqual(zoomed)
  })

  test('continues a pinch when skill touch capture transfers to the viewport', () => {
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        frames.push(callback)
        return frames.length
      }),
    )
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    const { container } = render(
      createSkillElement(createDispatchPlayer()),
    )
    const tree = screen.getByRole('region', { name: 'Skill tree' })
    const skill = screen.getByRole('button', {
      name: 'Cash & Science. Cost: 1 Skill Points',
    })
    const canvas = container.querySelector(
      '.skill-tree-viewport__canvas',
    )

    fireEvent.pointerDown(skill, {
      pointerId: 14,
      pointerType: 'touch',
      clientX: 0,
      clientY: 0,
    })
    fireEvent.pointerDown(skill, {
      pointerId: 15,
      pointerType: 'touch',
      clientX: 100,
      clientY: 0,
    })
    fireEvent.lostPointerCapture(skill, { pointerId: 14 })
    fireEvent.lostPointerCapture(skill, { pointerId: 15 })
    fireEvent.pointerMove(tree, {
      pointerId: 15,
      pointerType: 'touch',
      clientX: 150,
      clientY: 0,
    })

    act(() => frames[0]?.(0))
    expect(readCanvasTransform(canvas).scale).toBeCloseTo(1.2)
  })

  test('restarts a pinch from its queued effective scale before the frame commits', () => {
    const frames: FrameRequestCallback[] = []
    vi.stubGlobal(
      'requestAnimationFrame',
      vi.fn((callback: FrameRequestCallback) => {
        frames.push(callback)
        return frames.length
      }),
    )
    vi.stubGlobal('cancelAnimationFrame', vi.fn())
    const { container } = render(
      createSkillElement(createDispatchPlayer()),
    )
    const tree = screen.getByRole('region', { name: 'Skill tree' })
    const canvas = container.querySelector(
      '.skill-tree-viewport__canvas',
    )

    fireEvent.pointerDown(tree, {
      pointerId: 12,
      clientX: 0,
      clientY: 0,
    })
    fireEvent.pointerDown(tree, {
      pointerId: 13,
      clientX: 100,
      clientY: 0,
    })
    fireEvent.pointerMove(tree, {
      pointerId: 13,
      clientX: 150,
      clientY: 0,
    })
    fireEvent.pointerUp(tree, { pointerId: 13 })
    fireEvent.pointerDown(tree, {
      pointerId: 13,
      clientX: 150,
      clientY: 0,
    })
    fireEvent.pointerMove(tree, {
      pointerId: 13,
      clientX: 125,
      clientY: 0,
    })

    expect(requestAnimationFrame).toHaveBeenCalledTimes(1)
    act(() => frames[0]?.(0))
    expect(readCanvasTransform(canvas).scale).toBeCloseTo(1)
  })

  test('dispatches purchase intent without changing gameplay locally', async () => {
    const user = userEvent.setup()
    const dispatchPlayer = renderSkills()

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Cash & Science. Cost: 1 Skill Points',
      }),
      { detail: 0 },
    )
    expect(
      screen.getByRole('dialog', { name: 'Cash & Science' }),
    ).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', {
        name: 'Assign Skill. Will cost 1 Skill Points',
      }),
    )

    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'skill.purchase',
      skillId: 'startHereTree',
    })
    expect(
      screen.getByRole('dialog', { name: 'Cash & Science' }),
    ).toBeInTheDocument()
  })

  test('confirms a canonical prerequisite cascade before assigning it', async () => {
    const user = userEvent.setup()
    const dispatchPlayer = createDispatchPlayer()
    const cascadeCatalog: CanonicalSkillCatalogPreview = {
      ...catalog,
      skills: [
        startSkill,
        createSkillPreview('assemblyLineTree', {
          cost: 1n,
          requiredSkillIds: ['startHereTree'],
          purchase: {
            eligible: true,
            code: 'purchasable',
            affectedSkillIds: [
              'startHereTree',
              'assemblyLineTree',
            ],
            pointsRequired: 2n,
          },
        }),
      ],
    }
    render(
      createSkillElement(
        dispatchPlayer,
        0.5,
        1,
        cascadeCatalog,
      ),
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Assembly Lines. Cost: 1 Skill Points',
      }),
      { detail: 0 },
    )
    await user.click(
      screen.getByRole('button', {
        name: 'Assign Skill. Will cost 2 Skill Points',
      }),
    )

    expect(dispatchPlayer).not.toHaveBeenCalled()
    expect(
      screen.getByText('Also assign these required skills:'),
    ).toBeInTheDocument()
    const affected = screen.getByRole('list', {
      name: 'Skills affected by this change',
    })
    expect(within(affected).getByText('Cash & Science')).toBeInTheDocument()
    expect(affected.querySelectorAll('img')).toHaveLength(1)

    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'skill.purchase',
      skillId: 'assemblyLineTree',
    })
  })

  test('shows and confirms the canonical total refund cascade', async () => {
    const user = userEvent.setup()
    const dispatchPlayer = createDispatchPlayer()
    const ownedCatalog: CanonicalSkillCatalogPreview = {
      ...catalog,
      skills: [
        {
          ...startSkill,
          owned: true,
          visualState: 'owned',
          purchase: {
            eligible: false,
            code: 'already-owned',
            affectedSkillIds: [],
            pointsRequired: 0n,
          },
          refund: {
            eligible: true,
            code: 'refundable',
            affectedSkillIds: [
              'assemblyLineTree',
              'startHereTree',
            ],
            pointsReturned: 4n,
            fragmentsRemoved: 0n,
          },
        },
      ],
    }
    render(
      createSkillElement(
        dispatchPlayer,
        0.5,
        1,
        ownedCatalog,
      ),
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Cash & Science. Owned',
      }),
      { detail: 0 },
    )
    const unassign = screen.getByRole('button', {
      name: 'Unassign Skill. Will refund 4 Skill Points',
    })

    expect(
      screen.getByText('Will refund 4 Skill Points'),
    ).toBeInTheDocument()
    await user.click(unassign)
    expect(dispatchPlayer).not.toHaveBeenCalled()
    expect(
      screen.getByText('Also unassign these dependent skills:'),
    ).toBeInTheDocument()
    const affected = screen.getByRole('list', {
      name: 'Skills affected by this change',
    })
    expect(within(affected).getByText('Assembly Lines')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'skill.refund',
      skillId: 'startHereTree',
    })
  })

  test('warns that cascading Stellar Obliteration refund restores Supernova production', async () => {
    const user = userEvent.setup()
    const dispatchPlayer = createDispatchPlayer()
    const manualPurchase = ([
      'assembly_lines',
      'ai_managers',
      'servers',
      'data_centers',
      'planets',
    ] as const).map((facilityId) => ({
      facilityId,
      effectiveManualCount: 101,
      beforeMultiplier: 1,
      afterMultiplier: 8.4,
    }))
    const restorationCatalog: CanonicalSkillCatalogPreview = {
      ...catalog,
      skills: [
        createSkillPreview('stellarObliteration', {
          owned: true,
          visualState: 'owned',
          purchase: {
            eligible: false,
            code: 'already-owned',
            affectedSkillIds: [],
            pointsRequired: 0n,
          },
          refund: {
            eligible: true,
            code: 'refundable',
            affectedSkillIds: ['supernova', 'stellarObliteration'],
            pointsReturned: 6n,
            fragmentsRemoved: 0n,
            productionImpact: {
              pointsBefore: 6n,
              pointsAfter: 12n,
              manualPurchase,
            },
          },
        }),
        createSkillPreview('supernova', {
          owned: true,
          visualState: 'owned',
        }),
      ],
    }
    render(
      createSkillElement(
        dispatchPlayer,
        0.5,
        1,
        restorationCatalog,
      ),
    )

    fireEvent.click(
      screen.getByRole('button', { name: 'Stellar Obliteration. Owned' }),
      { detail: 0 },
    )
    await user.click(
      screen.getByRole('button', {
        name: 'Unassign Skill. Will refund 6 Skill Points',
      }),
    )

    expect(dispatchPlayer).not.toHaveBeenCalled()
    expect(
      screen.getByText(
        'Refunding Supernova restores the complete manual-purchase layer: Avocados, both 50/100 milestones, Production Scaling, and every Swarm rate.',
      ),
    ).toBeInTheDocument()
    expect(
      document.querySelector('.skill-details__production-impact'),
    ).toHaveTextContent('assembly_lines×1.00to▶×8.40')

    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'skill.refund',
      skillId: 'stellarObliteration',
    })
  })

  test('unassigns immediately when no dependent skill is affected', async () => {
    const user = userEvent.setup()
    const dispatchPlayer = createDispatchPlayer()
    const ownedCatalog: CanonicalSkillCatalogPreview = {
      ...catalog,
      skills: [
        {
          ...startSkill,
          owned: true,
          visualState: 'owned',
          purchase: {
            eligible: false,
            code: 'already-owned',
            affectedSkillIds: [],
            pointsRequired: 0n,
          },
          refund: {
            eligible: true,
            code: 'refundable',
            affectedSkillIds: ['startHereTree'],
            pointsReturned: 1n,
            fragmentsRemoved: 0n,
          },
        },
      ],
    }
    render(
      createSkillElement(
        dispatchPlayer,
        0.5,
        1,
        ownedCatalog,
      ),
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Cash & Science. Owned',
      }),
      { detail: 0 },
    )
    await user.click(
      screen.getByRole('button', {
        name: 'Unassign Skill. Will refund 1 Skill Points',
      }),
    )

    expect(
      screen.queryByRole('group', { name: 'Confirm skill change' }),
    ).not.toBeInTheDocument()
    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'skill.refund',
      skillId: 'startHereTree',
    })
  })

  test('previews a canonical preset cascade before changing skill inclusion', async () => {
    const user = userEvent.setup()
    const actions = createPresetActions({
      previewQueueChange: vi.fn(async () => ({
        affectedSkillIds: ['assemblyLineTree', 'aiManagerTree'],
        confirmationRequired: true,
      })),
    })
    render(
      createSkillElement(
        createDispatchPlayer(),
        0.5,
        1,
        catalog,
        actions,
      ),
    )

    fireEvent.click(
      screen.getByRole('button', {
        name: /Cash & Science\. Cost: 1 Skill Points/,
      }),
      { detail: 0 },
    )
    const inclusion = screen.getByRole('checkbox', {
      name: 'Included in Preset 1',
    })
    const actionGroup = inclusion.closest('.skill-details__actions')
    expect(actionGroup).toContainElement(
      screen.getByRole('button', {
        name: 'Assign Skill. Will cost 1 Skill Points',
      }),
    )
    await user.click(inclusion)

    expect(actions.previewQueueChange).toHaveBeenCalledWith({
      slot: 1,
      skillId: 'startHereTree',
      included: true,
    })
    expect(
      screen.getByText('Also include these required skills:'),
    ).toBeInTheDocument()
    const affected = screen.getByRole('list', {
      name: 'Skills affected by this change',
    })
    expect(within(affected).getAllByRole('listitem')).toHaveLength(2)
    expect(within(affected).getByText('Assembly Lines')).toBeInTheDocument()
    expect(within(affected).getByText('AI Managers')).toBeInTheDocument()
    expect(affected.querySelectorAll('img')).toHaveLength(2)
    expect(actions.applyQueueChange).not.toHaveBeenCalled()

    await user.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(actions.applyQueueChange).toHaveBeenCalledWith({
      slot: 1,
      skillId: 'startHereTree',
      included: true,
    })
  })

  test('dispatches the selected canonical preset from settings', async () => {
    const user = userEvent.setup()
    const dispatchPlayer = renderSkills()

    const settingsToggle = screen.getByRole('button', {
      name: 'Skill presets and reset',
    })
    expect(
      settingsToggle.querySelector('[data-symbol="settings"]'),
    ).toBeInTheDocument()
    expect(settingsToggle).not.toHaveTextContent('⚙')
    await user.click(settingsToggle)
    await user.click(screen.getByRole('button', { name: 'Presets' }))
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

  test('keeps load and management actions separate and supports rename and transfer preview', async () => {
    const user = userEvent.setup()
    const dispatchPlayer = createDispatchPlayer()
    const actions = createPresetActions()
    render(
      createSkillElement(
        dispatchPlayer,
        0.5,
        1,
        catalog,
        actions,
      ),
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Skill presets and reset',
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Presets' }))
    const load = screen.getByRole('button', { name: /Load Preset 1/ })
    const manage = screen.getByRole('button', {
      name: 'Manage Preset 1',
    })
    expect(load.contains(manage)).toBe(false)

    await user.click(manage)
    expect(
      screen.getByRole('dialog', { name: 'Manage Preset 1' }),
    ).toBeInTheDocument()

    const name = screen.getByRole('textbox', { name: 'Preset name' })
    await user.clear(name)
    await user.type(name, 'Bots')
    await user.click(screen.getByRole('button', { name: 'Rename' }))
    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'skill.rename-preset',
      slot: 1,
      name: 'Bots',
    })

    await user.click(
      screen.getByRole('button', { name: 'Create export' }),
    )
    expect(
      screen.getByRole('textbox', {
        name: 'Preset export string',
      }),
    ).toHaveValue('IDS-PRESET-1')

    const importText = screen.getByRole('textbox', {
      name: 'Preset import string',
    })
    await user.type(importText, 'SHARED-PRESET')
    await user.click(
      screen.getByRole('button', { name: 'Preview import' }),
    )
    expect(actions.previewImportPreset).toHaveBeenCalledWith(
      1,
      'SHARED-PRESET',
    )
    expect(screen.getByText('Science')).toBeInTheDocument()
    expect(
      document.querySelector(
        '.skill-preset-management__preview .skill-preset-summary',
      ),
    ).toHaveTextContent(
      '3 queued skills · 20% Workers · 80% Scientists',
    )
    expect(screen.getByText('3 queued skills')).toHaveClass(
      'skill-preset-summary__queued',
    )
    expect(screen.getByText('20% Workers').closest(
      '.skill-preset-summary__distribution',
    )).toContainElement(screen.getByText('80% Scientists'))
    expect(screen.getByText('20% Workers')).toHaveClass(
      'skill-preset-summary__workers',
    )
    expect(screen.getByText('80% Scientists')).toHaveClass(
      'skill-preset-summary__scientists',
    )
    expect(
      document.querySelector(
        '.skill-preset-management__preview .skill-preset-color-swatch',
      ),
    ).toHaveStyle({ '--skill-preset-color': '#e38ace' })
    expect(screen.getByText('Replace Preset 1?')).toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Replace preset' }),
    )
    expect(actions.importPreset).toHaveBeenCalledWith(
      1,
      'SHARED-PRESET',
    )
    expect(
      screen.queryByRole('dialog', { name: 'Manage Preset 1' }),
    ).not.toBeInTheDocument()
  })

  test('dispatches a preset color choice from the management dropdown', async () => {
    const user = userEvent.setup()
    const dispatchPlayer = createDispatchPlayer()
    render(
      createSkillElement(
        dispatchPlayer,
        0.5,
        1,
        catalog,
        createPresetActions(),
      ),
    )

    await user.click(
      screen.getByRole('button', {
        name: 'Skill presets and reset',
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Presets' }))
    await user.click(
      screen.getByRole('button', {
        name: 'Manage Preset 1',
      }),
    )
    await user.click(
      screen.getByText('Cyan', {
        selector: '.skill-preset-color-picker summary span:last-child',
      }),
    )
    await user.click(
      screen.getByRole('button', {
        name: 'Pink',
      }),
    )

    expect(dispatchPlayer).toHaveBeenCalledWith({
      kind: 'skill.set-preset-color',
      slot: 1,
      colorId: 'pink',
    })
  })

  test('closes preset management with Escape and restores the preset list', async () => {
    const user = userEvent.setup()
    render(
      createSkillElement(
        createDispatchPlayer(),
        0.5,
        1,
        catalog,
        createPresetActions(),
      ),
    )
    await user.click(
      screen.getByRole('button', {
        name: 'Skill presets and reset',
      }),
    )
    await user.click(screen.getByRole('button', { name: 'Presets' }))
    const manage = screen.getByRole('button', {
      name: 'Manage Preset 1',
    })
    await user.click(manage)
    expect(screen.getAllByRole('button', { name: 'Close' }).at(-1)).toHaveFocus()

    await user.keyboard('{Escape}')
    expect(
      screen.queryByRole('dialog', { name: 'Manage Preset 1' }),
    ).not.toBeInTheDocument()
    expect(screen.getByRole('dialog', { name: 'Presets' })).toBeInTheDocument()
    expect(manage).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog', { name: 'Presets' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Presets' })).toHaveFocus()
  })

  test('previews refundable and retained skills in a reset dialog before dispatching', async () => {
    const user = userEvent.setup()
    const dispatchPlayer = createDispatchPlayer()
    const resetCatalog: CanonicalSkillCatalogPreview = {
      ...catalog,
      skills: [
        createSkillPreview('startHereTree', {
          owned: true,
          visualState: 'owned',
        }),
        createSkillPreview('assemblyLineTree', {
          owned: true,
          visualState: 'non-refundable-owned',
          intrinsicallyRefundable: false,
        }),
      ],
      reset: {
        refundableSkillIds: ['startHereTree'],
        retainedSkillIds: ['assemblyLineTree'],
        queuedSkillIds: [],
      },
    }
    render(createSkillElement(dispatchPlayer, 0.5, 1, resetCatalog))

    await user.click(
      screen.getByRole('button', {
        name: 'Skill presets and reset',
      }),
    )
    expect(
      screen.queryByRole('dialog', { name: 'Reset Skills' }),
    ).not.toBeInTheDocument()

    await user.click(
      screen.getByRole('button', { name: 'Reset Skills' }),
    )
    const dialog = screen.getByRole('dialog', { name: 'Reset Skills' })
    expect(within(dialog).getByText('Resets all refundable skills')).toBeInTheDocument()
    expect(
      within(
        within(dialog).getByRole('list', {
          name: 'Skills that will be refunded',
        }),
      ).getByText('Cash & Science'),
    ).toBeInTheDocument()
    expect(
      within(
        within(dialog).getByRole('list', {
          name: 'Skills that won’t be refunded',
        }),
      ).getByText('Assembly Lines'),
    ).toBeInTheDocument()
    expect(dispatchPlayer).not.toHaveBeenCalled()

    await user.click(
      within(dialog).getByRole('button', { name: 'Reset Skills' }),
    )
    expect(dispatchPlayer).toHaveBeenCalledWith({ kind: 'skill.reset' })
    expect(
      screen.queryByRole('dialog', { name: 'Reset Skills' }),
    ).not.toBeInTheDocument()
  })

  test('allows a queue-only reset and identifies the queued skills it clears', async () => {
    const user = userEvent.setup()
    const dispatchPlayer = createDispatchPlayer()
    const queuedCatalog: CanonicalSkillCatalogPreview = {
      ...catalog,
      reset: {
        refundableSkillIds: [],
        retainedSkillIds: [],
        queuedSkillIds: ['startHereTree'],
      },
    }
    render(createSkillElement(dispatchPlayer, 0.5, 1, queuedCatalog))

    await user.click(screen.getByRole('button', {
      name: 'Skill presets and reset',
    }))
    await user.click(screen.getByRole('button', { name: 'Reset Skills' }))
    const dialog = screen.getByRole('dialog', { name: 'Reset Skills' })
    expect(within(dialog).getByRole('list', {
      name: 'Removed from auto-assignment',
    })).toHaveTextContent('Cash & Science')
    const reset = within(dialog).getByRole('button', { name: 'Reset Skills' })
    expect(reset).toBeEnabled()

    await user.click(reset)
    expect(dispatchPlayer).toHaveBeenCalledWith({ kind: 'skill.reset' })
  })

  test('returns focus to the search input after clearing a query', async () => {
    const user = userEvent.setup()
    render(createSkillElement(createDispatchPlayer()))
    const search = screen.getByRole('searchbox', { name: 'Search skills' })
    await user.type(search, 'AI')
    const wrapper = search.closest('.skills-surface__search')
    expect(wrapper).toHaveAttribute('data-has-clear', 'true')
    expect(wrapper?.querySelector('.skills-surface__search-status'))
      .toHaveTextContent(/matches/)
    await user.click(screen.getByRole('button', { name: 'Clear skill search' }))
    expect(search).toHaveFocus()
    expect(search).toHaveValue('')
  })

  test('keeps search controls unclipped and gives preset cards readable width', () => {
    expect(skillsCss).toMatch(
      /\.skills-surface__search input\s*\{[^}]*padding-inline:\s*0\.7rem;/,
    )
    expect(skillsCss).toMatch(
      /\.skills-surface__search\[data-has-clear="true"\] input\s*\{[^}]*padding-inline-end:\s*3\.3rem;/,
    )
    expect(skillsCss).toMatch(
      /\.skill-settings__presets\s*\{[^}]*grid-template-columns:\s*repeat\(\s*auto-fit,\s*minmax\(min\(100%, 18rem\), 1fr\)\s*\);/,
    )
    expect(skillsCss).toMatch(
      /\.skill-preset-summary__distribution\s*\{[^}]*white-space:\s*nowrap;/,
    )
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
    await user.click(screen.getByRole('button', { name: 'Presets' }))
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
    await user.click(screen.getByRole('button', { name: 'Presets' }))
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
    await user.click(screen.getByRole('button', { name: 'Presets' }))
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
    await user.click(screen.getByRole('button', { name: 'Presets' }))
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
    await user.click(screen.getByRole('button', { name: 'Presets' }))
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

    await user.click(screen.getByRole('button', { name: 'Presets' }))

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
