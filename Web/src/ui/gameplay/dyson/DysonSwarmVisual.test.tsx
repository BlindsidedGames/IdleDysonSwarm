// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import '@testing-library/jest-dom/vitest'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import { DysonSwarmVisual } from './DysonSwarmVisual'

afterEach(cleanup)

describe('DysonSwarmVisual', () => {
  test('uses one bounded group transform and disables continuous motion on mobile', () => {
    const stylesheet = readFileSync(
      'src/ui/gameplay/dyson/dysonSwarmVisual.css',
      'utf8',
    )

    expect(stylesheet).not.toContain('dyson-galaxy-turn')
    expect(stylesheet).not.toContain('dyson-group-drift')
    expect(stylesheet).not.toMatch(
      /\.dyson-swarm-visual__galaxy-plane\s*\{[^}]*animation:/,
    )
    expect(stylesheet).not.toMatch(
      /\.dyson-swarm-visual__galaxy-group\s*\{[^}]*animation:/,
    )
    expect(stylesheet).not.toContain(
      'dyson-galaxy-orbit-cluster',
    )
    expect(stylesheet).toContain('dyson-origin-star-zoom-out')
    expect(stylesheet).not.toContain('dyson-galaxy-group-orbit')
    expect(stylesheet).not.toContain(
      'dyson-galaxy-member-counter-orbit',
    )
    expect(stylesheet).toContain('dyson-field-galaxy-spin')
    expect(stylesheet).not.toContain('--galaxy-spin-duration')
    expect(stylesheet).toMatch(
      /\.dyson-swarm-visual__field-members\s*\{[^}]*animation:/,
    )
    expect(stylesheet).toMatch(
      /@media \(pointer: coarse\)[\s\S]*\.dyson-swarm-visual__field-members[\s\S]*animation:\s*none/,
    )
    expect(stylesheet).toContain(
      'dyson-origin-galaxy-zoom-out',
    )
    expect(stylesheet).not.toContain(
      'dyson-swarm-visual__field-galaxy-halo',
    )
    expect(stylesheet).toContain(
      'dyson-swarm-visual__field-galaxy-image',
    )
    expect(stylesheet).not.toMatch(
      /\.dyson-swarm-visual__galaxy-field\s*\{[^}]*animation:/,
    )
  })

  test('represents early collectors individually without inventing panels at zero', () => {
    const view = render(
      <DysonSwarmVisual
        facts={{
          phase: 'stellar-swarm',
          activePanels: 0,
          completion: 0,
        }}
      />,
    )

    const root = view.container.firstElementChild
    expect(root).toHaveAttribute('aria-hidden', 'true')
    expect(root).toHaveAttribute('data-phase', 'stellar-swarm')
    expect(
      view.container.querySelectorAll(
        '.dyson-swarm-visual__collector[data-visible="true"]',
      ),
    ).toHaveLength(0)
    expect(
      view.container.querySelectorAll(
        '.dyson-swarm-visual__collector',
      ),
    ).toHaveLength(0)

    view.rerender(
      <DysonSwarmVisual
        facts={{
          phase: 'stellar-swarm',
          activePanels: 12.2,
          completion: 12.2 / 20_000,
        }}
      />,
    )
    expect(
      view.container.querySelectorAll(
        '.dyson-swarm-visual__collector-plane--exact ' +
        '.dyson-swarm-visual__collector[data-visible="true"]',
      ),
    ).toHaveLength(13)
  })

  test('bounds a dense stellar swarm to a fixed collector pool', () => {
    const { container } = render(
      <DysonSwarmVisual
        facts={{
          phase: 'stellar-swarm',
          activePanels: 19_999,
          completion: 19_999 / 20_000,
        }}
      />,
    )

    expect(
      container.querySelectorAll(
        '.dyson-swarm-visual__collector',
      ),
    ).toHaveLength(256)
    expect(
      container.querySelectorAll(
        '.dyson-swarm-visual__collector-plane[data-visible="true"]',
      ),
    ).toHaveLength(32)
    expect(
      container.querySelectorAll(
        '.dyson-swarm-visual__orbit-plane',
      ),
    ).toHaveLength(4)
    expect(
      container.querySelectorAll(
        '.dyson-swarm-visual__collector-track',
      ),
    ).toHaveLength(4)
    expect(
      container.querySelectorAll(
        '.dyson-swarm-visual__orbit-guide',
      ),
    ).toHaveLength(4)
    expect(
      container.querySelectorAll(
        '.dyson-swarm-visual__orbit-highlight',
      ),
    ).toHaveLength(0)
  })

  test('renders a fixed spiral whose individual stars progressively extinguish', () => {
    const view = render(
      <DysonSwarmVisual
        facts={{
          phase: 'galaxy',
          starsSurrounded: 1,
          completion: 0,
        }}
      />,
    )
    const originStar =
      view.container.querySelector<SVGCircleElement>(
        '.dyson-swarm-visual__galaxy-light[data-origin="true"]',
      )

    expect(originStar).toBeInTheDocument()
    expect(
      view.container.querySelectorAll(
        '.dyson-swarm-visual__galaxy-light',
      ),
    ).toHaveLength(144)
    expect(
      view.container.querySelectorAll(
        '.dyson-swarm-visual__galaxy-orbit-cluster',
      ),
    ).toHaveLength(0)
    expect(
      view.container.querySelector(
        '.dyson-swarm-visual__galaxy-core',
      ),
    ).not.toBeInTheDocument()
    const bulge = view.container.querySelector(
      '.dyson-swarm-visual__galaxy-bulge',
    )
    expect(bulge).toBeInTheDocument()
    const composition = view.container.querySelector(
      '.dyson-swarm-visual__galaxy-composition',
    )
    const position = view.container.querySelector(
      '.dyson-swarm-visual__galaxy-position',
    )
    expect(position).toHaveAttribute(
      'transform',
      'translate(-6 -8)',
    )
    expect(composition).toHaveAttribute(
      'transform',
      'translate(-8 -94)',
    )
    expect(
      bulge?.querySelectorAll(
        '.dyson-swarm-visual__galaxy-core-light',
      ),
    ).toHaveLength(16)
    expect(
      bulge?.parentElement,
    ).toBe(composition)
    expect(
      bulge?.parentElement?.parentElement,
    ).toHaveClass('dyson-swarm-visual__galaxy-plane')
    expect(
      bulge?.parentElement?.parentElement?.parentElement,
    ).toBe(position)

    const initiallyLit = Array.from(
      view.container.querySelectorAll<SVGCircleElement>(
        '.dyson-swarm-visual__galaxy-light',
      ),
    ).filter((light) => light.style.opacity === '1')
    expect(initiallyLit).toHaveLength(144)

    view.rerender(
      <DysonSwarmVisual
        facts={{
          phase: 'galaxy',
          starsSurrounded: 50_000_000_000,
          completion: 0.5,
        }}
      />,
    )
    const partlyExtinguished = Array.from(
      view.container.querySelectorAll<SVGCircleElement>(
        '.dyson-swarm-visual__galaxy-light',
      ),
    ).filter((light) => Number(light.style.opacity) < 1)
    expect(partlyExtinguished.length).toBeGreaterThan(50)
    expect(partlyExtinguished.length).toBeLessThan(100)

    view.rerender(
      <DysonSwarmVisual
        facts={{
          phase: 'galaxy',
          starsSurrounded: 90_000_000_000,
          completion: 0.9,
        }}
      />,
    )
    const mostlyExtinguished = Array.from(
      view.container.querySelectorAll<SVGCircleElement>(
        '.dyson-swarm-visual__galaxy-light',
      ),
    ).filter((light) => Number(light.style.opacity) === 0.08)
    expect(mostlyExtinguished.length).toBeGreaterThan(120)
    expect(mostlyExtinguished.length).toBeLessThan(144)
  })

  test('fills the post-galaxy field and dims members across compressed progression', () => {
    const view = render(
      <DysonSwarmVisual
        facts={{
          phase: 'galaxy-group',
          galaxiesEngulfed: 1,
          completion: 0,
        }}
      />,
    )

    expect(
      view.container.querySelectorAll(
        '.dyson-swarm-visual__field-member',
      ),
    ).toHaveLength(32)
    expect(
      view.container.querySelectorAll(
        '.dyson-swarm-visual__field-dust',
      ),
    ).toHaveLength(48)

    const variantIds = [
      'dyson-field-galaxy-face-on',
      'dyson-field-galaxy-shallow-inclined',
      'dyson-field-galaxy-edge-on',
      'dyson-field-galaxy-oblique',
    ]
    const variantAssets = [
      'galaxy-face-on.png',
      'galaxy-shallow-inclined.png',
      'galaxy-edge-on.png',
      'galaxy-oblique.png',
    ]
    expect(
      Array.from(
        view.container.querySelectorAll<SVGGElement>(
          'defs > g[id^="dyson-field-galaxy-"]',
        ),
        (definition) => definition.id,
      ),
    ).toEqual(variantIds)
    for (const [variant, variantId] of variantIds.entries()) {
      expect(
        view.container
          .querySelector(`#${variantId}`)
          ?.querySelector('image'),
      ).toHaveAttribute(
        'href',
        expect.stringContaining(variantAssets[variant]),
      )
      const membersForVariant =
        view.container.querySelectorAll<SVGGElement>(
          `.dyson-swarm-visual__field-member[data-variant="${variant}"]`,
        )
      expect(membersForVariant).toHaveLength(8)
      expect(
        membersForVariant[0]?.querySelector('use'),
      ).toHaveAttribute('href', `#${variantId}`)
    }

    expect(
      view.container.querySelectorAll(
        '.dyson-swarm-visual__group-orbit-plane',
      ),
    ).toHaveLength(0)
    expect(
      view.container.querySelectorAll(
        '.dyson-swarm-visual__group-orbit-track',
      ),
    ).toHaveLength(0)
    expect(
      view.container.querySelectorAll(
        '.dyson-swarm-visual__field-member[data-edge="true"]',
      ).length,
    ).toBeGreaterThan(4)

    const resourceClearanceZones = [
      { minX: -120, maxX: -42, minY: -90, maxY: -38 },
      { minX: -40, maxX: 40, minY: -90, maxY: -46 },
      { minX: 42, maxX: 120, minY: -90, maxY: -38 },
    ]
    const members =
      view.container.querySelectorAll<SVGGElement>(
        '.dyson-swarm-visual__field-member',
      )
    for (const member of members) {
      const transform = member.getAttribute('transform') ?? ''
      const match = transform.match(
        /^translate\(([-\d.]+) ([-\d.]+)\) rotate\([-\d.]+\) scale\(([\d.]+)\)$/,
      )
      expect(match).not.toBeNull()
      if (match === null) {
        continue
      }

      const x = Number(match[1])
      const y = Number(match[2])
      const clearanceRadius = 7 * Number(match[3])
      for (const zone of resourceClearanceZones) {
        const overlaps =
          x + clearanceRadius >= zone.minX &&
          x - clearanceRadius <= zone.maxX &&
          y + clearanceRadius >= zone.minY &&
          y - clearanceRadius <= zone.maxY
        expect(overlaps).toBe(false)
      }
    }

    const origin = view.container.querySelector(
      '.dyson-swarm-visual__field-member[data-origin="true"]',
    )
    expect(origin).toHaveAttribute(
      'transform',
      expect.stringMatching(
        /^translate\(-8 [-\d.]+\) rotate\(-12\) scale\(1.12\)$/,
      ),
    )
    expect(origin).toHaveAttribute('data-engulfed', 'true')
    expect(
      view.container.querySelectorAll(
        '.dyson-swarm-visual__field-member[data-engulfed="true"]',
      ),
    ).toHaveLength(1)

    view.rerender(
      <DysonSwarmVisual
        facts={{
          phase: 'galaxy-group',
          galaxiesEngulfed: 2,
          completion: 0.5 / 31,
        }}
      />,
    )
    const partiallyEngulfed =
      view.container.querySelector<SVGGElement>(
        '.dyson-swarm-visual__field-member' +
        '[data-dim-order="1"]',
      )
    expect(
      partiallyEngulfed?.style.getPropertyValue(
        '--galaxy-harvest',
      ),
    ).toBe('0.5')

    view.rerender(
      <DysonSwarmVisual
        facts={{
          phase: 'galaxy-group',
          galaxiesEngulfed: 5e291,
          completion: 1,
        }}
      />,
    )
    expect(
      view.container.querySelectorAll(
        '.dyson-swarm-visual__field-member[data-engulfed="true"]',
      ),
    ).toHaveLength(32)
  })
})
