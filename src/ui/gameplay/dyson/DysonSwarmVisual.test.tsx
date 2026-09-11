// @vitest-environment jsdom
import { cleanup, render } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { DysonSwarmVisual } from './DysonSwarmVisual'
afterEach(cleanup)

test('one ring fills progressively without orbit guides', () => {
  const facts = (completion: number, activePanels = 1e12) => ({ phase: 'stellar-swarm' as const, completion, activePanels })
  const { container, rerender } = render(<DysonSwarmVisual facts={facts(0, 0)} />)
  const lit = () => [...container.querySelectorAll<SVGElement>('.dyson-swarm-visual__ring-segment')].filter(el=>Number(el.style.opacity)>0).length
  expect(container.querySelectorAll('.dyson-swarm-visual__single-ring')).toHaveLength(1)
  expect(container.querySelector('.dyson-swarm-visual__orbit-guide')).toBeNull()
  expect(lit()).toBe(0)
  for (const activePanels of [1, 2, 3, 10, 100]) {
    rerender(<DysonSwarmVisual facts={facts(activePanels / 1e12, activePanels)} />)
    expect(lit()).toBeGreaterThan(0)
    expect(lit()).toBeLessThanOrEqual(activePanels)
  }
  rerender(<DysonSwarmVisual facts={facts(0.1)} />)
  const early = lit()
  rerender(<DysonSwarmVisual facts={facts(0.5)} />)
  expect(lit()).toBeGreaterThan(early)
  rerender(<DysonSwarmVisual facts={facts(0.999999)} />)
  expect(lit()).toBe(128)
})

test('early stars visibly expand the dimmed cluster through a full galaxy', () => {
  const view = (stars: number) => <DysonSwarmVisual facts={{ phase: 'galaxy', starsSurrounded: stars, completion: stars / 1e11 }} />
  const { container, rerender } = render(view(0))
  const opacity = () => [...container.querySelectorAll<SVGElement>('.dyson-swarm-visual__galaxy-light')].map(el => Number(el.style.opacity))
  let previous = opacity()
  let previousDimmed = 0
  for (const stars of [2, 41, 541, 5e6, 1e8, 3e9, 8e10, 1e11]) {
    rerender(view(stars))
    const current = opacity()
    const dimmed = current.filter(value => value < 0.1).length
    expect(dimmed - previousDimmed).toBeGreaterThanOrEqual(stars === 1e11 ? 1 : 10)
    expect(current.every((value, index) => value <= previous[index])).toBe(true)
    previous = current
    previousDimmed = dimmed
  }
  expect(previousDimmed).toBe(420)
})
