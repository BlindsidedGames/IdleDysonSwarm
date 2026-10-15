// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, expect, test } from 'vitest'
import { IntlProvider } from 'react-intl'
import { GameModeSwitch } from './GameModeSwitch'
import { GameModeController } from '../../../modes/modeController'
import { ModeSaveStore } from '../../../modes/modeSaveStore'

afterEach(cleanup)
async function fixture(convert: (text: string) => string | Promise<string> = text => text + ':migrated') {
  const files = new Map<string, string>()
  const codec = { validate: () => undefined, createFresh: () => 'fresh' }
  const store = new ModeSaveStore({
    exists: async p => files.has(p), readText: async p => { if (!files.has(p)) throw Error('missing'); return files.get(p)! },
    writeText: async (p, text) => { files.set(p, text) }, copy: async (a, b) => { files.set(b, files.get(a)!) },
    replaceAtomically: async (a, b) => { files.set(b, files.get(a)!); files.delete(a) }, discoverLegacyCandidates: async () => [],
  }, { classic: codec, modern: codec }, () => undefined)
  const factory = async (context: { initialSave: string }) => ({ quiesce: async () => context.initialSave, close: async () => undefined })
  const controller = new GameModeController(store, { classic: factory, modern: factory }, convert)
  await controller.start({ discovery: 'complete', saves: { classic: 'classic:original' } })
  render(<IntlProvider locale="en"><GameModeSwitch controller={controller} /></IntlProvider>)
  return { controller, store }
}

test('drawer disclosure requires explicit migration confirmation, then exposes preserved Classic and destination conflict', async () => {
  const f = await fixture()
  const toggle = screen.getByRole('button', { name: 'Game mode: Classic' })
  expect(toggle.getAttribute('aria-expanded')).toBe('false')
  fireEvent.click(toggle)
  expect(toggle.getAttribute('aria-expanded')).toBe('true')
  fireEvent.click(screen.getByRole('button', { name: 'Migrate Classic progress' }))
  expect(screen.getByText(/Modern progress cannot be converted back/)).toBeTruthy()
  expect(await f.store.read('modern')).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
  expect(screen.queryByRole('button', { name: 'Confirm migration' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Migrate Classic progress' }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirm migration' }))
  await screen.findByRole('button', { name: 'Game mode: Modern' })
  fireEvent.click(screen.getByRole('button', { name: 'Game mode: Modern' }))
  expect(screen.queryByRole('button', { name: 'Migrate Classic progress' })).toBeNull()
  fireEvent.click(screen.getByRole('button', { name: 'Continue Classic' }))
  await screen.findByRole('button', { name: 'Game mode: Classic' })
  await waitFor(() => expect(screen.queryByRole('button', { name: 'Continue Classic' })).toBeNull())
  fireEvent.click(screen.getByRole('button', { name: 'Game mode: Classic' }))
  expect(screen.getByText(/already have a Modern save/)).toBeTruthy()
  expect(screen.getByRole('button', { name: 'Continue Modern' })).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Migrate Classic progress' })).toBeNull()
  expect(await f.store.read('classic')).toBe('classic:original')
  await act(() => f.controller.close())
})

test('pending migration disables every control and cannot duplicate conversion', async () => {
  let finish!: (text: string) => void, calls = 0
  const f = await fixture(() => { calls++; return new Promise(resolve => { finish = resolve }) })
  fireEvent.click(screen.getByRole('button', { name: 'Game mode: Classic' }))
  fireEvent.click(screen.getByRole('button', { name: 'Migrate Classic progress' }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirm migration' }))
  await waitFor(() => expect(calls).toBe(1))
  for (const button of screen.getAllByRole('button')) expect((button as HTMLButtonElement).disabled).toBe(true)
  await act(async () => { finish('modern:copied') })
  await screen.findByRole('button', { name: 'Game mode: Modern' })
  expect(calls).toBe(1)
  await act(() => f.controller.close())
})


test('conversion failure exposes recovery to the saved Classic session without creating modern progress', async () => {
  const f = await fixture(() => { throw Error('conversion unavailable') })
  fireEvent.click(screen.getByRole('button', { name: 'Game mode: Classic' }))
  fireEvent.click(screen.getByRole('button', { name: 'Migrate Classic progress' }))
  fireEvent.click(screen.getByRole('button', { name: 'Confirm migration' }))
  await screen.findByRole('alert')
  expect(await f.store.read('modern')).toBeNull()
  expect(await f.store.read('classic')).toBe('classic:original')
  fireEvent.click(screen.getByRole('button', { name: 'Continue Classic' }))
  await waitFor(() => expect(f.controller.getSnapshot().phase).toBe('ready'))
  await act(() => f.controller.close())
})
