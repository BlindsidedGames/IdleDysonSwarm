// @vitest-environment jsdom
import { act, fireEvent, waitFor, within } from '@testing-library/react'
import { expect, test, vi } from 'vitest'
import { startDevelopmentFrame } from './development/startDevelopmentFrame'

test('the real main entry executes Modern and Classic frame bootstraps with disposable adapters and integrated save settings', async () => {
  // Isolation is established before importing the actual entrypoint: ambient
  // save/IDB/account/network ports throw, and only the gated synthetic host can
  // construct the game. jsdom does not fetch or execute iframe scripts; invoke
  // their actual bootstrap explicitly against each newly owned frame document.
  // Vitest rewrites document.defaultView to its global proxy, while jsdom
  // iframe.parent uses dom.window. Normalize to the public jsdom instance.
  const domWindow = (globalThis as unknown as { jsdom: { window: Window } }).jsdom.window
  vi.stubGlobal('window', domWindow)
  vi.stubEnv('DEV', true); vi.stubEnv('VITE_IDS_DUAL_MODE_FOUNDATION', '1')
  const forbidden = vi.fn(() => { throw Error('Real persistence/account/network prohibited') })
  const deniedStorage = { getItem: forbidden, setItem: forbidden, removeItem: forbidden }
  vi.stubGlobal('localStorage', deniedStorage)
  vi.spyOn(domWindow, 'localStorage', 'get').mockReturnValue(deniedStorage as unknown as Storage)
  vi.stubGlobal('indexedDB', { open: forbidden, deleteDatabase: forbidden })
  vi.stubGlobal('fetch', forbidden)
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} unobserve() {} })
  vi.stubGlobal('matchMedia', (media: string) => ({ matches: media.includes('min-width'), media, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }))
  Object.defineProperty(domWindow, 'matchMedia', { configurable: true, value: globalThis.matchMedia })
  const root = document.createElement('div'); root.id = 'root'; document.body.append(root)
  const previousUrl = location.href
  history.replaceState({}, '', '/rework-beta/?host=browser')
  let active: HTMLIFrameElement | undefined
  const bootNext = async (mode: 'Classic' | 'Modern') => {
    await waitFor(() => { const frame = root.querySelector('iframe'); expect(frame).toBeTruthy(); expect(frame).not.toBe(active) }, { timeout: 10000 })
    active = root.querySelector('iframe')!
    const frame = active.contentWindow!, doc = active.contentDocument!
    if (!doc.documentElement) doc.append(doc.createElement('html'))
    if (!doc.body) doc.documentElement.append(doc.createElement('body'))
    doc.body.innerHTML = '<div id="root"></div>'
    expect(frame.location.href).toBe(active.src)
    expect(frame.parent.__IDS_MODE_DEVELOPMENT_BRIDGE__).toBeTruthy()
    frame.requestAnimationFrame = callback => frame.setTimeout(() => callback(frame.performance.now()), 16)
    frame.cancelAnimationFrame = id => frame.clearTimeout(id)
    await act(() => startDevelopmentFrame(frame))
    return within(doc.body).findByRole('button', { name: `Game mode: ${mode}` }, { timeout: 10000 })
  }
  try {
    await import('../main')
    const modern = await bootNext('Modern')
    fireEvent.click(modern)
    fireEvent.click(within(active!.contentDocument!.body).getByRole('button', { name: 'Start Classic' }))
    await bootNext('Classic')
    const classicUi = within(active!.contentDocument!.body)
    fireEvent.click(classicUi.getAllByRole('button', { name: 'Settings' })[0])
    fireEvent.change(await classicUi.findByLabelText('Game language'), { target: { value: 'fr' } })
    const frenchClassic = await classicUi.findByRole('button', { name: 'Mode de jeu : Classique' })
    expect(classicUi.getByRole('button', { name: 'Exporter les sauvegardes des modes' })).toBeTruthy()
    fireEvent.click(frenchClassic)
    fireEvent.click(classicUi.getByRole('button', { name: 'Continuer Moderne' }))
    await bootNext('Modern')
    const modernUi = within(active!.contentDocument!.body)
    const settings = modernUi.getAllByRole('button', { name: 'Settings' })[0]
    fireEvent.click(settings)
    const exportButton = await modernUi.findByRole('button', { name: 'Export mode saves' }, { timeout: 10000 })
    expect(modernUi.queryByRole('button', { name: 'Export save' })).toBeNull()
    fireEvent.click(exportButton)
    // Export checkpoints and replaces the child while its result remains in
    // the persistent parent modal. Execute the next actual frame bootstrap.
    await bootNext('Modern')
    const parentUi = within(document.body)
    const field = await parentUi.findByLabelText('Save export') as HTMLTextAreaElement
    await waitFor(() => expect(field.value).toContain('IDS-MODE-EXPORT-1'))
    const bundle = JSON.parse(field.value)
    expect(Object.keys(bundle.saves).sort()).toEqual(['classic', 'modern'])
    expect(bundle.active).toBe('modern')
    expect(forbidden).not.toHaveBeenCalled()
  } finally {
    await act(async () => { window.dispatchEvent(new Event('pagehide')); await new Promise(resolve => setTimeout(resolve, 30)) })
    root.remove(); history.replaceState({}, '', previousUrl)
    vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs()
  }
}, 30000)
