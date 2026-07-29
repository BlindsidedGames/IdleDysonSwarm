// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import axe from 'axe-core'
import { createElement } from 'react'
import {
  cleanup,
  render,
  screen,
  within,
} from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { Button } from './Button'
import { FacilityCard } from './FacilityCard'
import { PlayerText } from './PlayerText'
import { Progress } from './Progress'
import { ResourceValue } from './ResourceValue'
import { StatusFeedback } from './StatusFeedback'

afterEach(cleanup)

describe('accessible presentation primitives', () => {
  it('keeps Button on native activation semantics and guards pending actions', async () => {
    const onClick = vi.fn()
    const user = userEvent.setup()
    const { rerender } = render(
      createElement(Button, { onClick }, 'Purchase'),
    )
    const button = screen.getByRole('button', { name: 'Purchase' })

    await user.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)

    rerender(
      createElement(
        Button,
        { onClick, state: 'pending' },
        'Purchase',
      ),
    )
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    await user.click(button)
    expect(onClick).toHaveBeenCalledTimes(1)
  })

  it('uses deliberate polite and assertive status announcement roles', () => {
    const { rerender } = render(
      createElement(
        StatusFeedback,
        { tone: 'success', title: 'Completed' },
        'Checkpoint saved',
      ),
    )
    expect(screen.getByRole('status')).toHaveAttribute(
      'aria-live',
      'polite',
    )

    rerender(
      createElement(
        StatusFeedback,
        { tone: 'error', title: 'Could not save' },
        'Export remains available',
      ),
    )
    expect(screen.getByRole('alert')).toHaveAttribute(
      'aria-live',
      'assertive',
    )
  })

  it('exposes canonical progress and full-precision resource text', () => {
    render(
      createElement(
        'div',
        null,
        createElement(ResourceValue, {
          label: 'Money',
          value: '9.01Q',
          fullPrecisionValue: '9,007,199,254,740,993',
          machineValue: '9007199254740993',
        }),
        createElement(Progress, {
          label: 'Assembly',
          valueText: '2 of 5',
          value: 2,
          maximum: 5,
        }),
      ),
    )

    const value = screen.getByText('9.01Q').closest('data')
    expect(value).toHaveAttribute('value', '9007199254740993')
    expect(value).toHaveAttribute(
      'aria-label',
      '9,007,199,254,740,993',
    )
    expect(value).toHaveAttribute(
      'title',
      '9,007,199,254,740,993',
    )
    expect(value).toHaveAttribute('tabindex', '0')
    const progress = screen.getByRole('progressbar', {
      name: 'Assembly',
    })
    expect(progress).toHaveAttribute('value', '2')
    expect(progress).toHaveAttribute('max', '5')
    expect(progress).toHaveAttribute('aria-valuetext', '2 of 5')
  })

  it('provides a semantic facility-card structure without gameplay logic', () => {
    render(
      createElement(FacilityCard, {
        title: 'Generator',
        summary: createElement('span', null, '3 owned'),
        details: createElement('span', null, 'Produces 2 /s'),
        action: createElement(Button, null, 'Purchase'),
      }),
    )
    const article = screen.getByRole('article', {
      name: 'Generator',
    })
    expect(article).toContainElement(
      screen.getByRole('heading', { name: 'Generator', level: 3 }),
    )
    expect(article).toContainElement(
      within(article).getByRole('button', { name: 'Purchase' }),
    )
  })

  it('renders imported or player-authored text as escaped, isolated text', () => {
    const hostile = '<img src=x onerror=alert(1)>'
    const { container } = render(
      createElement(PlayerText, null, hostile),
    )
    expect(screen.getByText(hostile).tagName).toBe('BDI')
    expect(container.querySelector('img')).toBeNull()
    expect(container.innerHTML).toContain('&lt;img')
  })

  it('has no automated accessibility violations in a composed stable state', async () => {
    const { container } = render(
      createElement(
        'main',
        null,
        createElement(StatusFeedback, { tone: 'neutral' }, 'Ready'),
        createElement(FacilityCard, {
          title: 'Generator',
          summary: createElement(ResourceValue, {
            label: 'Owned',
            value: '3',
          }),
          details: createElement(Progress, {
            label: 'Construction',
            valueText: '1 of 2',
            value: 1,
            maximum: 2,
          }),
          action: createElement(Button, null, 'Purchase'),
        }),
      ),
    )
    const results = await axe.run(container, {
      rules: {
        'color-contrast': { enabled: false },
        region: { enabled: false },
      },
    })
    expect(results.violations).toEqual([])
  })
})
