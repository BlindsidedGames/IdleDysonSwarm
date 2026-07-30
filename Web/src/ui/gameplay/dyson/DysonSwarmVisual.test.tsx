// @vitest-environment jsdom

import { readFileSync } from 'node:fs'
import '@testing-library/jest-dom/vitest'
import { cleanup, render } from '@testing-library/react'
import { afterEach, describe, expect, test } from 'vitest'
import { DysonSwarmVisual } from './DysonSwarmVisual'

afterEach(cleanup)

describe('DysonSwarmVisual', () => {
  test('keeps the galaxy fixed while later galaxy-group members orbit', () => {
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
    expect(stylesheet).toContain('dyson-galaxy-group-orbit')
    expect(stylesheet).toContain(
      'dyson-galaxy-member-counter-orbit',
    )
    expect(stylesheet).toMatch(
      /\.dyson-swarm-visual__mini-galaxy-counter\s*\{[^}]*transform:[^}]*scaleY\(var\(--orbit-inverse\)\)/,
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
    ).toHaveLength(416)
    expect(
      container.querySelectorAll(
        '.dyson-swarm-visual__collector-plane[data-visible="true"]',
      ),
    ).toHaveLength(44)
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
    ).toHaveLength(420)
    expect(
      view.container.querySelectorAll(
        '.dyson-swarm-visual__galaxy-orbit-cluster',
      ),
    ).toHaveLength(0)

    const initiallyLit = Array.from(
      view.container.querySelectorAll<SVGCircleElement>(
        '.dyson-swarm-visual__galaxy-light',
      ),
    ).filter((light) => light.style.opacity === '1')
    expect(initiallyLit).toHaveLength(420)

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
    expect(partlyExtinguished.length).toBeGreaterThan(150)
    expect(partlyExtinguished.length).toBeLessThan(300)

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
    expect(mostlyExtinguished.length).toBeGreaterThan(350)
    expect(mostlyExtinguished.length).toBeLessThan(420)
  })

  test('bounds the post-galaxy group while dimming members across compressed progression', () => {
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
        '.dyson-swarm-visual__mini-galaxy',
      ),
    ).toHaveLength(12)
    expect(
      view.container.querySelectorAll(
        '.dyson-swarm-visual__group-orbit-plane',
      ),
    ).toHaveLength(3)
    const orbitTracks = view.container.querySelectorAll(
      '.dyson-swarm-visual__group-orbit-track',
    )
    expect(orbitTracks).toHaveLength(12)
    for (const track of orbitTracks) {
      expect(
        track.querySelectorAll(
          '.dyson-swarm-visual__mini-galaxy',
        ),
      ).toHaveLength(1)
    }
    expect(
      view.container.querySelectorAll(
        '.dyson-swarm-visual__mini-galaxy[data-engulfed="true"]',
      ),
    ).toHaveLength(1)

    view.rerender(
      <DysonSwarmVisual
        facts={{
          phase: 'galaxy-group',
          galaxiesEngulfed: 2,
          completion: 0.5 / 11,
        }}
      />,
    )
    const partiallyEngulfed =
      view.container.querySelector<HTMLElement>(
        '.dyson-swarm-visual__mini-galaxy-anchor' +
        '[data-dim-order="1"]',
      )?.parentElement
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
        '.dyson-swarm-visual__mini-galaxy[data-engulfed="true"]',
      ),
    ).toHaveLength(12)
  })
})
