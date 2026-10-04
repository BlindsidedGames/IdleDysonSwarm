// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, expect, test, vi } from 'vitest'
import { DesktopTooltips } from './DesktopTooltips'

beforeEach(() => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
})
afterEach(() => { cleanup(); vi.unstubAllGlobals() })

function hover(element: Element, pointerType = 'mouse', x = 100, y = 100) {
  const event = new Event('pointermove', { bubbles: true })
  Object.assign(event, { pointerType, clientX: x, clientY: y })
  fireEvent(element, event)
}

function setup() {
  return render(<div className="dyson-shell">
    <button aria-label="Open menu">Menu</button><a href="#" aria-label="Settings">Settings</a>
    <span data-desktop-tooltip="Legacy tooltip">Legacy trigger</span>
    <div className="skill-tree-viewport__canvas">
      <button className="skill-tree-node" data-skill-tooltip-name="Cash & Science" data-skill-tooltip-body="Increase Cash and Science by 20%" data-skill-tooltip-cost="1" data-skill-tooltip-cost-label="Cost: 1 Skill Points" data-skill-tooltip-augments="3" data-skill-tooltip-augment-label="3 augments" data-desktop-tooltip-palette="normal"><span>Cash node</span></button>
      <button className="skill-tree-node" data-skill-tooltip-name="Scientific Planets" data-skill-tooltip-body="Produces Planets based on Science Bots." data-skill-tooltip-formula="Log10(Science Bots)" data-skill-tooltip-cost="1" data-skill-tooltip-cost-label="Cost: 1 Skill Points" data-skill-tooltip-augments="0">Planet node</button>
      <button className="skill-tree-node" aria-hidden="true" data-skill-tooltip-name="Background">Background</button>
    </div>
    <div inert><div className="skill-tree-viewport__canvas"><button className="skill-tree-node" data-skill-tooltip-name="Behind dialog">Behind dialog</button></div></div>
    <DesktopTooltips />
  </div>)
}

test('only skill-tree nodes show tooltips; accessible controls and legacy triggers do not', () => {
  setup()
  for (const name of ['Menu', 'Settings', 'Legacy trigger', 'Background', 'Behind dialog']) {
    hover(screen.getByText(name))
    expect(screen.queryByRole('tooltip')).toBeNull()
  }
  expect(screen.getByRole('button', { name: 'Open menu' })).toBeTruthy()
  hover(screen.getByText('Cash node'))
  const tooltip = screen.getByRole('tooltip')
  expect(within(tooltip).getByText('Cash & Science').tagName).toBe('STRONG')
  expect(within(tooltip).getByText('Increase Cash and Science by 20%')).toBeTruthy()
  expect(within(tooltip).getByLabelText('3 augments')).toBeTruthy()
  expect(within(tooltip).getByLabelText('Cost: 1 Skill Points')).toBeTruthy()
  expect(tooltip.dataset.palette).toBe('normal')
  hover(screen.getByText('Menu'))
  expect(screen.queryByRole('tooltip')).toBeNull()
})

test('the formula is separate and a zero augment count has no badge', () => {
  setup(); hover(screen.getByText('Planet node'))
  const tooltip = screen.getByRole('tooltip')
  expect(within(tooltip).getByText('Produces Planets based on Science Bots.')).toBeTruthy()
  expect(within(tooltip).getByText('Log10(Science Bots)')).toBeTruthy()
  expect(tooltip.querySelector('.desktop-tooltip__augments')).toBeNull()
})

test('touch never shows hover details and interaction/scroll dismiss mouse hover', () => {
  setup(); const node = screen.getByText('Cash node')
  hover(node, 'touch'); expect(screen.queryByRole('tooltip')).toBeNull()
  for (const clear of [() => fireEvent.pointerDown(node), () => fireEvent.keyDown(document, { key: 'Enter' }), () => fireEvent.scroll(document)]) {
    hover(node); expect(screen.getByRole('tooltip')).toBeTruthy()
    clear(); expect(screen.queryByRole('tooltip')).toBeNull()
  }
})

test('coarse-pointer presentations do not attach a hover surface', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() }))
  setup(); hover(screen.getByText('Cash node'))
  expect(screen.queryByRole('tooltip')).toBeNull()
})
