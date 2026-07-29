// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import axe from 'axe-core'
import { createElement } from 'react'
import { cleanup, render, screen } from '@testing-library/react'
import {
  afterEach,
  beforeEach,
  describe,
  expect,
  it,
  vi,
} from 'vitest'
import { StartupErrorBoundary } from './StartupErrorBoundary'

const SECRET =
  'Bearer secret-token at C:\\Users\\player\\save-data.txt'

function BrokenPresentation() {
  throw new TypeError(SECRET)
}

describe('StartupErrorBoundary', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  it('isolates render failures without exposing a state-changing action', () => {
    render(
      createElement(
        StartupErrorBoundary,
        {
          copy: {
            title: 'La pantalla se detuvo',
            body: 'No se modificó el progreso.',
            diagnosticsSummary: 'Detalles locales',
            diagnosticsLabel: 'Informe local redactado',
          },
          diagnosticContext: {
            buildId: 'release-42',
            hostKind: 'static',
            locale: 'es',
          },
        },
        createElement(BrokenPresentation),
      ),
    )

    const heading = screen.getByRole('heading', {
      name: 'La pantalla se detuvo',
      level: 1,
    })
    expect(heading).toBeInTheDocument()
    expect(heading).toHaveFocus()
    expect(screen.getByRole('alert')).toHaveTextContent(
      'No se modificó el progreso.',
    )
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
    const report = screen.getByLabelText('Informe local redactado')
    expect(report).toHaveTextContent('"errorKind": "TypeError"')
    expect(report).not.toHaveTextContent(SECRET)
    expect(report).not.toHaveTextContent('secret-token')
    expect(report).not.toHaveTextContent('save-data.txt')
  })

  it('has no automated accessibility violations in the fallback', async () => {
    const { container } = render(
      createElement(
        StartupErrorBoundary,
        null,
        createElement(BrokenPresentation),
      ),
    )
    const results = await axe.run(container, {
      rules: {
        'color-contrast': { enabled: false },
      },
    })
    expect(results.violations).toEqual([])
  })
})
