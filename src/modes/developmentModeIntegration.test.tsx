// @vitest-environment jsdom
import { act, fireEvent, screen, waitFor, cleanup } from '@testing-library/react'
import { afterEach, expect, test, vi } from 'vitest'
import { startModeDocument } from './development/startModeDocument'
import { createModeHost } from './modeHost'
import { ModeSaveStore } from './modeSaveStore'
import { ModeMemoryStorage, MockModeCloud, modeStringCodecs } from '../../test/support/modeFoundation'
import { createClassicModeCodec } from './classicModeCodec'
import { createModernModeCodec } from './modernModeCodec'
import { convertClassicUsingExistingKeepPolicy } from './classicToModernMigration'
import { BrowserDepartureMarker } from '../platform/browserDepartureMarker'
import { WEB_LIFECYCLE_POLICY } from '../simulation/lifecycleAwayTime'
import type { GameModeController, ModeSessionContext } from './modeController'
import { ModeCloudCoordinator } from './modeCloud'
import { mountDevelopmentModeStatus } from './development/mountDevelopmentModeStatus'
import { startDevelopmentModeHost } from './development/startDevelopmentModeHost'

afterEach(() => { cleanup(); vi.unstubAllGlobals(); vi.unstubAllEnvs() })
test('actual Classic and modern App drawers switch independent graphs, reset disclosure state and retain both saves', async () => {
  // Before every in-memory game construction: all persistence and departure
  // receipts are Maps; host/IDB/account/Cloud capabilities are absent. Public
  // localStorage is a tripwire. No browser or native process is launched.
  const publicGet = vi.fn(() => { throw Error('public read prohibited') }), publicSet = vi.fn(() => { throw Error('public write prohibited') })
  vi.stubGlobal('localStorage', { getItem: publicGet, setItem: publicSet, removeItem: () => { throw Error('public removal prohibited') } })
  vi.stubGlobal('matchMedia', (query: string) => ({ matches: query.includes('min-width'), media: query, addEventListener() {}, removeEventListener() {}, addListener() {}, removeListener() {} }))
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} unobserve() {} })
  const prefs = new Map<string, string>(), values = new Map<string, string>(), files = new ModeMemoryStorage()
  const preferences = { getItem: (key: string) => prefs.get(key) ?? null, setItem: (key: string, text: string) => { prefs.set(key, text) }, removeItem: (key: string) => { prefs.delete(key) } }
  const date = () => '2026-10-15T00:00:00Z'
  const codecs = { classic: createClassicModeCodec(date), modern: createModernModeCodec(date) }
  const store = new ModeSaveStore(files, codecs, () => undefined)
  const container = document.createElement('div'); document.body.append(container)
  let controller!: GameModeController
  const launch = async (context: ModeSessionContext) => startModeDocument(context, controller, container, preferences, {
    lifecycle: { currentPhase: () => 'active', subscribe: () => () => undefined },
    lifecycleClock: { sample: () => ({ utcMilliseconds: Date.parse(date()), serializedUtcText: date() }) },
    lifecyclePolicy: WEB_LIFECYCLE_POLICY, activeTimeClock: { nowMilliseconds: () => 0 },
    activeTimeScheduler: { requestFrame: () => 0, cancelFrame() {} }, nowUtcMilliseconds: () => Date.parse(date()),
    departureMarker: new BrowserDepartureMarker(context.mode, { getItem: key => values.get(key) ?? null, setItem: (key, text) => { values.set(key, text) }, removeItem: key => { values.delete(key) } }),
    frontendSnapshotScheduler: { requestFrame: callback => { queueMicrotask(callback); return 0 }, cancelFrame() {} },
    checkpointScheduler: { setInterval: () => 0, clearInterval() {} },
  })
  const classic = await codecs.classic.createFresh()
  const host = createModeHost({ store, factories: { classic: launch, modern: launch }, convertClassic: convertClassicUsingExistingKeepPolicy,
    discovery: { codecs,
      publicClassic: { id: 'synthetic-public', mode: 'classic', read: async () => [{ id: 'synthetic-public:current', role: 'primary', text: classic }] },
      legacyUnity: { id: 'synthetic-unity', mode: 'classic', read: async () => [] }, modernBeta: { id: 'synthetic-beta', mode: 'modern', read: async () => [] },
    },
  }); controller = host.controller
  try {
    await act(() => host.start())
    const button = await screen.findByRole('button', { name: 'Game mode: Classic' }, { timeout: 10000 })
    expect(button.closest('.dyson-shell__side-panel')).toBeTruthy()
    fireEvent.click(button)
    fireEvent.click(screen.getByRole('button', { name: 'Start Modern' }))
    await waitFor(() => { if (controller.getSnapshot().phase === 'blocked') throw new Error(JSON.stringify(controller.getSnapshot())); expect(controller.getSnapshot().phase).toBe('ready'); expect(controller.getSnapshot().manifest?.active).toBe('modern') }, { timeout: 10000 })
    await screen.findByRole('button', { name: 'Game mode: Modern' }, { timeout: 10000 })
    expect(screen.queryByRole('button', { name: 'Game mode: Classic' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Game mode: Modern' }).getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(screen.getByRole('button', { name: 'Game mode: Modern' }))
    fireEvent.click(screen.getByRole('button', { name: 'Continue Classic' }))
    await screen.findByRole('button', { name: 'Game mode: Classic' }, { timeout: 10000 })
    expect(screen.queryByRole('button', { name: 'Game mode: Modern' })).toBeNull()
    expect(screen.getByRole('button', { name: 'Game mode: Classic' }).getAttribute('aria-expanded')).toBe('false')
    expect(await store.read('modern')).toBeTruthy(); expect(await store.read('classic')).toBeTruthy()
    expect(publicGet).not.toHaveBeenCalled(); expect(publicSet).not.toHaveBeenCalled()
  } finally { await act(() => controller.close()); container.remove() }
}, 20000)

test('the complete host awaits the final settled Cloud checkpoint before opening another mode', async () => {
  const store = new ModeSaveStore(new ModeMemoryStorage(), modeStringCodecs, () => undefined)
  const clouds = { classic: new MockModeCloud(), modern: new MockModeCloud() }
  const cloud = new ModeCloudCoordinator(store, clouds, modeStringCodecs, (_mode, text) => text, (_mode, _local, remote) => remote)
  const events: string[] = []
  const originalPublish = clouds.classic.publish.bind(clouds.classic)
  clouds.classic.publish = async text => { await new Promise(resolve => setTimeout(resolve, 5)); events.push('upload ' + text); await originalPublish(text) }
  const host = createModeHost({ store, cloud, factories: {
    classic: async () => ({ quiesce: async () => 'classic:settled-final', close: async () => undefined }),
    modern: async () => { events.push('open modern'); return { quiesce: async () => 'modern:final', close: async () => undefined } },
  }, convertClassic: text => text,
  discovery: { codecs: modeStringCodecs, publicClassic: { id: 'public', mode: 'classic', read: async () => [{ id: 'public:current', role: 'primary', text: 'classic:initial' }] },
    legacyUnity: { id: 'unity', mode: 'classic', read: async () => [] }, modernBeta: { id: 'beta', mode: 'modern', read: async () => [] } },
  })
  await host.start(); await host.controller.switchTo('modern')
  expect(events).toEqual(['upload classic:settled-final', 'open modern'])
  await host.controller.close()
})

test('parent recovery reopens a saved selection after the outgoing game has closed and the next document fails', async () => {
  const store = new ModeSaveStore(new ModeMemoryStorage(), modeStringCodecs, () => undefined)
  let failModern = true, classicClosed = false
  const host = createModeHost({ store, factories: {
    classic: async () => ({ quiesce: async () => 'classic:retained', close: async () => { classicClosed = true } }),
    modern: async () => {
      if (failModern) throw Error('Document failed')
      return { quiesce: async () => 'modern:recovered', close: async () => undefined }
    },
  }, convertClassic: text => text,
  discovery: { codecs: modeStringCodecs, publicClassic: { id: 'public', mode: 'classic', read: async () => [{ id: 'public:current', role: 'primary', text: 'classic:initial' }] },
    legacyUnity: { id: 'unity', mode: 'classic', read: async () => [] }, modernBeta: { id: 'beta', mode: 'modern', read: async () => [] } },
  })
  const status = document.createElement('p'); document.body.append(status)
  const controls = mountDevelopmentModeStatus(status, host)
  try {
    await controls.start()
    await expect(host.controller.switchTo('modern')).rejects.toThrow('Document failed')
    expect(classicClosed).toBe(true)
    expect(host.controller.getSnapshot().phase).toBe('blocked')
    expect(await store.read('classic')).toBe('classic:retained')
    failModern = false
    fireEvent.click(screen.getByRole('button', { name: 'Retry saved development session' }))
    await waitFor(() => expect(host.controller.getSnapshot().phase).toBe('ready'))
    expect(host.controller.getSnapshot().manifest?.active).toBe('modern')
    expect(screen.queryByRole('button', { name: 'Retry saved development session' })).toBeNull()
  } finally { await host.controller.close(); controls.dispose(); status.remove() }
})

test('the real scratch parent removes a failed iframe and retry reconnects the same durable save', async () => {
  // The iframe scripts are never executed in jsdom. Only controlled bridge
  // callbacks connect; parent storage is its private Maps, without host ports.
  vi.stubEnv('DEV', true); vi.stubEnv('VITE_IDS_DUAL_MODE_FOUNDATION', '1')
  const publicAccess = vi.fn(() => { throw Error('public storage prohibited') })
  vi.stubGlobal('localStorage', { getItem: publicAccess, setItem: publicAccess, removeItem: publicAccess })
  const container = document.createElement('div'); document.body.append(container)
  let connected: ReturnType<NonNullable<Window['__IDS_MODE_DEVELOPMENT_BRIDGE__']>['connect']> | undefined
  let host: Awaited<ReturnType<typeof startDevelopmentModeHost>> | undefined
  try {
    const opening = startDevelopmentModeHost(container)
    await waitFor(() => expect(container.querySelector('iframe')).toBeTruthy())
    const failed = container.querySelector('iframe')!
    const bridge = window.__IDS_MODE_DEVELOPMENT_BRIDGE__!
    const token = new URL(failed.src).searchParams.get('session')!
    expect(() => bridge.connect(token, window)).toThrow('foreign')
    const first = bridge.connect(token, failed.contentWindow!)
    const saved = first.context.initialSave
    first.fail(Error('Synthetic frame failure'))
    host = await opening
    await host.ready
    expect(failed.isConnected).toBe(false)
    expect(window.__IDS_MODE_DEVELOPMENT_BRIDGE__).toBeUndefined()
    fireEvent.click(screen.getByRole('button', { name: 'Retry saved development session' }))
    await waitFor(() => expect(container.querySelector('iframe')).toBeTruthy())
    const retry = container.querySelector('iframe')!
    expect(retry).not.toBe(failed)
    connected = window.__IDS_MODE_DEVELOPMENT_BRIDGE__!.connect(new URL(retry.src).searchParams.get('session')!, retry.contentWindow!)
    expect(connected.context.initialSave).toBe(saved)
    expect(first.context.isCurrent()).toBe(false)
    connected.ready({ quiesce: async () => saved, close: async () => undefined })
    await waitFor(() => expect(connected!.controller.getSnapshot().phase).toBe('ready'))
    expect(publicAccess).not.toHaveBeenCalled()
  } finally { await host?.close(); container.remove() }
})

test.each(['frame startup', 'Cloud choice during export'] as const)('closing the real scratch host cancels %s without another player response', async pending => {
  vi.stubEnv('DEV', true); vi.stubEnv('VITE_IDS_DUAL_MODE_FOUNDATION', '1')
  const forbidden = vi.fn(() => { throw Error('Public persistence prohibited') })
  vi.stubGlobal('localStorage', { getItem: forbidden, setItem: forbidden, removeItem: forbidden })
  const container = document.createElement('div'); document.body.append(container)
  const host = await startDevelopmentModeHost(container)
  try {
    await waitFor(() => expect(container.querySelector('iframe')).toBeTruthy())
    if (pending === 'Cloud choice during export') {
      const frame = container.querySelector('iframe')!, doc = frame.contentDocument!
      if (!doc.documentElement) doc.append(doc.createElement('html'))
      const connection = window.__IDS_MODE_DEVELOPMENT_BRIDGE__!.connect(new URL(frame.src).searchParams.get('session')!, frame.contentWindow!)
      connection.ready({ quiesce: async () => connection.context.initialSave, close: async () => undefined })
      await host.ready
      const cloud = screen.getByRole('button', { name: 'Simulate Cloud conflict' })
      fireEvent.click(cloud)
      await waitFor(() => expect(cloud.getAttribute('aria-busy')).toBeNull())
      await act(() => connection.saveActions.open('export', 'en'))
      await screen.findByRole('button', { name: 'Use this device' })
    }
    await act(async () => {
      await Promise.race([host.close(), new Promise((_, reject) => setTimeout(() => reject(Error('Host close stalled')), 1000))])
      await host.ready
    })
    expect(container.querySelector('iframe')).toBeNull()
    expect(window.__IDS_MODE_DEVELOPMENT_BRIDGE__).toBeUndefined()
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(forbidden).not.toHaveBeenCalled()
  } finally {
    const choice = screen.queryByRole('button', { name: 'Use this device' })
    if (choice) fireEvent.click(choice)
    await host.close().catch(() => undefined); container.remove()
  }
})
