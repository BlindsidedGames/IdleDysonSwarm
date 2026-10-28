// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, test, vi } from 'vitest'
import { ClearSpeedrunBestDialog } from './ClearSpeedrunBestDialog'

afterEach(() => { cleanup(); vi.restoreAllMocks(); Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal') })
test('cancel does not clear; failed clearing keeps the dialog available for retry', async () => {
  Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value(this: HTMLDialogElement) { this.open = true } })
  const clear = vi.fn().mockResolvedValueOnce(false).mockResolvedValueOnce(true)
  const close = vi.fn()
  render(<IntlProvider locale="en" messages={{}}><ClearSpeedrunBestDialog milestone="First Infinity" onConfirm={clear} onClose={close} /></IntlProvider>)
  expect(document.activeElement).toBe(screen.getByRole('button', { name: 'Cancel' }))
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(close).toHaveBeenCalledTimes(1)
  expect(clear).not.toHaveBeenCalled()
  close.mockClear()
  fireEvent.click(screen.getByRole('button', { name: 'Clear best' }))
  await screen.findByRole('alert')
  expect(close).not.toHaveBeenCalled()
  fireEvent.click(screen.getByRole('button', { name: 'Clear best' }))
  await waitFor(() => expect(close).toHaveBeenCalledTimes(1))
  expect(clear).toHaveBeenCalledTimes(2)
})
