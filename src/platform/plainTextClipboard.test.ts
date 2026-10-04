// @vitest-environment jsdom
import { afterEach, expect, test, vi } from 'vitest'
import { copyPlainText } from './plainTextClipboard'

afterEach(() => { vi.restoreAllMocks(); vi.unstubAllGlobals(); document.body.replaceChildren(); delete window.idleDysonSwarmNativeHost })

test('browser copies the literal selected text without calling the permission-based Clipboard API', async () => {
  const text = 'IDS preset: café\n<literal text>'
  const area = document.createElement('textarea')
  area.readOnly = true
  document.body.append(area)
  const writeText = vi.fn()
  vi.stubGlobal('navigator', { clipboard: { writeText }, permissions: { query: vi.fn() } })
  Object.defineProperty(document, 'execCommand', { configurable: true, value: vi.fn(() => {
    expect(document.activeElement).toBe(area)
    expect(area.value.slice(area.selectionStart, area.selectionEnd)).toBe(text)
    return true
  }) })
  await copyPlainText(text, area)
  expect(writeText).not.toHaveBeenCalled()
  expect(navigator.permissions.query).not.toHaveBeenCalled()
})

test('failed browser copying keeps the export selected for manual copying and allows a successful retry', async () => {
  const area = document.createElement('textarea')
  document.body.append(area)
  const execCommand = vi.fn().mockReturnValueOnce(false).mockReturnValueOnce(true)
  Object.defineProperty(document, 'execCommand', { configurable: true, value: execCommand })
  await expect(copyPlainText('IDS preset', area)).rejects.toThrow('copy failed')
  expect(area.selectionStart).toBe(0)
  expect(area.selectionEnd).toBe('IDS preset'.length)
  await copyPlainText('IDS preset', area)
})

test('programmatic native copy cannot write, including an untrusted click on a marked button', async () => {
  const writeClipboardText = vi.fn()
  window.idleDysonSwarmNativeHost = { target: 'electron', writeClipboardText } as typeof window.idleDysonSwarmNativeHost
  const button = document.createElement('button')
  button.setAttribute('data-clipboard-copy', '')
  document.body.append(button)
  button.click()
  await expect(copyPlainText('IDS preset')).rejects.toThrow('Copy click')
  expect(writeClipboardText).not.toHaveBeenCalled()
})
