// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { afterEach, describe, expect, test } from 'vitest'
import { renderStaticBootstrapFailure } from './bootstrapFailure'

afterEach(() => document.body.replaceChildren())

describe('pre-React bootstrap failure', () => {
  test('renders a focused static alert without copying an error or mutating gameplay', () => {
    const root = document.createElement('div')
    document.body.append(root)
    renderStaticBootstrapFailure(root)
    const heading = root.querySelector('h1')
    const alert = root.querySelector('[role="alert"]')
    expect(heading).toHaveFocus()
    expect(alert).toHaveTextContent(
      'without changing your saved progress',
    )
    expect(root.textContent).not.toMatch(
      /stack|token|indexeddb|exception/i,
    )
  })
})
