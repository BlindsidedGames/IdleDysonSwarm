// @vitest-environment jsdom
import { act, fireEvent, screen, waitFor, cleanup } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { ModeSaveStore } from './modeSaveStore'
import { GameModeController } from './modeController'
import { mountModeSaveManager } from './development/mountModeSaveManager'
import { ModeMemoryStorage, modeStringCodecs } from '../../test/support/modeFoundation'
import { bindNativeModeSaveTransfers } from './hostSaveTransferBindings'

vi.mock(import('../ui/i18n/localeRegistry'), async importOriginal => {
  const actual = await importOriginal()
  return { ...actual, LOCALE_REGISTRY: { ...actual.LOCALE_REGISTRY, de: { ...actual.LOCALE_REGISTRY.de, loadSharedCatalog: async () => { throw Error('Locale download unavailable') } } } }
})

afterEach(cleanup)
async function fixture() {
  const storage = new ModeMemoryStorage(), store = new ModeSaveStore(storage, modeStringCodecs, () => undefined)
  let closes = 0
  const controller = new GameModeController(store, {
    classic: async context => ({ quiesce: async () => context.initialSave, close: async () => { closes++ } }),
    modern: async context => ({ quiesce: async () => context.initialSave, close: async () => { closes++ } }),
  }, text => text)
  await controller.start({ discovery: 'complete', saves: { classic: 'classic:before', modern: 'modern:before' }, originals: [{ id: 'public', text: 'raw-public-original' }] })
  const background = document.createElement('div'), dialogs = document.createElement('div'); document.body.append(background, dialogs)
  const nativeExport = vi.fn(async (_request: { fileName: string; text: string }) => 'saved' as 'saved' | 'cancelled')
  const nativeCopy = vi.fn(async (_text: string) => undefined)
  const manager = mountModeSaveManager(dialogs, background, controller, store, bindNativeModeSaveTransfers({ exportSaveFile: nativeExport, writeClipboardText: nativeCopy }))
  return { storage, store, controller, manager, background, nativeExport, nativeCopy, closes: () => closes,
    async dispose() { await controller.close().catch(() => undefined); await act(() => manager.dispose()); background.remove(); dialogs.remove() },
  }
}
async function incoming() {
  const store = new ModeSaveStore(new ModeMemoryStorage(), modeStringCodecs, () => undefined)
  await store.initialize({ discovery: 'complete', saves: { classic: 'classic:incoming', modern: 'modern:incoming' } })
  return store.exportBundle()
}

test('parent save settings keep a labelled pair export visible after the game closes and reopens', async () => {
  const f = await fixture()
  try {
    await act(() => f.manager.open('export', 'en'))
    const field = await screen.findByLabelText('Save export') as HTMLTextAreaElement
    await waitFor(() => expect(field.value).toContain('IDS-MODE-EXPORT-1'))
    const bundle = JSON.parse(field.value)
    expect(bundle.saves.classic.text).toBe('classic:before'); expect(bundle.saves.modern.text).toBe('modern:before')
    expect(f.closes()).toBe(1); expect(f.controller.getSnapshot().phase).toBe('ready')
    expect(f.background.inert).toBe(true)
    f.nativeExport.mockResolvedValueOnce('cancelled')
    fireEvent.click(screen.getByRole('button', { name: 'Download file' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Download file' }).hasAttribute('disabled')).toBe(false))
    expect(screen.queryByRole('status')).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Download file' }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Saved.'))
    expect(f.nativeExport.mock.calls[0][0].fileName).toBe('idle-dyson-swarm-save.idsw')
    expect(JSON.parse(f.nativeExport.mock.calls[0][0].text).saves.classic.text).toBe('classic:before')
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))
    await waitFor(() => expect(f.nativeCopy).toHaveBeenCalledOnce())
    expect(JSON.parse(f.nativeCopy.mock.calls[0][0]).saves.modern.text).toBe('modern:before')
    fireEvent.click(screen.getByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(f.background.inert).toBe(false)
  } finally { await f.dispose() }
})

