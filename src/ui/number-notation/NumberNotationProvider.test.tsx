// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useState } from 'react'
import { afterEach, describe, expect, test } from 'vitest'
import { formatGameNumber } from '../i18n/formatters'
import { NumberNotationProvider } from './NumberNotationProvider'
import { NumberNotationPreferenceService } from './preference'
import { useNumberNotation } from './useNumberNotation'
import { setActiveNumberNotation } from './contracts'

describe('NumberNotationProvider', () => {
  afterEach(() => setActiveNumberNotation('standard'))
  test('redraws visible game numbers immediately without changing their value', async () => {
    const preference = new NumberNotationPreferenceService({ storage: null })
    const user = userEvent.setup()
    render(
      <NumberNotationProvider preference={preference}>
        <Presentation />
      </NumberNotationProvider>,
    )
    expect(screen.getByTestId('value')).toHaveTextContent('12.3K')
    await user.click(screen.getByRole('button', { name: 'Scientific' }))
    expect(screen.getByTestId('value')).toHaveTextContent('1.23e4')
    expect(screen.getByTestId('canonical')).toHaveTextContent('12345')
  })
})

function Presentation() {
  const notation = useNumberNotation()
  const [canonical] = useState(12_345)
  return (
    <>
      <span data-testid="value">{formatGameNumber('en', canonical)}</span>
      <span data-testid="canonical">{canonical}</span>
      <button type="button" onClick={() => notation.setMode('scientific')}>
        Scientific
      </button>
    </>
  )
}
