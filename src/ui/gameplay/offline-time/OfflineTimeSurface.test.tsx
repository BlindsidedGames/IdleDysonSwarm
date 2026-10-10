// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { IntlProvider } from 'react-intl'
import { afterEach, expect, test } from 'vitest'
import { createCanonicalGameApplication } from '../../../application/canonicalGameApplication'
import { createCanonicalRuntimeSessionFactory } from '../../../application/canonicalRuntimeSession'
import { dehydrateGameState, hydrateGameState } from '../../../game-state/mapping'
import { SingleHostSessionWriterAuthority } from '../../../platform/singleHostSessionWriterAuthority'
import { prepareIdb1Save } from '../../../save/prepare'
import type { LifecyclePhase } from '../../../platform/contracts'
import type { LegacySaveCandidate, SaveStorageAdapter } from '../../../save/repository'
import { createProductionEventContext } from '../../../simulation/productionEventContext'
import { createBrowserRuntimeFoundation, type BrowserUiRuntimeFoundation } from '../../runtime'
import { GAMEPLAY_ROUTE_STORAGE_KEY, ReadyDysonRuntimeHost } from '../dyson/ReadyDysonSlice'
import fixtureText from '../../../../test/fixtures/schema-08-canonical-idb1-main-save.txt?raw'
const activeRuntimes: BrowserUiRuntimeFoundation[] = []
afterEach(async () => { cleanup(); localStorage.clear(); await Promise.all(activeRuntimes.splice(0).map(runtime => runtime.shutdown())) })

async function harness(bank: number, capacity = 86400) {
  const hydrated = hydrateGameState(prepareIdb1Save(fixtureText).prepared)
  const candidate = structuredClone(hydrated.state)
  Object.assign(candidate.meta, { reworkMigrationChoice: 'keep' })
  Object.assign(candidate, { timeline: { ...candidate.timeline, lastSuspendedAtLegacyText: null, storedTimeAvailableSeconds: bank, storedTimeCapacitySeconds: capacity, offlineBoost: { multiplier: 42 }, doubleTime: { ...candidate.timeline.doubleTime, unlocked: false } }, infinity: { ...candidate.infinity, automaticResetEnabled: false } })
  const prepared = dehydrateGameState(hydrated, candidate)
  const source = prepared.copyValidatedState(); source.cheater = false; source.idsLastActiveAtUtc = new Date(Date.UTC(2026, 9, 4)).toISOString()
  const save = prepared.withValidatedState(source)
  let phase: LifecyclePhase = 'active'
  let lifecycleListener: ((phase: LifecyclePhase) => void) | undefined
  let now = 0, frame: (() => void) | undefined
  const runtime = createBrowserRuntimeFoundation({
    createApplication: repository => createCanonicalGameApplication({ repository, startupResolver: { resolve: async () => ({ kind: 'ready', source: 'primary', save }) }, sessionFactory: createCanonicalRuntimeSessionFactory({ entitlements: { permanentDoubleIp: false } }), engine: { eventContext: createProductionEventContext() } }),
    lifecyclePolicy: { saveOnPause: true, saveOnFocusLoss: true, replayOnFocusGain: true }, allowedExternalOrigins: [],
    saveStorage: new MemorySaveStorage(), saveRepositoryPaths: { current: '/current', temporary: '/current.tmp', legacyRecovery: '/recovery/original.idsw' },
    allowCanonicalPlayerWrites: true, writerAuthority: new SingleHostSessionWriterAuthority({ sessionId: 'offline-boost-ui-test' }),
    activeTimeClock: { nowMilliseconds: () => now }, activeTimeScheduler: { requestFrame: callback => { frame = callback; return 1 }, cancelFrame: () => { frame = undefined } },
    lifecycle: { currentPhase: () => phase, subscribe: listener => { lifecycleListener = listener; return () => { lifecycleListener = undefined } } },
    lifecycleClock: { sample: () => ({ utcMilliseconds: Date.UTC(2026, 9, 4) + now, serializedUtcText: new Date(Date.UTC(2026, 9, 4) + now).toISOString() }) },
  })
  activeRuntimes.push(runtime)
  await runtime.start()
  localStorage.setItem(GAMEPLAY_ROUTE_STORAGE_KEY, 'offline-time')
  render(<IntlProvider locale="en" messages={{}} onError={() => undefined}><ReadyDysonRuntimeHost runtime={runtime} locale="en" /></IntlProvider>)
  await screen.findByRole('slider', { name: 'Game speed' })
  const time = () => { const snapshot = runtime.snapshot(); if (snapshot.phase !== 'ready') throw Error('Expected ready'); return snapshot.gameplay.resources.time }
  const advance = async () => { now += 33; await act(async () => { frame?.(); await new Promise(resolve => setTimeout(resolve, 30)) }) }
  const changePhase = async (next: LifecyclePhase, elapsed = 0) => { now += elapsed; phase = next; await act(async () => { lifecycleListener?.(next); await new Promise(resolve => setTimeout(resolve, 30)) }) }
  return { runtime, time, advance, changePhase }
}

const slider = () => screen.getByRole('slider', { name: 'Game speed' }) as HTMLInputElement
const output = () => screen.getByRole('status', { name: 'Game speed' }).textContent
const capacityButton = () => screen.getByRole('button', { name: 'Double Capacity' }) as HTMLButtonElement
const choose = async (value: number) => {
  fireEvent.change(slider(), { target: { value: String(value) } })
  await waitFor(() => expect(slider().value).toBe(String(value)))
}

