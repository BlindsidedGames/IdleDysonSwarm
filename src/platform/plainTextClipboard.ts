import { nativeClipboardTextWriter } from './nativeHostBridge'

let copyAction = false
if (typeof document !== 'undefined') {
  document.addEventListener('click', event => {
    if (!event.isTrusted || !(event.target instanceof Element) ||
        !event.target.closest('[data-clipboard-copy]')) return
    copyAction = true
    setTimeout(() => { copyAction = false }, 0)
  }, true)
}

/** Native writes are one user action; browser copying uses selection without asking permissions. */
export function copyPlainText(text: string, selection?: HTMLTextAreaElement | null): Promise<void> {
  const nativeWrite = nativeClipboardTextWriter()
  if (nativeWrite !== null) {
    if (!copyAction) return Promise.reject(new Error('Clipboard copy requires a Copy click.'))
    copyAction = false
    return nativeWrite(text)
  }
  const previousFocus = document.activeElement
  const area = selection ?? document.createElement('textarea')
  if (!selection) {
    area.value = text
    area.readOnly = true
    area.style.cssText = 'position:fixed;inset:0;opacity:0;pointer-events:none'
    document.body.append(area)
  }
  area.value = text
  try {
    area.focus({ preventScroll: true })
    area.select()
    if (typeof document.execCommand !== 'function' || !document.execCommand('copy')) {
      return Promise.reject(new Error('Clipboard copy failed.'))
    }
    return Promise.resolve()
  } catch (error) {
    return Promise.reject(error)
  } finally {
    if (!selection) {
      area.remove()
      if (previousFocus instanceof HTMLElement) previousFocus.focus({ preventScroll: true })
    }
  }
}