test('import settings review both modes, invalidate edited approval and replace only after explicit confirmation', async () => {
  const f = await fixture(), text = await incoming()
  try {
    await act(() => f.manager.open('import', 'en'))
    fireEvent.change(await screen.findByLabelText('Save export'), { target: { value: text } })
    fireEvent.click(screen.getByRole('button', { name: 'Review import' }))
    await screen.findByRole('button', { name: 'Replace listed saves' })
    expect(await f.store.read('classic')).toBe('classic:before')
    fireEvent.change(screen.getByLabelText('Save export'), { target: { value: 'unlabelled old save' } })
    expect(screen.queryByRole('button', { name: 'Replace listed saves' })).toBeNull()
    fireEvent.click(screen.getByRole('button', { name: 'Review import' }))
    await screen.findByRole('alert')
    expect(await f.store.read('modern')).toBe('modern:before')
    fireEvent.change(screen.getByLabelText('Save export'), { target: { value: text } })
    fireEvent.click(screen.getByRole('button', { name: 'Review import' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Replace listed saves' }))
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Saved.'))
    expect(await f.store.read('classic')).toBe('classic:incoming'); expect(await f.store.read('modern')).toBe('modern:incoming')
  } finally { await f.dispose() }
})

test('damaged selection recovery requires review, preserves damaged/newer bytes and restores a verified checkpoint', async () => {
  const f = await fixture()
  try {
    await f.store.checkpoint('classic', 'classic:newer')
    f.storage.files.set('modes-v1/manifest.json', 'damaged selection record')
    await act(() => f.manager.open('recovery', 'en'))
    fireEvent.click(await screen.findByRole('button', { name: 'Export recovery archive' }))
    const field = await screen.findByLabelText('Save export') as HTMLTextAreaElement
    await waitFor(() => expect(field.value).toContain('IDS-MODE-RECOVERY-1'))
    expect(JSON.parse(field.value).files['modes-v1/manifest.json']).toBe('damaged selection record')
    fireEvent.click(screen.getByRole('button', { name: 'Review retained checkpoint' }))
    const restore = await screen.findByRole('button', { name: 'Restore retained checkpoint' })
    expect(f.storage.files.get('modes-v1/manifest.json')).toBe('damaged selection record')
    fireEvent.click(restore)
    await waitFor(() => expect(screen.getByRole('status').textContent).toBe('Saved.'))
    expect(await f.store.read('classic')).toBe('classic:before')
    expect([...f.storage.files.entries()].some(([key, value]) => key.includes('/recovery/manifest-') && value === 'damaged selection record')).toBe(true)
    expect([...f.storage.files.entries()].some(([key, value]) => key.includes('/recovery/save-classic-') && value === 'classic:newer')).toBe(true)
    for (let i = 0; i < 8; i++) await f.store.checkpoint('classic', 'classic:rotation-' + i)
    const archive = JSON.parse(await f.store.exportRecoveryArchive())
    expect(Object.values(archive.files)).toContain('classic:newer')
    expect(Object.values(archive.files)).toContain('raw-public-original')
  } finally { await f.dispose() }
})

test('localized Cloud choices preserve the transfer dialog while awaiting a player choice', async () => {
  const f = await fixture()
  try {
    await act(() => f.manager.open('import', 'fr'))
    fireEvent.change(await screen.findByLabelText('Sauvegarde exportée'), { target: { value: 'draft stays here' } })
    let choice!: Promise<'local' | 'cloud'>
    await act(() => { choice = f.manager.choose('classic', 'classic:local', 'classic:remote') })
    fireEvent.click(await screen.findByRole('button', { name: 'Utiliser cet appareil' }))
    await expect(choice).resolves.toBe('local')
    expect((await screen.findByLabelText('Sauvegarde exportée') as HTMLTextAreaElement).value).toBe('draft stays here')
    expect(f.background.inert).toBe(true)
  } finally { await f.dispose() }
})

test('an unavailable locale still presents an English modal with a working close action', async () => {
  const f = await fixture()
  try {
    await act(() => f.manager.open('import', 'de'))
    fireEvent.click(await screen.findByRole('button', { name: 'Close' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(f.background.inert).toBe(false)
  } finally { await f.dispose() }
})

test.each(['damaged-index', 'missing-source'] as const)('recovery export salvages readable evidence with explicit errors for %s', async failure => {
  const f = await fixture()
  try {
    if (failure === 'damaged-index') f.storage.files.set('modes-v1/recovery/index.json', '[{"path":"../../private","sha256":"invalid"}]')
    else { const path = [...f.storage.files.keys()].find(path => path.includes('/upgrade-originals/'))!; f.storage.files.delete(path) }
    const archive = JSON.parse(await f.store.exportRecoveryArchive())
    expect(archive.format).toBe('IDS-MODE-RECOVERY-1')
    expect(archive.files['modes-v1/manifest.json']).toBeTruthy()
    expect(Object.values(archive.files)).toContain('classic:before')
    expect(archive.errors).toHaveLength(1)
    expect(archive.files['../../private']).toBeUndefined()
  } finally { await f.dispose() }
})