test('one live slider starts, changes and stops spending with no Start/Pause or processing dialog', async () => {
  const h = await harness(10)
  expect(output()).toBe('Regular 1×')
  expect(screen.queryByText('Boost duration')).toBeNull()
  expect(screen.queryByRole('button', { name: /Start Boost|Pause Boost/ })).toBeNull()
  expect(capacityButton().disabled).toBe(true)
  await choose(8)
  expect(output()).toBe('8×')
  expect(screen.getByText('Use while running')).toBeTruthy()
  await h.advance()
  expect(h.time().storedTimeAvailableSeconds).toBeCloseTo(9.769, 10)
  expect(screen.queryByRole('dialog')).toBeNull()
  // Consecutive drag events must not disable the range or lose the last choice.
  fireEvent.change(slider(), { target: { value: '6' } })
  expect(slider().disabled).toBe(false)
  fireEvent.change(slider(), { target: { value: '2' } })
  await waitFor(() => expect(h.time().offlineBoost?.multiplier).toBe(2))
  await h.advance()
  expect(h.time().storedTimeAvailableSeconds).toBeCloseTo(9.736, 10)
  await choose(1)
  expect(output()).toBe('Regular 1×')
  await h.advance()
  expect(h.time().storedTimeAvailableSeconds).toBeCloseTo(9.736, 10)
})

test('bank exhaustion visibly returns the slider to 1× and leaves the capacity action visible', async () => {
  const h = await harness(0.5)
  await choose(42)
  await h.advance()
  expect(h.time().storedTimeAvailableSeconds).toBe(0)
  expect(h.time().offlineBoost).toEqual({ multiplier: 1 })
  expect(slider().value).toBe('1')
  expect(output()).toBe('Regular 1×')
  expect(slider().disabled).toBe(true)
  expect(capacityButton().disabled).toBe(true)
  expect(screen.queryByRole('dialog')).toBeNull()
})

test('partial storage shows the requirement, full-bank cost and prospective doubled capacity', async () => {
  await harness(7200)
  expect(capacityButton().disabled).toBe(true)
  expect(screen.getByText('Fill your offline time storage to double its capacity.')).toBeTruthy()
  expect(screen.getByText('Cost').nextElementSibling?.textContent).toBe('1d 0s')
  expect(screen.getByText('New capacity').nextElementSibling?.textContent).toBe('2d 0s')
})

test('a full bank upgrades only at regular speed and spends all stored time', async () => {
  const h = await harness(86400)
  expect(capacityButton().disabled).toBe(false)
  await choose(42)
  expect(capacityButton().disabled).toBe(true)
  await choose(1)
  await waitFor(() => expect(capacityButton().disabled).toBe(false))
  fireEvent.click(capacityButton())
  await waitFor(() => expect(h.time().storedTimeCapacitySeconds).toBe(172800))
  expect(h.time().storedTimeAvailableSeconds).toBe(0)
  expect(capacityButton().disabled).toBe(true)
  expect(screen.getByText('Cost').nextElementSibling?.textContent).toBe('2d 0s')
  expect(screen.getByText('New capacity').nextElementSibling?.textContent).toBe('4d 0s')
  expect(output()).toBe('Regular 1×')
  expect(slider().disabled).toBe(true)
})

test('the absolute capacity ceiling displays a disabled Maxed action', async () => {
  await harness(Number.MAX_VALUE, Number.MAX_VALUE)
  expect((screen.getByRole('button', { name: 'Maxed' }) as HTMLButtonElement).disabled).toBe(true)
  expect(screen.getByText('Maximum storage reached')).toBeTruthy()
  expect(screen.queryByRole('button', { name: 'Double Capacity' })).toBeNull()
  expect(screen.queryByText('New capacity')).toBeNull()
})

test('backgrounding resets the visible slider and resume banks away wall time without restarting it', async () => {
  const h = await harness(10)
  await choose(42)
  await h.advance()
  const bankBefore = h.time().storedTimeAvailableSeconds
  await h.changePhase('background')
  expect(h.time().offlineBoost).toEqual({ multiplier: 1 })
  expect(output()).toBe('Regular 1×')
  await h.changePhase('active', 1000)
  expect(h.time().storedTimeAvailableSeconds).toBeCloseTo(bankBefore + 1, 10)
  expect(h.time().offlineBoost).toEqual({ multiplier: 1 })
  expect(slider().value).toBe('1')
})

class MemorySaveStorage implements SaveStorageAdapter {
  private readonly files = new Map<string, string>()

  async exists(path: string): Promise<boolean> {
    return this.files.has(path)
  }

  async readText(path: string): Promise<string> {
    const value = this.files.get(path)
    if (value === undefined) throw new Error(`Missing ${path}`)
    return value
  }

  async writeText(path: string, contents: string): Promise<void> {
    this.files.set(path, contents)
  }

  async replaceAtomically(
    temporaryPath: string,
    destinationPath: string,
  ): Promise<void> {
    this.files.set(destinationPath, await this.readText(temporaryPath))
    this.files.delete(temporaryPath)
  }

  async copy(sourcePath: string, destinationPath: string): Promise<void> {
    this.files.set(destinationPath, await this.readText(sourcePath))
  }

  async discoverLegacyCandidates(): Promise<readonly LegacySaveCandidate[]> {
    return []
  }

  async retainLegacyCandidate(
    text: string,
    id = `manual-${this.files.size}`,
  ): Promise<LegacySaveCandidate> {
    const sourcePath = `/recovery/${id}.idsw`
    this.files.set(sourcePath, text)
    return { id, sourcePath, text }
  }
}
